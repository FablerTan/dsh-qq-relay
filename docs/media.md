# 媒体落盘与聊天记录链接（规格）

> 状态：**v0.9.0 入向媒体落盘；v0.9.1 修正扩展名（按真实文件头识别）；
> v0.12.0 扩展到视频 / 语音入向，并支持出向图片 / 文件**。
> 本文是媒体落盘、聊天记录 / prompt 引用与出向发送的现状记录。
> 聊天记录与消息拼接见 [chat-context.md](./chat-context.md)，`qq_send` 契约见 [tools.md](./tools.md)。
>
> 用户决策（2026-10-19）：**下载到本地，聊天记录链接到对应位置**。

## 1. 范围

- 入向 CQ **图片**（含 `sub_type=1` 的动画表情 / 贴纸）与 **商城表情**：下载文件到群项目内。
- 入向 **视频 / 语音**（v0.12.0）：同样下载到 `.qq-relay/media/`，聊天记录与 prompt 引用路径。
- 入向 **face（QQ 内置表情，如 /失眠）**：没有可下载文件，只记元信息与表情文本。
- **出向**（v0.12.0）：`qq_send` 可发图片（本地路径 / URL）与上传群文件（本地路径）；
  NapCat 跑在 Docker 里看不到宿主路径，所以本地文件一律读成 base64 走 WS。
- 不做：入向群文件（`group_upload` notice）、入向媒体转 DSH 附件、视频 / 语音转文字（见 §9 backlog）。

## 2. 存储布局

```
<project>/.qq-relay/
├── .gitignore                  # 内容 *（整个 .qq-relay 不进 git）
├── chat/<群号>/YYYY-MM-DD.jsonl
└── media/<群号>/YYYY-MM-DD/<messageId>-<序号>.<扩展名>
```

- 项目目录解析与聊天记录一致（见 chat-context §4）；`.gitignore` 由 `ensureRelayDir` 保证。
- 文件名：`<messageId>-<序号>`，序号按**可下载媒体**在消息内的顺序从 0 起。
- 扩展名以**实际内容**为准（v0.9.1）：文件头 magic bytes（JPEG / PNG / GIF / WEBP / BMP）
  → 响应 `content-type` → CQ `file` / URL 后缀 → `.bin`。QQ 图片的 CQ 文件名常与实际格式不符
  （真实案例：JPEG 被命名成 `.png`，读图工具按扩展名拒读）。

## 3. 下载规则

| 规则 | 值 |
|---|---|
| 触发时机 | 收到群消息且消息含图片 / 表情段时（在写聊天记录前） |
| 协议 | 只允许 `http:` / `https:` |
| 超时 | 10 秒（AbortController） |
| 单文件上限 | 20 MiB |
| 单消息媒体数 | 最多 10 个 |
| 扩展名 | 文件头 magic bytes（图片 / 视频 / 语音）→ `content-type` → CQ file / URL 后缀 → `.bin` |
| 支持的入向类型 | 图片（jpeg / png / gif / webp / bmp / avif）· 视频（mp4 / avi / webm / flv）· 语音（amr / silk / mp3 / ogg / wav） |
| 失败处理 | 不阻断消息流；聊天记录写 `status: "failed"`，prompt 显示 `[媒体下载失败]` |
| 幂等 | 同一条消息只会处理一次（`state.markSeen` 在下载前），无需去重 |

- 下载完成后再追加聊天记录，保证日志里的路径一定可用。
- 下载期间消息的直通 / 闸门派发延后（正常图片 < 1 秒；超时最坏 10 秒）。
- 下载失败只记 warn，不重试（QQ 图片 URL 带 rkey，过期后重试也无意义）。

## 4. 聊天记录里的媒体字段

在 [chat-context.md §3.1](./chat-context.md) 的记录上新增可选 `media` 数组：

```json
{
  "kind": "image | sticker | face | video | voice",
  "status": "saved | failed | metadata",
  "path": ".qq-relay/media/10002/2026-10-19/310093866-0.jpg",
  "bytes": 133634,
  "contentType": "image/jpeg",
  "faceId": "468",
  "text": "/失眠",
  "reason": "timeout"
}
```

- `saved`：`path` 为**相对项目根**（即会话 cwd）的路径，agent 可直接 read；
- `failed`：只有 `reason`（`invalid-url` / `unsupported-protocol` / `http-<code>` / `too-large` / `empty` / `timeout` / `network`）；
- `metadata`：face 或没有 url 的媒体（如部分商城表情），保留 `file` / `summary` / `text`；
- 原始 CQ 码仍保留在 `raw` 字段，作为兜底审计。
- v0.9.0 写入的旧文件可能带着错误扩展名（按 CQ 文件名）；v0.9.1 不会自动重命名历史文件，
  确认内容相同的话可手工删掉错误后缀的那份。

## 5. prompt 拼接

