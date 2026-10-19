# 聊天记录与消息拼接（规格）

> 状态：**已实现（v0.8.0，2026-10-19；v0.8.1 修正日志元信息与空文本消息；v0.9.0 增加媒体落盘引用）**；
> 本文既是规格也是现状记录。媒体下载细节见 [media.md](./media.md)。
> 聊天记录落在「群绑定的项目」隐藏目录里、DSH 会话可读；发给 DSH 的 prompt 由
> `lib/model/prompt.js` 统一拼接。真机验收待用户重启 GUI 后确认。
>
> 用户决策（2026-10-19）：
> 1. **每个群都可以有独立项目目录，在设置页自行配置**；
> 2. 隐藏目录名用**短的** `.qq-relay/`；
> 3. **不做跨机同步**（不进 git、不同步网盘）；
> 4. 聊天记录**默认不自动删除**，清理功能后续再放进设置页；
> 5. agent **直接 read 文件**即可，暂不提供 `qq_history` 工具。

## 1. 目标

- 每个群绑定一个项目目录；聊天记录写进该项目的隐藏目录 `.qq-relay/`，
  DSH 会话（agent）与人都能直接读。
- 发给 DSH 的 prompt 带上必要元信息：群名 / 群号 / 时间 / 条数 / @ 与引用标记 / 历史指针，
  修掉现在「只丢一句裸文本」的问题。
- 旧的全局聊天日志一次性迁移；目录不可写等故障不影响消息主流程。

## 2. 现状（v0.7.1）与缺口

入向链路：

```
OneBot 事件 → codec.toInternalEvent（segments → text，丢 at / reply 结构）
  ├─ 白名单 / 自己 / 去重
  ├─ chatLog.append → ~/.dsh/storages/dsh-qq-relay/chat/<群>/<日期>.jsonl
  ├─ 入向拦截器（审批可能吃掉这条）
  ├─ 直通（@ / 引用 / 命令）→ prompt = "[群名片或昵称] 正文"
  └─ 普通消息 → 闸门 pending 批次
       └─ jev 判定接话 → prompt = 每行 "[昵称] 正文"
            └─ sessionController.prompt（同一群固定一个持久会话）
```

缺口：

| 层 | 现状 | 问题 |
|---|---|---|
| 条内 | 只留文本段 | @ 了谁、引用了谁、图片/表情全丢；直通时 agent 甚至不知道「它被 @」 |
| 批内 | `[昵称] 正文` 每行一条 | 没有时间、群名、「这是新消息」的边界；直通用 `sender.card`、闸门只用 `nickname`，两处不一致 |
| 上下文 | jev 读聊天日志最近 60 条 | 只喂分类器，agent 看不到 |
| 持久 | 全局 storage 下的聊天日志 | **在会话 workspace 之外，agent 的 read/grep 读不到**；`/clear`、压缩、重建会话后断片 |

## 3. 目录契约

```
<project>/
└── .qq-relay/
    ├── .gitignore                 # 内容只有一行 `*`：自我忽略，永不进用户仓库
    ├── chat/
    │   └── <group_id>/
    │       └── YYYY-MM-DD.jsonl   # 本地时区按天分文件，append-only
    └── media/
        └── <group_id>/<日期>/<messageId>-<序号>.<ext>   # 图片 / 表情文件（v0.9.0，见 media.md）
```

- 一个项目一个 `.qq-relay/`；同项目多群时按 `chat/<group_id>/` 分目录。
- 项目目录见 §4；目录不存在时 `mkdir -p`（与 `workspaceRegistry.create` 行为一致）。
- `.gitignore` 只在缺失时写入，不覆盖用户已有文件；写失败只记 warn。
- 不生成 `meta.json` / digest / `inbox/` 快照——先用文件本身，有需求再加（见 §12）。

### 3.1 聊天日志行格式

```json
{"time":1792380107000,"groupId":"10002","messageId":"12345","userId":"10003","nickname":"tester","card":"tester","role":"member","text":"测试","mentionsSelf":true,"replyToId":null,"raw":"[CQ:at,qq=10001] 测试"}
```

- 在 v0.7.1 字段（`time / messageId / userId / nickname / role / text / raw`）之上新增
  `groupId`、`card`、`mentionsSelf`、`replyToId`。
- 读取端对缺字段补默认值（`''` / `false` / `null`），旧行照常可读。
- 纯图片 / 表情等没有文本的消息只写日志（`text` 为空），**不进闸门、不调分类器**；`text` 写入前 trim。
- 图片 / 表情消息新增可选 `media` 数组（`kind` / `status` / `path` / `bytes` / `contentType`，
  失败带 `reason`），`path` 是相对项目根的路径；格式与下载规则见 [media.md](./media.md) §4。
- `raw` 仍是 OneBot `raw_message`（含 CQ 码），调试 / 回放用。
- bot 自己的发言继续以 `role: "bot"`、`nickname: "bot"` 写入（jev 上下文依赖）。

## 4. 项目解析（每群）

优先级从高到低：

