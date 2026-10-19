# 配置总表（哪些能改、现在能不能在配置页改、改了怎么生效）

> 状态：**v0.16.0（2026-10-19）**。本文是**操作参考**：每个配置项的默认值 / 取值范围 /
> 现在能不能在配置页改 / 改完之后怎么生效，外加一张**写死常量清单**（那些"想调但没暴露"的数）。
> 字段为什么这样设计见 [architecture.md §2.1](./architecture.md)；配置层序与 HTTP 契约见
> [client.md §3–§5](./client.md)；具体行为见各自专题文档。

## 1. 配置从哪来

~~~text
profile 的 cordis.patch.yml（- id: dsh-qq-relay → config:）
  ↓ 只允许覆盖 EDITABLE_KEYS（见 §4）
settings.json（~/.dsh/storages/dsh-qq-relay/settings.json，配置页「保存并重连」写入）
  ↓ normalizeConfig 校验（失败 → 400，不写盘、不改内存）
生效配置（relay 实际使用）
~~~

- **patch 里的项**：改完要**重启该 profile 的 GUI** 才生效。
- **配置页里的项**：保存即重建 client + relay（**不重启**）；但保存会立刻断开当前 WS，
  在途回合会被中止且不回发。
- token 只写不读：页面永远只显示"已配置 / 来源（patch 或 settings）"。
- 删掉 settings.json 再重启 = 回到 patch 配置；没有"恢复默认"按钮。

## 2. 全字段表

"配置页"列：**可** = 现在就能在「插件面板 → dsh-qq-relay」配置页里改；**—** = 目前只能改 patch 并重启。
"生效"列指配置页可改项保存后的效果（patch 项一律重启生效）。

### 2.1 连接与范围

| 字段 | 默认 | 取值 | 作用 | 配置页 | 生效 |
|---|---|---|---|---|---|
| `wsUrl` | 必填 | `ws://` 或 `wss://` | NapCat 正向 WS 地址 | 可 | 保存后重连 |
| `accessToken` | 必填 | 非空字符串 | OneBot access_token；patch 里建议 `!!js process.env.QQ_RELAY_TOKEN` | 可（只写） | 保存后重连 |
| `selfId` | 必填 | 正整数 | bot 小号 QQ 号，连上后用 `get_login_info` 校验 | 可 | 保存后重连 |
| `groups` | `[]` | 群号数组 | 群白名单；未列出的群全部丢弃 | 可 | 立即 |
| `reconnect` | `{minMs:1000, maxMs:30000}` | 正整数，`maxMs >= minMs` | 断线重连的退避区间 | — | 重启 |

### 2.2 目录与会话

| 字段 | 默认 | 取值 | 作用 | 配置页 | 生效 |
|---|---|---|---|---|---|
| `workspace` | `~/dsh/qq-relay-ws` | 绝对路径或 `~` 开头 | 默认项目目录（会话 cwd + `.qq-relay` 落盘） | 可 | 只影响之后新建的会话 |
| `groupWorkspaces` | `{}` | 群号 → 绝对路径 | 群级项目目录，优先于 `workspace` | 可（表格整表提交） | 只影响新会话；改已映射群要「重新绑定」 |
| `sessionTitle` | `QQ群：{groupName}` | 支持 `{groupName}` / `{groupId}` | 自动创建会话的标题模板 | 可 | 只影响新会话 |
| `chatRetentionDays` | `0` | `0`（永不）或 `7..3650` | 聊天记录 / 媒体自动清理保留天数 | 可 | 下次自动清理（启动 / 每日） |

### 2.3 出向与回复

| 字段 | 默认 | 取值 | 作用 | 配置页 | 生效 |
|---|---|---|---|---|---|
| `replyChunkSize` | `1500` | `100..20000` | 出向文本切分上限（字符） | 可 | 立即 |
| `commandPrefixes` | `['/dsh']` | 非空字符串数组 | 以此开头的群消息绕过闸门直通 | 可 | 立即 |
| `reply.quote` | `true` | 布尔 | 结果首条引用触发消息 | — | 重启 |
| `reply.ackDelayMs` | `8000`（8s） | `0..120s`，`0` = 关 | 超过该时长先回「收到，处理中…」 | — | 重启 |
| `reply.mergeWindowMs` | `400` | `0..5s`，`0` = 不合并 | 直通连发的合并窗口 | — | 重启 |

### 2.4 QQ 侧命令层（`/new` / `/stop` / `/status` / `/help`）

| 字段 | 默认 | 取值 | 作用 | 配置页 | 生效 |
|---|---|---|---|---|---|
| `commands.enabled` | `true` | 布尔 | 是否启用命令层（关掉后 `/new` 会被当普通消息转给 DSH） | — | 重启 |
| `commands.bare` | `true` | 布尔 | 接受裸写 `/new`（不只是 `/dsh new`） | — | 重启 |
| `commands.roles` | `['owner','admin']` | `owner` / `admin` / `member` 子集 | 谁可以执行命令 | — | 重启 |

