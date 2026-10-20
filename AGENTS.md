# AGENTS.md — dsh-qq-relay 开发纪律

> 供 AI 代理与人类开发者共用：**在本插件里动手前先读本文件**。
> 本文件只放**本插件自己的入口与硬性纪律**（文档在哪、改完怎么验收）；
> 仓库级规则见上级 [`../../AGENTS.md`](../../AGENTS.md)，功能 / 用法见
> [README.md](./README.md)，版本历史见 [docs/changelog.md](./docs/changelog.md)。
>
> 本插件是：**DSH ↔ QQ 机器人的桥插件**——host 半身连接 QQ 机器人协议端、在 QQ 与 DSH
> 会话之间双向转发消息，client 半身在**插件面板的组合包页**里提供配置页。当前 **v0.25.5**：P1 @ 直通
> 已真机验收、P1.5 基础配置页已落地、P2.1/P2.2 消息闸门骨架与收尾已落地、P2.3 jev 分类器
> 已接（OpenRouter）、P3 `qq_send` 主动推送与 QQ 侧审批已落地、P4 群项目目录 + 聊天记录
> `.qq-relay/` + prompt 拼接已落地、P5 QQ 侧命令层（`/new` / `/stop` / `/status` / `/help`）
> 已落地、P6 回复体验（引用触发消息 / 处理中占位 / 直通连发合并）已落地、
> P4.2 媒体双向（入向视频 / 语音落盘 + `qq_send` 出向图片 / 文件）已落地、
> P4.3 聊天记录清理（保留天数 + 立即清理）已落地、P7 client 面板增强
> （闸门每群状态 / 最近消息 / 映射管理）已落地、P8 戳一戳识别与回戳
> （被戳接话 / 互戳记录 / `qq_poke`）已真机验收、P9 入向群文件
> （`group_upload` → 下载落盘 → 可选直通）已落地（2026-10-19）、P10 配置页迁到插件面板
> （`plugins.bundle.config`，二级页面现为七个，样式走宿主 `--dsw-*` token）已落地（v0.17.0）；
> v0.18.0 修正触发规则（引用别人消息 / @ 别人不再触发会话）并加**可选代答**
> （`proxyReply`：@ 名单里的人且 TA 最近没说话时代 TA 回应，默认关闭）；
> v0.19.0 加**角色预设与轻量人设**（bundle patch 自带 `qq-relay` agent preset，配置页可选
> preset、prompt 注入 `persona` 与「最终回复自动回发」平台约定）；v0.20.0 把预设收进插件
> （`presets.json`，配置页「预设」页增删改 + 逐预设模型 / 思考层级 / 权限，动态注册，见
> [docs/persona.md](./docs/persona.md)）；v0.21.0 加**画图能力**（探测配置的 ComfyUI，连上后动态
> 注册插件自带的 `comfy-image` runtime skill + 配置页「画图」页，见
> [docs/comfy.md](./docs/comfy.md)）；v0.21.1 修 `qq_send` 出向图片 / 文件转发（runtime 包装补
> `sendImage` / `sendFile`）与 workspace 挂载失败导致的「未分组」会话（失败重试 + 启动补挂 +
> `status.workspace.attachIssues` 告警）；v0.22.0 加**视频生成**（同一个 ComfyUI 再动态注册
> `comfy-video` skill：MiniMax H3 `h3-t2v` / `h3-i2v` / `h3-r2v`；`qq_send` 新增 `videos`
> 内联视频消息；skill 状态改为 `status.comfy.skills` 数组，见 [docs/comfy.md](./docs/comfy.md)）；
> v0.23.0 加**环境一键配置**（配置页「环境」页：`environment` 配置段 + 7 步诊断 + 白名单动作 /
> 一键修复 / 动作日志，见 [docs/env.md](./docs/env.md)）；v0.24.0 把 jev（OpenRouter）API key
> 加进「行为」页（`gate.jevApiKey` 只写不读、保存即热切换分类器，环境变量仍兜底）；
> v0.25.0 修「一键修复」：改成**逐步补全**——按计划一次只执行一个动作、每步后重新探测，
> 安装 / 起引擎 / 起 NapCat 容器 / 写 OneBot / 回填串成一条链（系统类动作先确认），
> 不再跳过 NapCat 容器；写 OneBot 时 token 两边都空则自动生成（见 [docs/env.md §4.1](./docs/env.md)）；
> v0.25.1 修环境探测可读性与兜底：docker / colima 失败显示 stderr 原文（不再只给「退出码 1」），
> `docker info` 直连失败自动改用 `--context colima`，Colima 在跑但 daemon 连不上时提供
> `restart-daemon`（`colima restart`），动作没推进就跳过并继续后面的步骤；
> v0.25.3 **回滚 v0.25.2** 的「按 docker endpoint 识别 OrbStack / Docker Desktop」——环境页只认
> Colima（`colima start` 会创建 context，指向别的引擎时用 `docker context use colima`），
> 不再提供 `start-orbstack` / `install-orbstack` 动作；
> v0.25.4 修「OneBot 没配好就存不了 WebUI token」：连接信息（`wsUrl` / `accessToken` / `selfId`）
> 留空只算「待补全」（`ok: true` / `ready: false`），配置照常落盘、relay 暂不启动——新机器可以
> 先在「环境」页存 WebUI token 再一键修复；写错的字段仍 400 拒绝；
> v0.25.5 修 DSH 0.2.1-rc.2 下**预设注册失败**：组合表按新版 `standard` 对齐（`tool-subagent` 两行
> 去掉已移除的 `toolFilter`，否则整份 preset 变「未注册」），注册时再按宿主报错自动剔除
> 「no longer supported」字段重试（见 [docs/persona.md §2.2](./docs/persona.md)）；
> 上级 §0 已仅对本插件解除。

