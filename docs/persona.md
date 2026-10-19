# 预设与人设（v0.20.0）

> 状态：**已实现（v0.20.0，2026-10-19）**；真机验收待重启 profile GUI 后确认。
> 相关：[architecture.md](./architecture.md)（配置与运行实例）、[config.md](./config.md)（配置总表）、
> [chat-context.md](./chat-context.md)（prompt 拼接）、[client.md](./client.md)（配置页）。
>
> 这里的「预设」= 插件管理的 QQ 会话预设：**persona（系统提示词人设）+ 可选模型 / 思考层级 / 权限**。
> 保存后由 host 动态注册成 DSH agent preset；不需要改 profile 的 `cordis.patch.yml`，也不需要重启 GUI。

## 1. 两种东西不要混

| 名称 | 位置 | 作用 | 生效 |
|---|---|---|---|
| **插件预设** | `~/.dsh/storages/dsh-qq-relay/presets.json`，配置页「预设」页增删改 | persona + 模型 / 思考层级 / 权限 | 保存后立即重新注册；**新会话**应用模型 / 权限 |
| **轻量人设** | 配置 `persona.enabled` / `persona.text` | 每轮 prompt 头部注入 `[角色设定：…]` | 保存后下一条消息 |
| DSH 内置 preset | DSH 自己的 bundle 声明（standard / ptc / …） | 系统提示词 + 工具组合 | 会话创建时 |
| 平台约定 | 无配置 | prompt 末尾「直接输出最终回复…不要用 qq_send 往本群发」 | 每条 relay prompt |

- 插件预设在 DSH 的 preset 选择器里也会出现（id 就是页面里的预设 id），但 **preset 在会话创建时固定**：
  改了预设（或换了模型）要对已有群 `/new` 或「项目 → 重新绑定」。
- 轻量人设是「群内叠加」，不依赖 profile，适合临时改口吻；两者可以同时开。

## 2. 插件预设如何工作

### 2.1 存储与注册

- 文件：`~/.dsh/storages/dsh-qq-relay/presets.json`，结构
  `{ version: 1, updatedAt, presets: [...] }`；首次启动没有文件时用**种子预设**「QQ 群聊」
  （id `qq-relay`），第一次保存后以文件为准，可改可删。
- 启动时 host 依次调用 `ctx.agentPresets.register(definition)`（`@deepseek-ai/dsh-agent-preset`
  行内部用的同一个入口），把预设声明注册进 DSH；保存 / 删除后立即 dispose/重注册。
- 注册定义 = persona 行（`@deepseek-ai/dsh-persona`，`prefix` = 人设文本）+ DSH 内置 `standard`
  的 20 个插件行（`lib/model/preset-template.js`，工具 / 压缩 / 委派等）。**preset 没有继承机制**，
  组合表必须给全量。
- 注册失败的常见原因：id 与 DSH 已有 preset 冲突（页面下拉会标「未注册」，日志有原因）。
  插件停用 / 宿主没有 `agentPresets` 服务时，预设仍保存在文件里，但 DSH 里选不到。

### 2.2 组合表维护（DSH 升级后）

`lib/model/preset-template.js` 是 DSH `packages/bundle/web-app/presets/standard.patch.yml` 的
2026-10-19 快照（去掉 persona 行）。DSH 升级后如果内置 `standard` 增删了插件行：

1. 从 DSH 安装里取 `standard.patch.yml`（源码 checkout 在 `packages/bundle/web-app/presets/`；
   Desktop 在 `app.asar` 内，可用源码仓库）；
2. 用同样的转换（删 persona 行、`!!js` 的 `disabled` 保留为 JS 表达式）重新生成
   `lib/model/preset-template.js`；
3. 重启 GUI，在「预设」页确认列表里没有「未注册」告警。

> 不做自动同步：preset 组合是显式的，升级后需要维护者过一眼。

## 3. 预设字段

`presets.json` 的一个条目 / 页面表单：

