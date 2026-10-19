/**
 * QQ ↔ DSH 消息转发（P2.1：@ / 引用 / 命令直通 + 普通消息进闸门调度）。
 *
 * 入向：OneBot 原始事件 → codec 规范化 → 白名单 / 去重 / 聊天日志
 *       → 直通判定（@ / 引用 / 命令，受 gate.mentionBypass 控制）
 *       → 其余普通消息交给 controller/gate.js（去抖批次 / 慢路 / 最小间隔）
 *       → 确保每个群一个 DSH 会话（自动创建 + workspace attach + 重命名）
 *       → sessionController.prompt（requestId 关联本轮）。
 * 出向：监听 session/event，用 agent/inbox/claimed 把 requestId 关联到 turn，
 *       收集该 turn 的 assistant 文本，turn/end 时用 send_group_msg 回发；
 *       连接不可用 / 发送失败时进本地发送队列，重连（client 'open'）后按序补发。
 *
 * 只回「由 QQ 触发」的轮次：pending 必须能匹配 turn，GUI 里发起的轮次自然被忽略。
 */

import { formatSessionTitle } from '../model/config.js'
import { buildReplyChunks, classifySendFailure, nextBackoff, shouldRetryTransport, SEND_QUEUE_MAX, SEND_QUEUE_MAX_AGE_MS } from '../model/reply.js'
import { formatBatchPrompt } from '../model/gate.js'
import { bypassReason, toChatLogRecord, toInternalEvent } from './onebot/codec.js'
import { isOk } from './onebot/api.js'
import { createGate } from './gate.js'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function extractAssistantText(message) {
  const content = message?.content
  if (!Array.isArray(content)) return ''
  const parts = []
  for (const block of content) {
    if (block !== null && typeof block === 'object' && block.type === 'text' && typeof block.text === 'string') {
      parts.push(block.text)
    }
  }
  return parts.join('').trim()
}

function formatPromptText(event) {
  const name = event.sender.card !== '' ? event.sender.card : event.sender.nickname
  const prefix = name !== '' ? '[' + name + '] ' : ''
  return prefix + event.text.trim()
}

