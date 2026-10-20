# 画图与视频（ComfyUI，v0.22.0）

> 状态：**已实现（画图 v0.21.0 / 视频 v0.22.0，2026-10-20）**。真实验证：
> ComfyUI 0.39.0 / RTX 4070（`192.168.1.10:8188`）。出图 / 视频均走同一个远端实例：
> - 出图：isolated DSH 启动后 `status.comfy.reachable = true`、`skills` 里 `comfy-image.loaded = true`；
>   `POST /api/comfy/test` 用错误地址返回 `ok=true` + `probe.reachable=false`。
> - 视频：`h3-t2v` 4 步 / 0.2MP / 3s 服务端 **29.1s**（608×352、73 帧、3.04s、带音轨）；
>   `h3-r2v` 同规格 **30.4s**。
> client 产物 `lib/client.js` 已含「画图 / 视频」页文案。
> 相关：[config.md](./config.md)（`comfy` 配置段）、[client.md](./client.md)（「画图 / 视频」二级页）、
> [media.md](./media.md)（产物经 `qq_send` 回发）、[architecture.md](./architecture.md)（skills 服务注入）。
>
> 一句话：插件探测配置的 ComfyUI，连上后把**两个自带的动态 skill**（`comfy-image` 出图 /
> `comfy-video` 视频）注册给 DSH；群里说「画一张…」或「生成一段…视频」时 agent 按 skill 用
> HTTP API 生成，产物落在群项目里，再用 `qq_send` 的 `images` / `videos` 发回群。

## 1. 能力概览

- **开关式**：`comfy.enabled` 默认 **false**；关闭时既不探测，也不注册 skill，开箱行为与旧版一致。
- **服务探测**：host 每 60 秒（以及状态轮询时）GET ComfyUI 的 `/system_stats` 与 `/queue`，
  拿到版本、GPU 名称与队列长度。
- **两个动态 skill**（首次连上后一起注册，**共用** `lib/skills/comfy-image/` 目录与运行器）：

| skill | 模板 | 用途 | 产物 |
|---|---|---|---|
| `comfy-image` | `SKILL.md` | 出图 / 改图：Qwen-Image-2.1（`qwen-t2i` / `qwen-i2i` / `qwen-edit`）+ MOSS-Image（`moss-t2i`） | png / jpg → `assets/comfy/output/` |
| `comfy-video` | `SKILL-video.md` | 短视频（MiniMax H3，带原生音频）：`h3-t2v` / `h3-i2v` / `h3-r2v` | mp4 → `assets/comfy/output/`（按远端 subfolder） |

- 两个 skill 都注册成 `source: "custom"` / `provider: "dsh-qq-relay"` 的 **runtime skill**，
  **所有 cwd 的 DSH 会话都能看到**（QQ 群会话与 GUI 会话）；注册不需要重启 GUI。
  一个模板坏了不影响另一个（各自记录加载状态与错误）。
- **产物回群**：图片用 `qq_send` 的 `images`（≤4 张）发回，视频用 `videos`（≤1 个，内联视频消息）
  发回（详见 [media.md](./media.md) §5.1 / §5.3）。
- **配置页**：「画图 / 视频」二级页可改开关 / 服务地址 / 探测超时 / skill 开关，查看连通性与
  **逐 skill** 的加载状态，并有「测试连接」按钮（只探测、不保存）。

## 2. 架构（配置 → 探测 → skills.register → agent 目录）

~~~text
profile patch / settings.json
  └─ comfy: { enabled, baseUrl, timeoutMs, skillEnabled }
       ↓ normalizeComfyConfig（非法值拒绝保存 / 回落默认）
lib/index.js  apply()
  ├─ createComfyController({ getConfig })        # controller/comfy.js
  ├─ comfyController.start() + refresh()         # 启动探测一次，之后 60s 周期补探测
  └─ ctx.inject(['skills'], ...)                 # skills 服务就绪后 attachSkills(ctx.skills)
       ↓ probeComfy：GET <baseUrl>/system_stats + /queue
       ├─ 可达 && enabled && skillEnabled → 对 COMFY_SKILLS 逐个：
       │     comfy-image  → 渲染 SKILL.md       → skills.register(...)
       │     comfy-video  → 渲染 SKILL-video.md → skills.register(...)
       │     （单个失败只记该 skill 的 error，另一个照常注册）
       └─ 不可达 → 只更新 status，不动已注册的 skill（避免目录抖动）
                     ↓
