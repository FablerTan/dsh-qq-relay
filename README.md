# dsh-qq-relay

把 **DeepSeek Harness（DSH）** 接入 **QQ 机器人**的自研插件（bundle 包，host + client 双半身）。
当前 **v0.8.0**：P1「@ 直通」已真机验收（2026-10-19）；P1.5 基础配置页（设置 →「QQ 机器人」）
已落地（2026-10-19）；P2.1/P2.2 消息闸门已落地（去抖 / 最小间隔 / 慢路 / 决策日志 / 发送队列，
P2.3 jev 分类器已接（OpenRouter `typesafe/jev-1.14`），`gate.enabled` 默认关）；P3 已落地 `qq_send`
主动推送与 QQ 侧审批；P4 已落地**群项目目录 + 聊天记录 `.qq-relay/` + prompt 拼接**（2026-10-19）。设计见 [docs/architecture.md](./docs/architecture.md)，协议端选型与部署见
[docs/onebot-channel.md](./docs/onebot-channel.md)，配置页契约见 [docs/client.md](./docs/client.md)。

> **v0.1.0**：按上级技能 `dsh-plugin-project-init` 初始化。
> **本项目不使用 openspec**（用户 2026-10-16 决定）——没有 `openspec/`，也没有
> `.agents/skills/openspec-*`；规格与设计随 README 与 `docs/` 走。
> 空骨架唯一的可见副作用：host 半身加载时打一行日志，用于确认 link + bundle 组合生效。
> 装完 / 改完需**重启对应 profile 的 GUI**（由用户执行，本插件不自行 kill / 重启 DSH）。

## 用途（P1 已实现；后续阶段见 [roadmap](./docs/roadmap.md)）

DSH 与 QQ 之间的**双向桥**：

- **QQ → DSH**：QQ 群里的消息经过「消息闸门」过滤后投给某个 DSH 会话，agent 跑完把回复回发群聊；
- **DSH → QQ**：会话 / 工具侧主动往 QQ 推消息（通知、任务完成提醒等，P3）。

**已定案（2026-10-18）**：

- 协议端：**真实 QQ 号 + NapCat + OneBot 11 正向 WebSocket**——DSH 单轮可能超过 5 分钟，官方机器人的群聊被动回复窗口（5 分钟）会让长任务结果只能改走主动消息（受配额、可被关闭）；真实 QQ 号可随时发送。官方通道方案保留为备选（[docs/official-bot-channel.md](./docs/official-bot-channel.md)）。
- 账号：一个 **QQ 小号**登录 NapCat 作 bot，主号操作；**群聊优先**（群 @ 直通 + 群内普通消息经闸门过滤）；单聊放 P3。
- 消息闸门：**10 分钟快路 + 2 小时慢路 + jev 分类器**，@ 直通、最小发言间隔（见 [docs/gate.md](./docs/gate.md)）。
- 运行形态：host 半身单进程插件；client 半身 v1 不做；插件不管理 profile。
- 已知代价：非官方协议端**有封号风险**，需要常开 QQ 客户端 + NapCat。
- 部署形态：NapCat 跑在 **Docker（macOS 用 Colima）**里，插件连 `127.0.0.1:3001`；macOS 原生 Shell 在 macOS 26 + arm64 上不可用（见 [onebot-channel.md §3.1](./docs/onebot-channel.md)）。

**已交付**：OneBot 接入与 @ 直通（P1）、基础配置页（P1.5：连接状态 / 配置编辑 / 群映射）、
消息闸门骨架与收尾（P2.1/P2.2：去抖 / 最小间隔 / 慢路 / 状态持久化 / 决策日志 / 发送队列）、
jev 分类器（P2.3：OpenRouter `typesafe/jev-1.14`，阈值判定 + fail closed）、
DSH → QQ 主动推送工具 `qq_send`（P3）、QQ 侧文本审批（P3：群里回复「同意 / 拒绝」）、
群项目目录与聊天记录 `.qq-relay/` + prompt 拼接（P4，见 [chat-context.md](./docs/chat-context.md)）。
**仍未定案**：群审批（按钮）、媒体收发、client 面板增强、聊天记录清理 UI——先落 `docs/` 再实现。