export function createRelay({ ctx, config, logger, client, api, mapping, state, chatLog, classifier = null, gateLog = null, interceptors = [], now = () => Date.now() }) {
  const log = {
    info: (message) => { try { logger?.info?.(message) } catch {} },
    warn: (message) => { try { logger?.warn?.(message) } catch {} },
    error: (message) => { try { logger?.error?.(message) } catch {} },
  }

  const sessionByGroup = new Map()
  const pendingBySession = new Map()
  const queueByGroup = new Map()
  const dispatching = new Set()
  const sendQueue = []
  let flushing = false
  let workspacePromise = null
  let started = false
  let stopped = false
  const disposers = []
  const abort = new AbortController()

  const gate = createGate({
    config: config.gate,
    groups: config.groups,
    state,
    logger,
    classifier,
    gateLog,
    chatLog,
    now,
    dispatch: dispatchBatch,
  })

  function sessionIdOf(session) {
    return String(session?.header?.id ?? session?.id ?? '')
  }

  function getWorkspace() {
    if (workspacePromise === null) {
      workspacePromise = ctx.workspaceRegistry.create(config.workspace).catch((error) => {
        workspacePromise = null
        throw error
      })
    }
    return workspacePromise
  }

  async function ensureSession(groupId, groupName) {
    const key = String(groupId)
    const cached = sessionByGroup.get(key)
    if (cached !== undefined) return cached

    const existing = mapping.get(groupId)
    if (existing !== undefined) {
      sessionByGroup.set(key, existing.sessionId)
      return existing.sessionId
    }

    const workspace = await getWorkspace()
    const created = await ctx.sessionController.create({ cwd: config.workspace })
    const sessionId = String(created.sessionId)

    try {
      await workspace.attachSession(sessionId)
    } catch (error) {
      log.warn('[relay] attachSession 失败（会话可能不在侧栏显示）：' + String(error?.message ?? error))
    }
    const title = formatSessionTitle(config.sessionTitle, { groupId, groupName })
    try {
      await ctx.sessionController.rename({ sessionId, title })
    } catch (error) {
      log.warn('[relay] 会话重命名失败：' + String(error?.message ?? error))
    }

    mapping.set(groupId, { sessionId, workspacePath: config.workspace, title })
    sessionByGroup.set(key, sessionId)
    log.info('[relay] 已为群 ' + key + ' 创建会话 ' + sessionId)
    return sessionId
  }

  function nextRequestId(groupId) {
    return 'qq-relay-' + String(groupId) + '-' + String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8)
  }

  async function promptGroup(groupId, event, attempt = 0) {
    const sessionId = await ensureSession(groupId, event.groupName)
    const requestId = nextRequestId(groupId)
    const pending = { requestId, groupId: Number(groupId), turn: null, texts: new Map() }
    pendingBySession.set(sessionId, pending)

    try {
      const response = await ctx.sessionController.prompt({
        requestId,
        sessionId,
        mode: 'queue',
        content: [{ type: 'text', text: formatPromptText(event) }],
      }, abort.signal)
      if (response?.accepted !== true) log.warn('[relay] prompt 未被接受：' + JSON.stringify(response))
      return pending
    } catch (error) {
      pendingBySession.delete(sessionId)
      const message = String(error?.message ?? error)
      if (attempt === 0 && /not found|not-found/i.test(message)) {
        log.warn('[relay] 会话 ' + sessionId + ' 已失效，重建映射后重试')
        mapping.remove(groupId)
        sessionByGroup.delete(String(groupId))
        await promptGroup(groupId, event, attempt + 1)
        return null
      }
      log.error('[relay] prompt 失败：' + message)
      state.update(groupId, { dshBusy: false })
      return null
    }
  }

  function drainQueue(groupId) {
    const key = String(groupId)
    const queue = queueByGroup.get(key)
    if (queue === undefined || queue.length === 0) {
      queueByGroup.delete(key)
      return
    }
    const next = queue.shift()
    if (queue.length === 0) queueByGroup.delete(key)
    void startPrompt(next.groupId, next.event)
  }

  function enqueue(groupId, event) {
    const key = String(groupId)
    const queue = queueByGroup.get(key) ?? []
    if (queue.length >= 5) {
      log.warn('[relay] 群 ' + key + ' 待处理消息过多，丢弃最旧的一条')
      queue.shift()
    }
    queue.push({ groupId, event })
    queueByGroup.set(key, queue)
  }

  async function startPrompt(groupId, event) {
    if (stopped) return
    const key = String(groupId)
    if (dispatching.has(key)) {
      enqueue(groupId, event)
      return
    }
    dispatching.add(key)
    try {
      const sessionId = await ensureSession(groupId, event.groupName)
      if (pendingBySession.has(sessionId)) {
        enqueue(groupId, event)
        return
      }
      await promptGroup(groupId, event)
    } catch (error) {
      log.error('[relay] 派发失败（群 ' + key + '）：' + String(error?.message ?? error))
      state.update(groupId, { dshBusy: false })
    } finally {
      dispatching.delete(key)
    }
  }

  /** 闸门判定接话后：把批次拼成一条 prompt 交给会话。 */
  async function dispatchBatch(messages, decision, { groupId, groupName }) {
    const text = formatBatchPrompt(messages)
    if (text === '') return
    log.info('[gate] 接话 group=' + String(groupId) + ' batch=' + String(messages.length) + ' reason=' + String(decision.reason))
    state.update(groupId, { dshBusy: true })
    await startPrompt(groupId, {
      kind: 'group-message',
      groupId: Number(groupId),
      groupName: typeof groupName === 'string' ? groupName : '',
      messageId: messages[messages.length - 1]?.messageId ?? '',
      sender: { userId: 0, nickname: '', card: '', role: '' },
      text,
      timeMs: now(),
    })
  }

  function isConnected() {
    return typeof client.isOpen !== 'function' || client.isOpen() === true
  }

  /** 发一条（内部：传输重试 + 风控退避）；返回 `{ ok, messageId }`。 */
  async function sendChunk(groupId, chunk) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (!isConnected()) return { ok: false }
      try {
        const response = await api.sendGroupText(groupId, chunk)
        if (isOk(response)) return { ok: true, messageId: String(response?.data?.message_id ?? '') }
        const failure = classifySendFailure(response)
        if (failure.kind === 'frequency' && attempt < 2) {
          log.warn('[relay] 发送被限流（' + failure.message + '），退避后重试')
          await sleep(nextBackoff(attempt + 1, config.reconnect))
          continue
        }
        log.warn('[relay] 发送失败：' + failure.message)
        return { ok: false }
      } catch (error) {
        log.warn('[relay] 发送异常（attempt ' + String(attempt) + '）：' + String(error?.message ?? error))
        if (!shouldRetryTransport(attempt)) return { ok: false }
        await sleep(nextBackoff(attempt, config.reconnect))
      }
    }
    return { ok: false }
  }

  /** 发送成功后的状态刷新：发言窗口、最小间隔、冷却、闸门 pending，并把发言写进聊天日志。 */
  function markSpoken(groupId, messageId, text) {
    const at = now()
    state.update(groupId, {
      lastBotSpeakAt: at,
      lastReplyAt: at,
      cooldownUntil: at + config.gate.slowTimer,
      lastBotMessageId: String(messageId ?? ''),
    })
    // bot 自己的发言也进聊天日志：jev 分类器需要「我刚才说过什么」的上下文。
    if (typeof text === 'string' && text.trim() !== '') {
      try {
        chatLog.append(groupId, {
          time: at,
          messageId: String(messageId ?? ''),
          userId: String(config.selfId),
          nickname: 'bot',
          role: 'bot',
          text,
          raw: '',
        })
      } catch (error) {
        log.warn('[relay] 机器人发言写入聊天日志失败：' + String(error?.message ?? error))
      }
    }
    gate.noteBotSpoke(groupId)
  }

  function enqueueSend(groupId, text) {
    if (sendQueue.length >= SEND_QUEUE_MAX) {
      const dropped = sendQueue.shift()
      log.warn('[relay] 发送队列已满，丢弃最旧一条（群 ' + String(dropped?.groupId) + '）')
    }
    sendQueue.push({ groupId, text, at: now() })
    log.info('[relay] 连接不可用，回复进入发送队列（' + String(sendQueue.length) + ' 条待发）')
  }

  /** 连接恢复后按序补发队列；失败即停，等下次 open 或下一次发送再试。 */
  async function flushQueue() {
    if (flushing || stopped) return
    flushing = true
    try {
      while (sendQueue.length > 0) {
        const item = sendQueue[0]
        if (now() - item.at > SEND_QUEUE_MAX_AGE_MS) {
          sendQueue.shift()
          log.warn('[relay] 丢弃过期回复（群 ' + String(item.groupId) + '，超过 ' + String(SEND_QUEUE_MAX_AGE_MS / 1000) + 's）')
          continue
        }
        const result = await sendChunk(item.groupId, item.text)
        if (!result.ok) return
        sendQueue.shift()
        markSpoken(item.groupId, result.messageId, item.text)
      }
    } finally {
      flushing = false
    }
  }

  async function sendReply(groupId, text) {
    const chunks = buildReplyChunks(text, config.replyChunkSize)
    for (const chunk of chunks) {
      const result = await sendChunk(groupId, chunk)
      if (!result.ok) {
        enqueueSend(groupId, chunk)
        return
      }
      markSpoken(groupId, result.messageId, chunk)
    }
  }

  /**
   * DSH → QQ 主动推送（qq_send 工具用）：白名单校验 + 切分发送。
   * 连接不可用时整段入发送队列（重连后补发），返回 `queued: true`。
   *
   * @param groupId - 群号（必须在白名单内）
   * @param text - 纯文本
   * @returns `{ groupId, chunks, queued, messageIds }`
   */
  async function sendText(groupId, text) {
    if (stopped) throw new Error('relay 已停止')
    const target = Number(groupId)
    if (!Number.isInteger(target) || target <= 0) throw new Error('groupId 必须是正整数')
    if (!config.groups.includes(target)) {
      throw new Error('群 ' + String(target) + ' 不在白名单（允许：' + (config.groups.join(', ') || '无') + '）')
    }
    const chunks = buildReplyChunks(text, config.replyChunkSize)
    if (chunks.length === 0) throw new Error('消息文本为空')
    const messageIds = []
    for (let index = 0; index < chunks.length; index += 1) {
      const result = await sendChunk(target, chunks[index])
      if (!result.ok) {
        for (let rest = index; rest < chunks.length; rest += 1) enqueueSend(target, chunks[rest])
        return { groupId: target, chunks: chunks.length, queued: true, messageIds }
      }
      messageIds.push(result.messageId)
      markSpoken(target, result.messageId, chunks[index])
    }
    return { groupId: target, chunks: chunks.length, queued: false, messageIds }
  }

  async function finishPending(sessionId, pending, reason) {
    pendingBySession.delete(sessionId)
    const text = pending.texts.get(pending.turn)
    if (typeof text === 'string' && text !== '') {
      await sendReply(pending.groupId, text)
    } else {
      log.info('[relay] 群 ' + pending.groupId + ' 本轮无文本输出（reason=' + String(reason?.kind ?? reason?.type ?? 'unknown') + '）')
    }
    state.update(pending.groupId, { dshBusy: false })
    drainQueue(pending.groupId)
  }

  function onSessionEvent(session, event) {
    const sessionId = sessionIdOf(session)
    const pending = pendingBySession.get(sessionId)
    if (pending === undefined) return
    if (event?.type === 'assistant/message') {
      const turn = event.data?.turn
      if (pending.turn !== null && turn !== pending.turn) return
      const text = extractAssistantText(event.data?.message)
      if (text !== '') pending.texts.set(turn, text)
      return
    }
    if (event?.type === 'turn/end') {
      const turn = event.data?.turn
      if (pending.turn !== null && turn !== pending.turn) return
      void finishPending(sessionId, pending, event.data?.reason)
    }
  }

  function onInboxClaimed({ agent, message, turn }) {
    const sessionId = String(agent?.session?.id ?? agent?.id ?? '')
    const pending = pendingBySession.get(sessionId)
    if (pending === undefined) return
    if (String(message?.source?.rpcId ?? '') !== pending.requestId) return
    pending.turn = Number(turn)
  }

  function handleRawEvent(raw) {
    if (stopped) return
    const event = toInternalEvent(raw)
    if (event === null) return

    if (event.kind === 'group-message') {
      if (!config.groups.includes(event.groupId)) return
      if (event.userId === config.selfId) return
      if (!state.markSeen(event.groupId, event.messageId)) return
      try {
        chatLog.append(event.groupId, toChatLogRecord(event))
      } catch (error) {
        log.warn('[relay] 聊天日志写入失败：' + String(error?.message ?? error))
      }
      // 审批桥等入向拦截器优先消费（例如审批等待期间的「同意 / 拒绝」）。
      for (const intercept of interceptors) {
        try {
          if (intercept(event) === true) return
        } catch (error) {
          log.warn('[relay] 入向拦截器异常（已忽略）：' + String(error?.message ?? error))
        }
      }
      const bypass = bypassReason(event, { commandPrefixes: config.commandPrefixes })
      if (bypass.bypass && config.gate.mentionBypass !== false) {
        log.info('[relay] 直通（' + String(bypass.reason) + '）：群 ' + String(event.groupId) + ' 消息 ' + String(event.messageId))
        void startPrompt(event.groupId, event)
        return
      }
      gate.ingest(event)
    }
  }

  function start() {
    if (started) return
    started = true
    gate.start()
    disposers.push(client.on('event', handleRawEvent))
    disposers.push(client.on('open', () => { void flushQueue() }))
    disposers.push(ctx.on('session/event', onSessionEvent))
    disposers.push(ctx.on('agent/inbox/claimed', onInboxClaimed))
  }

  function stop() {
    stopped = true
    abort.abort()
    try { gate.stop() } catch {}
    for (const dispose of disposers.splice(0)) {
      try { dispose() } catch {}
    }
    sessionByGroup.clear()
    pendingBySession.clear()
    queueByGroup.clear()
    sendQueue.length = 0
  }

  return { start, stop, handleRawEvent, sendText }
}
