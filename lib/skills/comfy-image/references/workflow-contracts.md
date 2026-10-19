# 工作流契约（实测记录）

本目录只记录**已经真跑过**的东西。数字都是在服务端（192.168.1.10，RTX 4070 12G，ComfyUI 0.39.0）
实测的，不是推算；2026-10-19 起本 skill 复制到 macOS，通过局域网 HTTP 复用同一套工作流，
跨机时额外有上传参考图/下载产物的开销。改动工作流或 schema 后请重跑并更新对应小节。

运行入口：`python3 scripts/comfy_run.py <key> --set 参数=值 …`（`--list` 看清单，`--dry-run` 看改好的图）。
产物默认下载到工作区 `assets/comfy/output/`，远端路径也会打印。文中 `backups/`、`素材/`、`tools/`
等相对路径都指远端 `/home/user/comfy/`（本 skill 只带 `scripts/`、`workflows/` 与 `assets/`）。

---

## qwen-t2i：Qwen-Image-2.1 文生图（base 20 步）

图文件 `qwen_image_2_1_t2i.api.json` —— 用户 2026-10-13 从界面 `File → Export Workflow (API)`
导出（sha256 `25b1838b809c9ffb…`），**2026-10-17 按用户实测改为 base 主干 + 20 步 + euler+beta**
（sha256 `3f066dd3…`）。旧图在 `backups/workflows-pre-base-20261017.tar.gz`。
schema 同名。

9 个节点，纯文生图：`459:452 TextEncodeQwenImage21` 的 `images`（autogrow，`min=0`）留空，
尺寸只由 `13 ResolutionSelector` 决定。

```
459:451 UNETLoader(qwen_image_2.1_int8_convrot)
459:453 CLIPLoader(qwen3vl_8b_int8_convrot, type=qwen_image) → 459:452 TextEncodeQwenImage21
459:454 VAELoader(qwen_image_2.1_vae_bf16) ─┬→ 459:457 VAEDecode
13 ResolutionSelector → 459:456 EmptyLatentImage ─┐
459:452 (positive/negative) ──────────────────────┴→ 459:458 KSampler → 459:457 → 461 SaveImageAdvanced
```

依赖权重：`qwen_image_2.1_int8_convrot`(6.8G，base) + `qwen3vl_8b_int8_convrot`(8.7G) +
`qwen_image_2.1_vae_bf16`(0.6G)。turbo 版（`qwen_image_2.1_turbo_int8_convrot`，7.3G）仍在，
切回去时把 `459:451` 换名、`steps` 改回 8。

与 `qwen-edit` 的差异（照搬会踩）：

| | `qwen-t2i` | `qwen-edit` |
|---|---|---|
| 主干 / 步数 | base + **20 步** | turbo + 8 步 |
| 采样器 | `euler` + `beta` | `euler` + `simple` |
| `multiple` | **8** | 32 |
| 参考图 | 无（`images` 留空） | 必填 `image_1` |
| 尺寸开关 | 无（只有 ResolutionSelector） | `459:468` 的 `size_mode` |

实测：

| 参数 | 出图尺寸 | 用时 |
|---|---|---|
| `aspect=16:9 (Widescreen)`，1.0 MP，base 20 步 | 1376×768 | 16.0s（旧 turbo 8 步 10.0s） |

**为什么换成 base：** turbo 是 8 步蒸馏，8 步后的细节是蒸馏近似，皮肤/背景上会留一层颗粒感，
而且再加步数只会更糙（16 步实测比 8 步更花）。base 每一步都在真去噪，20 步把高频残差收敛掉，
画面明显干净；代价是慢 2–3 倍。prompt 仍然是噪点的一阶因素（"中国美女"这种短句会被补成
电影质感的糙画面）。

---

---

## qwen-i2i：Qwen-Image-2.1 参考图编辑（用户自配，2026-10-13 新增）

图文件 `qwen_image_2_1_i2i.api.json` —— 用户 2026-10-13 用 `qwen_image_2_1_t2i.api.json`
改出来的：只加了一个 `470 LoadImage` 接到 `459:452 TextEncodeQwenImage21` 的 `images.image_1`，
其余（主干 / 步数 / 采样器 / cfg / ResolutionSelector）全部沿用 t2i。**2026-10-17 跟随 t2i
切成 base + 20 步 + euler+beta**（sha256 `42d7565b…`）；旧图在
`backups/workflows-pre-base-20261017.tar.gz`。

结构与 `qwen-edit` 的差别（照搬参数会踩）：

