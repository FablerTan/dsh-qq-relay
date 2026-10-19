/**
 * 插件管理的 QQ 预设（v0.20.0）：配置页可增删改，宿主启动时动态注册成
 * DSH agent preset（`@deepseek-ai/dsh-agent-preset` 等价声明）。
 *
 * 预设 = persona（系统提示词人设）+ 可选的会话模型 / 思考层级 / 权限预设。
 * 组合表复用 DSH 内置 `standard` 的插件行（见 preset-template.js）——preset 没有继承，
 * 必须给全量；DSH 升级后按 docs/persona.md §2 同步。
 *
 * 纪律：纯逻辑、零依赖、永不抛；校验失败返回 problems 由调用方决定。
 */

import { mkdirSync, existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { PRESET_BASE_PLUGINS } from './preset-template.js'

/** 预设文件结构版本。 */
export const PRESETS_VERSION = 1

/** 内置 presets 上限（防止误配一大串）。 */
export const PRESET_LIMIT = 20

/** preset id 形状（与 DSH 声明一致：小写字母 / 数字 / 连字符）。 */
const PRESET_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,40}$/

/** 人设文本上限（每轮进 prompt，别塞整篇设定）。 */
export const PRESET_PERSONA_MAX_CHARS = 4000

/** 默认 QQ 群聊人设。 */
export const DEFAULT_QQ_PERSONA = [
  '你是 QQ 群里的群友，不是编程工具。用自然、简短的中文口语参与聊天，不使用 Markdown、标题或列表；',
  '被 @ 或被引用时直接回应，不确定就说不确定，不要编造。',
  '直接输出最终回复文本即可，relay 会自动回发到本群；不要用 qq_send 往本群发。',
].join('')

