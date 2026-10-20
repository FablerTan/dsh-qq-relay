# 路线图

> 状态：P0 已完成（2026-10-18）；P1「@ 直通」已真机验收；P1.5 基础配置页已落地（2026-10-19）；
> **P2.1/P2.2 消息闸门骨架与收尾已落地、P2.3 jev 分类器已接（OpenRouter `typesafe/jev-1.14`）；
> P3 `qq_send` 主动推送与 QQ 侧审批已落地（2026-10-19）**。
> **P4 聊天记录与消息拼接**：`.qq-relay/` 隐藏目录 + 群项目目录 + prompt 拼接，
> v0.8.0 已实现（2026-10-19；真机验收待用户重启 GUI 后确认），见 [chat-context.md](./chat-context.md)。
> **P4.1 入向媒体落盘**：图片 / 表情下载进 `.qq-relay/media/` 并写进聊天记录与 prompt，
> v0.9.0 已实现（2026-10-19），见 [media.md](./media.md)。
> **P5 QQ 侧命令层**：`/new` / `/stop` / `/status` / `/help`，v0.11.0 已实现（2026-10-19），
> 见 [commands.md](./commands.md)。
> **P6 回复体验**：引用触发消息 / 处理中占位 / 直通连发合并，v0.11.1 已实现（2026-10-19），
> 见 [reply.md](./reply.md)。
> **P4.3 聊天记录清理**：保留天数 UI + 立即清理，v0.13.0 已实现（2026-10-19），见 [chat-context.md](./chat-context.md) §7。
> **P7 client 面板增强**：闸门每群状态 / 最近消息 / 映射管理，v0.14.0 已实现（2026-10-19），见 [client.md](./client.md)。
> **P8 戳一戳识别与回戳**：被戳接话 / 互戳记录 / `qq_poke` 工具，v0.15.0 已实现并真机验收（2026-10-19），见 [poke.md](./poke.md)。
> **P9 入向群文件**：`group_upload` → 下载落盘 → 可选直通，v0.16.0 已实现（2026-10-19），见 [media.md](./media.md) §5.2。
> **P10** 已落地（v0.17.0）；**P11** 已完成（v0.18.0）；**P13.1 角色预设** 已落地（v0.19.0），
> 预设管理 + 模型 / 思考层级 / 权限已落地（v0.20.0）；**P14 画图能力（ComfyUI 探测 + 动态 skill）**
> 已落地（v0.21.0，v0.21.1 修 `qq_send` 出向图片 / 文件转发），见 [comfy.md](./comfy.md)；
> **P15 视频生成（MiniMax H3 + comfy-video skill + qq_send videos）** 已落地（v0.22.0），
> 见 [comfy.md](./comfy.md) §8。
> **P12 环境一键安装** 已落地基础版（v0.23.0，2026-10-20：7 步诊断 + 白名单动作 + 一键修复 +
> 动作日志；v0.25.0 起「一键修复」改为逐步补全，见 [env.md](./env.md)）；**P13.2–P13.3 表情包** 是 2026-10-19 用户确认的后续重点，
> 状态：**规划中**。
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
- 媒体：入向图片 / 表情（v0.9.0）与视频 / 语音、出向图片 / 文件（v0.12.0）已落地，
  见 [media.md](./media.md)；仍缺入向群文件、入向转 DSH 附件。
- ✅ DSH → QQ 主动推送工具 `qq_send`（2026-10-19 已实现，契约见 [tools.md](./tools.md)；
  真机验证待用户重启 dwdev 后在任意会话调用确认）。
- ✅ client 半身面板增强：映射管理、闸门状态、最近消息（P7，v0.14.0 已交付，见 [client.md](./client.md)）。
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
- 保留策略：默认不自动删除（`chatRetentionDays: 0`）；清理 UI 已随 v0.13.0 交付（见 P4.3）。

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

## P4.2 媒体双向（v0.12.0 已实现，2026-10-19）

目标：把媒体能力补成双向——群里发的视频 / 语音也能落盘给 agent，agent 生成的图片 / 文件也能发回群。
规格见 [media.md](./media.md) §5.1。

### 范围（v0.12.0）

- 入向：视频（mp4 / avi / webm / flv）与语音（amr / silk / mp3 / ogg / wav）落盘，扩展名按 magic bytes；
  聊天记录 `media[].kind` 增加 `video` / `voice`，prompt 标记 `[视频：…]` / `[语音：…]`。
- 出向：`qq_send` 新增 `images`（≤4 张，本地绝对路径或 URL）与 `file` / `fileName`（群文件上传）；
  本地文件读成 base64 经 NapCat 发送（NapCat 在 Docker 里看不到宿主路径）。
- 校验与语义：图片 ≤10 MiB 且必须是支持的格式、文件 ≤30 MiB；离线时出向媒体直接报错不排队。

### 验收状态（2026-10-19）

- ✅ 单测：media 视频 / 语音解析与落盘、prompt 标记、relay 出向媒体、`qq_send` 媒体参数，共 201 个全过。
- ⏳ 真机验收：重启 dwdev GUI 后按下面清单确认。

### 验收

- 群里发一段视频 / 语音 → `.qq-relay/media/<群号>/<日期>/` 出现文件，聊天记录与 prompt 引用路径。
- 工作区放一张图片 → `qq_send({ images: ['/abs/a.png'] })` → 群里收到图片。
- 工作区放一个 pdf → `qq_send({ file: '/abs/a.pdf', fileName: '报告.pdf' })` → 群文件里出现「报告.pdf」。
- 发一个非图片文件当 images → 工具返回「不是支持的图片格式」，不会发出。
- 离线时发图 / 发文件 → 工具返回离线错误（不是 queued）。
- 单测与 `pnpm check` 全绿；重启 profile GUI 后生效。

## P4.3 聊天记录清理 UI（v0.13.0 已实现，2026-10-19）

目标：把「默认永不删除」的保留策略做成可操作项——能设自动清理天数，也能手动清一次。
规格见 [chat-context.md](./chat-context.md) §7 / §8，页面契约见 [client.md](./client.md)。

### 范围（v0.13.0）

- 设置页「QQ 机器人」新增「聊天记录清理」区块：保留天数输入（0 = 永不自动删除；7..3650 自动清理，
  保存后落 `chatRetentionDays`）+「立即清理」按钮（用当前输入的天数，1..3650，二次确认）。
