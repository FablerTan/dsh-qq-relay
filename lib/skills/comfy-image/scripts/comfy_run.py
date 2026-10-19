#!/usr/bin/env python3
"""按 workflows/ 注册表提交 API 格式的 ComfyUI 工作流（跨机版）。

本 skill 跑在 macOS 上，ComfyUI 实例在 192.168.1.10:8188（可用 --host 或 COMFY_HOST 覆盖）。
和原版（运行在 ComfyUI 同机）的区别只有三处：
  1. 默认 host 指向局域网地址；
  2. 参考图通过 /upload/image 传到远端 input 目录；
  3. 产物用 /view 下载回本机（远端路径也会打印出来）。

只允许修改 schema.json 里声明的参数（白名单）—— `POST /prompt` 能提交任意图，
而自定义节点里可以跑任意 Python，所以"让调用方自由改图"等同于交出远端机器的执行权。

用法:
  python3 scripts/comfy_run.py --list
  python3 scripts/comfy_run.py qwen-t2i --set prompt="一只猫" --set aspect="16:9 (Widescreen)"
  python3 scripts/comfy_run.py qwen-edit --set prompt="改成雪景" --set image=@/path/to/x.png
  python3 scripts/comfy_run.py qwen-t2i --set prompt=x --dry-run     # 只打印改好的图，不提交
"""

import argparse
import json
import os
import posixpath
import random
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORKFLOWS_DIR = os.path.join(SKILL_DIR, "workflows")
REGISTRY = os.path.join(WORKFLOWS_DIR, "registry.json")

DEFAULT_HOST = "http://192.168.1.10:8188"
DEFAULT_REMOTE_ROOT = "/home/user/comfy"
# DSH 的写沙箱只允许会话工作目录：产物与参考图默认落在 <会话工作目录>/assets/comfy/{output,input}。
# 用 os.getcwd() 而不是 skill 安装目录——skill 跟着插件装，可能只读、也不是用户会话目录。
DEFAULT_OUTPUT_DIR = os.path.join(os.getcwd(), "assets", "comfy", "output")
DEFAULT_INPUT_DIR = os.path.join(os.getcwd(), "assets", "comfy", "input")
DEFAULT_TIMEOUT = 1800


def host_from_env_or_registry():
    registry = load_registry()
    return (os.environ.get("COMFY_HOST") or registry.get("host") or DEFAULT_HOST).rstrip("/")


def paths(args):
    output = os.path.abspath(os.path.expanduser(
        args.output_dir or os.environ.get("COMFY_OUTPUT_DIR") or DEFAULT_OUTPUT_DIR
    ))
    input_dir = os.path.abspath(os.path.expanduser(
        args.input_dir or os.environ.get("COMFY_INPUT_DIR") or DEFAULT_INPUT_DIR
    ))
    return input_dir, output


# --------------------------------------------------------------------------- 服务端


def request(host, path, payload=None):
    url = host + path
    if payload is None:
        return json.load(urllib.request.urlopen(url, timeout=30))
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"}
    )
    return json.load(urllib.request.urlopen(req, timeout=60))


def check_host(host):
    try:
        stats = request(host, "/system_stats")
    except OSError as exc:
        raise SystemExit(
            f"连不上 ComfyUI {host}：{exc}\n"
            "提示：确认远端实例在跑（curl -s <host>/system_stats），或 --host 指向隧道地址"
            "（例如先开 ssh -L 8188:127.0.0.1:8188，再 --host http://127.0.0.1:8188）。"
        ) from exc
    system = stats.get("system") or {}
    version = system.get("comfyui_version", "?")
    return f"ComfyUI {version}"


