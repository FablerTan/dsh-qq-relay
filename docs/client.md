# client 半身与配置页

> 状态：**v0.25.1（2026-10-20）**。本文是 client 半身的契约文档：配置页在哪、长什么样、
> 配置怎么分层、HTTP 面怎么调、保存后哪些东西立刻生效、样式怎么跟宿主主题一致。
> 总体架构见 [architecture.md](./architecture.md)，配置项全表见 [config.md](./config.md)。

## 1. 定位与注册落点

配置页画在**插件面板**里：左栏「插件」图标（`main` 面板 key `plugins`）→ 我的 / Bundles →
`dsh-qq-relay` 组合包自己的页面。注册座位是 **`plugins.bundle.config`**，key 为包名
`dsh-qq-relay`；页面标题、描述、安装信息与**启停开关**由插件管理器负责，本插件只画表单内容
（官方契约：`view: 'page'` 的表单自带保存控件）。

- **为什么搬到这里**：配置跟着插件走，和「这个插件在哪启动 / 停用」放在同一页；设置里不再单列一块。
- **注册与行同生共死**：浏览器半身挂在插件的 Loader 行上，行被停用后这个页面（含配置块）
  一起消失；重新启用并刷新页面后回来。
- **不新增顶级入口、不占右栏**；HTTP 面同源、无独立鉴权（GUI 默认只绑 loopback，
  不要把本插件挂到公网监听上）。
- 排错顺序：插件面板里找不到这个组合包 → 没装入 profile / 没重启 GUI；组合包页里没有配置块 →
  client 半身没加载或注册失败（看浏览器控制台与插件页状态）。

页面是**二级结构**：固定的状态行 + 保存动作，下面是「连接 / 环境 / 项目 / 行为 / 画图·视频 /
预设 / 记录」七个二级页面（下划线 tab，沿用宿主插件页的分区风格）。

## 2. 页面内容

### 2.1 顶部（所有二级页面共享）

| 区域 | 内容 |
|---|---|
| 状态行 | 状态点 + 文案：已连接（昵称 / QQ 号）· 连接中（断线自动重连）· 未启动（配置待补全 / 另一个实例持锁，显示 pid） |
| 动作 | 「刷新」「重新连接」「保存并重连」（主按钮）；任何二级页面都能直接保存 |
| 提示 | host 校验问题逐条显示；保存成功 / 失败的提示；「有未保存的修改」 |

### 2.2 七个二级页面

| 页面 | 内容 | 动作 |
|---|---|---|
| 连接 | 运行状态卡（协议端地址 / 登录账号 / 单实例锁 / 群映射数 / problems）；`wsUrl` · `accessToken`（只写，留空不修改）· `selfId` · `groups` | 刷新 / 重连 / 保存 |
| 环境 | `environment.enabled` · `environment.dir` · `environment.webuiToken`（只写，留空不修改）；7 步检查表（Docker CLI / 容器引擎 / compose 文件 / NapCat 容器 / QQ 登录 / OneBot 配置 / 插件回填），每步状态 + 证据 + 按钮；**修复计划**（将依次执行什么 + 下一步，v0.25.0）；动作日志（脱敏）；安全边界说明（v0.23.0） | 「一键修复」（逐步补全，含安装 / 启动 / 重启引擎时先确认）「重新检测」「打开 WebUI 扫码」+ 每步动作（安装 / 启动引擎 / 重启引擎 / 写 OneBot 需二次确认） |
| 项目 | 默认 `workspace` · `sessionTitle`；群项目目录表（群号 / 会话 / 项目目录 / 操作）；最近消息（按群展开，只读）；workspace 挂载失败告警（v0.21.1，会话显示「未分组」时） | 「重新绑定」「消息」「解除绑定」「清空全部映射」 |
| 行为 | `replyChunkSize` · `commandPrefixes`；闸门参数 `gate.debounce` / `gate.fastMinReplyInterval` / `gate.jevThreshold` / `gate.jevApiKey`（只写，留空不修改；保存即热切换分类器，v0.24.0）+ 闸门摘要（开关 / 分类器 / 阈值 / key 来源）；**角色与人设**（agent preset 下拉 + 轻量人设开关 / 文本，v0.19.0）；**代答**（开关 + 目标名单 + 沉默窗口，v0.18.0） | 保存（保存即重建 relay / 闸门，无需重启） |
| 画图 / 视频 | ComfyUI 服务（启用画图 / 视频 / 服务地址 / 探测超时 3s..120s / 连接成功后加载 skill）+「测试连接」+ 运行状态（可达 / 版本 / GPU / 队列 / 最近检查 / **逐条** `comfy-image`、`comfy-video` 的加载状态与错误，v0.22.0） | 「测试连接」（只探测、不保存）；保存 `comfy` 后立即探测并决定是否注册两个 skill，不重建 relay |
| 预设 | 插件管理的 QQ 预设列表（名称 / 模型 / 权限 / 编辑 / 删除）；新建 / 编辑表单：id · 名称 · 描述 · persona · provider / model / 思考层级 · 权限预设 · 排序（v0.20.0） | 保存预设 / 取消 / 删除（正在使用的预设在 host 侧拒绝删除） |
| 记录 | `chatRetentionDays`（0 = 永不自动删除；7..3650 = 自动清理） | 「立即清理」（用输入框天数 1..3650，二次确认） |