- 立即清理与自动清理共用 `lib/model/cleanup.js` 的 `pruneChatAndMedia`：同时删聊天日文件
  `chat/<群号>/YYYY-MM-DD.jsonl` 与媒体日期目录 `media/<群号>/<日期>/`；不动映射 / 会话 / 配置。
- 新路由 `POST /dsh-qq-relay/api/cleanup`，body `{ days }`，返回删除计数 + 最新状态；
  错误码 `CLEANUP_DAYS_INVALID`（400）/ `CLEANUP_NOT_CONFIGURED`（409）。

### 验收状态（2026-10-19）

- ✅ 单测：保留天数校验、聊天 + 媒体清理、路由面（成功 / 400 / 409 / 501 / 405 / 413）、
  `apply()` 集成，共 206 个全过；`pnpm check` 全绿。
- ⏳ 真机验收：重启 dwdev GUI + 刷新页面后按下面清单确认。

### 验收

- 设置页「聊天记录清理」能看到当前保留天数；改成 7 保存后重载仍是 7。
- 保留天数填 0 / 3 / 3651 保存 → 返回校验错误，不落盘（0 合法，3 与 3651 非法；立即清理可填 1..3650）。
- 群里产生聊天记录后点「立即清理」并确认 → 返回删除计数，超过天数的聊天文件与媒体目录消失，近期数据保留。
- 保留天数 0 时点「立即清理」→ 提示需要 1..3650，不发请求、不删文件。
- 立即清理只删文件：群映射 / 会话 / 配置不变，状态行仍正常。
- 单测与 `pnpm check` 全绿；host + client 半身改动，需重启 profile GUI + 刷新页面生效。

## P5 QQ 侧命令层（v0.11.0 已实现，2026-10-19）

目标：不离开 QQ 就能操作会话——换会话、停长任务、看状态。触发点：真机在群里发 `/new`
被当成普通消息转给了 agent（2026-10-19）。完整规格见 [commands.md](./commands.md)。

### 范围（v0.11.0）

- 命令层置于入向链路最前（审批拦截器之后、直通与闸门之前），命中即执行、不派发 prompt。
- `/new [标题]`：新建会话 + 重绑映射（复用首次建会话逻辑），旧会话保留在 GUI。
- `/stop`：`sessionController.cancel` 中断当前轮次。
- `/status`：会话 / 项目 / 闸门参数 / 待评估 / 最近发言 / 队列。
- `/help`：命令清单。
- 前缀式（`/dsh new`）与裸写式（`/new`）都支持；只认白名单命令名，其余保持原直通行为。
- 仅群主 / 管理员可执行（`commands.roles`），非授权静默忽略；命令回复不刷新闸门发言窗口。

### 验收状态（2026-10-19）

- ✅ 单测：命令解析 / 前缀边界 / 别名 / 角色 / 文案（10 个）+ relay 集成（8 个），共 178 个全过。
- ⏳ 真机验收：重启 dwdev GUI 后在群里跑下面清单。

### 验收

- 群里发 `/new` → 回「已新建会话：…」，GUI 侧栏出现新会话；再 @ 机器人 → 回复来自新会话。
- `/new 自定义标题` → 新会话标题就是「自定义标题」。
- `/stop`（先起一个长任务）→ 回「已请求中断当前轮次」，任务停止，部分文本仍回发。
- `/status` → 会话 / 闸门参数 / 待评估与真实状态一致；发完后闸门窗口不被刷新（普通消息仍按原节奏）。
- `/dsh 帮我看看这段代码`（未知命令名）→ 仍按直通转给 DSH，行为与 v0.10.1 一致。
- 非管理员发 `/new` → 不响应、不建会话。
- 真机命令生效需重启 profile GUI（host 半身改动）。

## P6 回复体验（v0.11.1 已实现，2026-10-19）

目标：让群里的回复「看得出在回谁、看得出还在跑、连发不碎」。规格见 [reply.md](./reply.md)。

### 范围（v0.11.1）

- 引用回复：结果首条引用触发消息（直通取触发 / 批次取最后一条），引用失败自动退回普通发送。
- 处理中占位：turn 超过 `ackDelayMs`（默认 8s）先回「收到，处理中…」，不算接话、不刷新闸门；
  已发占位但本轮无文本时补收尾。
- 直通连发合并：400ms 窗口内 @ / 引用 / 命令前缀消息合并成一个 prompt。
- 新增 `reply` 配置段（`quote` / `ackDelayMs` / `mergeWindowMs`，patch 只读）。

### 验收状态（2026-10-19）

- ✅ 单测：reply 配置校验 1 个 + relay 回复体验集成 8 个，共 187 个全过。
- ⏳ 真机验收：重启 dwdev GUI 后按下面清单确认。

### 验收

- @ 机器人提问 → 回复以引用形式出现；长回复只有第一条带引用。
- 起一个要跑十几秒的任务 → 约 8 秒后先收到「收到，处理中…」，结束后收到正式结果。
- 快速连发两条 @ → 只触发一轮回复，prompt 里两条都在。
- 撤回被引用的消息后再触发 → 引用失败但回复照常发出。
- `/status` 等命令回复仍不带引用、不产生占位。
- 真机生效需重启 profile GUI（host 半身改动）。

## P7 client 面板增强（v0.14.0 已实现，2026-10-19）

目标：把「只能配、不能看」的设置页补成面板——能看闸门实时状态、翻最近消息、管群映射。
页面契约见 [client.md](./client.md) §2 / §4。

### 范围（v0.14.0）

- 闸门状态：状态快照的 `gate` 增加全局计数（待评估消息 / 群、活动定时器、派发队列、发送队列）
  与每群一行（待评估条数 / 最近发言 / 最近回复 / 冷却 / 评估中 / DSH 忙）；页面每 5 秒随状态轮询刷新。
  relay 暴露只读 `snapshot()`，runtime.status 透传。
- 最近消息：新路由 `GET /dsh-qq-relay/api/messages?groupId=&limit=`，读该群最近 24 小时聊天记录
  （默认 20、上限 100 条），转成只读视图（时间 / 显示名 / @ 与引用标记 / 媒体标记）；
  新增 `lib/model/panel.js` 做查询校验与字段收敛。
- 映射管理：行内「解除绑定」+ 表头「清空全部映射」，路由
  `POST /api/mapping/delete`、`POST /api/mapping/clear`；只删本机映射、重建 relay 清缓存，
  GUI 里的旧会话保留，下条消息按当前项目目录重新建会话。

### 验收状态（2026-10-19）

