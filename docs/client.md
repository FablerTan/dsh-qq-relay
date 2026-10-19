# client 半身与设置页

> 状态：**P1.5 基础配置页已落地（2026-10-19）；P4 群项目目录 + 重新绑定已落地（2026-10-19）**。
> 本文是 client 半身的契约文档：设置页长什么样、配置怎么分层、HTTP 面怎么调、保存后哪些东西立刻生效。
> 总体架构见 [architecture.md](./architecture.md)，配置项定义见其 §2.1。

## 1. 定位

设置面板 →「QQ 机器人」（注册进 `settings.section`，id `dsh-qq-relay`，order 90）。
不新增顶部入口、不占右侧栏——一个设置页解决「看一眼状态 + 改配置」。

页面由 host 的三个 HTTP 路由驱动，**同源、无独立鉴权**（GUI 默认只绑 loopback，
与仓库既有插件一致；不要把这个插件挂到公网监听上）。

## 2. 页面内容

| 区块 | 内容 |
|---|---|
| 状态行 | 已连接（昵称 / QQ 号）· 连接中（断线自动重连）· 未启动（配置待补全 / 另一个实例持锁，显示 pid） |
| 配置表单 | `wsUrl` · `accessToken`（只写，留空不修改）· `selfId` · `groups` · `workspace`（默认项目）· `sessionTitle` · `replyChunkSize` · `commandPrefixes` |
| 闸门表单 | `gate.debounce` · `gate.fastMinReplyInterval` · `gate.jevThreshold`（保存即重建闸门，无需重启；`enabled` 等其余 gate 字段仍 patch 只读）。宿主未加载 v0.10.0 时页面回退显示默认值并提示重启，不会显示 0 |
| 操作 | 「保存并重连」「重新连接」「刷新」，以及未保存修改提示 |
| 群项目目录 | 可编辑表格：群号 / 会话（标题 + id 或「未创建」）/ 项目目录（留空 = 跟随默认项目）/ 「重新绑定」按钮（P4） |
| 提示 | host 回来的校验问题（如 `wsUrl 必填`）逐条显示；保存成功/失败有状态提示 |

页面每 5 秒静默刷新一次状态（只刷新连接态与映射，不覆盖正在编辑的表单）。

## 3. 配置层序与持久化

~~~text
profile patch（~/.dsh/profiles/<name>/cordis.patch.yml 的 config）
  ↓ 只允许覆盖 EDITABLE_KEYS
settings.json（~/.dsh/storages/dsh-qq-relay/settings.json，设置页保存）
  ↓ normalizeConfig 校验
生效配置（relay 实际使用）
~~~

- 可覆盖字段：`wsUrl / accessToken / selfId / groups / workspace / groupWorkspaces /
  chatRetentionDays / gate.{debounce,fastMinReplyInterval,jevThreshold} / sessionTitle /
  replyChunkSize / commandPrefixes`；`reconnect` 等保持 patch 只读。
  `groupWorkspaces` 由「群项目目录」表格整表提交（空表 = 清空覆盖）；`chatRetentionDays` 本期只有配置、
  没有表单入口（清理 UI 排 v0.8.2）。
- **保存即生效**：host 用新配置重建 client + relay（单实例锁不重入），不需要重启 GUI。
- 校验失败 → 返回 400，**不写盘、不改内存配置**；页面显示 host 的 problems。
- `settings.json` 是普通 JSON（`{ version, updatedAt, config }`），原子写；手动改它
  需要重启 GUI 才生效（页面保存才会触发热替换）。
- token 只写不读：`settings.json` 里可能存着设置页写入的 token；HTTP 响应永远只给
  `accessTokenConfigured` 与 `accessTokenSource`（`profile` / `settings`）。

## 4. HTTP 契约

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

