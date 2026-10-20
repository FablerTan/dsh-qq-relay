# MOSS-Image 提示词规则（仅此模型）

> **适用范围：只适用于本部署的 MOSS-Image。**
> 对应权重 `moss_image_sft_*`、节点 `MOSSImage*`、界面工作流
> `ComfyUI/user/default/workflows/MOSS-Image-SFT_int8.json`。
>
> **不要套用到 `qwen-t2i` / `qwen-i2i` / `qwen-edit`，也不要套用到其它模型。**
> JSON Layout、bbox 摆放、4096 token 文本编码器都是 MOSS-Image 自己的模型能力，
> 不是 ComfyUI 的通用功能；Qwen 那三个工作流仍然按 SKILL.md 里的「turbo + 短提示词」规则走。

本文件只记录**已经真跑过**的结果。测试机器：192.168.1.10（RTX 4070 12G，ComfyUI 0.39.0），
MOSS-Image SFT（int8_convrot 量化），2026-10-17 实测。
Base 与 SFT 共用同一套提示词/JSON Layout 规则；本部署用的是 SFT 权重。

> 本文件在本机（macOS）复用时：提交代码里的 host 用 `http://192.168.1.10:8188`；
> 产物用 `/view` 下载回工作区 `assets/comfy/output/`，远端落点仍是 `/home/user/comfy/素材/output/`。

---

## 1. 部署现状

| 项 | 值 |
|---|---|
| 节点包 | `ComfyUI/custom_nodes/moss-image`（6 个节点：`MOSSImageUNETLoader` / `MOSSImageCLIPLoader` / `MOSSImageHF*Loader`） |
| 主干 | `模型/diffusion_models/moss_image_sft_int8_convrot.safetensors`（5.2G，int8_tensorwise + convrot） |
| 文本编码器 | `模型/text_encoders/moss_image_qwen35_9b_int8_convrot.safetensors`（8.9G，Qwen3.5-9B） |
| VAE | `模型/vae/moss_image_sft_vae.safetensors`（250M，标准 `VAELoader` 可读，128 通道 / 16×） |
| 界面工作流 | `ComfyUI/user/default/workflows/MOSS-Image-SFT_int8.json`（拆件版，不用 HF Loader）；已按 `moss-t2i` 登记进 `workflows/registry.json`，可直接用 `comfy_run.py` 跑 |
| 画布 | `ResolutionSelector` = 9:16 / 2.0 MP / 16 倍数 → **1088×1936**（1.5 MP 档是 944×1680） |
| 采样 | 20 步 / CFG 5 / `euler` + `sgm_uniform` / shift 5 / SLG `single_layers=22` / `comfy kitchen attention` |
| 耗时 | 66–68s（单条短提示词）· 72–76s（19 项 layout）· 90–96s（48 项 / 3966 tokens） |

官方推荐是 **≥50 步、CFG 3、空负向**；当前 20 步 / CFG 5 是这套 int8 SFT 的工作点，能跑，
但细节/文字崩坏时优先加到 40–50 步再判断。官方推荐负向词：
`nsfw, worst quality, bad anatomy, watermark, jpeg artifact`。

> ⚠️ **API 导出可能坏提示词**：2026-10-17 的一次 `File → Export Workflow (API)` 里，
> 正向提示词的 26 对花括号全部丢失（7298 → 7246 字符，正好少 52 个 `{`/`}`），`json.loads` 直接失败。
> 提交前必须用 `json.loads` 校验一遍正向提示词；坏了就从 UI 里重新复制原文本。

---

## 2. 三种提示词格式

MOSS-Image 官方支持三种，可以混用：

1. **自然语言**：一段英文（训练数据最多）或中文描述。
2. **tag 序列**：逗号分隔，推荐顺序 Quality → Score → Meta → Year → Character → Series → Artist → General。
3. **JSON Layout**：用 `summary` + `items` 精确控制「什么东西、放在哪、多大、什么颜色、写什么字」。

只想要普通画面时**不要用 Layout**；Layout 是给「文字位置、海报、多面板、物体相对关系」用的。
简单的结构化 caption 也可以只写：