- 行为页还有**每群实时状态表**：待评估条数 / 最近发言 / 冷却 / DSH 忙 / 评估中，外加全局计数
  （待评估消息 / 群、活动定时器、派发队列、发送队列）；随状态轮询 5 秒刷新。
- 「代答」（v0.18.0）：开关（默认关）+ 目标名单（QQ 号或群名片 / 昵称，逗号分隔）+
  沉默窗口（默认 `10m`，`0s` = 总是代答）。开启时名单不能为空，页面保存前就地校验。
- 「角色与人设」（v0.19.0）：agent preset 下拉（空 = 跟随 DSH 默认；选项来自 host 的
  `agentPresets.list()`，`broken` 的项标「（不可用）」并禁用）+ 轻量人设开关 / 多行文本框。
  宿主没有 `agentPresets` 服务时下拉隐藏并提示；配置里的 preset 不在名册时提示 missing。
  保存后 preset 只影响新建会话（已有群要 `/new` 或「重新绑定」），人设下一条消息生效。
- 「环境」（v0.23.0）：数据源是 `GET /api/env`（见 [env.md](./env.md) §6），页面挂着时每 5 秒轮询
  （有动作在跑时 2 秒）；目录 / token 用顶部「保存并重连」落盘，保存后 host 用新目录重新探测。
  步骤状态是 `ok / warn / error / skip` 四档；`skip` 表示前置缺失（不是失败）。
  「一键修复」（v0.25.0 起**逐步补全**）：host 下发 `status.fixPlan`（`sequence` / `titles` /
  `needsConfirm` / `next`），页面把它渲染成「一键修复将依次执行：… 下一步：…」一行；
  点按钮时若 `needsConfirm` 先 `window.confirm` 一次，然后带 `confirm:true` 发给 host。
  host 侧是**逐轮推进**：每执行一个动作就重新探测、重排计划，所以装完引擎会出现 `compose-up`、
  容器起来后才会轮到 OneBot / 回填；被 `skip` 的步骤在前置补齐后自动变成可修复。
  安装类动作单独点击时仍各自二次确认。
  「打开 WebUI」由 host 拼 `http://127.0.0.1:6099/webui?token=…` 返回，页面新开标签页并把链接
  同时渲染出来（弹窗被浏览器拦截时可手点）。命令类动作后台执行，进度看 `status.running` 与日志。
- 「画图 / 视频」（v0.22.0，页签文字就是「画图 / 视频」）：四个字段 `comfy.enabled` /
  `baseUrl` / `timeoutMs` / `skillEnabled`；「测试连接」用**表单里填的**地址与超时探测一次
  （不保存配置，返回 target / 可达 / 版本 / GPU / 队列 / 延迟 / 错误）；「运行状态」表展示后台探测
  结果，并**逐条**显示 `comfy-image`（出图）/ `comfy-video`（视频）两个 skill 的加载状态与错误。
  宿主还是旧版本（没返回 `config.comfy`）时整页提示重启，字段按关闭兜底；旧 host 只返回单数
  `comfy.skill` 时 client 兜底成单元素数组（页面只显示一个 skill）。详见 [comfy.md](./comfy.md)。
