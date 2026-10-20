# 视频工作流契约（MiniMax H3，实测记录）

本目录记录**已经真跑过**的视频工作流。服务端：192.168.1.10:8188，ComfyUI 0.39.0，RTX 4070 12G。
模型是 **MiniMax H3**（pruned int8 convrot + 8 步 turbo LoRA），与图片工作流（qwen / MOSS）互不相干。

运行入口：`python3 scripts/comfy_run.py <key> --set 参数=值 …`（`--list` 看清单，`--dry-run` 看不提交的图）。
产物默认下载到 `<会话工作目录>/assets/comfy/output/`（远端在 `素材/output/video/`）。

---

## 三个 key

| key | 图文件 | 节点 | 输入 | 说明 |
|---|---|---|---|---|
| `h3-t2v` | `minimax_h3_t2v.api.json` | 18 | prompt | 纯文生视频 |
| `h3-i2v` | `minimax_h3_i2v.api.json` | 19 | prompt + 首帧图 | LoadImage(140) → `MiniMaxH3ImageToVideo(131).first_frame` |
| `h3-r2v` | `minimax_h3_r2v.api.json` | 20 | prompt + 参考图 | LoadImage(137) → `MiniMaxH3ReferenceToVideo(136).ref_images.ref_image_0` |

来源：`h3-t2v` 基于远端 `/history` 的 `8fa55f32`（对应用户界面工作流 `H3_Turbo8步_pruned_int8_t2v.json`）；
`h3-r2v` 基于 `1f1a8e93`；`h3-i2v` 由 t2v 图派生，first_frame 接法参考 `6124f9e9`。
三个图共用同一套模型与采样参数：

```
UNETLoader(127)  minimax_h3_fl2va_pruned_int8_convrot
LoraLoaderModelOnly(134) minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16
CLIPLoader(128)  qwen3vl_32b_minimax_h3_int8_convrot (type=minimax)
VAELoader(119)   minimax_h3_video_vae_fp16
VAELoader(120)   minimax_h3_audio_vae_fp32

ResolutionSelector(115) → width / height
RandomNoise(129) → noise_seed
BasicScheduler(124)：simple / steps（默认 8）/ denoise 1
KSamplerSelect(135)：res_multistep
SamplerCustomAdvanced(125) + BasicGuider(126)
VAEDecode(122) → CreateVideo(130, fps=24) ← VAEDecodeAudio(121)     # 视频自带音轨
SaveVideo(92)：filename_prefix=MiniMax_H3, format=auto
```

时长：`duration`（秒，PrimitiveFloat）→ ComfyMathExpression(132) →
`max(5, round(a*24)) + (5 - (max(5, round(a*24)) % 17)) % 17` 帧。
即 5s → 124 帧、3s → 73 帧（帧数对齐到 5 mod 17）。

## 参数白名单

| 参数 | 默认 | 范围 | 说明 |
|---|---|---|---|
| `prompt` | 必填 | 字符串 | 支持 `[0s-2s]` 分镜与 `Audio:` 段；H3 同时生成画面与音频 |
| `seed` | 随机 | 整数 | `random: true`，runner 注入 |
| `steps` | 8 | 4..8 | 8 = turbo 标称；4 = 加速档（约减半耗时、细节略降） |
| `aspect` | 16:9 | 8 档 | 与图片工作流相同的 ResolutionSelector |
| `megapixels` | 0.4 | 0.1..1.0 | 0.4 + 16:9 ≈ 864×480；12G 卡别一上来 1.0 |
| `duration` | 5 | 2..10 | 秒；帧数自动对齐 |
| `filename_prefix` | MiniMax_H3 | 字符串 | 远端产物前缀 |
| `image` | 必填（i2v / r2v） | 本地路径 | runner 上传到远端 input，再填节点字段 |

## 实测

| 任务 | 参数 | 服务端 | 产物 |
|---|---|---|---|
| `h3-t2v` | 4 步 / 0.2MP / 16:9 / 3s | **29.1s**（首轮含模型加载） | 608×352，73 帧，3.04s，带音轨，mp4 876KB |
| `h3-r2v` | 4 步 / 0.2MP / 16:9 / 3s，参考图 qwen_i2i_00007.png | **30.4s** | 608×352，73 帧，3.04s，带音轨，mp4 834KB |

- 8 步会更慢（约 2× 采样时间），画质更稳；先用 4 步/0.2~0.4MP 预览构图，再决定是否重跑。
- 首次跑或换模型后第一轮会包含加载时间；后续同参数更快。
- 远端产物在 `/home/user/comfy/素材/output/video/`，本地下载到 `assets/comfy/output/video/`。

## 踩过的坑

1. **steps 与 LoRA 要配套**：这份图是 8 步 turbo LoRA；4 步是加速档（LightX2V 思路）。
   开 20+ 步不会更清晰，只会更慢；把 LoRA 换成 4 步 Turbo LoRA 时要同时换 sampler 节点
   （界面工作流 `H3_Turbo4步_pruned_int8_t2v.json` 用的是 `MiniMaxH3TurboSampler`，不是这套图）。
2. **duration 不是帧数**：节点会用数学表达式换算并对齐帧数；想精确到帧就直接改 length 表达式/图。
3. **r2v 的参考图是角色参考**：`ref_image_size=match`，prompt 里用 `<Subject 1>` 指代；
   首帧版本用 `h3-i2v`，两者不要混用。
4. **i2v 的输出尺寸由 ResolutionSelector 决定**，首帧图会被适配；首帧构图与比例差太多时会裁切/变形。
5. **音频不可后期单独控制**：想安静就在 prompt 里写 `Audio: quiet room tone`。
6. 队列不为 0 时先等：ComfyUI 一次只跑一个任务；runner 默认最多等 1800s。

## 新增视频工作流

从远端界面导出 API 图 → 另存为 `workflows/<name>.api.json` → 写同名 schema（只暴露白名单参数）
→ 在 registry.json 登记 `file` / `schema` / title / summary / source → 先 `--dry-run`，
再跑一次小分辨率/短时长确认真能出 mp4，最后把实测耗时与产物补进本文件。