```json
{"caption": "A ..."}
```

---

## 3. JSON Layout 的 schema

顶层只有四个字段：

```json
{
  "summary": {},
  "items": [],
  "bbox_coord_space": "abs_centralized",
  "bbox_format": "yxyx"
}
```

`summary` 支持：

| 字段 | 说明 |
|---|---|
| `caption` | **必填**，全局画面/风格描述（不要空着） |
| `meta` | 媒介/类型标签，如 `["poster","museum"]` |
| `canvas` | `single` / `multi_panel` / `collage` |
| `palette` | 全局色板（hex 数组） |

`items` 是扁平数组，每项：

| 字段 | 说明 |
|---|---|
| `label` | **官方只有** `object` / `character` / `text`（`panel`、`subject` 是教程自造，模型能画但属 off-spec） |
| `caption` | 该元素的外观、材质、动作、朝向 |
| `bbox` | `[y1, x1, y2, x2]`，画布中心为原点，绝对像素 |
| `text` | `label="text"` 时必填，要渲染的**准确字形与换行**（`\n`） |
| `tags` | 可选关键词 |
| `palette` | 可选局部色板 |

### 坐标与画布换算

写草稿时用「左上角原点」的像素 `[x1, y1, x2, y2]`，编译成成品：

```
compiled = [y1 - H/2, x1 - W/2, y2 - H/2, x2 - W/2]
```

例：1088×1936 画布的全幅 panel `[0,0,1088,1936]` → `[-968,-544,968,544]`。
反过来，看到成品里的全幅 panel `[-824,-472,824,472]`，就能反推出画布是 **944×1648**。

**成品 prompt 里不带 `width`/`height`**（官方编译器会删掉），所以画布尺寸必须在生成侧对齐：

- prompt 是 944×1648 → 工作流必须出 944×1648；
- 工作流是 1088×1936 → prompt 必须按 1088×1936 编译。

画布不一致的后果：整体按中心锚点缩放，四周留白、全幅 panel 撑不满，文字框也跟着漂。
更省事的做法是直接把 `EmptyFlux2LatentImage` 设成 prompt 反推出的尺寸（必须是 16 的倍数），
而不是依赖 `ResolutionSelector` 凑。

### 最小可用示例（草稿 → 编译）

草稿（左上角像素，1024×1024）：

```json
{
  "width": 1024, "height": 1024,
  "bbox_coord_space": "abs", "bbox_format": "xyxy",
  "summary": {"caption": "A minimalist travel poster with a cream background and a blue mountain.", "canvas": "single"},
  "items": [
    {"label": "text", "caption": "Large dark-blue uppercase title centered at the top.", "text": "EXPLORE", "bbox": [128, 64, 896, 192]},
    {"label": "object", "caption": "A flat blue mountain illustration in the lower center.", "bbox": [256, 512, 768, 960]}
  ]
}
```

编译后：

```json
{"summary":{"caption":"A minimalist travel poster with a cream background and a blue mountain.","canvas":"single"},"items":[{"label":"text","caption":"Large dark-blue uppercase title centered at the top.","text":"EXPLORE","bbox":[-448,-384,-320,384]},{"label":"object","caption":"A flat blue mountain illustration in the lower center.","bbox":[0,-256,448,256]}],"bbox_coord_space":"abs_centralized","bbox_format":"yxyx"}
```

官方编译器（带校验，会拒绝未知字段/越界框）：
`https://github.com/OpenMOSS/MOSS-Image/blob/main/skills/moss-image-prompt-enhancer/scripts/compile_prompt.py`

---

## 4. 文字：很强，但怕「连续编号 + 同构行」

实测（1088×1936）：

| 场景 | 文字条数 | 逐字精确 | 典型失败 |
|---|---|---|---|
| 规整 2×2 网格（四象） | 11 | 7 | 四条编号标签：`01 青龙 · 东` → `01 · 青龙 · 东`，或行尾续写 `02`/`04` |
| 杂乱拼贴（旅行手账） | 8 | **8** | 无；`·`、`°`、句点、中文全对 |
| 极限密度 48 项 | 6 | **6** | 坐标文字被印了两行（一条坏字符 `118.23.0.2`） |