- 「最近消息」：该群最近 24 小时聊天记录（最多 20 条），只读显示时间 / 显示名 / @ 与引用标记 /
  媒体标记（含 `[文件]` / `[群文件下载失败]`）。
- 「预设」页（v0.20.0）：列表 + 编辑器；provider / model / 思考层级下拉来自宿主
  `modelCatalog`，权限来自 `permissionCatalog`；宿主没有对应服务时模型字段退化为手填。
  保存后 host 动态注册 preset（无需重启 GUI），但已有群会话要 `/new` 才换过去。
- 页面每 5 秒静默刷新一次状态（只刷新连接态与映射，不覆盖正在编辑的表单）。
- 破坏性动作（重新绑定 / 解除绑定 / 清空映射 / 立即清理）用浏览器 `confirm` 二次确认。

## 3. 样式与主题

client 半身只依赖 React，**不能 import 宿主的 CSS Modules 或 ui-primitives**；因此
`src/view/theme.ts` 往 `document.head` 注入一份普通 CSS（`<style id="dsh-qq-relay-client-style">`，
卸载时移除），类名统一 `qqr-` 前缀。

- **只用 ui-theme 的 `--dsw-*` 语义 token**，不写字面色值、不写明暗主题分支：
  `--dsw-alias-label-primary/-secondary/-tertiary/-dimmed`、`--dsw-alias-border-l1..l4`、
  `--dsw-alias-bg-layer-1`、`--dsw-alias-settings-card-fill/-stroke`、
  `--dsw-alias-state-success/-warn/-error/-business/-idle-primary`、
  `--dsw-alias-interactive-bg-hover/-active`、`--dsw-alias-button-primary-fill/-hover`、
  `--dsw-alias-label-primary-foreground`、`--dsw-alias-markdown-inline-code`、
  `--dsw-radius-xs/-sm/-md/-xl`、`--dsw-focus-ring-width`、`--ds-font-family-code`。
- 几何遵循 DSH 圆角规范：设置卡片 R20（`settings-card` 材质）、输入框与标准控件 R12、
  紧凑按钮 R8；中性边框一律 0.5px 发丝线；tab 用下划线而不是胶囊。
- 明暗主题、正文字号、字体由宿主在 `body` 上解析，页面自动跟随；宿主换 token 时不需要改本插件。
- 焦点：按钮 / tab 用 `--dsw-focus-ring-width` 的标准 focus ring，输入框用
  `--dsw-alias-state-business-primary` 边框（与宿主 `Input` 一致）。

## 4. 配置层序与持久化

~~~text
profile patch（~/.dsh/profiles/<name>/cordis.patch.yml 的 config）
  ↓ 只允许覆盖 EDITABLE_KEYS
settings.json（~/.dsh/storages/dsh-qq-relay/settings.json，配置页保存）
  ↓ normalizeConfig 校验
生效配置（relay 实际使用）
~~~

- 可覆盖字段：`wsUrl / accessToken / selfId / groups / workspace / groupWorkspaces /
  chatRetentionDays / gate.{debounce,fastMinReplyInterval,jevThreshold,jevApiKey} /
  proxyReply.{enabled,targets,silenceWindow} / sessionTitle / replyChunkSize / commandPrefixes /
  agentPreset / persona.{enabled,text} / comfy.{enabled,baseUrl,timeoutMs,skillEnabled} /
  environment.{enabled,dir,webuiToken}`；
  `reconnect` / `commands` / `reply` / `poke` / `files` / `approval` 等保持 patch 只读
  （完整矩阵见 [config.md](./config.md) §4）。
  群项目目录由「项目」页表格整表提交（空表 = 清空覆盖）；
  `chatRetentionDays` 有表单入口（0 / 7..3650，保存后自动清理按新值执行）。
