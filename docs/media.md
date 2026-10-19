# 媒体落盘与聊天记录链接（规格）

> 状态：**v0.9.0 已实现（2026-10-19）**。本文是入向媒体（图片 / 表情）落盘与聊天记录、
> prompt 引用的现状记录。聊天记录与消息拼接见 [chat-context.md](./chat-context.md)。
>
> 用户决策（2026-10-19）：**下载到本地，聊天记录链接到对应位置**。

## 1. 范围

- 入向 CQ **图片**（含 `sub_type=1` 的动画表情 / 贴纸）与 **商城表情**：下载文件到群项目内。
- 入向 **face（QQ 内置表情，如 /失眠）**：没有可下载文件，只记元信息与表情文本。
- 不做：视频 / 语音 / 群文件 / 出向媒体上传 / 媒体入向转 DSH 附件（见 §9 backlog）。

## 2. 存储布局

```
<project>/.qq-relay/
├── .gitignore                  # 内容 *（整个 .qq-relay 不进 git）
├── chat/<群号>/YYYY-MM-DD.jsonl
└── media/<群号>/YYYY-MM-DD/<messageId>-<序号>.<扩展名>
```

- 项目目录解析与聊天记录一致（见 chat-context §4）；`.gitignore` 由 `ensureRelayDir` 保证。
- 文件名：`<messageId>-<序号>`，序号按**可下载媒体**在消息内的顺序从 0 起。
- 扩展名：优先 CQ `file` 字段的扩展名 → URL pathname → 响应 `content-type` → `.bin`。

## 3. 下载规则

| 规则 | 值 |
|---|---|
| 触发时机 | 收到群消息且消息含图片 / 表情段时（在写聊天记录前） |
| 协议 | 只允许 `http:` / `https:` |
| 超时 | 10 秒（AbortController） |
| 单文件上限 | 20 MiB |
| 单消息媒体数 | 最多 10 个 |
| 失败处理 | 不阻断消息流；聊天记录写 `status: "failed"`，prompt 显示 `[媒体下载失败]` |
| 幂等 | 同一条消息只会处理一次（`state.markSeen` 在下载前），无需去重 |

- 下载完成后再追加聊天记录，保证日志里的路径一定可用。
- 下载期间消息的直通 / 闸门派发延后（正常图片 < 1 秒；超时最坏 10 秒）。
- 下载失败只记 warn，不重试（QQ 图片 URL 带 rkey，过期后重试也无意义）。

## 4. 聊天记录里的媒体字段

在 [chat-context.md §3.1](./chat-context.md) 的记录上新增可选 `media` 数组：

```json
{
  "kind": "image | sticker | face",
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

## 5. prompt 拼接

在 chat-context §5 的行格式上追加媒体标记（同一行内、正文之前）：

```
[13:38:59] [TS] [图片：.qq-relay/media/10002/2026-10-19/310093866-0.jpg]
[13:39:10] [TS]（@你） [图片：.qq-relay/media/.../72-0.png] 这张图什么意思
[13:39:20] [TS] [表情 /失眠]
```

- 图片 / 贴纸：`[图片：<相对路径>]` / `[表情：<相对路径>]`；
- face：`[表情 <faceText>]`（没有文本时 `[表情]`）；
- 失败：`[媒体下载失败]`；
- **纯媒体消息（无文本）也可以生成 prompt**（此前会被当作空消息跳过）——@ 带图时会真正转给 DSH；
- 闸门仍只收有文本的消息（纯图片 / 表情不进 pending、不调分类器）。

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

- 视频 / 语音 / 群文件；
- 出向媒体（QQ 发图）；
- 入向媒体转 DSH 附件（让模型直接“看图”而不只是拿到路径）；
- 媒体大小 / 类型 / 开关的配置项；
- 按消息 id 去重与失败重试（当前依赖 seen 去重，失败不重试）。

## 10. 测试

- `test/media.test.js`：媒体计划解析（image / sticker / face / mface）、扩展名与路径、下载成功、
  HTTP 失败 / 网络失败 / 超时 / 超大 / 非 http、face 元信息、日志归一化、按日期清理。
- `test/relay.test.js`：图片消息落盘 + 聊天记录带路径；@ 带图（无文本）prompt 带图片标记。
- `test/prompt.test.js`：媒体标记与纯媒体行。
