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

import { readFile, stat } from 'node:fs/promises'
import { basename, isAbsolute } from 'node:path'

import { formatSessionTitle } from '../model/config.js'
import { ACK_TEXT, buildReplyChunks, classifySendFailure, nextBackoff, shouldRetryTransport, SEND_QUEUE_MAX, SEND_QUEUE_MAX_AGE_MS } from '../model/reply.js'
import { projectDirFor } from '../model/project.js'
import { formatIncomingPrompt } from '../model/prompt.js'
import { OUTBOUND_FILE_MAX_BYTES, OUTBOUND_IMAGE_MAX_BYTES, attachMedia, isImageExt, planMedia, sniffMediaExt } from '../model/media.js'
import { bypassReason, toChatLogRecord, toInternalEvent } from './onebot/codec.js'
import { failureText, isOk } from './onebot/api.js'
import { createGate } from './gate.js'
import { canRunCommand, formatCommandHelp, formatNewSessionTitle, formatStatusReply, parseCommand } from '../model/commands.js'

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

/** 把 OneBot 内部事件转成 prompt 拼接需要的消息形状。 */
function toPromptMessage(event, nowMs) {
  const card = typeof event.sender?.card === 'string' ? event.sender.card : ''
  const nickname = typeof event.sender?.nickname === 'string' ? event.sender.nickname : ''
  return {
    messageId: String(event.messageId ?? ''),
    userId: String(event.userId ?? ''),
    nickname: nickname !== '' ? nickname : card,
    card,
    text: typeof event.text === 'string' ? event.text : '',
    time: Number.isFinite(event.timeMs) && event.timeMs > 0 ? event.timeMs : nowMs,
    mentionsSelf: event.mentionsSelf === true,
    replyToId: typeof event.replyToId === 'string' ? event.replyToId : '',
    media: Array.isArray(event.media) ? event.media : [],
  }
}

