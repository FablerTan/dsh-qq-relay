/**
 * QQ 侧审批桥（P3）：把 DSH 的 `approval/request` 转发到群里，用文本命令决定。
 *
 * 只接管「映射到某个 QQ 群」的会话的审批请求：其它会话继续 `next()` 交给 GUI。
 * 群里有人回复「同意 / 拒绝」→ 解出 `allowed-once` / `rejected`；超时按拒绝；
 * 请求方取消（signal abort）→ `cancelled`；relay 离线 / 发送失败 → `unavailable`（fail closed）。
 *
 * 纪律：监听器必须返回闭集结果词之一；任何内部异常都不得让审批悬空。
 */

import { canDecideApproval, DEFAULT_APPROVAL_ROLES, formatApprovalPrompt, matchApprovalDecision } from '../model/approval.js'

const DEFAULT_TIMEOUT_MS = 120 * 1000

/**
 * @param options.getConfig - 返回 `{ enabled, timeoutMs, roles }`（每次读，跟随配置页保存）
 * @param options.mapping - 群 ↔ 会话映射（反查 sessionId → groupId）
 * @param options.sendText - `async (groupId, text) => { queued, ... }`（relay.sendText）
 * @param options.logger - `{ info, warn, error }`
 * @param options.timers - `{ setTimeout, clearTimeout }`（单测用假时钟）
 */
export function createApprovalBridge({ getConfig, mapping, sendText, logger = null, timers = null }) {
  const log = {
    info: (message) => { try { logger?.info?.(message) } catch {} },
    warn: (message) => { try { logger?.warn?.(message) } catch {} },
    error: (message) => { try { logger?.error?.(message) } catch {} },
  }
  const setTimer = typeof timers?.setTimeout === 'function' ? (fn, ms) => timers.setTimeout(fn, ms) : (fn, ms) => setTimeout(fn, ms)
  const clearTimer = typeof timers?.clearTimeout === 'function' ? (id) => timers.clearTimeout(id) : (id) => clearTimeout(id)

  /** groupId(string) → { resolve, timer, cleanup } */
  const pending = new Map()
  let disposeListener = null
  let stopped = false

  function approvalConfig() {
    const value = typeof getConfig === 'function' ? getConfig() : null
    return {
      enabled: value?.enabled !== false,
      timeoutMs: Number.isFinite(value?.timeoutMs) ? value.timeoutMs : DEFAULT_TIMEOUT_MS,
      roles: Array.isArray(value?.roles) && value.roles.length > 0 ? value.roles : [...DEFAULT_APPROVAL_ROLES],
    }
  }

  function groupOfSession(sessionId) {
    const target = String(sessionId ?? '')
    if (target === '') return null
    for (const [groupId, entry] of Object.entries(mapping.all())) {
      if (String(entry?.sessionId ?? '') === target) {
        const value = Number(groupId)
        return Number.isInteger(value) && value > 0 ? value : null
      }
    }
    return null
  }

  function finish(groupId, outcome, note) {
    const key = String(groupId)
    const entry = pending.get(key)
    if (entry === undefined) return false
    pending.delete(key)
    clearTimer(entry.timer)
    try { entry.cleanup() } catch {}
    entry.resolve(outcome)
    if (typeof note === 'string' && note !== '') {
      Promise.resolve()
        .then(() => sendText(Number(groupId), note))
        .catch((error) => log.warn('[approval] 回执发送失败：' + String(error?.message ?? error)))
    }
    return true
  }

  /** 群消息拦截器：审批等待期间的「同意 / 拒绝」由这里消费，不再进闸门。 */
  function intercept(event) {
    if (stopped || pending.size === 0) return false
    const groupId = Number(event?.groupId)
    if (!Number.isInteger(groupId) || !pending.has(String(groupId))) return false
    const decision = matchApprovalDecision(event.text)
    if (decision === null) return false
    const config = approvalConfig()
    if (!canDecideApproval(event, config.roles)) {
      log.warn('[approval] 忽略无权限的审批回复：群 ' + String(groupId) + ' 用户 ' + String(event.userId))
      Promise.resolve().then(() => sendText(groupId, '只有群主 / 管理员可以审批，本条消息已忽略。'))
        .catch(() => {})
      return true
    }
    if (decision === 'allow') {
      finish(groupId, 'allowed-once', '已同意 ✅')
      log.info('[approval] 群 ' + String(groupId) + ' 审批通过（用户 ' + String(event.userId) + '）')
    } else {
      finish(groupId, 'rejected', '已拒绝 ❌')
      log.info('[approval] 群 ' + String(groupId) + ' 审批被拒绝（用户 ' + String(event.userId) + '）')
    }
    return true
  }

  async function onApprovalRequest(req, next) {
    if (stopped) return next()
    const config = approvalConfig()
    if (config.enabled !== true) return next()
    const groupId = groupOfSession(req?.agent?.session?.id)
    if (groupId === null) return next()
    // 同群已有待审批：交给 GUI 处理，避免两处提示互相覆盖。
    if (pending.has(String(groupId))) {
      log.warn('[approval] 群 ' + String(groupId) + ' 已有待审批请求，本次交给 GUI')
      return next()
    }
    if (req?.signal?.aborted === true) return 'cancelled'

    const promptText = formatApprovalPrompt({ toolName: req?.toolName, reason: req?.reason, timeoutMs: config.timeoutMs })
    try {
      const sent = await sendText(groupId, promptText)
      if (sent?.queued === true) {
        log.warn('[approval] relay 离线，审批按不可用处理（fail closed）')
        return 'unavailable'
      }
    } catch (error) {
      log.warn('[approval] 审批提示发送失败（fail closed）：' + String(error?.message ?? error))
      return 'unavailable'
    }

    return await new Promise((resolve) => {
      const key = String(groupId)
      const entry = { resolve, timer: null, cleanup: () => {} }
      const onAbort = () => {
        if (finish(groupId, 'cancelled') === true) log.info('[approval] 群 ' + key + ' 审批被请求方取消')
      }
      if (req?.signal !== undefined && typeof req.signal.addEventListener === 'function') {
        req.signal.addEventListener('abort', onAbort, { once: true })
        entry.cleanup = () => req.signal.removeEventListener('abort', onAbort)
      }
      entry.timer = setTimer(() => {
        if (finish(groupId, 'rejected', '审批超时，已按拒绝处理 ⏱') === true) {
          log.warn('[approval] 群 ' + key + ' 审批超时（' + String(config.timeoutMs) + 'ms），按拒绝处理')
        }
      }, config.timeoutMs)
      pending.set(key, entry)
    })
  }

  /** @param ctx - 已注入 `approval` 服务的子上下文 */
  function start(ctx) {
    if (stopped || disposeListener !== null) return
    if (typeof ctx?.on !== 'function') {
      log.warn('[approval] 宿主缺少事件总线，审批桥未启动')
      return
    }
    disposeListener = ctx.on('approval/request', (req, next) => onApprovalRequest(req, next), { prepend: true })
    log.info('[approval] QQ 侧审批桥已启动')
  }

  function stop() {
    if (stopped) return
    stopped = true
    for (const groupId of [...pending.keys()]) {
      const entry = pending.get(groupId)
      pending.delete(groupId)
      clearTimer(entry.timer)
      try { entry.cleanup() } catch {}
      entry.resolve('cancelled')
    }
    if (typeof disposeListener === 'function') {
      try { disposeListener() } catch {}
    }
    disposeListener = null
  }

  return { start, stop, intercept, pendingCount: () => pending.size }
}
