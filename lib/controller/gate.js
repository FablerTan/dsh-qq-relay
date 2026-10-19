/**
 * 消息闸门调度器（P2.1）：普通群消息按 docs/gate.md 的三条路径处理。
 *
 * - 直通（@ / 引用 / 命令）不经过这里，由 relay 直接派发；
 * - 快路：bot 最近 fastWindow 内发过言 → 进 debounce 批次，到点调一次分类器；
 * - 慢路：bot 久未发言 → 累积 pending，slowTimer 到点评估最近 slowWindow 的消息；
 * - 任一决策为「接话」→ 回调 dispatch(批次)；是否真的发出由 relay 决定，
 *   成功发送后由 relay 调 noteBotSpoke() 刷新窗口并清空 pending。
 *
 * 分类器通过参数注入（见 model/gate.js 的 createNullClassifier）：P2.1 尚未接模型，
 * 默认实现永远 fail closed（不接话，只记决策日志）。
 *
 * 纪律：调度器自身不发送、不抛异常；定时器在 stop() 时全部清理。
 */

import { buildBatch, createNullClassifier, fastPathActive, minIntervalRemaining, normalizeDecision } from '../model/gate.js'
import { normalizeMediaRecords } from '../model/media.js'
import { PENDING_LIMIT } from '../model/state.js'

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('分类器超时（' + String(ms) + 'ms）')), ms)
    Promise.resolve(promise).then(
      (value) => { clearTimeout(timer); resolve(value) },
      (error) => { clearTimeout(timer); reject(error) },
    )
  })
}

/**
 * @param options.config - 规范化后的 gate 配置（毫秒字段）
 * @param options.groups - 需要预热 pending 的群号（白名单）
 * @param options.state - 每群状态仓库（model/state.js）
 * @param options.logger - `{ info, warn, error }`
 * @param options.classifier - `{ classify({ groupId, groupName, trigger, messages }) }`
 * @param options.gateLog - 决策日志（model/gate-log.js；可缺省）
 * @param options.chatLog - 聊天日志（给 jev 提供最近上下文，含 bot 自己的发言；可缺省）
 * @param options.dispatch - `async (messages, decision, { groupId, groupName }) => void`
 * @param options.now - 时间源（单测可注入）
 * @param options.timers - `{ setTimeout, clearTimeout }`（单测用假时钟；缺省用全局）
 */