- ✅ 单测：面板纯逻辑 3 个、路由 4 个、`apply()` 集成 2 个，共 215 个全过；`pnpm check` 全绿。
- ⏳ 真机验收：重启 dwdev GUI + 刷新页面后按下面清单确认。

### 验收

- 设置页「闸门」区块出现每群状态表；群里有待评估消息 / 发言后数字与「最近发言」随之变化。
- 群项目目录行点「消息」→ 显示最近 24 小时消息（含 @ 与引用标记）；「刷新」能拿到新消息。
- 行内「解除绑定」确认后映射消失、GUI 里旧会话仍在；再在群里发消息 → 新建会话。
- 表头「清空全部映射」确认后映射表清空；状态行 / 配置不受影响。
- 单测与 `pnpm check` 全绿；host + client 半身改动，需重启 profile GUI + 刷新页面生效。

## P8 戳一戳识别与回戳（v0.15.0 已实现并真机验收，2026-10-19）

目标：识别 QQ 群「戳一戳」——被戳时 agent 能回应，群友互戳进入聊天上下文；agent 可选择回戳。
规格与事件契约见 [poke.md](./poke.md)。

### 范围（v0.15.0）

- codec 识别 `notice.notify.poke`（`user_id` 戳者 / `target_id` 被戳者 / `group_id`），
  合成去重键 `poke:<time>:<user>:<target>`（戳事件没有 message_id）。
- 白名单群写聊天记录（`戳了你一下` / `戳了 <target> 一下`）；**戳 bot 时按直通起一轮**
  （reason = 戳一戳），不经过闸门、不调用 jev；`poke.react` 控制是否接话，
  每群 `poke.cooldownMs`（默认 10s）防连戳刷屏，冷却内只记录。
- 昵称 / 群名补查 `get_group_member_info` / `get_group_info`（缓存 10 分钟），失败退化 QQ 号 / 群号。
- 新工具 `qq_poke`（NapCat 扩展 action `group_poke`）：白名单 + userId 校验，离线报错；
  与 `qq_send` 在同一个 tools 子 fiber 注册。
- 配置 `poke` 段（patch 只读）：`enabled` / `react` / `cooldownMs`。

### 验收状态（2026-10-19）

- ✅ 单测：codec 1、配置 1、relay 9、工具 4，共 230 个全过；`pnpm check` 全绿。
- ✅ 协议端实测：`group_poke` 返回 ok；poke 事件字段与 onebot-channel §5 一致。
- ✅ 真机验收（2026-10-19，用户确认）：重启 dwdev GUI 后群里戳 bot → DSH 回复正常；
  冷却 / 互戳只记录 / `qq_poke` 等细项随日常使用观察。

### 验收

- 群里戳 bot → agent 回复；对应会话 prompt 含「（直通：戳一戳）」。
- 10 秒内连戳两次 → 只回一次，两次都写进聊天记录（设置页「最近消息」可见）。
- 戳其他群友 → 不回复、只记录。
- agent 调 `qq_poke` → 对方收到戳；NapCat 离线时工具报「当前离线」。
- `poke.enabled=false` / 非白名单群 → 事件被忽略。
- host 半身改动，需重启 profile GUI 生效。

## P9 入向群文件（v0.16.0 已实现，2026-10-19）

目标：群里上传的文件能落进群项目并被 agent 使用；默认按「一次上传 = 一次交互」直通一轮，
可配置成只记录。规格见 [media.md](./media.md) §5.2。

### 范围（v0.16.0）

- 识别 `notice.group_upload`（`file = { id, name, size, busid }`）；白名单群、忽略 bot 自己上传。
- 下载：`get_group_file_url` → HTTP(S) GET → `.qq-relay/media/<群>/<日期>/<fileId>-<安全文件名><扩展名>`；
  20 MiB 上限；失败只记 `failed`、不接话。
- 上下文：聊天记录 `text = 上传了群文件：<name>` + `media` 里 `kind = "file"`；
  `files.react: true`（默认）时直通起一轮（reason「群文件」），`false` 时只记录。
- 配置 `files` 段（patch 只读）：`enabled` / `react`。

### 验收状态（2026-10-19）

- ✅ 单测：codec 1、配置 1、media 4、relay 7、prompt 1，共 244 个全过；`pnpm check` 全绿。
- ✅ 协议端实测：`group_upload` 字段与文档一致；`get_group_file_url` 返回的 URL 可直接下载原文件；
  上传只产生 notice、不额外产生 message 事件。
- ⏳ 真机验收：重启 dwdev GUI 后按下面清单确认。

### 验收

- 群里上传 txt / pdf → 聊天记录出现、文件落盘到 `.qq-relay/media/`，bot 起一轮（默认）。
- 超过 20 MiB → 只记录 `failed: too-large`，不下载、不接话。
- `files.react: false` → 只记录不接话；`files.enabled: false` → 完全不处理。
- 自己用 `qq_send` 上传文件 → 不触发（防自问自答）。
- 配置页「项目」的「最近消息」里显示 `[文件]`；host 半身改动，需重启 profile GUI 生效。

## P10 配置页迁到插件面板 + 二级页面（v0.17.0 已实现，2026-10-19）

目标：配置跟着插件走——放进**插件面板**（左栏「插件」图标）里 dsh-qq-relay 组合包自己的页面，
和启停开关同页；一屏平铺改成二级页面；视觉跟随宿主主题。契约见 [client.md](./client.md)。

### 范围（v0.17.0）

- 注册落点从 `settings.section` 改为 **`plugins.bundle.config`**（key = 包名 `dsh-qq-relay`）；
  设置里不再单列「QQ 机器人」。
- 二级页面：连接 / 项目 / 行为 / 记录；状态行 + 刷新 / 重新连接 / 保存并重连固定在顶部。
- 样式：`src/view/theme.ts` 注入普通 CSS，全部使用宿主 `--dsw-*` 语义 token
  （设置卡片 R20、控件 R12、0.5px 发丝线、标准 focus ring），明暗主题 / 字号自动跟随。
- 结构：client 半身拆 MVVM 四层（`src/model` → `src/viewmodel/settings.ts` → `src/view`）；
  删除 `SettingsSection.tsx`。仅 client 半身改动。

### 验收状态（2026-10-19）

- ✅ `pnpm build` 成功（`lib/client.js` 更新）；`pnpm check` 全绿；单测 244 不变。
- ✅ 注册契约冒烟：`apply()` 在缺失 slots 时静默返回、正常时注册
  `{ name: 'plugins.bundle.config', key: 'dsh-qq-relay' }`。