## 目录结构

```
dsh-qq-relay/
├── package.json          # name + dsh.bundle.patch + dsh.client（link 加载的必要元数据）
├── cordis.patch.yml      # bundle patch：把插件行插入 profile roster
├── vite.config.ts        # client 半身库模式构建（React / @deepseek-ai 全 external）
├── tsconfig.json         # client 半身类型检查（include 只有 src）
├── pnpm-workspace.yaml   # pnpm 11 构建设置（放行 esbuild、关自动 peer 安装）
├── lib/
│   ├── index.js          # host 半身**手写**组合根（读配置、单实例锁、装配）
│   ├── controller/
│   │   ├── onebot/       # codec（事件编解码）· client（WS）· api（action 封装）
│   │   ├── runtime.js    # relay 运行实例：整份配置热替换（配置页保存后重建连接）
│   │   ├── config-routes.js # 配置页 HTTP 面（status / config / reconnect / rebind）
│   │   ├── http.js       # JSON 信封与请求体读取共用件
│   │   ├── gate.js       # 闸门调度：去抖批次 / 最小间隔 / 慢路定时（分类器注入）
│   │   ├── tools.js      # qq_send 工具定义（手写 ToolDefinition，零外部依赖）
│   │   ├── approval.js   # QQ 侧审批桥：approval/request → 群消息 → 文本命令决定
│   │   └── relay.js      # 入向判定 + 会话映射 + 出向回发 + 断线发送队列 + 主动推送
│   ├── model/            # 配置 / 设置覆盖 / 会话映射 / 状态+锁 / 群项目目录 / 聊天日志 / prompt 拼接 / 决策日志 / 回复切分 / 闸门 / jev / 审批
│   └── client.js         # client 半身构建产物（已入库，clone 即可加载）
├── test/                 # host 单测（node:test，零依赖；含配置页 / apply 集成）
├── src/                  # client 半身源码：model（HTTP 信封、表单解析）→ view（设置页组件）
│   ├── client.tsx        # 组合根：把设置页注册进 settings.section
│   ├── model/            # api.ts（HTTP）· form.ts（表单 ↔ patch 纯逻辑）
│   └── view/             # SettingsSection.tsx（设置页「QQ 机器人」）
├── scripts/              # wrap-client（产物包装）· check-syntax · check-docs
├── docs/                 # 设计文档（官方通道 / 消息闸门 / 架构 / 路线）
├── README.md             # 本文件
└── AGENTS.md             # 本插件开发纪律（文档在哪 + pnpm check 闸门）
```

## 文档索引

| 文档 | 写什么 | 何时看 |
|---|---|---|
| [README.md](./README.md) | 总览 / 用途 / 用法 / 版本历史 | 任何任务第一步 |
| [AGENTS.md](./AGENTS.md) | 本插件纪律：文档位置速查 + `pnpm check` 闸门 | 动手前 |
| [docs/architecture.md](./docs/architecture.md) | 总体架构：形态、模块、事件流、会话映射、安全、运行前提 | 动手前 / 改设计时 |
| [docs/client.md](./docs/client.md) | client 半身：设置页「QQ 机器人」、配置层序、HTTP 契约、热更新语义 | 改设置页 / 调配置保存时 |
| [docs/onebot-channel.md](./docs/onebot-channel.md) | 真实 QQ 号通道：账号模型、NapCat 部署、WebSocket 事件与 API、封号风险 | 接协议端、部署 NapCat 时 |
| [docs/official-bot-channel.md](./docs/official-bot-channel.md) | **备选（当前不采用）**：官方 QQ 机器人通道事实与限制 | 回退 / 对比时 |
| [docs/gate.md](./docs/gate.md) | 消息闸门：快路 / 慢路、jev、去重幂等、状态持久化、配置 | 改群聊行为时 |
| [docs/chat-context.md](./docs/chat-context.md) | 聊天记录落盘与消息拼接（v0.8.0 规格）：`.qq-relay/` 隐藏目录、群项目目录、prompt 格式、迁移 | 改聊天记录 / prompt 拼接时 |
| [docs/tools.md](./docs/tools.md) | `qq_send` 主动推送：契约、安全、离线队列、验证 | 改工具 / 排查推送失败时 |
| [docs/approval.md](./docs/approval.md) | QQ 侧审批：群里文本命令、角色限制、超时 / 取消 / 离线语义 | 改审批 / 排查审批不生效时 |
| [docs/roadmap.md](./docs/roadmap.md) | 分期、验收标准、风险与用户前置动作 | 排期 / 决定下一步时 |
| [../../AGENTS.md](../../AGENTS.md)、[../../docs/](../../docs/) | 仓库级纪律、渲染树选座速查 | 跨插件协作、装 profile、选 slot |

