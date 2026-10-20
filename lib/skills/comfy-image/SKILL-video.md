---
name: comfy-video
description: >
  用远端 ComfyUI 上的 MiniMax H3 生成短视频（带原生音频）。三个工作流：
  `h3-t2v` 纯文生视频、`h3-i2v` 首帧图转视频、`h3-r2v` 参考图转视频（角色一致性最好）。
  走 HTTP API：用 scripts/comfy_run.py 提交 workflows/ 注册表里的 API 格式工作流，
  只允许改 schema 白名单里的参数；产物 mp4 下载回本机会话工作目录，
  再由 qq_send 的 videos 参数发回 QQ 群。
whenToUse: 需要生成视频、让一张图动起来、把角色做成几秒动画时。
---

# ComfyUI 视频生成（MiniMax H3，QQ 群场景）

> 本文件是插件自带的 skill 模板：host 注册时会做字面替换——
> `{{COMFY_HOST}}` → ComfyUI 地址，`{{SKILL_DIR}}` → 本 skill 的实际安装目录。
> 其余内容按替换后的值直接执行。

## 环境

| 项 | 值 |
|---|---|
| 服务端 | `{{COMFY_HOST}}`（ComfyUI，MiniMax H3，**无鉴权**，只允许可信网络） |
| 运行器 | `{{SKILL_DIR}}/scripts/comfy_run.py`（只依赖 Python 3 标准库） |
| 工作流注册表 | `{{SKILL_DIR}}/workflows/registry.json` |
| 本机产物 | `<会话工作目录>/assets/comfy/output/`（视频在 `video/` 子目录） |
| 本机参考图 | `<会话工作目录>/assets/comfy/input/`（`--input-dir` / `COMFY_INPUT_DIR` 可改） |

DSH 写沙箱只允许会话工作目录，所以产物 / 参考图默认目录基于 `os.getcwd()`；
不要往 skill 安装目录或 `~/Movies` 写（会因沙箱失败）。

## 三个工作流

| key | 输入 | 用途 |
|---|---|---|
| `h3-t2v` | 只要提示词 | 纯文生视频；最通用 |
| `h3-i2v` | 一张首帧图 + 提示词 | 让已有图片动起来，第一帧尽量贴合原图 |
| `h3-r2v` | 一张参考图 + 提示词 | 角色一致性最好；提示词里用 `<Subject 1>` 指代参考角色 |

共同参数：`steps`（4=加速预览 / 8=品质，默认 8）、`aspect`、`megapixels`（默认 0.4）、
`duration`（秒，默认 5，fps=24）、`seed`、`filename_prefix`。

## 用法

```bash
# 已登记的工作流与可调参数（只读注册表，不访问网络）
python3 "{{SKILL_DIR}}/scripts/comfy_run.py" --list

# 文生视频（默认 16:9 / 0.4MP / 5s / 8 步）
python3 "{{SKILL_DIR}}/scripts/comfy_run.py" --host {{COMFY_HOST}} h3-t2v \
  --set prompt="一只橘猫在草地上奔跑，阳光明媚，电影感，慢镜头" \
  --set aspect="16:9 (Widescreen)" --set megapixels=0.4 --set duration=5

# 首帧图转视频
python3 "{{SKILL_DIR}}/scripts/comfy_run.py" --host {{COMFY_HOST}} h3-i2v \
  --set image=@<本地首帧图> \
  --set prompt="人物缓缓转头看向镜头，头发被风吹动，气氛安静"

# 参考图转视频（角色一致性；prompt 里用 <Subject 1> 指代参考角色）
python3 "{{SKILL_DIR}}/scripts/comfy_run.py" --host {{COMFY_HOST}} h3-r2v \
  --set image=@<本地参考图> \
  --set prompt="<Subject 1> 站在水族馆的蓝色玻璃幕墙前，抬手轻碰玻璃，鲸鱼尾巴缓缓摆动。\nAudio: 水下低频环境声，气泡声。" \
  --set duration=5

# 先看改好的图，不提交：加 --dry-run
```

