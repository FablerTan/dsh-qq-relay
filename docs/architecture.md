# 架构

> 状态：**方案定案（2026-10-18）；协议端实测通过、P1 已真机验收、P1.5 基础配置页已落地、
> P2.1/P2.2 消息闸门骨架与收尾已落地、P2.3 jev 分类器已接（OpenRouter）、P3 `qq_send` 主动推送与
> QQ 侧审批已落地（2026-10-19）；P4 聊天记录与消息拼接（群项目 `.qq-relay/`）已实现（2026-10-19）**。
> 协议端事实见 [onebot-channel.md](./onebot-channel.md)，群聊闸门见 [gate.md](./gate.md)，
> 分期见 [roadmap.md](./roadmap.md)。官方机器人通道已降为备选
> （[official-bot-channel.md](./official-bot-channel.md)）。

## 1. 形态与边界

- **host 半身单进程插件**，随 DSH profile 的 GUI 启动；relay 在线 = 该 GUI 进程在线。
- **client 半身**提供设置页「QQ 机器人」（P1.5/P4）：连接状态、配置编辑、群项目目录编辑
  与重新绑定（契约见 [client.md](./client.md)）；更重的面板（审批开关、闸门可视化等）后续再做。
- 不引入外部协议端进程（NapCat 跑在用户侧的 Docker 容器里，插件只连 OneBot WS）；
  插件运行期**零外部依赖**（只用 node: 内置模块与 Node 24 的全局 WebSocket）。
- **插件不管理 profile**：由用户在目标 profile 安装，插件只读取 apply(ctx, config) 的配置。
- 单实例：同一 bot 只允许一个进程连接（文件锁），避免重复事件与账号互踢。

## 2. 已定决策

| 主题 | 决策 |
|---|---|
| 协议端 | 真实 QQ 号 + NapCat + OneBot 11 正向 WebSocket |
| 账号 | QQ 小号登录 NapCat 作 bot；主号操作 |
| 首批场景 | **群聊优先**；私聊放 P3 |
| 消息闸门 | 10 分钟快路 + 2 小时慢路 + jev 分类器；见 gate.md |
| @ 直通 | @ / 引用回复 / 显式命令不走闸门，直接交给 DSH |
| 回复 | 没有平台回复窗口，turn 结束即可发；受 QQ 风控与频率限制 |
| 最小发言间隔 | 默认 45 秒，期间的消息并入下一批 |
| 会话映射 | 默认一个 QQ 群对应一个自动创建的 DSH 会话（草案，见第 5 节） |
| 审批 / 主动推送 / 媒体 / 面板 | 未定，放 P3 |

### 2.1 配置（P1 + P1.5 设置页）

配置由用户在目标 profile 的插件配置里提供（`apply(ctx, config)` 读取）；**token、QQ 号、
群号都不进仓库**，只写在 profile 配置里：

| 键 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `wsUrl` | string | 必填 | NapCat 正向 WS，如 `ws://127.0.0.1:3001` |
| `accessToken` | string | 必填 | OneBot token |
| `selfId` | number | 必填 | bot 小号 QQ 号，连接后用 `get_login_info` 校验 |
| `groups` | number[] | 必填 | 群白名单，未列出的群直接丢弃 |
| `workspace` | string | `~/dsh/qq-relay-ws` | 默认项目目录（会话 cwd + 聊天记录落盘位置）；可在设置页改（只影响之后新建的会话） |
| `groupWorkspaces` | object | `{}` | 群号 → 项目目录；聊天记录写进 `<项目>/.qq-relay/chat/<群号>/`，会话 cwd 同源；优先级高于 `workspace`，低于已钉住的映射（P4，见 [chat-context.md](./chat-context.md)） |
| `chatRetentionDays` | number | `0` | 聊天记录保留天数；`0` = 永不自动删除（P4 默认）；`7..3650` 时启动与每日清理 |
| `sessionTitle` | string | `QQ群：{groupName}` | 自动创建会话的标题模板 |
| `replyChunkSize` | number | 1500 | 出向文本切分上限（待实测调整） |
| `commandPrefixes` | string[] | `['/dsh']` | 群消息文本以此开头时直通（绕过闸门） |
| `gate` | object | `{ enabled: false, ... }` | 消息闸门（P2.1/P2.3）：`enabled` / `mentionBypass` / `fastWindow` / `fastMinReplyInterval` / `debounce` / `slowTimer` / `slowWindow` / `maxBatchMessages` / `classifierTimeoutMs` / `model` / `jevEndpoint` / `jevApiKeyEnv` / `jevThreshold`；时长可写 `45s` / `10m` / `2h` 或毫秒数字，详见 [gate.md §8](./gate.md) |
| `approval` | object | `{ enabled: true, timeoutMs: 120s, roles: ['owner','admin'] }` | QQ 侧审批（P3）：是否接管、等待时长、允许审批的群角色，详见 [approval.md](./approval.md) |

