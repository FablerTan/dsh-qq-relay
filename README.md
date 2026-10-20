# dsh-qq-relay

把 **DeepSeek Harness（DSH）** 接入 **QQ 机器人**的自研插件（bundle 包，host + client 双半身）。
当前 **v0.23.0**：P1「@ 直通」已真机验收（2026-10-19）；P1.5 基础配置页已落地（v0.17.0 起
搬到**插件面板里 dsh-qq-relay 组合包自己的页面**，拆成「连接 / 环境 / 项目 / 行为 / 画图·视频 / 预设 / 记录」二级页面）；
P2.1/P2.2 消息闸门已落地（去抖 / 最小间隔 / 慢路 / 决策日志 / 发送队列，
P2.3 jev 分类器已接（OpenRouter `typesafe/jev-1.14`），`gate.enabled` 默认关）；P3 已落地 `qq_send`
主动推送与 QQ 侧审批；P4 已落地**群项目目录 + 聊天记录 `.qq-relay/` + prompt 拼接**（2026-10-19）；
P4.1 已落地入向媒体落盘；P5 已落地 **QQ 侧命令层**（`/new` / `/stop` / `/status` / `/help`，
见 [docs/commands.md](./docs/commands.md)）；P6 已落地**回复体验**（引用触发消息 / 处理中占位 /
直通连发合并，见 [docs/reply.md](./docs/reply.md)）；P4.2 已落地**媒体双向**（入向视频 / 语音落盘，
`qq_send` 出向图片 / 文件，见 [docs/media.md](./docs/media.md)）；P4.3 已落地**聊天记录清理**
（保留天数 + 立即清理，见 [docs/chat-context.md](./docs/chat-context.md) §7）；P7 已落地**client 面板增强**
（闸门每群状态 / 最近消息 / 映射管理，见 [docs/client.md](./docs/client.md)）；P8 已落地并真机验收**戳一戳识别与回戳**
（被戳接话 / 互戳记录 / `qq_poke`，见 [docs/poke.md](./docs/poke.md)）；P9 已落地**入向群文件**
（`group_upload` → 下载落盘 → 可选直通，见 [docs/media.md](./docs/media.md) §5.2）；P10 已落地
**配置页迁到插件面板 + 二级页面 + 跟随宿主主题**（v0.17.0，见 [docs/client.md](./docs/client.md)）；P13.1 已落地
**角色预设与轻量人设**（v0.19.0：插件自带「QQ 群聊」agent preset + 配置页可选 preset + prompt 注入人设与
平台约定，见 [docs/persona.md](./docs/persona.md)）；v0.20.0 起预设可在配置页**新建 / 编辑 / 删除**，
并逐预设设置**模型、思考层级、权限**（动态注册，无需改 profile）；v0.21.0 加**画图能力**——探测配置的
ComfyUI，连上后把插件自带的 `comfy-image` skill 动态注册给 DSH，群里出图 / 改图后产物用 `qq_send`
发回群；v0.22.0 加**视频生成**——同一个 ComfyUI 再动态注册 `comfy-video` skill（MiniMax H3），
`qq_send` 新增 `videos`（内联视频消息），群里可文生视频 / 首帧 / 参考图转视频（见
[docs/comfy.md](./docs/comfy.md)）；v0.23.0 加**环境一键配置**——配置页「环境」页把
Docker / Colima / NapCat / 扫码登录 / OneBot 配置 / 插件回填收敛成 7 个检查与白名单动作，
新机器可从零装到 relay 连上（见 [docs/env.md](./docs/env.md)）。设计见
[docs/architecture.md](./docs/architecture.md)，协议端选型与部署见
[docs/onebot-channel.md](./docs/onebot-channel.md)，配置页契约见 [docs/client.md](./docs/client.md)。

> **v0.1.0**：按上级技能 `dsh-plugin-project-init` 初始化。
> **本项目不使用 openspec**（用户 2026-10-16 决定）——没有 `openspec/`，也没有
> `.agents/skills/openspec-*`；规格与设计随 README 与 `docs/` 走。
> 空骨架唯一的可见副作用：host 半身加载时打一行日志，用于确认 link + bundle 组合生效。
> 装完 / 改完需**重启对应 profile 的 GUI**（由用户执行，本插件不自行 kill / 重启 DSH）。

## 用途（P1 已实现；后续阶段见 [roadmap](./docs/roadmap.md)）

DSH 与 QQ 之间的**双向桥**：

- **QQ → DSH**：QQ 群里的消息经过「消息闸门」过滤后投给某个 DSH 会话，agent 跑完把回复回发群聊；
- **DSH → QQ**：会话 / 工具侧主动往 QQ 推消息（通知、任务完成提醒等，P3）。

**已定案（2026-10-18）**：

- 协议端：**真实 QQ 号 + NapCat + OneBot 11 正向 WebSocket**——DSH 单轮可能超过 5 分钟，官方机器人的群聊被动回复窗口（5 分钟）会让长任务结果只能改走主动消息（受配额、可被关闭）；真实 QQ 号可随时发送。官方通道方案保留为备选（[docs/official-bot-channel.md](./docs/official-bot-channel.md)）。
- 账号：一个 **QQ 小号**登录 NapCat 作 bot，主号操作；**群聊优先**（群 @ 直通 + 群内普通消息经闸门过滤）；单聊放 P3。
- 消息闸门：**10 分钟快路 + 2 小时慢路 + jev 分类器**，@ 直通、最小发言间隔（见 [docs/gate.md](./docs/gate.md)）。
- 运行形态：host 半身单进程插件；client 半身在**插件面板**（左栏「插件」图标）的组合包页里提供配置页（不做独立应用）；插件不管理 profile。
- 已知代价：非官方协议端**有封号风险**，需要常开 QQ 客户端 + NapCat。
- 部署形态：NapCat 跑在 **Docker（macOS 用 Colima）**里，插件连 `127.0.0.1:3001`；macOS 原生 Shell 在 macOS 26 + arm64 上不可用（见 [onebot-channel.md §3.1](./docs/onebot-channel.md)）。

**已交付**：OneBot 接入与 @ 直通（P1）、基础配置页（P1.5：连接状态 / 配置编辑 / 群映射）、
消息闸门骨架与收尾（P2.1/P2.2：去抖 / 最小间隔 / 慢路 / 状态持久化 / 决策日志 / 发送队列）、
jev 分类器（P2.3：OpenRouter `typesafe/jev-1.14`，阈值判定 + fail closed）、
DSH → QQ 主动推送工具 `qq_send`（P3）、QQ 侧文本审批（P3：群里回复「同意 / 拒绝」）、
群项目目录与聊天记录 `.qq-relay/` + prompt 拼接（P4，见 [chat-context.md](./docs/chat-context.md)）、
入向图片 / 表情落盘与路径引用（P4.1，见 [media.md](./docs/media.md)）、
QQ 侧命令层（P5：`/new` 换会话 / `/stop` 中断 / `/status` 状态 / `/help`，群主 / 管理员可用，
见 [commands.md](./docs/commands.md)）、回复体验（P6：引用触发消息 / 8 秒「处理中」占位 /
400ms 连发合并，见 [reply.md](./docs/reply.md)）、媒体双向（P4.2：入向视频 / 语音落盘，
`qq_send` 出向图片 / 文件，见 [media.md](./docs/media.md)）、聊天记录清理（P4.3：保留天数 +
立即清理，见 [chat-context.md](./docs/chat-context.md) §7）、client 面板增强（P7：闸门每群状态 / 最近消息 /
映射增删，见 [client.md](./docs/client.md)）、戳一戳识别与回戳（P8：被戳接话 / 互戳记录 / `qq_poke`，
见 [poke.md](./docs/poke.md)）、入向群文件（P9：`group_upload` → 下载落盘 → 可选直通，
见 [media.md](./docs/media.md) §5.2）、触发规则修正 + 代答（v0.18.0：引用别人消息 / @ 别人不再触发；
可选「@ 名单里的人且 TA 最近没说话时代 TA 回应」，见 [gate.md](./docs/gate.md) §2.1/§2.6）、
角色预设与轻量人设（v0.19.0：插件自带「QQ 群聊」agent preset / 配置页可选 preset / prompt 注入人设与
平台约定，见 [persona.md](./docs/persona.md)）、预设管理与预设级模型 / 思考层级 / 权限（v0.20.0：
配置页「预设」页可增删改，presets.json + 动态注册，见 [persona.md](./docs/persona.md) §2）、
画图 / 视频能力（v0.21.0 / v0.22.0：ComfyUI 探测 + 动态注册 `comfy-image`（出图）/
`comfy-video`（视频 MiniMax H3）两个 runtime skill，配置页「画图 / 视频」页 + `POST /api/comfy/test`；
`qq_send` 支持 `images` / `videos`，见 [comfy.md](./docs/comfy.md)）。
**仍未定案**：群审批（按钮）——先落 `docs/` 再实现。

