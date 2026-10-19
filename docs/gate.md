# 消息闸门（群聊）

> 状态：**定案（2026-10-18，用户确认）；P2.1 骨架已落地（2026-10-19）**——调度 / 去抖 /
> 最小间隔 / 慢路定时 / 状态持久化 / 发送队列已实现并有单测；**jev 分类器未接**（用户决定
> 先不接模型），缺省实现 fail closed，详见 §11。目标：决定群里什么时候该由 bot 接话，
> 控制刷屏与模型成本。协议端事实见 [onebot-channel.md](./onebot-channel.md)，
> 整体架构见 [architecture.md](./architecture.md)。

## 1. 边界

- 闸门只回答「要不要接话」，**不生成回复内容**；内容交给 DSH agent。
- 只处理群聊普通消息；**@机器人 / 引用回复机器人 / 显式命令直通**，不参与判断。
- 判断由专用分类器模型 **jev** 完成，不是通用对话模型。

## 2. 三条路径

### 2.1 直通（mention bypass）

- 命中：消息段含 at self_id、引用回复机器人消息、显式命令前缀。
- 处理：立即交给 DSH，**不调用 jev**、不受 10 分钟窗口与 2 小时冷却限制。
- 仍会落盘，并刷新 lastBotSpeakAt / 重置 2h 定时器。

### 2.2 快路（bot 最近说过话）

- 条件：now - lastBotSpeakAt < 10 分钟（机器人最近 10 分钟内发过言）。
- 新消息进入 **5 秒去抖窗口**，同批消息合并后调用一次 jev。
- jev 判定需要接话 → 交给 DSH；判定不需要 → 丢弃本批（仍保留聊天日志）。

### 2.3 慢路（2 小时定时批量）

- 条件：机器人 10 分钟内没说过话。
- 消息不立即判断，累积到 pending。
- **2 小时定时器**到点：取最近 2 小时的消息交给 jev，判定是否需要主动接话。
- 需要 → 交给 DSH，发言成功后重置定时器；不需要 → 清空本批评估游标，等下一次。

### 2.4 发言之后

任一路发言成功：

- lastBotSpeakAt = 发言时间；
- cooldownUntil = 发言时间 + 2h（慢路定时器重置）；
- 清空 pending；
- 若距上次发言不足 **minReplyInterval（默认 45 秒）**，本次不发言，消息并入下一批。

### 2.5 回复通道

- 真实 QQ 号（OneBot）**没有平台被动回复窗口**：DSH 跑多久都行，turn 结束直接
  send_group_msg 发送。
- 仍受 QQ 自身风控与频率限制；发送失败按 retcode 分类退避重试，不吞错。
- WebSocket 断线时发送进入队列，重连后按序发送；超过保留时限的旧回复丢弃并记日志。

## 3. 流程

~~~text
收到群消息
├─ 落盘（JSONL）
├─ 去重（message_id） / 忽略 message_sent / 忽略机器人自己
├─ 直通（@ / 引用回复 / 命令）────────────────→ dispatch
└─ 普通消息
   ├─ now - lastBotSpeakAt < 10m
   │    ├─ 是 → debounce 5s → jev(本批)
   │    │        ├─ 不需要 → 丢弃
   │    │        └─ 需要   → dispatch
   │    └─ 否 → 追加 pending
   └─ 每 2h → jev(pending 中最近 2h)
            ├─ 不需要 → 丢弃游标
            └─ 需要   → dispatch

dispatch 成功 → lastBotSpeakAt = now；cooldownUntil = now + 2h；清空 pending
~~~

## 4. jev 契约（已实现，P2.3）

- **模型**：TypeSafe 的 System One 决策模型 **jev**，经 OpenRouter Decisions API 调用
  （`POST https://openrouter.ai/api/alpha/decisions`），默认 `typesafe/jev-1.14`。
  jev 不是对话模型：它返回带概率的类型化答案（Noul = 是 / 否问题），不返回文本或推理。
- **输入（`state`）**：群名、触发来源（`fast` / `slow`）、bot 标签、聊天日志里最近 60 条消息
  `{ speaker, role, text }`（每条正文截到 500 字符；**包含 bot 自己的发言**，`role: "bot"`，
  由 relay 在发送成功后写回聊天日志）；`questions.reply` 是一个 Noul 问题：
  「现在要不要在这个群里发一条消息」，`criteria.true / false` 说明边界（有人对它说话 /
  需要接话 vs 普通闲聊 / 回复会打扰）。
- **输出**：响应 `answers.reply.noul` 是「是」的概率（0..1）；按 `gate.jevThreshold`
  （默认 0.7）判定是否接话，决策形状 `{ reply, confidence: 概率, reason, targetMsgIds: [] }`。
