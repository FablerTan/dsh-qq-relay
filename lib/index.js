/**
 * dsh-qq-relay — host 半身组合根（P1.5：@ 直通 + 基础配置页）。
 *
 * 职责只有：读配置（profile patch + settings.json 覆盖）、单实例锁、装配
 * model + controller、挂 HTTP 配置面、把 relay 挂到宿主生命周期。
 * 协议细节在 lib/controller/onebot/，业务在 lib/controller/relay.js，
 * 连接重建在 lib/controller/runtime.js，纯逻辑与持久化在 lib/model/。
 *
 * 两个子 fiber，各按自己的服务门控：
 *  - `sessionController + workspaceRegistry` → 持有锁并创建运行实例；
 *  - `webServer` → 注册配置页 HTTP 面。
 * 两者共享一个 holder：HTTP 面可以读取/重配 relay，但缺 webServer 时 relay 照常工作
 * （headless 等无浏览器场景），缺会话服务时只挂配置面。
 *
 * 纪律：缺服务 / 配置非法 / 端口冲突时**静默降级**（打日志返回），永不 crash boot；
 * 运行时零外部依赖（只用 node: 内置模块与全局 WebSocket）。
 */

import { isAbsolute, join } from 'node:path'
import { homedir } from 'node:os'

import { createSettingsStore, maskConfig, pickEditable, resolveConfig } from './model/settings.js'
import { DEFAULT_COMFY, normalizeComfyConfig } from './model/comfy.js'
import { DEFAULT_ENVIRONMENT } from './model/env.js'
import {
  PRESET_LIMIT,
  createPresetStore,
  normalizePreset,
  presetView,
} from './model/presets.js'
import { createJevClassifier } from './model/jev.js'
import { createNullClassifier, resolveJevApiKey } from './model/gate.js'
import { createMappingStore } from './model/mapping.js'
import { acquireLock, createStateStore, migrateLegacyState } from './model/state.js'
import { CHAT_MIGRATION_MARKER, createChatLog, migrateLegacyChatLogs } from './model/chat-log.js'
import { normalizeCleanupDays, pruneChatAndMedia } from './model/cleanup.js'
import { PANEL_MESSAGES_WINDOW_MS, normalizeMessagesQuery, panelMessages } from './model/panel.js'
import { createGateLog } from './model/gate-log.js'
import { chatRootFor, ensureRelayDir, projectDirFor } from './model/project.js'
import { createRelayRuntime } from './controller/runtime.js'
import { createPresetController } from './controller/presets.js'
import { createComfyController } from './controller/comfy.js'
import { createEnvController } from './controller/env.js'
import { createConfigRoutes } from './controller/config-routes.js'
import { createQqPokeTool, createQqSendTool } from './controller/tools.js'
import { createApprovalBridge } from './controller/approval.js'

export const name = 'dsh-qq-relay'