- **保存即生效**：host 用新配置重建 client + relay（单实例锁不重入），不需要重启 GUI。
- 校验失败 → 返回 400，**不写盘、不改内存配置**；页面显示 host 的 problems。
- `settings.json` 是普通 JSON（`{ version, updatedAt, config }`），原子写；手动改它
  需要重启 GUI 才生效（页面保存才会触发热替换）。
- token 只写不读：`settings.json` 里可能存着配置页写入的 token；HTTP 响应永远只给
  `accessTokenConfigured` 与 `accessTokenSource`（`profile` / `settings`）。

## 5. HTTP 契约

统一信封（与仓库既有插件一致）：

~~~json
{ "ok": true, "value": { } }
{ "ok": false, "error": { "code": "CONFIG_INVALID", "message": "wsUrl 必填" } }
~~~

| 方法 | 路径 | 作用 |
|---|---|---|
| GET / HEAD | `/dsh-qq-relay/api/status` | 状态快照（连接、配置视图、闸门 / 分类器状态、锁、映射、problems） |
| GET / HEAD | `/dsh-qq-relay/api/config` | 同 `status`（配置视图就在 `value.config`） |
| POST | `/dsh-qq-relay/api/config` | body = 可编辑字段子集；校验、落盘、重建连接后返回新状态 |
| POST | `/dsh-qq-relay/api/reconnect` | 用当前配置重建连接 |
| POST | `/dsh-qq-relay/api/rebind` | body `{ groupId }`：删该群会话映射并用当前配置重建 → 下次消息按新项目建会话（P4） |
| POST | `/dsh-qq-relay/api/cleanup` | body `{ days }`（1..3650）：立即清理超过该天数的聊天日文件与媒体日期目录，返回 `{ cleanup: { days, chat, media, at }, status }`（v0.13.0） |
| GET / HEAD | `/dsh-qq-relay/api/messages?groupId=&limit=` | 最近 24 小时聊天记录（默认 20、上限 100 条），返回 `{ groupId, limit, windowMs, messages }`（v0.14.0） |
| POST | `/dsh-qq-relay/api/mapping/delete` | body `{ groupId }`：解除该群会话绑定并重建 relay，返回 `{ mapping: { groupId, removed }, status }`（v0.14.0） |
| POST | `/dsh-qq-relay/api/mapping/clear` | 解除全部群映射并重建 relay，返回 `{ mappings: { cleared }, status }`（v0.14.0） |
| GET / HEAD / POST | `/dsh-qq-relay/api/presets` | GET 返回状态（含 `presets` / `presetService` / `modelCatalog` / `permissionCatalog`）；POST body `{ preset }` 保存并动态注册，返回 `{ presets, status }`（v0.20.0） |
| POST | `/dsh-qq-relay/api/presets/delete` | body `{ id }`：删除插件预设（正在使用的返回 409），返回 `{ presets, status }`（v0.20.0） |
| POST | `/dsh-qq-relay/api/comfy/test` | body 可选 `{ baseUrl?, timeoutMs? }`：探测 ComfyUI（**只探测、不保存 / 不改 skill 注册**），返回 `{ probe: { target, reachable, version, device, queue, error, checkedAt, latencyMs }, status }`（v0.21.0） |
| GET / HEAD | `/dsh-qq-relay/api/env` | 环境页状态：`{ supported, platform, enabled, dir, webuiTokenConfigured, checking, checkedAt, running, summary, steps[], actions[], log: { cursor, entries[] } }`（v0.23.0） |
| POST | `/dsh-qq-relay/api/env/action` | body `{ action, confirm? }`：执行白名单动作，返回 `{ action, status, logCursor, accepted?, url? }`；安装 / 启动引擎 / 写 OneBot 需 `confirm: true`（v0.23.0） |

状态快照字段（节选）：

