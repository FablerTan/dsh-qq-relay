/**
 * 每群闸门状态持久化 + 单实例文件锁（P2.1 起按群分文件）。
 *
 * 状态目录：`~/.dsh/storages/dsh-qq-relay/state/<group_id>.json`（一群体积小、写入互不干扰）
 *   { groupId, seen, lastBotSpeakAt, lastReplyAt, lastUserMessageAt, lastBotMessageId,
 *     cooldownUntil, pending, evaluating, dshBusy, updatedAt }
 *
 * 旧版单文件 `state.json` 用 {@link migrateLegacyState} 一次性导入；原文件保留不动，
 * 在状态目录写 `.legacy-migrated` 标记避免重复导入（方便回滚旧版本）。
 *
 * 锁文件：`~/.dsh/storages/dsh-qq-relay/relay.lock`（JSON：{ pid, startedAt, host }）。
 * 进程崩溃留下的陈旧锁，在 pid 不存在时自动接管。
 *
 * 纪律：读容忍脏数据（坏文件当空状态），写用临时文件 + rename 原子替换；
 * 任何读写失败都不抛到主流程之外（组合根按日志降级）。
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync, openSync, closeSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { hostname } from 'node:os'

import { normalizeMediaRecords } from './media.js'

/** seen 保留的最近 message_id 条数（1 小时窗口足够）。 */
export const SEEN_LIMIT = 500
/** pending 保留的最近消息条数（超过时丢最旧）。 */
export const PENDING_LIMIT = 200

const GROUP_FILE_RE = /^(\d+)\.json$/

/** 空状态（`groupId` 由调用方补齐）。 */
export function emptyGroupState(groupId = 0) {
  return {
    groupId: Number(groupId) || 0,
    seen: [],
    lastBotSpeakAt: 0,
    lastReplyAt: 0,
    lastUserMessageAt: 0,
    lastBotMessageId: '',
    cooldownUntil: 0,
    pending: [],
    evaluating: false,
    dshBusy: false,
    updatedAt: 0,
  }
}

function normalizePendingRecord(raw) {
  if (raw === null || typeof raw !== 'object') return null
  const out = {
    messageId: String(raw.messageId ?? ''),
    groupId: String(raw.groupId ?? ''),
    userId: String(raw.userId ?? ''),
    nickname: typeof raw.nickname === 'string' ? raw.nickname : '',
    card: typeof raw.card === 'string' ? raw.card : '',
    role: typeof raw.role === 'string' ? raw.role : '',
    text: typeof raw.text === 'string' ? raw.text : '',
    time: Number.isFinite(raw.time) ? raw.time : 0,
    mentionsSelf: raw.mentionsSelf === true,
    replyToId: typeof raw.replyToId === 'string' ? raw.replyToId : '',
  }
  const media = normalizeMediaRecords(raw.media)
  if (media.length > 0) out.media = media
  return out
}

/** 把磁盘上的任意数据规范化为群状态；未知字段丢弃。 */
export function normalizeGroupState(raw, groupId = 0) {
  const base = emptyGroupState(groupId)
  if (raw === null || typeof raw !== 'object') return base
  const pending = Array.isArray(raw.pending)
    ? raw.pending.map(normalizePendingRecord).filter((record) => record !== null).slice(-PENDING_LIMIT)
    : []
  return {
    groupId: Number.isInteger(raw.groupId) && raw.groupId > 0 ? raw.groupId : base.groupId,
    seen: Array.isArray(raw.seen)
      ? raw.seen.filter((id) => typeof id === 'string' || typeof id === 'number').map(String).slice(-SEEN_LIMIT)
      : [],
    lastBotSpeakAt: Number.isFinite(raw.lastBotSpeakAt) ? raw.lastBotSpeakAt : 0,
    lastReplyAt: Number.isFinite(raw.lastReplyAt) ? raw.lastReplyAt : 0,
    lastUserMessageAt: Number.isFinite(raw.lastUserMessageAt) ? raw.lastUserMessageAt : 0,
    lastBotMessageId: typeof raw.lastBotMessageId === 'string' ? raw.lastBotMessageId : '',
    cooldownUntil: Number.isFinite(raw.cooldownUntil) ? raw.cooldownUntil : 0,
    pending,
    evaluating: raw.evaluating === true,
    dshBusy: raw.dshBusy === true,
    updatedAt: Number.isFinite(raw.updatedAt) ? raw.updatedAt : 0,
  }
}