- 会话映射 / 闸门状态 / 决策日志落在 `~/.dsh/storages/dsh-qq-relay/`；**聊天日志（P4）落在各群项目下的
  `<项目>/.qq-relay/chat/<群号>/YYYY-MM-DD.jsonl`**（agent 可直接 read；目录内 `.gitignore` 为 `*` 自我忽略）。
- **配置传递**：写在目标 profile 的 `~/.dsh/profiles/<name>/cordis.patch.yml`，用
  `- id: dsh-qq-relay` + `config:` 整块替换；token 放 `~/.dsh/.env` 的 `DSH_QQ_RELAY_TOKEN`，
  patch 里用 `!!js 'process.env.QQ_RELAY_TOKEN'` 引用（注意：`DSH_` 前缀是 DSH 启动环境的保留名，不能写进 `.env`）。改配置后需重启该 profile 的 GUI。
- 临时停用整行：`- id: dsh-qq-relay` + `disabled: true`。
- **设置页覆盖（P1.5）**：设置 →「QQ 机器人」保存的字段写入
  `~/.dsh/storages/dsh-qq-relay/settings.json`，叠加在 profile patch 之上——只有
  `wsUrl / accessToken / selfId / groups / workspace / groupWorkspaces / chatRetentionDays /
  sessionTitle / replyChunkSize / commandPrefixes` 可覆盖，其余字段保持 patch 只读。保存后**立即重建连接**，不需要重启 GUI。
  `groupWorkspaces` 是整表替换；已映射群改项目后需在设置页点「重新绑定」才会换会话（旧项目聊天记录不搬）。
  契约、HTTP 面与安全边界见 [client.md](./client.md)。

## 3. 模块分层

~~~text
lib/
├── index.js                  # 组合根：读配置、门控服务、装配 controller/model、挂配置页路由
├── controller/
│   ├── onebot/
│   │   ├── client.js         # 正向 WS 客户端：连接、鉴权、重连、心跳、echo
│   │   ├── api.js            # action 调用封装（send_group_msg 等）与 retcode 处理
│   │   └── codec.js          # OneBot 事件 / 消息段 → 内部消息模型
│   ├── runtime.js            # 运行实例：client+api+relay 三件套，支持整份配置热替换
│   ├── config-routes.js      # 配置页 HTTP 面：status / config / reconnect / rebind
│   ├── http.js               # JSON 信封、请求体读取（配置页共用件）
│   ├── gate.js               # 闸门调度（P2.1）：快路去抖 / 慢路定时 / 最小间隔 / 分类器注入
│   ├── tools.js              # qq_send 工具定义（P3：手写 ToolDefinition，零外部依赖）
│   ├── approval.js           # QQ 侧审批桥（P3：approval/request → 群消息 → 文本命令）
│   └── relay.js              # 入向投 DSH、出向收 turn 结果并回复、断线发送队列、主动推送
└── model/
    ├── config.js             # 配置默认值与校验
    ├── settings.js           # 设置页覆盖：层序合并、token 脱敏、settings.json 原子读写
    ├── mapping.js            # group_id ↔ sessionId 映射与持久化
    ├── chat-log.js           # 群消息 JSONL（按群项目路由）/ 读取 / 清理 / 旧日志迁移
    ├── project.js            # 群项目目录解析、`.qq-relay/` 创建与自忽略 .gitignore（P4）
    ├── prompt.js             # 消息拼接：群名 / 时间 / 条数 / @ 与引用标记 / 历史指针（P4）
    ├── gate-log.js           # 闸门决策日志 JSONL（P2.2，不含正文，保留 7 天）
    ├── gate.js               # 闸门纯逻辑（P2.1）：配置解析 / 决策 fail closed / 批次 / 时间窗
    ├── approval.js           # 审批纯逻辑（P3）：命令匹配 / 决策角色 / 提示文案
    ├── state.js              # 每群状态按群分文件 + 旧 state.json 迁移 + 单实例锁
    ├── jev.js                # jev 分类器（P2.3）：OpenRouter Decisions API / Noul / 阈值 / fail closed
    └── reply.js              # 回复切分、退避、发送失败分类