| | `qwen-i2i` | `qwen-edit` |
|---|---|---|
| latent 来源 | `13 ResolutionSelector → 459:456 EmptyLatentImage` | `459:468 ComfySwitchNode` 二选一 |
| 主干 / 步数 | base + 20 步 | turbo + 8 步 |
| 采样器 | `euler` + `beta` | `euler` + `simple` |
| `QwenImage21Cache` | **没有** | 有 |
| `resolution`（参考图压缩） | `1024` | `0`（保原尺寸） |
| 尺寸控制 | 只有 ResolutionSelector | `size_mode` + ResolutionSelector |

### 三条必须记住的

1. **种子写死在图里**（`1100480783043082`）。ComfyUI 的 `control_after_generate` 只是节点定义上的
   UI 标记（`ComfyUI/nodes.py:1612`），**服务端与 `/prompt` 都不改种子**；唯一随机化的是运行器
   （`comfy_run.py:151` 按 schema 的 `random: true` 注入）。schema 已标 `random`——
   **绕开运行器直连就必须自己随机，否则每次都是同一张图**（踩过：连跑三次逐像素完全相同）。
2. **提示词越短越有效。** 一句短命令（「把这个人物的姿势改成趴在地上往前爬行，从侧面拍摄」）
   能改姿势、能换整幅背景（夜晚城市天台一次成立）；长句 + 多条「禁止…」会被忽略，
   否定约束和版面约束（禁止多个角色 / 禁止英文标注）基本无效。
3. **双人/回声在最难的姿势上仍会出现。** 早期四张干净不代表没有：同一个爬行提示词换种子后
   抽到过「上方一个角色 + 下方一个角色」的双人构图。**结论：一格里只放一个动作，多试几个种子挑一张。**
4. **参考图决定出图版式（最费时间的一条，踩过两轮）。**

   | 参考图 | 结果 |
   |---|---|
   | 四视图设定稿整张（850×474，不压缩） | **12/12 张都排成多视图版式**（4–6 个形象并排、带 Front/Back View 标注），一张单格都没有；但鳍状耳等细节保真最好 |
   | 从设定稿裁的单视图（225×474） | 能出单格，但被放大 3 倍喂入，鳍状耳糊掉、退化成猫耳/角 |
   | 干净的大图单角色立绘 | 单格 + 细节都成立（**推荐**） |

   结论：**参考图是"版式"时模型就延续版式，是"单个立绘"时才出单格。** 想连续出单格漫画，
   必须提供干净的、够大的单角色立绘（宽度别低于 ~800px、不要带文字标注、不要拼版）。
   实在只有设定稿时的补救办法：让它排版式，再从版式里**裁出单个形象**拼漫画（`feiyu_xuebu_4koma_v3.png`
   就是这么做的）。


### 实测

| 任务 | 结果 |
|---|---|
| 人物一致性 | 明显优于 `qwen-edit`：不同姿势/场景下长相稳定，衣服褶皱与配色不漂 |
| 换背景 | 夜晚天台 + 城市夜景整幅成立（`qwen-edit` 基本只能白底） |
| 改姿势 | 侧视爬行、走路抬腿可成；多元素表情（汗滴 + 蚊香眼 + 问号）抓不住 |
| 单张耗时 | base 20 步 20.0s（1024×1024，1.0MP）；旧 turbo 8 步 8–14s |

## qwen-edit：Qwen-Image-2.1 图像编辑（turbo，单参考图）

图文件 `qwen_image_2_1_image_edit.api.json` —— **用户 2026-10-13 从界面 `File → Export Workflow (API)`
导出，原样登记（sha256 `ed671814c15cf78b…`，3618 字节），不要手改**。schema 同名。

必须给参考图（`470 LoadImage` 是必填），所以它不能当文生图用 —— 文生图用 `qwen-t2i`。

13 个节点：

```
470 LoadImage ─┬→ 472 ImageCompare（对比输出，仅界面用）
               └→ 474 TextEncodeQwenImage21 (images.image_1)
474 输出：0=positive 1=negative 2=参考图尺寸的空潜空间
459:468 ComfySwitchNode: on_false=474#2（参考图尺寸） / on_true=456（ResolutionSelector 尺寸）
459:458 KSampler.latent_image ← 459:468
451 UNETLoader(qwen_image_2.1_turbo_int8_convrot) → 469 QwenImage21Cache → 459:458
453 CLIPLoader(qwen3vl_8b_int8_convrot, type=qwen_image) → 474
454 VAELoader(qwen_image_2.1_vae_bf16) → 457 VAEDecode / 474
459:457 VAEDecode → 461 SaveImageAdvanced
```

依赖权重：

| 用途 | 文件 | 体积 |
|---|---|---|
| 主干（turbo） | `diffusion_models/qwen_image_2.1_turbo_int8_convrot.safetensors` | 6.8G |
| 文本/视觉编码 | `text_encoders/qwen3vl_8b_int8_convrot.safetensors` | 8.7G |
| VAE | `vae/qwen_image_2.1_vae_bf16.safetensors` | 0.6G |

