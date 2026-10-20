/**
 * ComfyUI 画图 / 视频能力的配置模型与 skill 模板渲染（host Model 层，v0.22.0）。
 *
 * 两个职责：
 *  1) `comfy` 配置段的规范化 / 校验 / 对外视图（设置页「画图 / 视频」二级页用）；
 *  2) 把插件自带的模板（`SKILL.md` 出图 / `SKILL-video.md` 视频）渲染成运行时
 *     skill 正文：`{{COMFY_HOST}}` 与 `{{SKILL_DIR}}` 在注册前替换成实际值。
 *
 * 纪律：**永不抛异常**地校验（返回 problems 让调用方决定）；渲染函数遇到模板
 * 残留占位符时抛错，由 controller 捕获并报到 status 上，不能把坏文本注册给 DSH。
 *
 * 零外部依赖，只用 node: 内置模块与全局 URL。
 */

/** `comfy` 配置段的默认值；调用方不应直接改这个对象。 */
export const DEFAULT_COMFY = Object.freeze({
  /** 是否启用画图 / 视频能力（关闭时探测与 skill 注册都停止）。 */
  enabled: false,
  /** ComfyUI HTTP 地址（无鉴权；只应指向可信网络）。 */
  baseUrl: 'http://192.168.1.10:8188',
  /** 探测 / 请求超时（毫秒）。 */
  timeoutMs: 30000,
  /** 连接成功后是否把画图 skill 注册给 DSH（skills.register）。 */
  skillEnabled: true,
})

/** skill 目录在插件内的相对位置（lib/skills/comfy-image；出图与视频两个 skill 共用）。 */
export const COMFY_SKILL_DIR_SUFFIX = Object.freeze(['skills', 'comfy-image'])

/** 出图 skill 名（kebab-case，DSH 的 skill 名语法）。 */
export const COMFY_IMAGE_SKILL_NAME = 'comfy-image'

/** 视频 skill 名。 */
export const COMFY_VIDEO_SKILL_NAME = 'comfy-video'

/** 出图 skill 的 prompt-visible 描述（有长度上限，DSH 目录里只截前 500 字符）。 */
export const COMFY_IMAGE_SKILL_DESCRIPTION = '在配置的 ComfyUI 服务上出图 / 改图（Qwen-Image：qwen-t2i 文生图、qwen-i2i / qwen-edit 参考图编辑，MOSS-Image）。'
  + '当用户要求画图、生成图片、改图、换背景或换风格时使用；产物可直接用 qq_send 发到 QQ 群。'

/** 出图 skill 的额外路由提示。 */
export const COMFY_IMAGE_SKILL_WHEN = '需要画图、改图，或把一张图改成另一种样子时。'

/** 视频 skill 的 prompt-visible 描述。 */
export const COMFY_VIDEO_SKILL_DESCRIPTION = '用配置的 ComfyUI 服务生成短视频（MiniMax H3：h3-t2v 文生视频、h3-i2v 首帧转视频、h3-r2v 参考图转视频，带原生音频）。'
  + '当用户要求生成视频、让图片动起来、做一段动画/短片段时使用；产物 mp4 可用 qq_send 的 videos 参数发到 QQ 群。'

/** 视频 skill 的额外路由提示。 */
export const COMFY_VIDEO_SKILL_WHEN = '需要生成视频、把一张图/角色变成视频，或做一段几秒的动画时。'

/**
 * 连接成功后动态注册的 skill 清单。
 * 两个 skill 共用 lib/skills/comfy-image 目录与 runner（resourceBase 相同），
 * 但正文模板不同：出图看 SKILL.md，视频看 SKILL-video.md。
 */
export const COMFY_SKILLS = Object.freeze([
  Object.freeze({
    name: COMFY_IMAGE_SKILL_NAME,
    template: 'SKILL.md',
    description: COMFY_IMAGE_SKILL_DESCRIPTION,
    whenToUse: COMFY_IMAGE_SKILL_WHEN,
  }),
  Object.freeze({
    name: COMFY_VIDEO_SKILL_NAME,
    template: 'SKILL-video.md',
    description: COMFY_VIDEO_SKILL_DESCRIPTION,
    whenToUse: COMFY_VIDEO_SKILL_WHEN,
  }),
])

/** 探测超时的允许范围（毫秒）。 */
export const COMFY_TIMEOUT_MIN_MS = 3000
export const COMFY_TIMEOUT_MAX_MS = 120 * 1000

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * 规范化 baseUrl：必须是非空 http(s) URL，去掉尾部斜杠。
 *
 * @param raw - 任意输入
 * @param problems - 收集问题的数组
 * @returns 合法 URL 或默认值
 */
