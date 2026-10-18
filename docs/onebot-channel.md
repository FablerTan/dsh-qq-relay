# 真实 QQ 号通道（OneBot 11 / NapCat）

> 状态：**定案（2026-10-18，用户选择）**。当前采用真实 QQ 号 + OneBot 11；
> 官方机器人通道降为备选，见 [official-bot-channel.md](./official-bot-channel.md)。
> 上层架构见 [architecture.md](./architecture.md)，群聊闸门见 [gate.md](./gate.md)。

## 1. 选型结论

- 采用 **真实 QQ 号 + NapCat + OneBot 11 正向 WebSocket**。
- 理由：DSH 单轮可能超过 5 分钟；官方机器人群聊的被动回复窗口只有 5 分钟，超时后只能发
  主动消息（受配额、可被管理员关闭）。真实 QQ 号没有回复窗口，turn 结束随时可发；
  同时能看全群消息、媒体能力更全。
- 代价：非官方协议端，**账号有封号风险**；需要常开 QQ 客户端 + NapCat；QQ 版本更新可能
  导致 NapCat 失效，需要用户维护。
- 备选：LLBot（无头，GPL-2.0）；不选 go-cqhttp（已停更）、Lagrange（只推 Milky、Node 集成绕）。
- 许可：NapCat 为自定义限制性许可（非商用、修改版不得公开）。本项目只通过 OneBot 协议连接，
  不链接 / 不再分发其代码，插件本体仍为 MIT。

## 2. 账号模型

- **bot 用一个 QQ 小号**登录 NapCat；主号只作操作端。
- 群优先：主号建测试群，把 bot 小号拉进群，主号在群里 @ bot。
- 也可以主号直接私聊 bot 小号，不建群。
- 封号风险落在小号上；主号不登录协议端。

## 3. 部署（macOS）

1. 安装 QQ NT（本机已有 QQ.app）。
2. 安装 NapCat（macOS 安装器会改 QQ 启动入口，有头启动）。
3. 用 **bot 小号**登录 QQ。
4. 在 NapCat 中开启 **OneBot 11 的 WebSocket 服务器（正向 WS）**，例如监听
   **ws://127.0.0.1:3001**，并设置 access_token。
5. 保持 QQ + NapCat 运行；本插件作为 WS 客户端连接。

- 端口与鉴权方式以 NapCat 当前版本为准。
- 只监听回环地址，**不要暴露到公网**。

## 4. 连接与重连

- 插件用 Node 24 全局 WebSocket 作为客户端连接 NapCat，零外部依赖。
- 鉴权：优先 query 参数 ws://127.0.0.1:3001?access_token=...（NapCat 支持）；
  若版本不支持 query 令牌，则使用回环 + 无鉴权配置。
- 断线重连：指数退避（1s → 30s 上限）。
- **OneBot 正向 WS 没有事件回放**：断线期间的事件会丢；以本地状态与 msg_id 去重兜底。
- 连接后调用 get_login_info 校验 self_id 与配置一致，避免连错账号。
- 单实例文件锁：同一 bot 只允许一个插件进程连接。

## 5. 事件

OneBot 11 事件为 JSON。关键事件：

| post_type | 内容 | 处理 |
|---|---|---|
| message | message_type = group / private，含 group_id、user_id、message_id、message[]、raw_message、sender | 主路径 |
| message_sent | 机器人自己发出的消息 | **必须忽略**，防回环 |
| meta_event | lifecycle（connect / enable / disable）、heartbeat | 连接状态与心跳 |
| notice | group_upload、group_increase / decrease、group_recall 等 | P3 可用 |
| request | 加好友 / 加群请求 | 忽略或 P3 |

群消息关键字段：

- group_id：群号；
- user_id：发送者 QQ 号；
- message_id：消息 ID（引用回复与去重用）；
- message：消息段数组；
- raw_message：CQ 码原文；
- sender.nickname / sender.card / sender.role；
- self_id：机器人 QQ 号；
- time：时间戳。

**@ 检测**：message 数组里存在 {type:"at", data:{qq:"<self_id>"}}，或 raw_message 含
[CQ:at,qq=<self_id>]。**引用回复**：{type:"reply", data:{id: message_id}}。

## 6. 调用 API

请求格式：

~~~json
{"action":"send_group_msg","params":{"group_id":123456,"message":[{"type":"text","data":{"text":"..."}}]},"echo":"uuid"}
~~~

响应格式：

~~~json
{"status":"ok","retcode":0,"data":{"message_id":987654},"echo":"uuid"}
~~~

常用 action：

| action | 用途 |
|---|---|
| send_group_msg | 发群消息，返回 message_id |
| send_private_msg | 发私聊消息 |
| send_msg | 按 message_type 通用发送 |
| get_login_info | 校验 self_id |
| get_group_info | 群名等 |
| get_group_member_info / get_group_member_list | 成员昵称 / 角色 |
| get_group_msg_history | 断线后补上下文（可选） |

- message 为消息段数组：text、image、file、record、at、reply、face 等。
- 长文本按 QQ 实际限制切分为多条（上限待实测），避免单条过大被拒。
- 发送不再区分被动 / 主动，但有 **QQ 风控与频率限制**；按 retcode 分类退避重试。
- 用 echo 关联请求与响应；超时清理 pending。

## 7. 限制与坑

- **封号风险**：非官方协议端，账号可能被风控或封禁；建议小号，且不要高频群发。
- QQ 版本更新可能破坏 NapCat，需要用户重装 / 升级。
- 断线期间事件不补发（无 Resume），可能漏消息；以本地状态与去重兜底。
- message_sent 必须忽略，否则会把自己的话再喂给闸门。
- 消息频率 / 内容风控；retcode 需要分类处理（频率、权限、格式）。
- 没有内嵌键盘 / 按钮，审批只能用文本命令（P3）。
- 媒体发送依赖 NapCat 能访问的本地文件或 URL。

## 8. 与官方通道对比

| | 真实 QQ 号（本方案） | 官方机器人（备选） |
|---|---|---|
| 回复窗口 | **无**，随时可发 | 群 5 分钟；超时走主动消息 |
| 配额 | QQ 风控 / 频率 | 主动消息 20 qpm、1000 条/天/群，可被关闭 |
| 全量群消息 | 群成员即可看到 | 需申请「接收所有消息」 |
| 审批交互 | 文本命令 | 内嵌键盘按钮 |
| 账号风险 | **有封号风险** | 无 |
| 前置条件 | QQ + NapCat 常开 | 注册、认证、审核 |

## 9. 待实测

- NapCat 当前版本正向 WS 的配置项与令牌方式。
- 群消息的 at 段是否保留、message_sent 是否默认开启。
- 长文本 / 换行 / 图片的实际限制。
- QQ 更新后的兼容性。

## 参考

- [OneBot 11 标准](https://github.com/botuniverse/onebot-11)
- [NapCat 文档](https://napneko.github.io/)
- [NapCat 安全说明](https://napneko.github.io/other/security)
- [LLBot 文档](https://luckylillia.com/)
