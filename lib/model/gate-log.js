/**
 * 闸门决策日志（P2.2）：每次分类器决策落一条 JSONL，用于调阈值 / 回放。
 *
 * 布局：`~/.dsh/storages/dsh-qq-relay/gate/YYYY-MM-DD.jsonl`（本地时区），每行：
 *   { time, groupId, trigger, batch, reply, confidence, reason, costMs, messageIds }
 *
 * 与聊天日志同款纪律：只追加、读容忍坏行、写失败不阻断主流程；默认保留 7 天（由
 * 组合根定时 prune）。**不落消息正文**——只记 message_id，正文在聊天日志里，避免重复存储。
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

import { localDateKey } from './chat-log.js'

const DAY_MS = 24 * 60 * 60 * 1000
const FILE_RE = /^\d{4}-\d{2}-\d{2}\.jsonl$/

function normalizeRecord(record) {
  if (record === null || typeof record !== 'object') return null
  return {
    time: Number.isFinite(record.time) ? record.time : Date.now(),
    groupId: Number.isInteger(record.groupId) && record.groupId > 0 ? record.groupId : 0,
    trigger: record.trigger === 'slow' ? 'slow' : 'fast',
    batch: Number.isInteger(record.batch) && record.batch >= 0 ? record.batch : 0,
    reply: record.reply === true,
    confidence: Number.isFinite(record.confidence) ? record.confidence : 0,
    reason: typeof record.reason === 'string' ? record.reason : '',
    costMs: Number.isFinite(record.costMs) ? record.costMs : 0,
    messageIds: Array.isArray(record.messageIds) ? record.messageIds.filter((id) => typeof id === 'string').slice(-20) : [],
  }
}

/**
 * 闸门决策日志读写器。
 *
 * @param options.dir - 日志目录（单测传临时目录）
 * @param options.retentionDays - 保留天数（prune 用）
 */
export function createGateLog({ dir, retentionDays = 7 } = {}) {
  if (typeof dir !== 'string' || dir === '') throw new Error('createGateLog 需要 dir')
  return {
    dir,
    retentionDays,
    fileFor(ms = Date.now()) {
      return join(dir, localDateKey(ms) + '.jsonl')
    },
    append(record) {
      const normalized = normalizeRecord(record)
      if (normalized === null) return null
      mkdirSync(dir, { recursive: true })
      appendFileSync(this.fileFor(normalized.time), JSON.stringify(normalized) + '\n', 'utf8')
      return normalized
    },
    /** 读取 sinceMs 之后的记录（按时间升序）。 */
    readRecent(sinceMs = 0, nowMs = Date.now()) {
      const out = []
      const startDay = new Date(Math.min(sinceMs, nowMs))
      startDay.setHours(0, 0, 0, 0)
      const endDay = new Date(nowMs)
      endDay.setHours(0, 0, 0, 0)
      for (let cursor = startDay.getTime(); cursor <= endDay.getTime();) {
        const file = join(dir, localDateKey(cursor) + '.jsonl')
        if (existsSync(file)) {
          try {
            for (const line of readFileSync(file, 'utf8').split('\n')) {
              if (line === '') continue
              try {
                const record = normalizeRecord(JSON.parse(line))
                if (record !== null && record.time >= sinceMs) out.push(record)
              } catch {}
            }
          } catch {}
        }
        const next = new Date(cursor)
        next.setDate(next.getDate() + 1)
        cursor = next.getTime()
      }
      out.sort((left, right) => left.time - right.time)
      return out
    },
    /** 删除超过保留期的日志文件；返回删除的文件数。 */
    prune(nowMs = Date.now(), days = this.retentionDays) {
      const cutoff = nowMs - days * DAY_MS
      let removed = 0
      if (!existsSync(dir)) return 0
      for (const file of readdirSync(dir)) {
        if (!FILE_RE.test(file)) continue
        const dayMs = new Date(file.slice(0, 10) + 'T00:00:00').getTime()
        if (Number.isFinite(dayMs) && dayMs < cutoff) {
          try {
            rmSync(join(dir, file), { force: true })
            removed += 1
          } catch {}
        }
      }
      return removed
    },
  }
}