- ✅ 四个二级页面 + 页面外壳 SSR 渲染冒烟（正常数据 / 空数据 / 配置问题 / 消息报错四种输入均不抛）。
- ⏳ 真机验收：刷新 dwdev 页面后按下面清单确认（无需重启 GUI）。

### 验收

- 左栏「插件」→ 我的 / Bundles → dsh-qq-relay：页面里能看到状态行与四个 tab，启停开关在同一页。
- 连接 / 项目 / 行为 / 记录逐个切换，表单内容与 v0.16.0 等价；在任意页改字段 → 保存并重连成功。
- 明暗主题各看一遍：卡片 / 输入框 / 按钮 / tab 颜色与发丝线跟宿主一致，无突兀色块。
- 停用该插件的行 → 配置页随注册消失；重新启用 + 刷新后回来。

## P11 触发规则修正 + 代答（v0.18.0 已实现，2026-10-19）

按用户 2026-10-19 的反馈修正触发规则：只有被明确「叫到」时才起会话；并新增可选的代答。

### 范围（v0.18.0）

- **修 bug**：引用**别人**的消息不再直通（手机 QQ 里 @ 某人会带 reply 段）；relay 记录
  bot 发出的 `message_id`（每群内存 100 条 + 聊天日志兜底）来判断 `replyToSelf`。
- **@ 别人 / @全体成员 不触发会话**：只落聊天日志、不进闸门；@ bot 仍直通。
- **代答（默认关闭）**：`proxyReply.enabled` / `targets` / `silenceWindow`；@ 名单里的人
  且 TA 最近 `silenceWindow`（默认 10m）没在本群发言 → 直通起一轮，prompt 里请 agent 代 TA 回应。
  名单支持 QQ 号或群名片 / 昵称，三项都能在配置页「行为」改（保存即重建 relay）。
- 配置页新增开关控件 `Toggle`；prompt 纯函数新增 `atNames` / `notes`。

### 验收状态（2026-10-19）

- ✅ 单测 253 个全过（新增 codec 2、relay 5、config 1、settings 1、prompt 1 等）；
  `pnpm check` 全绿（语法 + tsc + 文档配对）。
- ✅ client 构建通过（`Toggle` / 代答卡片 / 主题样式）。
- ⏳ 真机验收：host 改动需重启 dwdev GUI；按下面清单确认。
- ⏳ 协议级（假 OneBot 端）回归：「引用 bot 消息直通 / @ 别人不触发 / 代答命中与跳过」。

### 验收

- 群里 @ 另一个人（带文本）→ bot 不回复；引用别人的消息 → bot 不回复。
- @ bot / 引用 bot 的消息 / 命令前缀 → 照常直通（prompt 头部标「直通：@ / 引用 / 命令」）。
- 配置页开启代答 + 名单填自己 QQ（或昵称）+ 窗口 10m：别人 @ 你且你 10 分钟没说话 →
  bot 起一轮并代你回应（prompt 含「直通：代答」与 `[代答：…]`）；你刚说过话 → 不代答。
- 关闭代答 → @ 名单内的人也不触发。
- 显式 `@全体成员` 的公告不触发会话。

## P12 环境一键安装（v0.23.0 基础版 + v0.25.0 逐步补全，2026-10-19 用户定为重点）

目标：把「装 Docker / 起 Colima / 拉 NapCat / 扫码登录 / 写 OneBot 配置 / 回填插件配置」从
[onebot-channel.md §3](./onebot-channel.md) 的手工步骤，收敛成插件面板里的**「环境」页**：
每步一个状态和按钮，新机器从零到 relay 连上；已装好的机器只做诊断，「一键修复」只补缺的步骤。

### 已落地（v0.23.0，2026-10-20）

规格细节见 [env.md](./env.md)；与下方原始草案的差异：

- **页签位置**：连接 / **环境** / 项目 / 行为 / 画图·视频 / 预设 / 记录（七页）；「连接」页顶部的
  环境未就绪横幅**未做**（环境页本身已足够显眼，留作后续）。
- **步骤**：7 步全部实现，判定与动作见 [env.md §4](./env.md)；compose 文件默认写
  `compose.yaml`（同时兼容既有 `docker-compose.yml`），容器名从 compose 解析（默认 `napcat`）；
  OneBot 配置按「启用的第一个 websocketServers 条目」修正五个字段，写前备份 `.bak-<时间戳>`。
- **动作**：白名单共 10 个（含 `refresh` / `fix-all` / `open-webui`），命令固定 argv、`shell: false`；
  安装 / 启动引擎 / 写 OneBot 需 `confirm: true`；命令类动作后台执行，超时 10 分钟 SIGKILL。
  `fix-all` 只补可自动完成的步骤（`write-compose → compose-up → restart-napcat → write-onebot →
  backfill-config`），**不含**安装 / 启动引擎 / 扫码（v0.25.0 已改为逐步补全，见下节）。
  **v0.23.0 的缺陷**：序列按点按钮那一刻的快照算一次，写完 compose 不重排，被 `skip` 的
  NapCat 容器步骤不会变成 `compose-up` → 新机器点一次「一键修复」只写了个 compose，
  NapCat 容器始终没起来（用户反馈「为啥会跳过 napcat」）。
- **路由**：`GET /api/env` + `POST /api/env/action`；日志尾部（60 条、已脱敏）直接放在状态快照里，
  **没有**单开 `GET /api/env/log?since=`（一次轮询同时拿步骤与日志，少一条路由）。
- **CSRF**：只接受 `content-type: application/json` 的 POST（跨站会触发预检），**没有** nonce——
  与既有 11 条配置页路由同一套口径。
- **配置**：`environment`（`enabled` / `dir` / `webuiToken` 只写不读）；非法目录 / token 只回退默认值，
  不判死整份配置；只改 environment **不重建 relay**。
- **平台**：macOS（Colima）与 Linux（已有 daemon）；Linux 不提供安装 / 启动引擎动作（无 sudo）。
  Windows / WSL 只显示「暂不支持」，不执行动作。
- **测试**：`test/env.test.js` 9 个用例（配置 / compose / OneBot / 求值 / argv / 日志 / controller
  探测 + 写 OneBot + 回填 + open-webui + 确认制 / 一键修复序列）；总数 291。

### 已落地（v0.25.0，2026-10-20）：一键修复改为逐步补全