~~~json
{
  "plugin": "dsh-qq-relay",
  "started": true,
  "connected": false,
  "login": { "userId": 10001, "nickname": "示例用户" },
  "problems": [],
  "lock": null,
  "config": {
    "wsUrl": "ws://127.0.0.1:3001",
    "selfId": 10001,
    "groups": [10002],
    "workspace": "/Users/<user>/dsh/qq-relay-ws",
    "groupWorkspaces": { "10002": "/Users/<user>/projects/my-app" },
    "chatRetentionDays": 0,
    "gate": {
      "debounceMs": 3000, "fastMinReplyIntervalMs": 10000, "jevThreshold": 0.6,
      "jevApiKeyConfigured": false, "jevApiKeySource": "none", "jevApiKeyEnv": "OPENROUTER_API_KEY"
    },
    "sessionTitle": "QQ群：{groupName}",
    "replyChunkSize": 1500,
    "commandPrefixes": ["/dsh"],
    "accessTokenConfigured": true,
    "accessTokenSource": "profile",
    "comfy": {
      "enabled": false,
      "baseUrl": "http://192.168.1.10:8188",
      "timeoutMs": 30000,
      "skillEnabled": true
    },
    "comfySupported": true
  },
  "gate": { "enabled": true, "classifier": "jev", "threshold": 0.7, "groups": [] },
  "mappings": [{ "groupId": 10002, "sessionId": "session-…", "title": "QQ群：…" }],
  "workspace": {
    "attachIssues": [{ "groupId": 10002, "sessionId": "session-…", "error": "…", "at": 1790000000000 }]
  },
  "comfy": {
    "enabled": true, "reachable": true, "checking": false, "checkedAt": 1790000000000,
    "version": "0.39.0", "device": "NVIDIA GeForce RTX 4070",
    "queue": { "running": 0, "pending": 0 },
    "skills": [
      { "name": "comfy-image", "loaded": true, "error": "" },
      { "name": "comfy-video", "loaded": true, "error": "" }
    ]
  }
}
~~~

错误码：`CONFIG_INVALID` / `CONFIG_EMPTY` / `CONFIG_BAD_JSON` / `REBIND_GROUP_INVALID` /
`CLEANUP_DAYS_INVALID` / `MESSAGES_GROUP_INVALID` / `MAPPING_GROUP_INVALID` /
`COMFY_INVALID` / `ENV_INVALID` / `ENV_ACTION_UNKNOWN` / `ENV_CONFIRM_REQUIRED` /
`ENV_TOKEN_MISSING` / `ENV_PLATFORM_UNSUPPORTED` → 400；`CONFIG_BODY_TOO_LARGE` → 413；
`RELAY_NOT_STARTED` / `RELAY_NOT_CONFIGURED` / `REBIND_NOT_STARTED` / `CLEANUP_NOT_CONFIGURED` /
`MESSAGES_NOT_CONFIGURED` / `MAPPING_NOT_STARTED` / `ENV_OVERWRITE_CONFIRM` / `ENV_NOT_READY` /
`ENV_ACTION_RUNNING` → 409；`COMFY_TEST_FAILED` / `ENV_ACTION_FAILED` 等其余 → 500；
当前实例没注入画图测试处理器时 `POST /comfy/test` → 501 `CONFIG_UNSUPPORTED`。请求体上限 64 KiB。

## 6. 热更新语义

| 改动 | 生效方式 |
|---|---|
| `wsUrl` / `accessToken` / `selfId` | 保存后立即断开旧连接、用新配置重连 |
| `groups` / `commandPrefixes` / `replyChunkSize` | 立即对新事件生效 |
| `workspace` / `groupWorkspaces` / `sessionTitle` | 只影响**之后新建**的会话；已存在的群映射保持原项目 / 标题（表格可查）。改已映射群的项目后点「重新绑定」才会换会话；旧项目聊天记录不移动 |
| `gate.debounce` / `gate.fastMinReplyInterval` / `gate.jevThreshold` | **立即生效**：保存后重建闸门，阈值由分类器每次判定时读取 |
| `gate.jevApiKey` | **立即生效且不重建 relay**：只替换分类器内部实现（保存后新 key 立刻可用；清空则退回环境变量 / fail closed） |
| `chatRetentionDays` | 立即写入配置；下一次自动清理（重启后 / 每日）按新值执行。「立即清理」只清一次，不改配置 |
| 立即清理 | 只删文件（聊天日文件 / 媒体日期目录），不动映射、会话与配置；删除后不可恢复 |
| 解除绑定 / 清空全部映射 | 删本机映射并重建 relay（清掉 relay 内的会话缓存）；GUI 里的旧会话保留，下条消息按当前项目目录重新建会话 |
| `comfy` 四项 | 保存后立即按新配置探测一次：只有 `enabled && skillEnabled` 且连得上才注册 / 保持 `comfy-image` 与 `comfy-video` 两个 skill；仅 `comfy` 变化**不重建 relay**（比较配置时忽略 `comfy`），不重启 GUI。「测试连接」不保存、不改注册 |
| `environment` 三项 | 保存后立即用新目录 / token 重新探测一次；**不重建 relay**（比较配置时同样忽略 `environment`）。动作执行中保存会等当前探测结束后再按新配置重探 |

