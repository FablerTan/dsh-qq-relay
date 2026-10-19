# 角色预设与轻量人设（v0.19.0）

> 状态：**已实现（v0.19.0，2026-10-19）**；真机验收待重启 profile GUI 后确认。
> 相关：[architecture.md](./architecture.md)（配置与运行实例）、[config.md](./config.md)（字段总表）、
> [chat-context.md](./chat-context.md)（prompt 拼接）、[client.md](./client.md)（配置页）。
> 上级 DSH 侧概念：agent preset = 一组插件行（persona + 工具 + 压缩 + 委派等），在
> `sessionController.create({ agentPreset })` 时绑定；**会话创建后固定**，切换要新建会话。

## 1. 为什么需要两层

QQ 群聊和「写代码的 DSH 会话」不是同一种对话：

- **系统提示词层**（agent preset）：模型的身份、语气、是否使用 Markdown、是否直接输出最终回复。
  这一层只在 preset 里能改，必须**在会话创建时**确定。
- **群内叠加层**（轻量人设）：某个群今天的角色设定（猫娘 / 客服 / 群主口吻），改起来要立刻生效、
  不想动 profile。这一层做成配置页字段，每轮 prompt 注入。

于是分两条路径，互不替代：

| 层 | 配置 | 强度 | 生效 |
|---|---|---|---|
| DSH agent preset | `agentPreset`（全局，默认空） | 系统提示词（persona 段落） | 新建会话时；已有群要 `/new` 或「重新绑定」 |
| 轻量人设 | `persona.enabled` + `persona.text`（≤4000 字符） | 每轮 prompt 头部 `[角色设定：…]` | 保存后下一条消息 |
| 平台约定 | 无开关，始终追加 | prompt 末尾一行 | 每条 relay 发起的 prompt |

## 2. 插件自带的 `qq-relay` 预设

bundle patch（`cordis.patch.yml`）里插入了一条 `@deepseek-ai/dsh-agent-preset` 声明：

- Loader 行 id：`preset-qq-relay`；preset id：`qq-relay`；显示名：**QQ 群聊**；`order: 20`。
- `plugins` 是 DSH 内置 `standard` 预设组合表的**完整拷贝**（persona、agent-instructions、
  time-context、bash / pwsh、fs、jobs、schedule、skill、goal、plan-mode、compaction、delegation、
  ask-user、todo、web、present、plugin-manager），只把 `persona.prefix` 换成 QQ 群聊版：
  「你是 QQ 群里的群友……直接输出最终回复文本即可，relay 会自动回发到本群；不要用 qq_send 往本群发。」
- 装好插件、重启 profile GUI 后，在 DSH 新建会话的 preset 选择里就能看到「QQ 群聊」；
  relay 配置页「行为 → 角色与人设 → 默认 Agent 预设」也会列出它（数据来自宿主 `agentPresets.list()`）。

### 维护：DSH 升级后要重新同步组合表

DSH 的 preset **没有继承 / 引用机制**，第三方 bundle 只能复制整份组合表。因此：

- DSH 升级后如果 `standard` 增删了插件行（新工具、新的提示词段），`qq-relay` 不会自动跟上。
- 同步方法：从安装的 DSH 里取 `@deepseek-ai/dsh-web-app` 的 `presets/standard.patch.yml`
  （源码 checkout 在 `packages/bundle/web-app/presets/`；Desktop 在 `app.asar` 内，可用源码仓库），
  把 `- id: preset-standard` 起的条目改名为 `preset-qq-relay` / `id: qq-relay`，替换 persona
  `prefix`，保留其余行，整体替换 `cordis.patch.yml` 里这一段。
- 升级后建议在 DSH 里看该 preset 是否仍可用（激活失败的 preset 会带 `broken` 原因，配置页下拉里
  显示「（不可用）」）。

### 自定义预设（可选）

不想用插件自带的，可以按 DSH 的 bundle 方式自建一个（例如「猫娘」）：

