/**
 * QQ ↔ DSH 消息转发（P1：@ / 引用 / 命令直通；普通消息本阶段只落盘不回复）。
 *
 * 入向：OneBot 原始事件 → codec 规范化 → 白名单 / 去重 / 聊天日志 → 直通判定
 *       → 确保每个群一个 DSH 会话（自动创建 + workspace attach + 重命名）
 *       → sessionController.prompt（requestId 关联本轮）。
 * 出向：监听 session/event，用 agent/inbox/claimed 把 requestId 关联到 turn，
 *       收集该 turn 的 assistant 文本，turn/end 时用 send_group_msg 回发。
 *
 * 只回「由 QQ 触发」的轮次：pending 必须能匹配 turn，GUI 里发起的轮次自然被忽略。
 */

import { formatSessionTitle } from '../model/config.js'
import { buildReplyChunks, nextBackoff, shouldRetryTransport } from '../model/reply.js'
import { bypassReason, toChatLogRecord, toInternalEvent } from './onebot/codec.js'
import { failureText, isOk } from './onebot/api.js'

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

export function createRelay({ ctx, config, logger, client, api, mapping, state, chatLog }) {
  const log = {
    info: (message) => { try { logger?.info?.(message) } catch {} },
    warn: (message) => { try { logger?.warn?.(message) } catch {} },
    error: (message) => { try { logger?.error?.(message) } catch {} },
  }

  const sessionByGroup = new Map()
  const pendingBySession = new Map()
  const queueBySession = new Map()
  const dispatching = new Set()
  let workspacePromise = null
  let started = false
  let stopped = false
  const disposers = []
  const abort = new AbortController()

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
      return null
    }
  }

  function drainQueue(sessionId) {
    const queue = queueBySession.get(sessionId)
    if (queue === undefined || queue.length === 0) {
      queueBySession.delete(sessionId)
      return
    }
    const next = queue.shift()
    if (queue.length === 0) queueBySession.delete(sessionId)
    void startPrompt(next.groupId, next.event)
  }

  function enqueue(groupId, event) {
    const key = String(groupId)
    const queue = queueBySession.get(key) ?? []
    if (queue.length >= 5) {
      log.warn('[relay] 群 ' + key + ' 待处理消息过多，丢弃最旧的一条')
      queue.shift()
    }
    queue.push({ groupId, event })
    queueBySession.set(key, queue)
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
    } finally {
      dispatching.delete(key)
    }
  }

  async function sendReply(groupId, text) {
    const chunks = buildReplyChunks(text, config.replyChunkSize)
    if (chunks.length === 0) return
    for (const chunk of chunks) {
      let sent = null
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const response = await api.sendGroupText(groupId, chunk)
          if (isOk(response)) {
            sent = response
            break
          }
          log.warn('[relay] 发送失败：' + failureText(response))
          break
        } catch (error) {
          log.warn('[relay] 发送异常（attempt ' + String(attempt) + '）：' + String(error?.message ?? error))
          if (!shouldRetryTransport(attempt)) break
          await sleep(nextBackoff(attempt, config.reconnect))
        }
      }
      if (sent === null) return
      state.update(groupId, { lastBotSpeakAt: Date.now(), lastBotMessageId: String(sent?.data?.message_id ?? '') })
    }
  }

  async function finishPending(sessionId, pending, reason) {
    pendingBySession.delete(sessionId)
    const text = pending.texts.get(pending.turn)
    if (typeof text === 'string' && text !== '') {
      await sendReply(pending.groupId, text)
    } else {
      log.info('[relay] 群 ' + pending.groupId + ' 本轮无文本输出（reason=' + String(reason?.kind ?? reason?.type ?? 'unknown') + '）')
    }
    drainQueue(sessionId)
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
      const bypass = bypassReason(event, { commandPrefixes: config.commandPrefixes })
      if (!bypass.bypass) return
      log.info('[relay] 直通（' + String(bypass.reason) + '）：群 ' + String(event.groupId) + ' 消息 ' + String(event.messageId))
      void startPrompt(event.groupId, event)
    }
  }

  function start() {
    if (started) return
    started = true
    disposers.push(client.on('event', handleRawEvent))
    disposers.push(ctx.on('session/event', onSessionEvent))
    disposers.push(ctx.on('agent/inbox/claimed', onInboxClaimed))
  }

  function stop() {
    stopped = true
    abort.abort()
    for (const dispose of disposers.splice(0)) {
      try { dispose() } catch {}
    }
    sessionByGroup.clear()
    pendingBySession.clear()
    queueBySession.clear()
  }

  return { start, stop, handleRawEvent }
}
