# QQ 侧审批（approval 桥）

> 状态：**已实现（2026-10-19，P3）**。host 半身注册，属于 profile 装配面——
> 装上后需重启该 profile 的 GUI 才生效。审批 seam 语义见 DSH
> `@deepseek-ai/dsh-user-approval` 文档；本文只写本插件的桥接行为。

## 1. 用途与边界

- DSH 里需要「人 confirm 一下」的操作（沙箱升权、敏感工具调用）在 QQ 触发的会话里
  把请求发到对应群，由群主 / 管理员回复文本命令决定，**不用切回 GUI**。
- 只接管**映射到 QQ 群**的会话（`mapping.json` 里有 sessionId → groupId）；其它会话的审批
  继续交给 GUI 的应答者，行为不变。
- 只做一次性授权（`allowed-once` / `rejected`）；不做「一直允许」、不记忆规则。

## 2. 流程

~~~text
DSH 工具 → approval.request(...)（会话 = 某个 QQ 群映射的会话）
  → 审批桥反查 groupId（找不到 → next()，交 GUI）
  → 发群消息【审批请求】（工具名 / 原因 / 超时秒数）
  → 等待群消息：
       群主 / 管理员回复「同意 / 拒绝」→ allowed-once / rejected（并回执）
       其它成员回复 → 忽略并提示「只有群主 / 管理员可以审批」
       超时（默认 120s）→ rejected（回执「审批超时」）
       relay 离线 / 发送失败 → unavailable（fail closed）
       请求方取消（signal abort）→ cancelled
~~~

审批等待期间，该群普通消息照常走聊天日志 / 闸门；只有「同意 / 拒绝」命令被拦截消费。
同群已有待审批请求时，新请求交给 GUI（避免两处提示互相覆盖）。

## 3. 配置（`config.approval`）

| 键 | 默认 | 说明 |
|---|---|---|
| `enabled` | `true` | 关掉后所有审批请求都交 GUI |
| `timeoutMs` | `120s` | 等待回复的时间（10s..10m；支持 `90s` / `2m` 或毫秒数字） |
| `roles` | `['owner','admin']` | 允许审批的群角色（`owner` / `admin` / `member`） |

所有键都只读（不放进设置页的可编辑字段），改 profile patch 后重启 GUI 生效。

## 4. 交互示例

~~~text
【审批请求】bash 需要你确认。
原因：需要在工作区外写入 ~/.config/demo
回复「同意」或「拒绝」（120 秒内有效，超时按拒绝处理）。

群主：同意
bot：已同意 ✅
~~~

文本命令匹配规则（`lib/model/approval.js`）：去空白 / 首尾标点、忽略大小写；
同意类：同意 / 允许 / 批准 / 通过 / 可以 / 答应 / ok / yes / allow / approve / y；
拒绝类：拒绝 / 不允许 / 不行 / 驳回 / 不要 / 不准 / no / deny / reject / n。

## 5. 已知代价与限制

- **单应答者链**：本桥用 `prepend` 抢在 GUI 应答者前面；被本桥接管的请求**不会**再弹到 GUI。
  想用 GUI 审批时，先在设置页把 `approval.enabled` 关掉并重启。
- **每群一次一条**：同一群同时只处理一个审批；第二个请求交给 GUI。
- **离线即失败**：relay 不在线时审批直接 `unavailable`（agent 看到拒绝），不会挂起等重连。
- **无持久授权**：每次都要重新确认；QQ 侧没有「记住此决定」。
- **审批人身份**依赖 NapCat 事件里的 `sender.role`；私聊 / 非群聊场景不接管。

## 6. 验证

- 单测：`test/approval.test.js`（映射反查、同意 / 拒绝、角色限制、超时、取消、离线
  fail closed、并发交 GUI、stop 清理）、`test/model.test.js`（命令匹配 / 角色 / 文案 / 配置）、
  `test/relay.test.js`（拦截器优先消费、异常不影响后续）。
- 真机：重启 dwdev 后，在 QQ 群里让 agent 执行一个需要审批的操作（例如写工作区外文件或
  带 `sandbox_permissions` 的命令）→ 群里出现【审批请求】→ 回复「同意」→ 工具继续执行；
  再试「拒绝」、普通成员回复、放着超时三种情况。

## 7. 未决

- 审批消息是否要 @ 具体审批人（现在只发到群里）。
- 是否支持「本次会话内一直允许」（需要 DSH 侧扩展授权存储）。
- 多群并发审批时的排队策略。