~~~yaml
- insert:
    - id: preset-catgirl
      name: '@deepseek-ai/dsh-agent-preset'
      config:
        id: catgirl
        name: 猫娘
        description: QQ 群里的猫娘角色。
        order: 30
        plugins:
          - id: persona
            name: '@deepseek-ai/dsh-persona'
            config:
              prefix: 你是群里的猫娘助手，每句话结尾带上「喵」；直接输出最终回复，不要用 qq_send 往本群发。
          - id: agent-instructions
            name: '@deepseek-ai/dsh-agent-instructions'
          - id: tool-fs
            name: '@deepseek-ai/dsh-tool-fs'
          # 其余工具 / 压缩 / 委派行按需要补齐（可参考 standard）
~~~

装进 profile（或让 DSH 的 plugin_manager 安装）后，relay 配置页下拉里出现「猫娘」即可选。
没有继承机制，**行不全的 preset 会让会话缺工具**（例如没有 compaction 的长时间群聊会膨胀）。

## 3. 配置字段

```yaml
dsh-qq-relay:
  config:
    agentPreset: qq-relay        # 空 = 跟随 DSH 默认 preset
    persona:
      enabled: false             # 默认关闭
      text: |                    # ≤4000 字符；开启时不能为空
        你是群里的猫娘助手，说话带「喵」。
```

- `agentPreset` 只接受小写字母 / 数字 / 连字符（DSH preset id 形状）。
- 配置页「行为 → 角色与人设」可改这两项；保存即重建 relay（无需重启 GUI）。
- `agentPresets` 服务缺失（宿主版本过旧 / 非 Web bundle）时页面隐藏下拉并提示；`agentPreset`
  仍然保留在配置里，等宿主支持后生效。
- 状态快照的 `agentPresets` 字段：`{ supported, items[], missing }`；`items` 里 `broken` 非空
  表示该 preset 激活失败；`missing` 表示配置里的 preset 已不在名册（建会话会退回默认）。
- 实现注意：`ctx.get('agentPresets')` 在插件 `apply()` 阶段可能返回 **undefined**（服务尚未提供），
  必须把 undefined 与「不是 `list()` 服务」一起判掉；否则激活抛错会让整条插件行失效、配置页
  请求全部 404/405。v0.19.0 曾踩过这个坑，`test/apply.test.js` 已有回归用例。

## 4. prompt 形状

```
[QQ群：示例群（10002）] 2026-10-19 20:30 新消息 1 条（直通：@）
[角色设定：你是群里的猫娘助手，说话带「喵」。]
[20:30:01] [tester]（@你）在吗
[历史记录：.qq-relay/chat/10002/（JSONL，按天分文件）]
[说明：直接输出最终回复即可，relay 会自动回发到本群；不要用 qq_send 往本群发。]
```

- 人设行只在 `persona.enabled === true` 且文本非空时出现；换行会折成空格。
- 平台约定始终最后一行（空批次不生成 prompt；命令回复 / 占位不走这条链）。
- 人设文本是**可信配置**：不要把群友消息拼进 `persona.text`，否则等于把提示注入写进系统约定。

## 5. 生效与回滚

- 改 `agentPreset`：只影响**之后新建**的会话；已有群在群里发 `/new`，或配置页「项目 → 重新绑定」。
- 改 `persona`：保存后下一条 relay prompt 生效（不需要新会话）。
- 回滚：`agentPreset: ''` 回 DSH 默认；`persona.enabled: false` 关闭注入；改坏了直接在配置页存回即可。

## 6. 验收

- 重启 dwdev GUI 后：DSH 新建会话的 preset 列表里有「QQ 群聊」；配置页「行为」下拉能看到它。
- 选「QQ 群聊」→ 群里 `/new` → 新会话的系统提示词带 QQ 群聊人设；旧会话不受影响。
- 开启轻量人设 → 群里 @ bot → prompt 里出现 `[角色设定：…]`，且末尾有平台约定行。
- 人设为空 + 勾选开启 → 保存被拒（提示填文本）；关掉后 prompt 与 v0.18.0 等价（多一行平台约定）。
- preset 不存在（手改 config）→ 状态提示 missing，建会话退回默认且不崩。
- `pnpm check` / `pnpm test` 全绿；host 改动需重启 profile GUI。