## 目录结构

```
dsh-qq-relay/
├── package.json          # name + dsh.bundle.patch + dsh.client（link 加载的必要元数据）
├── cordis.patch.yml      # bundle patch：把插件行插入 profile roster
├── vite.config.ts        # client 半身库模式构建（React / @deepseek-ai 全 external）
├── tsconfig.json         # client 半身类型检查（include 只有 src）
├── pnpm-workspace.yaml   # pnpm 11 构建设置（放行 esbuild、关自动 peer 安装）
├── lib/
│   ├── index.js          # host 半身**手写**组合根（读配置、单实例锁、装配）
│   ├── controller/
│   │   ├── onebot/       # codec（事件编解码）· client（WS）· api（action 封装）
│   │   ├── runtime.js    # relay 运行实例：整份配置热替换（配置页保存后重建连接）
│   │   ├── config-routes.js # 配置页 HTTP 面（status / config / reconnect / rebind / cleanup / messages / mapping / presets / comfy test / env）
│   │   ├── http.js       # JSON 信封与请求体读取共用件
│   │   ├── gate.js       # 闸门调度：去抖批次 / 最小间隔 / 慢路定时（分类器注入）
│   │   ├── tools.js      # qq_send（文本 / 图片 / 视频 / 文件）/ qq_poke 工具定义（手写 ToolDefinition，零外部依赖）
│   │   ├── approval.js   # QQ 侧审批桥：approval/request → 群消息 → 文本命令决定
│   │   ├── relay.js      # 入向判定 + 会话映射 + 出向回发 + 断线发送队列 + 主动推送
│   │   ├── comfy.js      # ComfyUI 探测 + 动态注册 comfy-image / comfy-video 两个 skill（v0.21.0 / v0.22.0）
│   │   └── env.js        # 环境页探测 + 白名单动作（Docker / Colima / compose / NapCat / OneBot / 回填，v0.23.0）
│   ├── model/            # 配置 / 设置覆盖 / 会话映射 / 状态+锁 / 群项目目录 / 聊天日志 / 清理 / 面板 / 媒体落盘 / prompt 拼接 / 决策日志 / 回复切分 / 闸门 / jev / 审批 / comfy 配置与 skill 模板渲染 / environment 配置与步骤求值
│   ├── skills/comfy-image/ # 插件自带画图 / 视频 skill（SKILL.md / SKILL-video.md 模板 / 运行器 / 7 个工作流 / 参考），随包发布
│   └── client.js         # client 半身构建产物（已入库，clone 即可加载）
├── test/                 # host 单测（node:test，零依赖；含配置页 / apply 集成）
├── src/                  # client 半身源码：model（HTTP 信封、表单解析）→ viewmodel（呈现态与动作）→ view（组件）
│   ├── client.tsx        # 组合根：把配置页注册进 plugins.bundle.config（key = 包名）
│   ├── model/            # api.ts（HTTP）· form.ts（表单 ↔ patch 纯逻辑）
│   ├── viewmodel/        # settings.ts（状态 / 动作 hook、状态文案、二级页面定义）· env.ts（环境页轮询 / 动作）
│   └── view/             # SettingsPage（外壳 + 状态行 + 二级页面导航）· controls · theme（CSS）· panels/*（含 ComfyPanel / EnvPanel）
├── scripts/              # wrap-client（产物包装）· check-syntax · check-docs
├── docs/                 # 设计文档（一文档一主题：架构 / 通道 / 闸门 / 画图 / 路线…）
├── README.md             # 本文件
└── AGENTS.md             # 本插件开发纪律（文档在哪 + pnpm check 闸门）
```

## 文档索引

| 文档 | 写什么 | 何时看 |
|---|---|---|
| [README.md](./README.md) | 总览 / 用途 / 用法 / 版本历史 | 任何任务第一步 |
| [AGENTS.md](./AGENTS.md) | 本插件纪律：文档位置速查 + `pnpm check` 闸门 | 动手前 |
| [docs/architecture.md](./docs/architecture.md) | 总体架构：形态、模块、事件流、会话映射、安全、运行前提 | 动手前 / 改设计时 |
| [docs/client.md](./docs/client.md) | client 半身：插件面板里的配置页（连接 / 环境 / 项目 / 行为 / 画图·视频 / 预设 / 记录）、注册落点、配置层序、HTTP 契约、热更新语义、主题化样式 | 改配置页 / 调保存逻辑时 |
| [docs/config.md](./docs/config.md) | 配置总表：每个字段的默认值 / 范围 / 现在能否在配置页改 / 生效方式 + 写死常量清单 + 加字段的改动面 | 调配置 / 决定哪些进配置页时 |
| [docs/onebot-channel.md](./docs/onebot-channel.md) | 真实 QQ 号通道：账号模型、NapCat 部署、WebSocket 事件与 API、封号风险 | 接协议端、部署 NapCat 时 |
| [docs/official-bot-channel.md](./docs/official-bot-channel.md) | **备选（当前不采用）**：官方 QQ 机器人通道事实与限制 | 回退 / 对比时 |
| [docs/gate.md](./docs/gate.md) | 消息闸门：快路 / 慢路、jev、去重幂等、状态持久化、配置 | 改群聊行为时 |
| [docs/chat-context.md](./docs/chat-context.md) | 聊天记录落盘与消息拼接：`.qq-relay/` 隐藏目录、群项目目录、prompt 格式、迁移 | 改聊天记录 / prompt 拼接时 |
| [docs/media.md](./docs/media.md) | 媒体：入向图片 / 表情 / 视频 / 语音 / 群文件落盘、聊天记录与 prompt 路径、`qq_send` 出向图片 / 视频 / 文件与画图 / 视频产物 | 改媒体 / 排查媒体收发时 |
| [docs/comfy.md](./docs/comfy.md) | 画图与视频：ComfyUI 配置 / 探测、动态注册 `comfy-image` / `comfy-video` 两个 skill 的生命周期与模板渲染、图片 + 视频工作流、QQ 群用法与安全边界 | 开画图 / 视频、排查生成不生效时 |
| [docs/env.md](./docs/env.md) | 环境一键配置（v0.23.0）：`environment` 配置段、7 个检查步骤、白名单动作与固定 argv、一键修复序列、HTTP 契约与安全边界 | 新机器装 NapCat / 排查「环境」页、改环境动作时 |
| [docs/commands.md](./docs/commands.md) | QQ 侧命令层：`/new` / `/stop` / `/status` / `/help`、解析与权限、与闸门的关系 | 改命令 / 排查群内命令不生效时 |
| [docs/reply.md](./docs/reply.md) | 出向回复体验：引用触发消息、处理中占位、直通连发合并、`reply` 配置 | 改回复行为 / 排查回复对不上号时 |
| [docs/tools.md](./docs/tools.md) | `qq_send` 主动推送（文本 / 图片 / 视频 / 文件）/ `qq_poke` 戳一戳：契约、安全、离线语义、验证 | 改工具 / 排查推送失败时 |
| [docs/poke.md](./docs/poke.md) | 戳一戳：事件契约、被戳接话、冷却、聊天记录、`qq_poke` 工具 | 改戳一戳 / 排查戳没反应时 |
| [docs/approval.md](./docs/approval.md) | QQ 侧审批：群里文本命令、角色限制、超时 / 取消 / 离线语义 | 改审批 / 排查审批不生效时 |
| [docs/persona.md](./docs/persona.md) | 角色预设与轻量人设：插件自带 `qq-relay` agent preset、配置页选择、prompt 人设行与平台约定 | 调人设 / 选 preset / 排查回复风格时 |
| [docs/roadmap.md](./docs/roadmap.md) | 分期、验收标准、风险与用户前置动作 | 排期 / 决定下一步时 |
| [../../AGENTS.md](../../AGENTS.md)、[../../docs/](../../docs/) | 仓库级纪律、渲染树选座速查 | 跨插件协作、装 profile、选 slot |

