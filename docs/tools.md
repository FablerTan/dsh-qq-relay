# DSH → QQ 主动推送工具（`qq_send`）

> 状态：**已实现（2026-10-19，P3 第一项）；v0.12.0 起支持出向图片 / 文件**。host 半身注册，
> 属于 profile 装配面——装上后需重启该 profile 的 GUI 才生效。设计取舍见
> [architecture.md](./architecture.md)，媒体细节见 [media.md](./media.md)，
> 协议端事实见 [onebot-channel.md](./onebot-channel.md)。

## 1. 用途与边界

- 让**任意 DSH 会话**（不只 QQ 触发的会话）把文本、图片、文件主动推到白名单 QQ 群：
  任务完成通知、定时提醒、跨会话转告、把生成的图表 / 文档发回群里等。
- 与 relay 共用同一条 OneBot WS 连接和出向发送队列——不额外建连、不重复登录。
- 不做：私聊、@ 指定成员、Markdown 渲染（QQ 不渲染）、视频 / 语音发送。

## 2. 工具契约

| 字段 | 内容 |
|---|---|
| `name` | `qq_send` |
| `parameters` | `text`（string，可选）、`images`（string[]，可选：本地绝对路径或 http(s) URL，最多 4 张）、`file`（string，可选：本地绝对路径）、`fileName`（string，可选：文件显示名）、`groupId`（integer，可选：唯一白名单群时可省略）。`text / images / file` 至少给一个 |
| `output.schema` | `{ groupId, chunks, queued, messageIds }`（必填）+ `media?: { images: number, file: string }`（发了图片 / 文件时才有） |
| 调用方式 | PTC mode 下在 `run_code` 程序里 `await tools.qq_send({ ... })` |

execute 语义：

1. 校验内容：`text / images / file` 至少要有一个；文本 ≤ 20000 字符、图片 ≤ 4 张；
   `exec.signal` 已中止则直接失败；
2. 解析群号：显式 `groupId` → 校验白名单；省略 → 唯一白名单群；多群 / 无群 → 报错；
3. 发送顺序：文本 → 图片 → 文件；文本交给 relay 切分（`replyChunkSize`）并发送，连接不可用时
   整段进入发送队列，返回 `queued: true`（队列上限 50 条 / 保留 30 分钟）；
4. 图片 / 文件由 relay 校验本地路径、大小与图片格式后转 base64 发送；**离线时直接报错不排队**；
5. 发送成功与 relay 回复一样刷新 `lastBotSpeakAt`、清空闸门 pending（文件上传不算发言）。

错误语义（模型可见）：内容为空 / 文本过长 / 图片过多、群不在白名单、多群未指定、relay 未启动、
本地文件不存在 / 不是绝对路径 / 超限 / 不是支持的图片格式、NapCat 明确失败（retcode）。

## 3. 安全与限流

- **群白名单**：工具层先挡一次（错误信息可读），relay 侧再挡一次（最终防线）。
- 单次文本上限 20000 字符；超长自动切分为多条（顺序保留）。
- 出向图片 ≤ 10 MiB / 文件 ≤ 30 MiB；本地文件先读成 base64（NapCat 在 Docker 里看不到宿主路径）。
- 与自动回复共享发送队列与风控退避，不会绕过频率限制。
- 工具只做「发消息 / 图片 / 文件」，不提供读取群消息 / 成员信息 / 管理操作。

## 4. 注册与生命周期

- 组合根在 `ctx.inject(['tools'])` 子 fiber 里注册（`lib/index.js` ③）；宿主没有 tools 服务时
  **静默跳过**，relay 与配置页照常工作。
- 工具定义手写为普通 `ToolDefinition` 形状对象（`lib/controller/tools.js`），**不 import
  `@deepseek-ai/dsh-tools`**——保持本插件运行时零外部依赖；参数校验由本模块自己负责。
- 工具在 profile 的**所有会话**可见；改 host 半身后需重启该 profile 的 GUI。

## 5. 验证

- 单测：`test/tools.test.js`（参数 / 群解析 / 输出 / render）、`test/relay.test.js`
  （切分发送、白名单、离线队列补发）、`test/apply.test.js`（注册 + 离线返回 queued）。
- 真机：重启 dwdev 后，在任意会话里让 agent 调 `qq_send`（或在 `run_code` 里直接
  `await tools.qq_send({ text: '测试推送' })`），到群里确认收到；离线时返回值应为
  `queued: true`，重连后自动补发。
- 出向媒体真机：工作区里放一张图片，`await tools.qq_send({ images: ['/abs/path/a.png'] })`
  确认群里收到图片；再放一个 pdf，`await tools.qq_send({ file: '/abs/path/a.pdf', fileName: '报告.pdf' })`
  确认群文件里出现该文件。

## 6. 未决

- 敏感推送是否要接审批（与 P3 的 QQ 侧审批方案一起定）。
- 是否支持 @ 指定成员（媒体已在 v0.12.0 支持）。
- 出向媒体是否也走发送队列（当前离线直接报错）。
- 是否限制某些会话可用该工具（按 agent scope 限制，`ctx.tools.restrict`）。