export function createGate({ config, groups = [], state, logger = null, classifier = null, gateLog = null, chatLog = null, dispatch, now = () => Date.now(), timers = null }) {
  const gateConfig = config
  const setTimer = typeof timers?.setTimeout === 'function' ? (fn, ms) => timers.setTimeout(fn, ms) : (fn, ms) => setTimeout(fn, ms)
  const clearTimer = typeof timers?.clearTimeout === 'function' ? (id) => timers.clearTimeout(id) : (id) => clearTimeout(id)
  const log = {
    info: (message) => { try { logger?.info?.(message) } catch {} },
    warn: (message) => { try { logger?.warn?.(message) } catch {} },
    error: (message) => { try { logger?.error?.(message) } catch {} },
  }
  const activeClassifier = classifier !== null && typeof classifier?.classify === 'function'
    ? classifier
    : createNullClassifier()

  const pendingByGroup = new Map()
  const timerTable = new Map()
  const names = new Map()
  let started = false
  let stopped = false

  function hydrate() {
    if (started || stopped) return
    started = true
    for (const groupId of groups) {
      const key = String(groupId)
      const stored = state.get(groupId).pending
      if (stored.length > 0) pendingByGroup.set(key, stored.slice(-PENDING_LIMIT))
    }
  }

  function ensureTimers(key) {
    let entry = timerTable.get(key)
    if (entry === undefined) {
      entry = { debounce: null, slow: null }
      timerTable.set(key, entry)
    }
    return entry
  }

  function clearTimers(key) {
    const entry = timerTable.get(key)
    if (entry === undefined) return
    if (entry.debounce !== null) clearTimer(entry.debounce)
    if (entry.slow !== null) clearTimer(entry.slow)
    timerTable.delete(key)
  }

  function persist(key, extra = {}) {
    state.update(Number(key), { pending: pendingByGroup.get(key) ?? [], ...extra })
  }

  /**
   * 给分类器的上下文：聊天日志里最近的 60 条（含 bot 自己的发言）。
   * 没有日志 / 读取失败时退回本批消息，保证永远有输入。
   */
  function recentContext(groupId, batch) {
    if (chatLog === null || typeof chatLog?.readRecent !== 'function') return batch
    try {
      const since = now() - Math.max(gateConfig.slowWindow, 6 * 60 * 60 * 1000)
      const recent = chatLog.readRecent(groupId, since)
      if (!Array.isArray(recent) || recent.length === 0) return batch
      const merged = buildBatch(recent, { maxBatchMessages: 60 })
      return merged.length > 0 ? merged : batch
    } catch (error) {
      log.warn('[gate] 读取聊天上下文失败（退回本批）：' + String(error?.message ?? error))
      return batch
    }
  }

  function armDebounce(key, delay = gateConfig.debounce) {
    const entry = ensureTimers(key)
    if (entry.debounce !== null) clearTimer(entry.debounce)
    entry.debounce = setTimer(() => {
      entry.debounce = null
      void evaluate(key, 'fast')
    }, Math.max(0, delay))
  }

  function armSlow(key) {
    const entry = ensureTimers(key)
    if (entry.slow !== null) return
    entry.slow = setTimer(() => {
      entry.slow = null
      void evaluate(key, 'slow')
    }, gateConfig.slowTimer)
  }

  function logDecision(key, trigger, messages, decision, costMs) {
    log.info('[gate] 决策 group=' + key + ' trigger=' + trigger
      + ' batch=' + String(messages.length)
      + ' reply=' + String(decision.reply)
      + ' confidence=' + String(decision.confidence)
      + ' reason=' + (decision.reason === '' ? '-' : decision.reason)
      + ' cost=' + String(costMs) + 'ms')
  }

  async function evaluate(key, trigger) {
    if (stopped) return
    clearTimers(key)

    const groupId = Number(key)
    const stored = state.get(groupId)
    // DSH 正在跑本群的轮次：等它结束再判定（pending 保留，稍后重试）。
    if (stored.dshBusy === true) {
      armDebounce(key)
      return
    }

    let messages = pendingByGroup.get(key) ?? []
    if (messages.length === 0) return
    if (trigger === 'slow') {
      // 慢路只看最近 slowWindow 的消息；更早的丢弃（仍保留在聊天日志里）。
      const cutoff = now() - gateConfig.slowWindow
      messages = messages.filter((item) => Number(item.time) >= cutoff)
      if (messages.length === 0) {
        pendingByGroup.set(key, [])
        persist(key)
        return
      }
    }

    // 媒体下载会让消息的到达顺序与时间顺序不一致：统一按消息时间排序后再拼批次。
    messages = messages.slice().sort((left, right) => Number(left.time ?? 0) - Number(right.time ?? 0))

    const wait = minIntervalRemaining({ now: now(), lastReplyAt: stored.lastReplyAt, config: gateConfig })
    if (wait > 0) {
      // 距上次发言不足最小间隔：本批并入下一批，稍后再评估。
      armDebounce(key, wait)
      return
    }

    state.update(groupId, { evaluating: true })
    const batch = buildBatch(messages, { maxBatchMessages: gateConfig.maxBatchMessages })
    const context = recentContext(groupId, batch)
    const startedAt = now()
    let decision
    try {
      const raw = await withTimeout(activeClassifier.classify({
        groupId,
        groupName: names.get(key) ?? '',
        trigger,
        messages: context,
        batch,
      }), gateConfig.classifierTimeoutMs)
      decision = normalizeDecision(raw)
    } catch (error) {
      decision = normalizeDecision(null)
      log.warn('[gate] 分类器失败（按不接话处理）：' + String(error?.message ?? error))
    }
    state.update(groupId, { evaluating: false })
    const costMs = now() - startedAt
    logDecision(key, trigger, batch, decision, costMs)
    if (gateLog !== null) {
      try {
        gateLog.append({
          time: now(),
          groupId,
          trigger,
          batch: batch.length,
          reply: decision.reply,
          confidence: decision.confidence,
          reason: decision.reason,
          costMs,
          messageIds: batch.map((item) => item.messageId).filter((id) => id !== ''),
        })
      } catch (error) {
        log.warn('[gate] 决策日志写入失败：' + String(error?.message ?? error))
      }
    }

    pendingByGroup.set(key, [])
    persist(key)
    if (decision.reply !== true) return

    clearTimers(key)
    try {
      await dispatch(batch, decision, { groupId, groupName: names.get(key) ?? '', trigger })
    } catch (error) {
      log.error('[gate] 派发失败：' + String(error?.message ?? error))
    }
  }

  function ingest(event) {
    if (stopped || gateConfig.enabled !== true) return
    const groupId = Number(event?.groupId)
    if (!Number.isInteger(groupId) || groupId <= 0) return
    // 纯图片 / 表情等没有文本的消息：拼不出 prompt，直接不进闸门（不浪费分类器调用）。
    if (typeof event.text !== 'string' || event.text.trim() === '') return
    const key = String(groupId)
    if (typeof event.groupName === 'string' && event.groupName !== '') names.set(key, event.groupName)

    const list = pendingByGroup.get(key) ?? []
    const record = {
      messageId: String(event.messageId ?? ''),
      groupId: String(groupId),
      userId: String(event.userId ?? ''),
      nickname: typeof event.sender?.card === 'string' && event.sender.card !== ''
        ? event.sender.card
        : (typeof event.sender?.nickname === 'string' ? event.sender.nickname : ''),
      card: typeof event.sender?.card === 'string' ? event.sender.card : '',
      role: typeof event.sender?.role === 'string' ? event.sender.role : '',
      text: typeof event.text === 'string' ? event.text : '',
      time: Number.isFinite(event.timeMs) && event.timeMs > 0 ? event.timeMs : now(),
      mentionsSelf: event.mentionsSelf === true,
      replyToId: typeof event.replyToId === 'string' ? event.replyToId : '',
    }
    const media = normalizeMediaRecords(event.media)
    if (media.length > 0) record.media = media
    if (record.messageId !== '' && list.some((item) => item.messageId === record.messageId)) return
    list.push(record)
    if (list.length > PENDING_LIMIT) list.splice(0, list.length - PENDING_LIMIT)
    pendingByGroup.set(key, list)
    persist(key, { lastUserMessageAt: now() })

    const stored = state.get(groupId)
    if (fastPathActive({ now: now(), lastBotSpeakAt: stored.lastBotSpeakAt, config: gateConfig })) {
      armDebounce(key)
    } else {
      armSlow(key)
    }
  }

  /** relay 成功发出一条回复后调用：刷新窗口、清空 pending 与定时器。 */
  function noteBotSpoke(groupId) {
    const key = String(groupId)
    clearTimers(key)
    if (!pendingByGroup.has(key)) return
    pendingByGroup.set(key, [])
    persist(key)
  }

  /** 只读快照（/status 命令与状态面用）：待评估消息 / 批数、活动定时器数。 */
  function snapshot() {
    let pendingMessages = 0
    let pendingGroups = 0
    for (const list of pendingByGroup.values()) {
      if (list.length === 0) continue
      pendingMessages += list.length
      pendingGroups += 1
    }
    return { pendingMessages, pendingGroups, timers: timerTable.size }
  }

  function start() {
    hydrate()
  }

  function stop() {
    stopped = true
    for (const key of [...timerTable.keys()]) clearTimers(key)
    pendingByGroup.clear()
    names.clear()
  }

  return { start, stop, ingest, noteBotSpoke, snapshot }
}