def upload_image(host, path):
    """上传到远端 ComfyUI 的 input 目录（本部署即 /home/user/comfy/素材/input）。"""
    with open(path, "rb") as handle:
        content = handle.read()
    boundary = "----comfy-run-boundary"
    body = b"".join([
        f"--{boundary}\r\n".encode(),
        f'Content-Disposition: form-data; name="image"; filename="{os.path.basename(path)}"\r\n'.encode(),
        b"Content-Type: application/octet-stream\r\n\r\n",
        content,
        f"\r\n--{boundary}\r\n".encode(),
        b'Content-Disposition: form-data; name="type"\r\n\r\ninput',
        f"\r\n--{boundary}--\r\n".encode(),
    ])
    req = urllib.request.Request(
        host + "/upload/image", data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    resp = json.load(urllib.request.urlopen(req, timeout=300))
    return posixpath.join(resp.get("subfolder") or "", resp["name"])


def view_url(host, item):
    query = urllib.parse.urlencode({
        "filename": item["filename"],
        "subfolder": item.get("subfolder") or "",
        "type": item.get("type") or "output",
    })
    return f"{host}/view?{query}"


def unique_path(path):
    if not os.path.exists(path):
        return path
    stem, ext = os.path.splitext(path)
    index = 1
    while os.path.exists(f"{stem}-{index}{ext}"):
        index += 1
    return f"{stem}-{index}{ext}"


def download_output(host, item, local_dir):
    subfolder = item.get("subfolder") or ""
    dest_dir = os.path.join(local_dir, subfolder)
    os.makedirs(dest_dir, exist_ok=True)
    dest = unique_path(os.path.join(dest_dir, item["filename"]))
    part = dest + ".part"
    with urllib.request.urlopen(view_url(host, item), timeout=600) as resp, open(part, "wb") as handle:
        while True:
            chunk = resp.read(1 << 20)
            if not chunk:
                break
            handle.write(chunk)
    os.replace(part, dest)
    return dest


# --------------------------------------------------------------------------- 注册表与参数


def load_registry():
    with open(REGISTRY) as handle:
        return json.load(handle)


def load_workflow(key):
    entry = load_registry()["workflows"].get(key)
    if entry is None:
        keys = ", ".join(load_registry()["workflows"])
        raise SystemExit(f"未知工作流 {key!r}，可选：{keys}")
    with open(os.path.join(WORKFLOWS_DIR, entry["file"])) as handle:
        graph = json.load(handle)
    with open(os.path.join(WORKFLOWS_DIR, entry["schema"])) as handle:
        schema = json.load(handle)
    return entry, graph, schema


def command_value(spec, raw, key):
    """把命令行字符串转成节点字段该有的类型，并检查枚举与上下限。"""
    kind = spec["type"]
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = raw
    if isinstance(parsed, str) and parsed.startswith("@"):
        parsed = parsed[1:]

    if kind == "enum":
        options = spec["options"]
        if isinstance(options, dict):
            if parsed in options:
                return options[parsed]
            if parsed in options.values():
                return parsed
            raise SystemExit(f"参数 {key}={raw!r} 不在 {list(options)} 中")
        if parsed not in options:
            raise SystemExit(f"参数 {key}={raw!r} 不在允许的比例里：{options}")
        return parsed

    if kind == "string":
        return parsed if isinstance(parsed, str) else raw

    if kind == "integer":
        if isinstance(parsed, bool) or not isinstance(parsed, (int, float)) or int(parsed) != parsed:
            raise SystemExit(f"参数 {key}={raw!r} 不是整数")
        value = int(parsed)
    elif kind == "number":
        if isinstance(parsed, bool) or not isinstance(parsed, (int, float)):
            raise SystemExit(f"参数 {key}={raw!r} 不是数字")
        value = float(parsed)
    elif kind == "boolean":
        if not isinstance(parsed, bool):
            raise SystemExit(f"参数 {key}={raw!r} 不是布尔值")
        return parsed
    elif kind == "image":
        return parsed if isinstance(parsed, str) else raw
    else:
        raise SystemExit(f"schema 里的类型 {kind!r} 运行器不认识")

    for bound, ok in (("min", lambda x, b: x >= b), ("max", lambda x, b: x <= b)):
        if bound in spec and not ok(value, spec[bound]):
            raise SystemExit(f"参数 {key}={value} 超出 {bound}={spec[bound]}")
    return value


def apply_params(graph, schema, assignments, host, input_dir, dry_run):
    params = schema["params"]
    unknown = [key for key in assignments if key not in params]
    if unknown:
        raise SystemExit(
            f"参数 {', '.join(unknown)} 不在白名单里。"
            f"可用参数：{', '.join(params)}"
        )

    touched = set()
    for key, spec in params.items():
        raw = assignments.get(key)
        if raw is None:
            if "default" in spec:
                # 默认值也要过一遍类型转换：枚举字典的 default 是键名（如 "reference"），
                # 直接写进节点会被当成真值，把 switch 悄悄翻成 true。
                value = command_value(spec, json.dumps(spec["default"]), key)
            elif spec.get("random"):
                value = random.randrange(0, 2**63)
            elif spec.get("required"):
                raise SystemExit(f"缺少必填参数 {key}（{spec.get('description', spec['type'])}）")
            else:
                continue
        else:
            value = command_value(spec, raw, key)
        touched.add((key, value))

    for key, value in touched:
        spec = params[key]
        node_id, field = spec["node"], spec["field"]
        if node_id not in graph:
            raise SystemExit(f"schema 指向的节点 {node_id} 不在 {schema['file']} 里")
        if spec["type"] == "image" and not dry_run:
            if os.path.sep in value or os.path.exists(value):
                source = os.path.abspath(value)
                if not os.path.exists(source):
                    raise SystemExit(f"参考图不存在：{source}")
                uploaded = upload_image(host, source)
                print(f"已上传参考图 → 远端 素材/input/{uploaded}")
                value = uploaded
            elif os.path.exists(os.path.join(input_dir, value)):
                print(f"使用本机已有参考图：{os.path.join(input_dir, value)}（提交远端同名文件）")
            else:
                print(
                    f"警告：本机 {os.path.join(input_dir, value)} 不存在，"
                    "按原样提交（要求远端 素材/input 已有同名文件）",
                    file=sys.stderr,
                )
        graph[node_id]["inputs"][field] = value
    return graph


# --------------------------------------------------------------------------- 提交与等待


def precheck(host, graph):
    """在提交前查出缺失节点，避免拿 400 当唯一的错误反馈。"""
    problems = []
    for node_id, node in graph.items():
        try:
            request(host, f"/object_info/{node['class_type']}")
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                problems.append(f"节点 {node_id} 的类型 {node['class_type']} 未注册（缺 custom_node？）")
            else:
                problems.append(f"节点 {node_id} 查询失败：{exc}")
        except OSError as exc:
            problems.append(f"连不上 {host}：{exc}")
            break
    return problems


def submit(host, graph):
    try:
        return request(host, "/prompt", {"prompt": graph, "client_id": "comfy-run"})
    except urllib.error.HTTPError as exc:
        body = exc.read().decode(errors="replace")
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            raise SystemExit(f"提交失败 HTTP {exc.code}：{body[:800]}") from exc
        print(f"提交失败 HTTP {exc.code}：{json.dumps(payload.get('error'), ensure_ascii=False)}")
        for node_id, node_err in (payload.get("node_errors") or {}).items():
            class_type = node_err.get("class_type", "?")
            for item in node_err.get("errors", []):
                detail = item.get("details") or item.get("extra_info") or ""
                print(f"  节点 {node_id} ({class_type}): {item.get('message')} {detail}")
        raise SystemExit(2)


def wait(host, prompt_id, timeout):
    deadline = time.time() + timeout
    while time.time() < deadline:
        time.sleep(2)
        record = request(host, f"/history/{prompt_id}").get(prompt_id)
        if record is not None:
            return record
    raise SystemExit(f"等待超时（{timeout}s），任务可能仍在跑，prompt_id={prompt_id}")


def report(record, host, output_dir, remote_root):
    status = record.get("status", {})
    state = status.get("status_str")
    print(f"状态：{state}")
    if state != "success":
        for kind, data in status.get("messages", []):
            if kind in ("execution_error", "execution_interrupted"):
                print(f"  {kind}: {json.dumps(data, ensure_ascii=False)[:1500]}")
    files = []
    skipped = 0
    for node_id, output in (record.get("outputs") or {}).items():
        for kind, items in output.items():
            if not isinstance(items, list):
                continue
            for item in items:
                if not isinstance(item, dict) or "filename" not in item:
                    continue
                if item.get("type") == "temp":
                    skipped += 1  # 例如 ImageCompare 的临时对比图，不是产物
                    continue
                meta = item.get("metadata") or {}
                size = f" {meta['width']}x{meta['height']}" if "width" in meta else ""
                remote_dir = posixpath.join(
                    remote_root, "素材", item.get("type") or "output",
                    item.get("subfolder") or "",
                )
                remote_path = posixpath.join(remote_dir, item["filename"])
                if item.get("type") == "output":
                    print(f"产物（{kind}，节点 {node_id}）：{item['filename']}{size}")
                    try:
                        local = download_output(host, item, output_dir)
                    except OSError as exc:
                        print(f"  下载失败：{exc}", file=sys.stderr)
                        print(f"  远端路径：{remote_path}")
                        files.append(remote_path)
                        continue
                    print(f"  已下载：{local}")
                    print(f"  远端路径：{remote_path}")
                    files.append(local)
                else:
                    print(f"产物（{kind}，节点 {node_id}）：{item['filename']}{size}")
                    print(f"  远端路径：{remote_path}（type={item.get('type')}，未下载）")
                    files.append(remote_path)
    if skipped:
        print(f"（另有 {skipped} 个 type=temp 的临时文件，如 ImageCompare 的对比图，未列出）")
    return files


# --------------------------------------------------------------------------- 入口


def main():
    parser = argparse.ArgumentParser(description="提交注册表里的 ComfyUI API 工作流（跨机）")
    parser.add_argument("workflow", nargs="?", help="注册表里的 key")
    parser.add_argument("--list", action="store_true", help="列出已登记的工作流")
    parser.add_argument("--set", action="append", default=[], metavar="KEY=VALUE",
                        help="覆盖白名单参数，可重复")
    parser.add_argument("--host", default=None, help=f"ComfyUI 地址，默认 {DEFAULT_HOST}")
    parser.add_argument("--input-dir", default=None, help=f"本机参考图目录（默认 {DEFAULT_INPUT_DIR}）")
    parser.add_argument("--output-dir", default=None, help=f"本机产物目录（默认 {DEFAULT_OUTPUT_DIR}）")
    parser.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT)
    parser.add_argument("--dry-run", action="store_true", help="只打印改好的图，不提交")
    args = parser.parse_args()

    registry = load_registry()
    host = (args.host or host_from_env_or_registry()).rstrip("/")
    remote_root = registry.get("remote_root", DEFAULT_REMOTE_ROOT)
    input_dir, output_dir = paths(args)

    if args.list or not args.workflow:
        print(f"服务端：{host}")
        print(f"本机产物目录：{output_dir}")
        print()
        for key, entry in registry["workflows"].items():
            with open(os.path.join(WORKFLOWS_DIR, entry["schema"])) as handle:
                params = ", ".join(json.load(handle)["params"])
            print(f"{key}\n  {entry['title']}\n  {entry['summary']}\n  参数：{params}")
        return 0

    assignments = {}
    for item in args.set:
        key, sep, raw = item.partition("=")
        if not sep:
            raise SystemExit(f"--set 需要 KEY=VALUE 形式：{item!r}")
        assignments[key] = raw

    entry, graph, schema = load_workflow(args.workflow)
    graph = apply_params(graph, schema, assignments, host, input_dir, args.dry_run)

    if args.dry_run:
        print(f"服务端：{host}（dry-run，未提交）")
        print(json.dumps(graph, ensure_ascii=False, indent=1))
        return 0

    print(f"服务端：{host}（{check_host(host)}）")
    problems = precheck(host, graph)
    if problems:
        for problem in problems:
            print(f"预检失败：{problem}", file=sys.stderr)
        return 1
    print(f"预检通过：{len(graph)} 个节点，{entry['title']}")

    response = submit(host, graph)
    prompt_id = response["prompt_id"]
    print(f"prompt_id：{prompt_id}（队列号 {response.get('number')}）")
    started = time.time()
    record = wait(host, prompt_id, args.timeout)
    print(f"服务端用时：{time.time() - started:.1f}s")
    report(record, host, output_dir, remote_root)
    return 0 if record.get("status", {}).get("status_str") == "success" else 2


if __name__ == "__main__":
    sys.exit(main())