## 激活方式（已链接 `dwdev`，该 profile 已清空为只装本插件）

```bash
dsh plugin --profile <profile> add link:/path/to/dsh-qq-relay
# 装完需重启该 profile 的 GUI 才生效（bundle 组合发生在启动时）
```

- 回滚：`dsh plugin --profile <profile> remove dsh-qq-relay`（不影响本仓库）。
- 验证：重启后宿主日志里应出现 `dsh-qq-relay` 的加载日志；左栏「插件」面板里找到
  `dsh-qq-relay` 组合包，它的页面里能看到配置（连接状态 / 表单 / 群项目目录）。
- 链接现状记录在上级 [PROFILES.md](../../PROFILES.md)。

## 开发循环

```bash
pnpm install     # devDependencies：vite / react / typescript（插件**运行时零外部依赖**）
pnpm build       # src/client.tsx -> dist/client.cjs -> lib/client.js（wrap-client 包装）
pnpm watch       # watch 模式：改 src 自动 rebuild + wrap，浏览器刷新可见
pnpm check       # 验收闸门：语法 + 元数据 + tsc --noEmit + 文档↔源码配对
pnpm test        # host 纯逻辑单测（node:test，零依赖）
```

- `lib/index.js` 是**手写** host 源码（不经构建）；`lib/client.js` 是 client 半身构建产物，
  已入库——clone 后不装依赖也能被宿主加载。只有改了 `src/` 才需要 `pnpm build` / `pnpm watch`。
- **host / client 热载差异**：改 host 半身要重启 profile 的 GUI；client 半身由宿主的 client 热换
  机制在浏览器刷新后生效。

## 版本历史

### v0.23.0 环境一键配置：`environment` 配置段 + 「环境」页 7 步诊断与白名单动作（2026-10-20）

- **配置页新增「环境」二级页**（顺序：连接 / 环境 / 项目 / 行为 / 画图·视频 / 预设 / 记录）：
  把 [onebot-channel.md §3](./docs/onebot-channel.md) 的手工装环境步骤收敛成
  **7 个检查 + 按钮**（Docker CLI / 容器引擎 / compose 文件 / NapCat 容器 / QQ 登录 /
  OneBot 配置 / 插件回填），顶部有一键修复、重新检测、打开 WebUI 扫码与动作日志。
- **host 新增** `lib/model/env.js`（纯逻辑：`environment` 配置规范化 / `webuiToken` 只写不读、
  compose 生成与静态解析、OneBot 配置校验、步骤求值、动作白名单与固定 argv、日志环形缓冲）
  与 `lib/controller/env.js`（探测 + 动作执行）；路由
  `GET /api/env`、`POST /api/env/action`（`config-routes.js` 现共 13 条路由）。
- **动作白名单、不经 shell**：`install-docker`（`brew install colima docker docker-compose`）、
  `start-daemon`（`colima start …`）、`write-compose`、`compose-up`、`restart-napcat`、
  `write-onebot`（先备份 `.bak-时间戳` 再原子写入 + 重启 NapCat）、`backfill-config`
  （写插件 `wsUrl` / `accessToken` / `selfId` 并重连）、`fix-all`（按序补缺失步骤，不含安装类）、
  `open-webui`（返回 `/webui?token=…` 链接）。命令用 `spawn` + 参数数组（`shell: false`），
  安装 / 启动引擎 / 写 OneBot 必须 `confirm: true`；命令类动作后台执行并轮询日志。
- **`environment` 配置段**：`enabled`（默认开）/ `dir`（默认 `~/napcat-docker`）/
  `webuiToken`（只写不读，保存时与已有覆盖合并避免被目录保存清掉）。目录 / token 非法只回退
  默认值，不判死整份配置；environment 变化不重建 relay 连接（与 comfy 同理）。
- **一键修复**：`write-compose → compose-up → restart-napcat → write-onebot → backfill-config`
  中缺失的步骤按序补；安装 Docker / 启动引擎 / 扫码仍由用户手动确认。
- **安全边界**：只跑 `docker` / `docker compose` / `brew` / `colima`，不 `sudo`、
  不下载可执行文件、不接受页面传来的命令 / 路径；日志写入前对 webuiToken / accessToken /
  OneBot token 脱敏；WebUI 链接只在 `open-webui` 动作里返回。Windows / WSL 不支持（页面只提示）。
- 单测 282 → **291**（新增 `test/env.test.js` 9 个；`test/apply.test.js` 路由数 11 → 13）。
- 文档同步：新增 [docs/env.md](./docs/env.md)；更新 config / client / roadmap / architecture /
  onebot-channel / README / AGENTS；`lib/client.js` 已含「环境」页。
- **需要用户重启 dwdev GUI** 才能在面板里看到「环境」页。

### v0.22.0 视频生成：MiniMax H3 + 双 skill + qq_send videos（2026-10-20）

- **同一 ComfyUI 动态注册两个 skill**：连接成功后 host 按 `COMFY_SKILLS` 注册
  `comfy-image`（`SKILL.md` 出图）与 `comfy-video`（`SKILL-video.md` 视频）；两个 skill 共用
  `lib/skills/comfy-image/` 目录与 `resourceBase`，各自记录加载状态与错误
  （一个模板坏了不影响另一个）。状态快照的单数 `skill` 改为数组 `status.comfy.skills`；
  抖动策略不变（连不上不注销、显式关闭 `enabled` / `skillEnabled` 才注销全部）。
- **视频工作流（MiniMax H3）**：新增 `h3-t2v`（文生视频）/ `h3-i2v`（首帧转视频）/
  `h3-r2v`（参考图转视频，角色一致性）三个工作流，registry 共 7 个；产物 mp4 带原生音轨，
  落在 `<群项目>/assets/comfy/output/`（runner 打印实际路径）。实测（RTX 4070 / ComfyUI 0.39.0）：
  `h3-t2v` 4 步 / 0.2MP / 3s 服务端 29.1s（608×352、73 帧、3.04s、带音轨），`h3-r2v` 30.4s；
  8 步为质量档、4 步为加速档；0.4MP/16:9 ≈ 864×480；duration 秒 → 帧数对齐 5 mod 17（5s = 124 帧）。
  `h3-i2v` 本次只做 dry-run 接线校验，未单独真跑。
