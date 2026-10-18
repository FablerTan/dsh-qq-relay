# 官方 QQ 机器人通道（WebSocket）

> 状态：**定案（2026-10-18）**。本文件是平台接口事实与限制的单一来源；上层架构见
> [architecture.md](./architecture.md)，群聊闸门见 [gate.md](./gate.md)。
> 官方文档：<https://bot.q.qq.com/wiki/develop/api-v2/>

## 1. 选型结论

- 采用 **官方 QQ 机器人开放平台**：WebSocket 收事件 + HTTPS 发消息。
- **不采用** OneBot / 第三方协议端（NapCat、LLBot、Lagrange 等）：需要登录真实 QQ 号、
  违反平台协议、有封号风险，还要常开 QQ 客户端或额外进程。
- **不采用** Webhook 回调：需要公网 HTTPS 地址，家宽环境不合适；WebSocket 是出站连接，
  不需要公网入口。
- 代价：需要注册开放平台机器人并完成认证 / 审核；消息身份只有 openid；主动消息有配额。

## 2. 凭证

| 凭证 | 用途 |
|---|---|
| **AppID** | 机器人 ID |
| **AppSecret** | 换取 access_token 的密钥 |
| **access_token** | 调用 OpenAPI 的凭证，由 AppID + AppSecret 换取 |

获取令牌：

~~~http
POST https://api.bot.qq.com/app/getAppAccessToken
Content-Type: application/json

{"appId": "<APPID>", "clientSecret": "<CLIENTSECRET>"}
~~~

- 返回 access_token 与 expires_in（目前 7200 秒）。
- 过期前 60 秒内再次获取会拿到新 token；建议服务端定时提前刷新。
- 所有 OpenAPI 请求头带 **Authorization: QQBot <access_token>**。
- 失败时 HTTP 可能仍是 200，必须按响应体 code 判断（如 100001 频控、100016 凭证错误）。

## 3. WebSocket 生命周期

1. 调用「获取通用 WSS 接入点」接口，拿到网关地址（形如 wss://api.bot.qq.com/websocket/）。
2. 建立连接后，平台下发 **op 10 Hello**，d.heartbeat_interval 是心跳周期（毫秒）。
3. 发送 **op 2 Identify** 完成鉴权：

~~~json
{"op":2,"d":{"token":"QQBot <access_token>","intents":100663296,"shard":[0,1],"properties":{}}}
~~~

4. 鉴权成功收到 **READY**（t 为 READY，d.session_id 用于 Resume）。
5. 按周期发送 **op 1** 心跳，d 填客户端收到的最新 s；平台回 **op 11 Heartbeat ACK**。
6. 断开后短时间重连可发 **op 6 Resume**（session_id + seq）补发遗漏事件，成功后收 Resumed；
   Resume 失败则重新走 Identify。
7. **op 7** 表示服务端要求重连；**op 9** 表示 Identify / Resume 参数无效。

**发送消息的接口要求机器人 WebSocket 保持在线**，因此网关断线期间回复会失败。

## 4. Intents（本项目用到的位）

| Intent | 位 | 覆盖事件 | 本项目 |
|---|---|---|---|
| GROUP_AND_C2C_EVENT | 1 << 25 = 33554432 | 单聊 / 群 @ / 加群 / 主动消息开关等 | P1 起使用 |
| INTERACTION | 1 << 26 = 67108864 | 按钮互动 INTERACTION_CREATE | P3 审批用 |

两者都开时 intents = 33554432 + 67108864 = 100663296。

GROUP_AND_C2C_EVENT 下的关键事件：

- **C2C_MESSAGE_CREATE**：用户单聊发消息；
- **GROUP_AT_MESSAGE_CREATE**：群里 @ 机器人；
- **GROUP_MESSAGE_CREATE**：**全量模式**下群里的每条消息（需平台开启「接收所有消息」）；
- **GROUP_ADD_ROBOT** / **GROUP_DEL_ROBOT**：机器人被拉入 / 移出群；
- **GROUP_MSG_RECEIVE** / **GROUP_MSG_REJECT**：群管理员开启 / 关闭机器人主动消息。

## 5. 事件信封与群消息字段

所有推送统一为：

~~~json
{"id":"event_id","op":0,"s":42,"t":"GROUP_AT_MESSAGE_CREATE","d":{}}
~~~

群消息 d 的关键字段：

| 字段 | 说明 |
|---|---|
| **id** | 消息 ID，被动回复时作为 msg_id |
| **content** | 消息文本，**已自动去掉 @机器人 前缀** |
| **group_openid** | 群 OpenID |
| **author.member_openid** | 群成员 OpenID（群聊场景） |
| **author.username** | 昵称 |
| **author.bot** | 是否机器人 |
| **timestamp** | RFC3339 时间 |
| **attachments[]** | 图片 / 语音 / 文件等附件（url、content_type、filename 等） |
| **message_scene** / **msg_elements** / **ark_data** | 引用、卡片等扩展内容 |

