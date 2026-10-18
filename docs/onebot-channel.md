# 真实 QQ 号通道（OneBot 11 / NapCat）

> 状态：**定案（2026-10-18）· 协议端实测通过（2026-10-19）**。当前采用真实 QQ 号 + OneBot 11；
> 官方机器人通道降为备选，见 [official-bot-channel.md](./official-bot-channel.md)。
> 上层架构见 [architecture.md](./architecture.md)，群聊闸门见 [gate.md](./gate.md)。

## 1. 选型结论

- 采用 **真实 QQ 号 + NapCat + OneBot 11 正向 WebSocket**。
- 理由：DSH 单轮可能超过 5 分钟；官方机器人群聊的被动回复窗口只有 5 分钟，超时后只能发
  主动消息（受配额、可被管理员关闭）。真实 QQ 号没有回复窗口，turn 结束随时可发；
  同时能看全群消息、媒体能力更全。
- **部署形态：NapCat 跑在 Docker 容器里**（macOS 上用 Colima 提供 Linux VM），不用 macOS 原生
  Shell。原因见 §3.1：macOS 26 + Apple Silicon 上原生 Shell 的 native hook 会被系统按代码签名
  强杀，实测无法启动。
- 代价：非官方协议端，**账号有封号风险**；需要常开容器；QQ 版本更新可能导致 NapCat 失效，
  需要用户维护。
- 备选：LLBot（无头，GPL-2.0）；不选 go-cqhttp（已停更）、Lagrange（只推 Milky、Node 集成绕）。
- 许可：NapCat 为自定义限制性许可（非商用、修改版不得公开）。本项目只通过 OneBot 协议连接，
  不链接 / 不再分发其代码，插件本体仍为 MIT。

## 2. 账号模型

- **bot 用一个 QQ 小号**登录 NapCat；主号只作操作端。
- 群优先：主号建测试群，把 bot 小号拉进群，主号在群里 @ bot。
- 也可以主号直接私聊 bot 小号，不建群。
- 封号风险落在小号上；主号不登录协议端。
- 文档里的 `<bot-qq>` / `<group-id>` / `<token>` 都是占位符；真实值只放 profile 配置，不进仓库。

## 3. 部署（Docker，推荐）

### 3.1 为什么不用 macOS 原生 Shell

2026-10-19 在本机（macOS 26.5.2 / Apple Silicon / QQ 7.0.0-52194 / NapCat 4.18.38 Shell）实测：
启动到 `[PacketHandler] 初始化成功` 后，QQ Helper worker 立即被系统杀掉，崩溃报告为
`SIGKILL (Code Signature Invalid)` / `termination: CODESIGNING, Invalid Page`，出错页落在
`wrapper.node` 的 COW 可执行映射上。

- 原因是 NapCat 的 native hook（`MoeHoo` / `napi2native`）在内存里改写 QQ `wrapper.node` 的代码页，
  macOS 26 在 arm64 上执行这些页时按代码签名校验，判定无效后强杀进程（退出码 9）。
- NapCat issue #2066 记录了同样的现象（macOS 26 / arm64 / hook 后 QQ Helper 崩溃循环），
  维护者回复「macos 缺少设备信息，支持的版本不是很全，建议用 docker」，并关闭为 not planned。
- 结论：**macOS 上跑 NapCat 用 Docker**。容器里是 Linux arm64，hook 走 linux 分支，实测正常。

### 3.2 准备 Docker（macOS + Colima）

~~~bash
brew install colima docker docker-compose
mkdir -p ~/.docker/cli-plugins
ln -sf /opt/homebrew/lib/docker/cli-plugins/docker-compose ~/.docker/cli-plugins/docker-compose
colima start --cpu 4 --memory 4 --disk 60 --vm-type vz
~~~

- 已验证版本：Colima 0.10.3 / Docker 29.9.1 / Compose 5.6.0（Apple Silicon，Virtualization.Framework，
  Ubuntu 24.04 aarch64）。
- Colima 不会开机自启：需要时 `brew services start colima`，或手动 `colima start`。
- 验证：`docker run --rm hello-world`。

### 3.3 启动 NapCat 容器

