/**
 * 会话映射持久化（P1）：group_id ↔ DSH sessionId。
 *
 * 文件：`~/.dsh/storages/dsh-qq-relay/mapping.json`（由组合根传入路径）。
 * 结构：
 *   { "\u003cgroup_id\u003e": { sessionId, workspacePath, title, createdAt } }
 *
 * 纪律：读容忍脏数据（坏文件当空映射），写用临时文件 + rename 原子替换。
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'

function validateEntry(entry) {
  if (entry === null || typeof entry !== 'object') return null
  if (typeof entry.sessionId !== 'string' || entry.sessionId === '') return null
  return {
    sessionId: entry.sessionId,
    workspacePath: typeof entry.workspacePath === 'string' ? entry.workspacePath : '',
    title: typeof entry.title === 'string' ? entry.title : '',
    createdAt: Number.isFinite(entry.createdAt) ? entry.createdAt : Date.now(),
  }
}

export function createMappingStore(filePath) {
  let data = null

  function load() {
    if (data !== null) return data
    data = {}
    try {
      if (existsSync(filePath)) {
        const parsed = JSON.parse(readFileSync(filePath, 'utf8'))
        if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
          for (const [key, value] of Object.entries(parsed)) {
            if (!/^\d+$/.test(key)) continue
            const entry = validateEntry(value)
            if (entry !== null) data[key] = entry
          }
        }
      }
    } catch {
      data = {}
    }
    return data
  }

  function save() {
    const dir = dirname(filePath)
    mkdirSync(dir, { recursive: true })
    const tmp = join(dir, '.' + String(process.pid) + '.mapping.json.tmp')
    writeFileSync(tmp, JSON.stringify(load(), null, 2) + '\n', 'utf8')
    try {
      renameSync(tmp, filePath)
    } catch (error) {
      try { unlinkSync(tmp) } catch {}
      throw error
    }
  }

  return {
    filePath,
    load,
    get(groupId) {
      return load()[String(groupId)]
    },
    set(groupId, entry) {
      const normalized = validateEntry({ ...entry, createdAt: entry?.createdAt ?? Date.now() })
      if (normalized === null) throw new Error('mapping entry 非法：缺 sessionId')
      load()[String(groupId)] = normalized
      save()
      return normalized
    },
    remove(groupId) {
      const current = load()
      const key = String(groupId)
      if (!(key in current)) return false
      delete current[key]
      save()
      return true
    },
    all() {
      return { ...load() }
    },
  }
}
