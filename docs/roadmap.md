# 路线图

> 状态：P0 已完成（2026-10-18）；P1「@ 直通」已真机验收；P1.5 基础配置页已落地（2026-10-19）；
> **P2.1/P2.2 消息闸门骨架与收尾已落地、P2.3 jev 分类器已接（OpenRouter `typesafe/jev-1.14`）；
> P3 `qq_send` 主动推送与 QQ 侧审批已落地（2026-10-19）**。
> **P4 聊天记录与消息拼接**：`.qq-relay/` 隐藏目录 + 群项目目录 + prompt 拼接，
> v0.8.0 已实现（2026-10-19；真机验收待用户重启 GUI 后确认），见 [chat-context.md](./chat-context.md)。
> **P4.1 入向媒体落盘**：图片 / 表情下载进 `.qq-relay/media/` 并写进聊天记录与 prompt，
> v0.9.0 已实现（2026-10-19），见 [media.md](./media.md)。
> 上级 AGENTS.md §0 已按用户要求**仅对 `dsh-qq-relay` 解除**（2026-10-19）。
> 设计见 [architecture.md](./architecture.md)、[onebot-channel.md](./onebot-channel.md)、
> [gate.md](./gate.md)。

## P0 文档（已完成）

- 落地方案文档：架构、OneBot 通道、消息闸门、路线图。
- README / AGENTS 同步：用途、目录结构、文档索引、版本历史。
- 不写任何功能代码。
- 协议端实测（2026-10-19）：NapCat 跑在 Docker（Colima，linux/arm64），OneBot 11 正向 WS
  连通；@ / 普通消息 / 引用回复 / `send_group_msg` / 历史查询均验证通过。记录见
  [onebot-channel.md §9](./onebot-channel.md)。

## P1 最小闭环：@ 直通

目标：在测试群里 @ 机器人，DSH 跑完把结果回发群聊。

### 进度（2026-10-19）

- ✅ 连接层 / 事件层 / 直通判定 / 会话映射 / 投递 / 出向回发 / 单实例锁已实现（含单测）。
- ⏳ 待真机验收：重启 dwdev GUI 后在测试群逐项跑验收清单。

### 范围

- **部署前提**：NapCat 跑在 Docker（Colima）里，bot 小号已登录；OneBot 11 正向 WS
  `ws://127.0.0.1:3001` + token（详见 [onebot-channel.md §3](./onebot-channel.md)）。
- **目标 profile**：`dwdev`（已清空为只装本插件；装完需重启该 profile 的 GUI）。
- **工作目录**：默认 `~/dsh/qq-relay-ws`；P1 先固定配置，后续做成插件设置。
- **配置项**：见 [architecture.md §2.1](./architecture.md)。
- 连接层：WS 客户端（鉴权、重连退避、心跳、echo、self_id 校验、单实例锁）。
- 事件：group message、忽略 message_sent、message_id 去重、群白名单。
- 直通判定：message 段含 at self_id / 引用回复 / 命令前缀。
- 会话映射：一群一会话，自动创建（workspace + 标题）；映射持久化。
- 投递：sessionController.prompt（或 agents.followup），关联 messageId → turn。
- 出向：turn/end 收集本轮文本，send_group_msg 回复；长文本切分；发送失败重试。
- 闸门：本阶段不做 jev，@ 消息全部直通。
- 运行保障：日志、配置校验；服务缺失时静默不崩溃。

### 验收

### 验收状态（2026-10-19）

- ✅ 真机已验证：@ → 回复（约 4 秒）；NapCat 重启后 WS 自动重连、重连后消息正常；重连后复用原会话不重建。
- ✅ 单测覆盖：重复事件只回一次、非白名单 / `message_sent` 忽略、长文本切分、退避重连。
- ✅ DSH 单轮超过 5 分钟（实测 6 分 04 秒）结果仍能发出。
- ✅ 重启 dwdev GUI 后：锁被新进程接管、映射复用原会话，重启后首条消息正常回复。

- 测试群 @ 机器人「你好」→ 收到 DSH 回复。
- **DSH 单轮超过 5 分钟 → 结果仍能发出**（真实 QQ 号无回复窗口）。
- 同一条消息重复事件 → 只回复一次。
- 重启 GUI 后映射与会话仍在，不重复建会话。
- WS 断线自动重连，断线期间不崩溃；重连后不重复回复。
- 非白名单群 / 机器人自己的 message_sent 被忽略。
- 长回复按长度切分，不超 QQ 实际限制。
- `pnpm check` 全绿（语法 + 类型 + 文档配对）。

## P1.5 基础配置页（已完成，2026-10-19）

目标：不重启 GUI 就能看状态、改配置。

### 范围

- 设置 →「QQ 机器人」页面（`settings.section`）：状态 / 配置表单 / 群映射只读。
- host 三条同源 HTTP 路由（status / config / reconnect），统一 JSON 信封。
- 配置覆盖落盘 `~/.dsh/storages/dsh-qq-relay/settings.json`；保存后立即重建连接（锁不重入）。
- token 只写不读；非法配置 400 且不落盘。

### 验收（2026-10-19）