~~~

client 半身（`src/`）只做设置页：`src/model/{api,form}.ts`（HTTP 信封、表单 ↔ patch 纯逻辑）
+ `src/view/SettingsSection.tsx`（React 组件）；`src/client.tsx` 只做注册与装配。
host 半身只依赖 lib/model/。

P1 实现 `controller/onebot/{client,api,codec}.js`、`controller/relay.js` 与
`model/{config,mapping,state,chat-log,reply}.js`；P1.5 新增 `controller/{runtime,config-routes,http}.js`
与 `model/settings.js`；P2.1/P2.3 新增 `controller/gate.js` 与 `model/{gate,jev,gate-log}.js`；
P3 新增 `controller/{tools,approval}.js` 与 `model/approval.js`；P4 新增 `model/{project,prompt}.js`，
聊天日志改由群项目路由（`chat-log.js` 的 `rootFor` + `migrateLegacyChatLogs`）。

`test/` 放 `node:test` 单测（零依赖，`pnpm test`），当前覆盖：配置校验、映射 / 状态持久化、
单实例锁、聊天日志读写清理、回复切分与退避、设置覆盖与脱敏、配置页路由面、闸门纯逻辑与
调度器（假时钟：去抖合并 / 最小间隔 / 慢路时间窗 / dshBusy 延后 / fail closed / 重启恢复）、
决策日志、断线发送队列、jev 请求 / 响应 fail closed、`qq_send` 工具契约与注册、审批命令匹配与桥接、
群项目目录解析 / 聊天日志迁移 / prompt 拼接（P4），以及 `apply()` 组合根集成（假 ctx + 临时 HOME）。

## 4. 事件流

### 4.1 入向（QQ → DSH）

~~~text
OneBot WS 事件
  → codec 规范化（message_id / group_id / user_id / sender / message[] / raw_message）
  → 忽略 message_sent、去重（message_id）
  → 落盘 chat log（群项目 <project>/.qq-relay/chat/<群号>/）
  → 直通（@ / 引用 / 命令）或 gate（快路 / 慢路；分类器未接时普通消息 fail closed）
  → relay.dispatch（prompt 拼接：群名 / 时间 / 条数 / @ 与引用标记 / 历史指针）
  → ctx.sessionController.prompt({sessionId, content, source})
     或 ctx.sessionController.resolveAgent(id) + agent.followup(createUserMessage(...))
  → DSH turn
~~~

- 冷会话用 sessionController 的 resolve / prompt 自动恢复；新建会话用 ctx.agents.create。
- 每行消息带发送者显示名（群名片 → 昵称 → QQ 号兜底）与本地时间；@ 与引用分别标注，历史给相对路径指针。
- 关联：用 agent/inbox/claimed 把 user message id 映射到 turn 号，保证只回触发轮次。

### 4.2 出向（DSH → QQ）

~~~text
ctx.on('session/event', (session, event) => ...)
  ├─ assistant/message（本轮文本 / interrupted）
  └─ turn/end（reason.kind: completed / aborted / error / ...）
ctx.on('agent/error', ...)          # 失败提示
  → relay 收集本轮文本
  → reply 构造消息（切分 / 纯文本降级）
  → api.send_group_msg
