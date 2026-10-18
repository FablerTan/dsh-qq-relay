# 消息闸门（群聊）

> 状态：**定案（2026-10-18，用户确认）**。目标：决定群里什么时候该由 bot 接话，
> 控制刷屏与模型成本。平台限制见 [official-bot-channel.md](./official-bot-channel.md)，
> 整体架构见 [architecture.md](./architecture.md)。

## 1. 边界

- 闸门只回答「要不要接话」，**不生成回复内容**；内容交给 DSH agent。
- 只处理群聊普通消息；**@机器人 / 回复机器人 / 显式命令直通**，不参与判断。
- 判断由专用分类器模型 **jev** 完成，不是通用对话模型。

## 2. 三条路径

### 2.1 直通（mention bypass）

- 命中：群消息 @ 机器人、引用回复机器人消息、显式命令前缀。
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

### 2.5 被动窗口

- 被动回复窗口过期（群聊 5 分钟）→ **不回**（配置 onPassiveExpired: drop）。
- 慢路发言天然在窗口之外，走**主动消息**；受配额与用户开关限制（见第 7 节）。

## 3. 流程

~~~text
收到群消息
├─ 落盘（JSONL）
├─ 去重（msg_id） / 忽略 author.bot / 忽略机器人自己
├─ 直通（@ / 回复 / 命令）────────────────────→ dispatch
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

## 4. jev 契约

- **模型**：专用分类器，名字 jev；部署形态待定（DSH ctx.llm 内的便宜模型，或外部 endpoint）。
- **输入**：最近一批消息（含机器人自己的发言）、触发来源（fast / slow / mention）、群标识；
  按条数与字符数截断（默认最多 100 条）。
- **输出**：

~~~json
{"reply": true, "confidence": 0.82, "reason": "用户在问 bot 刚才说的命令", "targetMsgIds": ["..."]}
~~~

- **失败策略**：超时 / 报错 / 输出不合规 → 一律 reply=false（fail closed），只记日志。
- **决策日志**：时间、批次、输入摘要、输出、耗时；用于调阈值和回放。

## 5. 状态与持久化

每个 group_openid 一份状态：

~~~json
{
  "groupOpenid": "A1B2...",
  "lastBotSpeakAt": 1780000000000,
  "cooldownUntil": 1780007200000,
  "pending": [
    {"msgId": "...", "memberOpenid": "...", "username": "张三", "at": 1780000000000, "text": "..."}
  ],
  "evaluating": false,
  "dshBusy": false,
  "seenMsgIds": ["..."],
  "lastReplyAt": 1780000000000
}
~~~

- 路径：**~/.dsh/storages/dsh-qq-relay/state/(group_openid).json**，写入用临时文件 + rename（原子）。
- 聊天日志：**~/.dsh/storages/dsh-qq-relay/chat/(group_openid)/YYYY-MM-DD.jsonl**，
  只追加；默认保留 7 天；给 jev 与 DSH prompt 提供上下文。
- 单实例锁：**~/.dsh/storages/dsh-qq-relay/lock**，第二个实例拒绝启动。

## 6. 幂等与并发

1. **重复推送**：平台可能重复推同一 msg_id；处理前查 seenMsgIds（保留 1 小时），重复直接丢。
2. **批内合并**：去抖窗口内的多条消息只调一次 jev、只起一个 DSH turn。
3. **DSH 忙**：dshBusy 为真时新消息进 pending，串行处理，不并发起第二个 turn。
4. **重启恢复**：启动时读 state，恢复 lastBotSpeakAt / cooldownUntil；不立即发言。
5. **发送失败**：只有发送成功才更新 lastBotSpeakAt、重置 2h 定时器。
6. **网关重连**：Resume 补发事件同样走 msg_id 去重。
7. **多实例**：文件锁保证同一 bot 只有一个进程连接（避免重复事件与互踢）。

## 7. 出向与额度

- 被动回复：在窗口内、带 msg_id、递增 msg_seq；群聊 5 分钟 / 最多 5 次。
- 主动消息：慢路发言；受单群 20 qpm、1000 条/天、机器人侧 60 qpm 限制。
- 主动消息被关闭（GROUP_MSG_REJECT）或 429 → 记录并**降级**：只保留 @ 直通与被动回复。
- 长回复按平台长度上限切分（上限待实测）；Markdown 在不支持时降级为纯文本。
- 发送前检查 WS 在线；不在线则排队等待重连，超时丢弃。

## 8. 配置（草案）

~~~yaml
gate:
  enabled: true
  mentionBypass: true        # @ / 回复 / 命令直通
  fastWindow: 10m            # bot 最近发言窗口
  fastMinReplyInterval: 45s  # 两次发言的最小间隔
  debounce: 5s               # 快路批合并窗口
  slowTimer: 2h              # 慢路定时器
  slowWindow: 2h             # jev 查看的消息范围
  model: jev                 # 分类器模型
  jevEndpoint: ""            # 空 = 使用 DSH ctx.llm
  onPassiveExpired: drop     # 被动窗口过期不回
  ackWhileRunning: false     # 是否先回「处理中」（默认关闭）
  retentionDays: 7
  maxBatchMessages: 100
~~~

## 9. 测试要点

- 冷启动与重启后的冷却恢复（不立即发言）。
- 同一 msg_id 重复推送只处理一次。
- 快路连续三条消息只产生一次 jev 调用与一次回复。
- 慢路 2h 到点、无消息时 no-op；有消息时只评估最近 2h。
- @ 直通在冷却期内仍然工作。
- 主动消息被关闭 / 429 时的降级。
- 网关断线重连后 Resume 补发事件不重复回复。
- 全量模式下 @ 消息与普通消息的区分。
- 被动窗口过期不回复。

## 10. 待定

- jev 的部署形态与模型选择（本地 / 远程 / ctx.llm）。
- 群管理员关闭主动消息时是否通知用户。
- 慢路评估游标：按「最近 2 小时」还是「距上次评估以来」。
- 是否对 @ 直通增加「处理中」即时回执（默认关闭）。