const UPDATABLE_KEYS = Object.freeze([
  'lastBotSpeakAt',
  'lastReplyAt',
  'lastUserMessageAt',
  'lastBotMessageId',
  'cooldownUntil',
  'pending',
  'evaluating',
  'dshBusy',
])

/**
 * 每群状态读写器。
 *
 * @param options.dir - 状态目录（绝对路径，单测传临时目录）
 * @param options.logger - 可选 `{ warn }`，读写失败时记录
 * @returns `{ dir, fileFor, get, update, hasSeen, markSeen, all }`
 */
export function createStateStore({ dir, logger = null } = {}) {
  if (typeof dir !== 'string' || dir === '') throw new Error('createStateStore 需要 dir')
  const cache = new Map()

  function log(level, message) {
    try { logger?.[level]?.(message) } catch {}
  }

  function fileFor(groupId) {
    return join(dir, String(groupId) + '.json')
  }

  function readGroup(groupId) {
    const key = String(groupId)
    const cached = cache.get(key)
    if (cached !== undefined) return cached
    let state = emptyGroupState(Number(groupId) || 0)
    try {
      const file = fileFor(key)
      if (existsSync(file)) {
        state = normalizeGroupState(JSON.parse(readFileSync(file, 'utf8')), Number(groupId) || 0)
      }
    } catch (error) {
      log('warn', '[relay] 读取状态 ' + fileFor(key) + ' 失败，按空状态处理：' + String(error?.message ?? error))
    }
    cache.set(key, state)
    return state
  }

  function writeGroup(groupId) {
    const key = String(groupId)
    const state = cache.get(key)
    if (state === undefined) return
    state.updatedAt = Date.now()
    mkdirSync(dir, { recursive: true })
    const file = fileFor(key)
    const tmp = join(dir, '.' + String(process.pid) + '.' + key + '.json.tmp')
    writeFileSync(tmp, JSON.stringify(state, null, 2) + '\n', 'utf8')
    try {
      renameSync(tmp, file)
    } catch (error) {
      try { unlinkSync(tmp) } catch {}
      throw error
    }
  }

  function clone(state) {
    return {
      ...state,
      seen: [...state.seen],
      pending: state.pending.map((record) => ({ ...record })),
    }
  }

  return {
    dir,
    fileFor,
    /** 读取群状态（浅拷贝；未知群返回空状态）。 */
    get(groupId) {
      return clone(readGroup(groupId))
    },
    /** 合并字段并原子落盘；返回更新后的状态。 */
    update(groupId, patch) {
      const state = readGroup(groupId)
      if (patch !== null && typeof patch === 'object') {
        for (const key of UPDATABLE_KEYS) {
          if (patch[key] === undefined) continue
          if (key === 'pending') {
            state.pending = Array.isArray(patch.pending)
              ? patch.pending.map(normalizePendingRecord).filter((record) => record !== null).slice(-PENDING_LIMIT)
              : []
          } else if (key === 'evaluating' || key === 'dshBusy') {
            state[key] = patch[key] === true
          } else {
            state[key] = patch[key]
          }
        }
      }
      try {
        writeGroup(groupId)
      } catch (error) {
        log('warn', '[relay] 写入状态 ' + fileFor(groupId) + ' 失败：' + String(error?.message ?? error))
      }
      return clone(state)
    },
    hasSeen(groupId, messageId) {
      return readGroup(groupId).seen.includes(String(messageId))
    },
    /** 记录已处理的消息 id；返回 false 表示重复（调用方应丢弃）。 */
    markSeen(groupId, messageId) {
      const state = readGroup(groupId)
      const id = String(messageId)
      if (state.seen.includes(id)) return false
      state.seen.push(id)
      if (state.seen.length > SEEN_LIMIT) state.seen = state.seen.slice(-SEEN_LIMIT)
      try {
        writeGroup(groupId)
      } catch (error) {
        log('warn', '[relay] 写入状态 ' + fileFor(groupId) + ' 失败：' + String(error?.message ?? error))
      }
      return true
    },
    /** 所有已持久化的群状态（群号升序）。 */
    all() {
      const out = new Map()
      let names = []
      try {
        names = readdirSync(dir)
      } catch {
        return out
      }
      for (const name of names.sort()) {
        const match = GROUP_FILE_RE.exec(name)
        if (match === null) continue
        out.set(match[1], clone(readGroup(match[1])))
      }
      return out
    },
  }
}