- 重连不重入单实例锁：锁属于进程，连接属于运行实例（`controller/runtime.js`）。
- **保存会立即断开当前 WS**：进行中的 QQ 触发回合会被中止且不回发（配置改动属低频操作，
  优先保证新配置生效）；需要保留在途回合时，等它结束再保存。
- 另一个进程持锁时：本进程 `started=false`、页面显示持锁 pid；保存配置只会落盘，
  对手进程不会热加载（它没有收到信号），需要它重启才会读到 settings.json。

## 7. 代码布局（MVVM）

~~~text
src/
├── client.tsx              # 组合根：ctx.get('slots') → plugins.bundle.config 注册（key = 包名）
├── model/
│   ├── api.ts              # HTTP 信封、状态视图类型、fetch 注入
│   └── form.ts             # 表单 ↔ patch 纯逻辑（群号 / 前缀 / 数字解析、dirty、群项目行）
├── viewmodel/
│   ├── settings.ts         # useRelaySettings：页面状态 + 动作；状态文案 / token 提示 / 闸门摘要；二级页面定义
│   └── env.ts              # useRelayEnv：「环境」页轮询 / 动作 / 日志 / WebUI 链接（v0.23.0）
└── view/
    ├── SettingsPage.tsx    # 外壳：状态行 + 动作 + 二级页面 tab + 提示 + 页脚
    ├── controls.tsx        # Button / Card / Row / Block / Line / StatusLineView / TextInput / Toggle / Select / TextArea
    ├── theme.ts            # 注入的 CSS（--dsw-* token）+ useRelayStyles
    └── panels/
        ├── ConnectionPanel.tsx
        ├── ProjectPanel.tsx  # 群项目目录 + 最近消息；v0.21.1 起显示 workspace attachIssues 告警
        ├── BehaviorPanel.tsx
        ├── ComfyPanel.tsx   # 「画图 / 视频」页：ComfyUI 开关 / 地址 / 超时 / skill 开关 / 测试连接 / 运行状态 + 两个 skill 逐条状态（v0.22.0）
        ├── EnvPanel.tsx     # 「环境」页：环境目录 / WebUI token / 7 步检查表 / 一键修复 / 动作日志 / 安全说明（v0.23.0）
        ├── PresetsPanel.tsx
        └── RecordsPanel.tsx
~~~

构建：`pnpm build`（vite 库模式 → `dist/client.cjs` → `scripts/wrap-client.mjs` →
`lib/client.js`，已入库）；React 保持 external，client 只依赖 React。

## 8. 验证

- `pnpm test`：host 侧单测（`test/settings.test.js` 覆盖层序 / 脱敏 / 原子读写 / 路由面，
  `test/apply.test.js` 假 ctx + 临时 HOME 跑通注册、状态、保存、重连，路由数 13；
  `test/env.test.js` 覆盖环境配置 / compose / OneBot / 求值 / 动作 argv / 日志脱敏 /
  controller 探测 + 写 OneBot + 回填 + open-webui + 确认制 + 一键修复逐步补全 /
  token 双空生成 / 引擎启停区分与可读错误 / docker context 兜底 / 动作不推进跳过）。**297** 个用例。
