/**
 * NapCat / OneBot 11 正向 WebSocket 客户端（P1，零外部依赖）。
 *
 * - 连接 wsUrl，token 走 query 参数 access_token（2026-10-19 实测可用）；
 * - echo 请求/响应关联 + 超时；
 * - 心跳看门狗：超过 heartbeatTimeoutMs 没收到任何帧就主动断开重连；
 * - 断线指数退避重连（复用 model/reply.js 的 nextBackoff）；
 * - 连接后用 get_login_info 校验 self_id，不匹配立即停止（避免连错账号）；
 * - 事件以 'event' 原样抛出，交给上层 codec 处理。
 *
 * 测试注入：options.WebSocketImpl 可替换成假实现（单测用），默认用全局 WebSocket。
 */

import { nextBackoff } from '../../model/reply.js'

export function buildWsUrl(wsUrl, accessToken) {
  const url = new URL(wsUrl)
  if (typeof accessToken === 'string' && accessToken !== '') url.searchParams.set('access_token', accessToken)
  return url.toString()
}

export function createOneBotClient(options = {}) {
  const wsUrl = String(options.wsUrl ?? '')
  const accessToken = String(options.accessToken ?? '')
  const selfId = Number(options.selfId) || 0
  const logger = options.logger ?? null
  const WebSocketImpl = options.WebSocketImpl ?? globalThis.WebSocket
  const reconnect = { minMs: 1000, maxMs: 30000, ...(options.reconnect ?? {}) }
  const requestTimeoutMs = Number.isFinite(options.requestTimeoutMs) ? options.requestTimeoutMs : 10000
  const heartbeatTimeoutMs = Number.isFinite(options.heartbeatTimeoutMs) ? options.heartbeatTimeoutMs : 75000

  const listeners = new Map()
  const pending = new Map()
  let socket = null
  let running = false
  let backoffAttempt = 0
  let reconnectTimer = null
  let heartbeatTimer = null
  let echoSeq = 0

  function log(level, message) {
    try { logger?.[level]?.(message) } catch {}
  }

  function emit(name, payload) {
    const set = listeners.get(name)
    if (set === undefined) return
    for (const handler of [...set]) {
      try { handler(payload) } catch {}
    }
  }

  function on(name, handler) {
    if (typeof handler !== 'function') return () => {}
    if (!listeners.has(name)) listeners.set(name, new Set())
    listeners.get(name).add(handler)
    return () => off(name, handler)
  }

  function off(name, handler) {
    const set = listeners.get(name)
    if (set !== undefined) set.delete(handler)
  }

  function clearHeartbeat() {
    if (heartbeatTimer !== null) {
      clearTimeout(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  function armHeartbeat() {
    clearHeartbeat()
    if (!(heartbeatTimeoutMs > 0)) return
    heartbeatTimer = setTimeout(() => {
      log('warn', '[onebot] 心跳超时，主动断开触发重连')
      try { socket?.close() } catch {}
    }, heartbeatTimeoutMs)
  }

  function rejectPending(error) {
    for (const entry of pending.values()) {
      clearTimeout(entry.timer)
      entry.reject(error)
    }
    pending.clear()
  }

  function call(action, params = {}) {
    return new Promise((resolve, reject) => {
      if (socket === null || socket.readyState !== 1) {
        reject(new Error('OneBot 未连接'))
        return
      }
      const echo = 'relay-' + String(++echoSeq)
      const timer = setTimeout(() => {
        pending.delete(echo)
        reject(new Error('OneBot 请求超时：' + action))
      }, requestTimeoutMs)
      pending.set(echo, { resolve, reject, timer })
      try {
        socket.send(JSON.stringify({ action, params, echo }))
      } catch (error) {
        clearTimeout(timer)
        pending.delete(echo)
        reject(error)
      }
    })
  }

  function handleFrame(frame) {
    if (frame === null || typeof frame !== 'object') return
    armHeartbeat()
    if (typeof frame.echo === 'string' && pending.has(frame.echo)) {
      const entry = pending.get(frame.echo)
      pending.delete(frame.echo)
      clearTimeout(entry.timer)
      entry.resolve(frame)
      return
    }
    if (typeof frame.post_type === 'string') emit('event', frame)
  }

  function scheduleReconnect() {
    if (!running || reconnectTimer !== null) return
    const delay = nextBackoff(backoffAttempt, reconnect)
    backoffAttempt += 1
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, delay)
  }

  function connect() {
    if (!running) return
    if (typeof WebSocketImpl !== 'function') {
      log('error', '[onebot] 全局 WebSocket 不可用，无法连接')
      return
    }
    let ws
    try {
      ws = new WebSocketImpl(buildWsUrl(wsUrl, accessToken))
    } catch (error) {
      log('error', '[onebot] 创建 WebSocket 失败：' + String(error?.message ?? error))
      scheduleReconnect()
      return
    }
    socket = ws

    ws.onopen = () => {
      backoffAttempt = 0
      log('info', '[onebot] 已连接 ' + wsUrl)
      emit('open', {})
      armHeartbeat()
      if (selfId > 0) {
        call('get_login_info', {})
          .then((response) => {
            const actual = Number(response?.data?.user_id ?? 0)
            emit('login', response?.data ?? {})
            if (actual !== selfId) {
              const error = new Error('self_id 不匹配：配置 ' + String(selfId) + '，实际 ' + String(actual))
              log('error', '[onebot] ' + error.message)
              emit('error', error)
              stop()
            }
          })
          .catch((error) => {
            log('warn', '[onebot] 校验 self_id 失败：' + String(error?.message ?? error))
            emit('error', error)
          })
      }
    }

    ws.onmessage = (event) => {
      let frame
      try {
        frame = JSON.parse(typeof event?.data === 'string' ? event.data : String(event?.data))
      } catch {
        return
      }
      handleFrame(frame)
    }

    ws.onerror = (event) => {
      emit('error', event ?? new Error('WebSocket error'))
    }

    ws.onclose = () => {
      clearHeartbeat()
      if (socket === ws) socket = null
      emit('close', {})
      if (running) scheduleReconnect()
    }
  }

  function start() {
    if (running) return
    running = true
    backoffAttempt = 0
    connect()
  }

  function stop() {
    running = false
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    clearHeartbeat()
    const ws = socket
    socket = null
    rejectPending(new Error('OneBot 客户端已停止'))
    if (ws !== null) {
      try { ws.close() } catch {}
    }
  }

  return {
    start,
    stop,
    call,
    on,
    off,
    isOpen: () => socket !== null && socket.readyState === 1,
  }
}