- ✅ 单测：设置覆盖 / 脱敏 / 原子读写、路由面、`apply()` 集成（51 个全过）。
- ✅ `pnpm check` 全绿（语法 + 类型 + 文档配对）。
- ✅ 真机验收（2026-10-19，用户确认）：刷新 dwdev 页面后「设置 → QQ 机器人」可见；状态行、配置保存、重新连接、映射表均正常。

## P2 消息闸门（P2.1 骨架已落地，2026-10-19）

目标：群内普通消息按 gate.md 运行，控制发言频率与成本。

### 进度（2026-10-19）

- ✅ 聊天日志 JSONL 落盘 / 读取；P2.2 起按保留期（7 天）每天清理一次（v0.8.0 起改为默认永久保留，见 [chat-context.md](./chat-context.md) §7）。
- ✅ 每群状态按群分文件 `state/<group_id>.json`：seen / pending / lastBotSpeakAt / lastReplyAt /
  cooldownUntil / evaluating / dshBusy；旧 `state.json` 一次性迁移；重启恢复 pending 与冷却，不立即发言。
- ✅ 快路：bot 最近 10 分钟发过言 → 5 秒去抖合并，一批只调一次分类器。
- ✅ 最小发言间隔 45 秒：间隔内的批次延后（消息不丢）。
- ✅ 慢路：2 小时定时器到点评估累积消息，只取最近 2 小时（更早丢弃）；无消息 no-op。
- ✅ 分类器以接口注入：超时 / 报错 / 输出不合规一律 fail closed；决策落 `gate/*.jsonl`（不含正文），
  保留 7 天，便于调阈值 / 回放。
- ✅ DSH 忙（dshBusy）时延后评估，避免同群并发起两个 turn。
- ✅ 发送队列：断线或发送失败排队，重连后按序补发；风控限流退避、明确失败不重试；上限 50 条 / 30 分钟。
- ✅ 群成员昵称 / 角色：直接取事件自带的 `sender.card || sender.nickname` / `sender.role`，
  不额外调 `get_group_member_info`（事件缺字段时才需要补查）。
- ✅ **jev 分类器接模型（P2.3）**：OpenRouter Decisions API + `typesafe/jev-1.14`（Noul 概率 →
  阈值 0.7 判定），key 走 `OPENROUTER_API_KEY` 环境变量；超时 / 网络 / 格式错误一律 fail closed。
  见 [gate.md §4](./gate.md)。
- ✅ **闸门参数进设置页（v0.10.0）**：`debounce` / `fastMinReplyInterval` / `jevThreshold` 可在
  设置 →「QQ 机器人」→「闸门」里改，保存即重建闸门（无需重启）；阈值动态读取。
- ⏳ 真机验证：`gate.enabled: true` + key 就绪后按下面验收清单跑（快路合并 / 慢路定时 / 冷却 / 频控）。
- ⏳ 阈值调优：先用 0.7，按 `gate/*.jsonl` 决策日志再调。

### 范围

- 聊天日志 JSONL：落盘、保留 7 天、给 jev 与 DSH 提供上下文。
- jev 分类器：契约、超时、fail closed、决策日志。
- 快路：10 分钟窗口 + 5 秒去抖 + 45 秒最小发言间隔。
- 慢路：2 小时定时器 + 最近 2 小时批量评估。
- 状态持久化：lastBotSpeakAt / cooldownUntil / pending / seenMessageIds；重启恢复。
- 发送队列与 retcode 退避；断线期间排队。
- 群成员昵称 / 角色（get_group_member_info）用于 prompt 前缀。

### 验收

- 快路连续三条消息只产生一次 jev 调用与一次回复。
- 慢路 2 小时到点只评估最近 2 小时消息；无消息 no-op。
- 冷却期内 @ 直通仍然生效。
- 重启后冷却状态恢复，不立即发言。
- 发送频率被 QQ 风控时退避且不刷错误日志。
- WS 断线重连后不重复回复、队列不丢。

## P3 扩展

- ✅ 审批：文本命令（同意 / 拒绝），超时按拒绝（2026-10-19 已实现，见 [approval.md](./approval.md)；
  真机验证待用户重启 dwdev 后在 QQ 群里触发需要审批的操作确认）。
- 私聊（private）：与群共享映射体系还是独立会话，待定。
- 媒体：入向图片 / 表情已落盘（v0.9.0，见 [media.md](./media.md)）；仍缺视频 / 语音 / 群文件、
  入向转 DSH 附件、出向图片 / 文件上传发送。
- ✅ DSH → QQ 主动推送工具 `qq_send`（2026-10-19 已实现，契约见 [tools.md](./tools.md)；
  真机验证待用户重启 dwdev 后在任意会话调用确认）。
- client 半身面板增强：映射管理、闸门状态、最近消息（基础配置页已在 P1.5 交付，见 [client.md](./client.md)）。
- 多群资源控制：并发上限、队列、每群配额。

## P4 聊天记录与消息拼接（v0.8.0 已实现，2026-10-19）

