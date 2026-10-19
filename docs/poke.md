# 戳一戳（poke）识别与回戳

> 状态：**已实现（v0.15.0，2026-10-19）**。host 半身改动，需重启 profile GUI 生效；
> 协议端事实见 [onebot-channel.md](./onebot-channel.md) §5 / §6，工具注册见
> [tools.md](./tools.md)，整体架构见 [architecture.md](./architecture.md)。

## 1. 用途与边界

QQ 群里的「戳一戳」是一种轻量提醒（双击头像 / 群内戳一戳）。插件识别 NapCat 上报的
`notice.notify.poke` 事件，把「谁戳了谁」变成可用上下文：

- **别人戳 bot**：按直通优先级起一轮 DSH，让 agent 决定怎么回应（默认行为，可关）；
- **群友互戳**：只写聊天记录，作为后续回合的上下文，不触发回合；
- **回戳**：注册 `qq_poke` 工具，agent 可以主动戳群里某个成员（可选，不自动回戳）。

**不做**：

- 私聊戳——私聊支持本身还没做，`group_id` 为空的戳直接丢弃；
- 自动「谁戳我我戳回去」——由 agent 判断，避免被戳一下就无限互戳；
- 戳事件本身没有消息 id / 昵称 / 群名，昵称与群名靠 API 补查，查不到就退化。

## 2. 事件契约

OneBot / NapCat 上报（2026-10-19 文档核对）：

~~~json
{
  "post_type": "notice",
  "notice_type": "notify",
  "sub_type": "poke",
  "time": 1792340775,
  "self_id": 10001,
  "group_id": 10002,
  "user_id": 10003,
  "target_id": 10001
}
~~~

- `user_id` = 戳人者，`target_id` = 被戳者；`target_id === self_id` 即「戳了 bot」；
- 没有 `message_id`，去重键由插件合成：
  `poke:<time>:<user_id>:<target_id>`（写在 state 的 `seen` 里，与普通消息共用上限）；
- 昵称 / 群名片用 `get_group_member_info` 补查，群名用 `get_group_info` 补查，
  成功结果缓存 10 分钟；失败时 prompt 里退化为 QQ 号 / `群 <id>`。

## 3. 处理流程

~~~text
notice.notify.poke
  → codec.toInternalEvent → { kind: 'poke', groupId, userId, targetId, targetsSelf }
  → relay.handlePoke
      1. poke.enabled=false → 丢弃
      2. 非白名单群 / 私聊戳 → 丢弃
      3. user_id === self_id（自己发起的戳）→ 丢弃
      4. 合成去重键，重复事件丢弃
      5. 补查昵称 / 群名（缓存 10 分钟）
      6. 写聊天记录：text = 戳了你一下 / 戳了 <target_id> 一下，raw = "poke"
      7. targetsSelf 且 poke.react !== false 且不在冷却中
           → 走直通（reason = poke），起一轮 prompt
           → 刷新每群冷却 poke.cooldownMs
~~~

### 3.1 prompt 形态

与 @ / 引用 / 命令共用直通拼接（`formatIncomingPrompt`）：

~~~text
[QQ群：示例群（10002）] 2026-10-19 16:20 新消息 1 条（直通：戳一戳）
[16:20:03] [tester] 戳了你一下
[历史记录：.qq-relay/chat/10002/（JSONL，按天分文件）]
~~~

- 戳一戳**不经过消息闸门**：不调用 jev 分类器、不写待评估队列、不刷新闸门的发言窗口；
- 与 @ / 引用 / 命令共用 400ms 连发合并窗口（`reply.mergeWindowMs`）；同一窗口里既有
  戳又有 @ 时，批次头部取 @ / 引用 / 命令（优先于「戳一戳」）；
- 事件没有 message_id，回复不引用原消息（`replyTo` 为空，走普通发送）。

## 4. 配置（`poke`，patch 只读）

| 键 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `enabled` | boolean | `true` | 总开关；关掉后戳一戳既不记录也不接话 |
| `react` | boolean | `true` | 被戳（`target_id = self_id`）时是否起一轮；关掉后只记录 |
| `cooldownMs` | duration | `10s` | 每群接话冷却；`0` = 不限制；上限 10 分钟；冷却内的戳只记录 |

