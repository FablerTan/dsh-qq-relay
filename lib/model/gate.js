/**
 * 消息闸门纯逻辑（P2.1）：gate 配置解析、分类器决策的规范化与 fail-closed、
 * 批次构造、快路窗口 / 最小发言间隔判定。
 *
 * 这里不含定时器、不落盘、不认识 OneBot：调度与副作用在
 * `controller/gate.js`，设计见 docs/gate.md。
 *
 * 纪律：**永不抛异常**。非法配置返回 problems；非法决策一律按「不接话」处理
 * （fail closed），只有 `reply === true` 且字段合规才允许接话。
 */

/** gate 默认值（与 docs/gate.md §8 对齐；时长字段内部统一为毫秒）。 */
export const DEFAULT_GATE = Object.freeze({
  enabled: false,
  mentionBypass: true,
  fastWindow: 10 * 60 * 1000,
  fastMinReplyInterval: 45 * 1000,
  debounce: 5 * 1000,
  slowTimer: 2 * 60 * 60 * 1000,
  slowWindow: 2 * 60 * 60 * 1000,
  maxBatchMessages: 100,
  classifierTimeoutMs: 1500,
})

/** 已知配置项（用于拒绝拼写错误）。 */
export const GATE_KEYS = Object.freeze([
  'enabled',
  'mentionBypass',
  'fastWindow',
  'fastMinReplyInterval',
  'debounce',
  'slowTimer',
  'slowWindow',
  'maxBatchMessages',
  'classifierTimeoutMs',
])

/** 时长字段的可接受区间（毫秒，闭区间）。 */
const DURATION_RANGES = Object.freeze({
  fastWindow: [10 * 1000, 24 * 60 * 60 * 1000],
  fastMinReplyInterval: [0, 60 * 60 * 1000],
  debounce: [0, 60 * 1000],
  slowTimer: [60 * 1000, 48 * 60 * 60 * 1000],
  slowWindow: [60 * 1000, 48 * 60 * 60 * 1000],
  classifierTimeoutMs: [100, 30 * 1000],
})

const DURATION_RE = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h)$/i
const UNIT_MS = Object.freeze({ ms: 1, s: 1000, m: 60 * 1000, h: 60 * 60 * 1000 })

/**
 * 解析时长：数字视为毫秒，字符串支持 `500ms` / `45s` / `10m` / `2h`。
 *
 * @param value - 任意输入
 * @returns 毫秒数；非法返回 `null`
 */
export function parseDuration(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? Math.round(value) : null
  }
  if (typeof value !== 'string') return null
  const match = DURATION_RE.exec(value.trim())
  if (match === null) return null
  const amount = Number(match[1])
  const unit = UNIT_MS[match[2].toLowerCase()]
  if (!Number.isFinite(amount) || amount < 0) return null
  return Math.round(amount * unit)
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * 规范化 gate 配置段。
 *
 * @param raw - profile patch 里的 `gate`（可能缺省 / 脏数据）
 * @param problems - 校验问题收集数组（调用方传入）
 * @returns 规范化后的 gate 配置（时长均为毫秒）
 */
export function normalizeGateConfig(raw, problems = []) {
  const base = { ...DEFAULT_GATE }
  if (raw === undefined) return base
  if (!isPlainObject(raw)) {
    problems.push('gate 必须是对象')
    return base
  }

  for (const key of Object.keys(raw)) {
    if (!GATE_KEYS.includes(key)) problems.push('gate 里有未知配置项：' + key)
  }

  const enabled = raw.enabled ?? base.enabled
  const mentionBypass = raw.mentionBypass ?? base.mentionBypass
  if (typeof enabled !== 'boolean') problems.push('gate.enabled 必须是布尔值')
  if (typeof mentionBypass !== 'boolean') problems.push('gate.mentionBypass 必须是布尔值')

  const result = { ...base }
  result.enabled = typeof enabled === 'boolean' ? enabled : base.enabled
  result.mentionBypass = typeof mentionBypass === 'boolean' ? mentionBypass : base.mentionBypass

  for (const [key, [min, max]] of Object.entries(DURATION_RANGES)) {
    const rawValue = raw[key]
    if (rawValue === undefined) continue
    const ms = parseDuration(rawValue)
    if (ms === null || ms < min || ms > max) {
      problems.push('gate.' + key + ' 非法（需 ' + String(min) + '..' + String(max) + ' 毫秒，或 500ms / 45s / 10m / 2h 形式）')
      continue
    }
    result[key] = ms
  }

  if (raw.maxBatchMessages !== undefined) {
    const value = raw.maxBatchMessages
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 500) {
      problems.push('gate.maxBatchMessages 必须是 1..500 的整数')
    } else {
      result.maxBatchMessages = value
    }
  }

  return result
}

