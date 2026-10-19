/**
 * 群消息聊天日志（P1 落盘；P4 起按「群项目」路由到 `<project>/.qq-relay/chat/<group_id>/`）。
 *
 * 布局：`<root>/<group_id>/YYYY-MM-DD.jsonl`（本地时区），每行一条 JSON：
 *   { time, groupId, messageId, userId, nickname, card, role, text, mentionsSelf, replyToId, raw }
 *
 * `root` 由组合根注入的 `rootFor(groupId)` 解析（群项目目录 + `.qq-relay/chat`）；
 * 兼容旧的单根模式（`dir`），单测与迁移期仍可用。
 *
 * 保留策略默认「永不删除」（`chatRetentionDays: 0`）；传 `days > 0` 时按天文件清理。
 * 旧全局日志用 {@link migrateLegacyChatLogs} 一次性搬进各群项目（幂等、不覆盖）。
 *
 * 纪律：落盘失败不阻断主流程（调用方 catch 后记日志）；读取容忍坏行。
 */

import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'

import { RELAY_DIR_NAME, ensureRelayDir } from './project.js'

const DAY_MS = 24 * 60 * 60 * 1000

/** 日志文件名形态（迁移 / 清理用）。 */
export const CHAT_FILE_RE = /^\d{4}-\d{2}-\d{2}\.jsonl$/

/** 旧全局日志的迁移标记文件名（放在插件存储根）。 */
export const CHAT_MIGRATION_MARKER = 'chat-migration.json'

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
    groupId: String(record.groupId ?? ''),
    messageId: String(record.messageId ?? ''),
    userId: String(record.userId ?? ''),
    nickname: typeof record.nickname === 'string' ? record.nickname : '',
    card: typeof record.card === 'string' ? record.card : '',
    role: typeof record.role === 'string' ? record.role : '',
    text: typeof record.text === 'string' ? record.text : '',
    mentionsSelf: record.mentionsSelf === true,
    replyToId: typeof record.replyToId === 'string' && record.replyToId !== '' ? record.replyToId : null,
    raw: typeof record.raw === 'string' ? record.raw : '',
  }
}

/**
 * 聊天日志读写器。
 *
 * @param options.rootFor - `(groupId) => 聊天根目录`（按群项目解析；优先）
 * @param options.dir - 单一根目录（旧用法 / 单测；`rootFor` 缺省时用它）
 * @param options.retentionDays - 默认保留天数（0 = 永不删除）
 * @returns `{ dir, retentionDays, rootFor, fileFor, append, readRecent, prune }`
 */