- **失败策略**：网络错误 / 超时（默认 8s）/ HTTP 非 2xx / 响应缺 `answers.reply.noul`
  或概率越界 → 一律 reply=false（fail closed），原因记 `jev-unavailable` /
  `jev-http-error` / `jev-invalid-response`，只写日志。
- **凭证**：API key 从环境变量读取（默认 `OPENROUTER_API_KEY`，见 `gate.jevApiKeyEnv`）；
  key 为空时不构造分类器，闸门按 fail closed 运行（只接 @ / 引用 / 命令）。
- **决策日志**：时间、批次、输入摘要、输出、耗时；用于调阈值和回放。

## 5. 状态与持久化

每个 group_id 一份状态：

~~~json
{
  "groupId": 123456,
  "lastBotSpeakAt": 1780000000000,
  "cooldownUntil": 1780007200000,
  "pending": [
    {"messageId": 987, "userId": 111, "username": "张三", "at": 1780000000000, "text": "..."}
  ],
  "evaluating": false,
  "dshBusy": false,
  "seenMessageIds": ["..."],
  "lastReplyAt": 1780000000000
}
~~~

- 路径：**~/.dsh/storages/dsh-qq-relay/state/(group_id).json**，写入用临时文件 + rename（原子）。
- 聊天日志：**~/.dsh/storages/dsh-qq-relay/chat/(group_id)/YYYY-MM-DD.jsonl**，
  只追加；默认保留 7 天；给 jev 与 DSH prompt 提供上下文。
- 单实例锁：**~/.dsh/storages/dsh-qq-relay/lock**，第二个实例拒绝启动。

## 6. 幂等与并发

1. **重复事件**：按 message_id 去重（保留 1 小时）；
2. **批内合并**：去抖窗口内的多条消息只调一次 jev、只起一个 DSH turn；
3. **DSH 忙**：dshBusy 为真时新消息进 pending，串行处理，不并发起第二个 turn；
4. **重启恢复**：启动时读 state，恢复 lastBotSpeakAt / cooldownUntil；不立即发言；
5. **发送失败**：只有 send_group_msg 返回成功才更新 lastBotSpeakAt、重置 2h 定时器；
6. **断线重连**：OneBot 正向 WS 无事件回放，断线期间消息可能丢；靠 message_id 去重与
   本地状态兜底，重连后不重放已处理批次；
7. **多实例**：文件锁保证同一 bot 只有一个进程连接。

## 7. 出向

- turn 结束即发送，无平台回复窗口限制。
- 长回复按 QQ 实际限制切分为多条（上限待实测）；保留发送顺序。
- 发送失败：按 retcode 分类（频率 / 权限 / 格式）退避重试；多次失败记日志并降级。
- WebSocket 不在线：回复进队列，重连后发送；超过保留时限丢弃。
- 回复文本以纯文本为主；Markdown 仅在确认渲染效果后启用。

## 8. 配置（草案）

~~~yaml
gate:
  enabled: true
  mentionBypass: true        # @ / 引用回复 / 命令直通
  fastWindow: 10m            # bot 最近发言窗口
  fastMinReplyInterval: 45s  # 两次发言的最小间隔
  debounce: 5s               # 快路批合并窗口
  slowTimer: 2h              # 慢路定时器
  slowWindow: 2h             # jev 查看的消息范围
  model: typesafe/jev-1.14   # jev 模型 id
  jevEndpoint: https://openrouter.ai/api/alpha/decisions
  jevApiKeyEnv: OPENROUTER_API_KEY   # 从环境变量取 key
  jevThreshold: 0.7          # Noul 概率 >= 该值才接话
  classifierTimeoutMs: 8s    # 单次 jev 请求超时
  retentionDays: 7
  maxBatchMessages: 100
~~~

## 9. 测试要点

- 冷启动与重启后的冷却恢复（不立即发言）。
- 同一 message_id 重复事件只处理一次。
- 快路连续三条消息只产生一次 jev 调用与一次回复。
- 慢路 2h 到点、无消息时 no-op；有消息时只评估最近 2h。
- @ 直通在冷却期内仍然工作。
- DSH 单轮超过 5 分钟仍能正常回复（真实 QQ 号无窗口）。
- 发送失败 / retcode 频率限制下的退避与降级。
- WS 断线重连后不重复回复、不丢队列。
- 机器人自己发出的 message_sent 被忽略。
- @ 消息与普通消息的区分。

## 10. 待定