function normalizeBaseUrl(raw, problems) {
  if (raw === undefined || raw === null) return DEFAULT_COMFY.baseUrl
  if (typeof raw !== 'string' || raw.trim() === '') {
    problems.push('comfy.baseUrl 必须是非空 URL')
    return DEFAULT_COMFY.baseUrl
  }
  const value = raw.trim().replace(/\/+$/u, '')
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      problems.push('comfy.baseUrl 必须是 http:// 或 https:// 地址')
      return DEFAULT_COMFY.baseUrl
    }
    return value
  } catch {
    problems.push('comfy.baseUrl 不是合法 URL：' + value)
    return DEFAULT_COMFY.baseUrl
  }
}

/**
 * 规范化 `comfy` 配置段。
 *
 * @param raw - profile patch / settings.json 里的 comfy 段（可能为任意脏数据）
 * @param problems - 收集问题的数组（调用方传入；缺省不抛）
 * @returns `{ enabled, baseUrl, timeoutMs, skillEnabled }`
 */
export function normalizeComfyConfig(raw, problems = []) {
  const base = { ...DEFAULT_COMFY }
  if (raw === undefined || raw === null) return base
  if (!isPlainObject(raw)) {
    problems.push('comfy 必须是对象（enabled / baseUrl / timeoutMs / skillEnabled）')
    return base
  }
  const out = { ...base }
  if (raw.enabled !== undefined) {
    if (typeof raw.enabled !== 'boolean') problems.push('comfy.enabled 必须是布尔值')
    else out.enabled = raw.enabled
  }
  out.baseUrl = normalizeBaseUrl(raw.baseUrl, problems)
  if (raw.timeoutMs !== undefined) {
    const value = typeof raw.timeoutMs === 'string' && raw.timeoutMs.trim() !== ''
      ? Number(raw.timeoutMs)
      : raw.timeoutMs
    if (!Number.isInteger(value) || value < COMFY_TIMEOUT_MIN_MS || value > COMFY_TIMEOUT_MAX_MS) {
      problems.push('comfy.timeoutMs 必须是 ' + String(COMFY_TIMEOUT_MIN_MS)
        + '..' + String(COMFY_TIMEOUT_MAX_MS) + ' 的整数（毫秒）')
    } else {
      out.timeoutMs = value
    }
  }
  if (raw.skillEnabled !== undefined) {
    if (typeof raw.skillEnabled !== 'boolean') problems.push('comfy.skillEnabled 必须是布尔值')
    else out.skillEnabled = raw.skillEnabled
  }
  return out
}

/**
 * 对外（HTTP / 页面）的配置视图：不含 token 之类的敏感字段，脏数据也返回可渲染值。
 *
 * @param raw - 任意输入
 * @returns `{ enabled, baseUrl, timeoutMs, skillEnabled }`
 */
export function maskComfyConfig(raw) {
  const source = isPlainObject(raw) ? raw : {}
  return {
    enabled: source.enabled === true,
    baseUrl: typeof source.baseUrl === 'string' && source.baseUrl !== ''
      ? source.baseUrl
      : DEFAULT_COMFY.baseUrl,
    timeoutMs: Number.isInteger(source.timeoutMs)
      && source.timeoutMs >= COMFY_TIMEOUT_MIN_MS
      && source.timeoutMs <= COMFY_TIMEOUT_MAX_MS
      ? source.timeoutMs
      : DEFAULT_COMFY.timeoutMs,
    skillEnabled: source.skillEnabled !== false,
  }
}

/**
 * 去掉 SKILL.md 的 YAML frontmatter（filesystem provider 加载时也会去掉；
 * 运行时注册的 content 必须是纯正文）。
 *
 * @param text - 原始 SKILL.md 文本
 * @returns 去掉 frontmatter 后的正文（保留内部空行）
 */
export function stripFrontmatter(text) {
  if (typeof text !== 'string') return ''
  const normalized = text.replace(/^\uFEFF/u, '')
  if (!/^---\r?\n/u.test(normalized)) return normalized.trim()
  const lines = normalized.split(/\r?\n/u)
  // 第一行是 ---，找下一个单独成行的 ---
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === '---') {
      return lines.slice(index + 1).join('\n').trim()
    }
  }
  return normalized.trim()
}

/**
 * 渲染运行时 skill 正文。
 *
 * @param template - SKILL.md 全文（含 frontmatter 与占位符）
 * @param options.baseUrl - ComfyUI 地址（替换 `{{COMFY_HOST}}`）
 * @param options.skillDir - 插件内 skill 绝对目录（替换 `{{SKILL_DIR}}`）
 * @returns 纯正文（frontmatter 已去除）
 * @throws 模板残留未替换的 `{{...}}` 占位符时抛错（坏文本不能注册给 DSH）
 */
export function renderComfySkillContent(template, { baseUrl, skillDir }) {
  const host = typeof baseUrl === 'string' && baseUrl !== '' ? baseUrl : DEFAULT_COMFY.baseUrl
  const dir = typeof skillDir === 'string' ? skillDir : ''
  const body = stripFrontmatter(template)
  const content = body.replaceAll('{{COMFY_HOST}}', host).replaceAll('{{SKILL_DIR}}', dir)
  if (content.includes('{{')) {
    throw new Error('画图 skill 模板里还有未替换的占位符')
  }
  return content
}