## 0. 布局（快速地图）

- `src/` — client 半身源码（React + TS），组合根 `src/client.tsx`，构建产物 `lib/client.js`；
  落点 = 插件面板里 dsh-qq-relay 组合包页面（`plugins.bundle.config`，key = 包名）；
  现有 `src/model/{api,form}.ts`（HTTP 信封、表单 ↔ patch 纯逻辑）+ `src/viewmodel/{settings,env}.ts`
  （状态 / 动作 hook、状态文案、二级页面定义；env.ts = 「环境」页轮询 / 动作 / 日志）+ `src/view/`（`SettingsPage.tsx` 外壳、
  `controls.tsx` 公共控件、`theme.ts` 注入的 `--dsw-*` 主题样式、
  `panels/{Connection,Env,Project,Behavior,Comfy,Presets,Records}Panel.tsx`；`ComfyPanel` = 「画图 / 视频」
  二级页（v0.22.0：开关 / 地址 / 超时 / skill 开关 / 测试连接 / 运行状态 / 逐条展示两个 skill 的状态）；
  `EnvPanel` = 「环境」页（v0.23.0：环境目录 / WebUI token、7 步检查表、一键修复 / 动作日志 / 安全说明；
  v0.25.0 起增修复计划提示 + 一次性确认））；
  新增代码按 MVVM 三层落位（`src/model/` → `src/viewmodel/` → `src/view/`，分层细则见 §2 第 4 条）
