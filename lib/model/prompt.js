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
const REASON_LABELS = Object.freeze({ mention: '@', reply: '引用', command: '命令', proxy: '代答', poke: '戳一戳', file: '群文件' })

/**
 * 平台约定（v0.19.0）：QQ 轮次的最终回复由 relay 自动回发。
 * 不写进 prompt 时，模型倾向直接调 qq_send 回话，会绕过引用 / 占位 / 连发合并并偶发双发。
 */
export const PROMPT_PLATFORM_NOTE = '[说明：直接输出最终回复即可，relay 会自动回发到本群；不要用 qq_send 往本群发。]'

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
 * 媒体标记（图片 / 表情 / 失败）；agent 可按相对路径直接 read。
 *
 * @param media - 聊天记录里的 media 数组（见 docs/media.md §4）
 */
export function mediaMarkers(media) {
  if (!Array.isArray(media) || media.length === 0) return ''
  const parts = []
  const KIND_LABELS = { sticker: '表情', video: '视频', voice: '语音', file: '文件' }
  for (const entry of media.slice(0, 9)) {
    if (entry === null || typeof entry !== 'object') continue
    if (entry.status === 'saved' && typeof entry.path === 'string' && entry.path !== '') {
      const label = KIND_LABELS[entry.kind] ?? '图片'
      parts.push('[' + label + '：' + entry.path + ']')
    } else if (entry.status === 'failed') {
      parts.push(entry.kind === 'file' ? '[群文件下载失败]' : '[媒体下载失败]')
    } else if (entry.kind === 'face') {
      parts.push(typeof entry.text === 'string' && entry.text !== '' ? '[表情 ' + entry.text + ']' : '[表情]')
    } else if (entry.kind === 'video' || entry.kind === 'voice') {
      parts.push(entry.kind === 'video' ? '[视频（未下载）]' : '[语音（未下载）]')
    } else if (typeof entry.file === 'string' && entry.file !== '') {
      parts.push('[媒体 ' + entry.file + ']')
    }
  }
  return parts.join('')
}

/**
 * 单条消息行；文本与媒体都为空时返回空串（由调用方跳过）。
 *
 * @param message - `{ text, time, card, nickname, userId, mentionsSelf, atNames?, replyToId, media? }`
 * @param fallbackTime - 缺少时间时用的毫秒时间
 */
export function promptLine(message, fallbackTime) {
  if (message === null || typeof message !== 'object') return ''
  const text = typeof message.text === 'string' ? message.text.trim() : ''
  const mediaText = mediaMarkers(message.media)
  if (text === '' && mediaText === '') return ''
  const time = Number.isFinite(message.time) && message.time > 0 ? message.time : fallbackTime
  const name = displayName(message)
  const marks = []
  if (message.mentionsSelf === true) marks.push('@你')
  if (Array.isArray(message.atNames)) {
    for (const atName of message.atNames) {
      if (typeof atName !== 'string' || atName.trim() === '') continue
      const mark = '@' + atName.trim()
      if (!marks.includes(mark)) marks.push(mark)
    }
  }
  if (typeof message.replyToId === 'string' && message.replyToId !== '') marks.push('引用 ' + message.replyToId)
  const marker = marks.length > 0 ? '（' + marks.join('，') + '）' : ''
  const who = name !== '' ? '[' + name + ']' : ''
  let body = who + marker
  if (mediaText !== '') body += (body !== '' ? ' ' : '') + mediaText
  if (text !== '') {
    const needSpace = mediaText !== '' || (marker === '' && who !== '')
    body += (needSpace ? ' ' : '') + text
  }
  return '[' + formatClock(time) + '] ' + body
}

/**
 * 把一批消息拼成一条完整 prompt。
 *
 * @param options.groupId - 群号
 * @param options.groupName - 群名（缺省用「群 <id>」）
 * @param options.messages - 消息数组（`{ text, time, card?, nickname?, userId?, mentionsSelf?, replyToId? }`）
 * @param options.reason - 直通原因（`mention` / `reply` / `command` / `proxy`；闸门派发时为空）
 * @param options.notes - 追加在消息行之后、历史指针之前的说明行（逐行渲染成 `[<note>]`）
 * @param options.persona - 轻量人设文本（v0.19.0；空串 = 不注入）
 * @param options.platformNote - 是否追加「最终回复自动回发」的平台约定（默认 true）
 * @param options.now - 缺少时间时的兜底毫秒时间
 * @returns prompt 文本；没有有效消息时返回空串
 */
export function formatIncomingPrompt({ groupId, groupName, messages, reason = '', notes = [], persona = '', platformNote = true, now = Date.now() }) {
  if (!Array.isArray(messages)) return ''
  const list = messages.filter((message) => message !== null && typeof message === 'object'
    && ((typeof message.text === 'string' && message.text.trim() !== '')
      || (Array.isArray(message.media) && message.media.length > 0)))
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
  if (typeof persona === 'string' && persona.trim() !== '') {
    lines.push('[角色设定：' + persona.replace(/\s+/gu, ' ').trim() + ']')
  }
  for (const message of list) {
    const line = promptLine(message, startMs)
    if (line !== '') lines.push(line)
  }
  for (const note of Array.isArray(notes) ? notes : []) {
    if (typeof note !== 'string' || note.trim() === '') continue
    lines.push('[' + note.trim() + ']')
  }
  lines.push('[历史记录：' + chatHistoryPointer(groupId) + '（JSONL，按天分文件）]')
  if (platformNote === true) lines.push(PROMPT_PLATFORM_NOTE)
  return lines.join('\n')
}
