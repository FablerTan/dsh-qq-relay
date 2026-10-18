# 路线图

> 状态：P0 已完成（2026-10-18）；P1 起需要先解除上级 AGENTS.md §0 的
> 「只做文档 / 空骨架」约束。设计见 [architecture.md](./architecture.md)、
> [official-bot-channel.md](./official-bot-channel.md)、[gate.md](./gate.md)。

## P0 文档（已完成）

- 落地方案文档：架构、官方通道事实、消息闸门、路线图。
- README 同步：用途、目录结构、文档索引、版本历史。
- 不写任何功能代码。

## P1 最小闭环：@ 直通

目标：在测试群里 @ 机器人，DSH 跑完把结果回发群聊。

### 范围

- 凭证：AppID / AppSecret → access_token，提前刷新，失败重试。
- WebSocket：获取网关、连接、Identify、READY、心跳、Resume、重连退避。
- 事件：GROUP_AT_MESSAGE_CREATE（含 @ 直通），去重、忽略 author.bot、白名单校验。
- 会话映射：一群一会话，自动创建（workspace + 标题）；映射持久化。
- 投递：sessionController.prompt（或 agents.followup），关联 messageId → turn。
- 出向：turn/end 收集本轮文本，被动回复（5 分钟窗口内，msg_seq 递增）。
- 窗口过期：按 onPassiveExpired: drop 不回。
- 运行保障：单实例锁、日志、配置校验；服务缺失时静默不崩溃。
- 闸门：本阶段不做 jev，@ 消息全部直通。

### 验收

- 测试群 @ 机器人「你好」→ 5 分钟内收到 DSH 回复。
- 同一条 @ 消息重复推送 → 只回复一次。
- 重启 GUI 后映射与会话仍在，不重复建会话。
- access_token 到期自动刷新，WS 断线自动重连并 Resume。
- 非白名单群 / 机器人自己的消息被忽略。
- 长回复按长度切分，不超平台上限。

## P2 消息闸门

目标：群内普通消息按 gate.md 运行，控制发言频率与成本。

### 范围

- 开启全量消息（GROUP_MESSAGE_CREATE）；确认 @ 事件与全量事件的关系（待实测）。
- 聊天日志 JSONL：落盘、保留 7 天、给 jev 与 DSH 提供上下文。
- jev 分类器：契约、超时、fail closed、决策日志。
- 快路：10 分钟窗口 + 5 秒去抖 + 45 秒最小发言间隔。
- 慢路：2 小时定时器 + 最近 2 小时批量评估。
- 状态持久化：lastBotSpeakAt / cooldownUntil / pending / seenMsgIds；重启恢复。
- 主动消息：配额、429 退避、GROUP_MSG_REJECT/RECEIVE 降级。
- 被动窗口过期策略与测试。

### 验收

- 快路连续三条消息只产生一次 jev 调用与一次回复。
- 慢路 2 小时到点只评估最近 2 小时消息；无消息 no-op。
- 冷却期内 @ 直通仍然生效。
- 主动消息被关闭 / 429 时降级且不刷错误日志。
- 重启后冷却状态恢复，不立即发言。
- 网关重连补发事件不重复回复。

## P3 扩展

- 审批：内嵌键盘按钮 + INTERACTION_CREATE，回复带 event_id；超时按拒绝。
- 单聊（C2C）：60 分钟 / 4 次被动窗口，身份 user_openid。
- 媒体：入向附件下载并进 DSH；出向富媒体上传。
- DSH → QQ 主动推送工具（例如 qq_send），供 agent 在任意会话调用。
- client 半身：状态面板 / 配置面板（连接状态、映射表、最近消息、错误）。
- 多群资源控制：并发上限、队列、每群配额。

## 风险登记

| 风险 | 影响 | 缓解 |
|---|---|---|
| 全量消息权限拿不到 | 闸门拿不到群消息，慢路失效 | 退化为只做 @ 直通；或调整闸门设计 |
| 主动消息被管理员关闭 | 慢路无法发言 | 监听事件并降级为直通 + 被动回复 |
| 群聊被动窗口仅 5 分钟 | 长任务最终结果发不出 | 过期丢弃（已定）；可选「处理中」回执 |
| 网关断线 / 心跳失败 | 漏事件、发送失败 | Resume + msg_id 去重 + 发送队列 |
| 凭证泄露 | 机器人被滥用 | 环境变量 / profile 配置，不写日志 |
| 内容审核不通过 | 消息被拦截 | 日志记录 MESSAGE_AUDIT_REJECT，提示用户 |
| GUI 不常驻 | relay 离线 | 文档写明「relay 在线 = GUI 在线」 |
| 多进程重复连接 | 重复回复、互踢 | 单实例文件锁 |

## 用户前置动作

1. QQ 开放平台注册机器人，完成个人 / 企业认证，获取 AppID / AppSecret。
2. 创建测试群并拉入机器人；申请「接收所有消息」（P2 需要）。
3. 决定凭证存放方式（建议环境变量，如 DSH_QQ_BOT_APPID / DSH_QQ_BOT_SECRET）。
4. 选定目标 profile，安装插件并重启 GUI。
5. P0 文档 review 通过后，明确解除仓库 §0 约束，开始 P1。