### `size_mode`（图中字段是 `459:468.switch`）

| size_mode | switch | 采样潜空间 | 出图尺寸 |
|---|---|---|---|
| `reference`（默认） | `false` | `474` 的第 2 路输出 | **跟随参考图**，对齐到 32；`aspect`/`megapixels` 无效 |
| `selector` | `true` | `456 EmptyLatentImage` | 由 `13 ResolutionSelector` 决定 |

两种模式下参考图都通过 `reference_latents` 注入条件，所以 `selector` 不是"文生图"，
而是"以原图为条件、按指定尺寸重绘"。

### `ref_resolution`（图中字段是 `459:474.resolution`）

`0` = 参考图保持自身尺寸（只对齐 32），细节最全；`>0` = 压到约 `resolution²` 像素后同时喂给
视觉塔和 VAE，更快但丢细节。默认 `0` 与原始导出一致。

### 实测

| 用例 | 参考图（输入尺寸） | 参数 | 产物 | 用时 |
|---|---|---|---|---|
| 原样复跑 | `example-image.png` | 默认全部 | 864×480 | 6.0s |
| 换尺寸模式 | `example-image.png` | `size_mode=selector`，1:1 / 1.0MP | 1024×1024 | 8.0–9.0s |
| 换参考图 | `agent_qwen_t2i_00001.png`(1024×1024) | 默认 + 换提示词 | 1024×1024 | 12.0s |
| 换参考图 | `咕咕嘎嘎-三视图.png` | 默认 + 换提示词 | 1248×704 | 9.1s |

规律：`size_mode=reference` 时**出图尺寸 = 参考图尺寸对齐到 32**（850×474 → 864×480）。

### 另有

- `472 ImageCompare` 会额外产出 `type=temp` 的对比图（`a_images`/`b_images`），不是产物，
  运行器只统计不列出。它的 `compare_view` 以 `{"__value__": ["", ""]}` 形式导出，服务端接受。
- **多参考图**：`474` 的 `images` 支持 `image_1` … `image_16`，但本图只导出了 `image_1` 一个槽。
  要接第二张，得往图里加 `LoadImage` 节点并补 `images.image_2`（按 `470`/`image_1` 的写法复制）。

---

## 已清理的工作流（2026-10-13）

按用户要求，`ComfyUI/user/default/workflows/` 下 11 个界面工作流全部清走，注册表里自建的
`qwen-t2i` 也一并移除，只留上面这一个编辑流。备份（都校验过可完整读取）：

| 备份 | 内容 | 恢复 |
|---|---|---|
| `backups/workflows-20261013.tar.gz`（91K） | 清理前的 11 个界面工作流 | `tar xzf backups/workflows-20261013.tar.gz -C ComfyUI/user/default/` |
| `backups/api-workflows-20261013.tar.gz`（3.8K） | 清理前的注册表（含 `qwen-t2i` 的 api + schema） | `tar xzf backups/api-workflows-20261013.tar.gz --transform 's,^api-workflows,workflows,' -C .` |
| `backups/workflows-20260913.tar.gz`（82K） | 更早的 10 个界面工作流（含两个已删的 Z-Image 文件） | 同上 |

⚠️ 当时清掉的 `qwen-t2i` 是**我手写的那份**（`euler` + `multiple=32`）。它只在
`backups/api-workflows-20261013.tar.gz` 里，**没有被重新登记**——因为用户随后导出了新的
`image_qwen_image_2_1_t2i.json`（`heun` + `multiple=8`），也就是上面第一节那个，两者的节点 id
与采样参数都不同。想对照手写版可以从备份取：

```bash
tar xzf backups/api-workflows-20261013.tar.gz --transform 's,^api-workflows,workflows,' -C .
```

---

## 维护约定

- **节点 id 会变。** `qwen-edit` 的 id 是子图展平后的 `459:NNN` 形式；在界面里增删子图内节点
  后重新导出，id 可能整体改变。schema 里每个参数都写着 `node`，重导出后必须逐个核对
  （`--dry-run` 后对一眼 `inputs` 就知道有没有写错字段）。
- **加参数前先用 `/object_info` 查真实字段名与取值范围**，别按常识猜：
  `curl -s http://127.0.0.1:8188/object_info/ResolutionSelector`。
- **默认值也会被类型检查。** 枚举型参数在 schema 里写的是人话键名（如 `reference`），
  运行器负责翻译成节点值（`false`）。踩过的坑：默认值绕过转换直接写进图，
  `"reference"` 这种非空字符串被当成真值，把 `switch` 悄悄翻成 `true`。
- **每次真跑后把耗时和尺寸补进上表**，这些数字是判断回归是否有问题的唯一依据。