### 2.5 戳一戳

| 字段 | 默认 | 取值 | 作用 | 配置页 | 生效 |
|---|---|---|---|---|---|
| `poke.enabled` | `true` | 布尔 | 是否处理 `notice.notify.poke` | — | 重启 |
| `poke.react` | `true` | 布尔 | 被戳（目标是 bot）是否直通起一轮 | — | 重启 |
| `poke.cooldownMs` | `10000`（10s） | `0..10m`，`0` = 不限 | 每群冷却（冷却内只记录不接话） | — | 重启 |

### 2.6 入向群文件

| 字段 | 默认 | 取值 | 作用 | 配置页 | 生效 |
|---|---|---|---|---|---|
| `files.enabled` | `true` | 布尔 | 是否处理 `group_upload`（取链接 + 下载落盘） | — | 重启 |
| `files.react` | `true` | 布尔 | 落盘成功后是否直通起一轮（reason「群文件」） | — | 重启 |

### 2.7 消息闸门

| 字段 | 默认 | 取值 | 作用 | 配置页 | 生效 |
|---|---|---|---|---|---|
| `gate.enabled` | `false` | 布尔 | 闸门总开关；关 = 只直通 @ / 引用 / 命令 / 戳 / 群文件 | — | 重启 |
| `gate.mentionBypass` | `true` | 布尔 | @ / 引用 / 命令直通（绕过闸门） | — | 重启 |
| `gate.fastWindow` | `10m` | `10s..24h` | 「bot 最近说过话」窗口 → 走快路 | — | 重启 |
| `gate.fastMinReplyInterval` | `45s` | `0..60m` | 两次发言的最小间隔 | **可** | 立即 |
| `gate.debounce` | `5s` | `0..60s` | 快路批合并窗口 | **可** | 立即 |
| `gate.slowTimer` | `2h` | `1m..48h` | 慢路定时批量间隔 | — | 重启 |
| `gate.slowWindow` | `2h` | `1m..48h` | 慢路喂给 jev 的消息时间范围 | — | 重启 |
| `gate.maxBatchMessages` | `100` | `1..500` | 单批最多消息条数 | — | 重启 |
| `gate.classifierTimeoutMs` | `8000` | `100ms..60s` | 单次 jev 请求超时 | — | 重启 |
| `gate.model` | `typesafe/jev-1.14` | 模型 id | jev 模型 | — | 重启 |
| `gate.jevEndpoint` | OpenRouter decisions | `https://` 地址 | 分类器地址 | — | 重启 |
| `gate.jevApiKeyEnv` | `OPENROUTER_API_KEY` | 环境变量名（大写 + 下划线） | 从哪个环境变量取 key | — | 重启 |
| `gate.jevThreshold` | `0.7` | `0..1` | 接话阈值 | **可** | 立即 |

> 时长字段都接受 `500ms` / `45s` / `10m` / `2h` 或毫秒数字；`gate` 里的未知键会直接报错
> （防止拼错静默失效）。`docs/gate.md` §8 里残留的 `retentionDays` 是早期草案，未实现。

### 2.8 QQ 侧审批

| 字段 | 默认 | 取值 | 作用 | 配置页 | 生效 |
|---|---|---|---|---|---|
| `approval.enabled` | `true` | 布尔 | 是否把 DSH 的审批请求发到 QQ 群、用文本决定 | — | 重启 |
| `approval.timeoutMs` | `120000`（2min） | `10s..10m` | 等回复超时（超时即拒绝） | — | 重启 |
| `approval.roles` | `['owner','admin']` | `owner` / `admin` / `member` 子集 | 谁可以同意 / 拒绝 | — | 重启 |

## 3. 写死的常量（想调得先改成配置段）

这些目前是代码里的常量，**不在配置里**；下表列出位置与含义，作为"要不要顺手做成配置"的参考。

