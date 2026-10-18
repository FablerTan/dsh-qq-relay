# 架构

> 状态：**方案定案（2026-10-18）；协议端实测通过、P1 实现中（2026-10-19）**。
> 协议端事实见 [onebot-channel.md](./onebot-channel.md)，群聊闸门见 [gate.md](./gate.md)，
> 分期见 [roadmap.md](./roadmap.md)。官方机器人通道已降为备选
> （[official-bot-channel.md](./official-bot-channel.md)）。

## 1. 形态与边界

- **host 半身单进程插件**，随 DSH profile 的 GUI 启动；relay 在线 = 该 GUI 进程在线。
- **client 半身 v1 不做**；配置走 profile patch，运行状态先打日志（面板见 P3）。
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

### 2.1 配置（P1）

配置由用户在目标 profile 的插件配置里提供（`apply(ctx, config)` 读取）；**token、QQ 号、
群号都不进仓库**，只写在 profile 配置里：

| 键 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `wsUrl` | string | 必填 | NapCat 正向 WS，如 `ws://127.0.0.1:3001` |
| `accessToken` | string | 必填 | OneBot token |
| `selfId` | number | 必填 | bot 小号 QQ 号，连接后用 `get_login_info` 校验 |
| `groups` | number[] | 必填 | 群白名单，未列出的群直接丢弃 |
| `workspace` | string | `~/dsh/qq-relay-ws` | relay 会话的工作目录；P1 先固定配置，后续做成插件设置 |
| `sessionTitle` | string | `QQ群：{groupName}` | 自动创建会话的标题模板 |
| `replyChunkSize` | number | 1500 | 出向文本切分上限（待实测调整） |
| `commandPrefixes` | string[] | `['/dsh']` | 群消息文本以此开头时直通（绕过闸门） |

- 会话映射 / 闸门状态 / 聊天日志落在 `~/.dsh/storages/dsh-qq-relay/`。
- **配置传递**：写在目标 profile 的 `~/.dsh/profiles/<name>/cordis.patch.yml`，用
  `- id: dsh-qq-relay` + `config:` 整块替换；token 放 `~/.dsh/.env` 的 `DSH_QQ_RELAY_TOKEN`，
  patch 里用 `!!js 'process.env.DSH_QQ_RELAY_TOKEN'` 引用。改配置后需重启该 profile 的 GUI。
- 临时停用整行：`- id: dsh-qq-relay` + `disabled: true`。
- P1 不做 client 设置面板；`workspace` 等后续迁到插件设置。

## 3. 模块分层

~~~text
lib/
├── index.js                  # 组合根：读配置、门控服务、装配 controller/model
├── controller/
│   ├── onebot/
│   │   ├── client.js         # 正向 WS 客户端：连接、鉴权、重连、心跳、echo
│   │   ├── api.js            # action 调用封装（send_group_msg 等）与 retcode 处理
│   │   └── codec.js          # OneBot 事件 / 消息段 → 内部消息模型
│   ├── gate.js               # 闸门状态机：直通/快路/慢路/去抖/冷却/jev 调度
│   └── relay.js              # 入向投 DSH、出向收 turn 结果并回复
└── model/
    ├── config.js             # 配置默认值与校验
    ├── mapping.js            # group_id ↔ sessionId 映射与持久化
    ├── chat-log.js           # 群消息 JSONL 落盘 / 读取 / 清理
    ├── state.js              # 每群闸门状态持久化 + 单实例锁
    ├── jev.js                # 分类器调用契约（fail closed）
    └── reply.js              # 回复构造、切分、重试队列
~~~

host 半身只依赖 lib/model/；client 半身（src/）保持空骨架。

P1 只实现 `controller/onebot/{client,api,codec}.js`、`controller/relay.js` 与
`model/{config,mapping,state,chat-log,reply}.js`；`gate.js`、`jev.js` 自 P2 起。
当前进度：`model/` 全部与 `controller/onebot/{codec,client,api}.js` 已落地（含单测），
`controller/relay.js` 与组合根 `index.js` 进行中。

`test/` 放 `node:test` 单测（零依赖，`pnpm test`），当前覆盖 model 层：配置校验、
映射 / 状态持久化、单实例锁、聊天日志读写清理、回复切分与退避。

## 4. 事件流

### 4.1 入向（QQ → DSH）

~~~text
OneBot WS 事件
  → codec 规范化（message_id / group_id / user_id / sender / message[] / raw_message）
  → 忽略 message_sent、去重（message_id）
  → 落盘 chat log
  → gate（直通 / 快路 / 慢路）
  → relay.dispatch
  → ctx.sessionController.prompt({sessionId, content, source})
     或 ctx.sessionController.resolveAgent(id) + agent.followup(createUserMessage(...))
  → DSH turn
~~~

- 冷会话用 sessionController 的 resolve / prompt 自动恢复；新建会话用 ctx.agents.create。
- 消息前缀带发送者昵称（[昵称] ...），不传 QQ 号（对模型无意义，且减少隐私暴露）。
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
- 失败 / 中断：按配置发简短提示或静默。

## 5. 会话映射

- 键：group_id（群聊）；后续私聊用 user_id。
- 值：

~~~json
{"sessionId": "qq-group-<id>", "workspacePath": "/abs/path", "title": "QQ群：xxx", "createdAt": 1780000000000}
~~~

- 映射持久化在 `~/.dsh/storages/dsh-qq-relay/mapping.json`；工作目录默认 `~/dsh/qq-relay-ws`。
- 默认**自动创建**：首次需要接话时 ctx.agents.create({sessionId, meta:{cwd}, agentOptions})
  + workspaceRegistry.attachSession + sessionTitle.rename；映射持久化。
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
- **隐私**：聊天日志落在 ~/.dsh/storages 下，默认保留 7 天；提供清理开关。

## 7. 运行前提

1. NapCat 跑在 Docker（macOS 用 Colima）里，bot 小号已扫码登录；macOS 原生 Shell 不可用
   （原因见 [onebot-channel.md §3.1](./onebot-channel.md)）。
2. NapCat 开启 OneBot 11 正向 WS（`127.0.0.1:3001` + token），只监听回环。
3. 目标 profile 装入本插件并填配置；当前约定用 `dwdev`（该 profile 已清空为只装本插件）。
4. 重启该 profile 的 GUI（bundle 组合在启动时发生）。
5. DSH GUI 需常驻；GUI 关闭则 relay 离线。

## 8. 未决

- jev 的部署形态与模型（ctx.llm / 外部 endpoint / 本地）。
- 审批文本命令的具体交互与超时策略。
- 单聊（private）是否与群共享同一会话映射体系。
- 媒体收发（入向图片 / 文件转 DSH 附件、出向图片 / 文件）。
- DSH → QQ 主动推送工具（如 qq_send）。
- client 状态 / 配置面板。
- 多群并发时的资源上限与队列策略。