DSH skill 目录 / 会话可见 → agent 触发画图 / 视频 → scripts/comfy_run.py → ComfyUI POST /prompt
                     ↓
<群项目>/assets/comfy/output[/video]/* → qq_send({ images } / { videos }) → 群聊
~~~

- **与 preset 注册的区别**（见 [architecture.md](./architecture.md) §3）：
  preset 走 `ctx.agentPresets.register()`，影响**新建会话**的系统提示词与组合表；
  skill 走 `ctx.skills.register()`，影响**所有会话**的可用技能。两者都是运行时动态注册，
  都不需要重启 GUI，但互不替代。
- **服务缺失**：宿主没有 `skills` 服务（精简宿主 / 旧版本）时探测照常，
  `status.comfy.supported = false`、两个 skill 都不加载，页面显示原因。
- **零外部依赖**：探测只用全局 `fetch`（可注入桩给单测），模板渲染只用 node: 内置模块。

## 3. 配置示例与字段

profile 的 `cordis.patch.yml`（也可以只写默认值，然后在配置页「画图 / 视频」里改）：

~~~yaml
- id: dsh-qq-relay
  config:
    # …连接 / 项目 / 闸门等已有配置…
    comfy:
      enabled: false                      # 先关着；需要时在配置页打开
      baseUrl: http://192.168.1.10:8188 # ComfyUI HTTP 地址（无鉴权）
      timeoutMs: 30000                    # 探测 / 请求超时，3s..120s
      skillEnabled: true                  # 连上后是否注册 comfy-image / comfy-video
~~~

| 字段 | 默认 | 取值 | 作用 |
|---|---|---|---|
| `comfy.enabled` | `false` | 布尔 | 画图 / 视频总开关；关闭时不探测、不注册 skill |
| `comfy.baseUrl` | `http://192.168.1.10:8188` | 非空 `http://` / `https://` URL | ComfyUI 地址；尾部斜杠会被去掉 |
| `comfy.timeoutMs` | `30000` | 整数 `3000..120000`（毫秒） | 探测与连接测试的超时 |
| `comfy.skillEnabled` | `true` | 布尔 | 连接成功后是否注册两个 skill |

- **层序**：与其它配置项一致——profile patch → 配置页保存的
  `~/.dsh/storages/dsh-qq-relay/settings.json` 覆盖 → `normalizeConfig` 校验。
  非法值（URL 不合法 / 超时越界 / 类型不对）保存失败（400），不写盘。
- **可覆盖子项**：`EDITABLE_COMFY_KEYS = ['enabled', 'baseUrl', 'timeoutMs', 'skillEnabled']`，
  四个字段全部能在「画图 / 视频」页改；合并时只覆盖这四个子项（见 `model/settings.js`）。
- **旧 host 兜底**：host 没返回 `config.comfy` 时页面按「关闭」渲染并提示重启
  （`config.comfySupported = false`），不会白屏。
- **保存后的行为**：先按新配置**立即探测**，只有 `enabled && skillEnabled` 且连得上才注册；
  仅 `comfy` 变化时**不重建 relay 连接**（比较配置时忽略 `comfy`），也不重启 GUI。
- 探测超时的含义是**单个 HTTP 请求**的超时，不是整个生成任务的超时（视频长任务在 skill 里跑）。

## 4. HTTP 路由

路由都在配置页同一 HTTP 面（同源、无独立鉴权），统一 JSON 信封
`{ ok: true, value }` / `{ ok: false, error: { code, message } }`。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET / HEAD | `/dsh-qq-relay/api/status` | 状态快照；画图 / 视频信息在顶层 `comfy` 与 `config.comfy` |
| POST | `/dsh-qq-relay/api/comfy/test` | 探测 ComfyUI，body 可选 `{ baseUrl?, timeoutMs? }` |

`POST /comfy/test`：

~~~json
// 请求（body 可省略；省略时用当前配置）
{ "baseUrl": "http://192.168.1.10:8188", "timeoutMs": 5000 }

// 成功
{
  "ok": true,
  "value": {
    "probe": {
      "target": "http://192.168.1.10:8188",
      "reachable": true,
      "version": "0.39.0",
      "device": "NVIDIA GeForce RTX 4070",
      "queue": { "running": 0, "pending": 0 },
      "error": "",
      "checkedAt": 1790000000000,
      "latencyMs": 12
    },
    "status": { "comfy": { } }
  }
}
~~~

- **只探测、不保存**：不写 settings.json、不改配置、不改 skill 注册，也不更新后台探测的
  `checkedAt`（页面上的「最近检查」仍来自后台轮询）。`probe` 里带 `latencyMs` 供页面显示。
- **探测失败也是成功响应**：地址连不上时仍返回 HTTP 200 + `ok=true`，由 `probe.reachable=false` /
  `probe.error` 表达（实测：错误地址 → `ok=true` + `reachable=false`）；只有参数非法（400）
  或处理器异常（500）才是错误响应。
- 错误码：参数非法 → 400 `COMFY_INVALID`（含具体 problems）；探测异常 → 500
  `COMFY_TEST_FAILED`；当前实例没注入测试处理器 → 501 `CONFIG_UNSUPPORTED`；
  非 POST → 405 `CONFIG_METHOD_NOT_ALLOWED`。body 上限沿用配置页的 64 KiB。
- **状态快照 `comfy` 字段**（页面轮询的数据源；v0.22.0 起 `skill` 单数改为 `skills` 数组）：

~~~json
{
  "enabled": true, "baseUrl": "http://…", "timeoutMs": 30000, "skillEnabled": true,
  "supported": true, "reachable": true, "checking": false, "checkedAt": 1790000000000,
  "error": "", "version": "0.39.0", "device": "NVIDIA GeForce RTX 4070",
  "queue": { "running": 0, "pending": 0 },
  "skills": [
    { "name": "comfy-image", "loaded": true, "error": "" },
    { "name": "comfy-video", "loaded": true, "error": "" }
  ]
}
~~~

- `supported`：宿主是否已挂上 `skills` 服务（false 时两个 skill 一定不加载）。
- `checking`：是否有探测在跑；`checkedAt` / `error` 是最近一次探测结果。
- `skills[].error`：该 skill 的注册失败原因（模板缺失 / 残留占位符 / 没有 skills 服务等），
  一个 skill 失败不影响另一个。
- 旧 host（v0.21.x）只返回单数 `skill`；client 端的兜底会把它读成一个元素的数组，
  页面仍可用但只显示一个 skill。

## 5. skill 生命周期与渲染

### 5.1 注册策略（两个 skill 各自独立）

| 事件 | 动作 |
|---|---|
| 首次探测成功、`enabled && skillEnabled` | 逐个读模板 → 渲染 → `skills.register(...)`，各自保持注册 |
| 某一个模板读取 / 渲染失败 | **只跳过该 skill**，错误写进它的 `skills[].error`；另一个照常注册 |
| 之后探测失败 | **不注销**（ComfyUI 会抖动；skill 留在 DSH 目录里，生成会失败但不反复进出目录） |
| 关闭 `comfy.enabled` | 下一轮同步注销**两个** skill（dispose） |
| 关闭 `comfy.skillEnabled` | 下一轮同步注销两个 skill |
| 宿主 skills 服务卸载 / 插件卸载 | `detachSkills` / `dispose` 注销全部 |

- **触发时机**：插件启动、配置保存（`comfy` 字段被提交）、`skills` 服务就绪、每 60 秒周期探测、
  状态轮询发现超过 30 秒没探测过。注册/探测串行执行，并发调用不会重复注册。
- 注册清单（`lib/model/comfy.js` 的 `COMFY_SKILLS`，`lib/controller/comfy.js` 遍历注册）：

~~~js
COMFY_SKILLS = [
  { name: 'comfy-image', template: 'SKILL.md',       description, whenToUse },
  { name: 'comfy-video', template: 'SKILL-video.md', description, whenToUse },
]
// 每个都注册成：
skills.register({
  name, description, whenToUse,
  content,                             // 对应模板正文（已渲染）
  source: 'custom',
  provider: 'dsh-qq-relay',
  path: '<skillDir>/<template>',
  resourceBase: { kind: 'directory', path: '<插件>/lib/skills/comfy-image' },
})
~~~

  `register` 返回 dispose 函数，注销时调用；返回值不是函数也按「无需清理」处理。

### 5.2 模板渲染

- 两个 skill 的模板都在插件里：`lib/skills/comfy-image/SKILL.md`（出图）与
  `lib/skills/comfy-image/SKILL-video.md`（视频）；注册前各做**两个字面替换**：
  - `{{COMFY_HOST}}` → 当前 `comfy.baseUrl`；
  - `{{SKILL_DIR}}` → 插件内 skill 目录的**绝对路径**（`<插件>/lib/skills/comfy-image`）。
- 替换前先**去掉 YAML frontmatter**（运行时注册的 `content` 只放正文；frontmatter 仅供
  filesystem provider 加载）。
- 替换后若还有 `{{` 残留 → 该 skill 抛错、不注册（坏文本不会进 DSH 目录），错误写进
  对应的 `skills[].error`，另一个 skill 不受影响。
- 模板里不要写死地址 / 插件路径：用占位符；改模板后重启该 profile 的 GUI 才会重新读取。

## 6. QQ 群用法与产物路径

**出图**：

1. 群里直接说「画一张夕阳下的猫」/「把这张图改成雪景」（改图前先把参考图发群里）。
2. agent 看到 `comfy-image` skill → 先用 `scripts/comfy_run.py --list` 确认参数，再提交工作流；
   服务端单张约 6–20 秒（冷启动更久），skill 会先回一句「正在画…」。
3. 产物下载到**当前会话工作目录**（= 该群的群项目目录）的 `assets/comfy/output/`；
   agent 用 `qq_send({ images: ["<绝对路径>"], text: "…" })` 发回群（≤4 张、单张 ≤10 MiB）。

**视频**：

1. 群里说「生成一段…的视频」/「让这张图动起来」/「用这张参考图做一段…」。
2. agent 看到 `comfy-video` skill → 选 `h3-t2v` / `h3-i2v` / `h3-r2v`，先回一句
   「正在生成视频…」（0.4MP / 5s / 8 步通常几十秒，冷启动更久）。
3. 产物 mp4 下载到 `<群项目>/assets/comfy/output/`（runner 打印实际本地绝对路径；远端在
   `素材/output/video/`，若远端 subfolder 为 `video` 本地会落在 `output/video/`）；
   agent 用 `qq_send({ videos: ["<绝对路径>"], text: "…" })` 发视频消息（**一次 1 个**、≤30 MiB、
   NapCat 内联播放）。

~~~text
<群项目>/
├── assets/comfy/output/                 # 出图 / 视频产物（runner 默认输出目录）
├── assets/comfy/output/video/           # 视频产物若远端带 subfolder=video 时落这里（以打印路径为准）
├── assets/comfy/input/                  # 参考图 / 首帧上传暂存（--input-dir 可改）
└── .qq-relay/media/<群号>/<日期>/       # 群里收到的图片（改图 / 图生视频时优先复用）
~~~

- **清理**：`assets/comfy/` 是普通项目文件，**不在** `.qq-relay/` 的
  `chatRetentionDays` / 「立即清理」范围内；需要时由用户自己删。
- **沙箱**：DSH 写沙箱只允许会话工作目录，所以 runner 默认输出 / 输入目录都基于
  `os.getcwd()`；不要往 skill 安装目录或用户图片 / 视频目录写。
- 改图 / 首帧 / 参考图优先用群里最近收到的图片（`.qq-relay/media/` 下的本地路径），
  不要让用户重新上传；`--set image=@<绝对路径>` 会自动上传到远端。

## 7. 图片工作流（Qwen / MOSS）

| 键 | 模型 / 采样 | 节点数 | 必填参数 | 适用 |
|---|---|---|---|---|
| `qwen-t2i` | Qwen-Image-2.1 **base / 20 步 / euler+beta**，cfg 1.0 | 9 | `prompt` | 纯文生图；约 16s（1:1 / 1.0MP） |
| `qwen-i2i` | 同上（base / 20 步 / euler+beta） | 10 | `prompt`、`image` | 参考图编辑；人物一致性最好，提示词宜短，约 16–20s |
| `qwen-edit` | Qwen-Image-2.1 **turbo / 8 步 / euler+simple**，cfg 1.0 | 13 | `prompt`、`image` | 另一种编辑流；尺寸控制更细、人物更容易漂，约 6–12s |
| `moss-t2i` | MOSS-Image SFT **int8 / 20 步 / CFG 5** | 19 | `prompt` | MOSS 文生图；支持自然语言 / tag / JSON Layout 提示词，9:16 2.0MP ≈ 1088×1936，约 66–96s |

- **Qwen 两套参数不能互换**：`qwen-t2i` / `qwen-i2i` 是 base + 20 步 + euler/beta；
  `qwen-edit` 是 turbo + 8 步 + euler/simple。turbo 加步数只会更糙，base 用 8 步没去噪干净；
  cfg 都保持 1.0。
- 常用可调参数（全部白名单化，只能改 `workflows/*.schema.json` 声明的字段）：
  `aspect`（8 种比例）、`megapixels`、`steps`、`seed`、`negative_prompt`、`filename_prefix`；
  `qwen-i2i` 另有 `ref_resolution`（默认 1024，0 = 保原尺寸）；
  `qwen-edit` 另有 `size_mode`（`reference` 默认 / `selector`）与 `ref_resolution`（默认 0）。
- **种子**：`qwen-i2i` 的 API 图里种子写死，schema 标了 `random`，必须由 runner 注入；
  绕开 runner 直连会每次出同一张。
- **`qwen-edit` 的 `size_mode` 语义反直觉**：`reference`（默认）= 出图尺寸跟随参考图，
  此时 `aspect` / `megapixels` **不生效**；要固定比例必须显式 `size_mode=selector`。
- **MOSS-Image 已登记为 `moss-t2i`**（v0.22.0 起）：可以直接用 runner 跑；
  `assets/moss-image.api.json` 只是原始快照。MOSS 的 JSON Layout / 文字 / 密度规则见
  `references/moss-image.md`，**不要套到** qwen 工作流。
- 参数细节 / 实测记录见 `references/workflow-contracts.md`；`--dry-run` 只打印改好的 API 图、不提交。

## 8. 视频工作流（MiniMax H3）

模型是 **MiniMax H3**（pruned int8 convrot + 8 步 turbo LoRA，视频 + 音频双 VAE），
与图片工作流完全独立；一次生成一个 mp4（带原生音轨）。

| 键 | 节点数 | 输入 | 用途 |
|---|---|---|---|
| `h3-t2v` | 18 | `prompt` | 纯文生视频；最通用 |
| `h3-i2v` | 19 | `prompt` + `image`（首帧） | 让已有图片动起来；画面从首帧开始 |
| `h3-r2v` | 20 | `prompt` + `image`（角色参考） | 角色一致性最好；提示词里用 `<Subject 1>` 指代参考角色 |

共同参数（schema 白名单）：

| 参数 | 默认 | 范围 | 说明 |
|---|---|---|---|
| `prompt` | 必填 | 字符串 | 支持 `[0s-2s]` 分镜与 `Audio:` 音效说明；H3 同时生成画面与音频 |
| `steps` | 8 | 4..8 | 8 = turbo 标称（质量档）；4 = 加速档（LightX2V 思路，约减半耗时、细节略降） |
| `aspect` | `16:9` | 8 档 | 默认 16:9；0.4MP 16:9 ≈ 864×480（32 对齐） |
| `megapixels` | 0.4 | 0.1..1.0 | 视频显存敏感，12G 卡别一上来 1.0 |
| `duration` | 5 | 2..10 | 秒；节点换算成帧数并对齐到 **5 mod 17**（5s → 124 帧，3s → 73 帧） |
| `seed` | 随机 | 整数 | `random: true`，runner 注入 |
| `filename_prefix` | `MiniMax_H3` | 字符串 | 远端产物前缀 |
| `image` | 必填（i2v / r2v） | 本地路径或远端文件名 | runner 上传到远端 input，再填节点字段 |

**实测**（2026-10-20，RTX 4070 12G，ComfyUI 0.39.0，服务端含首轮模型加载）：

| 任务 | 参数 | 服务端 | 产物 |
|---|---|---|---|
| `h3-t2v` | 4 步 / 0.2MP / 16:9 / 3s | **29.1s** | 608×352，73 帧 ≈ 3.04s，带音轨，mp4 876KB |
| `h3-r2v` | 4 步 / 0.2MP / 16:9 / 3s（参考图 qwen_i2i_00007.png） | **30.4s** | 608×352，73 帧 ≈ 3.04s，带音轨，mp4 834KB |

- **8 步是质量档、4 步是加速档**：8 步约 2× 采样时间、画面更稳；先用 4 步 / 0.2~0.4MP 预览构图，
  再决定是否重跑。两档不要混着调。
- **i2v 目前只做过 dry-run 接线校验**（`LoadImage(140) → first_frame`、`--set image` 生效），
  未单独真跑；first_frame 结构参考远端历史 `6124f9e9`。首次使用先用短时长验证。
- **提示词按时间线写**更适合视频：`[0s-1s] … [1s-2s] …`，另起一行 `Audio: …` 描述环境声 /
  音效 / 配乐——音频是模型原生生成的，不能后期单独换；想安静就写 `Audio: quiet room tone`。
- **时长越长越慢**：帧数 / 显存 / 时间近似线性增长；12G 卡别一上来 10s + 1.0MP。
- **r2v 的参考图是角色参考，不是首帧**（`ref_image_size=match`）：提示词里用 `<Subject 1>`
  指代，别重复描述长相（容易漂）；首帧版本用 `h3-i2v`，两者不要混用。
- **ComfyUI 一次只跑一个任务**：队列不为 0 时先等；runner 默认最多等 1800s。
- 详细契约 / 节点结构 / 踩坑见 `references/video-workflows.md`。

## 9. 安全边界

- **ComfyUI 默认无鉴权**：任何能访问 `baseUrl` 的人都能提交任务、读产物。
  只把它放在**可信网络**（家用 LAN / SSH 隧道回环），**不要暴露公网**。
- **`POST /prompt` = 远端执行权**：它能提交任意节点图，而自定义节点里可以跑任意 Python；
  直连 `/prompt` 等于把远端机器的执行权交出去。skill 的 runner **只允许改 schema 白名单参数**，
  未知参数 / 非法枚举 / 越界数值在提交前就退出。**不要绕过 runner 手搓工作流 / curl**。
- **群消息是不可信输入**：提示词来自群成员，可能诱导 agent 执行危险工作流；
  白名单参数 + 只出图 / 出视频是当前缓解面。需要更强隔离时，给 relay 会话配受限权限预设
  （见 [persona.md](./persona.md) / [config.md](./config.md) §2.10）。
- **agent 看不到也停不掉远端实例**：不要尝试重启 / kill 远端 ComfyUI；需要重启的改动请用户执行。
- 探测与生成都是**出向 HTTP**（不监听端口），不需要在本机开新端口。

## 10. 文件布局

~~~text
lib/
├── model/comfy.js              # DEFAULT_COMFY / normalizeComfyConfig / maskComfyConfig /
│                               # COMFY_SKILLS（两个 skill 的定义）/ renderComfySkillContent
├── controller/comfy.js         # probeComfy（/system_stats + /queue）/
│                               # createComfyController（探测 / 逐个注册 / 抖动保持 / test / 周期）
└── skills/comfy-image/         # 两个 skill 共用（不会去读外部目录）
    ├── SKILL.md                # 出图模板：含 {{COMFY_HOST}} / {{SKILL_DIR}} 占位符
    ├── SKILL-video.md          # 视频模板：同样两个占位符
    ├── scripts/comfy_run.py    # 运行器（只依赖 Python 3 标准库）
    ├── workflows/              # registry.json + 7 个工作流：
    │                           #   qwen_image_2_1_*（3）· moss_image_t2i · minimax_h3_*（3）
    ├── references/             # workflow-contracts.md / moss-image.md / video-workflows.md
    └── assets/                 # moss-image.api.json（原始快照；已登记 moss-t2i）
src/
├── view/panels/ComfyPanel.tsx  # 「画图 / 视频」二级页（View 层，逐 skill 状态）
├── viewmodel/settings.ts       # 画图 / 视频 tab / describeComfy 状态文案 / testComfy 动作
└── model/{api,form}.ts         # 状态与配置类型（skills 数组）/ comfy 表单字段与校验
~~~

- `package.json` 的 `files` 含 `lib/skills/**`，两个 skill 随插件发布。
- 新增 / 修改字段的改动面见 [config.md](./config.md) §5；client 三层见 [client.md](./client.md) §7。

## 11. 排障

| 现象 | 排查 |
|---|---|
| `reachable=false`，error「连不上 ComfyUI：…」 | 地址 / 端口是否正确；ComfyUI 是否在跑；防火墙；先 `curl -s <baseUrl>/system_stats`。超时调到 3s..120s 再测 |
| 「连接超时（30000ms）」 | ComfyUI 卡在加载模型 / 网络慢；调大 `timeoutMs`（≤120s）或先重启服务 |
| `supported=false` | 宿主没有 `skills` 服务（旧宿主 / 精简宿主）：重启到带 skills 服务的 GUI；探测仍可用 |
| 某一个 `skills[].loaded=false` 且对应 `error` 有内容 | 该 skill 模板缺失 / 读不了 / 有未替换的 `{{…}}` 占位符；看日志 `[comfy] skill … 加载失败…`，另一个 skill 不受影响 |
| 连上了但两个 skill 都「未加载」 | `comfy.skillEnabled` 是否关闭；保存配置触发一次探测；等下一轮 60s |
| 页面只显示一个 skill / 状态未知 | 宿主还是 v0.21.x（只返回单数 `comfy.skill`）：client 兜底为单元素数组；重启到 v0.22.0 host |
| 测试连接返回 200 但 `reachable=false` | 正常现象：地址能解析但服务不可达，看 `probe.error`（实测错误地址就是 `ok=true` + `reachable=false`） |
| 测试连接报 400 `COMFY_INVALID` | 地址不是 http(s) / 超时不在 3s..120s |
| 页面显示「宿主版本较旧」 | host 没返回 `comfy` 配置；重启该 profile 的 GUI |
| 群里画图 / 视频没反应 | 该群会话是否已开画图 / 视频（skill 全 cwd 可见，但 agent 要按 skill 触发）；看 relay 日志与 ComfyUI 队列 |
| 出图 / 视频 400、节点报错 | runner 会打印 `node_errors` 的 message/details；多为远端缺 custom_node / 权重（视频需要 minimax_h3_*） |
| 视频生成很慢 / 显存不够 | 先用 4 步 / 0.2MP / 3s 预览；8 步质量档约 2× 时间；12G 卡别一上来 10s + 1.0MP |
| 图 / 视频发不回群 | 产物路径是否在会话工作目录内；`qq_send images` ≤4 张 / ≤10 MiB，`videos` ≤1 个 / ≤30 MiB；离线不排队 |
| 报 `sendImage / sendVideo is not a function` | runtime 包装缺转发；升级到 v0.21.1（图片 / 文件）或 v0.22.0（视频）并重启 GUI |

- 常用端点：`/system_stats`（存活与版本）、`/object_info`（节点定义）、`/queue`（队列）、
  `/history`（含完整 API 图与产物）、
  `/view?filename=…&subfolder=video&type=output`（取视频产物）。

## 12. 与 workspace 里 comfy-image skill 的关系

- 本插件**自带一份** `lib/skills/comfy-image/`（从工作区里的同名 skill 同步而来，
  含两个模板 / 运行器 / 工作流 / 参考文档）。**运行时只读插件内这一份，不依赖外部目录**——
  工作区里的 skill 删了 / 改坏了都不影响插件。
- **视频工作流来自远端 ComfyUI 的历史**：`h3-t2v` / `h3-r2v` 由远端 `/history` 的 API 图保存，
  `h3-i2v` 由 t2v 图派生（首帧接法参考另一条历史）；新增 / 替换时按
  `references/video-workflows.md`「新增视频工作流」走。
- 同步方向是**手动单向**：工作区 skill 更新后，把 `SKILL.md` / `SKILL-video.md` / `scripts/` /
  `workflows/` / `references/` / `assets/` 复制进插件，保留两类模板里的
  `{{COMFY_HOST}}` / `{{SKILL_DIR}}` 占位符，再跑 `node --test test/comfy.test.js` 与
  `node scripts/check-docs.mjs`。
- 两份内容允许暂时不一致：插件里的副本以「注册给 DSH 的运行时版本」为准；
  长期应保持同源，避免群里的 agent 与 GUI 里的 skill 行为不同。
- workspace skill 里记录的远端绝对路径（ComfyUI 部署目录等）只作为参考资料随副本带过来，
  **本机不要求存在**。

## 13. 升级 DSH 时的注意事项

1. **`skills.register` API**：注册定义字段（`name` / `description` / `whenToUse` /
   `content` / `source` / `provider` / `path` / `resourceBase`）与 dispose 语义由宿主的
   skills 服务决定。升级后先确认宿主 `ctx.skills` 的服务形状没变；若字段改名，
   同步改 `lib/controller/comfy.js` 的 `registerSkills` 与 `provider` / `resourceBase`
   的取值，再重启 GUI 验证 `status.comfy.skills`。
2. **两个 skill 的清单**：`COMFY_SKILLS` 在 `lib/model/comfy.js`；增删 skill 时要同时提供
   模板文件、描述 / `whenToUse`，并让 `status.comfy.skills` 与页面逐条状态对得上。
3. **目录展示长度**：每个 skill 的 `description` 在 DSH 目录里只保留前 500 字符；
   改文案时别把关键触发词放到 500 字符之后。
4. **模板同步**：两个模板注册前都剥 frontmatter、替换两个占位符；宿主若改变 frontmatter /
   运行时 skill 的加载方式，先更新模板与 `renderComfySkillContent`，别直接把带 frontmatter 的
   全文注册进去。
5. **服务缺失是软失败**：skills 服务不存在 / 名字变了时，探测仍工作、页面可用，
   只是 `supported=false`、两个 skill 都不加载；升级后先看这一项再怀疑生成功能。
6. **重启范围**：改 `lib/`（host 半身）要重启该 profile 的 GUI；只改 `src/`（client）构建后刷新页面。
   配置页保存 `comfy` **不需要**重启。

## 14. 相关文档

- `comfy` 配置段 / 覆盖矩阵：[config.md](./config.md) §2.12 / §4
- 配置页「画图 / 视频」页 / `POST /api/comfy/test`：[client.md](./client.md) §2.2 / §5
- skills 服务注入、runtime skill 与 preset 的区别：[architecture.md](./architecture.md) §3
- 产物经 `qq_send` 回发：[media.md](./media.md) §5.1 / §5.3 · 工具契约：[tools.md](./tools.md)
- 真实 ComfyUI 部署与网络前提：[onebot-channel.md](./onebot-channel.md)（NapCat）与
  本文 §9（ComfyUI 只放可信网络）