export function createChatLog({ dir = '', rootFor = null, retentionDays = 7 } = {}) {
  const resolveRoot = typeof rootFor === 'function' ? rootFor : () => dir

  function rootOf(groupId) {
    const root = resolveRoot(groupId)
    if (typeof root !== 'string' || root === '') throw new Error('聊天日志根目录未配置')
    return root
  }

  function groupDir(groupId) {
    return join(rootOf(groupId), String(groupId))
  }

  function fileFor(groupId, ms = Date.now()) {
    return join(groupDir(groupId), localDateKey(ms) + '.jsonl')
  }

  /** 清理某个群目录里超过保留期的文件；返回删除数。 */
  function pruneDir(targetDir, cutoff) {
    let removed = 0
    if (!existsSync(targetDir)) return 0
    for (const file of readdirSync(targetDir)) {
      if (!CHAT_FILE_RE.test(file)) continue
      const dayMs = new Date(file.slice(0, 10) + 'T00:00:00').getTime()
      if (Number.isFinite(dayMs) && dayMs < cutoff) {
        try {
          rmSync(join(targetDir, file), { force: true })
          removed += 1
        } catch {}
      }
    }
    return removed
  }

  return {
    dir,
    retentionDays,
    rootFor: resolveRoot,
    fileFor,
    append(groupId, record) {
      const normalized = normalizeRecord({ ...record, groupId: record?.groupId ?? String(groupId) })
      if (normalized === null) throw new Error('chat log record 非法')
      const targetDir = groupDir(groupId)
      mkdirSync(targetDir, { recursive: true })
      appendFileSync(fileFor(groupId, normalized.time), JSON.stringify(normalized) + '\n', 'utf8')
      return normalized
    },
    /** 读取 sinceMs 之后的记录（按时间升序）；文件不存在时返回 []。 */
    readRecent(groupId, sinceMs, nowMs = Date.now()) {
      const out = []
      const group = groupDir(groupId)
      const startDay = new Date(Math.min(sinceMs, nowMs))
      startDay.setHours(0, 0, 0, 0)
      const endDay = new Date(nowMs)
      endDay.setHours(0, 0, 0, 0)
      for (let cursor = startDay.getTime(); cursor <= endDay.getTime();) {
        const file = join(group, localDateKey(cursor) + '.jsonl')
        if (existsSync(file)) {
          try {
            const text = readFileSync(file, 'utf8')
            for (const line of text.split('\n')) {
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
      out.sort((a, b) => a.time - b.time)
      return out
    },
    /**
     * 删除超过保留期的日志文件。
     *
     * @param nowMs - 当前时间
     * @param days - 保留天数（`<= 0` 表示永不删除）
     * @param groupIds - 要清理的群号列表；缺省时仅在单根模式（`dir`）下遍历
     * @returns 删除的文件数
     */
    prune(nowMs = Date.now(), days = retentionDays, groupIds = null) {
      const keepDays = Number.isFinite(days) ? days : retentionDays
      if (!(keepDays > 0)) return 0
      const cutoff = nowMs - keepDays * DAY_MS
      let removed = 0
      if (Array.isArray(groupIds)) {
        for (const groupId of groupIds) {
          try {
            removed += pruneDir(groupDir(groupId), cutoff)
          } catch {}
        }
        return removed
      }
      if (dir === '' || !existsSync(dir)) return 0
      for (const group of readdirSync(dir, { withFileTypes: true })) {
        if (!group.isDirectory()) continue
        removed += pruneDir(join(dir, group.name), cutoff)
      }
      return removed
    },
  }
}

/**
 * 把旧全局聊天日志（`<legacyDir>/<group_id>/*.jsonl`）一次性搬进各群项目。
 *
 * 幂等：`markerPath` 里的 `done` 为 true 时直接跳过；目标已存在同名文件时跳过
 * （不覆盖，保留旧文件）。跨卷 rename 失败时退化为 copy + unlink。
 * 失败不阻断启动，只记日志，且标记保持 `done: false` 供下次重试。
 *
 * @param options.legacyDir - 旧根目录（`~/.dsh/storages/dsh-qq-relay/chat`）
 * @param options.markerPath - 迁移标记文件路径
 * @param options.resolveProjectDir - `(groupId) => 项目目录`（空串表示无法解析）
 * @param options.logger - 可选 `{ warn, info }`
 * @param options.now - 时间源（单测可注入）
 * @returns `{ done, migrated: { [gid]: count }, skipped, failures }`
 */
export function migrateLegacyChatLogs({ legacyDir, markerPath, resolveProjectDir, logger = null, now = () => Date.now() }) {
  const summary = { done: false, migrated: {}, skipped: 0, failures: [] }
  if (typeof legacyDir !== 'string' || legacyDir === '' || typeof markerPath !== 'string' || markerPath === '') {
    return summary
  }
  const log = (level, message) => { try { logger?.[level]?.(message) } catch {} }

  if (existsSync(markerPath)) {
    try {
      const marker = JSON.parse(readFileSync(markerPath, 'utf8'))
      if (marker !== null && typeof marker === 'object' && marker.done === true) {
        return { ...summary, done: true, migrated: marker.moved ?? {} }
      }
    } catch {}
  }
  if (!existsSync(legacyDir)) return { ...summary, done: true }

  for (const entry of readdirSync(legacyDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^\d+$/.test(entry.name)) continue
    const groupId = entry.name
    let projectDir
    try {
      projectDir = resolveProjectDir(groupId)
    } catch (error) {
      summary.failures.push(groupId + '：' + String(error?.message ?? error))
      continue
    }
    if (typeof projectDir !== 'string' || projectDir === '') {
      summary.failures.push(groupId + '：没有可用的项目目录')
      continue
    }
    const targetDir = join(projectDir, RELAY_DIR_NAME, 'chat', groupId)
    let moved = 0
    let files = []
    try {
      ensureRelayDir(projectDir, { logger })
      files = readdirSync(join(legacyDir, groupId))
    } catch (error) {
      summary.failures.push(groupId + '：' + String(error?.message ?? error))
      continue
    }
    for (const file of files) {
      if (!CHAT_FILE_RE.test(file)) continue
      const source = join(legacyDir, groupId, file)
      const target = join(targetDir, file)
      try {
        mkdirSync(targetDir, { recursive: true })
        if (existsSync(target)) {
          summary.skipped += 1
          continue
        }
        try {
          renameSync(source, target)
        } catch {
          copyFileSync(source, target)
          unlinkSync(source)
        }
        moved += 1
      } catch (error) {
        summary.failures.push(groupId + '/' + file + '：' + String(error?.message ?? error))
      }
    }
    if (moved > 0) summary.migrated[groupId] = moved
    try {
      if (readdirSync(join(legacyDir, groupId)).length === 0) rmdirSync(join(legacyDir, groupId))
    } catch {}
  }

  summary.done = summary.failures.length === 0
  try {
    mkdirSync(dirname(markerPath), { recursive: true })
    writeFileSync(markerPath, JSON.stringify({
      done: summary.done,
      at: now(),
      moved: summary.migrated,
      skipped: summary.skipped,
      failures: summary.failures,
    }) + '\n', 'utf8')
  } catch (error) {
    log('warn', '[relay] 写入聊天日志迁移标记失败：' + String(error?.message ?? error))
  }
  if (summary.failures.length > 0) {
    log('warn', '[relay] 聊天日志迁移有 ' + String(summary.failures.length) + ' 项失败（下次启动重试）：'
      + summary.failures.slice(0, 3).join('；'))
  }
  return summary
}

export { localDateKey }
