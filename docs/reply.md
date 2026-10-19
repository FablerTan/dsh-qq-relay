# 出向回复体验（v0.11.1）

> 状态：v0.11.1 已实现（2026-10-19），待真机验收。实现在 `lib/controller/relay.js`
> （引用 / 占位 / 合并）与 `lib/controller/onebot/api.js`（`send_group_msg` 带 reply 段）。

## 1. 要解决的问题

- **看不出在回哪条**：群里几条对话交叉时，纯文本回复容易对不上号。
- **长任务期间全程静默**：turn 要跑几十秒时，群里分不清「收到了在跑」和「消息丢了」。
- **连发被拆碎**：连续 @ 机器人几条，每条都单独起一个 turn，回复碎片化、也浪费模型调用。

## 2. 三个能力

### 2.1 引用回复（quote）

- 每轮结果的**第一条**文本引用触发消息：直通取触发的那条 / 合并批次取最后一条；闸门批次取批次里
  最后一条消息。
- OneBot 侧用 `send_group_msg` 的 `message: [{type:'reply',data:{id}}, {type:'text',...}]`。
- 只有第一条 chunk 带引用，后续长文本分片普通发送，不刷屏。
- 引用发送被拒（原消息撤回、retcode 非 0 等）→ **自动退回普通发送一次**，回复不丢。
- `qq_send` 主动推送没有触发消息，不带引用。

### 2.2 处理中占位（ack）

- turn 提交后 `ackDelayMs`（默认 8s）内没结束 → 先发一条 `收到，处理中…`（`ACK_TEXT`）。
- 占位**不算接话**：不刷新闸门发言窗口 / 2 小时冷却、不写聊天日志（不污染 jev 上下文）、不触发
  `markSpoken`。
- turn 很快结束则不产生占位；已发占位但本轮没有可发送文本时，补一句「处理完了，但这一轮没有可发送的文本」。
- `ackDelayMs: 0` 关闭占位。

### 2.3 直通连发合并（merge）

- @ / 引用 / 命令前缀触发的消息先进入 per-group buffer，等 `mergeWindowMs`（默认 400ms），
  窗口内同群的后续消息合并成**一个 prompt、一个 turn**。
- 与闸门去抖（默认 5s）不同：直通窗口很短，保持「@ 就回」的即时感。
- 合并批次的直通原因取优先级 `mention > reply > command`，引用批次最后一条消息。
- `mergeWindowMs: 0` 关闭：每条直通消息各自成轮（v0.11.0 行为）。
- 命令层在 buffer **之前**：`/new` 等命令不参与合并。

## 3. 配置

```yaml
- id: dsh-qq-relay
  config:
    reply:
      quote: true          # 是否引用触发消息
      ackDelayMs: 8s       # 处理中占位的等待阈值；0 = 关闭
      mergeWindowMs: 400ms # 直通连发合并窗口；0 = 不合并
```

- patch 只读配置，配置页暂无入口；改完需重启 profile 的 GUI。
- 时长支持 `500ms` / `3s` / `10m` 或毫秒数字。

## 4. 与既有链路的关系

- 入向顺序：命令层 → **直通 buffer（合并）** → 闸门；已合并的批次只起一个 turn。
- 同群串行：一轮在跑时后续轮进队列（既有机制，每群最多 5 条待派发），合并只发生在入向。
- 断线时的发送队列存纯文本，重连后补发**不带引用**（可接受；引用是体验增强，不是正确性）。
- `markSpoken` 只对真实结果调用：占位与命令回复都不刷新闸门窗口。
- 占位与命令回复走同一个 `sendSystemReply` 发送路径（切分发送、不写聊天日志）。

## 5. 实现位置

| 位置 | 职责 |
|---|---|
| `lib/controller/onebot/api.js` | `sendGroupReply(groupId, messageId, text)`：reply 段 + 文本 |
| `lib/controller/relay.js` | `sendChunkOnce` / `sendChunk`（引用失败回退）、`sendReply`（首条引用）、`armAck` / `clearAckTimer` / `finishPending`（占位与收尾）、`scheduleBypass` / `flushBypass`（连发合并） |
| `lib/model/reply.js` | `ACK_TEXT` 占位文案 |
| `lib/model/config.js` | `reply` 段默认值与校验 |

## 6. 边界与后续

- 引用只用于群聊（私聊支持随 P3 私聊一起做）。
- 占位文案固定中文；暂不做 i18n。
- 合并窗口只对直通生效；闸门批次仍按去抖 / 慢路评估。
- 后续可加：占位带已运行时长、按群覆盖回复策略、流式分片发送、引用发送失败的原因日志。