- **`qq_send` 新增 `videos`**：最多 1 个，本地绝对路径或 http(s) URL，MP4 / MOV / WEBM / FLV /
  AVI / MKV，≤30 MiB；本地文件转 base64 走 NapCat 的 video 段（内联播放）。输出 `media` 增加
  `videos` 计数（`{ images, videos, file }`）；离线时视频**不排队**、直接报错；发送成功算 bot 发言。
  runtime 包装补 `sendVideo`，relay / OneBot API 分别接 `sendVideo` / `sendGroupVideo`。
- **配置页「画图 / 视频」**：页签改名，ComfyPanel 逐条展示两个 skill 的加载状态与错误，
  页脚注明 `SKILL.md` / `SKILL-video.md`；旧 host 只返回单数 `skill` 时 client 兜底成一个数组。
- **顺带修正**：MOSS-Image 已登记为 registry 的 `moss-t2i`（此前文档写「未进 registry / runner 不认」），
  `moss_image_t2i.api.json` / `.schema.json` 一并入库；现在 registry 共 7 个工作流。
- 单测 278 → **282**（新增 4 个：comfy 单坏不影响另一个、relay `sendVideo` 成功 / 校验、
  `qq_send` 只发视频；既有 comfy / 工具 / onebot / media / apply 用例同步改成双 skill / 视频断言）。
- 文档同步：comfy / tools / media / client / config / architecture / roadmap / README / AGENTS；
  `lib/client.js` 已含「画图 / 视频」页文案。

### v0.21.1 修复 qq_send 图片 / 文件发送与「未分组」会话（2026-10-19）

- **`qq_send` 出向图片 / 文件（v0.12.0 起潜伏）**：`controller/runtime.js` 的运行时包装漏了
  `sendImage` / `sendFile` 转发，agent 调 `qq_send` 发图直接报 `sendImage is not a function`。
  现已补上；apply 集成新增回归断言（离线时返回可读的「当前离线」错误，而不是 TypeError）。
- **群项目 workspace 挂载（会话在 DSH 侧栏显示「未分组」）**：会话创建后 `workspace.attachSession`
  失败只打 warn，会话就不属于任何 workspace 分组；宿主热重载 workspace 服务后缓存实体失效，
  更是每次新建都挂不上。现在失败会丢缓存、重新 `create` 再试一次；relay 启动时按 `mapping.json`
  把历史会话**补挂**回各自 workspace（幂等），仍失败的记录到 `status.workspace.attachIssues`，
  「项目」页会显示告警。
- 单测 275 → 278（新增 workspace 重试 / 持续失败记录 / 启动补挂 3 个 relay 用例；apply 加图片回归断言）。
- 这是 host 半身修复：**重启该 profile 的 GUI** 后旧会话会自动补挂，也可保存一次配置触发 relay 重建。

### v0.21.0 画图能力：ComfyUI 探测 + 动态注册 comfy-image skill（2026-10-19）

- **新配置段 `comfy`**：`enabled`（默认 false）/ `baseUrl`（默认 `http://192.168.1.10:8188`）/
  `timeoutMs`（默认 30000，3s..120s）/ `skillEnabled`（默认 true），四项都能在配置页「画图」页改。
- **host 探测 + 动态 skill**：新增 `lib/controller/comfy.js` 与 `lib/model/comfy.js`。启动后探测
  ComfyUI（`/system_stats` + `/queue`，60s 周期 + 状态轮询补探），**首次连上**且开关允许时把插件
  自带的 `comfy-image` skill 注册给 DSH（`ctx.skills.register`，`source=custom` /
  `provider=dsh-qq-relay` / `resourceBase=lib/skills/comfy-image`）；之后探测失败**不注销**
  （避免目录抖动），关闭 `enabled` / `skillEnabled` 才注销。注册不需要重启 GUI。
- **skill 模板渲染**：`SKILL.md` 里的 `{{COMFY_HOST}}` / `{{SKILL_DIR}}` 在注册前替换成实际值，
  frontmatter 剥离；残留占位符则拒绝注册并把错误带到状态上。
- **配置页新增「画图」二级页**（顺序：连接 / 项目 / 行为 / 画图 / 预设 / 记录）：开关 / 服务地址 /
  探测超时 / skill 开关 + 运行状态（可达、版本、GPU、队列、最近检查、skill 加载）+「测试连接」；
  新路由 `POST /dsh-qq-relay/api/comfy/test`（只探测、不保存）。旧 host 缺 `comfy` 字段时按关闭兜底。
- **保存语义**：仅 `comfy` 变化不重建 relay 连接（比较配置时忽略 `comfy`），保存后立即按新配置
  探测并决定是否注册；不重启 GUI。`lib/skills/**` 随包发布。
- **真实验证**：`192.168.1.10:8188` / ComfyUI 0.39.0 / RTX 4070，isolated DSH 实例启动后
  `status.comfy.reachable = true`、`skill.loaded = true`；`POST /api/comfy/test` 用错误地址返回
  `ok=true` + `probe.reachable=false`（探测失败也是成功响应，不抛路由错误）。
- **client 已重建**：`lib/client.js` 含「画图」页（ComfyPanel）文案，GUI 重启后可见；
  单测 266 → 275（新增 9 个 comfy 用例：配置 / 模板渲染 / probe / 注册与抖动保持 / 测试连接 /
  `/api/comfy/test` 异步回归；config / settings / apply 断言同步）。
- 文档同步：新增 [docs/comfy.md](./docs/comfy.md)，README / AGENTS / config / client /
  architecture / media / roadmap。

### v0.20.0 预设管理：增删改 + 模型 / 思考层级 / 权限（2026-10-19）

- **预设从 bundle patch 移进插件**：不再随 `cordis.patch.yml` 静态插入，改为
  `~/.dsh/storages/dsh-qq-relay/presets.json`（首次启动种子「QQ 群聊」）；插件启动时用
  `ctx.agentPresets.register()` 动态注册成 DSH agent preset，保存后立即重注册（不需要重启 GUI）。
  组合表仍复用 DSH 内置 `standard`（`lib/model/preset-template.js`，21 行），DSH 升级后按
  [persona.md](./docs/persona.md) §2 同步。
- **配置页新增「预设」二级页**：列表（名称 / 模型 / 权限 / 删除）+ 新建 / 编辑表单；字段
  id / 名称 / 描述 / persona / provider / model / 思考层级 / 权限预设 / 排序。宿主模型目录
  （`sessionController.modelCatalog()`）与权限目录（`permissionPresets.catalog()`）进状态快照，
  页面下拉直接用。
- **预设级会话参数**：建会话后用预设里的模型 / 思考层级向会话追加一条 `model/selection`
  事件（只在该会话还没有任何模型选择时，避免覆盖用户手动选择）；权限用
  `permissionPresets.set(agent.session, name)` 应用一次。每个会话只应用一次，重启后首次派发补上。
- **新路由** `GET/POST /api/presets` 与 `POST /api/presets/delete`；删除正在使用的预设返回 409。
  预设 id 与 DSH 内置 preset 冲突时保存被拒（或注册时标 warning）。
- 单测 258 → 266（presets 模型 / store / 动态注册 / 会话应用 + apply 路由），并修好
  `apply.test` 新用例漏清理导致的挂起。
- client 新增 `PresetsPanel`，`TextInput` 支持 disabled；文档同步 persona / config / client /
  architecture / roadmap / README / AGENTS。

### v0.19.0 角色预设与轻量人设（2026-10-19）

- **插件自带 `qq-relay` agent preset**：bundle patch 里插入一条 `@deepseek-ai/dsh-agent-preset`
  声明，组合表复制 DSH 内置 `standard` 预设（persona + 工具 / 压缩 / 委派等），只把 persona 换成
  QQ 群聊语气。装插件即可在 DSH 的 preset 选择里看到「QQ 群聊」，**无需改 profile**。
  代价：preset 没有继承机制，这份组合表会随 DSH 升级滞后，需按 `docs/persona.md` §维护重新同步。
