/**
 * 每群闸门状态持久化 + 单实例文件锁（P1 只用到去重与 lastBotSpeakAt 等基础字段）。
 *
 * 状态文件：`~/.dsh/storages/dsh-qq-relay/state.json`
 *   { groups: { "<group_id>": { seen: ["<message_id>", ...], lastBotSpeakAt, lastUserMessageAt,
 *                               lastBotMessageId, cooldownUntil } } }
 *
 * 锁文件：`~/.dsh/storages/dsh-qq-relay/relay.lock`（JSON：{ pid, startedAt, host }）。
 * 进程崩溃留下的陈旧锁，在 pid 不存在时自动接管。
 */

import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync, openSync, closeSync, rmSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { hostname } from 'node:os'

const SEEN_LIMIT = 500

function emptyGroupState() {
  return {
    seen: [],
    lastBotSpeakAt: 0,
    lastUserMessageAt: 0,
    lastBotMessageId: '',
    cooldownUntil: 0,
  }
}

function normalizeGroupState(raw) {
  const base = emptyGroupState()
  if (raw === null || typeof raw !== 'object') return base
  return {
    seen: Array.isArray(raw.seen) ? raw.seen.filter((id) => typeof id === 'string' || typeof id === 'number').map(String).slice(-SEEN_LIMIT) : [],
    lastBotSpeakAt: Number.isFinite(raw.lastBotSpeakAt) ? raw.lastBotSpeakAt : 0,
    lastUserMessageAt: Number.isFinite(raw.lastUserMessageAt) ? raw.lastUserMessageAt : 0,
    lastBotMessageId: typeof raw.lastBotMessageId === 'string' ? raw.lastBotMessageId : '',
    cooldownUntil: Number.isFinite(raw.cooldownUntil) ? raw.cooldownUntil : 0,
  }
}

export function createStateStore(filePath) {
  let data = null

  function load() {
    if (data !== null) return data
    data = { groups: {} }
    try {
      if (existsSync(filePath)) {
        const parsed = JSON.parse(readFileSync(filePath, 'utf8'))
        if (parsed !== null && typeof parsed === 'object' && parsed.groups !== null && typeof parsed.groups === 'object') {
          for (const [key, value] of Object.entries(parsed.groups)) {
            if (/^\d+$/.test(key)) data.groups[key] = normalizeGroupState(value)
          }
        }
      }
    } catch {
      data = { groups: {} }
    }
    return data
  }

  function save() {
    const dir = dirname(filePath)
    mkdirSync(dir, { recursive: true })
    const tmp = join(dir, '.' + String(process.pid) + '.state.json.tmp')
    writeFileSync(tmp, JSON.stringify(load(), null, 2) + '\n', 'utf8')
    try {
      renameSync(tmp, filePath)
    } catch (error) {
      try { unlinkSync(tmp) } catch {}
      throw error
    }
  }

  function groupState(groupId) {
    const key = String(groupId)
    const groups = load().groups
    if (groups[key] === undefined) groups[key] = emptyGroupState()
    return groups[key]
  }

  return {
    filePath,
    load,
    get: (groupId) => ({ ...groupState(groupId), seen: [...groupState(groupId).seen] }),
    hasSeen(groupId, messageId) {
      const id = String(messageId)
      return groupState(groupId).seen.includes(id)
    },
    /** 记录已处理的消息 id；返回 false 表示重复（调用方应丢弃）。 */
    markSeen(groupId, messageId) {
      const state = groupState(groupId)
      const id = String(messageId)
      if (state.seen.includes(id)) return false
      state.seen.push(id)
      if (state.seen.length > SEEN_LIMIT) state.seen = state.seen.slice(-SEEN_LIMIT)
      save()
      return true
    },
    update(groupId, patch) {
      const state = groupState(groupId)
      if (patch !== null && typeof patch === 'object') {
        for (const key of ['lastBotSpeakAt', 'lastUserMessageAt', 'lastBotMessageId', 'cooldownUntil']) {
          if (patch[key] !== undefined) state[key] = patch[key]
        }
      }
      save()
      return { ...state, seen: [...state.seen] }
    },
  }
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

export { SEEN_LIMIT, emptyGroupState }
