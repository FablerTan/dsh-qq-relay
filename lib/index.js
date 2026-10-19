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

import { join } from 'node:path'
import { homedir } from 'node:os'

import { createSettingsStore, maskConfig, pickEditable, resolveConfig } from './model/settings.js'
import { createMappingStore } from './model/mapping.js'
import { acquireLock, createStateStore, migrateLegacyState } from './model/state.js'
import { createChatLog } from './model/chat-log.js'
import { createGateLog } from './model/gate-log.js'
import { createRelayRuntime } from './controller/runtime.js'
import { createConfigRoutes } from './controller/config-routes.js'

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

  /** 共享状态：运行实例由会话服务子 fiber 创建，HTTP 面读取并驱动它。 */
  const holder = { runtime: null, lock: null }

  const mapping = createMappingStore(join(storageDir, 'mapping.json'))
  const stateLogger = { warn: (message) => log('warn', message) }
  const state = createStateStore({ dir: join(storageDir, 'state'), logger: stateLogger })
  const chatLog = createChatLog({ dir: join(storageDir, 'chat'), retentionDays: 7 })
  const gateLog = createGateLog({ dir: join(storageDir, 'gate'), retentionDays: 7 })

  // P2.1 起状态按群分文件；旧版 state.json 一次性导入（原文件保留，便于回滚）。
  const migration = migrateLegacyState(join(storageDir, 'state.json'), state, stateLogger)
  if (migration.migrated.length > 0) {
    log('info', '[relay] 已迁移旧状态：' + migration.migrated.join(','))
  }

  // 日志保留期（P2.2）：启动时清一次，之后每天清一次；失败只记日志。
  function pruneLogs() {
    try {
      const removedChat = chatLog.prune()
      const removedGate = gateLog.prune()
      if (removedChat > 0 || removedGate > 0) {
        log('info', '[relay] 清理过期日志：聊天 ' + String(removedChat) + ' 个，闸门 ' + String(removedGate) + ' 个')
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

  /** 当前状态快照（HTTP 面唯一的事实源）。 */
  function statusPayload() {
    const runtimeStatus = holder.runtime === null
      ? { started: false, connected: false, login: null }
      : holder.runtime.status()
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
        routes = createConfigRoutes({ getStatus: statusPayload, saveConfig, reconnect })
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
}
