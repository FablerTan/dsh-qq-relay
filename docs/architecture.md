# 架构

> 状态：**方案定案（2026-10-18），实现未开始**。平台接口事实见
> [official-bot-channel.md](./official-bot-channel.md)，群聊闸门见 [gate.md](./gate.md)，
> 分期见 [roadmap.md](./roadmap.md)。

## 1. 形态与边界

- **host 半身单进程插件**，随 DSH profile 的 GUI 启动；relay 在线 = 该 GUI 进程在线。
- **client 半身 v1 不做**；配置走 profile patch，运行状态先打日志（面板见 P3）。
- 不引入外部协议端或额外进程；运行期**零外部依赖**（只用 node: 内置模块与 Node 24 的
  全局 WebSocket / fetch）。
- **插件不管理 profile**：由用户在目标 profile 安装，插件只读取 apply(ctx, config) 的配置。
- 单实例：同一 bot 只允许一个进程连接（文件锁），避免重复事件与网关互踢。

## 2. 已定决策

| 主题 | 决策 |
|---|---|
| 协议端 | 官方 QQ 机器人开放平台：WebSocket 收事件 + HTTPS 发消息 |
| 首批场景 | **群聊优先**；单聊放 P3 |
| 消息闸门 | 10 分钟快路 + 2 小时慢路 + jev 分类器；见 gate.md |
| @ 直通 | @ / 回复 / 显式命令不走闸门，直接交给 DSH |
| 被动窗口 | 过期不回（onPassiveExpired: drop） |
| 慢路发言 | 属于主动消息，受配额与开关限制，失败降级 |
| 最小发言间隔 | 默认 45 秒，期间的消息并入下一批 |
| 会话映射 | 默认一个 QQ 群对应一个自动创建的 DSH 会话（草案，见第 5 节） |
| 审批 / 主动推送 / 媒体 / 面板 | 未定，放 P3 |

## 3. 模块分层

~~~text
lib/
├── index.js                  # 组合根：读配置、门控服务、装配 controller/model
├── controller/
│   ├── official/
│   │   ├── auth.js           # AppID/AppSecret → access_token，提前刷新
│   │   ├── gateway.js        # WSS 连接、Identify、心跳、Resume、重连、事件分发
│   │   ├── rest.js           # 发消息接口（群/单聊）、错误码、429 退避
│   │   └── codec.js          # 平台事件 → 内部消息模型
│   ├── gate.js               # 闸门状态机：快路/慢路/去抖/冷却/jev 调度
│   └── relay.js              # 入向投 DSH、出向收 turn 结果并回复
└── model/
    ├── config.js             # 配置默认值与校验
    ├── mapping.js            # group_openid ↔ sessionId 映射与持久化
    ├── chat-log.js           # 群消息 JSONL 落盘 / 读取 / 清理
    ├── state.js              # 每群闸门状态持久化 + 单实例锁
    ├── jev.js                # 分类器调用契约（fail closed）
    └── reply.js              # 被动/主动回复决策、切分、降级
~~~

host 半身只依赖 lib/model/；client 半身（src/）保持空骨架。

## 4. 事件流

### 4.1 入向（QQ → DSH）

~~~text
WebSocket 事件
  → codec 规范化（msg_id / group_openid / member_openid / content / attachments）
  → 去重、忽略 author.bot
  → 落盘 chat log
  → gate（直通 / 快路 / 慢路）
  → relay.dispatch
  → ctx.sessionController.prompt({sessionId, content, source})
     或 ctx.sessionController.resolveAgent(id) + agent.followup(createUserMessage(...))
  → DSH turn
~~~

- 冷会话用 sessionController 的 resolve / prompt 自动恢复；新建会话用 ctx.agents.create。
- 消息前缀带发送者昵称（[昵称] ...），不传 openid（对模型无意义，且减少隐私暴露）。
- 关联：用 agent/inbox/claimed 把 user message id 映射到 turn 号，保证只回触发轮次。

### 4.2 出向（DSH → QQ）

~~~text
ctx.on('session/event', (session, event) => ...)
  ├─ assistant/message（本轮文本 / interrupted）
  └─ turn/end（reason.kind: completed / aborted / error / ...）
ctx.on('agent/error', ...)          # 失败提示
  → relay 收集本轮文本
  → reply 构造消息（切分 / markdown 降级）
  → rest 发送（被动优先，超窗 drop；慢路走主动消息）
~~~

- 只回「由 QQ 触发」的轮次；GUI 里发起的轮次默认不回发（避免刷屏）。
- 失败/中断：按配置发简短提示或静默。

## 5. 会话映射

- 键：group_openid（群聊）；后续单聊用 user_openid。
- 值：

~~~json
{"sessionId": "qq-group-<hash>", "workspacePath": "/abs/path", "title": "QQ群：xxx", "createdAt": 1780000000000}
~~~

- 默认**自动创建**：首次需要接话时 ctx.agents.create({sessionId, meta:{cwd}, agentOptions})
  + workspaceRegistry.attachSession + sessionTitle.rename；映射持久化。
- 也支持配置直接绑定已有 sessionId（「遥控现有会话」），绑定后同样受闸门控制。
- 会话被删除 / 失效 → 重新创建并更新映射。
- 一个群 = 一个会话；群内多用户共享上下文，靠昵称前缀区分。
- 会话在 GUI 侧栏可见（通过 workspace attach），与桌面端共享同一会话。

## 6. 安全

- **群白名单**：按 group_openid 白名单，未列出直接丢弃；@ 直通同样校验。
- **权限预设**：relay 会话使用受限权限预设（可配置），降低误操作面。
- **审批**：P3 用内嵌键盘按钮 + INTERACTION_CREATE 实现 QQ 侧审批；v1 先依赖 DSH 现有审批。
- **提示注入**：群成员文本一律视为不可信输入；工作目录限定；操作留审计日志。
- **凭证**：AppSecret / token 从环境变量或 profile 配置读取，不写日志、不进 session。
- **隐私**：聊天日志落在 ~/.dsh/storages 下，默认保留 7 天；提供清理开关。
- **主动消息**：受平台配额与用户开关限制；被关闭时降级，不循环重试。

## 7. 运行前提

1. QQ 开放平台注册机器人并完成认证，拿到 AppID / AppSecret。
2. 机器人加入测试群；如需群内普通消息，申请「接收所有消息」。
3. 在目标 profile 安装本插件并填配置（凭证放环境变量优先）。
4. 重启该 profile 的 GUI（bundle 组合在启动时发生）。
5. DSH GUI 需常驻；GUI 关闭则 relay 离线。

## 8. 未决

- jev 的部署形态与模型（ctx.llm / 外部 endpoint / 本地）。
- 审批按钮的具体交互与超时策略。
- 单聊（C2C）是否与群共享同一会话映射体系。
- 媒体收发（入向附件下载、出向富媒体上传）。
- DSH → QQ 主动推送工具（如 qq_send）。
- client 状态 / 配置面板。
- 多群并发时的资源上限与队列策略。