- **会话可选 preset**：新配置 `agentPreset`（默认空 = 跟随 DSH 默认）；relay 建会话时透传
  `sessionController.create({ agentPreset })`，preset 不可用时记 warn 并退回默认预设。
  配置页「行为 → 角色与人设」下拉的数据来自宿主 `agentPresets.list()`（服务缺失时隐藏 / 提示）。
  preset 在会话创建时固定，切换后要对已有群 `/new` 或「重新绑定」。
- **轻量人设**：新配置 `persona.enabled` / `persona.text`（默认关闭、≤4000 字符）。开启后每轮
  prompt 头部插入 `[角色设定：…]`；适合群内角色叠加，不依赖 profile 改动。
- **平台约定进 prompt**：每轮末尾固定追加
  `[说明：直接输出最终回复即可，relay 会自动回发到本群；不要用 qq_send 往本群发。]`，
  修掉协议级验收发现的「模型改用 `qq_send` 回话导致双发 / 绕过引用与占位」问题。
- 配置页「行为」新增「角色与人设」卡片（`Select` / `TextArea` 两个新控件）；状态快照新增
  `agentPresets`（名册 + 服务可用性 + 配置里的 preset 是否缺失）；单测 253 → 258。
- 同步 README / AGENTS / config / client / chat-context / architecture / roadmap 文档，新增
  [docs/persona.md](./docs/persona.md)。

### v0.18.0 触发规则修正 + 代答（2026-10-19）

- **修 bug：引用别人的消息不再直通**。手机 QQ 里 @ 某人常带一个 `reply` 段，旧实现「有引用
  就算回复 bot」→ @ 别人 / 回复别人也会起一轮会话。现在引用只有 **引用 bot 自己的消息** 才算
  直通；relay 记录自己发出的 `message_id`（每群内存 100 条 + 聊天日志兜底，重启后仍可判）。
- **@ 别人不再触发会话**：消息 @ 了非 bot 成员（含 `@全体成员`）只落聊天日志，不进闸门、
  不起 turn；@ bot 仍然直通。之前这类消息会走 jev 闸门，偶尔被判定为「需要接话」。
- **代答（可选，默认关闭）**：配置页「行为」新增一块——名单里的人被 @、且 TA 最近
  `silenceWindow`（默认 10 分钟）没在本群发言时，直通起一轮并请 agent 代 TA 回应；
  名单支持 QQ 号或群名片 / 昵称（≤20 项）。prompt 头部 `（直通：代答）`、行内 `（@目标）`，
  尾部一行 `[代答：…请代 TA 回应…]`。配置段 `proxyReply`（`enabled` / `targets` /
  `silenceWindow`），三项都能在配置页改，保存即重建 relay。
- client 新增开关控件 `Toggle`（轨道 / knob 全走宿主 `--dsw-*` token）；prompt 纯函数新增
  `atNames` 标记与 `notes` 说明行；单测从 244 增到 253。
- 同步 gate / config / client / chat-context / onebot-channel / reply / architecture / roadmap /
  README / AGENTS 文档。

### v0.17.0 配置页迁到插件面板：二级页面 + 宿主主题（2026-10-19）

- 注册落点从设置分区 `settings.section` 改到 **`plugins.bundle.config`（key = 包名 `dsh-qq-relay`）**：
  配置页现在画在**插件面板**（左栏「插件」图标）里 dsh-qq-relay 组合包自己的页面上，
  紧挨该插件的启停开关；设置里不再单独占一块。
- 页面从一屏平铺改成**四个二级页面**：连接（协议端 / token / bot 账号 / 群白名单 + 运行状态）、
  项目（默认目录 / 会话标题 / 群项目目录表 / 重新绑定 / 最近消息）、行为（切分上限 / 直通前缀 /
  闸门三参数 + 每群实时状态）、记录（保留天数 / 立即清理）。保存 / 重连 / 刷新固定在状态行，
  任何二级页面都能直接保存。
- 视觉改为跟随宿主主题：新增 `src/view/theme.ts` 注入一份普通 CSS，控件与卡片全部使用
  ui-theme 的 `--dsw-*` 语义 token（设置卡片 R20、控件 R12、0.5px 发丝描边、focus ring），
  明暗主题与字号设置自动跟随，不再写死颜色。
- client 半身按 MVVM 拆成四层：`src/model/`（HTTP / 表单）→ `src/viewmodel/settings.ts`
  （状态与动作 hook、状态文案、二级页面定义）→ `src/view/`（`SettingsPage` / `controls` /
  `theme` / `panels/*`）。删除 `SettingsSection.tsx`。
- package.json 描述精简为一句（插件页会把它显示在组合包标题下）；版本 0.17.0。
- 同步 client / architecture / config / gate / chat-context / media / commands / reply /
  approval / poke / roadmap / README / AGENTS 文档。
- 仅 client 半身改动：`pnpm build` 后刷新页面即生效（无需重启 GUI）；host 行为不变，单测 244 个不变。

### v0.16.0 入向群文件（2026-10-19）

- 识别 OneBot `notice.group_upload`：白名单群、非 bot 自己上传的群文件 → `get_group_file_url`
  取下载链接 → 下载到 `.qq-relay/media/<群>/<日期>/<fileId>-<安全文件名><扩展名>`（≤20 MiB）。
- 落盘成功后写聊天记录（`text = 上传了群文件：<名>`，`media` 里 `kind = "file"`）；
  默认 `files.react: true` 按直通起一轮（reason「群文件」），`false` 时只记录。
- 失败（超限 / 取链接失败 / HTTP / 超时）只记 `failed`、不接话；bot 自己通过 `qq_send`
  上传产生的 `group_upload` 忽略（防自问自答）。
- 新增 `files` 配置段（`enabled` / `react`，patch 只读）。
- 新增 `api.getGroupFileUrl` / `model/media.js` 的 `attachGroupFile`；设置页「最近消息」
  增加 `[文件]` 标记。
- 同步 media / chat-context / onebot-channel / architecture / roadmap / README / AGENTS。
- 单测 244 个（新增 14 个：codec 1 / 配置 1 / media 4 / relay 7 / prompt 1）；host 半身改动，需重启 profile GUI 生效。

### v0.15.0 戳一戳识别与回戳（2026-10-19）

- 识别 OneBot `notice.notify.poke`：白名单群写聊天记录（`戳了你一下` / `戳了 <target> 一下`）；
  **被戳（`target_id = self_id`）时按直通起一轮**（reason「戳一戳」），不经过闸门、不调用 jev；
  群友互戳只记录当上下文。
- 新增 `poke` 配置段（`enabled` / `react` / `cooldownMs`，默认 10s，patch 只读）：
  可关识别、可关被戳接话、按群冷却防连戳刷屏（冷却内只记录不接话）。
- 昵称 / 群名补查 `get_group_member_info` / `get_group_info`（缓存 10 分钟），
  查不到时退化 QQ 号 / `群 <id>`。
- 新增 `qq_poke` 工具（NapCat `group_poke`）：agent 可回戳白名单群成员；离线直接报错、不排队；
  与 `qq_send` 同 fiber 注册（`ctx.inject(['tools'])`）。
- 协议端实测（2026-10-19）：`group_poke` 返回 ok；poke 事件字段与文档一致。
- 真机验收（2026-10-19，用户确认）：群里戳 bot → DSH 回复正常。
- 新增 [docs/poke.md](./docs/poke.md)；同步 onebot-channel / architecture / tools / roadmap / README / AGENTS。
- 单测 230 个（新增 15 个：codec 1 / 配置 1 / relay 9 / 工具 4）；host 半身改动，需重启 profile GUI 生效。