~~~yaml
services:
  napcat:
    image: mlikiowa/napcat-docker:latest
    container_name: napcat
    restart: unless-stopped
    environment:
      MODE: ws
      WEBUI_TOKEN: <webui-token>
    ports:
      - "127.0.0.1:6099:6099"
      - "127.0.0.1:3001:3001"
    volumes:
      - ./data/qq:/app/.config/QQ
      - ./data/config:/app/napcat/config
      - ./data/plugins:/app/napcat/plugins
~~~

~~~bash
docker compose up -d
docker compose logs -f napcat
~~~

- 端口只绑定回环地址，**不要暴露公网**。
- 数据卷：`data/qq`（QQ 登录态与本地消息库）/ `data/config`（NapCat + OneBot 配置）/ `data/plugins`。
- 更新：`docker compose pull && docker compose up -d`，三个数据目录保留。
- `MODE=ws` 启用正向 WebSocket；首次启动会生成 `onebot11.json`（`websocketServers` 监听
  `0.0.0.0:3001`、`messagePostFormat: array`、`reportSelfMessage: false`、`token` 默认空）。
- WebUI：`http://127.0.0.1:6099/webui?token=<webui-token>`。用 **bot 小号**扫码登录；
  `WEBUI_TOKEN` 是随机强口令时不会强制改密。

### 3.4 设置 OneBot token 并确认配置

- 登录后 NapCat 会生成按账号的 `onebot11_<bot-qq>.json`；确认 `websocketServers[0]` 的
  `port`、`messagePostFormat: array`、`reportSelfMessage: false`，并设置 `token`。
- 修改 `onebot11_<bot-qq>.json` 后重启容器生效（`docker compose restart napcat`）。
- 插件连接串：`ws://127.0.0.1:3001?access_token=<token>`（实测 query 令牌可用）。

## 4. 连接与重连

- 插件用 Node 24 全局 WebSocket 作为客户端连接 NapCat，零外部依赖。
- 鉴权：`ws://127.0.0.1:3001?access_token=...`（2026-10-19 实测可用）。
- 连接成功后先收到 `meta_event: lifecycle / connect`；心跳 `heartbeat` 间隔 30s。
- 断线重连：指数退避（1s → 30s 上限）。
- **OneBot 正向 WS 没有事件回放**：断线期间的事件会丢；以本地状态与 msg_id 去重兜底。
- 连接后调用 `get_login_info` 校验 `self_id` 与配置一致，避免连错账号。
- 单实例文件锁：同一 bot 只允许一个插件进程连接。

## 5. 事件

OneBot 11 事件为 JSON。关键事件：

| post_type | 内容 | 处理 |
|---|---|---|
| message | message_type = group / private，含 group_id、user_id、message_id、message[]、raw_message、sender | 主路径 |
| message_sent | 机器人自己发出的消息 | **必须忽略**，防回环 |
| meta_event | lifecycle（connect / enable / disable）、heartbeat | 连接状态与心跳 |
| notice | group_upload、group_increase / decrease、group_recall 等 | P3 可用 |
| request | 加好友 / 加群请求、群邀请 | 忽略或 P3 |

群消息关键字段：

- group_id：群号；
- user_id：发送者 QQ 号；
- message_id：消息 ID（引用回复与去重用）；
- message：消息段数组；
- raw_message：CQ 码原文；
- sender.nickname / sender.card / sender.role；
- self_id：机器人 QQ 号；
- time：时间戳。

2026-10-19 实测补充（详见 §9）：

- **全量上报**：群里不带 @ 的普通消息同样会收到 `post_type: message` 事件。
- **@ 段**：`{type:"at", data:{qq:"<bot-qq>"}}`，`qq` 是字符串；@ 后常跟一个空白 `text` 段。
- **引用回复**：`{type:"reply", data:{id:"<message_id>"}}`，`id` 是字符串，等于被引用消息的 `message_id`。
- **message_id 不是全局唯一、也不单调**，幂等键用 `(group_id, message_id)`。
- `reportSelfMessage=false` 时，自己发的消息**不会**产生事件；`send_group_msg` 返回的
  `message_id` 必须由插件自行记录（防回环、引用匹配都靠它）。

## 6. 调用 API

请求格式：

~~~json
{"action":"send_group_msg","params":{"group_id":123456,"message":[{"type":"text","data":{"text":"..."}}]},"echo":"uuid"}
~~~

