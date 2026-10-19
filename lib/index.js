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
import { createJevClassifier } from './model/jev.js'
import { createMappingStore } from './model/mapping.js'
import { acquireLock, createStateStore, migrateLegacyState } from './model/state.js'
import { CHAT_MIGRATION_MARKER, createChatLog, migrateLegacyChatLogs } from './model/chat-log.js'
import { normalizeCleanupDays, pruneChatAndMedia } from './model/cleanup.js'
import { PANEL_MESSAGES_WINDOW_MS, normalizeMessagesQuery, panelMessages } from './model/panel.js'
import { createGateLog } from './model/gate-log.js'
import { chatRootFor, ensureRelayDir, projectDirFor } from './model/project.js'
import { createRelayRuntime } from './controller/runtime.js'
import { createConfigRoutes } from './controller/config-routes.js'
import { createQqSendTool } from './controller/tools.js'
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

  /**
   * 当前生效配置 = patch + settings.json 覆盖。启动时算一次；配置页保存时重算。
   * 无有效配置时 relay 不启动，但配置页仍然可用（否则配置错了就没法在 UI 里改）。
   */
  let current = resolveConfig(patchConfig, settingsStore.load())
  if (!current.ok) {
    for (const problem of current.problems) log('warn', '[relay] 配置无效：' + problem)
    log('warn', '[relay] 配置不完整，relay 未启动（可在设置页「QQ 机器人」里补齐）')
  }

  /**
   * jev 分类器（P2.3）：gate 打开且 API key 就绪时才构造；否则 null——
   * 闸门调度器会把「没有分类器」当作 fail closed（普通消息永远不接话）。
   * gate 配置只读（不在设置页可编辑字段里），因此启动时算一次即可。
   */
  let classifier = null
  if (current.ok && current.config.gate.enabled === true) {
    const gateConfig = current.config.gate
    const apiKey = typeof process.env[gateConfig.jevApiKeyEnv] === 'string' ? process.env[gateConfig.jevApiKeyEnv] : ''
    if (apiKey === '') {
      log('warn', '[relay] gate.enabled 已开，但环境变量 ' + gateConfig.jevApiKeyEnv + ' 为空，jev 分类器未启用（普通消息一律不接话）')
    } else {
      classifier = createJevClassifier({
        endpoint: gateConfig.jevEndpoint,
        apiKey,
        model: gateConfig.model,
        threshold: gateConfig.jevThreshold,
        // 设置页可热改阈值：每次判定时读取当前配置（gate.enabled 仍只读）。
        getThreshold: () => (current.ok ? current.config.gate.jevThreshold : gateConfig.jevThreshold),
        timeoutMs: gateConfig.classifierTimeoutMs,
        logger: { warn: (message) => log('warn', message) },
        botLabel: String(current.config.selfId),
      })
      log('info', '[relay] jev 分类器已启用：' + gateConfig.model + '（阈值 ' + String(gateConfig.jevThreshold) + '）')
    }
  }

  /** 共享状态：运行实例由会话服务子 fiber 创建，HTTP 面读取并驱动它。 */
  const holder = { runtime: null, lock: null }

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
      problems: current.ok ? [] : current.problems,
      lock: holder.lock,
      config: maskConfig(current.config, { accessTokenSource }),
      gate: current.ok
        ? {
            enabled: current.config.gate.enabled === true,
            classifier: typeof classifier?.name === 'string' ? classifier.name : null,
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
    }
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
    const mergedOverrides = { ...settingsStore.load(), ...fields }
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
    current = next
    if (holder.runtime !== null) {
      try {
        holder.runtime.applyConfig(next.config)
      } catch (error) {
        log('error', '[relay] 配置已保存，但重建连接失败：' + String(error?.message ?? error))
        return { ok: false, code: 'RELAY_RESTART_FAILED', message: '配置已保存，但重建连接失败；可点「重新连接」重试。' }
      }
    }
    log('info', '[relay] 配置已保存（' + Object.keys(fields).join(',') + '）'
      + (holder.runtime === null ? '；relay 未启动' : '并已重连'))
    return { ok: true, value: statusPayload() }
  }

  /** 配置页「重新连接」：用当前配置重建连接。 */
  function reconnect() {
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
    if (!current.ok) {
      return { ok: false, code: 'REBIND_GROUP_INVALID', message: '当前配置无效，请先补全配置。' }
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
    if (holder.runtime === null || !current.ok) {
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
    if (holder.runtime === null || !current.ok) {
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
      })
      holder.runtime = runtime
      if (current.ok) {
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
      let dispose
      try {
        const tool = createQqSendTool({
          getGroups: () => (current.ok ? [...current.config.groups] : []),
          sendText: async (groupId, text) => {
            if (holder.runtime === null) throw new Error('relay 尚未启动（可能没有有效配置，或另一个实例正在运行）')
            return holder.runtime.sendText(groupId, text)
          },
          sendImage: async (groupId, source) => {
            if (holder.runtime === null) throw new Error('relay 尚未启动（可能没有有效配置，或另一个实例正在运行）')
            return holder.runtime.sendImage(groupId, source)
          },
          sendFile: async (groupId, filePath, name) => {
            if (holder.runtime === null) throw new Error('relay 尚未启动（可能没有有效配置，或另一个实例正在运行）')
            return holder.runtime.sendFile(groupId, filePath, name)
          },
        })
        dispose = toolCtx.tools.register(tool)
        log('info', '[relay] 已注册工具 qq_send')
      } catch (error) {
        log('warn', '[relay] 注册工具 qq_send 失败：' + String(error?.message ?? error))
        return () => {}
      }
      return () => {
        try { dispose() } catch {}
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