### v0.14.0 client 面板增强：闸门状态 / 最近消息 / 映射管理（2026-10-19）

- 闸门区块新增**每群实时状态表**：待评估条数、最近发言 / 最近回复、冷却、DSH 忙 / 评估中，
  外加全局计数（待评估消息 / 群、活动定时器、派发队列、发送队列）；随状态轮询每 5 秒刷新。
- 群项目目录表新增「消息」：按群查看**最近 24 小时**聊天记录（最多 20 条，只读视图：时间 /
  显示名 / @ 与引用标记 / 媒体标记），走新路由 `GET /dsh-qq-relay/api/messages?groupId=&limit=`。
- 映射管理补齐：行内「解除绑定」与表头「清空全部映射」，都只删本机映射、保留 GUI 里的旧会话；
  下条群消息按当前项目目录重新建会话。路由 `POST /api/mapping/delete`、`POST /api/mapping/clear`。
- 新增 `lib/model/panel.js`（最近消息查询校验 + 面板消息收敛），relay 暴露只读 `snapshot()`
  把待评估 / 定时器 / 队列计数带进状态快照。
- 单测 215 个（新增面板纯逻辑 3 + 路由 4 + apply 集成 2）；`pnpm check` 全绿。
  host + client 半身改动，需重启 profile GUI + 刷新页面生效。

### v0.13.0 聊天记录清理：保留天数 + 立即清理（2026-10-19）

- 设置 →「QQ 机器人」新增「聊天记录清理」区块：保留天数（0 = 永不自动删除；7..3650 = 自动清理，
  保存后落 `chatRetentionDays`）+「立即清理」按钮（用当前天数，1..3650，二次确认）。
- 立即清理与启动 / 每日自动清理共用 `lib/model/cleanup.js` 的 `pruneChatAndMedia`：一次同时清
  `chat/<群号>/YYYY-MM-DD.jsonl` 与 `media/<群号>/<日期>/`；只删文件，不动映射 / 会话 / 配置。
- 新路由 `POST /dsh-qq-relay/api/cleanup`（body `{ days }`，返回删除计数 + 最新状态；
  `CLEANUP_DAYS_INVALID` 400 / `CLEANUP_NOT_CONFIGURED` 409）；请求体仍限 64 KiB。
- 手动清理允许 1..3650，自动清理只接受 0 或 7..3650——两者的下限不同是有意的（手动可更激进）。
- 新增 `test/cleanup.test.js` 与路由 / `apply()` 集成用例；单测 206 个。
  host + client 半身改动，需重启 profile GUI + 刷新页面生效。

### v0.12.0 媒体双向：入向视频 / 语音 + 出向图片 / 文件（2026-10-19）

- 入向扩展：视频（mp4 / avi / webm / flv）与语音（amr / silk / mp3 / ogg / wav）同图片一样落盘到
  `.qq-relay/media/`，聊天记录 `media[]` 与 prompt 标记（`[视频：…]` / `[语音：…]`）沿用同一套；
  扩展名同样按**文件头 magic bytes** 识别，不信 CQ 文件名。
- 出向媒体：`qq_send` 新增 `images`（最多 4 张，本地绝对路径或 http(s) URL）与
  `file` / `fileName`（本地文件上传到群文件）；文本 / 图片 / 文件可一次调用混发。
- 为什么走 base64：NapCat 在 Docker 里看不到宿主路径；本地文件读成 `base64://` 交给
  `send_group_msg`（图片）与 `upload_group_file`（文件），NapCat 端解码。
- 校验：图片 ≤ 10 MiB 且必须是支持的图片格式；文件 ≤ 30 MiB；离线时出向媒体**直接报错不排队**；
  失败信息对模型可读。
- 新增 `test/tools.test.js` 媒体用例、relay 出向媒体用例、media 视频 / 语音用例；单测 201 个。
  host 半身改动，需重启 profile GUI 生效。

### v0.11.1 回复体验：引用 / 处理中 / 连发合并（2026-10-19）

- 回复**引用触发消息**：直通取触发的那条、闸门批次取批次最后一条；引用发送被拒（原消息撤回等）
  自动退回普通发送，回复不丢。
- turn 超过 `ackDelayMs`（默认 8s）未结束 → 先回「收到，处理中…」；该占位不刷新闸门发言窗口 /
  冷却、不写聊天日志，结束后照常发结果；已发占位但本轮无文本时补一句收尾。
- 直通消息**连发合并**：@ / 引用 / 命令前缀触发的消息在 400ms 窗口内合并成一次 prompt，只起一个 turn。
- 新增 `reply` 配置段（`quote` / `ackDelayMs` / `mergeWindowMs`，patch 只读）；规格见 [docs/reply.md](./docs/reply.md)。
- 单测 187 个（新增 reply 配置校验 1 个 + relay 回复体验集成 8 个）；host 半身改动，需重启 profile GUI 生效。

### v0.11.0 QQ 侧命令层（2026-10-19）

- 新增命令层（`lib/model/commands.js` + `relay.js`）：群主 / 管理员可以在群里直接操作会话。
  `/new [标题]` 新建会话并重绑本群（旧会话留在 GUI；自定义标题或加时间后缀）；
  `/stop` 中断当前轮次（`sessionController.cancel`）；`/status` 汇报会话 / 闸门 / 队列；
  `/help` 列出命令。
- 支持 `/dsh new` 前缀式与 `/new` 裸写式；只认白名单命令名，未识别的 `/dsh …` 仍按原「命令前缀直通」转给 DSH。
  非授权角色静默忽略，不刷屏。
- 命令回复走独立发送路径：切分发送但不刷新闸门发言窗口 / 冷却（否则一条 `/status` 会让 bot 沉默 2 小时）。
- `gate.snapshot()` 提供待评估条数 / 批数；新建会话逻辑抽成 `createSessionForGroup` 与首次建会话共用。
- 新增 `commands` 配置段（`enabled` / `bare` / `roles`，patch 只读）；规格见 [docs/commands.md](./docs/commands.md)。
- 单测 178 个（新增 commands 纯逻辑 10 个 + relay 集成 8 个）；host 半身改动，需重启 profile GUI 生效。

### v0.10.1 设置页旧宿主兼容（2026-10-19）

- 修掉「页面已是新版、宿主还在 v0.9.1」时闸门三项显示 `0` 的问题：host 未返回 `config.gate` 时
  页面回退显示默认值（5s / 45s / 0.7），并提示「宿主还是旧版本，重启后再保存」。
- 纯 client 半身改动，刷新页面即可；host 需重启到 v0.10.0 才能真正编辑这三项。
### v0.10.0 闸门参数进设置页（2026-10-19）

- 设置 →「QQ 机器人」新增「闸门」区块：`debounce`（去抖窗口）、`fastMinReplyInterval`（最小发言间隔）、
  `jevThreshold`（接话阈值）可直接编辑，**保存即重建闸门，无需重启**。
- `gate` 采用字段级合并：只覆盖设置页允许的三个子项，`enabled` / `model` / `slowTimer` 等仍由
  profile patch 只读控制；时长支持 `500ms` / `3s` / `10m` / `2h`。
- jev 分类器的阈值改为每次判定时读取当前配置（`getThreshold`），改阈值不需要重建分类器。
- 状态接口的 `config.gate` 返回 `{ debounceMs, fastMinReplyIntervalMs, jevThreshold }`，页面回填用。
- 单测 160 个；host + client 半身改动，需重启 profile GUI + 刷新页面生效。
### v0.9.1 媒体扩展名修正（2026-10-19）