响应格式：

~~~json
{"status":"ok","retcode":0,"data":{"message_id":987654},"echo":"uuid"}
~~~

失败响应（实测）：

~~~json
{"status":"failed","retcode":1200,"data":null,"message":"发送失败，你已被移出该群，请重新加群。","echo":"send"}
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

- **macOS 原生 Shell 不可用**（见 §3.1）：当前 macOS 26 + arm64 必须用 Docker。
- **封号风险**：非官方协议端，账号可能被风控或封禁；建议小号，且不要高频群发。
- QQ 版本更新可能破坏 NapCat，需要用户重装 / 升级镜像。
- 断线期间事件不补发（无 Resume），可能漏消息；以本地状态与去重兜底。
- NapCat 本身不存消息、不回放事件；历史只在 QQ 客户端本地库里，插件必须自己落 chat log（P2）。
- message_sent 必须忽略，否则会把自己的话再喂给闸门。
- 消息频率 / 内容风控；retcode 需要分类处理（频率、权限、格式）。
- 没有内嵌键盘 / 按钮，审批只能用文本命令（P3）。
- 媒体发送依赖 NapCat 能访问的本地文件或 URL。
- **容器重启可能掉登录**：`docker compose restart napcat` 后 QQ 可能要求重新扫码（2026-10-19 实测），
  WebUI 的 `autoLoginAccount` 可以配自动登录（未验证）。
- **断线窗口会丢事件**：插件按退避重连（上限 30s），NapCat 重启后到重连完成之间的事件不会补发
  （OneBot 正向 WS 无回放）；P1 接受该窗口，P2 可用 `get_group_msg_history` 补上下文。

## 8. 与官方通道对比

| | 真实 QQ 号（本方案） | 官方机器人（备选） |
|---|---|---|
| 回复窗口 | **无**，随时可发 | 群 5 分钟；超时走主动消息 |
| 配额 | QQ 风控 / 频率 | 主动消息 20 qpm、1000 条/天/群，可被关闭 |
| 全量群消息 | 群成员即可看到 | 需申请「接收所有消息」 |
| 审批交互 | 文本命令 | 内嵌键盘按钮 |
| 账号风险 | **有封号风险** | 无 |
| 前置条件 | Docker + NapCat 常开 | 注册、认证、审核 |

## 9. 实测记录（2026-10-19，Docker）

环境：macOS 26.5.2 / Apple Silicon；Colima 0.10.3 + Docker 29.9.1；NapCat 镜像
`mlikiowa/napcat-docker:latest`（NapCat Core 4.18.37，linux/arm64）；bot 小号 `<bot-qq>`，
测试群 `<group-id>`。

| 项 | 结果 |
|---|---|
| Colima + Docker 安装、镜像拉取 | ✅ |
| Linux arm64 hook（`NativePacketClient Hook 初始化成功 platform=linux.arm64`） | ✅ |
| 扫码登录、OneBot WS 监听 3001 | ✅ |
| `get_login_info` / `get_status` | ✅ |
| `get_group_list` / `get_group_member_list` / `get_group_info` | ✅ |
| 群消息事件：@ / 普通消息 / 引用回复 | ✅ |
| `send_group_msg` 成功（返回 `message_id`） | ✅ |
| `send_group_msg` 失败（retcode 1200，错误信息可读） | ✅ |
| `get_group_msg_history` | ✅ |
| 自己发的消息不产生事件（`reportSelfMessage=false`） | ✅ |
| 真机：群里 @ → DSH 回复（约 4 秒往返） | ✅ |
| 真机：NapCat 重启后 WS 自动重连、重连后消息正常 | ✅ |
| 真机：重连后不重建会话（mapping 复用） | ✅ |
| 真机：容器重启需重新扫码 | ✅（已知代价） |
| 长文本切分上限 / 图片 / 文件 / 风控退避 | 待验证 |

## 参考

- [OneBot 11 标准](https://github.com/botuniverse/onebot-11)
- [NapCat 文档](https://napneko.github.io/)
- [NapCat 安全说明](https://napneko.github.io/other/security)
- [NapCat issue #2066（macOS 26 arm64 hook 崩溃）](https://github.com/NapNeko/NapCatQQ/issues/2066)
- [LLBot 文档](https://luckylillia.com/)
