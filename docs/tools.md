# DSH → QQ 主动推送工具（`qq_send`）

> 状态：**已实现（2026-10-19，P3 第一项）**。host 半身注册，属于 profile 装配面——
> 装上后需重启该 profile 的 GUI 才生效。设计取舍见 [architecture.md](./architecture.md)，
> 协议端事实见 [onebot-channel.md](./onebot-channel.md)。

## 1. 用途与边界

- 让**任意 DSH 会话**（不只 QQ 触发的会话）把一段纯文本主动推到白名单 QQ 群：
  任务完成通知、定时提醒、跨会话转告等。
- 与 relay 共用同一条 OneBot WS 连接和出向发送队列——不额外建连、不重复登录。
- 不做：私聊、图片 / 文件、@ 指定成员、Markdown 渲染（QQ 不渲染）。

## 2. 工具契约

| 字段 | 内容 |
|---|---|
| `name` | `qq_send` |
| `parameters` | `text`（string，必填）、`groupId`（integer，可选：唯一白名单群时可省略） |
| `output.schema` | `{ groupId, chunks, queued, messageIds }`（全部必填） |
| 调用方式 | PTC mode 下在 `run_code` 程序里 `await tools.qq_send({ ... })` |

execute 语义：

1. 校验文本非空、≤ 20000 字符；`exec.signal` 已中止则直接失败；
2. 解析群号：显式 `groupId` → 校验白名单；省略 → 唯一白名单群；多群 / 无群 → 报错；
3. 交给 relay 切分（`replyChunkSize`）并发送；连接不可用时整段进入发送队列，
   返回 `queued: true`（队列上限 50 条 / 保留 30 分钟）；
4. 发送成功与 relay 回复一样刷新 `lastBotSpeakAt`、清空闸门 pending。

错误语义（模型可见）：文本为空 / 过长、群不在白名单、多群未指定、relay 未启动。

## 3. 安全与限流

- **群白名单**：工具层先挡一次（错误信息可读），relay 侧再挡一次（最终防线）。
- 单次文本上限 20000 字符；超长自动切分为多条（顺序保留）。
- 与自动回复共享发送队列与风控退避，不会绕过频率限制。
- 工具只做「发文本」，不提供读取群消息 / 成员信息 / 管理操作。

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

## 6. 未决

- 敏感推送是否要接审批（与 P3 的 QQ 侧审批方案一起定）。
- 是否支持 @ 指定成员 / 图片 / 文件（依赖媒体支持）。
- 是否限制某些会话可用该工具（按 agent scope 限制，`ctx.tools.restrict`）。