在 chat-context §5 的行格式上追加媒体标记（同一行内、正文之前）：

```
[13:38:59] [TS] [图片：.qq-relay/media/10002/2026-10-19/310093866-0.jpg]
[13:39:10] [TS]（@你） [图片：.qq-relay/media/.../72-0.png] 这张图什么意思
[13:39:20] [TS] [表情 /失眠]
```

- 图片 / 贴纸：`[图片：<相对路径>]` / `[表情：<相对路径>]`；
- 视频 / 语音：`[视频：<相对路径>]` / `[语音：<相对路径>]`；
- face：`[表情 <faceText>]`（没有文本时 `[表情]`）；
- 失败：`[媒体下载失败]`；
- **纯媒体消息（无文本）也可以生成 prompt**（此前会被当作空消息跳过）——@ 带图时会真正转给 DSH；
- 闸门仍只收有文本的消息（纯图片 / 表情不进 pending、不调分类器）。

## 5.1 出向媒体（v0.12.0）

- 入口：`qq_send` 工具（`text` / `images` / `file` / `fileName`，见 [tools.md](./tools.md)）。
- **图片**（`images`，最多 4 张）：
  - 本地绝对路径：校验存在 / 普通文件 / ≤ 10 MiB / 文件头是支持的图片格式，然后读成
    `base64://…` 交给 `send_group_msg` 的 image 段；
  - `http(s)://` URL：直接交给 NapCat 下载（不经过宿主）。
- **文件**（`file`，1 个）：本地绝对路径，≤ 30 MiB，读成 `base64://…` 交给
  `upload_group_file`（NapCat 解码后上传到群文件）；显示名默认取路径 basename，可用 `fileName` 覆盖。
- 为什么必须 base64：NapCat 跑在 Docker（只挂载了 QQ 数据 / 配置 / 插件目录），**看不到宿主路径**；
  NapCat 的资源解析器支持 `base64://`，因此本地文件必须先转 base64。
- 离线语义：出向媒体**不排队**（队列只存文本）；离线时直接报错，让调用方决定稍后重试。
- 发送成功记一次 `markSpoken`（图片算 bot 发过言，刷新闸门窗口）；文件上传不改变闸门状态。
- 失败语义：文件不存在 / 非图片 / 超限 / 白名单外 / NapCat 明确失败都会抛出可读错误，工具层可见。

## 6. 与 jev 的关系

- jev 的上下文来自聊天日志；媒体消息的 `text` 为空，因此对分类器近似“存在一条无文本消息”，
  不影响阈值逻辑；
- 纯媒体消息不进闸门，所以不会触发分类器调用（v0.8.1 起）。

## 7. 保留与清理

- 媒体文件目前**不自动删除**（与聊天记录默认一致，`chatRetentionDays: 0`）。
- 当 `chatRetentionDays > 0`：启动与每日清理时，同时按日期目录删除过期的
  `media/<群号>/<日期>/`（整目录删除），与聊天日志同一天数。

## 8. 失败与安全

- 下载失败 / 超时 / 超大 → 只记日志 + `status: failed`，不阻断消息处理；
- 只接受 http(s)，拒绝 `file:` 等本地协议（防止被消息诱导读本地文件）；
- 单文件 20 MiB 上限、单消息 10 个上限，避免被大文件 / 刷图拖垮；
- 媒体落在 `.qq-relay/` 内，`.gitignore` 为 `*`，不会进用户仓库。

## 9. 未做（backlog）

- 入向群文件（`group_upload` notice）：目前只处理消息段里的媒体，群文件上传通知被忽略；
- 入向媒体转 DSH 附件（当前 agent 直接 read 路径即可看图片；视频 / 语音要自己解析）；
- 媒体大小 / 类型 / 开关的配置项（当前是常量：入向 20 MiB / 上限 10 个，出向图片 10 MiB / 文件 30 MiB）；
- 按消息 id 去重与失败重试（当前依赖 seen 去重，失败不重试）；
- 私聊媒体。

## 10. 测试

- `test/media.test.js`：媒体计划解析（image / sticker / face / mface）、扩展名与路径、下载成功、
  HTTP 失败 / 网络失败 / 超时 / 超大 / 非 http、face 元信息、日志归一化、按日期清理、
  以及 v0.9.1 的 magic bytes 扩展名识别（CQ 后缀错 / content-type 不匹配时以真实内容为准）。
- `test/relay.test.js`：图片消息落盘 + 聊天记录带路径；@ 带图（无文本）prompt 带图片标记；
  v0.12.0 出向 `sendImage` / `sendFile`（本地转 base64 / URL / 大小与格式校验 / 离线报错 / 白名单）。
- `test/prompt.test.js`：媒体标记（图片 / 表情 / 视频 / 语音 / 失败）与纯媒体行。
- `test/tools.test.js`：`qq_send` 的文本 / 图片 / 文件参数与输出摘要。
