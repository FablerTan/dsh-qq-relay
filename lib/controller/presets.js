/**
 * 插件预设运行时（v0.20.0）：把 \`presets.json\` 里的预设动态注册成 DSH agent preset，
 * 并在会话首次派发前应用预设里的模型 / 思考层级 / 权限。
 *
 * 注册：\`ctx.agentPresets.register(definition)\` 是 @deepseek-ai/dsh-agent-preset 行
 * 内部用的同一个入口；定义里的组合表来自 DSH 内置 standard（见 model/preset-template.js）。
 * 定义只在插件启用期间存在；会话恢复要求同名 preset 在启动时已注册（本插件在 boot 时注册）。
 *
 * 模型：不调用 sessionController.selectModel（它会改 profile 的默认模型）——直接向会话
 * 追加一条 \`model/selection\` 事件，等价于用户在 GUI 里首次选模型；只在该会话还没有
 * 任何模型选择（pending / lastUsed 都为空）时追加，不覆盖用户手动选择。
 * 权限：\`permissionPresets.set(agent.session, name)\`，每会话一次。
 */

import { buildPresetDefinition, presetFingerprint } from '../model/presets.js'

function messageOf(error) {
  return String(error?.message ?? error)
}

/** 从 DSH 注册错误里取出「宿主已移除」的配置字段名（0.2.1-rc.2 起 toolFilter / persona 属此类）。 */
function unsupportedFieldsOf(error) {
  const fields = []
  for (const match of messageOf(error).matchAll(/([A-Za-z][A-Za-z0-9_]*)\s+is no longer supported/gi)) {
    if (!fields.includes(match[1])) fields.push(match[1])
  }
  return fields
}

/** 深拷贝一行（组行的 config 递归）并剔除指定配置字段；只用于注册重试，不污染冻结模板。 */
function stripRow(row, fields) {
  if (Array.isArray(row)) return row.map((item) => stripRow(item, fields))
  if (row === null || typeof row !== 'object') return row
  const next = { ...row }
  if (Array.isArray(next.config)) {
    next.config = next.config.map((item) => stripRow(item, fields))
  } else if (next.config !== null && typeof next.config === 'object') {
    const config = { ...next.config }
    for (const field of fields) delete config[field]
    next.config = config
  }
  return next
}

/** 读取一个可选宿主服务（服务不存在时不抛）。 */
function serviceOf(ctx, name) {
  try {
    return typeof ctx.get === 'function' ? ctx.get(name) : undefined
  } catch {
    return undefined
  }
}