- ~~jev 的部署形态与模型选择~~ 已定：OpenRouter Decisions API + `typesafe/jev-1.14`（P2.3）。
- 慢路评估游标：按「最近 2 小时」还是「距上次评估以来」。
- 是否对 @ 直通增加「处理中」即时回执（默认关闭）。
- 队列保留时限与丢弃策略。

## 11. 实现备注（P2.1，2026-10-19）

- **代码位置**：纯逻辑 `lib/model/gate.js`（配置解析 / 决策 fail closed / 批次 / 时间窗）；
  调度 `lib/controller/gate.js`（去抖、最小间隔、慢路定时、分类器调用、决策日志）；
  接入 `lib/controller/relay.js`（直通判定、批次派发、发送队列、dshBusy 标记）；
  状态 `lib/model/state.js`；决策日志 `lib/model/gate-log.js`。
- **配置键**（`config.gate`，见 architecture §2.1）：`enabled`（默认 false）、`mentionBypass`、
  `fastWindow`（10m）、`fastMinReplyInterval`（45s）、`debounce`（5s）、`slowTimer`（2h）、
  `slowWindow`（2h）、`maxBatchMessages`（100）、`classifierTimeoutMs`（8s）、`model`、
  `jevEndpoint`、`jevApiKeyEnv`、`jevThreshold`。
  时长字段接受 `500ms` / `45s` / `10m` / `2h` 或毫秒数字，内部统一为毫秒；未知键 / 非法值直接
  进 `problems`（配置整体 fail closed）。
- **分类器接口**：`createRelay({ classifier })` 注入
  `{ classify({ groupId, groupName, trigger, messages }) } → { reply, confidence, reason, targetMsgIds }`，
  `trigger` 为 `fast` / `slow`。缺省 `createNullClassifier()` 永远返回
  `reply: false, reason: 'classifier-not-configured'`；超时或抛错按 `reply: false` 处理，且每次都写
  一条决策日志（批次条数 / reply / confidence / reason / 耗时）。
- **jev 实现（P2.3）**：`lib/model/jev.js` 提供 `createJevClassifier`（OpenRouter Decisions API，
  全局 `fetch`，零依赖）；组合根在 `gate.enabled === true` 且 `process.env[jevApiKeyEnv]` 非空时
  构造，缺 key 只打警告并退化为 fail closed。请求 / 解析 / 阈值 / 超时的单测在 `test/jev.test.js`。
- **状态与恢复**：每群一个 `state/<group_id>.json`；pending 随消息增量落盘，重启后重新装载；
  但**不重建慢路定时器**——重启后第一条消息才会重新起 2 小时计时（避免一启动就说话）。
- **慢路时间窗（P2.2）**：慢路评估只取 `time >= now - slowWindow` 的 pending，更早的丢弃
  （仍保留在聊天日志里）；窗口内无消息则 no-op。
- **DSH 忙（P2.2）**：relay 派发批次时置 `dshBusy=true`，本轮 turn/end 后置 false；闸门评估发现
  本群 `dshBusy` 就延后（pending 保留），避免同一群并发起两个 turn。
- **决策日志（P2.2）**：每次决策落一条 `gate/YYYY-MM-DD.jsonl`（time / groupId / trigger /
  batch / reply / confidence / reason / costMs / messageIds），**不存正文**；保留 7 天，由组合根
  启动时和每天清理一次（聊天日志同款保留期一起清）。
- **上下文与派发分离（v0.7.1）**：分类器看的是聊天日志最近 60 条（含 bot 发言），派发 DSH 的
  prompt 只包含 pending 本批消息；这样 jev 能判断「刚被 @ 过 / 刚回过一句」这类语境，
  又不会把旧消息重复喂给 agent。
- **发送队列**：`relay` 内存队列（不落盘，进程重启即丢），断线 / 发送失败入队，`client open`
  时按序补发；超过 30 分钟丢弃并记日志，上限 50 条。失败分类：文本命中频率 / 风控关键词 → 退避重试，
  其余 → 不重试（避免刷错误日志）。
- **成员昵称**：直接用 OneBot 事件自带的 `sender.card || sender.nickname` 与 `sender.role`，
  不额外调 `get_group_member_info`（事件缺字段时才需要补查，暂未实现）。
- **尚未实现**：真正的「群成员信息补查」、多群资源配额；jev 阈值调优（先用 0.7，按决策日志再调）。
- **单测**：`test/gate.test.js`（假时钟：合并 / 最小间隔 / 慢路 / fail closed / 重启恢复）、
  `test/model.test.js`（配置 / 决策 / 批次 / 发送失败分类 / jev 配置）、
  `test/jev.test.js`（请求构造 / 响应解析 / 阈值 / 各类失败 fail closed）、
  `test/relay.test.js`（直通不受闸门影响、断线队列补发）。