| 地方 | 常量 | 值 | 含义 |
|---|---|---|---|
| `model/media.js` | `MEDIA_MAX_BYTES` | 20 MiB | 入向单个媒体上限（图片 / 视频 / 语音；群文件同用） |
| `model/media.js` | `MEDIA_TIMEOUT_MS` | 10s | 单个媒体下载超时 |
| `model/media.js` | `MEDIA_MAX_PER_MESSAGE` | 10 | 单条消息最多下载几个媒体 |
| `model/media.js` | `OUTBOUND_IMAGE_MAX_BYTES` | 10 MiB | `qq_send` 出向单张图片上限 |
| `model/media.js` | `OUTBOUND_FILE_MAX_BYTES` | 30 MiB | `qq_send` 出向单个文件上限 |
| `controller/tools.js` | `MAX_TEXT_LENGTH` / `MAX_IMAGES` | 20000 字符 / 4 张 | `qq_send` 参数上限 |
| `model/reply.js` | `ACK_TEXT` | 「收到，处理中…」 | 占位文案（不可配） |
| `model/reply.js` | `SEND_QUEUE_MAX` / `SEND_QUEUE_MAX_AGE_MS` | 50 条 / 30min | 断线期间出向消息队列上限与过期 |
| `model/state.js` | `SEEN_LIMIT` / `PENDING_LIMIT` | 500 / 200 | 去重 id 与待评估消息的持久化上限 |
| `controller/relay.js` | `NAME_CACHE_TTL_MS` | 10min | 群名 / 昵称补查缓存 |
| `model/jev.js` | `MAX_TRANSCRIPT` / `MAX_TEXT_CHARS` | 60 条 / 500 字 | 交给 jev 的上下文截断 |
| `model/panel.js` | 最近消息 | 默认 20 / 上限 100 / 窗口 24h | 配置页「项目」的最近消息 |
| `controller/config-routes.js` | 请求体上限 | 64 KiB | 配置页 HTTP 请求体 |
| `model/project.js` | `RELAY_DIR_NAME` | `.qq-relay` | 项目内隐藏目录名（聊天 / 媒体 / 状态），`.gitignore` 为 `*` |
| `model/commands.js` | 命令别名 | `newchat`/`reset`、`cancel`、`info`、`?`/`菜单` | 命令识别（改不了，除改代码） |
| `model/approval.js` | 同意 / 拒绝词 | 同意 / 允许 / ok / yes…、拒绝 / no / deny… | 审批文本判定词表 |
| `model/cleanup.js` | 手动清理区间 | `1..3650` 天 | 「立即清理」允许比自动清理（`0` / `7..3650`）更激进 |

## 4. 配置页覆盖矩阵

- **现在可改（10 个顶层字段 + 3 个 gate 子项）**：`wsUrl`、`accessToken`、`selfId`、`groups`、
  `workspace`、`groupWorkspaces`（表格）、`chatRetentionDays`、`sessionTitle`、`replyChunkSize`、
  `commandPrefixes`，以及 `gate.debounce` / `gate.fastMinReplyInterval` / `gate.jevThreshold`。
- **patch 只读（26 项）**：`reconnect`（2 子项）、`commands`（3）、`reply`（3）、`poke`（3）、
  `files`（2）、`approval`（3）、`gate` 其余 10 项（`enabled` / `mentionBypass` / `fastWindow` /
  `slowTimer` / `slowWindow` / `maxBatchMessages` / `classifierTimeoutMs` / `model` /
  `jevEndpoint` / `jevApiKeyEnv`）。
- 白名单在两处：`model/settings.js` 的 `EDITABLE_KEYS`（+ `EDITABLE_GATE_KEYS` 与 `pickGate`）
  决定**哪些字段能被页面覆盖并写盘**；`model/settings.js` 的 `maskConfig` 决定**页面上能看到哪些值**。
  两处都要加，否则出现"能保存但看不到"或反之。

## 5. 想放进配置页的成本

新增一个配置项到页面，改动面固定是这几处：

1. `lib/model/settings.js`：`EDITABLE_KEYS`（顶层）或对应段的 `pick*` 白名单 + `mergeConfig` 合并分支；
2. `lib/model/settings.js` 的 `maskConfig`：把值带进 `status.config`（含默认值兜底）；
3. `src/model/form.ts`：`RelayFormState` 字段、`formFromConfig`、`buildConfigPatch` 的解析与校验、
   `isFormDirty` 自动跟随；
4. `src/viewmodel/settings.ts`：把新动作挂进 `RelaySettingsModel`（如果它需要按钮 / 保存时提交）；
5. `src/view/`：控件（开关 / 时长输入 / 数字 / 多选）落在对应二级页面
   （`panels/{Connection,Project,Behavior,Records}Panel.tsx`）或 `controls.tsx`；
6. `src/model/api.ts`：`RelayConfigView` / `RelayConfigPatch` 类型；
7. 测试：`test/settings.test.js`（白名单 / 脱敏 / 合并）、`test/apply.test.js`（保存 → 重建）；
8. 文档：`docs/client.md` §2/§4、`docs/architecture.md` §2.1、本文 §4。

**整段 vs 单字段**：`poke` / `reply` / `files` / `commands` / `approval` 各只有 2–3 个子项，
建议**整段白名单**（`pickSection(raw, keys)` 浅合并），比逐字段挑更好维护；`gate` 字段多、
默认值敏感，继续走 `EDITABLE_GATE_KEYS` 的子集模式。

## 6. 相关文档

- 层序 / 热更新语义 / HTTP 契约：[client.md](./client.md)
- 字段设计动机：[architecture.md §2.1](./architecture.md)
- 闸门参数含义：[gate.md](./gate.md) · 回复体验：[reply.md](./reply.md)
- 戳一戳：[poke.md](./poke.md) · 群文件：[media.md §5.2](./media.md) · 命令：[commands.md](./commands.md)
- 审批：[approval.md](./approval.md) · 工具上限：[tools.md](./tools.md)