/**
 * 规范化分类器输出；任何不合规都退化为「不接话」。
 *
 * 合规形状：`{ reply: boolean, confidence: number(0..1), reason: string, targetMsgIds?: string[] }`。
 *
 * @param raw - 分类器原始返回
 * @returns `{ reply, confidence, reason, targetMsgIds }`
 */
export function normalizeDecision(raw) {
  const reject = (reason) => ({ reply: false, confidence: 0, reason, targetMsgIds: [] })
  if (!isPlainObject(raw)) return reject('invalid-decision')
  if (typeof raw.reply !== 'boolean') return reject('invalid-decision:reply')
  if (typeof raw.confidence !== 'number' || !Number.isFinite(raw.confidence) || raw.confidence < 0 || raw.confidence > 1) {
    return reject('invalid-decision:confidence')
  }
  if (typeof raw.reason !== 'string') return reject('invalid-decision:reason')
  const targetMsgIds = Array.isArray(raw.targetMsgIds)
    ? raw.targetMsgIds.filter((id) => typeof id === 'string' && id !== '').slice(0, 20)
    : []
  return { reply: raw.reply, confidence: raw.confidence, reason: raw.reason, targetMsgIds }
}

/** 未接分类器时的占位实现：永远「不接话」，但把原因记进决策日志。 */
export function createNullClassifier() {
  return {
    name: 'null',
    async classify() {
      return { reply: false, confidence: 0, reason: 'classifier-not-configured', targetMsgIds: [] }
    },
  }
}

/**
 * 构造交给分类器的批次：只取最近的 `maxBatchMessages` 条（保持时间升序）。
 *
 * @param records - 聊天日志 / pending 记录
 * @param options.maxBatchMessages - 单批上限
 * @returns 规范化后的消息数组
 */
export function buildBatch(records, { maxBatchMessages = 100 } = {}) {
  if (!Array.isArray(records)) return []
  const limit = Number.isInteger(maxBatchMessages) && maxBatchMessages > 0 ? maxBatchMessages : 100
  const out = []
  for (const record of records) {
    if (!isPlainObject(record)) continue
    out.push({
      messageId: String(record.messageId ?? ''),
      userId: String(record.userId ?? ''),
      nickname: typeof record.nickname === 'string' ? record.nickname : '',
      role: typeof record.role === 'string' ? record.role : '',
      text: typeof record.text === 'string' ? record.text : '',
      time: Number.isFinite(record.time) ? record.time : 0,
    })
  }
  return out.slice(-limit)
}

/** 机器人最近 `fastWindow` 内发过言 → 走快路（5 秒去抖）。 */
export function fastPathActive({ now, lastBotSpeakAt, config }) {
  const last = Number(lastBotSpeakAt)
  if (!Number.isFinite(last) || last <= 0) return false
  const windowMs = Number(config?.fastWindow ?? DEFAULT_GATE.fastWindow)
  return now - last < windowMs
}

/**
 * 距下一次允许发言的等待毫秒数（已可发言返回 0）。
 *
 * @param options.now - 当前时间
 * @param options.lastReplyAt - 上一次成功发言时间
 * @param options.config - gate 配置
 */
export function minIntervalRemaining({ now, lastReplyAt, config }) {
  const last = Number(lastReplyAt)
  if (!Number.isFinite(last) || last <= 0) return 0
  const interval = Number(config?.fastMinReplyInterval ?? DEFAULT_GATE.fastMinReplyInterval)
  const elapsed = now - last
  if (!Number.isFinite(elapsed) || elapsed >= interval) return 0
  return Math.max(0, interval - elapsed)
}

/** 把一批消息拼成交给 DSH 的 prompt 文本（`[昵称] 内容` 每行一条）。 */
export function formatBatchPrompt(messages) {
  if (!Array.isArray(messages)) return ''
  const lines = []
  for (const message of messages) {
    if (!isPlainObject(message)) continue
    const text = typeof message.text === 'string' ? message.text.trim() : ''
    if (text === '') continue
    const name = typeof message.nickname === 'string' && message.nickname !== '' ? message.nickname : String(message.userId ?? '')
    lines.push(name !== '' ? '[' + name + '] ' + text : text)
  }
  return lines.join('\n')
}