1. `mapping.json[groupId].workspacePath` —— 会话创建时钉住的项目，保证聊天目录与会话 cwd 一致；
2. `config.groupWorkspaces[groupId]` —— 设置页配置；
3. `config.workspace` —— 插件默认项目。

config 新增字段：

```yaml
dsh-qq-relay:
  config:
    workspace: ~/dsh/qq-relay-ws
    groupWorkspaces:
      "10002": ~/projects/my-app
    chatRetentionDays: 0   # 0 = 永不自动删除（默认；见 §7）
```

- `groupWorkspaces`：键为群号字符串（`/^\d+$/`），值为绝对路径（允许 `~`，归一化时展开）；
  非法键 / 非法路径记 problem（沿用 `problems` 机制，不 crash boot）。
- `chatRetentionDays`：`0`（永不自动删除）或 `7..3650`；v0.13.0 起设置页可改，并提供「立即清理」（§7 / §8）。
- 会话创建：`sessionController.create({ cwd: projectFor(groupId) })`，并把该项目写入
  `mapping.workspacePath`。
- 旧 mapping 的 `workspacePath` 为空时按 2 / 3 兜底解析，并在下次创建会话时补齐。

## 5. 消息拼接（prompt 格式）

统一由 `lib/model/prompt.js` 的纯函数生成（直通与闸门共用），入参：
`{ groupId, groupName, messages, projectDir, reason, now }`。

**闸门批次（多条）**：

```
[QQ群：示例群（10002）] 2026-10-19 11:21 新消息 3 条
[11:21:39] [tester] 测试
[11:21:47] [tester]（@你）再回复一句话
[11:22:10] [tester]（引用 12345）今天有空吗
[历史记录：.qq-relay/chat/10002/（JSONL，按天分文件）]
```

**直通（@ / 引用 / 命令，单条）**：

```
[QQ群：示例群（10002）] 2026-10-19 11:21 新消息 1 条（直通：@）
[11:21:39] [tester] 测试
[历史记录：.qq-relay/chat/10002/]
```

规则：

- 头部：群名（缺省用「群 <id>」）、群号、本地日期时间（取批次首条消息时间）、条数；
  直通时追加原因（`@` / `引用` / `命令`）。
- 行：`[HH:mm:ss] [显示名]（标记）正文`；显示名取 `card || nickname || userId`（统一两处逻辑）。
- 标记：`@你`（`mentionsSelf`）、`引用 <被引用 message_id>`（`replyToId` 非空）；都没有则省略。
- 媒体标记（v0.9.0）：`[图片：<相对路径>]` / `[表情：<相对路径>]` / `[表情 <faceText>]` /
  `[媒体下载失败]`，紧跟名字标记、在正文之前；**纯媒体消息也能生成 prompt**（@ 带图会转给 DSH）。
- 历史指针用**相对路径**（会话 cwd 即项目目录）：`.qq-relay/chat/<group_id>/`；
  不内联整段历史——agent 需要时自行 `read`。内联的仍然只有本批消息。
- 空白文本 / 空白批次不生成 prompt（保持现状）；正文不截断（保持现状）。

jev 上下文不变：仍走 chat log `readRecent`（按群项目目录解析），最近 60 条，含 bot 发言。

## 6. 迁移（v0.7.1 → v0.8.0）

- 旧位置：`~/.dsh/storages/dsh-qq-relay/chat/<group_id>/*.jsonl`。
- 启动时（配置就绪、relay 启动前）执行一次：
  1. 标记文件 `~/.dsh/storages/dsh-qq-relay/chat-migration.json` 存在 → 跳过；
  2. 枚举旧 `chat/` 下的群目录，按 §4 解析项目目录 → 目标 `<project>/.qq-relay/chat/<gid>/`；
  3. 逐文件移动；目标已有同名文件时**跳过**（不覆盖，保留旧文件）；
  4. 全部处理完写标记 `{ done: true, at, moved: { "<gid>": n } }`，删除空掉的旧群目录。
- 失败只记 warn，不阻断启动；跨卷 rename 失败退化为 copy + unlink。
- 幂等：标记存在即跳过；标记写失败重跑也不会覆盖目标文件。

## 7. 保留与清理

- 默认 `chatRetentionDays = 0` → **不自动删除**（用户决定）。
- 当 `> 0`：按天文件删除超期文件；启动后跑一次 + 每日一次（复用现有 prune 定时器）；
  清理按「已知群」循环（白名单 ∪ mapping），不再假设单一根目录。
- 决策日志 `gate/*.jsonl` 仍按 7 天保留（插件内部诊断数据，与聊天记录分开）。
- 设置页「聊天记录清理」区块（v0.13.0）：保留天数（0 / 7..3650）+「立即清理」按钮。
  立即清理与自动清理共用 `model/cleanup.js` 的 `pruneChatAndMedia`，**同时**清聊天日文件与媒体日期目录；
  手动清理允许 1..3650（比自动清理更激进），只删文件，不动 mapping / 会话 / 配置。

## 8. 设置页与 HTTP 契约

「群项目目录」区域（沿用现有映射表样式）：

