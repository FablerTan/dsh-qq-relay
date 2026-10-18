# AGENTS.md — dsh-qq-relay 开发纪律

> 供 AI 代理与人类开发者共用：**在本插件里动手前先读本文件**。
> 本文件只放**本插件自己的入口与硬性纪律**（文档在哪、改完怎么验收）；
> 仓库级规则见上级 [`../../AGENTS.md`](../../AGENTS.md)，功能 / 用法 / 版本历史见
> [README.md](./README.md)。
>
> 本插件是：**DSH ↔ QQ 机器人的桥插件**——host 半身规划连接 QQ 机器人协议端、在 QQ 与 DSH
> 会话之间双向转发消息，client 半身预留状态 / 配置面板。当前 **v0.2.0**：P1 @ 直通
> 已实现并完成真机验收（2026-10-19）；上级 §0 已仅对本插件解除。

## 0. 布局（快速地图）

- `src/` — client 半身源码（React + TS），组合根 `src/client.tsx`，构建产物 `lib/client.js`；
  新增代码按 MVVM 三层落位（`src/model/` → `src/viewmodel/` → `src/view/`，分层细则见 §2 第 4 条）
- `lib/` — 自包含运行时产物；`index.js` 为**手写 host 半身**（P1 已验收），
  分层 = `lib/controller/`（协议端接入、消息编解码、路由与转发）+ `lib/model/`
  （配置、会话映射、状态、聊天日志、回复）；P1 实现 `controller/onebot/{client,api,codec}.js`、
  `controller/relay.js`、`model/{config,mapping,state,chat-log,reply}.js`，`gate.js` / `jev.js` 自 P2 起
- `docs/` — 本插件的长期文档（一文档一主题）：架构、OneBot 通道、消息闸门、路线图；新增后在 README「文档索引」登记
- `scripts/` — `wrap-client.mjs`（client 产物包装）· `check-syntax.mjs` · `check-docs.mjs`

> **本项目不使用 openspec**（用户 2026-10-16 决定）：没有 `openspec/`，也没有
> `.agents/skills/openspec-*`。规格 / 设计写进 README 与 `docs/`；不要擅自
> `openspec init` 把它补回来，确要启用先问用户。

## 1. 文档位置速查（文档优先：先读后写）

| 用途 | 位置 | 何时看 |
|---|---|---|
| 本插件总览 / 用途 / 用法 / 版本历史 | [README.md](./README.md) | 任何任务第一步 |
| 机制细节 / 设计取舍 / 协议端选型 / 已知问题 | `docs/`（一文档一主题，kebab-case 命名；已建立：architecture / onebot-channel / gate / roadmap） | 动功能前对齐方向 |
| 某行为是哪个版本引入 / 为何如此 | README「版本历史」 | 追历史与动机 |
| 仓库纪律 / 渲染树选座 / 工程基线 | 上级 [../../AGENTS.md](../../AGENTS.md)、[../../docs/](../../docs/) | 跨插件协作、装入 profile、选 slot |

- `docs/` 就在**本插件目录下**；新增文档时在 README 的「文档索引」登记一行（路径 + 一句话 +
  何时看），**不在插件根目录放散文件**。
- 探索顺序固定为**文档 → 源码**（本项目无 openspec，规格即为 README + `docs/`）；
  文档与代码冲突时以代码 / 单一实现源为准，并顺手修正腐化文档。

## 2. 硬性纪律

1. **文档同步**：改了行为 / 交互 / 工具 schema / 路由契约 / 版本号 → 在**同一次变更**里同步
   README（版本历史 + 文档索引）与 `docs/` 对应文档，不留「先写代码、文档后补」的债。
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
