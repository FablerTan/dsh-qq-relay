# 路线图

> 状态：P0 已完成（2026-10-18）；P1「@ 直通」已真机验收；P1.5 基础配置页已落地（2026-10-19）；
> **P2.1 消息闸门骨架已落地（2026-10-19，jev 分类器未接——用户决定先不接模型）**。
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

- ✅ 聊天日志 JSONL 落盘 / 读取；P2.2 起按保留期（7 天）每天清理一次。
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
- ⏳ **jev 分类器接模型**：形态未定（ctx.llm / 外部 endpoint / 本地），用户 2026-10-19 决定先不接；
  当前 `gate.enabled` 默认 false，开启且未注入分类器时普通消息永远不接话（fail closed）。
- ⏳ 真机验证：需先接分类器并 `gate.enabled: true`，再按下面验收清单跑。

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

- 审批：文本命令（同意 / 拒绝），超时按拒绝。
- 私聊（private）：与群共享映射体系还是独立会话，待定。
- 媒体：入向图片 / 文件转 DSH 附件；出向图片 / 文件上传发送。
- DSH → QQ 主动推送工具（例如 qq_send），供 agent 在任意会话调用。
- client 半身面板增强：映射管理、闸门状态、最近消息（基础配置页已在 P1.5 交付，见 [client.md](./client.md)）。
- 多群资源控制：并发上限、队列、每群配额。

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