- 修掉「CQ file 后缀与实际图片格式不符」导致的落盘扩展名错误（真实案例：JPEG 被存成 `.png`，
  读图工具按扩展名拒读）：保存时先按文件头 magic bytes（JPEG / PNG / GIF / WEBP / BMP）识别，
  再退回 `content-type`、CQ file / URL 后缀、`.bin`。
- v0.9.0 写入的旧文件不会自动重命名；确认是同一张图的话可手工删掉错误后缀的副本。
- 单测 158 个；host 半身改动，需重启 profile GUI 生效。
### v0.9.0 入向媒体落盘（2026-10-19）

- 入向 CQ 图片 / 贴纸 / 商城表情下载到群项目 `.qq-relay/media/<群号>/<日期>/<messageId>-<序号>.<ext>`，
  聊天记录新增 `media` 数组（`kind` / `status` / `path` / `bytes` / `contentType`，失败带 `reason`）。
- `path` 是相对项目根（会话 cwd）的路径，agent 可直接 read；原始 CQ 码仍保留在 `raw`。
- prompt 追加媒体标记：`[图片：<相对路径>]` / `[表情：<相对路径>]` / `[表情 <faceText>]` / `[媒体下载失败]`；
  **纯媒体消息（无文本）也能生成 prompt**，@ 带图会真正转给 DSH。
- 下载规则：只接受 http(s)、10 秒超时、单文件 20 MiB、单消息最多 10 个；失败不阻断消息流。
- 媒体默认不自动删除；配了 `chatRetentionDays > 0` 时按日期目录一起清理。
- 新增 `lib/model/media.js`、`docs/media.md`、`test/media.test.js`；单测 157 个。
- host 半身改动，需重启 profile GUI 生效。
### v0.8.1 聊天日志元信息与空文本修正（2026-10-19）

- 修掉聊天日志丢元信息的问题：`codec.toChatLogRecord` 现在写入 `groupId` / `card` /
  `mentionsSelf` / `replyToId`，@ 与引用在日志里不再退化为 `false` / `null`；`text` 写入前 trim。
- 纯图片 / 表情等无文本消息：只写聊天日志，**不再进闸门、不调分类器**（此前会进 pending 并白调一次 jev）。
- 排查证据：13:38 的两条 @ 均在 1–4 秒内回复；未回复的是 13:38:59 的无文本表情消息（闸门判 0.52 不接话）。
- 单测 144 个；host 半身改动，需重启 profile GUI 生效。

### v0.8.0 群项目目录与消息拼接（2026-10-19）

- 每个群可以绑定自己的**项目目录**（`groupWorkspaces`，设置页「群项目目录」表格可编辑）：
  会话 cwd 与聊天记录都以它为准；未单独配置时跟随默认 `workspace`。
- 聊天记录从全局 storage 搬进各群的 `<项目>/.qq-relay/chat/<群号>/YYYY-MM-DD.jsonl`，
  目录内 `.gitignore` 为 `*`（自我忽略、永不进用户仓库）；**默认不再自动删除**
  （`chatRetentionDays: 0`；清理 UI 后来在 v0.13.0 交付）。DSH 会话与 agent 都能直接 read。
- 发给 DSH 的 prompt 统一由 `lib/model/prompt.js` 拼接：群名 / 群号 / 本地时间 / 条数 /
  `@你`、`引用 <id>` 标记 / 聊天记录相对路径指针；直通与闸门共用，修掉昵称与 @ 信息丢失。
- 聊天日志行新增 `groupId` / `card` / `mentionsSelf` / `replyToId`（旧行缺字段自动补默认）。
- 旧全局聊天日志启动时一次性迁移进各群项目（幂等，目标已存在则跳过，失败只告警）。
- 设置页新增「重新绑定」：删该群映射并按新项目重建（`POST /dsh-qq-relay/api/rebind`），
  旧项目里的历史记录不移动。
- 新增 `model/{project,prompt}.js`、`test/{project,prompt,migration}.test.js`；单测 143 个。
- 文档：[docs/chat-context.md](./docs/chat-context.md) 规格转实现；architecture / client / gate / roadmap 同步。
  改的是 host + client 半身，**需重启 profile GUI + 刷新页面**生效。

### v0.7.1 jev 上下文修正（2026-10-19）

- 修掉「jev 只看本批、看不到前因」的问题：分类器现在拿到聊天日志里最近 60 条消息
  （包含 bot 自己的发言），派发 DSH 的 prompt 仍只带 pending 本批。
- relay 发送成功后把 bot 的发言写回聊天日志（`role: "bot"`），jev 的 state 因此能表达
  「刚被 @ 过、刚回过一句」这类连续对话语境。
- 状态接口新增 `gate` 字段（`enabled` / `classifier` / `model` / `threshold` / `slowTimer`），
  方便 `curl` 排查 jev 是否启用。
- 单测 121 个；host 半身改动，需重启 profile GUI 生效。

### v0.7.0 jev 分类器接入（2026-10-19）

- 接入 TypeSafe 的 System One 决策模型 jev（OpenRouter Decisions API，默认 `typesafe/jev-1.14`）：
  把「最近一批群消息 + 群名 + 触发路径」作为 `state`，问一个 Noul 问题（要不要接话），
  按 `jevThreshold`（默认 0.7）判定，返回带概率的决策并写入决策日志。
- 完全 fail closed：网络 / 超时（默认 8s）/ 非 2xx / 响应不合规都按「不接话」处理。
- key 从环境变量读取（`gate.jevApiKeyEnv`，默认 `OPENROUTER_API_KEY`）；缺 key 只告警并按
  fail closed 运行，不影响 @ / 引用 / 命令直通。
- 新增 `lib/model/jev.js`（请求构造 / 响应解析 / 分类器，零依赖、全局 fetch）；
  gate 配置新增 `model` / `jevEndpoint` / `jevApiKeyEnv` / `jevThreshold`；单测 119 个。
- 文档：[gate.md §4 / §8](./docs/gate.md) 已更新；改的是 host 半身，需重启 profile GUI 生效。

### v0.6.0 QQ 侧审批（2026-10-19）

- 新增审批桥：映射到 QQ 群的会话收到 `approval/request` 时，把【审批请求】发到群里，
  群主 / 管理员回复「同意 / 拒绝」即完成一次性授权（`allowed-once` / `rejected`），不用切 GUI。
- 超时（默认 120 秒）按拒绝；请求取消 → `cancelled`；relay 离线 / 发送失败 → `unavailable`（fail closed）；
  普通成员回复被忽略并提示；同群并发请求交给 GUI。
- 未映射会话的审批继续走 GUI（`next()`），行为不变；配置 `approval.enabled / timeoutMs / roles` 只读。
- 复用 relay 出向发送与白名单；审批等待期间的「同意 / 拒绝」消息由入向拦截器优先消费。
- 新增 [docs/approval.md](./docs/approval.md)；单测 108 个；改的是 host 半身，需重启 profile GUI 生效。

### v0.5.0 主动推送工具 qq_send（2026-10-19）

- 新增 host 工具 `qq_send`：任意 DSH 会话可把纯文本推到白名单 QQ 群（P3 第一项）。
- 契约：`text` 必填、`groupId` 可选（唯一白名单群可省略）；返回 `{ groupId, chunks, queued, messageIds }`；
  离线时整段进入发送队列（上限 50 条 / 30 分钟），重连后补发并返回 `queued: true`。
- 与 relay 共用连接、切分与风控退避；群白名单工具层 + relay 层双重校验；发送成功同样刷新闸门窗口。
- 手写 `ToolDefinition` 形状对象（`lib/controller/tools.js`），**不 import `@deepseek-ai/dsh-tools`**，
  保持运行时零外部依赖；宿主无 tools 服务时静默跳过。
- 文档：新增 [docs/tools.md](./docs/tools.md)；单测 91 个；改的是 host 半身，需重启 profile GUI 生效。