runner 会打印本机产物路径（`已下载：/绝对路径/...mp4`）、远端路径、尺寸与时长。

## QQ 群场景约定

1. **产物必须发回群**：用 `qq_send({ videos: ["<绝对路径>"], text: "…" })` 发视频消息
   （NapCat 会内联播放；一次一个）。不要用 images 参数发 mp4。
2. **先回一句**「正在生成视频…」再跑长任务：0.4MP/5s/8 步通常几十秒，冷启动更久。
3. **提示词按时间线写**更适合视频：`[0s-1s] … [1s-2s] …`，另起一行写
   `Audio: …` 描述环境声 / 音效 / 配乐——H3 会生成原生音频。
4. 参考图优先用**会话里最近收到的图片**（`.qq-relay/media/` 下的本地路径），
   不要让用户重新上传；`--set image=@<绝对路径>` 会自动上传到远端。
5. 要多个候选就换 seed 多跑几次；一次只出一个视频。

## 必须记住的坑

- **steps：4 步是 LightX2V 加速（约省一半时间，适合预览），8 步是质量档**。LoRA 是 8 步
  turbo，不要开 20+ 步（只会更慢、不会更清晰）。
- **duration 是秒，不是帧数**：fps=24，帧数会自动对齐（5s ≈ 124 帧）。时长越长显存与时间
  近似线性增长；12G 卡上别一上来就 10s + 1.0MP。
- **分辨率**：0.4MP + 16:9 ≈ 864×480（默认）；先 0.2~0.4 预览，确认构图再用 0.6~1.0。
- **i2v 的首帧图**：输出尺寸由 ResolutionSelector 决定，输入图会被适配；首帧与提示词冲突时
  以提示词为准。
- **r2v 的参考图是角色参考，不是首帧**：`ref_image_size=match` 会按参考图适配；
  提示词里用 `<Subject 1>` 指代，别在提示词里重复描述长相（容易漂）。
- **音频是模型原生生成的**，不能后期单独换；想安静就写 `Audio: quiet room tone`。
- **ComfyUI 一次只跑一个任务**：队列不为 0 时先等；runner 默认最多等 1800s。
- 服务端是 **MiniMax H3 pruned int8 + 8 步 turbo LoRA**，不是 Qwen-Image；图片工作流见
  `comfy-image` skill。

## 安全边界

- runner **只认 `workflows/*.schema.json` 里声明的参数**：未知参数、非法枚举、越界数值会在提交前退出。
- `POST /prompt` 能提交任意图，而自定义节点里能跑任意 Python——直连等于把**远端机器的执行权**交出去。
  **不要绕过 runner 直接 POST /prompt**。
- 服务端无鉴权，只允许在可信网络使用，不要把这个端口暴露到公网。

## 排障

- 预检：runner 会先查远端 `/object_info/<class_type>`；报「未注册」= 远端缺 custom_node 或权重
  （MiniMax H3 需要对应节点与 minimax_h3_* 权重）。
- 提交 400：runner 会打印 `node_errors` 里每个节点的 message 与 details。
- 常用端点：`/system_stats`（存活与版本）、`/object_info`、`/queue`、`/history`。
- **实例在远端，agent 看不到也停不掉**：不要尝试重启或 kill；需要重启的改动请用户执行。
- 连不上时：先 `curl -s {{COMFY_HOST}}/system_stats` 确认实例在跑；若只听了回环，
  用 SSH 隧道后 `--host http://127.0.0.1:8188`。
- 下载失败时 runner 会打印远端路径，可手动 `/view?filename=...&subfolder=video&type=output` 取回。

## references

- [`references/video-workflows.md`](references/video-workflows.md)：三个视频工作流的节点结构、
  采样参数、实测耗时与踩坑记录。
- [`references/workflow-contracts.md`](references/workflow-contracts.md)：图片工作流契约（qwen / MOSS）。
