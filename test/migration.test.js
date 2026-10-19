/**
 * 聊天日志迁移单测（node:test，零依赖）：旧全局 chat/ → 各群项目的 .qq-relay/chat/。
 * 覆盖幂等、目标已存在跳过、无法解析项目时不写 done（下次重试）。
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  CHAT_MIGRATION_MARKER,
  createChatLog,
  localDateKey,
  migrateLegacyChatLogs,
} from '../lib/model/chat-log.js'
import { RELAY_DIR_NAME } from '../lib/model/project.js'

function tempDir(t) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-qq-relay-migration-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

function writeLegacy(legacyDir, groupId, date, text) {
  const dir = join(legacyDir, String(groupId))
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, date + '.jsonl'), JSON.stringify({ time: Date.now(), text }) + '\n', 'utf8')
}

test('migration：旧日志搬进群项目，写标记且幂等', (t) => {
  const dir = tempDir(t)
  const legacyDir = join(dir, 'chat')
  const markerPath = join(dir, CHAT_MIGRATION_MARKER)
  const project = join(dir, 'my-app')
  writeLegacy(legacyDir, 100, '2026-10-19', '旧消息')

  const first = migrateLegacyChatLogs({
    legacyDir,
    markerPath,
    resolveProjectDir: () => project,
    now: () => 123,
  })
  assert.equal(first.done, true)
  assert.deepEqual(first.failures, [])
  assert.deepEqual(first.migrated, { 100: 1 })
  assert.equal(existsSync(join(legacyDir, '100', '2026-10-19.jsonl')), false, '旧文件应被移走')
  const target = join(project, RELAY_DIR_NAME, 'chat', '100', '2026-10-19.jsonl')
  assert.equal(existsSync(target), true)
  assert.equal(readFileSync(target, 'utf8').includes('旧消息'), true)
  assert.equal(existsSync(join(project, RELAY_DIR_NAME, '.gitignore')), true)
  const marker = JSON.parse(readFileSync(markerPath, 'utf8'))
  assert.equal(marker.done, true)
  assert.equal(marker.at, 123)

  // 幂等：第二次直接按标记跳过，不再统计
  const second = migrateLegacyChatLogs({
    legacyDir,
    markerPath,
    resolveProjectDir: () => project,
    now: () => 456,
  })
  assert.equal(second.done, true)
  assert.deepEqual(second.migrated, { 100: 1 })
})

test('migration：目标已有同名文件时跳过（不覆盖）', (t) => {
  const dir = tempDir(t)
  const legacyDir = join(dir, 'chat')
  const markerPath = join(dir, CHAT_MIGRATION_MARKER)
  const project = join(dir, 'proj')
  writeLegacy(legacyDir, 100, '2026-10-19', '旧内容')
  const targetDir = join(project, RELAY_DIR_NAME, 'chat', '100')
  mkdirSync(targetDir, { recursive: true })
  const target = join(targetDir, '2026-10-19.jsonl')
  writeFileSync(target, '新内容\n', 'utf8')

  const result = migrateLegacyChatLogs({ legacyDir, markerPath, resolveProjectDir: () => project })
  assert.equal(result.done, true)
  assert.equal(result.skipped, 1)
  assert.deepEqual(result.migrated, {})
  assert.equal(readFileSync(target, 'utf8'), '新内容\n')
  assert.equal(existsSync(join(legacyDir, '100', '2026-10-19.jsonl')), true, '跳过的旧文件保留')
})

test('migration：无法解析项目时失败并保持 done=false 供下次重试', (t) => {
  const dir = tempDir(t)
  const legacyDir = join(dir, 'chat')
  const markerPath = join(dir, CHAT_MIGRATION_MARKER)
  writeLegacy(legacyDir, 100, '2026-10-19', 'x')

  const first = migrateLegacyChatLogs({ legacyDir, markerPath, resolveProjectDir: () => '' })
  assert.equal(first.done, false)
  assert.equal(first.failures.length, 1)
  const marker = JSON.parse(readFileSync(markerPath, 'utf8'))
  assert.equal(marker.done, false)

  const project = join(dir, 'proj')
  const second = migrateLegacyChatLogs({ legacyDir, markerPath, resolveProjectDir: () => project })
  assert.equal(second.done, true)
  assert.deepEqual(second.migrated, { 100: 1 })
  assert.equal(existsSync(join(project, RELAY_DIR_NAME, 'chat', '100', '2026-10-19.jsonl')), true)
})

test('migration：旧目录不存在视为已完成，不写标记', (t) => {
  const dir = tempDir(t)
  const result = migrateLegacyChatLogs({
    legacyDir: join(dir, 'missing'),
    markerPath: join(dir, CHAT_MIGRATION_MARKER),
    resolveProjectDir: () => join(dir, 'proj'),
  })
  assert.equal(result.done, true)
  assert.deepEqual(result.migrated, {})
  assert.equal(existsSync(join(dir, CHAT_MIGRATION_MARKER)), false)
})

test('migration：迁移后的记录仍能被 chat log 读到', (t) => {
  const dir = tempDir(t)
  const legacyDir = join(dir, 'chat')
  const project = join(dir, 'proj')
  const now = Date.now()
  writeLegacy(legacyDir, 100, localDateKey(now), '可读')
  migrateLegacyChatLogs({
    legacyDir,
    markerPath: join(dir, CHAT_MIGRATION_MARKER),
    resolveProjectDir: () => project,
  })
  const chatLog = createChatLog({
    rootFor: () => join(project, RELAY_DIR_NAME, 'chat'),
  })
  const records = chatLog.readRecent(100, now - 60 * 1000)
  assert.equal(records.length, 1)
  assert.equal(records[0].text, '可读')
})
