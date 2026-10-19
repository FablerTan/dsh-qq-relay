/**
 * 设置页面板数据（v0.14.0）：最近消息查询参数校验 + 聊天记录 → 面板消息。
 *
 * 页面「最近消息」只看最近 24 小时（按天分文件，回看窗口太大没意义）；
 * 输出给前端的字段是**脱敏后的只读视图**：不含 raw CQ 码、不含 seen / pending 之类内部状态。
 *
 * 纯函数、零依赖、不读盘；读盘由组合根用 chatLog.readRecent 完成。
 */

import { displayName } from './prompt.js'

/** 最近消息默认条数。 */
export const PANEL_MESSAGES_DEFAULT_LIMIT = 20
/** 最近消息最多条数（防止页面一次拉太多）。 */
export const PANEL_MESSAGES_MAX_LIMIT = 100
/** 最近消息回看窗口：24 小时。 */
export const PANEL_MESSAGES_WINDOW_MS = 24 * 60 * 60 * 1000

/**
 * 校验「最近消息」查询参数。
 *
 * @param query - URL searchParams 解出的对象（字符串值）
 * @returns `{ ok: true, groupId, limit }` 或 `{ ok: false, message }`
 */
export function normalizeMessagesQuery(query) {
  const rawGroupId = query?.groupId
  const groupId = typeof rawGroupId === 'string' && rawGroupId.trim() !== '' ? Number(rawGroupId) : rawGroupId
  if (!Number.isInteger(groupId) || groupId <= 0) {
    return { ok: false, message: 'groupId 必须是正整数。' }
  }
  const rawLimit = query?.limit === undefined || query?.limit === '' ? PANEL_MESSAGES_DEFAULT_LIMIT : Number(query.limit)
  if (!Number.isInteger(rawLimit) || rawLimit < 1) {
    return { ok: false, message: 'limit 必须是正整数。' }
  }
  return { ok: true, groupId, limit: Math.min(rawLimit, PANEL_MESSAGES_MAX_LIMIT) }
}

/**
 * 聊天记录 → 面板消息（字段收敛，便于前端直接渲染）。
 *
 * @param record - chat-log 的一条记录
 * @returns 面板消息或 null（脏数据）
 */
export function toPanelMessage(record) {
  if (record === null || typeof record !== 'object') return null
  const media = Array.isArray(record.media)
    ? record.media
      .filter((entry) => entry !== null && typeof entry === 'object')
      .map((entry) => ({
        kind: typeof entry.kind === 'string' ? entry.kind : '',
        status: typeof entry.status === 'string' ? entry.status : '',
        path: typeof entry.path === 'string' ? entry.path : '',
      }))
    : []
  return {
    messageId: typeof record.messageId === 'string' ? record.messageId : String(record.messageId ?? ''),
    time: Number.isFinite(record.time) ? record.time : 0,
    name: displayName(record),
    text: typeof record.text === 'string' ? record.text : '',
    mentionsSelf: record.mentionsSelf === true,
    replyToId: typeof record.replyToId === 'string' && record.replyToId !== '' ? record.replyToId : '',
    media,
  }
}

/**
 * 取最后 limit 条并转成面板消息（时间升序，与聊天日志一致）。
 *
 * @param records - chatLog.readRecent 的结果（时间升序）
 * @param limit - 条数上限
 * @returns 面板消息数组（可能少于 limit）
 */
export function panelMessages(records, limit) {
  const list = Array.isArray(records) ? records : []
  const count = Number.isInteger(limit) && limit > 0 ? limit : PANEL_MESSAGES_DEFAULT_LIMIT
  return list.map(toPanelMessage).filter((message) => message !== null).slice(-count)
}