## 激活方式（已链接 `dwdev`，该 profile 已清空为只装本插件）

```bash
dsh plugin --profile <profile> add link:/path/to/dsh-qq-relay
# 装完需重启该 profile 的 GUI 才生效（bundle 组合发生在启动时）
```

- 回滚：`dsh plugin --profile <profile> remove dsh-qq-relay`（不影响本仓库）。
- 验证：重启后宿主日志里应出现 `dsh-qq-relay` 的加载日志；设置页里出现「QQ 机器人」，
  能看到连接状态与配置表单。
- 链接现状记录在上级 [PROFILES.md](../../PROFILES.md)。

## 开发循环

```bash
pnpm install     # devDependencies：vite / react / typescript（插件**运行时零外部依赖**）
pnpm build       # src/client.tsx -> dist/client.cjs -> lib/client.js（wrap-client 包装）
pnpm watch       # watch 模式：改 src 自动 rebuild + wrap，浏览器刷新可见
pnpm check       # 验收闸门：语法 + 元数据 + tsc --noEmit + 文档↔源码配对
pnpm test        # host 纯逻辑单测（node:test，零依赖）
```

- `lib/index.js` 是**手写** host 源码（不经构建）；`lib/client.js` 是 client 半身构建产物，
  已入库——clone 后不装依赖也能被宿主加载。只有改了 `src/` 才需要 `pnpm build` / `pnpm watch`。
- **host / client 热载差异**：改 host 半身要重启 profile 的 GUI；client 半身由宿主的 client 热换
  机制在浏览器刷新后生效。

## 版本历史

### v0.8.0 群项目目录与消息拼接（2026-10-19）

- 每个群可以绑定自己的**项目目录**（`groupWorkspaces`，设置页「群项目目录」表格可编辑）：
  会话 cwd 与聊天记录都以它为准；未单独配置时跟随默认 `workspace`。
- 聊天记录从全局 storage 搬进各群的 `<项目>/.qq-relay/chat/<群号>/YYYY-MM-DD.jsonl`，
  目录内 `.gitignore` 为 `*`（自我忽略、永不进用户仓库）；**默认不再自动删除**
  （`chatRetentionDays: 0`，清理 UI 排 v0.8.1）。DSH 会话与 agent 都能直接 read。
- 发给 DSH 的 prompt 统一由 `lib/model/prompt.js` 拼接：群名 / 群号 / 本地时间 / 条数 /
  `@你`、`引用 <id>` 标记 / 聊天记录相对路径指针；直通与闸门共用，修掉昵称与 @ 信息丢失。
- 聊天日志行新增 `groupId` / `card` / `mentionsSelf` / `replyToId`（旧行缺字段自动补默认）。
- 旧全局聊天日志启动时一次性迁移进各群项目（幂等，目标已存在则跳过，失败只告警）。
- 设置页新增「重新绑定」：删该群映射并按新项目重建（`POST /dsh-qq-relay/api/rebind`），
  旧项目里的历史记录不移动。
