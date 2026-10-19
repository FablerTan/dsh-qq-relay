---
name: comfy-image
description: >
  用远端 ComfyUI 部署出图与改图（Qwen-Image-2.1 三件套 + MOSS-Image）。
  当用户说「画一个/生成图片/出张图/把这张图改成/去掉背景/换个风格/换参考图」，
  或要求跑某个 ComfyUI 工作流时使用。走 HTTP API：用 scripts/comfy_run.py
  提交 workflows/ 注册表里的 API 格式工作流，只允许改 schema 白名单里的参数；
  参考图上传到远端，产物下载回本机会话工作目录，再由 qq_send 发回 QQ 群。

  注册表里有三个：`qwen-t2i`（纯文生图，只要提示词）、`qwen-i2i`（参考图编辑，人物一致性最好）
  与 `qwen-edit`（另一种编辑流，尺寸控制更细）。

  另含 MOSS-Image（独立模型 + 远端界面工作流，未进 registry）：**仅该模型**支持 JSON Layout
  提示词，规则见 references/moss-image.md，不要套用到上面三个 qwen 工作流。

  NOT for: 启动/重启远端 ComfyUI 进程；改动远端 ComfyUI/ 内的代码；装模型或 custom_nodes。
whenToUse: 需要出图、改图、或在脚本里复现某次生成时。
---

# ComfyUI 出图 / 改图（QQ 群场景）

> 本文件是插件自带的 skill 模板：host 注册时会做字面替换——
> `{{COMFY_HOST}}` → ComfyUI 地址，`{{SKILL_DIR}}` → 本 skill 的实际安装目录。
> 其余内容（含下面的示例）按替换后的值直接执行。

## 环境

| 项 | 值 |
|---|---|
| 服务端 | `{{COMFY_HOST}}`（ComfyUI，**无鉴权**，只允许可信网络） |
| 运行器 | `{{SKILL_DIR}}/scripts/comfy_run.py`（只依赖 Python 3 标准库） |
| 工作流注册表 | `{{SKILL_DIR}}/workflows/registry.json`（`qwen-t2i` / `qwen-i2i` / `qwen-edit`） |
| 本机产物 | `<会话工作目录>/assets/comfy/output/`（runner 默认目录，已按 DSH 写沙箱限制） |
| 本机参考图 | `<会话工作目录>/assets/comfy/input/`（`--input-dir` / `COMFY_INPUT_DIR` 可改） |

DSH 写沙箱只允许会话工作目录，所以默认产物 / 参考图目录基于 `os.getcwd()`；
不要往 skill 安装目录或 `~/Pictures` 写（会因沙箱失败）。

## 用法

```bash
# 已登记的工作流与可调参数（只读注册表，不访问网络）
python3 "{{SKILL_DIR}}/scripts/comfy_run.py" --list

# 文生图（只要提示词）
python3 "{{SKILL_DIR}}/scripts/comfy_run.py" --host {{COMFY_HOST}} qwen-t2i \
  --set prompt="中景镜头 | 电影时尚摄影，年轻苗族女孩，阳光明媚" \
  --set aspect="16:9 (Widescreen)" --set megapixels=1.0

# 参考图编辑（首选：人物一致性最好，人物/画风跨场景稳定）
python3 "{{SKILL_DIR}}/scripts/comfy_run.py" --host {{COMFY_HOST}} qwen-i2i \
  --set image=@<本地参考图> \
  --set prompt="把这个人物的姿势改成趴在地上往前爬行，从侧面拍摄"

# 另一种编辑流：尺寸控制更细（size_mode / ref_resolution），但人物更容易漂
python3 "{{SKILL_DIR}}/scripts/comfy_run.py" --host {{COMFY_HOST}} qwen-edit \
  --set image=@<本地参考图> \
  --set prompt="只保留第一个形象，动作自然一点"

# 先看改好的图长什么样，不提交：加 --dry-run
```

`--host` 可省（走 `COMFY_HOST` 环境变量或 registry 里的 host）；产物 / 参考图目录用
`--output-dir` / `--input-dir` 可改。runner 会打印本机产物路径、远端路径和尺寸。

## QQ 群场景约定