- `lib/` — 自包含运行时产物；`index.js` 为**手写 host 半身**，
  分层 = `lib/controller/`（协议端接入、消息编解码、路由与转发、配置页 HTTP 面）+ `lib/model/`
  （配置、设置覆盖、会话映射、状态、聊天日志、回复）；P1 实现 `controller/onebot/{client,api,codec}.js`、
  `controller/relay.js`、`model/{config,mapping,state,chat-log,reply}.js`；P1.5 新增
  `controller/{runtime,config-routes,http}.js` 与 `model/settings.js`；P2.1/P2.2 新增 `controller/gate.js`
  （去抖 / 最小间隔 / 慢路 / dshBusy / 分类器注入）、`model/gate.js`（闸门纯逻辑）与
  `model/gate-log.js`（决策日志）；P3 新增 `controller/tools.js`（`qq_send` 工具定义，v0.22.0 起含 `videos`，
  手写 ToolDefinition、不 import `@deepseek-ai/*`）、`controller/approval.js`（QQ 侧审批桥）与
  `model/approval.js`（命令匹配 / 角色 / 文案）；P2.3 新增 `model/jev.js`（OpenRouter
  Decisions API 分类器，零依赖、全局 fetch、fail closed）；P4 新增 `model/{project,prompt}.js`
  （群项目目录解析 / `.qq-relay` 隐藏目录 / prompt 拼接），聊天日志改按群项目路由
  （`model/chat-log.js` 的 `rootFor` + 旧日志迁移）；v0.8.1 修正聊天日志 @ / 引用元信息，
  无文本消息不再进闸门（`codec.toChatLogRecord` / `controller/gate.js`）；P4.1 新增
  `model/media.js`（入向图片 / 表情 / 视频 / 语音落盘，聊天记录与 prompt 引用路径；
  v0.12.0 起含出向图片 / 文件的工具侧支撑：`controller/relay.js` 的 `sendImage` / `sendFile`、
  `controller/tools.js` 的 `images` / `file` 参数，本地文件转 base64 经 NapCat 发送；
  v0.16.0 起含入向群文件 `attachGroupFile`：`group_upload` → `get_group_file_url` → 落盘，
  relay 的 `handleGroupFile` 负责直通 / `files` 配置段）；
  P5 新增 `model/commands.js`（QQ 侧命令层：解析 / 角色校验 / 回复文案），
  命令分发在 `controller/relay.js`（`proceedInbound` 里先于直通 / 闸门）；P6 在
  `controller/relay.js` 增加引用回复 / 处理中占位 / 直通连发合并（`reply` 配置段）；
  P4.3（v0.13.0）新增 `model/cleanup.js`（立即清理天数校验 + 聊天 / 媒体一次性清理，
  自动清理共用），路由 `POST /dsh-qq-relay/api/cleanup` 在 `controller/config-routes.js`，
  配置页「记录」二级页在 `src/view/panels/RecordsPanel.tsx`；P7（v0.14.0）新增 `model/panel.js`
  （最近消息查询校验 + 只读视图），面板路由 `messages` / `mapping/delete` / `mapping/clear`
  在 `controller/config-routes.js`，relay 暴露只读 `snapshot()` 供状态快照使用；P8（v0.15.0）在
  `controller/relay.js` 增加戳一戳识别（`handlePoke`：被戳直通 / 互戳记录 / 每群冷却）与出向 `poke`，
  `controller/tools.js` 增加 `qq_poke`（NapCat `group_poke`），配置段为 `poke`；
  v0.21.0 新增 `controller/comfy.js`（ComfyUI 探测 / `ctx.skills.register` 动态注册 / 探测失败不注销的
  抖动保持 / 「测试连接」）、`model/comfy.js`（`comfy` 配置校验 / 脱敏视图 / `COMFY_SKILLS` 与模板渲染）、
  v0.23.0 的 `controller/env.js`（环境 7 步探测 / 固定 argv 动作 / 后台命令 + 日志 / 一键修复；
  v0.25.0 起逐轮推进 + `fixPlan`）与
  `model/env.js`（`environment` 配置校验与脱敏视图 / compose 生成与解析 / OneBot 校验 / 步骤求值 /
  动作白名单 / 日志环形缓冲）与
  `lib/skills/comfy-image/`（插件自带 skill：`SKILL.md` 出图 + `SKILL-video.md` 视频两个模板、
  `scripts/comfy_run.py`、`workflows/`（qwen 3 + moss-t2i + minimax_h3_* 3）、
  `references/`（含 `video-workflows.md`）；配置页「画图 / 视频」页是 `src/view/panels/ComfyPanel.tsx`），
  对应 `comfy` 配置段与 `docs/comfy.md`；v0.22.0 的 `comfy-video` 与出向视频链路：
  `controller/relay.js` 的 `sendVideo`、`controller/onebot/api.js` 的 `sendGroupVideo`、
  `controller/tools.js` 的 `videos` 参数、`model/media.js` 的 `OUTBOUND_VIDEO_MAX_BYTES` / `isVideoExt`
- `docs/` — 本插件的长期文档（一文档一主题）：架构、OneBot 通道、消息闸门、路线图、client 配置页、画图 / 视频、环境配置；新增后在 README「文档索引」登记
- `scripts/` — `wrap-client.mjs`（client 产物包装）· `check-syntax.mjs` · `check-docs.mjs`

> **本项目不使用 openspec**（用户 2026-10-16 决定）：没有 `openspec/`，也没有
> `.agents/skills/openspec-*`。规格 / 设计写进 README 与 `docs/`；不要擅自
> `openspec init` 把它补回来，确要启用先问用户。

## 1. 文档位置速查（文档优先：先读后写）