示例（profile `cordis.patch.yml` 的 `config:` 块里）：

~~~yaml
poke:
  enabled: true
  react: true
  cooldownMs: 10s
~~~

- 与 `commands` / `reply` / `approval` 一样**不进设置页**（patch 只读）；改完需重启 profile GUI。
- 冷却按群独立；同一群 10 秒内多人连戳只回一次，但每次都会写进聊天记录。

## 5. 回戳工具 `qq_poke`

| 字段 | 内容 |
|---|---|
| `name` | `qq_poke` |
| `parameters` | `userId`（integer，必填：被戳者 QQ 号）、`groupId`（integer，可选：唯一白名单群时可省略） |
| `output.schema` | `{ groupId, userId }` |
| 调用方式 | `await tools.qq_poke({ userId: 10003 })` |

- 与 `qq_send` 一起在组合根 `ctx.inject(['tools'])` 子 fiber 注册（`lib/index.js` ③）；
  宿主没有 tools 服务时静默跳过。
- 工具层与 relay 层**双重校验白名单**；`userId` 必须是正整数；
- 离线时直接报错（不排队）；NapCat 明确拒绝时把 `retcode / message` 带回给模型；
- 依赖 NapCat 扩展 action `group_poke`（OneBot 11 标准之外；`send_poke` 亦可用）；
- 不自动回戳、不写入 bot 发言状态（戳不算「发言」，不刷新闸门窗口）。

## 6. 与其他机制的关系

| 机制 | 关系 |
|---|---|
| 命令层（`/new` 等） | 只处理文本消息；戳不会触发命令 |
| 审批桥 | 拦截器只消费 `group-message`；戳不参与审批 |
| 消息闸门 | 戳不 ingest，不占 pending / 不触发分类器；被戳走直通 |
| 聊天记录清理 | 戳记录与普通消息同一天文件，按同一保留策略清理 |
| client 面板「最近消息」 | 戳记录显示为「戳了你一下 / 戳了 xxx 一下」 |

## 7. 验证

- 单测（`pnpm test`，230 个）：
  - `test/onebot.test.js`：poke 事件规范化 / `targetsSelf` / 通用 notice 不受影响；
  - `test/model.test.js`：`poke` 默认值与非法配置；
  - `test/relay.test.js`：被戳接话与 prompt 形态、互戳只记录、`enabled/react` 开关、
    冷却、自我戳 / 非白名单 / 重复、昵称兜底、出向戳与离线 / 失败；
  - `test/tools.test.js`：`qq_poke` 定义、群解析、参数校验、失败透传；
  - `test/apply.test.js`：组合根注册两个工具、离线行为。
- 2026-10-19 协议端实测（v0.15.0 开发时）：`group_poke` 返回 `status: ok / retcode: 0`；
  戳一戳事件字段与 §2 一致（另有 `raw_info` 数组，解析忽略）；bot 自己发起的戳
  `user_id === self_id`，会被插件忽略（避免自问自答 / 记成群友戳 bot）。
- 真机（重启 dwdev GUI 后）：
  1. 在群里戳 bot：群里应收到 agent 的回复，会话/prompt 里有「（直通：戳一戳）」；
  2. 戳另一个群友：不应回复；设置页该群「最近消息」里能看到戳记录；
  3. 10 秒内连戳 bot 两次：只回一次（两次都记录）；
  4. 让 agent 调 `await tools.qq_poke({ userId: <群友> })`：对方收到戳；
  5. 断开 NapCat（或停容器）调 `qq_poke`：应报「当前离线」而不是静默失败。
- 控制台关键日志：`[relay] 戳一戳接话：群 ...`、`[relay] 戳一戳冷却中，只记录不接话`。

## 8. 已知限制

- `notice.notify.poke` 与 `group_poke` 是 NapCat 的实现；换协议端（LLBot / 官方通道）需重验。
- 戳事件不带昵称，首次戳会多一次 `get_group_member_info` 往返；缓存 10 分钟。
- 去重键用时间 + 双方 QQ 号：同一秒内完全相同的重复上报会被当成重复事件（可接受）。
- 私聊戳暂不支持（等私聊会话映射定案）。
- QQ 对戳一戳有频率限制，不做高频自动回戳。
