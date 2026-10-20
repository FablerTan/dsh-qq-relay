# dsh-qq-relay

把 **DeepSeek Harness（DSH）** 接入 **QQ 机器人**的自研插件（bundle 包，host + client 双半身）。
当前 **v0.25.0**：P1「@ 直通」已真机验收（2026-10-19）；P1.5 基础配置页已落地（v0.17.0 起
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
新机器可从零装到 relay 连上（见 [docs/env.md](./docs/env.md)）；v0.24.0 把 **jev（OpenRouter）
API key** 收进配置页「行为」页——保存即热启用分类器，环境变量 `OPENROUTER_API_KEY` 仍可兜底
（只写不读）；v0.25.0 修「一键修复」——改成**逐步补全**（装 Docker / 起 Colima / 写 compose /
起 NapCat 容器 / 写 OneBot / 回填），每完成一步自动重探再继续，不再跳过 NapCat 容器，
token 两边都空时自动生成。设计见
[docs/architecture.md](./docs/architecture.md)，协议端选型与部署见
[docs/onebot-channel.md](./docs/onebot-channel.md)，配置页契约见 [docs/client.md](./docs/client.md)。

> **v0.1.0**：按上级技能 `dsh-plugin-project-init` 初始化。
> **本项目不使用 openspec**（用户 2026-10-16 决定）——没有 `openspec/`，也没有
> `.agents/skills/openspec-*`；规格与设计随 README 与 `docs/` 走。
> 空骨架唯一的可见副作用：host 半身加载时打一行日志，用于确认 link + bundle 组合生效。
> 装完 / 改完需**重启对应 profile 的 GUI**（由用户执行，本插件不自行 kill / 重启 DSH）。
>
> **公开仓库说明**：README 与 `docs/` 里的 QQ 号、群号、昵称、会话 / 文件路径、内网 IP
> 均为脱敏示例，不包含私有部署信息。

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
| [README.md](./README.md) | 总览 / 用途 / 用法 | 任何任务第一步 |
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
| [docs/env.md](./docs/env.md) | 环境一键配置（v0.23.0；v0.25.0 起「一键修复」逐步补全）：`environment` 配置段、7 个检查步骤、白名单动作与固定 argv、逐步修复链与 `fixPlan`、HTTP 契约与安全边界 | 新机器装 NapCat / 排查「环境」页、改环境动作时 |
| [docs/commands.md](./docs/commands.md) | QQ 侧命令层：`/new` / `/stop` / `/status` / `/help`、解析与权限、与闸门的关系 | 改命令 / 排查群内命令不生效时 |
| [docs/reply.md](./docs/reply.md) | 出向回复体验：引用触发消息、处理中占位、直通连发合并、`reply` 配置 | 改回复行为 / 排查回复对不上号时 |
| [docs/tools.md](./docs/tools.md) | `qq_send` 主动推送（文本 / 图片 / 视频 / 文件）/ `qq_poke` 戳一戳：契约、安全、离线语义、验证 | 改工具 / 排查推送失败时 |
| [docs/poke.md](./docs/poke.md) | 戳一戳：事件契约、被戳接话、冷却、聊天记录、`qq_poke` 工具 | 改戳一戳 / 排查戳没反应时 |
| [docs/approval.md](./docs/approval.md) | QQ 侧审批：群里文本命令、角色限制、超时 / 取消 / 离线语义 | 改审批 / 排查审批不生效时 |
| [docs/persona.md](./docs/persona.md) | 角色预设与轻量人设：插件自带 `qq-relay` agent preset、配置页选择、prompt 人设行与平台约定 | 调人设 / 选 preset / 排查回复风格时 |
| [docs/changelog.md](./docs/changelog.md) | 版本历史（按版本倒序）：每版变更、验收结果与用户前置动作 | 追历史 / 判断某行为何时引入时 |
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

## 发布（GitHub Release）

1. 改 `package.json` 的 `version`，并在 [docs/changelog.md](./docs/changelog.md) 顶部加同版本段
   （`## vX.Y.Z …`，这一段就是 Release 正文）；
2. 本地 `pnpm build` 并提交 `lib/client.js`，然后提交、打 tag、推送：

   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

3. GitHub Actions 的 [Release 工作流](.github/workflows/release.yml) 会跑 `pnpm check` /
   `pnpm test` / `pnpm build`，校验 tag 与 `package.json` 一致、`lib/client.js` 已更新，
   从 `docs/changelog.md` 取对应版本段作为 **Release 正文**，并附上 `npm pack` 的 `.tgz`。
   也可以在 Actions 页手动触发并填 tag；版本号与 changelog 不一致会直接失败。

---

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