- 新增 `model/{project,prompt}.js`、`test/{project,prompt,migration}.test.js`；单测 143 个。
- 文档：[docs/chat-context.md](./docs/chat-context.md) 规格转实现；architecture / client / gate / roadmap 同步。
  改的是 host + client 半身，**需重启 profile GUI + 刷新页面**生效。

### v0.7.1 jev 上下文修正（2026-10-19）

- 修掉「jev 只看本批、看不到前因」的问题：分类器现在拿到聊天日志里最近 60 条消息
  （包含 bot 自己的发言），派发 DSH 的 prompt 仍只带 pending 本批。
- relay 发送成功后把 bot 的发言写回聊天日志（`role: "bot"`），jev 的 state 因此能表达
  「刚被 @ 过、刚回过一句」这类连续对话语境。
- 状态接口新增 `gate` 字段（`enabled` / `classifier` / `model` / `threshold` / `slowTimer`），
  方便 `curl` 排查 jev 是否启用。
- 单测 121 个；host 半身改动，需重启 profile GUI 生效。

### v0.7.0 jev 分类器接入（2026-10-19）

- 接入 TypeSafe 的 System One 决策模型 jev（OpenRouter Decisions API，默认 `typesafe/jev-1.14`）：
  把「最近一批群消息 + 群名 + 触发路径」作为 `state`，问一个 Noul 问题（要不要接话），
  按 `jevThreshold`（默认 0.7）判定，返回带概率的决策并写入决策日志。
- 完全 fail closed：网络 / 超时（默认 8s）/ 非 2xx / 响应不合规都按「不接话」处理。
- key 从环境变量读取（`gate.jevApiKeyEnv`，默认 `OPENROUTER_API_KEY`）；缺 key 只告警并按
  fail closed 运行，不影响 @ / 引用 / 命令直通。
- 新增 `lib/model/jev.js`（请求构造 / 响应解析 / 分类器，零依赖、全局 fetch）；
  gate 配置新增 `model` / `jevEndpoint` / `jevApiKeyEnv` / `jevThreshold`；单测 119 个。
- 文档：[gate.md §4 / §8](./docs/gate.md) 已更新；改的是 host 半身，需重启 profile GUI 生效。

### v0.6.0 QQ 侧审批（2026-10-19）

- 新增审批桥：映射到 QQ 群的会话收到 `approval/request` 时，把【审批请求】发到群里，
  群主 / 管理员回复「同意 / 拒绝」即完成一次性授权（`allowed-once` / `rejected`），不用切 GUI。
- 超时（默认 120 秒）按拒绝；请求取消 → `cancelled`；relay 离线 / 发送失败 → `unavailable`（fail closed）；
  普通成员回复被忽略并提示；同群并发请求交给 GUI。
- 未映射会话的审批继续走 GUI（`next()`），行为不变；配置 `approval.enabled / timeoutMs / roles` 只读。
- 复用 relay 出向发送与白名单；审批等待期间的「同意 / 拒绝」消息由入向拦截器优先消费。
- 新增 [docs/approval.md](./docs/approval.md)；单测 108 个；改的是 host 半身，需重启 profile GUI 生效。

### v0.5.0 主动推送工具 qq_send（2026-10-19）

- 新增 host 工具 `qq_send`：任意 DSH 会话可把纯文本推到白名单 QQ 群（P3 第一项）。
- 契约：`text` 必填、`groupId` 可选（唯一白名单群可省略）；返回 `{ groupId, chunks, queued, messageIds }`；
  离线时整段进入发送队列（上限 50 条 / 30 分钟），重连后补发并返回 `queued: true`。
- 与 relay 共用连接、切分与风控退避；群白名单工具层 + relay 层双重校验；发送成功同样刷新闸门窗口。
- 手写 `ToolDefinition` 形状对象（`lib/controller/tools.js`），**不 import `@deepseek-ai/dsh-tools`**，
  保持运行时零外部依赖；宿主无 tools 服务时静默跳过。
