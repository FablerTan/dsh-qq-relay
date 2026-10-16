# dsh-qq-relay

把 **DeepSeek Harness（DSH）** 接入 **QQ 机器人**的自研插件（bundle 包，host + client 双半身）。
当前 **v0.1.0 = 空骨架**：目录、bundle 元数据、构建链路、自检闸门与纪律件齐备，两个半身的
`apply` 都不注册任何东西。

> **v0.1.0**：按上级技能 `dsh-plugin-project-init` 初始化。
> **本项目不使用 openspec**（用户 2026-10-16 决定）——没有 `openspec/`，也没有
> `.agents/skills/openspec-*`；规格与设计随 README 与 `docs/` 走。
> 空骨架唯一的可见副作用：host 半身加载时打一行日志，用于确认 link + bundle 组合生效。
> 装完 / 改完需**重启对应 profile 的 GUI**（由用户执行，本插件不自行 kill / 重启 DSH）。

## 用途（目标形态，**尚未实现**）

DSH 与 QQ 之间的**双向桥**：

- **QQ → DSH**：QQ 里收到的消息投成某个 DSH 会话的输入，agent 跑完把回复回发对应 QQ 会话；
- **DSH → QQ**：会话 / 工具侧主动往 QQ 推消息（通知、任务完成提醒等）。

**未定案、动手前必须先落 `docs/` 的部分**：

- 协议端选型：OneBot v11 / v12 实现（NapCat / Lagrange 等）还是官方 QQ 机器人开放平台；
- 路由与会话映射：一个 QQ 群 / 私聊 ↔ 哪一个 DSH 会话，多 profile 并行时怎么隔离；
- 准入与审批：白名单、群聊里谁能触发、危险工具调用要不要在 QQ 侧确认。

**当前没有实现任何功能代码**——上面是方向，不是契约。

## 目录结构

`@
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
├── README.md             # 本文件
└── AGENTS.md             # 本插件开发纪律（文档在哪 + pnpm check 闸门）
`@

## 文档索引

| 文档 | 写什么 | 何时看 |
|---|---|---|
| [README.md](./README.md) | 总览 / 用途 / 用法 / 版本历史 | 任何任务第一步 |
| [AGENTS.md](./AGENTS.md) | 本插件纪律：文档位置速查 + `pnpm check` 闸门 | 动手前 |
| `docs/` | 长期文档，一文档一主题（**尚未建立**；新建后在上一行登记） | 设计 / 机制细节 / 已知问题 |
| [../../AGENTS.md](../../AGENTS.md)、[../../docs/](../../docs/) | 仓库级纪律、渲染树选座速查 | 跨插件协作、装 profile、选 slot |

## 激活方式（当前**未链接**任何 profile）

`@bash
dsh plugin --profile <profile> add link:/path/to/dsh-qq-relay
# 装完需重启该 profile 的 GUI 才生效（bundle 组合发生在启动时）
`@

- 回滚：`dsh plugin --profile <profile> remove dsh-qq-relay`（不影响本仓库）。
- 验证：重启后宿主日志里应出现 `dsh-qq-relay` 的「已加载（v0.1.0 空骨架…）」一行。
- 链接现状记录在上级 [PROFILES.md](../../PROFILES.md)。

## 开发循环

`@bash
pnpm install     # devDependencies：vite / react / typescript（插件**运行时零外部依赖**）
pnpm build       # src/client.tsx -> dist/client.cjs -> lib/client.js（wrap-client 包装）
pnpm watch       # watch 模式：改 src 自动 rebuild + wrap，浏览器刷新可见
pnpm check       # 验收闸门：语法 + 元数据 + tsc --noEmit + 文档↔源码配对
`@

- `lib/index.js` 是**手写** host 源码（不经构建）；`lib/client.js` 是 client 半身构建产物，
  已入库——clone 后不装依赖也能被宿主加载。只有改了 `src/` 才需要 `pnpm build` / `pnpm watch`。
- **host / client 热载差异**：改 host 半身要重启 profile 的 GUI；client 半身由宿主的 client 热换
  机制在浏览器刷新后生效。

## 版本历史

### v0.1.0（空骨架）

- 按上级技能 `dsh-plugin-project-init` 初始化：bundle 六件套（`package.json` /
  `cordis.patch.yml` / `vite.config.ts` / `scripts/wrap-client.mjs` / `src/client.tsx` /
  README）+ host 空组合根 `lib/index.js` + 自检闸门（`scripts/check-syntax.mjs`、
  `scripts/check-docs.mjs`）+ 插件级 `AGENTS.md`。
- **不使用 openspec**（用户 2026-10-16 决定）：无 `openspec/` 与 `openspec-*` 技能副本。
- 功能实现（协议端接入、会话映射、消息转发、状态面板）**尚未开始**：两个半身的 `apply` 均为空。