| 字段 | 说明 |
|---|---|
| `id` | 小写字母 / 数字 / 连字符，≤41 字符；**创建后不可改**（DSH 会话按它恢复） |
| `name` | 显示名（DSH preset 选择器 / 配置页） |
| `description` | 可选，一句话 |
| `persona` | 人设文本（≤4000 字符），作为系统提示词 `deployment:persona-prefix` |
| `model.provider` / `model.model` | 可选；留空 = 跟随 DSH 默认模型。必须成对 |
| `model.reasoningEffort` | 可选思考层级；空 = 模型默认 |
| `permissionPreset` | 可选权限预设名（沙箱 + 审批组合，来自 `permissionPresets.catalog()`）；空 = 不设置 |
| `order` | DSH preset 列表排序（1..10000），默认 100 |

- 页面下拉的选项来自 host 状态快照：`modelCatalog`（`sessionController.modelCatalog()`）与
  `permissionCatalog`（`permissionPresets.catalog()`）。宿主没有这些服务时模型字段退化为手填。
- 配置 `agentPreset` 指定所有群用哪个 preset（空 = 跟随 DSH 默认）；不是每个群单独选。
- 校验在 host 再做一遍（页面只做即时校验）：id 形状 / 唯一 / 人设上限 / 模型成对 / 权限名长度。

## 4. 会话如何应用模型 / 思考层级 / 权限

每个群会话第一次派发 prompt 前（`relay` 的 `ensureSessionConfigured`）：

1. `sessionController.resolveAgent(sessionId)` 拿到 live Agent；
2. **权限**：`permissionPresets.set(agent.session, preset.permissionPreset)`（只调用一次）；
3. **模型 / 思考层级**：若会话还没有任何模型选择（没有 request header，且 `modelSelection`
   投影的 pending / lastUsed 为空），向会话追加一条 `model/selection` 事件
   （`{ provider, model, reasoningEffort? }`）。**不调用 `sessionController.selectModel`**，
   因为后者会把选择写进 profile 的默认模型（影响所有新 DSH 会话）。
4. 用户之后在 GUI 里手动换模型 / 权限，relay 不会覆盖（每个会话只应用一次；重启后只对
   仍无模型选择的会话补一次）。

> 限制：模型 / 思考层级只作用于「还没发过请求」的会话；换预设的模型不会改已有会话。
> 想换：群里 `/new` 或配置页「项目 → 重新绑定」。

## 5. prompt 形状

```
[QQ群：示例群（10002）] 2026-10-19 20:30 新消息 1 条（直通：@）
[角色设定：你是群里的猫娘助手，说话带「喵」。]
[20:30:01] [tester]（@你）在吗
[历史记录：.qq-relay/chat/10002/（JSONL，按天分文件）]
[说明：直接输出最终回复即可，relay 会自动回发到本群；不要用 qq_send 往本群发。]
```

- 角色设定行来自**轻量人设**（`persona`）；预设的 persona 走系统提示词，不出现在这行。
- 平台约定始终追加；人设文本是可信配置，不要把群消息拼进去（提示注入）。

## 6. 生效与回滚

- 改 / 新建 / 删除预设：保存后立即注册，**无需重启 GUI**；但已有会话不变（要 `/new`）。
- 改 `agentPreset`：新建会话生效；已有群要 `/new`。
- 改轻量人设：下一条消息生效。
- 回滚：`agentPreset: ''` 回 DSH 默认；预设可在页面删掉；`persona.enabled: false` 关掉注入。
- 插件停用后，用插件预设的旧会话可能恢复失败（preset 声明不存在）——恢复前先启用插件，
  或到 DSH 里换 preset。

## 7. 验收

- 重启 dwdev GUI 后：配置页多出「预设」tab；列表里有「QQ 群聊」。
- 新建一个「猫娘」预设（id / 名称 / 人设），保存 → 列表出现、DSH 新建会话的 preset 列表出现「猫娘」；
  宿主日志有「已注册 QQ 预设」。
- 预设里选一个模型 + 思考层级 + 权限 → 群里 `/new` → 新会话第一条请求使用该模型 / 层级，
  权限选择器显示该预设；旧会话不受影响。
- 改人设保存 → 重新注册成功；DSH 里同名 preset 的内容更新（新会话生效）。
- 删除正在使用的预设 → 拒绝（409）；换掉后删除 → 列表消失、DSH 里也不再可选。
- `pnpm check` / `pnpm test` 全绿；预设相关单测覆盖校验 / store / 注册 / 会话应用。