- `pnpm check`：语法 + 元数据 + `tsc --noEmit` + 文档↔源码配对。
- 客户端没有浏览器测试：改完 client 半身跑 `pnpm build` 后**刷新页面**即可看到（v0.17.0 起
  这类改动不需要重启 GUI）；真机：左栏「插件」→ dsh-qq-relay → 七个二级页面都渲染、
  改一个字段保存 → 观察状态行与日志里 `[relay] 配置已保存…并已重连`；群里 @ 机器人确认转发未中断。
- 画图 / 视频（v0.22.0）：`lib/client.js` 已含 ComfyPanel 文案，GUI 重启后「画图 / 视频」页可见；
  开 `comfy.enabled` 后点「测试连接」应看到 target / 可达 / 版本（错误地址则 `reachable=false`
  且返回 `ok=true`），状态表逐条显示 `comfy-image（出图）` / `comfy-video（视频）· 已加载 / 未加载`。
- 明暗主题各看一遍：卡片 / 输入框 / 按钮 / tab 的颜色与发丝线跟随宿主，无残留字面色值。

## 9. 已知边界 / 后续

- 配置页只有 §4 列的字段可改；`commands` / `reply` / `poke` / `files` / `approval` / `reconnect`
  与部分 `gate` 字段仍是 patch 只读（见 [config.md](./config.md) §4/§5），加进页面要同时改
  `EDITABLE_KEYS`、`maskConfig`、`form.ts`、`viewmodel/settings.ts` 与对应面板。
- 「角色与人设」的 preset 下拉依赖宿主提供 `agentPresets` 服务；旧宿主 / 非 Web bundle 下
  整块降级为提示（轻量人设仍可用）。agent preset 在会话创建时固定，切换后旧会话不变。
- 「最近消息」只看**最近 24 小时**（按天分文件，回看窗口太大没意义）；最多 20 条、只读，
  不含 raw CQ 码与 seen / pending 等内部状态。
- 「闸门状态」表来自 state 文件 + relay 的只读快照；页面每 5 秒轮询状态，不在页面上实时推送。
- 代答目标按昵称匹配时依赖 host 侧 `get_group_member_info`（10 分钟缓存）；查不到时只剩
  QQ 号匹配，页面不会提示——排查时看 host 日志的「代答触发 / 跳过」。
- **删除 GUI 里的旧会话**仍无入口（本插件不管理 DSH 会话生命周期）。
- 「立即清理」只清已解析出项目目录的群（白名单 ∪ 映射 ∪ 群项目配置）；旧全局 chat/ 目录由启动迁移处理。
- 旧 host（没有 `comfy` 配置 / 状态字段）时「画图 / 视频」页提示重启并按关闭兜底；旧 host 只返回
  单数 `comfy.skill` 时按单元素数组显示。host 有探测但没有 `skills` 服务时两个 skill 行都显示
  「未加载」，状态行提示 `supported=false`。
- 「环境」页只在 macOS / Linux 可用；Windows / WSL 下整页只显示「暂不支持」，不执行动作。
  安装 / 启动引擎 / 写 OneBot 这类会改系统的动作永远需要显式确认；其余动作失败只写日志，
  不影响 relay 连接。
- 停用插件的行后配置页随注册一起消失；这是插件管理器的契约，不是本插件的降级。
- 不做 i18n（当前中文直出）；随插件一起演进。
- 没有「恢复 profile 默认值」按钮：删掉 settings.json 后重启即可回到 patch 配置。

## 10. 相关文档

- 配置项全表与配置页覆盖矩阵：[config.md](./config.md)
- 画图 / 视频页契约 / 测试连接语义 / skill 生命周期：[comfy.md](./comfy.md)
- 环境页步骤 / 动作白名单 / 一键修复 / 安全边界：[env.md](./env.md)
- 总体架构 / 配置层：[architecture.md](./architecture.md)
- 聊天记录与清理：[chat-context.md](./chat-context.md) §7/§8
- 宿主渲染树与选座：[../../docs/dsh-ui-render-tree.md](../../docs/dsh-ui-render-tree.md)
  （0.1.5-rc.1 快照；本插件用的 `plugins.bundle.config` 是 0.2.x 插件页座位，
  以 DSH checkout 的 slot-catalog 为准）