平台可能**重复推送相同 msg_id**，需要按 msg_id 去重。

## 6. 发送消息

| 场景 | 接口 |
|---|---|
| 群聊 | POST /v2/groups/{group_openid}/messages |
| 单聊 | POST /v2/users/{user_openid}/messages |

请求体关键字段：

| 字段 | 说明 |
|---|---|
| **msg_type** | 0 文本 / 2 Markdown / 7 富媒体 |
| **content** | 文本内容（msg_type=0） |
| **markdown** | Markdown 内容（msg_type=2，填写后 content 必须为空） |
| **keyboard** | 内嵌键盘（按钮），短形式传模板 id，长形式传 rows |
| **msg_id** | 被动回复的消息 ID（5 分钟内有效） |
| **event_id** | 被动回复互动事件（INTERACTION_CREATE 等） |
| **msg_seq** | 同一 msg_id 多次回复的序号，用于去重 |
| **media** | 富媒体（msg_type=7，需先上传得到 file_info） |

限制：

- 群消息**不支持流式**；
- Markdown 在群聊**只能发、不能收**；
- 富媒体需先上传换 file_info，单聊 / 群聊上传接口不互通，file_info 有过期时间；
- 按钮回调（action.type=1）触发 INTERACTION_CREATE，可用 event_id 被动回复，适合做审批。

## 7. 被动消息与主动消息

| 类型 | 条件 | 时效 / 次数 | 配额 |
|---|---|---|---|
| 群聊被动 | 带 msg_id | 5 分钟，同一条最多 5 次 | 不占主动配额 |
| 单聊被动 | 带 msg_id | 60 分钟，同一条最多 4 次 | 不占主动配额 |
| 群聊主动 | 不带 msg_id | — | 机器人侧 60 qpm（个人 / 企业认证；未认证 30 qpm）、单群 20 qpm、每群每天 1000 条 |
| 单聊主动 | 不带 msg_id | — | 每用户每天 1000 条 |

- 用户 / 群管理员可以在机器人资料卡**关闭主动消息**，之后主动发送失败；对应
  GROUP_MSG_REJECT（关闭）/ GROUP_MSG_RECEIVE（开启）事件。
- 本项目策略：被动优先；**被动窗口过期就不回**（onPassiveExpired: drop）；2 小时慢路的
  发言属于主动消息，失败时降级为「只保留 @ 直通 + 被动回复」。

## 8. 身份

- 不同 bot（AppID）拿到的 openid 互不相同。
- 群聊场景：group_openid（群）+ member_openid（群成员）。
- 单聊场景：user_openid。
- **没有 QQ 号**；白名单、映射、审计都基于 openid。

## 9. 已知限制与坑

- 全量消息需要平台开启「接收所有消息」；默认只推 @ 机器人的消息。
- 发送接口要求 WebSocket 在线；掉线期间无法回复。
- 网关会断线，必须实现心跳、Resume、重连与事件去重。
- 同一 msg_id + msg_seq 重复发送会失败，多次回复必须递增 msg_seq。
- 消息可能走内容审核（MESSAGE_AUDIT_PASS / MESSAGE_AUDIT_REJECT）。
- 主动消息可被用户 / 群管理员关闭，且受频控（429）。

## 10. 待实测

- 开启全量模式后，@ 消息是否仍以 GROUP_AT_MESSAGE_CREATE 单独推送（还是只推
  GROUP_MESSAGE_CREATE）。
- 非 @ 消息的 d.id 能否用于被动回复（若可以，快路可省主动额度）。
- 主动消息被关闭后的错误码与事件时序。
- 同一 bot 建立多个 WebSocket 连接的行为（是否互踢 / 重复推送）。

## 参考

- [启动接入](https://bot.q.qq.com/wiki/develop/api-v2/dev-prepare/getting-started.html)
- [获取访问凭证](https://bot.q.qq.com/wiki/develop/api-v2/dev-prepare/access-token.html)
- [API 调用指南](https://bot.q.qq.com/wiki/develop/api-v2/dev-prepare/api-call-guide.html)
- [WebSocket 方式](https://bot.q.qq.com/wiki/develop/api-v2/dev-prepare/event-emit/websocket.html)
- [事件订阅 Intents](https://bot.q.qq.com/wiki/develop/api-v2/dev-prepare/event-emit/payload.html)
- [消息收发概述](https://bot.q.qq.com/wiki/develop/api-v2/server-inter/message/overview.html)
- [发送群聊消息](https://bot.q.qq.com/wiki/develop/api-v2/autogen/api/v2_groups_group_openid_messages.post.html)
- [群 @ 机器人消息](https://bot.q.qq.com/wiki/develop/api-v2/autogen/event/group_at_message_create.html)
