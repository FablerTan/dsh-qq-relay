/**
 * 出向回复：文本切分、退避、重试判定（P1 纯逻辑）。
 *
 * 真实限制（QQ 单条长度）待实测，先用可配置的 replyChunkSize（默认 1500 字符）。
 * 发送失败按「传输错误（超时 / WS 断开）可重试、OneBot 明确失败不重试」处理。
 */

/** 把文本按 chunkSize 切成多条；空文本返回 []。优先在换行处切。 */
export function buildReplyChunks(text, chunkSize = 1500) {
  if (typeof text !== 'string') return []
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\u0000/g, '')
  const trimmed = normalized.replace(/\n{3,}/g, '\n\n').trim()
  if (trimmed === '') return []

  const size = Number.isInteger(chunkSize) && chunkSize > 0 ? chunkSize : 1500
  const chunks = []
  let current = ''

  const pushCurrent = () => {
    if (current !== '') chunks.push(current)
    current = ''
  }

  for (const line of trimmed.split('\n')) {
    if (line.length > size) {
      pushCurrent()
      for (const piece of hardSplit(line, size)) chunks.push(piece)
      continue
    }
    if (current === '') {
      current = line
    } else if (current.length + 1 + line.length <= size) {
      current += '\n' + line
    } else {
      pushCurrent()
      current = line
    }
  }
  pushCurrent()
  return chunks.filter((chunk) => chunk.trim() !== '')
}

/** 按码点硬切超长单行，避免切开代理对。 */
function hardSplit(line, size) {
  const out = []
  let buffer = ''
  for (const char of line) {
    if (buffer.length + char.length > size) {
      out.push(buffer)
      buffer = ''
    }
    buffer += char
  }
  if (buffer !== '') out.push(buffer)
  return out
}

/** 指数退避：minMs * 2^attempt，上限 maxMs。 */
export function nextBackoff(attempt, { minMs = 1000, maxMs = 30000 } = {}) {
  const base = Number.isInteger(minMs) && minMs > 0 ? minMs : 1000
  const cap = Number.isInteger(maxMs) && maxMs >= base ? maxMs : 30000
  const index = Math.max(0, Math.floor(attempt))
  return Math.min(cap, base * 2 ** index)
}

/** 传输层失败是否还值得重试（attempt 从 0 开始）。 */
export function shouldRetryTransport(attempt, maxAttempts = 3) {
  return Math.max(0, Math.floor(attempt)) + 1 < Math.max(1, maxAttempts)
}