/**
 * 一次性导入旧版单文件 `state.json`（P1 布局）。
 *
 * 只导入还没有独立文件的群；原文件保留（回滚旧版本仍可读），
 * 在状态目录写 `.legacy-migrated` 标记避免重复导入。
 *
 * @param legacyFile - 旧 `state.json` 路径
 * @param store - {@link createStateStore} 的返回值
 * @param logger - 可选 `{ warn }`
 * @returns `{ migrated: number[], error?: string }`
 */
export function migrateLegacyState(legacyFile, store, logger = null) {
  const result = { migrated: [] }
  try {
    if (store === null || typeof store?.dir !== 'string') return result
    const marker = join(store.dir, '.legacy-migrated')
    if (existsSync(marker) || !existsSync(legacyFile)) return result
    let parsed = null
    try {
      parsed = JSON.parse(readFileSync(legacyFile, 'utf8'))
    } catch {
      parsed = null
    }
    const groups = parsed !== null && typeof parsed === 'object' && parsed.groups !== null && typeof parsed.groups === 'object'
      ? parsed.groups
      : {}
    for (const [key, value] of Object.entries(groups)) {
      if (!/^\d+$/.test(key)) continue
      if (existsSync(store.fileFor(key))) continue
      const normalized = normalizeGroupState(value, Number(key))
      store.update(key, {
        lastBotSpeakAt: normalized.lastBotSpeakAt,
        lastReplyAt: normalized.lastReplyAt,
        lastUserMessageAt: normalized.lastUserMessageAt,
        lastBotMessageId: normalized.lastBotMessageId,
        cooldownUntil: normalized.cooldownUntil,
        pending: normalized.pending,
      })
      for (const id of normalized.seen) store.markSeen(key, id)
      result.migrated.push(Number(key))
    }
    mkdirSync(store.dir, { recursive: true })
    writeFileSync(marker, JSON.stringify({ migratedAt: Date.now(), groups: result.migrated }) + '\n', 'utf8')
  } catch (error) {
    result.error = String(error?.message ?? error)
    try { logger?.warn?.('[relay] 迁移旧状态失败：' + result.error) } catch {}
  }
  return result
}

function processAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/**
 * 单实例锁：同一 bot 只允许一个 relay 进程连接。
 * @returns {{ ok: true, release: () => void } | { ok: false, holder: object | null }}
 */
export function acquireLock(filePath) {
  mkdirSync(dirname(filePath), { recursive: true })

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = openSync(filePath, 'wx')
      try {
        writeFileSync(fd, JSON.stringify({ pid: process.pid, startedAt: Date.now(), host: hostname() }) + '\n', 'utf8')
      } finally {
        closeSync(fd)
      }
      return {
        ok: true,
        release() {
          try { rmSync(filePath, { force: true }) } catch {}
        },
      }
    } catch (error) {
      if (error?.code !== 'EEXIST') {
        return { ok: false, holder: null, error: String(error?.message ?? error) }
      }
      let holder = null
      try {
        holder = JSON.parse(readFileSync(filePath, 'utf8'))
      } catch {}
      if (holder !== null && processAlive(holder.pid)) return { ok: false, holder }
      // 陈旧锁：清掉重试一次
      try { unlinkSync(filePath) } catch {}
    }
  }
  return { ok: false, holder: null }
}
