/**
 * 群消息聊天日志（P1 先落盘，P2 的 jev 快/慢路与断线补上下文都读它）。
 *
 * 布局：`<dir>/<group_id>/YYYY-MM-DD.jsonl`（本地时区），每行一条 JSON：
 *   { time, messageId, userId, nickname, role, text, raw }
 *
 * 纪律：落盘失败不阻断主流程（调用方 catch 后记日志）；读取容忍坏行。
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const DAY_MS = 24 * 60 * 60 * 1000
const FILE_RE = /^\d{4}-\d{2}-\d{2}\.jsonl$/

function localDateKey(ms) {
  const date = new Date(ms)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + d
}

function normalizeRecord(record) {
  if (record === null || typeof record !== 'object') return null
  return {
    time: Number.isFinite(record.time) ? record.time : Date.now(),
    messageId: String(record.messageId ?? ''),
    userId: String(record.userId ?? ''),
    nickname: typeof record.nickname === 'string' ? record.nickname : '',
    role: typeof record.role === 'string' ? record.role : '',
    text: typeof record.text === 'string' ? record.text : '',
    raw: typeof record.raw === 'string' ? record.raw : '',
  }
}

export function createChatLog({ dir, retentionDays = 7 }) {
  function groupDir(groupId) {
    return join(dir, String(groupId))
  }

  return {
    dir,
    retentionDays,
    fileFor(groupId, ms = Date.now()) {
      return join(groupDir(groupId), localDateKey(ms) + '.jsonl')
    },
    append(groupId, record) {
      const normalized = normalizeRecord(record)
      if (normalized === null) throw new Error('chat log record 非法')
      const targetDir = groupDir(groupId)
      mkdirSync(targetDir, { recursive: true })
      appendFileSync(this.fileFor(groupId, normalized.time), JSON.stringify(normalized) + '\n', 'utf8')
      return normalized
    },
    /** 读取 sinceMs 之后的记录（按时间升序）；文件不存在时返回 []。 */
    readRecent(groupId, sinceMs, nowMs = Date.now()) {
      const out = []
      const start = Math.min(sinceMs, nowMs)
      for (let cursor = start; cursor <= nowMs; cursor += DAY_MS) {
        const file = join(groupDir(groupId), localDateKey(cursor) + '.jsonl')
        if (!existsSync(file)) continue
        let text = ''
        try {
          text = readFileSync(file, 'utf8')
        } catch {
          continue
        }
        for (const line of text.split('\n')) {
          if (line === '') continue
          try {
            const record = normalizeRecord(JSON.parse(line))
            if (record !== null && record.time >= sinceMs) out.push(record)
          } catch {}
        }
      }
      out.sort((a, b) => a.time - b.time)
      return out
    },
    /** 删除超过保留期的日志文件；返回删除的文件数。 */
    prune(nowMs = Date.now(), days = this.retentionDays) {
      const cutoff = nowMs - days * DAY_MS
      let removed = 0
      if (!existsSync(dir)) return 0
      for (const group of readdirSync(dir, { withFileTypes: true })) {
        if (!group.isDirectory()) continue
        const targetDir = join(dir, group.name)
        for (const file of readdirSync(targetDir)) {
          if (!FILE_RE.test(file)) continue
          const dayMs = new Date(file.slice(0, 10) + 'T00:00:00').getTime()
          if (Number.isFinite(dayMs) && dayMs < cutoff) {
            try {
              rmSync(join(targetDir, file), { force: true })
              removed += 1
            } catch {}
          }
        }
      }
      return removed
    },
  }
}

export { localDateKey }