结论与写法：

1. **分隔符必须写进 `text`**，不要靠空格暗示。想要 `壹 · 青龙 · 东` 就把中间两个 `·` 直接写进
   `text`；写 `壹 青龙 · 东` 模型会自己补一个点。
2. **不要放一排连续阿拉伯编号**。模型会把它当序列续写，行尾多出下一个数字。
   规避：用中文数字（壹贰叁肆）、把编号和名字拆成两个独立 `text` item、或让标签不在同一行相邻。
3. **文字框要给足高度**：字形通常只占框高的 60–80%，56px 的标签行是最脆弱的区域。
4. **caption 别以 `The word ...` 开头**。实测有一次把开头的 `The` 也渲染到了画面上。
   改成 `WANDERLUST is written ...` 或 `Large serif letters reading WANDERLUST ...`。
5. 62 字符的英文页脚在 32px 高也能全对——**长度不是主要矛盾，重复模式才是**。

---

## 5. 倾斜文字（实测 A/B）

JSON schema **没有 rotation/italic 字段**，`bbox` 永远轴对齐；倾斜只能写进 `caption`。
同一画布、同一 bbox、同一种子（20261017），只改措辞，全部 1088×1936、整幅米纸背景：

| 版本 | caption 措辞 | 实测基线角 |
|---|---|---|
| v0 | 无倾斜词 | **0.0°** |
| v1 | `italic` | **-3.5°**（字形倾斜，基线基本水平） |
| v2 | `slanted upward about 15 degrees` | **-18.7°** |
| v3 | `rotated counter-clockwise by 15 degrees` | **-18.8°** |
| v4 | `rising baseline, tilted like a signature, about 15 degrees` | **-19.4°** |
| v5 | `skewed diagonally, ... roughly 20 degrees` | **-18.9°** |
| v6 | `slanted upward 5 degrees` | **-16.9°** |
| v7 | `slanted upward 30 degrees` | **-21.8°** |
| v8 | 中文「去远方」+ `slanted upward about 15 degrees` | **-13.6°** |
| v9 | 中文「去远方」+ `oblique` | **-7.3°** |

（负号 = 右端向上；用文字底部包络线拟合基线，比 PCA 更能区分「斜体」与「整体旋转」。）

结论：

1. **措辞完全等价**：`slanted` / `rotated` / `skewed` / `rising baseline` / `signature`
   都落在 -18.7 ~ -19.4°，外观几乎一样，挑最短的写。
2. **角度数值基本不被理解**：5°→16.9°，15°→18.7°，20°→18.9°，30°→21.8°；
   统一被压进 **17–22°** 的窄带。模型只有「明显倾斜」一档，不会按数值插值。
3. **`italic` 是另一回事**：只写 italic 是「字形歪、基线平」（拉丁 -3.5°，中文 oblique -7.3°），
   适合轻微斜体感，不等于整体旋转。
4. **中文比拉丁温和**：同样写 15°，中文毛笔字约 -14°，拉丁衬线约 -19°；中文方差也更大。
5. 倾斜后文字会往右上溢出轴对齐的框，**框要留余量**。
6. 要精确角度（8°、45°）不要靠模型：把文字单独渲染后旋转合成。

可直接抄的写法：

- 明显倾斜：`slanted upward about 15 degrees`（结果 ~19° / 中文 ~14°）
- 轻微斜体：`italic serif` 或中文 `oblique, leaning to the right`
- 保持水平：不出现 `italic / slanted / tilted / skewed / oblique`，写 `horizontally aligned, even baseline`

---

## 6. 密度上限与 token