- **逐轮推进**：`fix-all` 不再一次算好序列，而是「探测 → 执行计划第一个动作 → 再探测」，
  直到计划为空 / 需确认 / 动作失败 / 同一动作连续两次没有推进；被 `skip` 的步骤在前置补齐后
  自动进入下一轮（装引擎后出现 `compose-up`，容器起来后才轮到 OneBot / 回填）。
- **安装 / 启动引擎进计划**：`install-docker` / `start-daemon` 现在也由「一键修复」执行，
  但需要页面确认（`status.fixPlan.needsConfirm`）且 host 强制校验 `confirm:true`；
  覆盖已存在的 compose 同样要确认。
- **`status.fixPlan`**：下发 `sequence` / `titles` / `needsConfirm` / `next`，页面渲染
  「一键修复将依次执行：… 下一步：…」，并据此弹一次确认。
- **token 闭环**：写 OneBot 配置时 token 取「插件 access_token → OneBot 现有 token → 自动生成
  32 位 hex」，不再因为插件 access_token 为空而永远卡住（生成后回填到插件配置）。
- **`restart-napcat` 退出序列**：写 OneBot 时本身会重启 NapCat，不再作为链里独立一步。
- **测试**：`test/env.test.js` 11 个（新增修复序列逐步展开 / 一键修复逐步补全 / token 双空生成）；
  总数 **294**。

### 已落地（v0.25.1，2026-10-20）：探测可读 + docker context 兜底 + 不推进跳过

- 用户真机反馈「容器引擎 未通过 / 容器引擎未运行：退出码 1」：探测失败吞掉了 docker 的 stderr，
  且 `colima start` 退出码 0（already running）时一键修复会反复重试同一动作后停住。
- **探测可读**：controller 新增 `probeMessage`，docker / colima 失败时把 stderr 末行写进说明与证据。
- **endpoint 兜底**：`docker info` 直连失败时自动用 `docker --context colima` 重试，成功则本轮所有
  docker 命令带该 context；证据写明「直连失败：…；已自动改用 --context colima」。
- **启动 / 重启区分**：新增 `colima status` 探测；VM 没起 → `start-daemon`，VM 在跑但 daemon
  连不上 → 新动作 `restart-daemon`（`colima restart`，需确认）。
- **不推进就跳过**：动作失败或执行后步骤没推进时标记「没能自动完成」并继续独立步骤（如生成
  compose），收尾日志逐条给出原因。
- **测试**：`test/env.test.js` 14 个（新增引擎启停区分与可读错误 / context 兜底 / 不推进跳过）；
  总数 **297**。

### 已回滚（v0.25.3，2026-10-20）：移除 v0.25.2 的引擎识别

- v0.25.2 曾按 docker endpoint 识别 Colima / OrbStack / Docker Desktop，并给
  `start-orbstack` / `start-docker-desktop` / `install-orbstack` 动作。真机结论：收益不足——
  另一台 Mac mini 的 OrbStack 装了一半、context 指向已卸装的 socket，按引擎给动作反而把人引向修
  OrbStack，而实际更省事的做法是直接用 Colima。
- v0.25.3 整段 `git revert`：环境页恢复 v0.25.1 行为（macOS 只认 Colima，`--context colima` 兜底），
  endpoint 指向别的引擎时以 docker 原始报错为准，处理办法是启动 / 安装 Colima 后
  `docker context use colima`。
- **测试**：回滚掉两个用例，总数回到 **297**（`test/env.test.js` 14 个）。

### 已落地（v0.25.4，2026-10-20）：连接信息允许「待补全」先存草稿

- 用户真机反馈：新机器「环境」页的 WebUI token 存不了——保存走整份配置校验，空的
  `wsUrl` / `accessToken` / `selfId` 被判「必填缺失」直接 400；而一键修复写 compose 又需要这个
  token，形成死循环。
- **host**：`normalizeConfig` 拆出 `pending`（连接信息留空）与 `problems`（真的写错），前者
  `ok: true` / `ready: false`，配置照常落盘；`lib/index.js` 用 `ready` 决定是否启动 / 重建 relay，
  状态 `problems` 里逐条提示必填项。
- **client**：`buildConfigPatch` 允许 `wsUrl` / `selfId` 留空（格式写错仍当场报错），保存提示区分
  「已保存（待补全）」与「已保存并重连」。
- **测试**：`test/model.test.js` 的 fail-closed 用例改成「待补全 vs 无效」，`test/apply.test.js` 加
  端到端用例（没配 OneBot 也能保存 WebUI token 且 relay 不启动）；总数 **298**。

### 设计草案（原始，2026-10-19）

- 入口：插件面板新增「环境」二级页（连接 / 项目 / 行为 / 记录 / 环境）；「连接」页顶部在
  环境未就绪时显示横幅（去修 → 环境页）。
- host 新增 `controller/env.js` + `model/env.js`（纯逻辑、可单测）：
  - `GET /dsh-qq-relay/api/env`：步骤清单 + 每步 `ok | warn | error`、证据（命令输出摘要）、
    可执行动作 id；前端 5 秒轮询（与现有状态轮询一致）。
  - `POST /dsh-qq-relay/api/env/action`：body `{ action, nonce }`；只跑**固定 argv**，
    不经 shell 拼接；动作立即返回 + 日志游标，前端轮询 `GET /api/env/log?since=`
    （环形缓冲、token 脱敏）。
- 步骤（macOS 为主，命令固定）：
  1. **Docker CLI**：`docker --version` / `docker compose version`；缺 → `brew install colima docker docker-compose`（安装类，需确认）。
  2. **Docker daemon**：`docker info`；未起 → `colima start --cpu 4 --memory 4 --disk 60 --vm-type vz`。
  3. **Compose 文件**：`<envDir>/docker-compose.yml`（生成 `WEBUI_TOKEN`、端口只绑
     `127.0.0.1:3001/6099`、三个数据卷，与文档 §3.3 一致）。
  4. **容器**：`docker compose up -d`（必要时先 `pull`）；`docker inspect napcat` 判状态。
  5. **登录**：页面打开 `http://127.0.0.1:6099/webui?token=<token>` 让用户扫码——**唯一不可
     自动化**的一步；轮询 `<envDir>/data/config/onebot11_*.json` 是否出现判断登录成功。
  6. **OneBot 配置**：补齐 `token` / `port` / `messagePostFormat: array` /
     `reportSelfMessage: false`，`docker compose restart napcat`。
  7. **回填 + 自检**：写插件配置（`wsUrl` / `accessToken` / `selfId`）→ 重连 →
     `get_login_info` 校验。
