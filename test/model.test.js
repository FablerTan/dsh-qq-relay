/**
 * model 层单测（node:test，零依赖）。
 * 运行：pnpm test  ==  node --test test/
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir, homedir, hostname } from 'node:os'
import { join } from 'node:path'

import { DEFAULT_CONFIG, expandHome, formatSessionTitle, normalizeConfig } from '../lib/model/config.js'
import { createMappingStore } from '../lib/model/mapping.js'
import { createStateStore, acquireLock } from '../lib/model/state.js'
import { createChatLog, localDateKey } from '../lib/model/chat-log.js'
import { buildReplyChunks, nextBackoff, shouldRetryTransport } from '../lib/model/reply.js'

function tempDir(t) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-qq-relay-test-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

test('config：合法配置被规范化', () => {
  const result = normalizeConfig({
    wsUrl: 'ws://127.0.0.1:3001',
    accessToken: 'token',
    selfId: 10001,
    groups: [10002, '10002', 42],
    workspace: '~/dsh/qq-relay-ws',
    replyChunkSize: 500,
  })
  assert.equal(result.ok, true)
  assert.deepEqual(result.problems, [])
  assert.deepEqual(result.config.groups, [10002, 42])
  assert.equal(result.config.workspace, join(homedir(), 'dsh/qq-relay-ws'))
  assert.equal(result.config.reconnect.minMs, 1000)
  assert.equal(result.config.replyChunkSize, 500)
  assert.deepEqual(result.config.commandPrefixes, ['/dsh'])
})

test('config：缺必填项时 fail closed', () => {
  const result = normalizeConfig({})
  assert.equal(result.ok, false)
  assert.ok(result.problems.some((p) => p.includes('wsUrl')))
  assert.ok(result.problems.some((p) => p.includes('accessToken')))
  assert.ok(result.problems.some((p) => p.includes('selfId')))
})

test('config：commandPrefixes 可覆盖且拒绝非法值', () => {
  const custom = normalizeConfig({ wsUrl: 'ws://x', accessToken: 't', selfId: 1, commandPrefixes: ['!', ' /dsh '] })
  assert.deepEqual(custom.config.commandPrefixes, ['!', '/dsh'])

  const invalid = normalizeConfig({ wsUrl: 'ws://x', accessToken: 't', selfId: 1, commandPrefixes: [''] })
  assert.equal(invalid.ok, false)
  assert.ok(invalid.problems.some((p) => p.includes('commandPrefixes')))
})

test('config：非法 wsUrl / groups / chunkSize 被拒绝', () => {
  const result = normalizeConfig({
    wsUrl: 'http://x',
    accessToken: 't',
    selfId: 'abc',
    groups: ['x', -1],
    replyChunkSize: 1,
  })
  assert.equal(result.ok, false)
  assert.ok(result.problems.some((p) => p.includes('ws://')))
  assert.ok(result.problems.some((p) => p.includes('groups')))
  assert.ok(result.problems.some((p) => p.includes('replyChunkSize')))
})

test('config：expandHome 与标题模板', () => {
  assert.equal(expandHome('~'), homedir())
  assert.equal(expandHome('~/a'), join(homedir(), 'a'))
  assert.equal(expandHome('/abs'), '/abs')
  assert.equal(formatSessionTitle('QQ群：{groupName}', { groupId: 1, groupName: '测试群' }), 'QQ群：测试群')
  assert.equal(formatSessionTitle('{groupId}', { groupId: 42 }), '42')
  assert.equal(formatSessionTitle(DEFAULT_CONFIG.sessionTitle, { groupId: 7 }), 'QQ群：群 7')
})

test('mapping：增删查与持久化', (t) => {
  const dir = tempDir(t)
  const file = join(dir, 'mapping.json')
  const store = createMappingStore(file)
  store.set(10002, { sessionId: 'qq-group-10002', workspacePath: '/tmp/ws', title: 'QQ群：测试' })
  assert.equal(store.get(10002).sessionId, 'qq-group-10002')

  const reloaded = createMappingStore(file)
  assert.equal(reloaded.get('10002').title, 'QQ群：测试')
  assert.deepEqual(Object.keys(reloaded.all()), ['10002'])
  assert.equal(reloaded.get(1), undefined)

  assert.equal(reloaded.remove(10002), true)
  assert.equal(reloaded.remove(10002), false)
  assert.throws(() => reloaded.set(1, {}), /sessionId/)
})

test('mapping：坏文件退化为空映射', (t) => {
  const dir = tempDir(t)
  const file = join(dir, 'mapping.json')
  writeFileSync(file, '{ not json', 'utf8')
  const store = createMappingStore(file)
  assert.deepEqual(store.all(), {})
})

test('state：去重、更新与持久化', (t) => {
  const dir = tempDir(t)
  const file = join(dir, 'state.json')
  const store = createStateStore(file)

  assert.equal(store.markSeen(1, 'm1'), true)
  assert.equal(store.markSeen(1, 'm1'), false)
  assert.equal(store.hasSeen(1, 'm1'), true)
  assert.equal(store.hasSeen(1, 'm2'), false)

  store.update(1, { lastBotSpeakAt: 123, lastBotMessageId: 'm1' })
  const reloaded = createStateStore(file)
  assert.equal(reloaded.get(1).lastBotSpeakAt, 123)
  assert.equal(reloaded.get(1).lastBotMessageId, 'm1')
  assert.equal(reloaded.hasSeen(1, 'm1'), true)
})

test('lock：单实例互斥与陈旧锁接管', (t) => {
  const dir = tempDir(t)
  const file = join(dir, 'relay.lock')

  const first = acquireLock(file)
  assert.equal(first.ok, true)
  const second = acquireLock(file)
  assert.equal(second.ok, false)
  assert.equal(second.holder.pid, process.pid)

  first.release()
  const third = acquireLock(file)
  assert.equal(third.ok, true)
  third.release()

  // 伪造成已死进程留下的锁
  writeFileSync(file, JSON.stringify({ pid: 999999, startedAt: 0, host: hostname() }) + '\n', 'utf8')
  const fourth = acquireLock(file)
  assert.equal(fourth.ok, true)
  fourth.release()
})

test('chat-log：追加、读取与清理', (t) => {
  const dir = tempDir(t)
  const log = createChatLog({ dir, retentionDays: 7 })
  const now = Date.now()

  log.append(1, { time: now - 1000, messageId: 'a', userId: 'u', nickname: 'n', role: 'member', text: 'hi' })
  log.append(1, { time: now, messageId: 'b', userId: 'u', nickname: 'n', role: 'member', text: 'yo' })

  const recent = log.readRecent(1, now - 5000)
  assert.equal(recent.length, 2)
  assert.equal(recent[0].messageId, 'a')
  assert.equal(recent[1].text, 'yo')

  assert.equal(log.readRecent(1, now + 1).length, 0)

  // 伪造一份旧日志，验证 prune
  const oldDir = join(dir, '1')
  writeFileSync(join(oldDir, '2020-01-01.jsonl'), '{}\n', 'utf8')
  assert.equal(log.prune(now, 7), 1)
})

test('chat-log：跨日读取能覆盖前一天的文件', (t) => {
  const dir = tempDir(t)
  const log = createChatLog({ dir })
  const now = Date.now()
  log.append(1, { time: now, messageId: 'x', userId: 'u', nickname: 'n', role: 'member', text: 'today' })
  const records = log.readRecent(1, now - 25 * 60 * 60 * 1000)
  assert.equal(records.length, 1)
  assert.equal(records[0].text, 'today')
})

test('chat-log：localDateKey 为本地日期', () => {
  const key = localDateKey(new Date(2026, 0, 2, 23, 59).getTime())
  assert.equal(key, '2026-01-02')
})

test('reply：短文本单条、空文本丢弃', () => {
  assert.deepEqual(buildReplyChunks('hello'), ['hello'])
  assert.deepEqual(buildReplyChunks('   \n  '), [])
  assert.deepEqual(buildReplyChunks(null), [])
  assert.deepEqual(buildReplyChunks('a\nb\nc'), ['a\nb\nc'])
})

test('reply：超长行按码点切分且不超上限', () => {
  const text = 'x'.repeat(2500)
  const chunks = buildReplyChunks(text, 500)
  assert.equal(chunks.length, 5)
  assert.ok(chunks.every((chunk) => chunk.length <= 500))
  assert.equal(chunks.join(''), text)
})

test('reply：优先在换行处切分', () => {
  const text = 'line1\nline2\nline3'
  const chunks = buildReplyChunks(text, 11)
  assert.deepEqual(chunks, ['line1\nline2', 'line3'])
})

test('reply：退避与重试判定', () => {
  assert.equal(nextBackoff(0), 1000)
  assert.equal(nextBackoff(3), 8000)
  assert.equal(nextBackoff(10), 30000)
  assert.equal(nextBackoff(0, { minMs: 100, maxMs: 1000 }), 100)
  assert.equal(shouldRetryTransport(0, 3), true)
  assert.equal(shouldRetryTransport(1, 3), true)
  assert.equal(shouldRetryTransport(2, 3), false)
  assert.equal(shouldRetryTransport(5, 3), false)
})