1. **产物必须发回群**：runner 打印的 `已下载：/绝对路径/...` 就是本地绝对路径，
   用 `qq_send({ images: ["<绝对路径>"], text: "…" })` 发回去；一次最多 4 张。
2. 提示词要短（`qwen-i2i` 尤其）：一句短命令最有效，长句 + 一堆「禁止…」会被忽略。
3. 改图时参考图优先用**会话里最近收到的图片**（`.qq-relay/media/` 下的本地路径），
   不要让用户重新上传；`--set image=@<绝对路径>` 会自动上传到远端。
4. 群里先回一句「正在画…」再跑长任务（服务端 6–20s，冷启动更久）。
5. 要多张候选就换 seed 跑几次再挑，不要指望一次出好几张。

## 必须记住的坑

- **两套采样参数不能互换**：`qwen-t2i` / `qwen-i2i` 是 **base 主干 + 20 步 + euler/beta**；
  `qwen-edit` 是 **turbo + 8 步 + euler/simple**。turbo 加步数只会更糙，base 用 8 步没去噪干净；cfg 都保持 1.0。
- **`qwen-i2i` 种子必须由 runner 注入**（schema 标了 `random`）：图里的种子写死，
  ComfyUI 服务端和 `/prompt` 都不改种子，绕开 runner 直连会每次都出同一张。
- **`qwen-i2i` 一格里只放一个动作，多试几个种子**：最难的姿势换种子会抽到双人构图。
- **`qwen-edit` 的 `size_mode` 语义反直觉**：`reference`（默认）= 出图尺寸跟随参考图，
  此时 `aspect` / `megapixels` **完全不生效**；要固定比例必须显式 `--set size_mode=selector`。
  图里对应 `459:468` 的 `switch`，`false` 才是 reference。
- **`qwen-edit` 的 `ref_resolution=0`（默认）表示参考图保原始尺寸**（仅对齐 32 的倍数），
  细节最全但最慢；调大（如 1024）会压到约 resolution² 像素，更快、细节会丢。
- `qwen-t2i` / `qwen-i2i` 的采样器 / 调度器没写进 schema，想改得改 `api.json`。

## 安全边界

- runner **只认 `workflows/*.schema.json` 里声明的参数**：未知参数、非法枚举、越界数值会在提交前退出。
- `POST /prompt` 能提交任意图，而自定义节点里能跑任意 Python——直连等于把**远端机器的执行权**交出去。
  **不要绕过 runner 直接 POST /prompt**，也不要 `curl` 手搓工作流。
- 服务端无鉴权，只允许在可信网络使用，不要把这个端口暴露到公网。
- 想加参数：改对应 `schema.json` 的 `params`（节点 id → 字段），改完先 `--dry-run` 核对字段类型。

## 排障

- 预检：runner 会先查远端 `/object_info/<class_type>`；报「未注册」= 远端缺 custom_node 或权重。
- 提交 400：runner 会打印 `node_errors` 里每个节点的 message 与 details。
- 常用端点：`/system_stats`（存活与版本）、`/object_info`（节点定义）、`/queue`（队列）、
  `/history`（含完整 API 图与产物）。
- **实例在远端，agent 看不到也停不掉**：不要尝试重启或 kill；需要重启的改动请用户执行。
- 连不上时：先 `curl -s {{COMFY_HOST}}/system_stats` 确认实例在跑；若只听了回环，
  用 SSH 隧道后 `--host http://127.0.0.1:8188`。
- 下载失败时 runner 会打印远端路径，可手动 `/view?filename=...&subfolder=&type=output` 取回。

## references

- [`references/workflow-contracts.md`](references/workflow-contracts.md)：qwen 三件套的细节与契约。
- [`references/moss-image.md`](references/moss-image.md)：**仅 MOSS-Image**（JSON Layout、文字、倾斜、密度上限），
  不要套到 `qwen-t2i` / `qwen-i2i` / `qwen-edit`。
- [`assets/moss-image.api.json`](assets/moss-image.api.json)：MOSS-Image 的 API 图（未进 registry，runner 不认）。
- 远端工作流导出与新增流程见 `references/workflow-contracts.md`「新增工作流」一节。
