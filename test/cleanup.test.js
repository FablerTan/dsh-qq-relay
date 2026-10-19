/**
 * 聊天记录清理单测（v0.13.0，node:test）：保留天数校验 + 一次性清理
 * 聊天日文件与媒体日期目录；自动清理与设置页「立即清理」共用这两个函数。
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createChatLog } from '../lib/model/chat-log.js'
import {
  CLEANUP_MAX_DAYS,
  CLEANUP_MIN_DAYS,
  normalizeCleanupDays,
  pruneChatAndMedia,
} from '../lib/model/cleanup.js'

const DAY_MS = 24 * 60 * 60 * 1000

/** 本地日期键 YYYY-MM-DD（与 chat-log / media 的按天分片一致）。 */
function dateKey(ms) {
  const date = new Date(ms)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + d
}

test('cleanup：保留天数只接受 1..3650 的整数', () => {
  for (const value of [CLEANUP_MIN_DAYS, 7, 30, CLEANUP_MAX_DAYS, '30']) {
    const result = normalizeCleanupDays(value)
    assert.equal(result.ok, true, '应接受：' + String(value))
    assert.equal(result.days, Number(value))
  }
  for (const value of [0, -1, CLEANUP_MAX_DAYS + 1, 1.5, 'abc', '', null, undefined, {}]) {
    const result = normalizeCleanupDays(value)
    assert.equal(result.ok, false, '应拒绝：' + String(value))
    assert.equal(typeof result.message, 'string')
    assert.ok(result.message.includes('1..3650'))
  }
})

test('cleanup：一次清掉过期的聊天日文件与媒体日期目录，保留近期数据', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-qq-relay-cleanup-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))

  const now = Date.now()
  const oldKey = dateKey(now - 30 * DAY_MS)
  const newKey = dateKey(now)
  const project = join(root, 'project')
  const group = '100'

  const chatRoot = join(project, '.qq-relay', 'chat')
  mkdirSync(join(chatRoot, group), { recursive: true })
  const oldChat = join(chatRoot, group, oldKey + '.jsonl')
  const newChat = join(chatRoot, group, newKey + '.jsonl')
  writeFileSync(oldChat, JSON.stringify({ time: now - 30 * DAY_MS, text: '旧' }) + '\n', 'utf8')
  writeFileSync(newChat, JSON.stringify({ time: now, text: '新' }) + '\n', 'utf8')

  const mediaRoot = join(project, '.qq-relay', 'media', group)
  mkdirSync(join(mediaRoot, oldKey), { recursive: true })
  mkdirSync(join(mediaRoot, newKey), { recursive: true })
  mkdirSync(join(mediaRoot, 'not-a-date'), { recursive: true })
  writeFileSync(join(mediaRoot, oldKey, '1.jpg'), 'x', 'utf8')
  writeFileSync(join(mediaRoot, newKey, '2.jpg'), 'x', 'utf8')

  const chatLog = createChatLog({ dir: chatRoot })
  const projectDirFor = (groupId) => (String(groupId) === group ? project : '')

  const removed = pruneChatAndMedia({ chatLog, groupIds: [100, 200], projectDirFor, days: 7, nowMs: now })
  assert.deepEqual(removed, { chat: 1, media: 1 })

  assert.equal(existsSync(oldChat), false, '过期聊天文件应删除')
  assert.equal(existsSync(newChat), true, '近期聊天文件应保留')
  assert.equal(existsSync(join(mediaRoot, oldKey)), false, '过期媒体目录应删除')
  assert.equal(existsSync(join(mediaRoot, newKey)), true, '近期媒体目录应保留')
  assert.equal(existsSync(join(mediaRoot, 'not-a-date')), true, '非日期目录不动')

  // days <= 0 时是 no-op（自动清理的 0 = 永不删除）
  const noop = pruneChatAndMedia({ chatLog, groupIds: [100], projectDirFor, days: 0, nowMs: now })
  assert.deepEqual(noop, { chat: 0, media: 0 })
})