- 文档：新增 [docs/tools.md](./docs/tools.md)；单测 91 个；改的是 host 半身，需重启 profile GUI 生效。

### P2.2 闸门收尾（2026-10-19）

- 慢路按时间窗裁剪：只评估最近 `slowWindow`（默认 2 小时）内的 pending，更早的丢弃（仍在聊天日志里）。
- DSH 忙标记：派发批次时置 `dshBusy`，turn 结束清除；忙时闸门延后评估，避免同群并发起两个 turn。
- 决策日志落盘：每次决策写 `gate/YYYY-MM-DD.jsonl`（trigger / 批次 / reply / confidence / reason /
  耗时 / message_id 列表，**不含正文**），保留 7 天，便于将来调 jev 阈值与回放。
- 日志保留期真正生效：组合根启动时与每天清理聊天日志 / 决策日志（此前 `prune` 只写未接）。
- 群成员昵称 / 角色改用事件自带的 `sender.card || nickname` / `role`，不额外查 API。
- 单测 79 个；重启 dwdev GUI 后真机确认新 host 代码生效（按群状态文件已生成、发言窗口正常刷新）。

### P2.1 消息闸门骨架（2026-10-19）

- 普通群消息进入闸门调度：快路（bot 最近 10 分钟发过言）走 5 秒去抖合并，慢路（久未发言）累积到
  2 小时定时器；两次发言至少间隔 45 秒（间隔内的批次延后不丢）；@ / 引用 / 命令直通保持原样
  （`gate.mentionBypass` 可关）。**`gate.enabled` 默认 false**，开箱行为与 P1 完全一致。
- 分类器以接口注入（`{ classify({ groupId, groupName, trigger, messages }) }`）；**暂不接模型**，
  缺省实现永远 fail closed，但每次决策都记「批次数 / reply / confidence / reason / 耗时」日志，
  为将来接 jev 留出可替换点。
- 状态改为按群分文件 `~/.dsh/storages/dsh-qq-relay/state/<group_id>.json`（seen / pending /
  lastBotSpeakAt / lastReplyAt / cooldownUntil / evaluating），旧 `state.json` 一次性迁移；
  重启后恢复 pending 与冷却窗口，不立即发言。
- 出向新增本地发送队列：断线或发送失败时排队，重连（`client open`）后按序补发；失败按
  「风控限流（退避重试）/ 明确失败（不重试）」分类；队列上限 50 条、最长保留 30 分钟。
- `gate` 配置段进 `normalizeConfig`（时长支持 `45s` / `10m` / `2h` 或毫秒数字，非法值直接拒绝）。
- 单测 75 个（新增闸门纯逻辑、调度器假时钟、按群状态与迁移、断线队列集成）；`pnpm check` 全绿。

### P1.5 基础配置页（2026-10-19）

- 设置 →「QQ 机器人」（`settings.section`）落地：连接状态（含单实例锁冲突提示）、配置表单
  （wsUrl / token / selfId / 群白名单 / 工作目录 / 标题模板 / 切分上限 / 命令前缀）、群 ↔ 会话映射只读表。
- host 新增三条同源 HTTP 路由（`/dsh-qq-relay/api/{status,config,reconnect}`），统一 JSON 信封；
  保存后**立即重建连接**（单实例锁不变），token **只写不读**。
- 配置层序：profile patch → 设置页保存的 `~/.dsh/storages/dsh-qq-relay/settings.json`；
  非法字段被 `normalizeConfig` 拒绝，不落盘。
- 单测 51 个（覆盖设置覆盖模型、路由面、`apply()` 集成），`pnpm check` 全绿。

### P1 真机验收（2026-10-19）

- 群里 @ 小号 → DSH 回复（约 4 秒往返）；`mapping.json` 自动建会话「QQ群：示例群」。
- NapCat 重启导致 WS 断开后，插件按退避自动重连；重连后新消息正常、复用原会话不重建，`state.seen` / 聊天日志正确。
- 已知代价：容器重启可能需重新扫码；断线窗口内的事件不补发（P1 接受，P2 再补）。
- 长轮次 6 分 04 秒仍能发出；重启 dwdev GUI 后锁被新进程接管、映射复用原会话，重启后首条消息正常回复。