目标：聊天记录落在「群绑定的项目」隐藏目录 `.qq-relay/` 里，agent 可直接读；
发给 DSH 的 prompt 带上群名 / 时间 / @ 与引用标记 / 历史指针。完整规格见
[chat-context.md](./chat-context.md)。

### 范围（v0.8.0）

- 群项目目录：`groupWorkspaces`（每群可配，设置页可编辑），会话 cwd 与聊天目录同源。
- 隐藏目录 `.qq-relay/`：`chat/<群号>/<日期>.jsonl` + 自忽略 `.gitignore`。
- prompt 拼接：群名 / 群号 / 时间 / 条数 / `@你`、`引用 <id>` 标记 / 历史相对路径指针。
- 旧全局聊天日志一次性迁移（幂等）。
- 已映射群改项目后「重新绑定」按钮（rebind 路由）。
- 保留策略：默认不自动删除（`chatRetentionDays: 0`）；清理 UI 留 v0.8.2。

### 验收状态（2026-10-19）

- ✅ 单测：项目解析 / 聊天日志按项目路由 / prompt 拼接 / 迁移幂等 / 配置与 rebind 路由，
  共 144 个全过；`pnpm check` 全绿（v0.8.1 补了日志元信息 / 空文本修正）。
- ⏳ 真机验收：需要用户重启 dwdev GUI + 刷新页面后逐项确认。

### 验收

- 设置页为某群配置项目 → 该群聊天记录出现在 `<project>/.qq-relay/chat/<群号>/` 下。
- 普通消息触发的 prompt 含群名、时间、条数、历史指针；@ 直通的 prompt 含 `@你` 语义。
- `git status` 在该项目里保持干净（聊天记录被自我忽略）。
- 重启 GUI 后历史记录仍在；旧全局日志迁移后不重复迁移。
- `pnpm check` / `pnpm test` 全绿。

## P4.1 入向媒体落盘（v0.9.0 已实现，2026-10-19）

目标：图片 / 表情下载到群项目本地，聊天记录与 prompt 引用对应路径。规格与实现记录见
[media.md](./media.md)。

### 范围

- `<project>/.qq-relay/media/<群号>/<日期>/<messageId>-<序号>.<ext>`。
- 聊天记录新增 `media` 数组（`kind` / `status` / `path` / `bytes` / `contentType` / `reason`）。
- prompt 追加媒体标记；纯媒体消息也能生成 prompt（@ 带图可转给 DSH）。
- 只收 http(s)、10 秒超时、单文件 20 MiB、单消息最多 10 个；失败不阻断消息流。
- `chatRetentionDays > 0` 时按日期目录清理媒体。

### 验收状态（2026-10-19）

- ✅ 单测：计划解析 / 下载 / 失败分类 / 归一化 / 清理 / prompt 标记，
  共 158 个全过（v0.9.1 补了按 magic bytes 定扩展名）；`pnpm check` 全绿。
- ⏳ 真机验收：重启 dwdev GUI 后发图确认文件与路径。

### 验收

- 群里发图 → `<project>/.qq-relay/media/<群号>/<日期>/` 出现文件，聊天记录 `media[0].path` 指向它。
- @ 带图（无文字）→ DSH prompt 里出现 `[图片：.qq-relay/media/...]`。
- 图片下载失败 → 聊天记录 `status: "failed"`，prompt 显示 `[媒体下载失败]`，消息不丢。
- 单测与 `pnpm check` 全绿。

## 风险登记

| 风险 | 影响 | 缓解 |
|---|---|---|
| 账号被封 | bot 小号失效 | 只用小号；控制频率；明示风险由用户承担 |
| 非官方协议端合规 | 违反 QQ 协议 | 自用范围；不发布、不商用 |
| QQ 更新破坏 NapCat | 连接失败 | 固定 QQ 版本或跟进 NapCat 升级 |
| 断线期间事件丢失 | 漏消息 / 漏回复 | 本地状态兜底；重连后不重放；重要场景可 get_group_msg_history 补上下文 |
| QQ 风控 / 频率限制 | 发送失败 | retcode 分类退避；最小发言间隔 |
| GUI 不常驻 | relay 离线 | 文档写明「relay 在线 = GUI 在线」 |
| 多进程重复连接 | 重复回复、账号互踢 | 单实例文件锁 |
| macOS 原生 Shell 不可用 | NapCat 起不来 / 崩溃循环 | 用 Docker（Colima）跑 linux/arm64；见 onebot-channel §3.1 |
| 提示注入 | agent 执行危险操作 | 群白名单、受限权限预设、审批（P3）、审计日志 |

## 用户前置动作

1. ✅ QQ 小号 + NapCat（Docker，macOS 用 Colima）已就绪并登录。
2. ✅ 测试群已建、bot 小号已入群，主号可 @ 它。
3. ✅ 目标 profile 定为 `dwdev`，已清空为只装本插件（重启该 profile 的 GUI 生效）。
4. ✅ 插件配置已在 dwdev 的 patch 里填好；P1.5 起也可在设置页改（保存即重连，无需重启）。
5. ✅ 上级 AGENTS.md §0 已于 2026-10-19 仅对 `dsh-qq-relay` 解除。