- 配置：新增 `environment` 段（`enabled` / `dir` / `webuiToken` 只写不读）；默认
  `dir = ~/napcat-docker`；现有 profile patch 配置不受影响。
- 平台：macOS 优先（Colima）；Linux 走 docker compose 等价路径（有 daemon 即跳过 1、2）；
  Windows / WSL 后置，文档只写「暂不支持」。
- 安全：只允许白名单命令；不 `sudo`；不下载可执行文件（除 brew 包与 docker 镜像）；
  安装类动作二次确认并显示确切命令；`envDir` 必须是绝对路径、不接受 shell 元字符；
  路由沿用「JSON body + nonce」防 CSRF（浏览器跨站 JSON POST 会触发预检）。
- 失败可读：每步保留确切命令与最后 N 行输出，提供「复制命令」，用户可自己在终端跑。

### 风险 / 待确认

- 风险：`brew install` 耗时长、可能失败；Docker Desktop 与 Colima 可能同时存在（先探测谁在跑）；
  NapCat 镜像更新 / QQ 登录态失效要重新扫码；一键装完 ≠ 一定能登录（账号风控）。
- **用户已确认（2026-10-19）**：
  1. 允许插件执行下载 / 启动命令（`brew install` / `colima start` 可自动跑，但要确认 + 日志）；
     配置页要能看到**运行状态**与 **WebUI 链接**（`http://127.0.0.1:6099/webui?token=…`）。
  2. 环境目录在设置页可改（默认 `~/napcat-docker`）。
  3. 只支持 Docker + NapCat（macOS 用 Colima）；macOS 原生 Shell 不列入。
- **已落地后的待定**：「卸载 / 重置环境」入口（删容器 + 数据卷，危险操作二次确认）是否需要；
  NapCat 镜像更新（`docker compose pull`）是否做成动作——当前故意不做，避免「一键修复」意外
  升级镜像导致登录态失效。

## P13 会话上下文增强：表情包与角色预设（P13.1 v0.19.0 已实现，2026-10-19）

目标：让 QQ 侧的 agent 更像群友——有稳定人设、会用 / 会学表情包；同时把
「最终回复自动回发」这类平台约定写进 prompt，减小模型行为偏差。

### P13.1 角色预设与轻量人设（v0.19.0 / v0.20.0 已实现，2026-10-19）

规格与维护说明见 [persona.md](./persona.md)。

- **插件自带 agent preset**：bundle patch 插入 `@deepseek-ai/dsh-agent-preset` 声明
  （Loader 行 `preset-qq-relay`，id `qq-relay`，显示名「QQ 群聊」），`plugins` 复制 DSH 内置
  `standard` 完整组合表、只换 persona 前缀。装插件即可在 DSH preset 选择里看到，无需改 profile。
  代价：preset 无继承，DSH 升级后需按 persona.md §2 重新同步组合表。
- **会话可选 preset**：配置 `agentPreset`（默认空 = 宿主默认）；relay 建会话时透传
  `sessionController.create({ cwd, agentPreset })`；不可用则记 warn 并退回默认（不中断建会话）。
  配置页「行为 → 角色与人设」下拉数据来自 host `ctx.get('agentPresets').list()`；
  状态快照带 `agentPresets: { supported, items[], missing }`。preset 创建时固定，
  切预设要 `/new` 或「重新绑定」。
- **轻量人设**：`persona.enabled` / `persona.text`（默认关、≤4000 字符）；prompt 头部
  `[角色设定：…]`，保存后下一条消息生效，不依赖 profile。
- **平台约定进 prompt**（修协议级验收发现的 gap）：每轮末尾固定
  「直接输出最终回复即可，relay 会自动回发本群；不要用 `qq_send` 往本群发」，
  避免双发与绕过引用 / 占位 / 合并。
- 配置页新增 `Select` / `TextArea` 控件；单测 253 → 258（config / settings / prompt / relay 各补用例）。
- 验收：重启 GUI 后 DSH preset 列表出现「QQ 群聊」；配置页可选并保存；`/new` 后新会话走该 preset；
  preset 不存在 → 状态 missing + 建会话退回默认；开启人设后 prompt 带角色行与平台约定；双发不再出现。
- **v0.20.0 预设管理**：预设从静态 bundle patch 移进 `presets.json`，配置页「预设」页可
  新建 / 编辑 / 删除；保存后 `ctx.agentPresets.register()` 动态注册，无需重启。每个预设可设
  **模型 / 思考层级 / 权限预设**：会话首次派发前追加 `model/selection`（不覆盖用户选择）+
  `permissionPresets.set`。新路由 `/api/presets`、`/api/presets/delete`；单测 258 → 266。
  详见 [persona.md](./persona.md)。
- 延后：人设模板一键填表、按群覆盖 preset / persona（当前均为全局）——需要时再做。

### P13.2 表情包发送（拟人化第一步）

- 出向 `qq_send` 增加 `sticker`（库内 id / 绝对路径 / 标签，≤2 张）；relay 发送
  `image` 段并带 `sub_type: 1`（收藏表情样式）；商城表情 `mface` 需要
  `emoji_id / emoji_package_id / key`，先用假协议端 + 真 NapCat 各验一次再决定是否支持。
- **最终回复内嵌标记**：agent 在最终文本里写 `[[sticker:<id或tag>]]`，relay 抽出标记、
  与文本合并成一条消息（`image(sub_type=1)` + `text`）发送，不额外发第二条消息；
  标记非法 / 库中不存在 → 丢掉标记、正常发文本，不报错刷屏。
- 频率：每轮最多 1 张；每群最短间隔（默认 60s）；超出静默丢弃。
- 入向识别已有（`mface` / `image.sub_type=1` → `kind=sticker`；prompt 已有 `[表情：path]`）。

### P13.3 表情包学习（后做，依赖 P13.2 的库）

- 库：`<project>/.qq-relay/stickers/<sha1>.<ext>` + `index.jsonl`
  （`sha1 / path / groupId / userId / time / summary / mface / tags / desc / uses / lastUsedAt`）。
- 自动收集：本群 `kind=sticker` 落盘成功后按 sha1 去重入库；容量上限（默认 500 / 群，LRU 淘汰）；
  随 `chatRetentionDays` 清理；不跨群复用（隐私）。
- 标签：agent 通过 `qq_sticker_save({ path, tags, desc })` 把喜欢的入库 / 补标签；
  也可手改 `index.jsonl`；检索 `qq_sticker_list({ query })`。
