/**
 * jev 分类器（P2.3）：用 TypeSafe 的 System One 决策模型回答「这条群聊要不要接话」。
 *
 * jev 不是对话模型：它返回带概率的类型化答案（这里用 Noul = 是否问题）。走 OpenRouter
 * 的 Decisions API（`POST /api/alpha/decisions`），一个请求问一个问题：
 *   state     = 群标识 + 触发路径 + 最近一批消息
 *   questions = { reply: { type: 'noul', instructions, criteria } }
 *   响应       = { answers: { reply: { type: 'noul', noul: 0.82 } }, usage }
 *
 * 纪律：**fail closed**。网络错误 / 超时 / 非 200 / 响应不合规一律回「不接话」，
 * 由调用方（gate 调度器）记决策日志。
 */

export const DEFAULT_JEV_MODEL = 'typesafe/jev-1.14'
export const DEFAULT_JEV_ENDPOINT = 'https://openrouter.ai/api/alpha/decisions'
export const DEFAULT_JEV_THRESHOLD = 0.7

const MAX_TRANSCRIPT = 60
const MAX_TEXT_CHARS = 500

const REPLY_QUESTION = {
  type: 'noul',
  instructions: 'Should the assistant send a message to this QQ group conversation now? Messages whose speaker is "bot" are the assistant\'s own recent replies; treat them as its prior turns.',
  criteria: {
    true: 'A human is addressing the assistant, asking it a question, continuing a conversation with it (including right after an exchange with the assistant), or the batch clearly expects a reply from the assistant.',
    false: 'The messages are people talking among themselves, small talk, links or images without a question for the assistant, or replying would be noise or interruption.',
  },
}

/**
 * 构造 Decisions API 请求体。
 *
 * @param options.model - jev 模型 id
 * @param options.messages - 批次消息（`{ nickname, role, text, userId }`）
 * @param options.groupName - 群名（可缺省）
 * @param options.trigger - `fast` / `slow`
 * @param options.botLabel - 助手在 state 里的标签（默认 bot）
 */
export function buildJevRequest({ model, messages, groupName = '', trigger = 'fast', botLabel = 'bot' }) {
  const transcript = []
  const list = Array.isArray(messages) ? messages.slice(-MAX_TRANSCRIPT) : []
  for (const message of list) {
    if (message === null || typeof message !== 'object') continue
    const text = typeof message.text === 'string' ? message.text.trim().slice(0, MAX_TEXT_CHARS) : ''
    if (text === '') continue
    transcript.push({
      speaker: typeof message.nickname === 'string' && message.nickname !== '' ? message.nickname : String(message.userId ?? ''),
      role: typeof message.role === 'string' ? message.role : '',
      text,
    })
  }
  return {
    model: typeof model === 'string' && model !== '' ? model : DEFAULT_JEV_MODEL,
    state: {
      channel: 'qq-group',
      group: groupName,
      trigger,
      bot: botLabel,
      transcript,
    },
    questions: { reply: REPLY_QUESTION },
  }
}

/**
 * 解析 Decisions API 响应里的 Noul 概率。
 *
 * @param body - 已 JSON.parse 的响应体
 * @returns `{ probability }` 或 `null`（不合规 → 调用方 fail closed）
 */
export function parseJevResponse(body) {
  if (body === null || typeof body !== 'object') return null
  const answer = body.answers?.reply
  if (answer === null || typeof answer !== 'object') return null
  if (answer.type !== 'noul') return null
  const probability = answer.noul
  if (typeof probability !== 'number' || !Number.isFinite(probability) || probability < 0 || probability > 1) return null
  return { probability }
}

/**
 * 概率 → 分类器决策（`reply` 用阈值判定，confidence 即概率）。
 *
 * @param options.probability - Noul 概率
 * @param options.threshold - 接话阈值（0..1）
 */
export function decideFromJev({ probability, threshold }) {
  const reply = probability >= threshold
  return {
    reply,
    confidence: probability,
    reason: 'jev noul=' + probability.toFixed(2) + ' threshold=' + threshold.toFixed(2),
    targetMsgIds: [],
  }
}

function failClosed(reason) {
  return { reply: false, confidence: 0, reason, targetMsgIds: [] }
}

/**
 * 构造 OpenRouter Decisions API 分类器。
 *
 * @param options.endpoint - Decisions API 地址
 * @param options.apiKey - OpenRouter API key（从环境变量读取）
 * @param options.model - jev 模型 id
 * @param options.threshold - 接话阈值
 * @param options.timeoutMs - 单次请求超时
 * @param options.logger - `{ warn }`
 * @param options.fetchImpl - 可注入的 fetch（单测）
 */
export function createJevClassifier({
  endpoint = DEFAULT_JEV_ENDPOINT,
  apiKey,
  model = DEFAULT_JEV_MODEL,
  threshold = DEFAULT_JEV_THRESHOLD,
  timeoutMs = 8000,
  logger = null,
  fetchImpl = null,
  botLabel = 'bot',
}) {
  const doFetch = typeof fetchImpl === 'function'
    ? fetchImpl
    : (...args) => globalThis.fetch(...args)
  const warn = (message) => { try { logger?.warn?.(message) } catch {} }

  return {
    name: 'jev',
    async classify(input) {
      const request = buildJevRequest({
        model,
        messages: input?.messages,
        groupName: input?.groupName,
        trigger: input?.trigger,
        botLabel,
      })
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), Math.max(100, Number(timeoutMs) || 8000))
      try {
        const response = await doFetch(endpoint, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + String(apiKey ?? ''), 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: controller.signal,
        })
        if (response === null || typeof response !== 'object' || response.ok !== true) {
          warn('[jev] Decisions API 返回非 2xx：' + String(response?.status ?? '?'))
          return failClosed('jev-http-error')
        }
        const body = await response.json()
        const parsed = parseJevResponse(body)
        if (parsed === null) {
          warn('[jev] 响应不合规（缺 answers.reply.noul）')
          return failClosed('jev-invalid-response')
        }
        return decideFromJev({ probability: parsed.probability, threshold })
      } catch (error) {
        warn('[jev] 请求失败（fail closed）：' + String(error?.message ?? error))
        return failClosed('jev-unavailable')
      } finally {
        clearTimeout(timer)
      }
    },
  }
}