- 行集合 = 白名单群 ∪ 已映射群 ∪ `groupWorkspaces` 中出现过的群。
- 列：群号 / 会话（标题 + sessionId，或「未创建」）/ 项目目录（input，placeholder = 默认项目路径）。
- 留空 = 跟随默认项目；保存时组装 `groupWorkspaces`（只提交有值的行；全空提交 `{}` 清空覆盖）。
- 已映射群改项目目录：保存只改配置，**不迁移已有会话**（cwd 在创建时固定）→ 行内提示
  「下次重新绑定后生效」；行内「重新绑定」按钮（二次确认）触发下方 rebind 路由。
- 表单 / 契约改动：
  - `EDITABLE_KEYS` 增加 `groupWorkspaces`、`chatRetentionDays`（v0.13.0 起两者都有表单入口）；
  - `maskConfig` 返回 `groupWorkspaces`（已展开绝对路径）与 `chatRetentionDays`；
  - `settings.json` 覆盖里 `groupWorkspaces` **整表替换**（不逐群合并）；
  - `RelayConfigView` / `RelayConfigPatch`（client Model 层）同步加字段。
- 新路由 `POST /dsh-qq-relay/api/rebind`，body `{ groupId }`，统一 status 信封：
  - 成功：删除该群 mapping → 用当前配置重建 relay（`applyConfig` 同一份配置）→ 返回最新 status；
  - 错误码：`REBIND_GROUP_INVALID`（400，群号非法 / 不在白名单）、`REBIND_NOT_STARTED`（409）。
  - 旧项目里的聊天记录不移动（留在原项目，历史可查）；新项目从空开始（jev 上下文冷启动）。
- 新路由 `POST /dsh-qq-relay/api/cleanup`（v0.13.0），body `{ days }`（1..3650），统一信封：
  - 成功：`{ cleanup: { days, chat, media, at }, status }`（删除计数 + 最新状态快照）；
  - 错误码：`CLEANUP_DAYS_INVALID`（400，天数非法）、`CLEANUP_NOT_CONFIGURED`（409，配置无效无法解析项目目录）。

## 9. 失败与容错

- 聊天目录创建 / 写入失败：记 warn，不阻断消息转发；prompt 仍带历史指针（文件可能不存在，
  agent read 会报错，可接受）。
- 项目路径非法（非绝对路径）：`normalizeConfig` 记 problem，整份配置视为无效（与 workspace 现状一致）。
- `.gitignore` 写失败：记 warn 继续。
- 迁移失败：warn + 继续启动；不自动删除旧数据。

## 10. 安全与隐私

- `.qq-relay/.gitignore` 内容 `*`：聊天记录永不进 git，`git status` 保持干净；不做跨机同步。
- 聊天记录含群聊正文，属敏感数据：不写 token / 凭据；文件权限沿用系统 umask。
- 项目目录可能被用户删除 / 移动：按「路径不存在 → mkdir」处理，旧记录不追回。

## 11. 测试计划

- `test/project.test.js`：项目解析优先级；`.qq-relay` 创建与 `.gitignore` 内容；chat 路径。
- `test/prompt.test.js`：闸门 / 直通格式、@ 与引用标记、时间、群名缺省、空批次。
- `test/model.test.js`（扩充）：`rootFor` 多项目、新字段默认值、按群 prune、迁移幂等。
- `test/cleanup.test.js`（v0.13.0）：保留天数校验、聊天日文件 + 媒体日期目录一次性清理。
- `test/settings.test.js`：`groupWorkspaces` / `chatRetentionDays` 的 pick / mask / merge / 校验；
  rebind 路由 400 / 409。
- `test/relay.test.js`：会话 cwd 用群项目；prompt 带历史指针；聊天记录写进项目目录；媒体下载与路径。
- `test/media.test.js`：媒体计划解析 / 下载 / 失败 / 归一化 / 清理（详见 [media.md](./media.md) §10）。
- 真机：设置页配置群项目 → @ 一条 → 项目目录下出现 `.qq-relay/chat/<gid>/<日期>.jsonl`；
  普通消息 prompt 带群名 / 时间 / 历史指针；重启后记录仍在。

## 12. 分期

- **v0.8.0（已实现，2026-10-19）**：§3–§8 全部（隐藏目录 + 群项目 + prompt 拼接 + 迁移 + 设置页 + 重新绑定）；
  单测 `test/{project,prompt,migration}.test.js` 等共 144 个通过。
- **v0.8.1（已实现，2026-10-19）**：聊天日志补全 @ / 引用元信息；无文本消息不进闸门（修正）。
- **v0.9.0（已实现，2026-10-19）**：入向图片 / 表情落盘到 `.qq-relay/media/`，聊天记录与 prompt 引用相对路径（见 [media.md](./media.md)）。
- **v0.13.0（已实现，2026-10-19）**：清理功能——设置页保留天数（0 / 7..3650）+「立即清理」
  （1..3650，`POST /dsh-qq-relay/api/cleanup`），与自动清理共用 `model/cleanup.js`。
- **Backlog**：可选 `inbox/` 批次快照、可读 digest、`qq_history` 工具、聊天记录跨机同步、私聊 / 媒体。