export function apply(ctx, config) {
  let logger
  try { logger = ctx?.logger?.('dsh-qq-relay') } catch {}
  const log = (level, message) => {
    try { logger?.[level]?.(message) } catch {}
  }

  if (typeof ctx?.inject !== 'function' || typeof ctx?.effect !== 'function') {
    log('warn', '[relay] 宿主缺少 inject/effect，插件未启动')
    return
  }

  const storageDir = join(homedir(), '.dsh', 'storages', 'dsh-qq-relay')
  const patchConfig = config !== null && typeof config === 'object' ? config : {}
  const settingsStore = createSettingsStore(join(storageDir, 'settings.json'))
  const presetStore = createPresetStore(join(storageDir, 'presets.json'))
  /** 插件管理的 QQ 预设（presets.json；首次启动回退到种子预设）。 */
  let presets = presetStore.load().presets

  /**
   * 当前生效配置 = patch + settings.json 覆盖。启动时算一次；配置页保存时重算。
   * 无有效配置时 relay 不启动，但配置页仍然可用（否则配置错了就没法在 UI 里改）。
   */
  let current = resolveConfig(patchConfig, settingsStore.load())
  if (!current.ok) {
    for (const problem of current.problems) log('warn', '[relay] 配置无效：' + problem)
    log('warn', '[relay] 配置不完整，relay 未启动（可在设置页「QQ 机器人」里补齐）')
  } else if (!current.ready) {
    // 还没配 OneBot 连接信息：允许先保存其它设置（环境页 token / 目录等），relay 暂不启动。
    for (const item of current.pending) log('info', '[relay] 配置待补全：' + item)
  }

  /**
   * jev 分类器（P2.3；v0.24.0 起 key 可在设置页填）：
   * 运行实例只拿一个**稳定代理对象**，key / 阈值变化时替换内部实现即可，
   * 不必重建 relay 连接。gate 关闭或没有任何 key 时内部为 null 分类器
   * （fail closed：普通消息一律不接话）。
   *
   * key 解析优先级：`gate.jevApiKey`（设置页保存，只写不读）> 环境变量
   * `gate.jevApiKeyEnv`（默认 `OPENROUTER_API_KEY`）。
   */
  const nullClassifier = createNullClassifier()
  let classifierInner = null
  let classifierSource = 'none'
  let classifierSignature = ''
  const classifier = {
    name: 'jev',
    classify: (input) => (classifierInner === null ? nullClassifier : classifierInner).classify(input),
  }

  /** 按当前配置重新解析 key；只有「开关 / 来源 / key」变化时才换实现并打日志。 */
  function refreshClassifier() {
    const gateConfig = current.ok ? current.config.gate : null
    const enabled = gateConfig !== null && gateConfig.enabled === true
    const resolved = gateConfig === null ? { key: '', source: 'none' } : resolveJevApiKey(gateConfig)
    classifierSource = resolved.source
    // v0.25.6：模型 id / 分类器地址 / bot 标签也参与签名——设置页改了它们要换实现（热切换）。
    const signature = (enabled ? 'on' : 'off') + ':' + resolved.source + ':' + resolved.key
      + ':' + (gateConfig?.model ?? '') + ':' + (gateConfig?.jevEndpoint ?? '')
      + ':' + (current.ok ? String(current.config.selfId) : '')
    if (signature === classifierSignature) return
    const previous = classifierSignature
    classifierSignature = signature
    if (!enabled || resolved.key === '') {
      classifierInner = null
      if (previous.startsWith('on:') && previous !== 'on:none:') {
        log('info', '[relay] jev 分类器已停用（gate 关闭或 API key 未配置）')
      }
      if (enabled && resolved.key === '' && !previous.startsWith('on:none:')) {
        log('warn', '[relay] gate.enabled 已开，但 jev API key 未配置（设置页「行为」里的「OpenRouter API key」'
          + ' 或环境变量 ' + gateConfig.jevApiKeyEnv + '），jev 分类器未启用（普通消息一律不接话）')
      }
      return
    }
    classifierInner = createJevClassifier({
      endpoint: gateConfig.jevEndpoint,
      apiKey: resolved.key,
      model: gateConfig.model,
      threshold: gateConfig.jevThreshold,
      // 设置页可热改阈值：每次判定时读取当前配置（gate.enabled 仍只读）。
      getThreshold: () => (current.ok ? current.config.gate.jevThreshold : gateConfig.jevThreshold),
      timeoutMs: gateConfig.classifierTimeoutMs,
      logger: { warn: (message) => log('warn', message) },
      botLabel: String(current.config.selfId),
    })
    log('info', '[relay] jev 分类器已启用：' + gateConfig.model + ' @ ' + gateConfig.jevEndpoint
      + '（key 来源 ' + resolved.source + '，阈值 ' + String(gateConfig.jevThreshold) + '）')
  }
  refreshClassifier()

  /** 共享状态：运行实例由会话服务子 fiber 创建，HTTP 面读取并驱动它。 */
  const holder = { runtime: null, lock: null }

  /** 读取一个可选宿主服务（服务不存在 / 未就绪时返回 undefined，不抛）。 */
  function serviceOf(name) {
    try {
      return typeof ctx.get === 'function' ? ctx.get(name) : undefined
    } catch {
      return undefined
    }
  }

  /** 模型目录缓存：预设编辑页的 provider / model / 思考层级选项来自这里。 */
  const modelCatalogCache = { value: null, at: 0, loading: false }
  function refreshModelCatalog() {
    if (modelCatalogCache.loading) return
    const controller = serviceOf('sessionController')
    if (controller === undefined || controller === null || typeof controller.modelCatalog !== 'function') return
    modelCatalogCache.loading = true
    Promise.resolve()
      .then(() => controller.modelCatalog())
      .then((value) => {
        modelCatalogCache.value = value !== null && typeof value === 'object' ? value : null
        modelCatalogCache.at = Date.now()
      })
      .catch((error) => {
        log('warn', '[relay] 读取模型目录失败：' + String(error?.message ?? error))
      })
      .finally(() => { modelCatalogCache.loading = false })
  }

  /** 权限预设目录（同步；服务缺失时 null，页面隐藏选择器）。 */
  function permissionCatalogView() {
    const service = serviceOf('permissionPresets')
    if (service === undefined || service === null || typeof service.catalog !== 'function') return null
    try {
      return service.catalog()
    } catch {
      return null
    }
  }

  /** 插件预设运行时：注册成 DSH agent preset + 会话首次派发前应用模型 / 权限。 */
  const presetController = createPresetController({
    ctx,
    log: {
      info: (message) => log('info', message),
      warn: (message) => log('warn', message),
      error: (message) => log('error', message),
    },
    getPresets: () => presets,
    getSelectedPresetId: () => (current.ok ? current.config.agentPreset : ''),
    getModelCatalog: () => modelCatalogCache.value,
  })
  refreshModelCatalog()

  /**
   * ComfyUI 画图（v0.21.0）：探测服务 + 动态注册 `comfy-image` skill。
   * `skills` 服务由下面的 effect 注入后再挂载；启动探测一次，之后 60s 周期补探测。
   */
  const comfyController = createComfyController({
    getConfig: () => (current.ok ? current.config.comfy : DEFAULT_COMFY),
    log: {
      info: (message) => log('info', message),
      warn: (message) => log('warn', message),
      error: (message) => log('error', message),
    },
  })
  comfyController.start()
  void comfyController.refresh()

  /**
   * 环境一键配置（P12 / v0.23.0）：探测 NapCat Docker 环境、执行白名单动作。
   * 探测由「环境」页轮询驱动（GET /api/env 时按需后台重探），没有定时器；
   * 回填动作直接复用配置页的 saveConfig（落盘 + 重连），保证两条路径一致。
   */
  const envController = createEnvController({
    getConfig: () => (current.ok ? current.config.environment : DEFAULT_ENVIRONMENT),
    getRelayInfo: () => {
      const runtimeStatus = holder.runtime === null
        ? { started: false, connected: false, login: null }
        : holder.runtime.status()
      return {
        started: runtimeStatus.started === true,
        connected: runtimeStatus.connected === true,
        selfId: current.ok ? current.config.selfId : 0,
        wsUrl: current.ok ? current.config.wsUrl : '',
        accessToken: current.ok ? current.config.accessToken : '',
        accessTokenConfigured: current.ok && current.config.accessToken !== '',
      }
    },
    backfill: (values) => saveConfig(values),
    log: {
      info: (message) => log('info', message),
      warn: (message) => log('warn', message),
      error: (message) => log('error', message),
    },
  })

  /**
   * DSH agent preset 名册（v0.19.0）：配置页下拉的数据源。
   * 注册表服务缺失（宿主版本过旧 / 非 Web bundle）时 supported=false，页面隐藏选择器。
   * list() 是异步的，这里缓存最近一次结果；startup / 保存配置 / 每 10 分钟刷新。
   */
  const presetCache = { supported: false, items: [], refreshedAt: 0 }
  function refreshAgentPresets() {
    let registry = null
    try {
      registry = typeof ctx.get === 'function' ? ctx.get('agentPresets') : null
    } catch {}
    if (registry === null || registry === undefined || typeof registry.list !== 'function') {
      presetCache.supported = false
      presetCache.items = []
      return
    }
    presetCache.supported = true
    Promise.resolve()
      .then(() => registry.list())
      .then((rows) => {
        presetCache.items = (Array.isArray(rows) ? rows : [])
          .filter((row) => row !== null && typeof row === 'object' && typeof row.id === 'string')
          .map((row) => ({
            id: row.id,
            name: typeof row.name === 'string' ? row.name : '',
            description: typeof row.description === 'string' ? row.description : '',
            broken: typeof row.broken === 'string' ? row.broken : '',
          }))
        presetCache.refreshedAt = Date.now()
      })
      .catch((error) => {
        log('warn', '[relay] 读取 agent preset 名册失败：' + String(error?.message ?? error))
      })
  }
  refreshAgentPresets()
  const presetTimer = setInterval(refreshAgentPresets, 10 * 60 * 1000)
  if (typeof presetTimer.unref === 'function') presetTimer.unref()
  ctx.effect(() => () => { clearInterval(presetTimer) }, 'dsh-qq-relay: agent preset roster')

  const mapping = createMappingStore(join(storageDir, 'mapping.json'))
  const stateLogger = { warn: (message) => log('warn', message) }
  const state = createStateStore({ dir: join(storageDir, 'state'), logger: stateLogger })

  /** 解析群项目目录；配置不完整 / 路径非法时返回空串。 */
  function projectDirOf(groupId) {
    try {
      const dir = projectDirFor({ config: current.config, mapping, groupId })
      return typeof dir === 'string' && dir !== '' && isAbsolute(dir) ? dir : ''
    } catch {
      return ''
    }
  }

  /**
   * 聊天日志根目录：群项目内的 `.qq-relay/chat`（agent 可直接 read）。
   * 解析失败时退回旧全局目录兜底（agent 不可读，但保证消息主流程不中断）。
   */
  function chatRootForGroup(groupId) {
    const projectDir = projectDirOf(groupId)
    if (projectDir === '') return join(storageDir, 'chat')
    try {
      ensureRelayDir(projectDir, { logger: { warn: (message) => log('warn', message) } })
      return chatRootFor(projectDir)
    } catch (error) {
      log('warn', '[relay] 准备群项目目录失败（群 ' + String(groupId) + '）：' + String(error?.message ?? error))
      return join(storageDir, 'chat')
    }
  }

  const chatLog = createChatLog({ rootFor: chatRootForGroup, retentionDays: 0 })
  const gateLog = createGateLog({ dir: join(storageDir, 'gate'), retentionDays: 7 })

  /** 入向拦截器（审批桥等）：relay 每条群消息先过它们，返回 true 即消费。 */
  const interceptors = []

  const approvalBridge = createApprovalBridge({
    getConfig: () => (current.ok ? current.config.approval : null),
    mapping,
    sendText: async (groupId, text) => {
      if (holder.runtime === null) throw new Error('relay 尚未启动')
      return holder.runtime.sendText(groupId, text)
    },
    logger: {
      info: (message) => log('info', message),
      warn: (message) => log('warn', message),
      error: (message) => log('error', message),
    },
  })
  interceptors.push(approvalBridge.intercept)

  // P2.1 起状态按群分文件；旧版 state.json 一次性导入（原文件保留，便于回滚）。
  const migration = migrateLegacyState(join(storageDir, 'state.json'), state, stateLogger)
  if (migration.migrated.length > 0) {
    log('info', '[relay] 已迁移旧状态：' + migration.migrated.join(','))
  }

  // P4：旧全局聊天日志一次性搬进各群项目的 `.qq-relay/chat/`（幂等；失败只记 warn）。
  if (current.ok) {
    const chatMigration = migrateLegacyChatLogs({
      legacyDir: join(storageDir, 'chat'),
      markerPath: join(storageDir, CHAT_MIGRATION_MARKER),
      resolveProjectDir: (groupId) => projectDirOf(groupId),
      logger: { warn: (message) => log('warn', message) },
    })
    const movedGroups = Object.keys(chatMigration.migrated)
    if (movedGroups.length > 0) {
      log('info', '[relay] 已迁移聊天日志到群项目：' + movedGroups.map((groupId) => groupId + '×' + String(chatMigration.migrated[groupId])).join('，'))
    }
  }

  /** 当前涉及的群号：白名单 ∪ 映射 ∪ 群项目配置（聊天日志清理 / 面板用）。 */
  function knownGroupIds() {
    const ids = new Set()
    const config = current.ok && current.config !== null && typeof current.config === 'object' ? current.config : null
    if (config !== null) {
      for (const groupId of config.groups) ids.add(groupId)
      for (const key of Object.keys(config.groupWorkspaces)) ids.add(Number(key))
    }
    for (const key of Object.keys(mapping.all())) ids.add(Number(key))
    return [...ids].filter((groupId) => Number.isInteger(groupId) && groupId > 0)
  }

  // 日志保留期（P2.2）：启动时清一次，之后每天清一次；失败只记日志。
  // 聊天记录默认永久保留（chatRetentionDays: 0），只有显式配了天数才清理。
  function pruneLogs() {
    try {
      const retentionDays = current.ok ? current.config.chatRetentionDays : 0
      const groups = knownGroupIds()
      const removed = pruneChatAndMedia({ chatLog, groupIds: groups, projectDirFor: projectDirOf, days: retentionDays })
      const removedGate = gateLog.prune()
      if (removed.chat > 0 || removed.media > 0 || removedGate > 0) {
        log('info', '[relay] 清理过期日志：聊天 ' + String(removed.chat) + ' 个，媒体 '
          + String(removed.media) + ' 个，闸门 ' + String(removedGate) + ' 个')
      }
    } catch (error) {
      log('warn', '[relay] 清理过期日志失败：' + String(error?.message ?? error))
    }
  }
  pruneLogs()
  const pruneTimer = setInterval(pruneLogs, 24 * 60 * 60 * 1000)
  if (typeof pruneTimer.unref === 'function') pruneTimer.unref()
  ctx.effect(() => () => { clearInterval(pruneTimer) }, 'dsh-qq-relay: log retention')

  /** 群 → 会话映射（配置页的只读列表）。 */
  function mappingsView() {
    return Object.entries(mapping.all())
      .map(([groupId, entry]) => ({
        groupId: Number(groupId),
        sessionId: entry.sessionId,
        title: entry.title,
        workspacePath: entry.workspacePath,
        createdAt: entry.createdAt,
      }))
      .filter((entry) => Number.isInteger(entry.groupId) && entry.groupId > 0)
      .sort((left, right) => left.groupId - right.groupId)
  }

  /** 每群闸门状态视图（v0.14.0 面板）：只读计数与最近时间，不含聊天正文。 */
  function gateGroupsView() {
    const states = state.all()
    return knownGroupIds().map((groupId) => {
      let stored = states.get(String(groupId))
      if (stored === undefined) stored = state.get(groupId)
      return {
        groupId,
        pending: Array.isArray(stored.pending) ? stored.pending.length : 0,
        lastBotSpeakAt: Number(stored.lastBotSpeakAt) || 0,
        lastReplyAt: Number(stored.lastReplyAt) || 0,
        lastUserMessageAt: Number(stored.lastUserMessageAt) || 0,
        cooldownUntil: Number(stored.cooldownUntil) || 0,
        evaluating: stored.evaluating === true,
        dshBusy: stored.dshBusy === true,
      }
    })
  }

  /** 当前状态快照（HTTP 面唯一的事实源）。 */
  function statusPayload() {
    if (Date.now() - modelCatalogCache.at > 60 * 1000) refreshModelCatalog()
    // 画图探测：页面轮询时顺手检查（最多 30s 一次，后台执行不阻塞）。
    comfyController.ensureFresh()
    // 名册可能在 apply 时还没就绪：状态轮询时顺手刷新（最多 60s 一次）。
    if (Date.now() - presetCache.refreshedAt > 60 * 1000 && presetCache.supported === false) {
      refreshAgentPresets()
    }
    const runtimeStatus = holder.runtime === null
      ? { started: false, connected: false, login: null, snapshot: null }
      : holder.runtime.status()
    const live = runtimeStatus.snapshot ?? null
    const overrides = settingsStore.load()
    const accessTokenSource = typeof overrides.accessToken === 'string' && overrides.accessToken !== ''
      ? 'settings'
      : 'profile'
    return {
      plugin: name,
      started: runtimeStatus.started === true,
      connected: runtimeStatus.connected === true,
      login: runtimeStatus.login ?? null,
      // 待补全项也列出来（ok 但 ready=false）：页面据此提示还没配 OneBot，而不是一片空白。
      problems: current.ok ? current.pending.slice() : [...current.problems, ...current.pending],
      lock: holder.lock,
      config: maskConfig(current.config, { accessTokenSource, jevApiKeySource: classifierSource }),
      gate: current.ok
        ? {
            enabled: current.config.gate.enabled === true,
            classifier: classifierInner === null ? null : 'jev',
            model: current.config.gate.model,
            threshold: current.config.gate.jevThreshold,
            slowTimer: current.config.gate.slowTimer,
            pendingMessages: Number(live?.pendingMessages) || 0,
            pendingGroups: Number(live?.pendingGroups) || 0,
            timers: Number(live?.timers) || 0,
            queue: Number(live?.queue) || 0,
            sendQueue: Number(live?.sendQueue) || 0,
            groups: gateGroupsView(),
          }
        : null,
      mappings: mappingsView(),
      // v0.21.1：workspace 挂载失败（会导致会话在 DSH 侧栏显示为「未分组」）。
      workspace: {
        attachIssues: Array.isArray(live?.workspaceAttachIssues) ? live.workspaceAttachIssues : [],
      },
      agentPresets: {
        supported: presetCache.supported,
        items: presetCache.items,
        missing: current.ok && current.config.agentPreset !== ''
          && presetCache.supported
          && !presetCache.items.some((item) => item.id === current.config.agentPreset),
      },
      presets: presets.map(presetView),
      presetService: {
        supported: presetController.supported(),
        registered: presetController.registeredIds(),
      },
      modelCatalog: modelCatalogCache.value,
      permissionCatalog: permissionCatalogView(),
      comfy: comfyController.status(),
    }
  }

  /**
   * relay 重建判定用的配置签名：忽略 comfy / environment（各自页面）与
   * gate.jevApiKey（只影响分类器热更新，不重建连接）。
   */
  function relaySignature(config) {
    if (config === null) return null
    return JSON.stringify({
      ...config,
      comfy: null,
      environment: null,
      // jev 的 key / 阈值 / 模型 / 地址都只影响分类器（v0.25.6 起模型与地址也可在页面改），
      // 由 refreshClassifier 热切换，不重建 relay 连接。
      gate: { ...config.gate, jevApiKey: '', model: '', jevEndpoint: '' },
    })
  }
  /**
   * 保存配置页提交的可编辑字段。
   *
   * @param payload - 页面提交的字段子集（未知键忽略、`null`/`undefined` 视为未修改）
   * @returns `{ ok: true, value: status }` 或 `{ ok: false, code, message }`
   */
  function saveConfig(payload) {
    const fields = pickEditable(payload)
    if (Object.keys(fields).length === 0) {
      return { ok: false, code: 'CONFIG_EMPTY', message: '没有可保存的字段。' }
    }
    const existingOverrides = settingsStore.load()
    const mergedOverrides = { ...existingOverrides, ...fields }
    // 嵌套段只在页面提交的子项上覆盖：environment.webuiToken / gate.jevApiKey 是只写不读的，
    // 页面不会回传它们，必须沿用已有覆盖值（否则每次保存都会清掉 token）。
    if (fields.environment !== undefined) {
      mergedOverrides.environment = {
        ...(existingOverrides.environment !== null && typeof existingOverrides.environment === 'object'
          ? existingOverrides.environment
          : {}),
        ...fields.environment,
      }
    }
    if (fields.gate !== undefined) {
      mergedOverrides.gate = {
        ...(existingOverrides.gate !== null && typeof existingOverrides.gate === 'object'
          ? existingOverrides.gate
          : {}),
        ...fields.gate,
      }
    }
    const next = resolveConfig(patchConfig, mergedOverrides)
    if (!next.ok) {
      return { ok: false, code: 'CONFIG_INVALID', message: next.problems.join('；'), problems: next.problems }
    }
    try {
      settingsStore.save(mergedOverrides)
    } catch (error) {
      log('error', '[relay] 保存配置失败：' + String(error?.message ?? error))
      return { ok: false, code: 'CONFIG_SAVE_FAILED', message: '保存配置失败；请检查存储目录权限后重试。' }
    }
    const comfyTouched = fields.comfy !== undefined
    const environmentTouched = fields.environment !== undefined
    // 只有 relay 相关字段真的变了才重建连接：页面保存会带上未改字段 / groupWorkspaces，
    // 不能按「提交了哪些键」判断。连接信息没配全（next.ready === false）时 relay 一律不启动，
    // 但其它设置照样落盘——v0.25.4 起「环境」页的 WebUI token 可以在 OneBot 配好之前先保存。
    const previousConfig = current.ok ? current.config : null
    const relayTouched = next.ready && (previousConfig === null
      || relaySignature(previousConfig) !== relaySignature(next.config))
    current = next
    // jev key / 阈值 / 模型 / 地址变化只换分类器实现，不重建 relay 连接（v0.24.0；v0.25.6 起模型 / 地址可改）。
    refreshClassifier()
    refreshAgentPresets()
    if (comfyTouched) void comfyController.refresh()
    if (environmentTouched) void envController.refresh()
    if (relayTouched && holder.runtime !== null) {
      try {
        holder.runtime.applyConfig(next.config)
      } catch (error) {
        log('error', '[relay] 配置已保存，但重建连接失败：' + String(error?.message ?? error))
        return { ok: false, code: 'RELAY_RESTART_FAILED', message: '配置已保存，但重建连接失败；可点「重新连接」重试。' }
      }
    }
    const restartNote = !next.ready
      ? '（还没配全 OneBot 连接信息，relay 暂不启动）'
      : relayTouched
        ? (holder.runtime === null ? '；relay 未启动' : '并已重连')
        : (comfyTouched && !environmentTouched ? '（仅画图配置，未重建 relay）' : '（未重建 relay）')
    log('info', '[relay] 配置已保存（' + Object.keys(fields).join(',') + '）' + restartNote)
    return { ok: true, value: statusPayload() }
  }

  /**
   * 保存一个插件预设（新增或按 id 覆盖）：校验 → 落 presets.json → 重新注册。
   * @param rawPreset 页面提交的预设对象
   * @returns `{ ok: true, value: { presets, status } }` 或 `{ ok: false, code, message }`
   */
  function savePreset(rawPreset) {
    const normalized = normalizePreset(rawPreset)
    if (!normalized.ok) {
      return { ok: false, code: 'PRESET_INVALID', message: normalized.problems.join('；') }
    }
    const candidate = normalized.preset
    const existingIndex = presets.findIndex((preset) => preset.id === candidate.id)
    const collidesWithDsh = presetCache.supported && existingIndex === -1
      && presetCache.items.some((item) => item.id === candidate.id)
    if (collidesWithDsh) {
      return { ok: false, code: 'PRESET_INVALID', message: '预设 id「' + candidate.id + '」与 DSH 已有预设冲突，请换一个' }
    }
    if (existingIndex === -1 && presets.length >= PRESET_LIMIT) {
      return { ok: false, code: 'PRESET_LIMIT', message: '最多 ' + String(PRESET_LIMIT) + ' 个插件预设' }
    }
    const next = presets.slice()
    if (existingIndex >= 0) next[existingIndex] = candidate
    else next.push(candidate)
    try {
      presetStore.save(next)
    } catch (error) {
      log('error', '[relay] 保存预设失败：' + String(error?.message ?? error))
      return { ok: false, code: 'PRESET_SAVE_FAILED', message: '保存预设失败；请检查存储目录权限后重试。' }
    }
    presets = next
    void presetController.refresh().then(() => { refreshAgentPresets() })
    log('info', '[relay] 已保存 QQ 预设「' + candidate.id + '」')
    return { ok: true, value: { presets: presets.map(presetView), status: statusPayload() } }
  }

  /**
   * 删除一个插件预设；正在被 QQ 会话使用的预设拒绝删除。
   * @param id 预设 id
   */
  function deletePreset(id) {
    const target = typeof id === 'string' ? id.trim() : ''
    if (!/^[a-z0-9][a-z0-9-]{0,40}$/.test(target)) {
      return { ok: false, code: 'PRESET_INVALID', message: '预设 id 非法。' }
    }
    if (!presets.some((preset) => preset.id === target)) {
      return { ok: false, code: 'PRESET_NOT_FOUND', message: '预设不存在：' + target }
    }
    if (current.ok && current.config.agentPreset === target) {
      return { ok: false, code: 'PRESET_IN_USE', message: '该预设正在被 QQ 会话使用；先到「行为」页换一个预设再删。' }
    }
    const next = presets.filter((preset) => preset.id !== target)
    try {
      presetStore.save(next)
    } catch (error) {
      log('error', '[relay] 删除预设失败：' + String(error?.message ?? error))
      return { ok: false, code: 'PRESET_SAVE_FAILED', message: '删除预设失败；请检查存储目录权限后重试。' }
    }
    presets = next
    void presetController.refresh().then(() => { refreshAgentPresets() })
    log('info', '[relay] 已删除 QQ 预设「' + target + '」')
    return { ok: true, value: { presets: presets.map(presetView), status: statusPayload() } }
  }

  /** 配置页「重新连接」：用当前配置重建连接。 */
  function reconnect() {
    if (!current.ok || !current.ready) {
      return { ok: false, code: 'RELAY_NOT_CONFIGURED', message: '还没配全 OneBot 连接信息（wsUrl / accessToken / selfId），无法连接。' }
    }
    if (holder.runtime === null) {
      return { ok: false, code: 'RELAY_NOT_STARTED', message: 'relay 尚未启动（可能没有有效配置，或另一个实例正在运行）。' }
    }
    let applied = false
    try {
      applied = holder.runtime.reconnect()
    } catch (error) {
      log('error', '[relay] 重建连接失败：' + String(error?.message ?? error))
      return { ok: false, code: 'RELAY_RESTART_FAILED', message: '重建连接失败；请稍后重试。' }
    }
    if (!applied) {
      return { ok: false, code: 'RELAY_NOT_CONFIGURED', message: '还没有有效配置，无法连接。' }
    }
    return { ok: true, value: statusPayload() }
  }

  /**
   * 配置页「重新绑定」（P4）：删掉该群映射并按新项目重建 relay。
   * 旧项目里的聊天记录不移动；下次消息按新项目建会话。
   *
   * @param groupId - 群号（必须在白名单内）
   * @returns `{ ok: true, value: status }` 或 `{ ok: false, code, message }`
   */
  function rebindGroup(groupId) {
    if (holder.runtime === null) {
      return { ok: false, code: 'REBIND_NOT_STARTED', message: 'relay 尚未启动，无法重新绑定。' }
    }
    const target = Number(groupId)
    if (!Number.isInteger(target) || target <= 0) {
      return { ok: false, code: 'REBIND_GROUP_INVALID', message: '群号非法。' }
    }
    if (!current.ok || !current.ready) {
      return { ok: false, code: 'REBIND_GROUP_INVALID', message: '当前配置还没配全，请先补全配置。' }
    }
    if (!current.config.groups.includes(target)) {
      return { ok: false, code: 'REBIND_GROUP_INVALID', message: '群 ' + String(target) + ' 不在白名单，无法重新绑定。' }
    }
    const removed = mapping.remove(target)
    try {
      holder.runtime.applyConfig(current.config)
    } catch (error) {
      log('error', '[relay] 重新绑定后重建连接失败：' + String(error?.message ?? error))
      return { ok: false, code: 'RELAY_RESTART_FAILED', message: '映射已删除，但重建连接失败；可点「重新连接」重试。' }
    }
    log('info', '[relay] 已重新绑定群 ' + String(target)
      + '（旧映射' + (removed ? '已删除' : '不存在') + '，下次消息按新项目建会话）')
    return { ok: true, value: statusPayload() }
  }

  /**
   * 配置页「立即清理」（v0.13.0）：按显式保留天数清一次聊天记录与媒体。
   * 与自动清理共用 `pruneChatAndMedia`；不改配置、不动映射 / 会话。
   *
   * @param days - 保留天数（1..3650）
   * @returns `{ ok: true, value: { cleanup, status } }` 或 `{ ok: false, code, message }`
   */
  function cleanupChatLogs(days) {
    const normalized = normalizeCleanupDays(days)
    if (!normalized.ok) {
      return { ok: false, code: 'CLEANUP_DAYS_INVALID', message: normalized.message }
    }
    if (!current.ok) {
      return { ok: false, code: 'CLEANUP_NOT_CONFIGURED', message: '当前配置无效，无法解析群项目目录；请先补全配置。' }
    }
    const at = Date.now()
    const removed = pruneChatAndMedia({
      chatLog,
      groupIds: knownGroupIds(),
      projectDirFor: projectDirOf,
      days: normalized.days,
      nowMs: at,
    })
    log('info', '[relay] 立即清理（保留 ' + String(normalized.days) + ' 天）：聊天 '
      + String(removed.chat) + ' 个文件，媒体 ' + String(removed.media) + ' 个日期目录')
    return {
      ok: true,
      value: {
        cleanup: { days: normalized.days, chat: removed.chat, media: removed.media, at },
        status: statusPayload(),
      },
    }
  }

  /**
   * 配置页「测试连接」：探测 ComfyUI（可带未保存的 baseUrl / timeoutMs）。
   * 只探测，不改配置、不改 skill 注册。
   *
   * @param payload - `{ baseUrl?, timeoutMs? }`
   * @returns `{ ok: true, value: { probe, status } }` 或 `{ ok: false, code, message }`
   */
  function testComfy(payload) {
    const input = payload !== null && typeof payload === 'object' ? payload : {}
    const candidate = { ...(current.ok ? current.config.comfy : DEFAULT_COMFY) }
    if (input.baseUrl !== undefined) candidate.baseUrl = input.baseUrl
    if (input.timeoutMs !== undefined) candidate.timeoutMs = input.timeoutMs
    const problems = []
    const normalized = normalizeComfyConfig(candidate, problems)
    if (problems.length > 0) {
      return { ok: false, code: 'COMFY_INVALID', message: problems.join('；') }
    }
    return comfyController.test({ baseUrl: normalized.baseUrl, timeoutMs: normalized.timeoutMs })
      .then((probe) => ({ ok: true, value: { probe, status: statusPayload() } }))
      .catch((error) => ({
        ok: false,
        code: 'COMFY_TEST_FAILED',
        message: '连接测试失败：' + String(error?.message ?? error),
      }))
  }

  /**
   * 面板「最近消息」：取最后 limit 条（最近 24 小时），转成只读视图。
   *
   * @param query - `{ groupId, limit }`（字符串来自 URL query）
   * @returns `{ ok: true, value: { groupId, limit, windowMs, messages } }` 或 `{ ok: false, code, message }`
   */
  function messagesFor(query) {
    const normalized = normalizeMessagesQuery(query)
    if (!normalized.ok) {
      return { ok: false, code: 'MESSAGES_GROUP_INVALID', message: normalized.message }
    }
    if (!current.ok) {
      return { ok: false, code: 'MESSAGES_NOT_CONFIGURED', message: '当前配置无效，无法解析群项目目录。' }
    }
    if (!knownGroupIds().includes(normalized.groupId)) {
      return {
        ok: false,
        code: 'MESSAGES_GROUP_INVALID',
        message: '群 ' + String(normalized.groupId) + ' 不在白名单 / 映射 / 群项目配置里。',
      }
    }
    const now = Date.now()
    let records = []
    try {
      records = chatLog.readRecent(normalized.groupId, now - PANEL_MESSAGES_WINDOW_MS, now)
    } catch (error) {
      log('warn', '[relay] 读取最近消息失败（群 ' + String(normalized.groupId) + '）：' + String(error?.message ?? error))
      return { ok: false, code: 'MESSAGES_FAILED', message: '读取聊天记录失败；请检查群项目目录权限。' }
    }
    return {
      ok: true,
      value: {
        groupId: normalized.groupId,
        limit: normalized.limit,
        windowMs: PANEL_MESSAGES_WINDOW_MS,
        messages: panelMessages(records, normalized.limit),
      },
    }
  }

  /**
   * 面板「解除绑定」：删掉单个群的会话映射并重建 relay（清掉 relay 内的会话缓存）。
   * 旧 DSH 会话保留在 GUI；下条群消息按当前项目目录重新建会话。
   *
   * @param groupId - 群号（必须在已知群内）
   * @returns `{ ok: true, value: { mapping, status } }` 或 `{ ok: false, code, message }`
   */
  function deleteMapping(groupId) {
    if (holder.runtime === null || !current.ok || !current.ready) {
      return { ok: false, code: 'MAPPING_NOT_STARTED', message: 'relay 尚未启动（可能没有有效配置，或另一个实例正在运行）。' }
    }
    const target = Number(groupId)
    if (!Number.isInteger(target) || target <= 0) {
      return { ok: false, code: 'MAPPING_GROUP_INVALID', message: '群号非法。' }
    }
    if (!knownGroupIds().includes(target)) {
      return { ok: false, code: 'MAPPING_GROUP_INVALID', message: '群 ' + String(target) + ' 不在白名单 / 群项目配置里。' }
    }
    const removed = mapping.remove(target)
    if (removed) {
      try {
        holder.runtime.applyConfig(current.config)
      } catch (error) {
        log('error', '[relay] 解除绑定后重建连接失败：' + String(error?.message ?? error))
        return { ok: false, code: 'RELAY_RESTART_FAILED', message: '映射已删除，但重建连接失败；可点「重新连接」重试。' }
      }
    }
    log('info', '[relay] 已解除群 ' + String(target) + ' 的会话绑定（旧会话保留在 GUI）')
    return { ok: true, value: { mapping: { groupId: target, removed }, status: statusPayload() } }
  }

  /**
   * 面板「清空全部映射」：删掉所有群映射并重建 relay。
   *
   * @returns `{ ok: true, value: { mappings: { cleared }, status } }` 或 `{ ok: false, code, message }`
   */
  function clearMappings() {
    if (holder.runtime === null || !current.ok || !current.ready) {
      return { ok: false, code: 'MAPPING_NOT_STARTED', message: 'relay 尚未启动（可能没有有效配置，或另一个实例正在运行）。' }
    }
    const keys = Object.keys(mapping.all())
    let cleared = 0
    for (const key of keys) {
      if (mapping.remove(Number(key))) cleared += 1
    }
    if (cleared > 0) {
      try {
        holder.runtime.applyConfig(current.config)
      } catch (error) {
        log('error', '[relay] 清空映射后重建连接失败：' + String(error?.message ?? error))
        return { ok: false, code: 'RELAY_RESTART_FAILED', message: '映射已清空，但重建连接失败；可点「重新连接」重试。' }
      }
    }
    log('info', '[relay] 已清空群映射：' + String(cleared) + ' 条（旧会话保留在 GUI）')
    return { ok: true, value: { mappings: { cleared }, status: statusPayload() } }
  }

  // ① 会话服务就绪 → 持有单实例锁并创建运行实例。
  ctx.effect(() => {
    const child = ctx.inject(['sessionController', 'workspaceRegistry'], (svcCtx) => {
      let lock
      try {
        lock = acquireLock(join(storageDir, 'relay.lock'))
      } catch (error) {
        log('warn', '[relay] 获取单实例锁失败：' + String(error?.message ?? error))
        return () => {}
      }
      if (!lock.ok) {
        holder.lock = lock.holder
        const holderText = lock.holder === null ? '未知进程' : 'pid ' + String(lock.holder.pid)
        log('warn', '[relay] 已有实例在运行（' + holderText + '），本进程不启动')
        return () => {}
      }
      holder.lock = null

      const runtime = createRelayRuntime({
        ctx: svcCtx,
        logger: {
          info: (message) => log('info', message),
          warn: (message) => log('warn', message),
          error: (message) => log('error', message),
        },
        mapping,
        state,
        chatLog,
        gateLog,
        interceptors,
        classifier,
        configureSessionSettings: async (sessionId) => presetController.applySession(sessionId),
      })
      holder.runtime = runtime
      if (current.ok && current.ready) {
        try {
          runtime.applyConfig(current.config)
        } catch (error) {
          log('error', '[relay] 启动失败：' + String(error?.message ?? error))
        }
      }

      return () => {
        try { runtime.stop() } catch {}
        holder.runtime = null
        try { lock.release() } catch {}
        log('info', '[relay] 已停止')
      }
    })

    return () => {
      try {
        if (typeof child === 'function') child()
        else if (typeof child?.dispose === 'function') child.dispose()
      } catch {}
    }
  }, 'dsh-qq-relay: relay')

  // ①.5 agentPresets 服务就绪 → 把 presets.json 动态注册成 DSH agent preset。
  //     服务缺失（旧宿主 / 精简部署）时静默跳过，配置页仍可管理预设文件。
  ctx.effect(() => {
    const child = ctx.inject(['agentPresets'], (svcCtx) => {
      const dispose = presetController.attach(svcCtx.agentPresets)
      // 注册是异步的：完成后再刷新名册，配置页下拉才能立刻看到插件预设。
      void presetController.refresh().then(() => { refreshAgentPresets() })
      return dispose
    })
    return () => {
      try {
        if (typeof child === 'function') child()
        else if (typeof child?.dispose === 'function') child.dispose()
      } catch {}
    }
  }, 'dsh-qq-relay: preset registration')
  ctx.effect(() => () => presetController.dispose(), 'dsh-qq-relay: preset disposal')

  // ①.6 skills 服务就绪 → 把 ComfyUI 画图 skill 动态注册给 DSH（v0.21.0）。
  //     服务缺失（精简宿主）时画面仍可探测，只是 skill 不加载（status.comfy.supported=false）。
  ctx.effect(() => {
    const child = ctx.inject(['skills'], (skillsCtx) => {
      comfyController.attachSkills(skillsCtx.skills)
      return () => comfyController.detachSkills()
    })
    return () => {
      try {
        if (typeof child === 'function') child()
        else if (typeof child?.dispose === 'function') child.dispose()
      } catch {}
    }
  }, 'dsh-qq-relay: comfy skill')
  ctx.effect(() => () => comfyController.dispose(), 'dsh-qq-relay: comfy disposal')
  ctx.effect(() => () => envController.dispose(), 'dsh-qq-relay: env disposal')

  // ② HTTP 服务就绪 → 挂配置页路由；没有 webServer（headless）时静默跳过。
  ctx.effect(() => {
    const child = ctx.inject(['webServer'], (routeCtx) => {
      const disposers = []
      let routes = []
      try {
        routes = createConfigRoutes({
          getStatus: statusPayload,
          saveConfig,
          reconnect,
          rebind: rebindGroup,
          cleanup: cleanupChatLogs,
          getMessages: messagesFor,
          deleteMapping,
          clearMappings,
          savePreset,
          deletePreset,
          testComfy,
          getEnv: () => {
            envController.ensureFresh()
            return envController.status()
          },
          envAction: (payload) => envController.action(payload),
        })
      } catch (error) {
        log('warn', '[relay] 配置页路由构造失败：' + String(error?.message ?? error))
        return () => {}
      }
      for (const route of routes) {
        try {
          disposers.push(routeCtx.webServer.register(route))
        } catch (error) {
          log('warn', '[relay] 注册路由 ' + route.path + ' 失败：' + String(error?.message ?? error))
        }
      }
      return () => {
        for (const dispose of disposers.splice(0)) {
          try { dispose() } catch {}
        }
      }
    })

    return () => {
      try {
        if (typeof child === 'function') child()
        else if (typeof child?.dispose === 'function') child.dispose()
      } catch {}
    }
  }, 'dsh-qq-relay: config routes')

  // ③ 工具服务就绪 → 注册 qq_send（DSH → QQ 主动推送，P3）。
  //    没有 tools 服务的宿主（老版本 / 精简部署）静默跳过，不影响 relay 与配置页。
  ctx.effect(() => {
    const child = ctx.inject(['tools'], (toolCtx) => {
      const disposers = []
      try {
        const groups = () => (current.ok ? [...current.config.groups] : [])
        const requireRuntime = () => {
          if (holder.runtime === null) throw new Error('relay 尚未启动（可能没有有效配置，或另一个实例正在运行）')
          return holder.runtime
        }
        disposers.push(toolCtx.tools.register(createQqSendTool({
          getGroups: groups,
          sendText: async (groupId, text) => requireRuntime().sendText(groupId, text),
          sendImage: async (groupId, source) => requireRuntime().sendImage(groupId, source),
          sendVideo: async (groupId, source) => requireRuntime().sendVideo(groupId, source),
          sendFile: async (groupId, filePath, name) => requireRuntime().sendFile(groupId, filePath, name),
        })))
        disposers.push(toolCtx.tools.register(createQqPokeTool({
          getGroups: groups,
          poke: async (groupId, userId) => requireRuntime().sendPoke(groupId, userId),
        })))
        log('info', '[relay] 已注册工具 qq_send / qq_poke')
      } catch (error) {
        for (const dispose of disposers.splice(0)) {
          try { dispose() } catch {}
        }
        log('warn', '[relay] 注册 qq_send / qq_poke 工具失败：' + String(error?.message ?? error))
        return () => {}
      }
      return () => {
        for (const dispose of disposers.splice(0)) {
          try { dispose() } catch {}
        }
      }
    })

    return () => {
      try {
        if (typeof child === 'function') child()
        else if (typeof child?.dispose === 'function') child.dispose()
      } catch {}
    }
  }, 'dsh-qq-relay: qq_send tool')

  // ④ 审批服务就绪 → 启动 QQ 侧审批桥（把审批请求发到群里等文本命令）。
  ctx.effect(() => {
    const child = ctx.inject(['approval'], (approvalCtx) => {
      approvalBridge.start(approvalCtx)
      return () => approvalBridge.stop()
    })

    return () => {
      try {
        if (typeof child === 'function') child()
        else if (typeof child?.dispose === 'function') child.dispose()
      } catch {}
    }
  }, 'dsh-qq-relay: approval bridge')
}