/** 首次启动的种子预设（之后以 presets.json 为准，用户可改可删）。 */
export function defaultPresets() {
  return [{
    id: 'qq-relay',
    name: 'QQ 群聊',
    description: '插件自带的 QQ 群聊预设：群友语气 + 标准工具集。',
    persona: DEFAULT_QQ_PERSONA,
    model: { provider: '', model: '', reasoningEffort: '' },
    permissionPreset: '',
    order: 100,
  }]
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function asString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/** 规范化单个预设；返回 `{ ok, preset, problems }`。 */
export function normalizePreset(raw) {
  const problems = []
  if (!isPlainObject(raw)) return { ok: false, preset: null, problems: ['预设必须是对象'] }

  const id = asString(raw.id)
  if (id === '') problems.push('预设 id 必填')
  else if (!PRESET_ID_PATTERN.test(id)) problems.push('预设 id 只能用小写字母 / 数字 / 连字符：' + id)

  const name = asString(raw.name)
  if (name === '') problems.push('预设名称必填')
  else if (name.length > 60) problems.push('预设名称最多 60 字符')

  const description = asString(raw.description)
  if (description.length > 200) problems.push('预设描述最多 200 字符')

  const persona = asString(raw.persona)
  if (persona === '') problems.push('人设文本必填（会作为系统提示词的人设段）')
  else if (persona.length > PRESET_PERSONA_MAX_CHARS) {
    problems.push('人设文本最多 ' + String(PRESET_PERSONA_MAX_CHARS) + ' 字符')
  }

  const modelRaw = isPlainObject(raw.model) ? raw.model : {}
  const provider = asString(modelRaw.provider)
  const model = asString(modelRaw.model)
  const reasoningEffort = asString(modelRaw.reasoningEffort)
  if ((provider === '') !== (model === '')) problems.push('模型必须同时填 provider 与 model（或都留空）')
  if (provider.length > 120) problems.push('模型 provider 过长')
  if (model.length > 200) problems.push('模型 id 过长')

  const permissionPreset = asString(raw.permissionPreset)
  if (permissionPreset.length > 80) problems.push('权限预设名称过长')

  const orderRaw = raw.order
  const order = orderRaw === undefined || orderRaw === null ? 100 : Number(orderRaw)
  if (!Number.isInteger(order) || order < 1 || order > 10000) problems.push('预设排序必须是 1..10000 的整数')

  if (problems.length > 0) return { ok: false, preset: null, problems }
  return {
    ok: true,
    problems: [],
    preset: {
      id,
      name,
      description,
      persona,
      model: { provider, model, reasoningEffort },
      permissionPreset,
      order,
    },
  }
}

/**
 * 规范化整个预设列表：逐项校验 + id 去重 + 数量上限。
 * @param raw 任意数组
 * @returns `{ ok, presets, problems }`
 */
export function normalizePresetList(raw) {
  if (!Array.isArray(raw)) return { ok: false, presets: [], problems: ['presets 必须是数组'] }
  const problems = []
  const presets = []
  const seen = new Set()
  for (const item of raw) {
    if (presets.length >= PRESET_LIMIT) {
      problems.push('最多 ' + String(PRESET_LIMIT) + ' 个预设')
      break
    }
    const normalized = normalizePreset(item)
    if (!normalized.ok) {
      problems.push(...normalized.problems)
      continue
    }
    if (seen.has(normalized.preset.id)) {
      problems.push('预设 id 重复：' + normalized.preset.id)
      continue
    }
    seen.add(normalized.preset.id)
    presets.push(normalized.preset)
  }
  return { ok: problems.length === 0, presets, problems }
}

/** 对外只读视图（不含内部实现字段；model 永远给全字段）。 */
export function presetView(preset) {
  const source = isPlainObject(preset) ? preset : {}
  const model = isPlainObject(source.model) ? source.model : {}
  return {
    id: typeof source.id === 'string' ? source.id : '',
    name: typeof source.name === 'string' ? source.name : '',
    description: typeof source.description === 'string' ? source.description : '',
    persona: typeof source.persona === 'string' ? source.persona : '',
    model: {
      provider: typeof model.provider === 'string' ? model.provider : '',
      model: typeof model.model === 'string' ? model.model : '',
      reasoningEffort: typeof model.reasoningEffort === 'string' ? model.reasoningEffort : '',
    },
    permissionPreset: typeof source.permissionPreset === 'string' ? source.permissionPreset : '',
    order: Number.isInteger(source.order) ? source.order : 100,
  }
}

/** 注册用的完整定义：persona 行 + DSH standard 组合（深拷贝，防止注册器改动模板）。 */
export function buildPresetDefinition(preset) {
  return {
    id: preset.id,
    name: preset.name,
    ...(preset.description === '' ? {} : { description: preset.description }),
    order: preset.order,
    plugins: [
      {
        id: 'persona',
        name: '@deepseek-ai/dsh-persona',
        config: { prefix: preset.persona },
      },
      ...structuredClone(PRESET_BASE_PLUGINS),
    ],
  }
}

/** 比较注册是否需要更新的指纹。 */
export function presetFingerprint(preset) {
  return JSON.stringify([preset.id, preset.name, preset.description, preset.persona, preset.order,
    preset.model.provider, preset.model.model, preset.model.reasoningEffort, preset.permissionPreset])
}

/**
 * presets.json 读写器（路径由组合根给出，便于单测传临时目录）。
 * 文件缺失 / 损坏时回退到种子预设（不写盘，等用户第一次保存）。
 */
export function createPresetStore(filePath) {
  function load() {
    try {
      if (!existsSync(filePath)) return { presets: defaultPresets(), seeded: true, filePath }
      const parsed = JSON.parse(readFileSync(filePath, 'utf8'))
      const list = isPlainObject(parsed) && Array.isArray(parsed.presets) ? parsed.presets : null
      if (list === null) return { presets: defaultPresets(), seeded: true, filePath }
      const normalized = normalizePresetList(list)
      if (!normalized.ok) return { presets: defaultPresets(), seeded: true, filePath, problems: normalized.problems }
      return { presets: normalized.presets, seeded: false, filePath }
    } catch {
      return { presets: defaultPresets(), seeded: true, filePath }
    }
  }

  function save(presets) {
    const dir = dirname(filePath)
    mkdirSync(dir, { recursive: true })
    const payload = { version: PRESETS_VERSION, updatedAt: Date.now(), presets: presets.map(presetView) }
    const tmp = join(dir, '.' + String(process.pid) + '.presets.json.tmp')
    writeFileSync(tmp, JSON.stringify(payload, null, 2) + '\n', 'utf8')
    try {
      renameSync(tmp, filePath)
    } catch (error) {
      try { unlinkSync(tmp) } catch {}
      throw error
    }
    return payload
  }

  return { filePath, load, save }
}