export function createRelay({ ctx, config, logger, client, api, mapping, state, chatLog, classifier = null, gateLog = null, interceptors = [], now = () => Date.now(), fetchImpl = null }) {
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
  const bypassBuffers = new Map()
  let flushing = false
  let started = false
  let stopped = false
  const disposers = []
  const abort = new AbortController()
  const downloadFetch = typeof fetchImpl === 'function' ? fetchImpl : globalThis.fetch

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

  /** 每个群项目一个 workspace（同项目复用同一个 promise）。 */
  const workspacePromises = new Map()
  function getWorkspace(projectDir) {
    let promise = workspacePromises.get(projectDir)
    if (promise === undefined) {
      promise = ctx.workspaceRegistry.create(projectDir).catch((error) => {
        workspacePromises.delete(projectDir)
        throw error
      })
      workspacePromises.set(projectDir, promise)
    }
    return promise
  }

  /** 在群项目目录里新建一个会话并写进映射（/new 与首次建会话共用）。 */
  async function createSessionForGroup(groupId, groupName, { title } = {}) {
    const key = String(groupId)
    const projectDir = projectDirFor({ config, mapping, groupId })
    const workspace = await getWorkspace(projectDir)
    const created = await ctx.sessionController.create({ cwd: projectDir })
    const sessionId = String(created.sessionId)

    try {
      await workspace.attachSession(sessionId)
    } catch (error) {
      log.warn('[relay] attachSession 失败（会话可能不在侧栏显示）：' + String(error?.message ?? error))
    }
    const finalTitle = typeof title === 'string' && title.trim() !== ''
      ? title.trim()
      : formatSessionTitle(config.sessionTitle, { groupId, groupName })
    try {
      await ctx.sessionController.rename({ sessionId, title: finalTitle })
    } catch (error) {
      log.warn('[relay] 会话重命名失败：' + String(error?.message ?? error))
    }

    mapping.set(groupId, { sessionId, workspacePath: projectDir, title: finalTitle })
    sessionByGroup.set(key, sessionId)
    log.info('[relay] 已为群 ' + key + ' 创建会话 ' + sessionId)
    return { sessionId, projectDir, title: finalTitle }
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

    const created = await createSessionForGroup(groupId, groupName)
    return created.sessionId
  }

  function nextRequestId(groupId) {
    return 'qq-relay-' + String(groupId) + '-' + String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8)
  }

  function clearAckTimer(pending) {
    if (pending === null || typeof pending !== 'object') return
    if (pending.ackTimer !== null) {
      clearTimeout(pending.ackTimer)
      pending.ackTimer = null
    }
  }

  /**
   * 轮次跑得久时先回一句「处理中」，避免群里长时间静默（v0.11.1）。
   * 占位不算「接话」：走 sendSystemReply，不刷新闸门窗口 / 冷却。
   */
  function armAck(pending) {
    const delay = Number(config.reply?.ackDelayMs) || 0
    if (delay <= 0 || stopped) return
    pending.ackTimer = setTimeout(() => {
      pending.ackTimer = null
      if (stopped || pendingBySession.get(String(pending.sessionId)) !== pending) return
      pending.ackSent = true
      log.info('[relay] 处理中占位（群 ' + String(pending.groupId) + '）')
      void sendSystemReply(pending.groupId, ACK_TEXT)
    }, delay)
  }

  async function promptGroup(groupId, prompt, attempt = 0) {
    const sessionId = await ensureSession(groupId, prompt.groupName)
    const requestId = nextRequestId(groupId)
    const pending = {
      requestId,
      groupId: Number(groupId),
      sessionId,
      turn: null,
      texts: new Map(),
      replyTo: typeof prompt.replyTo === 'string' ? prompt.replyTo : '',
      ackTimer: null,
      ackSent: false,
    }
    pendingBySession.set(sessionId, pending)

    try {
      const response = await ctx.sessionController.prompt({
        requestId,
        sessionId,
        mode: 'queue',
        content: [{ type: 'text', text: prompt.text }],
      }, abort.signal)
      if (response?.accepted !== true) {
        log.warn('[relay] prompt 未被接受：' + JSON.stringify(response))
      } else {
        armAck(pending)
      }
      return pending
    } catch (error) {
      clearAckTimer(pending)
      pendingBySession.delete(sessionId)
      const message = String(error?.message ?? error)
      if (attempt === 0 && /not found|not-found/i.test(message)) {
        log.warn('[relay] 会话 ' + sessionId + ' 已失效，重建映射后重试')
        mapping.remove(groupId)
        sessionByGroup.delete(String(groupId))
        await promptGroup(groupId, prompt, attempt + 1)
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
    void startPrompt(next.groupId, next.prompt)
  }

  function enqueue(groupId, prompt) {
    const key = String(groupId)
    const queue = queueByGroup.get(key) ?? []
    if (queue.length >= 5) {
      log.warn('[relay] 群 ' + key + ' 待处理消息过多，丢弃最旧的一条')
      queue.shift()
    }
    queue.push({ groupId, prompt })
    queueByGroup.set(key, queue)
  }

  async function startPrompt(groupId, prompt) {
    if (stopped) return
    const key = String(groupId)
    if (dispatching.has(key)) {
      enqueue(groupId, prompt)
      return
    }
    dispatching.add(key)
    try {
      const sessionId = await ensureSession(groupId, prompt.groupName)
      if (pendingBySession.has(sessionId)) {
        enqueue(groupId, prompt)
        return
      }
      await promptGroup(groupId, prompt)
    } catch (error) {
      log.error('[relay] 派发失败（群 ' + key + '）：' + String(error?.message ?? error))
      state.update(groupId, { dshBusy: false })
    } finally {
      dispatching.delete(key)
    }
  }

  /** 闸门判定接话后：把批次拼成一条 prompt 交给会话。 */
  async function dispatchBatch(messages, decision, { groupId, groupName }) {
    const text = formatIncomingPrompt({ groupId, groupName, messages, now: now() })
    if (text === '') return
    log.info('[gate] 接话 group=' + String(groupId) + ' batch=' + String(messages.length) + ' reason=' + String(decision.reason))
    state.update(groupId, { dshBusy: true })
    const last = messages[messages.length - 1]
    const replyTo = last !== null && typeof last === 'object' ? String(last.messageId ?? '') : ''
    await startPrompt(groupId, { groupName: typeof groupName === 'string' ? groupName : '', text, replyTo })
  }

  function isConnected() {
    return typeof client.isOpen !== 'function' || client.isOpen() === true
  }

  /** 发一条（内部：传输重试 + 风控退避）；quote 非空时带引用段。返回 `{ ok, messageId, transport }`。 */
  async function sendChunkOnce(groupId, chunk, quote = '') {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (!isConnected()) return { ok: false, transport: true }
      try {
        const response = quote !== '' && typeof api.sendGroupReply === 'function'
          ? await api.sendGroupReply(groupId, quote, chunk)
          : await api.sendGroupText(groupId, chunk)
        if (isOk(response)) return { ok: true, messageId: String(response?.data?.message_id ?? '') }
        const failure = classifySendFailure(response)
        if (failure.kind === 'frequency' && attempt < 2) {
          log.warn('[relay] 发送被限流（' + failure.message + '），退避后重试')
          await sleep(nextBackoff(attempt + 1, config.reconnect))
          continue
        }
        log.warn('[relay] 发送失败：' + failure.message)
        return { ok: false, transport: false }
      } catch (error) {
        log.warn('[relay] 发送异常（attempt ' + String(attempt) + '）：' + String(error?.message ?? error))
        if (!shouldRetryTransport(attempt)) return { ok: false, transport: true }
        await sleep(nextBackoff(attempt, config.reconnect))
      }
    }
    return { ok: false, transport: true }
  }

  /** 引用发送失败（原消息被撤回 / 引用不被接受）时退回普通发送一次，不让整条回复丢掉。 */
  async function sendChunk(groupId, chunk, quote = '') {
    const result = await sendChunkOnce(groupId, chunk, quote)
    if (result.ok || quote === '' || result.transport === true) return result
    log.warn('[relay] 引用回复失败，改普通发送（群 ' + String(groupId) + '）')
    return await sendChunkOnce(groupId, chunk, '')
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

  /** 回发一轮结果；replyTo 非空时首条引用触发的群消息。 */
  async function sendReply(groupId, text, replyTo = '') {
    const chunks = buildReplyChunks(text, config.replyChunkSize)
    const quote = config.reply?.quote === false ? '' : (typeof replyTo === 'string' ? replyTo : '')
    for (let index = 0; index < chunks.length; index += 1) {
      const result = await sendChunk(groupId, chunks[index], index === 0 ? quote : '')
      if (!result.ok) {
        enqueueSend(groupId, chunks[index])
        return
      }
      markSpoken(groupId, result.messageId, chunks[index])
    }
  }

  /**
   * 命令回复：切分发出去，但**不**调 markSpoken。
   * 命令输出不算「接话」——不能刷新闸门的发言窗口 / 冷却，否则一条 /status 会让 bot 两小时不说话。
   */
  async function sendSystemReply(groupId, text) {
    const chunks = buildReplyChunks(text, config.replyChunkSize)
    for (const chunk of chunks) {
      const result = await sendChunk(groupId, chunk)
      if (!result.ok) {
        enqueueSend(groupId, chunk)
        return
      }
    }
  }

  function currentSessionId(groupId) {
    const cached = sessionByGroup.get(String(groupId))
    if (cached !== undefined) return String(cached)
    const existing = mapping.get(groupId)
    return existing === undefined ? '' : String(existing.sessionId)
  }

  function queueDepth() {
    let total = 0
    for (const queue of queueByGroup.values()) total += queue.length
    return total
  }

  /** 状态面板只读快照（v0.14.0）：待评估消息 / 批数、活动定时器、待派发与待发送队列。 */
  function snapshot() {
    let gateState = { pendingMessages: 0, pendingGroups: 0, timers: 0 }
    try { gateState = gate.snapshot() } catch {}
    return {
      pendingMessages: gateState.pendingMessages,
      pendingGroups: gateState.pendingGroups,
      timers: gateState.timers,
      queue: queueDepth(),
      sendQueue: sendQueue.length,
    }
  }

  async function runNewCommand(event, command, groupName) {
    const groupId = Number(event.groupId)
    const previousSessionId = currentSessionId(groupId)
    if (previousSessionId !== '' && pendingBySession.has(previousSessionId)) {
      await sendSystemReply(groupId, '当前还有一轮在跑：先 /stop 中断，或等它结束再 /new。')
      return
    }
    const baseTitle = formatSessionTitle(config.sessionTitle, { groupId, groupName })
    const title = formatNewSessionTitle(baseTitle, { args: command.args, now: now() })
    log.info('[relay] 命令 /new：群 ' + String(groupId) + ' 新建会话（' + title + '）')
    const created = await createSessionForGroup(groupId, groupName, { title })
    const lines = ['已新建会话：' + created.title, '会话 ID：' + created.sessionId]
    if (previousSessionId !== '') lines.push('旧会话仍在 GUI 里：' + previousSessionId)
    await sendSystemReply(groupId, lines.join('\n'))
  }

  async function runStopCommand(event) {
    const groupId = Number(event.groupId)
    const sessionId = currentSessionId(groupId)
    if (sessionId === '') {
      await sendSystemReply(groupId, '本群还没有会话。')
      return
    }
    if (!pendingBySession.has(sessionId)) {
      await sendSystemReply(groupId, '当前没有进行中的轮次。')
      return
    }
    const result = await ctx.sessionController.cancel({ sessionId })
    if (result?.accepted === true) {
      log.info('[relay] 命令 /stop：已请求中断 ' + sessionId)
      await sendSystemReply(groupId, '已请求中断当前轮次。')
    } else {
      await sendSystemReply(groupId, '中断请求未被接受。')
    }
  }

  async function runStatusCommand(event, groupName) {
    const groupId = Number(event.groupId)
    const existing = mapping.get(groupId)
    const stored = state.get(groupId)
    const pending = gate.snapshot()
    const text = formatStatusReply({
      groupId,
      groupName,
      sessionTitle: existing?.title ?? '',
      sessionId: currentSessionId(groupId),
      projectDir: existing?.workspacePath ?? projectDirFor({ config, mapping, groupId }),
      gate: {
        enabled: config.gate.enabled === true,
        jevThreshold: config.gate.jevThreshold,
        debounceMs: config.gate.debounce,
        fastMinReplyIntervalMs: config.gate.fastMinReplyInterval,
      },
      pendingMessages: pending.pendingMessages,
      pendingGroups: pending.pendingGroups,
      lastReplyAt: Number(stored.lastReplyAt) || 0,
      dshBusy: stored.dshBusy === true,
      queue: queueDepth(),
      sendQueue: sendQueue.length,
      now: now(),
    })
    await sendSystemReply(groupId, text)
  }

  async function handleCommand(event, command) {
    const groupId = Number(event.groupId)
    const groupName = typeof event.groupName === 'string' ? event.groupName : ''
    try {
      if (command.name === 'new') return await runNewCommand(event, command, groupName)
      if (command.name === 'stop') return await runStopCommand(event)
      if (command.name === 'status') return await runStatusCommand(event, groupName)
      return await sendSystemReply(groupId, formatCommandHelp({ prefixes: config.commandPrefixes }))
    } catch (error) {
      log.error('[relay] 命令 ' + String(command.name) + ' 执行失败：' + String(error?.message ?? error))
      await sendSystemReply(groupId, '命令执行失败：' + String(error?.message ?? error))
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
    const target = requireGroup(groupId)
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

  /** 出向目标的统一校验：正整数 + 白名单。 */
  function requireGroup(groupId) {
    const target = Number(groupId)
    if (!Number.isInteger(target) || target <= 0) throw new Error('groupId 必须是正整数')
    if (!config.groups.includes(target)) {
      throw new Error('群 ' + String(target) + ' 不在白名单（允许：' + (config.groups.join(', ') || '无') + '）')
    }
    return target
  }

  /** 读本地媒体文件（出向用）；宿主路径必须绝对、存在、大小在上限内。 */
  async function readOutboundFile(filePath, maxBytes, label) {
    const value = typeof filePath === 'string' ? filePath.trim() : ''
    if (value === '') throw new Error(label + '路径为空')
    if (!isAbsolute(value)) throw new Error(label + '必须是绝对路径：' + value)
    let info
    try {
      info = await stat(value)
    } catch {
      throw new Error(label + '不存在：' + value)
    }
    if (info.isFile() !== true) throw new Error(label + '不是普通文件：' + value)
    if (info.size === 0) throw new Error(label + '是空文件：' + value)
    if (info.size > maxBytes) {
      throw new Error(label + '过大（' + String(info.size) + ' 字节，上限 ' + String(maxBytes) + ' 字节）')
    }
    return await readFile(value)
  }

  /**
   * 发群图片（qq_send 用）：本地绝对路径按 magic bytes 校验后转 base64；
   * http(s) URL 交给 NapCat 下载。离线不支持排队（返回错误）。
   *
   * @returns `{ groupId, chunks, queued, messageIds }`
   */
  async function sendImage(groupId, source) {
    if (stopped) throw new Error('relay 已停止')
    const target = requireGroup(groupId)
    const value = typeof source === 'string' ? source.trim() : ''
    if (value === '') throw new Error('图片路径或 URL 为空')
    if (!isConnected()) throw new Error('relay 当前离线，图片发送失败（出向媒体不支持离线排队）')
    let file
    if (/^https?:\/\//i.test(value)) {
      file = value
    } else {
      const buffer = await readOutboundFile(value, OUTBOUND_IMAGE_MAX_BYTES, '图片')
      const ext = sniffMediaExt(buffer)
      if (!isImageExt(ext)) throw new Error('不是支持的图片格式（JPEG / PNG / GIF / WEBP / BMP）')
      file = 'base64://' + buffer.toString('base64')
    }
    let response
    try {
      response = await api.sendGroupImage(target, file)
    } catch (error) {
      throw new Error('图片发送失败：' + String(error?.message ?? error))
    }
    if (!isOk(response)) throw new Error('图片发送失败：' + failureText(response))
    const messageId = String(response?.data?.message_id ?? '')
    if (messageId !== '') markSpoken(target, messageId, '')
    return { groupId: target, chunks: 1, queued: false, messageIds: messageId === '' ? [] : [messageId] }
  }

  /**
   * 上传群文件（qq_send 用）：本地绝对路径读成 base64，交给 NapCat 解码上传。
   * NapCat 在 Docker 里看不到宿主路径，所以不能直接传路径。
   *
   * @returns `{ groupId, fileName, fileId }`
   */
  async function sendFile(groupId, filePath, name = '') {
    if (stopped) throw new Error('relay 已停止')
    const target = requireGroup(groupId)
    if (!isConnected()) throw new Error('relay 当前离线，文件上传失败（出向媒体不支持离线排队）')
    const buffer = await readOutboundFile(filePath, OUTBOUND_FILE_MAX_BYTES, '文件')
    const fileName = typeof name === 'string' && name.trim() !== ''
      ? name.trim().slice(0, 120)
      : basename(String(filePath).trim())
    let response
    try {
      response = await api.uploadGroupFile(target, 'base64://' + buffer.toString('base64'), fileName)
    } catch (error) {
      throw new Error('文件上传失败：' + String(error?.message ?? error))
    }
    if (!isOk(response)) throw new Error('文件上传失败：' + failureText(response))
    return { groupId: target, fileName, fileId: String(response?.data?.file_id ?? '') }
  }

  async function finishPending(sessionId, pending, reason) {
    clearAckTimer(pending)
    pendingBySession.delete(sessionId)
    const text = pending.texts.get(pending.turn)
    if (typeof text === 'string' && text !== '') {
      await sendReply(pending.groupId, text, pending.replyTo)
    } else if (pending.ackSent === true) {
      // 已经回过「处理中」：补一句收尾，避免群里以为还在跑。
      await sendSystemReply(pending.groupId, '处理完了，但这一轮没有可发送的文本。')
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

  function appendChatLog(event) {
    try {
      chatLog.append(event.groupId, { ...toChatLogRecord(event), media: event.media })
    } catch (error) {
      log.warn('[relay] 聊天日志写入失败：' + String(error?.message ?? error))
    }
  }

  function bypassReasonOf(reasons) {
    if (reasons.includes('mention')) return 'mention'
    if (reasons.includes('reply')) return 'reply'
    return 'command'
  }

  /**
   * 直通消息的连发合并（v0.11.1）：@ / 引用 / 命令前缀触发的消息先在 buffer 里等
   * mergeWindowMs，窗口内同群的后续消息并成同一批，只起一个 turn。
   */
  function scheduleBypass(event, reason) {
    const key = String(event.groupId)
    let buffer = bypassBuffers.get(key)
    if (buffer === undefined) {
      buffer = {
        groupId: Number(event.groupId),
        groupName: typeof event.groupName === 'string' ? event.groupName : '',
        messages: [],
        reasons: [],
        timer: null,
      }
      bypassBuffers.set(key, buffer)
    }
    buffer.messages.push(toPromptMessage(event, now()))
    buffer.reasons.push(reason)
    if (buffer.timer !== null) clearTimeout(buffer.timer)
    const windowMs = Number(config.reply?.mergeWindowMs) || 0
    if (windowMs <= 0) {
      flushBypass(key)
      return
    }
    buffer.timer = setTimeout(() => flushBypass(key), windowMs)
  }

  function flushBypass(key) {
    const buffer = bypassBuffers.get(key)
    if (buffer === undefined) return
    bypassBuffers.delete(key)
    if (buffer.timer !== null) {
      clearTimeout(buffer.timer)
      buffer.timer = null
    }
    if (stopped) return
    const reason = bypassReasonOf(buffer.reasons)
    const text = formatIncomingPrompt({
      groupId: buffer.groupId,
      groupName: buffer.groupName,
      messages: buffer.messages,
      reason,
      now: now(),
    })
    if (text === '') {
      log.info('[relay] 直通消息没有可拼接的文本或媒体，跳过（群 ' + String(buffer.groupId) + '）')
      return
    }
    const last = buffer.messages[buffer.messages.length - 1]
    const replyTo = last !== null && typeof last === 'object' && typeof last.messageId === 'string' ? last.messageId : ''
    log.info('[relay] 直通（' + reason + '）：群 ' + String(buffer.groupId) + ' 消息 ' + String(buffer.messages.length) + ' 条')
    void startPrompt(buffer.groupId, { groupName: buffer.groupName, text, replyTo })
  }

  /** 拦截器 → 命令 / 直通 / 闸门（媒体消息在下载完成后再走这里）。 */
  function proceedInbound(event) {
    // 审批桥等入向拦截器优先消费（例如审批等待期间的「同意 / 拒绝」）。
    for (const intercept of interceptors) {
      try {
        if (intercept(event) === true) return
      } catch (error) {
        log.warn('[relay] 入向拦截器异常（已忽略）：' + String(error?.message ?? error))
      }
    }
    // 命令层（v0.11.0）：/new /stop /status /help；只认白名单命令名，其余照旧走直通 / 闸门。
    const command = config.commands?.enabled === false
      ? null
      : parseCommand(event.text, { prefixes: config.commandPrefixes, bare: config.commands?.bare !== false })
    if (command !== null) {
      if (!canRunCommand(event, config.commands?.roles)) {
        log.info('[relay] 忽略命令（角色不足 ' + String(event.sender?.role ?? '') + '）：' + command.name + ' 群 ' + String(event.groupId))
        return
      }
      log.info('[relay] 执行命令：' + command.name + ' 群 ' + String(event.groupId) + ' 消息 ' + String(event.messageId))
      void handleCommand(event, command)
      return
    }

    const bypass = bypassReason(event, { commandPrefixes: config.commandPrefixes })
    if (bypass.bypass && config.gate.mentionBypass !== false) {
      scheduleBypass(event, bypass.reason)
      return
    }
    gate.ingest(event)
  }

  /** 含媒体的消息：先下载（失败也继续），再把路径写进聊天记录并派发。 */
  async function recordMediaAndProceed(event, media) {
    let records = []
    try {
      const projectDir = projectDirFor({ config, mapping, groupId: event.groupId })
      if (typeof projectDir !== 'string' || projectDir === '') throw new Error('无法解析群项目目录')
      records = await attachMedia({
        projectDir,
        groupId: event.groupId,
        messageId: event.messageId,
        timeMs: Number.isFinite(event.timeMs) && event.timeMs > 0 ? event.timeMs : now(),
        media,
        fetchImpl: downloadFetch,
        logger: log,
      })
    } catch (error) {
      log.warn('[relay] 媒体落盘失败（群 ' + String(event.groupId) + '）：' + String(error?.message ?? error))
      records = media.map((item) => ({ kind: item.kind, status: 'failed', reason: 'attach-failed' }))
    }
    if (stopped) return
    event.media = records
    appendChatLog(event)
    proceedInbound(event)
  }

  function handleRawEvent(raw) {
    if (stopped) return
    const event = toInternalEvent(raw)
    if (event === null) return

    if (event.kind === 'group-message') {
      if (!config.groups.includes(event.groupId)) return
      if (event.userId === config.selfId) return
      if (!state.markSeen(event.groupId, event.messageId)) return
      const media = planMedia(event.segments, event.rawMessage)
      if (media.length === 0) {
        event.media = []
        appendChatLog(event)
        proceedInbound(event)
        return
      }
      void recordMediaAndProceed(event, media)
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
    for (const buffer of bypassBuffers.values()) {
      if (buffer.timer !== null) clearTimeout(buffer.timer)
    }
    bypassBuffers.clear()
    for (const pending of pendingBySession.values()) clearAckTimer(pending)
    sessionByGroup.clear()
    pendingBySession.clear()
    queueByGroup.clear()
    sendQueue.length = 0
  }

  return { start, stop, handleRawEvent, sendText, sendImage, sendFile, snapshot }
}
