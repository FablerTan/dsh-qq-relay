/**
 * 聊天记录清理（v0.13.0）：保留天数校验 + 一次性清理聊天文件与媒体目录。
 *
 * 自动清理（组合根启动时 / 每日一次，沿用 `chatRetentionDays`）与设置页「立即清理」
 * 按钮共用这里的实现：
 *  - 自动清理：`0` 表示永不删除，`7..3650` 才生效（见 config.js）；
 *  - 立即清理：显式传 `1..3650`，**允许比自动清理更激进**（例如临时清到 3 天前）。
 *
 * 只删「已知群」目录里按天分片的聊天文件（`<root>/<群号>/YYYY-MM-DD.jsonl`）与
 * 媒体日期目录（`<项目>/.qq-relay/media/<群号>/<日期>/`）；不动映射、会话、配置。
 * 单个目录失败只跳过（调用方照常汇报已删除数量），绝不抛到 HTTP 面。
 */

import { pruneMedia } from './media.js'

/** 立即清理允许的最短保留天数。 */
export const CLEANUP_MIN_DAYS = 1
/** 立即清理允许的最长保留天数（与 chatRetentionDays 上限一致）。 */
export const CLEANUP_MAX_DAYS = 3650

/**
 * 校验「立即清理」的保留天数。
 *
 * @param raw - HTTP body 里的 `days`（数字或数字字符串）
 * @returns `{ ok: true, days }` 或 `{ ok: false, message }`
 */
export function normalizeCleanupDays(raw) {
  const value = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw
  if (typeof value !== 'number' || !Number.isInteger(value) || value < CLEANUP_MIN_DAYS || value > CLEANUP_MAX_DAYS) {
    return {
      ok: false,
      message: '清理保留天数必须是 ' + String(CLEANUP_MIN_DAYS) + '..' + String(CLEANUP_MAX_DAYS)
        + ' 的整数（0 表示永不自动删除，不能用于立即清理）。',
    }
  }
  return { ok: true, days: value }
}

/**
 * 按保留天数清理聊天记录与媒体。
 *
 * @param options.chatLog - {@link createChatLog} 实例（提供 `prune`）
 * @param options.groupIds - 要清理的群号（白名单 ∪ 映射 ∪ 群项目配置）
 * @param options.projectDirFor - `(groupId) => 项目目录`（空串表示跳过）
 * @param options.days - 保留天数（`<= 0` 直接返回 0）
 * @param options.nowMs - 当前时间（单测可注入）
 * @returns `{ chat, media }`：删除的聊天文件数 / 媒体日期目录数
 */
export function pruneChatAndMedia({ chatLog, groupIds = [], projectDirFor, days, nowMs = Date.now() }) {
  const removed = { chat: 0, media: 0 }
  if (!(days > 0)) return removed
  try {
    if (chatLog !== null && typeof chatLog?.prune === 'function') {
      removed.chat = chatLog.prune(nowMs, days, groupIds)
    }
  } catch {}
  try {
    removed.media = pruneMedia({ groupIds, projectDirFor, nowMs, days })
  } catch {}
  return removed
}