- prompt：`stickers.enabled` 且本群有库时附一份紧凑目录（前 10 条：id + tags + 描述），
  只列文本、不内联图片；教 agent 用 `[[sticker:…]]`。
- 可选：导入 bot 小号「收藏表情」当初始素材（NapCat `fetch_custom_face` 返回 URL 列表 →
  下载入库；一次性动作，放设置页按钮）。
- 风险：刷屏（频率 + 每轮上限）、群友隐私（只收集本群、不外传）、版权（不导出）、
  库体积与清理。默认收集开、发送开？——**待确认**（也可先都默认关，设置页显式开启）。

### 待确认（P13）

- P13.1 已落地（v0.19.0）：用户选择先做角色预设，且接受「插件自带 preset + 配置页选择 + 轻量人设」两层。
- 剩余待定都是表情包：
  1. 用户决定「能发」与「能学」**同等优先**，默认开启、设置页可关（2026-10-19）。
  2. 发送样式：先做「收藏表情」（`image` + `sub_type: 1`）；商城 `mface` 需先协议实测
     `emoji_id / emoji_package_id / key` 是否可复用，再决定是否支持。
  3. 排期：P13.2 发送 → P13.3 学习；与 P12 环境向导的先后待定。

## P14 画图能力：ComfyUI 探测 + 动态 skill（v0.21.0 已实现，2026-10-19；v0.21.1 修出向图片 / 文件发送）

目标：让 agent 能按群里的要求画图 / 改图，并把结果直接发回群；配置入口在插件面板，不重启 GUI。

### 范围（v0.21.0）

- **`comfy` 配置段**：`enabled`（默认 false）/ `baseUrl`（默认 `http://192.168.1.10:8188`）/
  `timeoutMs`（默认 30000，3s..120s）/ `skillEnabled`（默认 true），四项都能在配置页「画图」页改。
- **host 探测 + 动态 skill**（`controller/comfy.js`）：探测 `/system_stats` + `/queue`
  （60s 周期 + 状态轮询补探）；首次连上且开关允许时 `ctx.skills.register` 注册插件自带的
  `comfy-image` runtime skill（`source=custom` / `provider=dsh-qq-relay` /
  `resourceBase=lib/skills/comfy-image`）；探测失败**不注销**（抖动保持），
  关闭 `enabled` / `skillEnabled` 才注销。
- **模板渲染**（`model/comfy.js`）：`SKILL.md` 的 `{{COMFY_HOST}}` / `{{SKILL_DIR}}` 在注册前替换，
  剥 frontmatter，残留占位符拒绝注册；comfy 配置校验 / 脱敏视图。
- **配置页 + 路由**：「画图」二级页（开关 / 地址 / 超时 / skill 开关 / 测试连接 / 运行状态）+
  `POST /dsh-qq-relay/api/comfy/test`（只探测不保存）；仅 `comfy` 变化不重建 relay。
- **三个工作流**：`qwen-t2i`（文生图）/ `qwen-i2i`（参考图编辑）/ `qwen-edit`（另一种编辑流）；
  产物落 `<群项目>/assets/comfy/output/`，由 `qq_send` 的 `images` 回发群。

### 验收状态（2026-10-19）

- ✅ 单测 275 个全过（新增 9 个 comfy 用例：配置 / 模板渲染 / probe / 注册与抖动保持 /
  测试连接 / `/api/comfy/test` 异步回归；config / settings / apply 断言同步）。
- ✅ client 构建通过，`lib/client.js` 已含 ComfyPanel 文案；文档同步（新增
  [comfy.md](./comfy.md)，README / AGENTS / config / client / architecture / media 同步）。
- ✅ 真实 ComfyUI 0.39.0（RTX 4070，`192.168.1.10:8188`）：isolated DSH 实例启动后
  `status.comfy.reachable = true`、`skill.loaded = true`；`POST /api/comfy/test` 用错误地址
  返回 `ok=true` + `probe.reachable=false`。

### 验收

- 配置页「画图」页开 `enabled`、填地址，点「测试连接」→ 看到版本 / GPU / 队列 / 延迟；
  错误地址 → `ok=true` + `reachable=false`，不改配置。
- 保存后约 1 分钟内状态里 `comfy.reachable=true`、`skill.loaded=true`（无需重启 GUI）。
- QQ 群说「画一张夕阳下的猫」→ agent 触发 skill，先回「正在画…」，产物落在
  `<群项目>/assets/comfy/output/` 后用 `qq_send images` 发回群。
- 改图：先发参考图，再说「改成雪景」→ 走 `qwen-i2i`（人物一致性）或 `qwen-edit`（尺寸控制）。
- 关闭 `enabled` / `skillEnabled` → 下一轮探测后 skill 注销；ComfyUI 抖动 / 重启 → skill 保持注册。

## P15 视频生成：MiniMax H3 + 双 skill + qq_send videos（v0.22.0 已实现，2026-10-20）

目标：在已有画图能力上补短视频——同一个 ComfyUI 服务、同一个运行器，agent 按群里的要求
文生视频 / 让图片动起来 / 用参考图做角色一致的视频，并把 mp4 发回群。

### 范围（v0.22.0）

- **第二个动态 skill**：连接成功后按 `COMFY_SKILLS` 注册 `comfy-image`（`SKILL.md`）与
  `comfy-video`（`SKILL-video.md`）；共用 `lib/skills/comfy-image/` 目录与 `resourceBase`，
  各自记录 `status.comfy.skills[].loaded/error`；一个模板坏了不影响另一个。
- **三个 H3 工作流**：`h3-t2v`（文生视频）/ `h3-i2v`（首帧转视频）/ `h3-r2v`
  （参考图转视频，角色一致性）。registry 共 7 个（qwen 3 + `moss-t2i` + h3 3）；
  产物 mp4 带原生音轨，落 `<群项目>/assets/comfy/output/`（runner 打印实际路径）。
- **`qq_send` 新增 `videos`**：最多 1 个、本地绝对路径或 URL、MP4 / MOV / WEBM / FLV / AVI / MKV、
  ≤30 MiB，本地文件转 base64 走 NapCat 的 video 段（内联播放）；离线不排队；
  输出 `media` 增加 `videos` 计数。
- **顺带修正**：MOSS-Image 登记为 `moss-t2i`（原文档写「未进 registry / runner 不认」），
  现在 runner 可直接调用；registry 共 7 个工作流。

### 验收状态（2026-10-20）

