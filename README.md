# dsh-qq-relay

把 **DeepSeek Harness（DSH）** 接入 **QQ 机器人**的自研插件（bundle 包，host + client 双半身）。
当前 **v0.1.0 = 空骨架**：目录、bundle 元数据、构建链路、自检闸门与纪律件齐备，两个半身的
`apply` 都不注册任何东西。**方案已定案（2026-10-18），功能实现尚未开始**——设计见
[docs/architecture.md](./docs/architecture.md)，协议端选型见
[docs/onebot-channel.md](./docs/onebot-channel.md)。

> **v0.1.0**：按上级技能 `dsh-plugin-project-init` 初始化。
> **本项目不使用 openspec**（用户 2026-10-16 决定）——没有 `openspec/`，也没有
> `.agents/skills/openspec-*`；规格与设计随 README 与 `docs/` 走。
> 空骨架唯一的可见副作用：host 半身加载时打一行日志，用于确认 link + bundle 组合生效。
> 装完 / 改完需**重启对应 profile 的 GUI**（由用户执行，本插件不自行 kill / 重启 DSH）。

## 用途（方案已定案，**尚未实现**）

DSH 与 QQ 之间的**双向桥**：

- **QQ → DSH**：QQ 群里的消息经过「消息闸门」过滤后投给某个 DSH 会话，agent 跑完把回复回发群聊；
- **DSH → QQ**：会话 / 工具侧主动往 QQ 推消息（通知、任务完成提醒等，P3）。

**已定案（2026-10-18）**：

- 协议端：**真实 QQ 号 + NapCat + OneBot 11 正向 WebSocket**——DSH 单轮可能超过 5 分钟，官方机器人的群聊被动回复窗口（5 分钟）会让长任务结果只能改走主动消息（受配额、可被关闭）；真实 QQ 号可随时发送。官方通道方案保留为备选（[docs/official-bot-channel.md](./docs/official-bot-channel.md)）。
- 账号：一个 **QQ 小号**登录 NapCat 作 bot，主号操作；**群聊优先**（群 @ 直通 + 群内普通消息经闸门过滤）；单聊放 P3。
- 消息闸门：**10 分钟快路 + 2 小时慢路 + jev 分类器**，@ 直通、最小发言间隔（见 [docs/gate.md](./docs/gate.md)）。
- 运行形态：host 半身单进程插件；client 半身 v1 不做；插件不管理 profile。
- 已知代价：非官方协议端**有封号风险**，需要常开 QQ 客户端 + NapCat。

**仍未定案**：会话映射细节、群审批（按钮）、主动推送工具、媒体收发、client 状态面板——先落 `docs/` 再实现。

**当前没有实现任何功能代码**——上面是契约草案，不是已交付能力。

## 目录结构

```
dsh-qq-relay/
├── package.json          # name + dsh.bundle.patch + dsh.client（link 加载的必要元数据）
├── cordis.patch.yml      # bundle patch：把插件行插入 profile roster
├── vite.config.ts        # client 半身库模式构建（React / @deepseek-ai 全 external）
├── tsconfig.json         # client 半身类型检查（include 只有 src）
├── pnpm-workspace.yaml   # pnpm 11 构建设置（放行 esbuild、关自动 peer 安装）
├── lib/
│   ├── index.js          # host 半身**手写**源码（空骨架：name + 空 apply + 一行加载日志）
│   └── client.js         # client 半身构建产物（已入库，clone 即可加载）
├── src/client.tsx        # client 半身源码 / 组合根（空骨架，MVVM 三层按需展开）
├── scripts/              # wrap-client（产物包装）· check-syntax · check-docs
├── docs/                 # 设计文档（官方通道 / 消息闸门 / 架构 / 路线）
├── README.md             # 本文件
└── AGENTS.md             # 本插件开发纪律（文档在哪 + pnpm check 闸门）
```

## 文档索引

| 文档 | 写什么 | 何时看 |
|---|---|---|
| [README.md](./README.md) | 总览 / 用途 / 用法 / 版本历史 | 任何任务第一步 |
| [AGENTS.md](./AGENTS.md) | 本插件纪律：文档位置速查 + `pnpm check` 闸门 | 动手前 |
| [docs/architecture.md](./docs/architecture.md) | 总体架构：形态、模块、事件流、会话映射、安全、运行前提 | 动手前 / 改设计时 |
| [docs/onebot-channel.md](./docs/onebot-channel.md) | 真实 QQ 号通道：账号模型、NapCat 部署、WebSocket 事件与 API、封号风险 | 接协议端、部署 NapCat 时 |
| [docs/official-bot-channel.md](./docs/official-bot-channel.md) | **备选（当前不采用）**：官方 QQ 机器人通道事实与限制 | 回退 / 对比时 |
| [docs/gate.md](./docs/gate.md) | 消息闸门：快路 / 慢路、jev、去重幂等、状态持久化、配置 | 改群聊行为时 |
| [docs/roadmap.md](./docs/roadmap.md) | 分期、验收标准、风险与用户前置动作 | 排期 / 决定下一步时 |
| [../../AGENTS.md](../../AGENTS.md)、[../../docs/](../../docs/) | 仓库级纪律、渲染树选座速查 | 跨插件协作、装 profile、选 slot |

## 激活方式（当前**未链接**任何 profile）

```bash
dsh plugin --profile <profile> add link:/path/to/dsh-qq-relay
# 装完需重启该 profile 的 GUI 才生效（bundle 组合发生在启动时）
```

- 回滚：`dsh plugin --profile <profile> remove dsh-qq-relay`（不影响本仓库）。
- 验证：重启后宿主日志里应出现 `dsh-qq-relay` 的「已加载（v0.1.0 空骨架…）」一行。
- 链接现状记录在上级 [PROFILES.md](../../PROFILES.md)。

## 开发循环

```bash
pnpm install     # devDependencies：vite / react / typescript（插件**运行时零外部依赖**）
pnpm build       # src/client.tsx -> dist/client.cjs -> lib/client.js（wrap-client 包装）
pnpm watch       # watch 模式：改 src 自动 rebuild + wrap，浏览器刷新可见
pnpm check       # 验收闸门：语法 + 元数据 + tsc --noEmit + 文档↔源码配对
```

- `lib/index.js` 是**手写** host 源码（不经构建）；`lib/client.js` 是 client 半身构建产物，
  已入库——clone 后不装依赖也能被宿主加载。只有改了 `src/` 才需要 `pnpm build` / `pnpm watch`。
- **host / client 热载差异**：改 host 半身要重启 profile 的 GUI；client 半身由宿主的 client 热换
  机制在浏览器刷新后生效。

## 版本历史

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