### P1 实现（2026-10-19，代码）

- host 半身实现「@ / 引用 / 命令前缀直通」：OneBot 11 正向 WS 客户端（token、echo 超时、心跳看门狗、退避重连、`self_id` 校验）、事件编解码、白名单 / `message_id` 去重 / 聊天日志、群 → DSH 会话自动创建与映射、`sessionController.prompt` 投递、`agent/inbox/claimed` 关联 turn、`turn/end` 回发 `send_group_msg`（长文本切分，只回 QQ 触发的轮次）。
- model 层：配置校验（fail closed）、映射 / 状态持久化、单实例文件锁、聊天日志 JSONL、回复切分与退避。
- 单测 38 个（`node:test`，零依赖）；`pnpm check` 全绿。
- 待办：重启 dwdev GUI 后做真机验收（见 roadmap P1 验收表）。

### P1 开工（2026-10-19，文档 + 环境）

- 上级 `AGENTS.md` §0 按用户要求**仅对 `dsh-qq-relay` 解除**（允许 P1 实现；其余插件仍只做文档 / 空骨架）。
- 协议端实测通过：macOS 26 原生 Shell 因 native hook 被代码签名强杀，改用 **Docker（Colima + linux/arm64）** 跑 NapCat；OneBot 11 正向 WS、@ / 引用 / 普通消息、`send_group_msg`、历史查询均验证通过（记录见 [docs/onebot-channel.md §9](./docs/onebot-channel.md)）。
- 目标 profile 定为 `dwdev`，并按用户要求把该 profile 清空为只装本插件（见上级 `PROFILES.md`）。
- 文档更新：`onebot-channel.md` 补 Docker 部署与实测契约；`architecture.md` 补配置项；`roadmap.md` 更新前提与验收。

### 选型调整（2026-10-18，文档）

- 协议端由「官方 QQ 机器人」调整为「真实 QQ 号 + NapCat + OneBot 11 正向 WebSocket」：官方通道群聊被动回复窗口仅 5 分钟，DSH 长任务结果只能改走主动消息（受配额、可被关闭）；真实 QQ 号可随时发送。
- 新增 `docs/onebot-channel.md`；`docs/official-bot-channel.md` 降为备选；architecture / gate / roadmap / README / AGENTS 同步调整。
- 风险：非官方协议端有封号风险、需常开 QQ 客户端；功能实现仍未开始。

### 设计定案（2026-10-18，文档）

- 方案定案并落 `docs/`：**官方 QQ 机器人开放平台**（WebSocket 收事件 + HTTPS 发消息）、**群聊优先**、**消息闸门**（10 分钟快路 + 2 小时慢路 + jev 分类器）。
- 新增 `docs/architecture.md` / `docs/official-bot-channel.md` / `docs/gate.md` / `docs/roadmap.md`，并在「文档索引」登记。
- 功能实现仍未开始；进入实现需先解除上级 `AGENTS.md` §0「只做文档 / 空骨架」的约束。

### v0.1.0（空骨架）

- 按上级技能 `dsh-plugin-project-init` 初始化：bundle 六件套（`package.json` /
  `cordis.patch.yml` / `vite.config.ts` / `scripts/wrap-client.mjs` / `src/client.tsx` /
  README）+ host 空组合根 `lib/index.js` + 自检闸门（`scripts/check-syntax.mjs`、
  `scripts/check-docs.mjs`）+ 插件级 `AGENTS.md`。
- **不使用 openspec**（用户 2026-10-16 决定）：无 `openspec/` 与 `openspec-*` 技能副本。
- 功能实现（协议端接入、会话映射、消息转发、状态面板）**尚未开始**：两个半身的 `apply` 均为空。