export function createPresetController({ ctx, log, getPresets, getSelectedPresetId, getModelCatalog = () => null }) {
  /** id -> { fingerprint, dispose } */
  const registered = new Map()
  let registry = null
  let queue = Promise.resolve()
  let disposed = false

  /** 已在本次进程内应用过模型 / 权限的 sessionId。 */
  const applied = new Set()

  function supported() {
    return registry !== null
  }

  function registeredIds() {
    return [...registered.keys()]
  }

  async function runRefresh() {
    if (disposed || registry === null) return
    const presets = Array.isArray(getPresets()) ? getPresets() : []
    const wanted = new Map(presets.map((preset) => [preset.id, preset]))

    for (const [id, entry] of [...registered]) {
      const next = wanted.get(id)
      if (next !== undefined && presetFingerprint(next) === entry.fingerprint) continue
      registered.delete(id)
      try { await entry.dispose() } catch (error) { log.warn('[relay] 注销 preset「' + id + '」失败：' + messageOf(error)) }
    }

    for (const preset of presets) {
      if (registered.has(preset.id)) continue
      try {
        const dispose = await registerTolerant(preset)
        registered.set(preset.id, { fingerprint: presetFingerprint(preset), dispose })
        log.info('[relay] 已注册 QQ 预设「' + preset.id + '」')
      } catch (error) {
        // 常见原因：id 与 DSH 内置 preset 冲突；或 DSH 升级后组合表 schema 变了
        // （宿主报「<字段> is no longer supported」，见 docs/persona.md §2.2）。
        log.warn('[relay] 注册预设「' + preset.id + '」失败（id 可能与 DSH 内置预设冲突，'
          + '或 DSH 升级后组合表 schema 变了，见 docs/persona.md §2.2）：' + messageOf(error))
      }
    }
  }

  /**
   * 注册预设；宿主已移除的配置字段自动剔除后重试（最多 4 轮）。
   * 目的：DSH 再删字段时 preset 不会整份变 broken——但仍应按 docs/persona.md §2.2 同步模板。
   */
  async function registerTolerant(preset) {
    let definition = buildPresetDefinition(preset)
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        return await registry.register(definition)
      } catch (error) {
        const fields = unsupportedFieldsOf(error)
        if (fields.length === 0 || attempt === 3) throw error
        definition = { ...definition, plugins: definition.plugins.map((row) => stripRow(row, fields)) }
        log.warn('[relay] 预设「' + preset.id + '」的组合表含宿主已移除的字段 ' + fields.join(' / ')
          + '，已剔除后重新注册（请按 docs/persona.md §2.2 同步组合表）')
      }
    }
    throw new Error('注册重试次数用尽')
  }

  /** 重新注册（保存预设 / 启动时调用；串行执行，避免 dispose/register 交错）。 */
  function refresh() {
    queue = queue.then(runRefresh).catch((error) => {
      log.warn('[relay] 刷新 QQ 预设失败：' + messageOf(error))
    })
    return queue
  }

  /** 绑定 agentPresets 服务；返回 disposer（服务重载时注销全部注册）。 */
  function attach(nextRegistry) {
    registry = nextRegistry ?? null
    if (registry !== null) void refresh()
    return () => {
      const entries = [...registered.values()]
      registered.clear()
      registry = null
      for (const entry of entries) { try { void entry.dispose() } catch {} }
    }
  }

  /** 校验模型在目录里可用（目录未知时放行，由 LLM 层报错）。 */
  function modelUsable(model) {
    const catalog = getModelCatalog()
    if (catalog === null || catalog === undefined || !Array.isArray(catalog.groups)) return true
    const group = catalog.groups.find((item) => item !== null && typeof item === 'object' && item.id === model.provider)
    if (group === undefined) return false
    const entry = Array.isArray(group.models)
      ? group.models.find((item) => item !== null && typeof item === 'object' && item.id === model.model)
      : undefined
    if (entry === undefined) return false
    if (model.reasoningEffort === '') return true
    const efforts = entry.reasoning !== null && typeof entry.reasoning === 'object' && Array.isArray(entry.reasoning.efforts)
      ? entry.reasoning.efforts
      : []
    return efforts.some((effort) => effort !== null && typeof effort === 'object' && effort.id === model.reasoningEffort)
  }

  /**
   * 会话首次派发前应用预设里的模型 / 思考层级 / 权限。
   * @param sessionId 群会话 id
   */
  async function applySession(sessionId) {
    if (disposed || applied.has(sessionId)) return
    const presetId = typeof getSelectedPresetId() === 'string' ? getSelectedPresetId().trim() : ''
    if (presetId === '') return
    const preset = (getPresets() ?? []).find((item) => item.id === presetId)
    if (preset === undefined) return

    let resolved
    try {
      resolved = await ctx.sessionController.resolveAgent(sessionId)
    } catch (error) {
      log.warn('[relay] 解析会话失败，跳过预设设置（' + sessionId + '）：' + messageOf(error))
      return
    }
    if (resolved === null || typeof resolved !== 'object' || !('agent' in resolved)) return
    const agent = resolved.agent

    // 1) 权限（sandbox / approval 组合）；每会话一次。
    if (preset.permissionPreset !== '') {
      const permission = serviceOf(ctx, 'permissionPresets')
      if (permission !== undefined && typeof permission.set === 'function') {
        try {
          permission.set(agent.session, preset.permissionPreset)
        } catch (error) {
          log.warn('[relay] 应用权限预设「' + preset.permissionPreset + '」失败：' + messageOf(error))
        }
      }
    }

    // 2) 模型 / 思考层级：只在会话尚无任何模型选择时追加一条选择事件。
    if (preset.model.provider !== '' && preset.model.model !== '') {
      try {
        const session = agent.session
        const header = typeof session.requestHeader === 'function' ? session.requestHeader() : undefined
        let hasChoice = header !== undefined
        const projections = serviceOf(ctx, 'sessionProjections')
        if (!hasChoice && projections !== undefined && typeof projections.stateOf === 'function') {
          const state = projections.stateOf(session, 'modelSelection')
          hasChoice = state !== null && state !== undefined && (state.pending !== null || state.lastUsed !== null)
        }
        if (!hasChoice) {
          if (!modelUsable(preset.model)) {
            log.warn('[relay] 预设模型不在当前目录里，跳过：' + preset.model.provider + '/' + preset.model.model)
          } else {
            session.append('model/selection', {
              provider: preset.model.provider,
              model: preset.model.model,
              ...(preset.model.reasoningEffort === '' ? {} : { reasoningEffort: preset.model.reasoningEffort }),
            })
            log.info('[relay] 会话 ' + sessionId + ' 使用预设模型 '
              + preset.model.provider + '/' + preset.model.model
              + (preset.model.reasoningEffort === '' ? '' : '（思考层级 ' + preset.model.reasoningEffort + '）'))
          }
        }
      } catch (error) {
        log.warn('[relay] 应用预设模型失败：' + messageOf(error))
      }
    }

    applied.add(sessionId)
  }

  function dispose() {
    disposed = true
    const entries = [...registered.values()]
    registered.clear()
    registry = null
    for (const entry of entries) { try { void entry.dispose() } catch {} }
  }

  return { attach, refresh, applySession, supported, registeredIds, dispose }
}