状态快照字段：

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
    "gate": { "debounceMs": 3000, "fastMinReplyIntervalMs": 10000, "jevThreshold": 0.6 },
    "sessionTitle": "QQ群：{groupName}",
    "replyChunkSize": 1500,
    "commandPrefixes": ["/dsh"],
    "accessTokenConfigured": true,
    "accessTokenSource": "profile"
  },
  "gate": { "enabled": true, "classifier": "jev", "model": "typesafe/jev-1.14", "threshold": 0.7, "slowTimer": 7200000 },
  "mappings": [{ "groupId": 10002, "sessionId": "session-…", "title": "QQ群：…", "workspacePath": "…", "createdAt": 0 }]
}
~~~

错误码：`CONFIG_INVALID` / `CONFIG_EMPTY` / `CONFIG_BAD_JSON` / `REBIND_GROUP_INVALID` → 400；
`CONFIG_BODY_TOO_LARGE` → 413；`RELAY_NOT_STARTED` / `RELAY_NOT_CONFIGURED` / `REBIND_NOT_STARTED` → 409；
其余 → 500。请求体上限 64 KiB。

## 5. 热更新语义

| 改动 | 生效方式 |
|---|---|
| `wsUrl` / `accessToken` / `selfId` | 保存后立即断开旧连接、用新配置重连 |
| `groups` / `commandPrefixes` / `replyChunkSize` | 立即对新事件生效 |
| `workspace` / `groupWorkspaces` / `sessionTitle` | 只影响**之后新建**的会话；已存在的群映射保持原项目 / 标题（表格可查）。改已映射群的项目后点「重新绑定」才会换会话；旧项目聊天记录不移动 |
| `gate.debounce` / `gate.fastMinReplyInterval` / `gate.jevThreshold` | **立即生效**：保存后重建闸门，阈值由分类器每次判定时读取 |

- 重连不重入单实例锁：锁属于进程，连接属于运行实例（`controller/runtime.js`）。
- **保存会立即断开当前 WS**：进行中的 QQ 触发回合会被中止且不回发（配置改动属低频操作，
  优先保证新配置生效）；需要保留在途回合时，等它结束再保存。
- 另一个进程持锁时：本进程 `started=false`、页面显示持锁 pid；保存配置只会落盘，
  对手进程不会热加载（它没有收到信号），需要它重启才会读到 settings.json。

## 6. 代码布局

~~~text
src/
├── client.tsx            # 组合根：ctx.get('slots') → settings.section 注册
├── model/api.ts          # HTTP 信封、状态视图类型、fetch 注入
├── model/form.ts         # 表单 ↔ patch 纯逻辑（解析群号 / 前缀 / 数字、dirty 判定）
└── view/SettingsSection.tsx  # 页面组件（React，hooks + 内联样式，无第三方 UI 依赖）
~~~

构建：`pnpm build`（vite 库模式 → `dist/client.cjs` → `scripts/wrap-client.mjs` →
`lib/client.js`，已入库）；React 保持 external，client 只依赖 React。

## 7. 验证

- `pnpm test`：`test/settings.test.js`（覆盖层序 / 脱敏 / 原子读写 / 路由面）、
  `test/apply.test.js`（假 ctx + 临时 HOME，跑通注册、状态、保存、重连）。
- `pnpm check`：语法 + 元数据 + `tsc --noEmit` + 文档↔源码配对。
- 真机：重启 profile 的 GUI → 设置 →「QQ 机器人」→ 改一个字段保存 → 观察状态行与日志里
  `[relay] 配置已保存…并已重连`；群里 @ 机器人确认转发未中断。

## 8. 已知边界 / 后续

- 页面可直接改「群项目目录」，并为已映射群提供「重新绑定」；清空全部映射 / 删除会话仍无入口。
- 聊天记录清理（保留天数 + 立即清理）排 v0.8.2。
- 不做 i18n（当前中文直出）；随插件一起演进。
- 没有「恢复 profile 默认值」按钮：删掉 settings.json 后重启即可回到 patch 配置。
- 闸门可编辑项（去抖 / 最小间隔 / jev 阈值）已进表单（v0.10.0）；`enabled` / `model` / `slowTimer`
  仍为 patch 只读。
- `commands`（QQ 侧命令层）目前是 patch 只读配置，设置页暂无入口。