- 文本编码器上限 **4096 tokens**，节点里直接 `tokens[:4096]` 截断；超了从尾部静默丢内容。
- 实测极限：**48 个 item（42 物件 + 6 段文字）= 3966 tokens**（加模板约 3974，余量 ~122）。
- 结果（两个种子）：
  - 物件 **41 / 42**；A 漏茶叶罐、B 漏开瓶器——**漏的不是同一件**，并起来 42 件都出现过。
  - 文字 **6 / 6** 全对；坐标被重复印了两行。
  - 重复比丢失更常见：袜子 ×2（两个种子都有）、A 的钱包 ×2 / 胶卷 ×3 / 牙刷 ×2、B 的备用镜头 ×2 / SD 卡 ×2。
  - 行内顺序会漂、跨行搬运（笔记本 R3→R2、数据线 R2→R4）；**bbox 从硬约束退化为软提示**。
  - 先丢的是**小件、低对比度件**（绿罐压绿布、细钢开瓶器）；大件/高对比度件都稳。
- 建议：
  - 高保真：**≤ 32–36 个 item / ≤ 3200 tokens**。
  - 40–48 个：能用，但接受「每张随机漏 1 件 + 重复 2–4 件」，重要物件别赌这个区间。
  - 别贴着 4096 跑；再加两句就可能截断尾部 item。
  - 真要 48 件且每件都准：拆成两次生成再拼，或用 `summary.canvas="multi_panel"` 分区。

---

## 7. 构图、图层与重叠

- **item 顺序 ≈ 图层顺序**：先写背景/纸张，再写压在上面的胶带、文字。实测压盖关系按列表顺序成立。
- 重叠是允许的：官方语义里 bbox 只是「摆放提示」，不是蒙版、不是描边，也不会自动画边框。
- `summary.caption` 决定整体风格/光线/材质；写成 `photographed from above` 就会出实拍俯拍感，
  写成 `flat vector` 才是扁平插画。

---

## 8. 验收清单（MOSS Layout 提交前）

1. 正向提示词能 `json.loads` 通过；没有丢花括号/引号。
2. `bbox_coord_space="abs_centralized"`、`bbox_format="yxyx"`；所有 `bbox` 在 `±W/2, ±H/2` 内且 `y1<y2, x1<x2`。
3. 生成尺寸 == prompt 编译画布（当前 1088×1936；若换尺寸，重编译或重设 latent）。
4. `summary.caption` 非空；`label` 尽量只用 `object/character/text`。
5. token < 4000（留余量）；item 数 ≤ 36 为稳。
6. 文字：分隔符写死、无连续编号行、框高足够；要倾斜就写一句 `slanted upward about 15 degrees`，接受 ~19°/14°。
7. 负向词按官方：`nsfw, worst quality, bad anatomy, watermark, jpeg artifact`。

---

## 9. API 工作流资产

可直接提交的 API 图在 **`assets/moss-image.api.json`**（位于 skill 根目录的 `assets/` 下）：

- 13 个节点，`sha256 32848ce145614ec3f2811eb394cdce56c1f4a6a3186579d5d5203a8ea0afe64f`，7233 字节。
- 正向提示词里嵌的是本文「四象」实测 layout（4007 字符 / 17 项），画布 1088×1936，seed 20261017。
- 它是 `ComfyUI/user/default/workflows/MOSS-Image-SFT_int8.json` 的 API 快照；**节点结构不要手改**，
  UI 工作流变了就重新导出并替换这个文件。

节点表：

| id | class_type | 作用 |
|---|---|---|
| 1 | `MOSSImageUNETLoader` | 主干 `moss_image_sft_int8_convrot` |
| 2 | `MOSSImageCLIPLoader` | 文本编码器 `moss_image_qwen35_9b_int8_convrot` |
| 3 | `VAELoader` | VAE `moss_image_sft_vae` |
| 4 | `CLIPTextEncode` | **正向提示词**（改这里） |
| 5 | `CLIPTextEncode` | 负向提示词 |
| 6 | `EmptyFlux2LatentImage` | width/height 由节点 19 喂入 |
| 13 | `SkipLayerGuidanceDiTSimple` | `single_layers="22"`，start 0 / end 1 |
| 15 | `ModelSamplingSD3` | shift 5 |
| 16 | `KSampler` | 20 步 / CFG 5 / euler / sgm_uniform（改 seed 也在这里） |
| 17 | `VAEDecode` | — |
| 18 | `SaveImage` | 输出到 `素材/output/`，前缀 `moss-json-test`（可改） |
| 19 | `ResolutionSelector` | 9:16 / 2.0 MP / 16 倍数 → 1088×1936 |
| 20 | `ModelAttentionBackend` | `comfy kitchen attention` |