### P2.2 闸门收尾（2026-10-19）

- 慢路按时间窗裁剪：只评估最近 `slowWindow`（默认 2 小时）内的 pending，更早的丢弃（仍在聊天日志里）。
- DSH 忙标记：派发批次时置 `dshBusy`，turn 结束清除；忙时闸门延后评估，避免同群并发起两个 turn。
- 决策日志落盘：每次决策写 `gate/YYYY-MM-DD.jsonl`（trigger / 批次 / reply / confidence / reason /
  耗时 / message_id 列表，**不含正文**），保留 7 天，便于将来调 jev 阈值与回放。
- 日志保留期真正生效：组合根启动时与每天清理聊天日志 / 决策日志（此前 `prune` 只写未接）。
- 群成员昵称 / 角色改用事件自带的 `sender.card || nickname` / `role`，不额外查 API。
- 单测 79 个；重启 dwdev GUI 后真机确认新 host 代码生效（按群状态文件已生成、发言窗口正常刷新）。

### P2.1 消息闸门骨架（2026-10-19）

- 普通群消息进入闸门调度：快路（bot 最近 10 分钟发过言）走 5 秒去抖合并，慢路（久未发言）累积到
  2 小时定时器；两次发言至少间隔 45 秒（间隔内的批次延后不丢）；@ / 引用 / 命令直通保持原样
  （`gate.mentionBypass` 可关）。**`gate.enabled` 默认 false**，开箱行为与 P1 完全一致。
- 分类器以接口注入（`{ classify({ groupId, groupName, trigger, messages }) }`）；**暂不接模型**，
  缺省实现永远 fail closed，但每次决策都记「批次数 / reply / confidence / reason / 耗时」日志，
  为将来接 jev 留出可替换点。
- 状态改为按群分文件 `~/.dsh/storages/dsh-qq-relay/state/<group_id>.json`（seen / pending /
  lastBotSpeakAt / lastReplyAt / cooldownUntil / evaluating），旧 `state.json` 一次性迁移；
  重启后恢复 pending 与冷却窗口，不立即发言。
- 出向新增本地发送队列：断线或发送失败时排队，重连（`client open`）后按序补发；失败按
  「风控限流（退避重试）/ 明确失败（不重试）」分类；队列上限 50 条、最长保留 30 分钟。
- `gate` 配置段进 `normalizeConfig`（时长支持 `45s` / `10m` / `2h` 或毫秒数字，非法值直接拒绝）。
- 单测 75 个（新增闸门纯逻辑、调度器假时钟、按群状态与迁移、断线队列集成）；`pnpm check` 全绿。

### P1.5 基础配置页（2026-10-19）

- 设置 →「QQ 机器人」（`settings.section`）落地：连接状态（含单实例锁冲突提示）、配置表单
  （wsUrl / token / selfId / 群白名单 / 工作目录 / 标题模板 / 切分上限 / 命令前缀）、群 ↔ 会话映射只读表。
- host 新增三条同源 HTTP 路由（`/dsh-qq-relay/api/{status,config,reconnect}`），统一 JSON 信封；
  保存后**立即重建连接**（单实例锁不变），token **只写不读**。
- 配置层序：profile patch → 设置页保存的 `~/.dsh/storages/dsh-qq-relay/settings.json`；
  非法字段被 `normalizeConfig` 拒绝，不落盘。
- 单测 51 个（覆盖设置覆盖模型、路由面、`apply()` 集成），`pnpm check` 全绿。

### P1 真机验收（2026-10-19）

- 群里 @ 小号 → DSH 回复（约 4 秒往返）；`mapping.json` 自动建会话「QQ群：示例群」。
- NapCat 重启导致 WS 断开后，插件按退避自动重连；重连后新消息正常、复用原会话不重建，`state.seen` / 聊天日志正确。
- 已知代价：容器重启可能需重新扫码；断线窗口内的事件不补发（P1 接受，P2 再补）。
- 长轮次 6 分 04 秒仍能发出；重启 dwdev GUI 后锁被新进程接管、映射复用原会话，重启后首条消息正常回复。

### P1 实现（2026-10-19，代码）

- host 半身实现「@ / 引用 / 命令前缀直通」：OneBot 11 正向 WS 客户端（token、echo 超时、心跳看门狗、退避重连、`self_id` 校验）、事件编解码、白名单 / `message_id` 去重 / 聊天日志、群 → DSH 会话自动创建与映射、`sessionController.prompt` 投递、`agent/inbox/claimed` 关联 turn、`turn/end` 回发 `send_group_msg`（长文本切分，只回 QQ 触发的轮次）。
- model 层：配置校验（fail closed）、映射 / 状态持久化、单实例文件锁、聊天日志 JSONL、回复切分与退避。
- 单测 38 个（`node:test`，零依赖）；`pnpm check` 全绿。
- 待办：重启 dwdev GUI 后做真机验收（见 roadmap P1 验收表）。

### P1 开工（2026-10-19，文档 + 环境）

- 上级 `AGENTS.md` §0 按用户要求**仅对 `dsh-qq-relay` 解除**（允许 P1 实现；其余插件仍只做文档 / 空骨架）。
- 协议端实测通过：macOS 26 原生 Shell 因 native hook 被代码签名强杀，改用 **Docker（Colima + linux/arm64）** 跑 NapCat；OneBot 11 正向 WS、@ / 引用 / 普通消息、`send_group_msg`、历史查询均验证通过（记录见 [docs/onebot-channel.md §9](./docs/onebot-channel.md)）。
- 目标 profile 定为 `dwdev`，并按用户要求把该 profile 清空为只装本插件（见上级 `PROFILES.md`）。
- 文档更新：`onebot-channel.md` 补 Docker 部署与实测契约；`architecture.md` 补配置项；`roadmap.md` 更新前提与验收。

### 选型调整（2026-10-18，文档）

- 协议端由「官方 QQ 机器人」调整为「真实 QQ 号 + NapCat + OneBot 11 正向 WebSocket」：官方通道群聊被动回复窗口仅 5 分钟，DSH 长任务结果只能改走主动消息（受配额、可被关闭）；真实 QQ 号可随时发送。
- 新增 `docs/onebot-channel.md`；`docs/official-bot-channel.md` 降为备选；architecture / gate / roadmap / README / AGENTS 同步调整。
- 风险：非官方协议端有封号风险、需常开 QQ 客户端；功能实现仍未开始。

### 设计定案（2026-10-18，文档）

- 方案定案并落 `docs/`：**官方 QQ 机器人开放平台**（WebSocket 收事件 + HTTPS 发消息）、**群聊优先**、**消息闸门**（10 分钟快路 + 2 小时慢路 + jev 分类器）。
- 新增 `docs/architecture.md` / `docs/official-bot-channel.md` / `docs/gate.md` / `docs/roadmap.md`，并在「文档索引」登记。
- 功能实现仍未开始；进入实现需先解除上级 `AGENTS.md` §0「只做文档 / 空骨架」的约束。

### v0.1.0（空骨架）

- 按上级技能 `dsh-plugin-project-init` 初始化：bundle 六件套（`package.json` /
  `cordis.patch.yml` / `vite.config.ts` / `scripts/wrap-client.mjs` / `src/client.tsx` /
  README）+ host 空组合根 `lib/index.js` + 自检闸门（`scripts/check-syntax.mjs`、
  `scripts/check-docs.mjs`）+ 插件级 `AGENTS.md`。
- **不使用 openspec**（用户 2026-10-16 决定）：无 `openspec/` 与 `openspec-*` 技能副本。
- 功能实现（协议端接入、会话映射、消息转发、状态面板）**尚未开始**：两个半身的 `apply` 均为空。
