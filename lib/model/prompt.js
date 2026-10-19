/**
 * 消息拼接（P4）：把一批群消息拼成交给 DSH 的 prompt 文本。
 *
 * 格式（见 docs/chat-context.md §5）：
 *
 *   [QQ群：示例群（10002）] 2026-10-19 11:21 新消息 3 条
 *   [11:21:39] [tester] 测试
 *   [11:21:47] [tester]（@你）再回复一句话
 *   [11:22:10] [tester]（引用 12345）今天有空吗
 *   [历史记录：.qq-relay/chat/10002/（JSONL，按天分文件）]
 *
 * 纪律：纯函数、零依赖、不读盘；直通与闸门共用同一套拼接。
 */

import { RELAY_DIR_NAME } from './project.js'

/** 直通原因 → prompt 里的展示标签。 */
const REASON_LABELS = Object.freeze({ mention: '@', reply: '引用', command: '命令' })

function pad2(value) {
  return String(value).padStart(2, '0')
}

/** 本地时间 `HH:mm:ss`（消息行前缀）。 */
export function formatClock(ms) {
  const date = new Date(ms)
  return pad2(date.getHours()) + ':' + pad2(date.getMinutes()) + ':' + pad2(date.getSeconds())
}

/** 本地时间 `YYYY-MM-DD HH:mm`（批次头部）。 */
export function formatDateTime(ms) {
  const date = new Date(ms)
  return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate())
    + ' ' + pad2(date.getHours()) + ':' + pad2(date.getMinutes())
}

/** 显示名：群名片 → 昵称 → QQ 号（统一直通与闸门两处逻辑）。 */
export function displayName(message) {
  if (message === null || typeof message !== 'object') return ''
  if (typeof message.card === 'string' && message.card.trim() !== '') return message.card.trim()
  if (typeof message.nickname === 'string' && message.nickname.trim() !== '') return message.nickname.trim()
  return message.userId === undefined || message.userId === null ? '' : String(message.userId)
}

/** 相对会话 cwd 的历史记录目录（agent 可直接 read）。 */
export function chatHistoryPointer(groupId) {
  return RELAY_DIR_NAME + '/chat/' + String(groupId) + '/'
}

/**
 * 单条消息行；文本为空时返回空串（由调用方跳过）。
 *
 * @param message - `{ text, time, card, nickname, userId, mentionsSelf, replyToId }`
 * @param fallbackTime - 缺少时间时用的毫秒时间
 */
export function promptLine(message, fallbackTime) {
  if (message === null || typeof message !== 'object') return ''
  const text = typeof message.text === 'string' ? message.text.trim() : ''
  if (text === '') return ''
  const time = Number.isFinite(message.time) && message.time > 0 ? message.time : fallbackTime
  const name = displayName(message)
  const marks = []
  if (message.mentionsSelf === true) marks.push('@你')
  if (typeof message.replyToId === 'string' && message.replyToId !== '') marks.push('引用 ' + message.replyToId)
  const marker = marks.length > 0 ? '（' + marks.join('，') + '）' : ''
  const who = name !== '' ? '[' + name + ']' : ''
  if (marker !== '') return '[' + formatClock(time) + '] ' + who + marker + text
  return '[' + formatClock(time) + '] ' + who + (who !== '' ? ' ' : '') + text
}

/**
 * 把一批消息拼成一条完整 prompt。
 *
 * @param options.groupId - 群号
 * @param options.groupName - 群名（缺省用「群 <id>」）
 * @param options.messages - 消息数组（`{ text, time, card?, nickname?, userId?, mentionsSelf?, replyToId? }`）
 * @param options.reason - 直通原因（`mention` / `reply` / `command`；闸门派发时为空）
 * @param options.now - 缺少时间时的兜底毫秒时间
 * @returns prompt 文本；没有有效消息时返回空串
 */
export function formatIncomingPrompt({ groupId, groupName, messages, reason = '', now = Date.now() }) {
  if (!Array.isArray(messages)) return ''
  const list = messages.filter((message) => message !== null && typeof message === 'object'
    && typeof message.text === 'string' && message.text.trim() !== '')
  if (list.length === 0) return ''
  const first = list[0]
  const startMs = Number.isFinite(first.time) && first.time > 0 ? first.time : now
  const name = typeof groupName === 'string' && groupName !== '' ? groupName : '群 ' + String(groupId)
  const reasonLabel = typeof reason === 'string' && REASON_LABELS[reason] !== undefined
    ? '（直通：' + REASON_LABELS[reason] + '）'
    : ''
  const lines = [
    '[QQ群：' + name + '（' + String(groupId) + '）] ' + formatDateTime(startMs)
      + ' 新消息 ' + String(list.length) + ' 条' + reasonLabel,
  ]
  for (const message of list) {
    const line = promptLine(message, startMs)
    if (line !== '') lines.push(line)
  }
  lines.push('[历史记录：' + chatHistoryPointer(groupId) + '（JSONL，按天分文件）]')
  return lines.join('\n')
}