- ✅ 真实 ComfyUI 0.39.0 / RTX 4070：`h3-t2v` 4 步 / 0.2MP / 3s 服务端 **29.1s**
  （608×352、73 帧、3.04s、带音轨），`h3-r2v` **30.4s**；8 步为质量档、4 步为加速档。
- ✅ `status.comfy.skills` 里 `comfy-image` 与 `comfy-video` 均加载；单测 **282** 全过
  （新增 4 个：comfy 单坏不影响另一个、relay `sendVideo` 2 个、`qq_send` 只发视频；
  既有用例同步改成双 skill / 视频断言）。
- ⏳ `h3-i2v` 只做过 dry-run 接线校验，未单独真跑；QQ 侧视频内联播放的真机验收待做。

### 验收

- 群里说「生成一段夕阳下海边散步的视频」→ 触发 `comfy-video` → `h3-t2v`，产物 mp4 落在
  `<群项目>/assets/comfy/output/video/`，用 `qq_send videos` 发回群（内联播放）。
- 先发一张图再说「让这张图动起来」→ `h3-i2v`（首帧）；「用这张参考图做一段…」→ `h3-r2v`，
  prompt 用 `<Subject 1>` 指代角色。
- 关闭 `enabled` / `skillEnabled` → 两个 skill 都注销；ComfyUI 抖动 → 保持注册。
- 视频超过 30 MiB / 格式不支持 / 离线 → 工具返回可读错误，不排队。

## 协议级联调验收（2026-10-19，AI 代理执行，非真机）

> A 表里仍标 ⏳ 的项，先用**假 OneBot 协议端**把 relay ↔ DSH ↔ agent 全链路跑通；真机部分
> （真实 QQ 消息 / NapCat 媒体 URL / 群文件 / 戳事件）仍待用户抽空过一次。方法：本机假 WS 端
> 替代 NapCat，通过配置 API 临时把 `wsUrl` 指过去、加一个假群号（98765432x，项目
> `/tmp/qqr-acceptance`），注入 OneBot 事件后断言聊天日志 / 媒体落盘 / 回复 payload /
> 闸门决策日志；结束后恢复原 `wsUrl` 与 `settings.json`、删除假群映射。全程真实 DSH 会话与
> `deepseek-flash` 回合。

| 验收项 | 结果 | 证据 |
|---|---|---|
| 配置保存 + 重连 | ✅ | 保存后 `connected=true`，假协议端收到 `get_login_info` |
| `/status` / `/help` | ✅ | 群内直接回执（无 LLM 回合） |
| @ 直通 | ✅ | 聊天日志带 `mentionsSelf`，prompt 为「新消息 2 条（直通：@）」 |
| 直通连发合并 | ✅ | 两条 @ 只起 1 轮（prompt「新消息 2 条」） |
| 引用回复直通 | ✅ | 带 `reply` 段的消息触发一轮 |
| 首条引用触发消息 | ✅ | 单条 @ 时回复 payload = `[{reply:{id:触发消息}},{text}]` |
| 处理中占位 | ⚠️ | 8s 内回合结束，未触发；代码路径与单测正确 |
| 入向图片落盘 | ✅ | `media/<群>/<日期>/u-*.png`，聊天日志 `media[].status=saved`，仍接话 |
| 群文件下载落盘 | ✅ | `.../<fileId>-验收记录.txt`，日志「上传了群文件：…」，默认直通一轮 |
| 群文件超限 | ✅ | 30 MiB → 只记 `failed: too-large`，不下载 |
| 被戳接话 + 日志 | ✅ | 起一轮并写「戳了你一下」 |
| 闸门快路 + jev | ✅ | 普通消息 5s 后决策日志：`trigger=fast, reply=false, confidence=0.17` |
| 闸门慢路路由 | ✅ | 本群 bot 未发过言 + 不 @：消息挂起（`pending=1`、`timers=1`），12s 内没有走快路评估 |
| 闸门慢路到点评估 | ⏳ | 需把 `gate.slowTimer` 临时改短（patch 只读）+ 重启 GUI；单测 `test/gate.test.js` 已用假时钟覆盖 2h 到点 |
| 审批桥（同意） | ✅ | 群里收到【审批请求】bash + 原因；回复「同意」→ 命令执行、probe 文件写入 `approval-ok` |
| 审批桥（拒绝 / 超时 / 非授权角色） | ⏳ | 本次只跑了「同意」主路径 |
| `qq_send` 出向文本 | ✅ | 群里收到工具发送 |
| 最近消息 API | ✅ | 200，返回 20 条（含媒体标记） |
| 立即清理 API | ✅ | `days=3650` 返回删除计数，不动映射 / 配置 |
| 恢复 NapCat | ✅ | 恢复 wsUrl 后 `connected=true`，登录「示例用户」 |

- **发现（建议修）**：QQ 触发回合的 prompt 没有告诉 agent「本轮最终回复会自动回发到群」，
  `deepseek-flash` 倾向直接调用 `qq_send` 回话 → 引用 / 处理中占位 / 连发合并这三条 P6 行为
  被绕过，且偶发「工具发一次 + 最终文本再发一次」双发。建议在 prompt 末尾加一行
  「直接输出最终回复即可，relay 会自动回发到本群；不要用 `qq_send` 往本群发」。
- **审批桥注意**：`/tmp` 属于平台可写临时区，写它**不会**触发审批；要触发 sandbox 放宽，得让
  agent 写工作区之外的真实路径（本次用 `~/qqr-approval-probe.txt`），群里才会出现
  【审批请求】。
- **未覆盖（需真机或更长窗口）**：真实 NapCat 的图片 / 群文件 URL 与真实戳事件、慢路 2h 到点、
  审批「拒绝 / 超时 / 非授权角色」、QQ 风控 / 限流、P10 的 tab / 明暗主题视觉。
- **测试残留**（沙箱禁止删除，需要时手动清）：`~/.dsh/storages/dsh-qq-relay/state/98765432{1..5}.json`、
  `gate/2026-10-19.jsonl` 里的假群记录、`~/.dsh/sessions/--tmp-qqr-*--` 五个会话目录、
  `~/qqr-approval-probe.txt`（审批测试的探测文件）。

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
4. ✅ 插件配置已在 dwdev 的 patch 里填好；P1.5 起也可在配置页（插件面板 → dsh-qq-relay）改（保存即重连，无需重启）。
5. ✅ 上级 AGENTS.md §0 已于 2026-10-19 仅对 `dsh-qq-relay` 解除。