~~~

- 只回「由 QQ 触发」的轮次；GUI 里发起的轮次默认不回发（避免刷屏）。
- 发送不区分被动 / 主动，turn 结束即发；失败按 retcode 退避重试。
- **主动推送（P3）**：`qq_send` 工具（见 [tools.md](./tools.md)）走同一个发送队列，
  供任意会话发通知；白名单双重校验，离线排队。
- **QQ 侧审批（P3）**：QQ 会话里的 `approval/request` 由审批桥发到群里，群主 / 管理员回复
  「同意 / 拒绝」；见 [approval.md](./approval.md)。
- 失败 / 中断：按配置发简短提示或静默。

## 5. 会话映射

- 键：group_id（群聊）；后续私聊用 user_id。
- 值：

~~~json
{"sessionId": "qq-group-<id>", "workspacePath": "/abs/path", "title": "QQ群：xxx", "createdAt": 1780000000000}
~~~

- 映射持久化在 `~/.dsh/storages/dsh-qq-relay/mapping.json`；项目目录按 §2.1 的
  `groupWorkspaces[群号] → workspace` 解析，创建会话时**钉进 `workspacePath`**，之后聊天目录与 cwd 都以它为准。
- 默认**自动创建**：首次需要接话时 sessionController.create({cwd: 项目目录})
  + workspaceRegistry.create(项目目录) + attachSession + sessionTitle.rename；映射持久化。
- 也支持配置直接绑定已有 sessionId（「遥控现有会话」），绑定后同样受闸门控制。
- 会话被删除 / 失效 → 重新创建并更新映射。
- 一个群 = 一个会话；群内多用户共享上下文，靠昵称前缀区分。
- 会话在 GUI 侧栏可见（通过 workspace attach），与桌面端共享同一会话。

## 6. 安全

- **群白名单**：按 group_id 白名单，未列出直接丢弃；@ 直通同样校验。
- **账号风险**：非官方协议端有封号风险；使用小号，控制发送频率；文档明示风险由用户承担。
- **权限预设**：relay 会话使用受限权限预设（可配置），降低误操作面。
- **审批**：P3 用文本命令（同意 / 拒绝）实现 QQ 侧审批；v1 先依赖 DSH 现有审批。
- **提示注入**：群成员文本一律视为不可信输入；工作目录限定；操作留审计日志。
- **本地接口**：NapCat WS 只监听回环地址；启用 access_token；不暴露公网。
- **隐私**：聊天日志落在群项目内的 `.qq-relay/`（自忽略、不进 git），默认**永久保留**
  （`chatRetentionDays: 0`）；需要时配天数清理。决策日志仍在 storage 下按 7 天保留。

## 7. 运行前提

1. NapCat 跑在 Docker（macOS 用 Colima）里，bot 小号已扫码登录；macOS 原生 Shell 不可用
   （原因见 [onebot-channel.md §3.1](./onebot-channel.md)）。
2. NapCat 开启 OneBot 11 正向 WS（`127.0.0.1:3001` + token），只监听回环。
3. 目标 profile 装入本插件并填配置；当前约定用 `dwdev`（该 profile 已清空为只装本插件）。
4. 重启该 profile 的 GUI（bundle 组合在启动时发生）。
5. DSH GUI 需常驻；GUI 关闭则 relay 离线。

## 8. 未决

- ~~jev 的部署形态与模型~~ 已定：OpenRouter Decisions API + `typesafe/jev-1.14`（P2.3）；阈值调优待真实群聊数据。
- 审批文本命令的具体交互与超时策略。
- 单聊（private）是否与群共享同一会话映射体系。
- 媒体收发（入向图片 / 文件转 DSH 附件、出向图片 / 文件）。
- ~~DSH → QQ 主动推送工具~~ 已落地为 `qq_send`（见 [tools.md](./tools.md)）。
- client 面板增强：映射管理、审批开关、闸门可视化（基础配置页已在 P1.5 落地，见 [client.md](./client.md)）。
- 多群并发时的资源上限与队列策略。
