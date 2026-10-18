# 架构

> 状态：**方案定案（2026-10-18），实现未开始**。协议端事实见
> [onebot-channel.md](./onebot-channel.md)，群聊闸门见 [gate.md](./gate.md)，
> 分期见 [roadmap.md](./roadmap.md)。官方机器人通道已降为备选
> （[official-bot-channel.md](./official-bot-channel.md)）。

## 1. 形态与边界

- **host 半身单进程插件**，随 DSH profile 的 GUI 启动；relay 在线 = 该 GUI 进程在线。
- **client 半身 v1 不做**；配置走 profile patch，运行状态先打日志（面板见 P3）。
- 不引入外部协议端进程（NapCat 是用户侧独立程序）；插件运行期**零外部依赖**
  （只用 node: 内置模块与 Node 24 的全局 WebSocket）。
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

1. 本机 QQ NT + NapCat 运行，bot 小号已登录。
2. NapCat 开启 OneBot 11 正向 WS（回环地址 + token）。
3. 目标 profile 安装本插件并填配置（WS 地址、token、白名单群号）。
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
