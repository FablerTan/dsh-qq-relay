# QQ 侧命令层（v0.11.0）

> 状态：v0.11.0 已实现（2026-10-19），待真机验收。实现在 `lib/model/commands.js`（纯逻辑）
> 与 `lib/controller/relay.js`（执行 + 发送）；本文是该层的契约与边界。

## 1. 要解决的问题

群里能 @ 机器人、能看到它接话，但**没法从 QQ 侧控制会话本身**：长任务跑飞了只能等，
上下文太长了没法开新会话，想知道闸门现在什么状态得回 GUI。v0.11.0 加一层命令，让群主 /
管理员直接在群里操作。

触发场景（2026-10-19 真机）：在群里发 `/new`，被当成普通消息转给了 agent，agent 回
「我这里没有新建会话的能力」——命令在 relay 层就该被截住。

## 2. 命令清单

| 命令 | 别名 | 作用 | 说明 |
|---|---|---|---|
| `/new [标题]` | `/newchat`、`/reset` | 新建 DSH 会话并重绑本群 | 旧会话留在 GUI，不删除；给了「标题」就用它（≤60 字），否则用 `sessionTitle` 模板 + 本地时间后缀（如 `QQ群：示例群（14:25）`） |
| `/stop` | `/cancel` | 中断当前正在跑的轮次 | 没有进行中的轮次时只回一句提示；中断由 `sessionController.cancel({ sessionId })` 完成，已产生的部分文本仍按原逻辑回发 |
| `/status` | `/info` | 查看会话 / 闸门 / 队列状态 | 只读，不改变任何状态 |
| `/help` | `/?`、`/菜单` | 显示帮助 | 文案见 `formatCommandHelp()` |

## 3. 解析规则

支持两种写法，都按「首个 token」识别，大小写不敏感：

1. **前缀式**：`<命令前缀> <命令>`，前缀取 `commandPrefixes`（默认 `/dsh`），例如 `/dsh new`。
   最长前缀优先；前缀与命令之间**必须有空白**（`/dshnew` 不算）。
2. **裸写式**：`/new`，等价于 `<默认前缀> new`；`commands.bare: false` 时关闭。

只认上表里的命令名（含别名）。以下一律**不算命令**、保持原行为：

- 不认识的命令名：`/dsh 帮我看看这段代码` → 仍按「命令前缀直通」转给 DSH；
- 前缀后面没有命令：`/dsh` 单独一条；
- 不是命令开头的文本：`你好 /new`、`/hello`。

判定顺序（`relay.proceedInbound`）：**审批拦截器 → 命令层 → 直通（@ / 引用 / 命令前缀）→ 闸门**。
命令被截住后既不会变成 prompt，也不会进闸门。

## 4. 权限

- 默认只允许群主（`owner`）与管理员（`admin`），由 `commands.roles` 控制，语义与
  [approval.md](./approval.md) 的角色校验一致。
- 非授权成员发命令：**静默忽略**（不回复、不派发、不进闸门），只记一条 relay 日志，避免刷屏。
- 命令只能从群聊进来（`group-message`）；私聊支持随 P3 私聊一起做。

## 5. 与既有链路的关系

- **命令回复走独立发送路径**（`sendSystemReply`）：切分发送但**不调 `markSpoken`**。
  否则一条 `/status` 会刷新闸门的「bot 刚说过话」窗口与 2 小时冷却，让 bot 白白沉默两小时。
- 用户发的命令仍按普通消息写进聊天日志（它确实是群里的对话）；**命令的回复不写聊天日志**，
  避免把 `/status` 的大段输出喂给 jev 做上下文。
- 命令消息如果带图，媒体照常先落盘再执行命令（实现上复用同一条入向链路）。
- `/new` 复用首次建会话的同一段逻辑（`createSessionForGroup`）：项目目录、workspace attach、
  重命名、写映射都一致；差别只是**覆盖**旧映射而不是沿用。
- `/new` 在「本群还有一轮在跑」时拒绝并提示先 `/stop`，避免同一群两个 turn 抢 inbox。
- 连接不可用时命令回复进发送队列，重连后补发（与普通回复一致）。

## 6. 实现位置

| 位置 | 职责 |
|---|---|
| `lib/model/commands.js` | 纯逻辑：`parseCommand` / `canRunCommand` / `formatCommandHelp` / `formatNewSessionTitle` / `formatStatusReply` / `formatDuration` / `formatAgo` |
| `lib/controller/relay.js` | `proceedInbound` 里接命令；`handleCommand` 分发；`runNewCommand` / `runStopCommand` / `runStatusCommand`；`createSessionForGroup` 复用建会话逻辑；`sendSystemReply` 独立发送 |
| `lib/controller/gate.js` | `snapshot()`：给 `/status` 提供待评估条数 / 批数 |
| `lib/model/config.js` | `commands` 配置段默认值与校验 |

## 7. `/status` 输出示例

~~~text
【QQ relay 状态】
群：10002（示例群）
会话：QQ群：示例群（session-…）
项目：/path/to/qq-relay-ws
闸门：开 · 阈值 0.70 · 去抖 5s · 最小间隔 10s
待评估：2 条 / 1 批
最近发言：14:25:31（3 分钟前）
运行中：否 · 等待派发：0 条 · 待发送：0 条
~~~

- 会话未创建时显示「会话：未创建（收到消息后自动建）」；
- 闸门关闭时显示「闸门：关（普通消息不接话，@ / 引用 / 命令仍直通）」；
- 没发过言时显示「最近发言：还没发过言」。

## 8. 配置

```yaml
- id: dsh-qq-relay
  config:
    commandPrefixes: ['/dsh']
    commands:
      enabled: true          # 关闭后 /new /stop /status /help 不再截获（恢复成普通消息）
      bare: true             # 是否接受裸写的 /new；false 时只认 <前缀> new
      roles: ['owner', 'admin']  # 允许执行命令的群角色
```

- 目前是 **patch 只读**配置，设置页没有入口；改完需重启 profile 的 GUI。
- `enabled: false` 只关命令层，不影响 @ / 引用 / 命令前缀直通与闸门。

## 9. 边界与后续

- 不做 `/model`、`/permission` 这类会话内设置命令（要动 DSH 的会话级配置，先评估）。
- 同一分钟内多次 `/new` 且没给标题 → 标题重复；用 `/new 自定义标题` 区分。
- `/new` 不删除旧会话、不迁移上下文；聊天记录（`.qq-relay/chat/`）仍在项目里，新会话照样能读到。
- 后续可加：私聊命令、`/status` 带最近决策、`/new` 附带模型选择、命令审计日志、
  设置页「命令层」开关。