提交与取图（只依赖标准库）：

```python
import json, time, uuid, urllib.request

graph = json.load(open('assets/moss-image.api.json'))   # 在 skill 根目录下运行
graph["4"]["inputs"]["text"] = '{"caption": "A ..."}'   # 或 Layout 成品（单行 JSON）
graph["16"]["inputs"]["seed"] = 20261017
graph["18"]["inputs"]["filename_prefix"] = "moss-test"  # 可选，产物前缀
# 需要换尺寸时二选一（默认 1088×1936）：
# A. graph["19"]["inputs"]["megapixels"] = 1.5            # → 944×1680
# B. graph["6"]["inputs"].update(width=944, height=1648)  # 写死，覆盖节点 19 的链接

body = {"prompt": graph, "client_id": str(uuid.uuid4())}
req = urllib.request.Request("http://192.168.1.10:8188/prompt",
                             data=json.dumps(body).encode(),
                             headers={"Content-Type": "application/json"})
pid = json.load(urllib.request.urlopen(req))["prompt_id"]

while True:                                   # 轮询 /history，成功后从 outputs 取 filename
    time.sleep(2)
    h = json.load(urllib.request.urlopen(f"http://192.168.1.10:8188/history/{pid}"))
    if pid in h:
        print(h[pid]["outputs"]["18"]["images"][0]["filename"])
        break
```

取产物：`GET /view?filename=<filename>&subfolder=<subfolder>&type=output` 下载回本机
工作区 `assets/comfy/output/<filename>`；远端落点是 `/home/user/comfy/素材/output/<filename>`。

注意：

- 节点 4 的提示词换掉后，**画布要求跟着变**：默认 1088×1936；如果新 prompt 是 944×1648 编译的，
  要么把节点 6 写死成 944×1648，要么按 1088×1936 重新编译 prompt。
- 节点 5 是实测用的负向词（`worst quality, low quality, ...`）；官方推荐换成
  `nsfw, worst quality, bad anatomy, watermark, jpeg artifact`。
- 节点 20 的 `comfy kitchen attention` 是 N 卡/AMD 的 INT8 注意力后端；报错就换成 `pytorch attention`。
- `assets/moss-image.api.json` 是原始快照；已复制为 `workflows/moss_image_t2i.api.json` 并登记 `moss-t2i`，runner 可跑。

---

## 10. 参考与复现

- 官方 User Guide（Layout、采样、负向词）：`https://github.com/OpenMOSS/MOSS-Image/blob/main/USERGUIDE.md`
- 官方 Prompt Enhancer（LLM 写 layout + `compile_prompt.py`）：
  `https://github.com/OpenMOSS/MOSS-Image/tree/main/skills/moss-image-prompt-enhancer`
- 模型卡（Base/SFT、默认参数）：`https://huggingface.co/OpenMOSS-Team/MOSS-Image-Base`
- 本 skill 内的 API 图：`assets/moss-image.api.json`（13 节点快照，见第 9 节）
- 远端测试草稿/成品（临时，可能被清）：`/home/user/comfy/.tmp-moss/draft*.json`、`prompt*.txt`、`slant_*.txt`
- 远端测试图（临时产物，可能被清理）：`/home/user/comfy/素材/output/moss-json-test*`、`moss-messy*`、`moss-dense*`、`moss-slant*`

变更记录：

- 2026-10-17 首次整理：部署、JSON schema、画布换算、文字 3 组实测、倾斜 10 版 A/B、48 项密度上限。
- 2026-10-17 追加：把实测用的 API 图迁入 `assets/moss-image.api.json`，补提交/取图说明与节点表。