| 用途 | 位置 | 何时看 |
|---|---|---|
| 本插件总览 / 用途 / 用法 | [README.md](./README.md) | 任何任务第一步 |
| 版本历史 / 某行为何时引入 | [docs/changelog.md](./docs/changelog.md) | 追历史与动机 |
| 机制细节 / 设计取舍 / 协议端选型 / 已知问题 | `docs/`（一文档一主题，kebab-case 命名；已建立：architecture / onebot-channel / gate / chat-context / media / roadmap / changelog / client / tools / poke / approval / commands / reply / config / persona / comfy / env） | 动功能前对齐方向 |
| 仓库纪律 / 渲染树选座 / 工程基线 | 上级 [../../AGENTS.md](../../AGENTS.md)、[../../docs/](../../docs/) | 跨插件协作、装入 profile、选 slot |

- `docs/` 就在**本插件目录下**；新增文档时在 README 的「文档索引」登记一行（路径 + 一句话 +
  何时看），**不在插件根目录放散文件**。
- 探索顺序固定为**文档 → 源码**（本项目无 openspec，规格即为 README + `docs/`）；
  文档与代码冲突时以代码 / 单一实现源为准，并顺手修正腐化文档。

## 2. 硬性纪律

1. **文档同步**：改了行为 / 交互 / 工具 schema / 路由契约 / 版本号 → 在**同一次变更**里同步
   README（文档索引）与 `docs/` 对应文档（版本历史写 `docs/changelog.md`），不留「先写代码、文档后补」的债。
2. **提交前跑 `pnpm check`**：本插件的验收闸门 =
   `node scripts/check-syntax.mjs`（`lib/` 与 `scripts/` 全部 JS 语法 + `dsh.bundle.patch` /
   `dsh.client` 元数据 + patch 行齐备）
   && `tsc --noEmit`（client 半身类型检查，**需先 `pnpm install`**）
   && `node scripts/check-docs.mjs`（**文档↔源码配对**：改了源码 / 装配面却没同步
   `README.md` / `AGENTS.md` / `docs/` → 直接失败）。host 纯逻辑另有 `pnpm test`
   （node:test，零依赖）——改 `lib/model/` 时先跑它。任一环红即视为未完成，修到全绿再提交；
   确属纯代码微调要跳过配对校验，须显式 `--allow` / `SKIP_PNPM_CHECK=1` 并在 commit message
   写明理由。`lib/client.js` 是构建产物，不触发配对要求（重新构建即可）。
3. **零外部依赖 + 永不 crash boot**：`lib/` 是自包含运行时（运行时只用 node: 内置模块）；
   client 半身构建时 React 必须保持 external（打进第二份 React = Invalid hook call）；
   `apply(ctx)` 取不到 slots / 服务时**静默返回**。
4. **client 半身只依赖 React**：与 DSH 的接触面全部走**运行时服务查找**（`ctx.get('slots')` …），
   **不 import 任何 `@deepseek-ai/*` 的值**——升级 harness 世代时不必跟着改依赖版本。
   新增代码必须落在 `src/model/`（类型 / 纯逻辑 / 数据访问，不认识 React）、
   `src/viewmodel/`（呈现态与动作，可依赖 Model，不放 JSX）、`src/view/`（React 组件与样式）
   三层之一，`src/client.tsx` 只做注册与装配；host 半身同理 `lib/controller/` 只依赖 `lib/model/`。
5. **不使用 openspec**：见 §0 说明——不要新建 `openspec/` 或 `.agents/skills/openspec-*`。
6. **提交**：Conventional Commits、中文 subject（`<主题>: <一句话描述>`）。
7. **不自行 kill / 重启 DSH**：装配 / 依赖加载类改动在交付说明标注「需要用户重启 DSH」。

## 3. 需要用户执行的收尾

- 装入 profile（`dsh plugin --profile <name> add link:…`）与**重启该 profile 的 GUI** 由用户执行，
  本插件只交文档说明；链接现状同步上级 `PROFILES.md`。
- **发布**：版本号写 `package.json`、版本说明写 `docs/changelog.md`；提交后打 `vX.Y.Z` tag 并 push，
  GitHub Actions 的 `Release` 工作流会自动创建 Release（正文取自 changelog 对应段，附 `npm pack`
  tarball）。发布前本地 `pnpm build` 并提交 `lib/client.js`，工作流会校验两者一致。
