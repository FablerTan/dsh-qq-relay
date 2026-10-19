/**
 * model 层单测（node:test，零依赖）。
 * 运行：pnpm test  ==  node --test test/*.test.js
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir, homedir, hostname } from 'node:os'
import { join } from 'node:path'

import { DEFAULT_CONFIG, expandHome, formatSessionTitle, normalizeConfig } from '../lib/model/config.js'
import { createMappingStore } from '../lib/model/mapping.js'
import { acquireLock, createStateStore, migrateLegacyState, PENDING_LIMIT, SEEN_LIMIT } from '../lib/model/state.js'
import { createChatLog, localDateKey } from '../lib/model/chat-log.js'
import { createGateLog } from '../lib/model/gate-log.js'
import { APPROVE_WORDS, canDecideApproval, formatApprovalPrompt, matchApprovalDecision, REJECT_WORDS } from '../lib/model/approval.js'
import { buildReplyChunks, classifySendFailure, nextBackoff, shouldRetryTransport } from '../lib/model/reply.js'
import {
  buildBatch,
  createNullClassifier,
  fastPathActive,
  formatBatchPrompt,
  minIntervalRemaining,
  normalizeDecision,
  normalizeGateConfig,
  parseDuration,
} from '../lib/model/gate.js'

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

test('state：每群一个文件，去重 / 更新 / 持久化', (t) => {
  const dir = tempDir(t)
  const stateDir = join(dir, 'state')
  const store = createStateStore({ dir: stateDir })

  assert.equal(store.markSeen(1, 'm1'), true)
  assert.equal(store.markSeen(1, 'm1'), false)
  assert.equal(store.hasSeen(1, 'm1'), true)
  assert.equal(store.hasSeen(1, 'm2'), false)

  store.update(1, { lastBotSpeakAt: 123, lastBotMessageId: 'm1', pending: [{ messageId: 'x', text: 'hi', time: 1 }] })
  const reloaded = createStateStore({ dir: stateDir })
  assert.equal(reloaded.get(1).lastBotSpeakAt, 123)
  assert.equal(reloaded.get(1).lastBotMessageId, 'm1')
  assert.equal(reloaded.get(1).pending[0].text, 'hi')
  assert.equal(reloaded.hasSeen(1, 'm1'), true)
  assert.equal(store.fileFor(1), join(stateDir, '1.json'))
  assert.deepEqual([...reloaded.all().keys()], ['1'])
})

test('state：脏文件退化为空状态，seen / pending 有上限', (t) => {
  const dir = tempDir(t)
  const stateDir = join(dir, 'state')
  mkdirSync(stateDir, { recursive: true })
  writeFileSync(join(stateDir, '2.json'), '{ broken', 'utf8')
  const store = createStateStore({ dir: stateDir })
  assert.equal(store.get(2).lastBotSpeakAt, 0)

  for (let i = 0; i < SEEN_LIMIT + 5; i += 1) store.markSeen(3, 'm' + String(i))
  assert.equal(store.get(3).seen.length, SEEN_LIMIT)
  const pending = Array.from({ length: PENDING_LIMIT + 5 }, (_, index) => ({ messageId: 'p' + String(index), text: 'x', time: index }))
  store.update(3, { pending })
  assert.equal(store.get(3).pending.length, PENDING_LIMIT)
})

test('state：旧版 state.json 一次性迁移', (t) => {
  const dir = tempDir(t)
  const legacy = join(dir, 'state.json')
  writeFileSync(legacy, JSON.stringify({
    groups: {
      100: { seen: ['m1'], lastBotSpeakAt: 111, cooldownUntil: 222, pending: [{ messageId: 'p', text: '旧消息', time: 5 }] },
      200: { seen: ['m2'], lastBotSpeakAt: 333 },
    },
  }), 'utf8')
  const stateDir = join(dir, 'state')
  const store = createStateStore({ dir: stateDir })
  const migrated = migrateLegacyState(legacy, store)
  assert.deepEqual(migrated.migrated.sort(), [100, 200])
  assert.equal(store.get(100).lastBotSpeakAt, 111)
  assert.equal(store.get(100).pending[0].text, '旧消息')
  assert.equal(store.hasSeen(100, 'm1'), true)
  assert.equal(store.get(200).lastBotSpeakAt, 333)

  // 已迁移过的群不会被旧文件覆盖
  store.update(100, { lastBotSpeakAt: 999 })
  assert.deepEqual(migrateLegacyState(legacy, store).migrated, [])
  assert.equal(store.get(100).lastBotSpeakAt, 999)
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

test('config：gate 默认关闭，时长字段为毫秒', () => {
  const result = normalizeConfig({ wsUrl: 'ws://x', accessToken: 't', selfId: 1 })
  assert.equal(result.ok, true)
  assert.equal(result.config.gate.enabled, false)
  assert.equal(result.config.gate.mentionBypass, true)
  assert.equal(result.config.gate.fastWindow, 10 * 60 * 1000)
  assert.equal(result.config.gate.fastMinReplyInterval, 45 * 1000)
  assert.equal(result.config.gate.debounce, 5000)
  assert.equal(result.config.gate.slowTimer, 2 * 60 * 60 * 1000)
  assert.equal(result.config.gate.maxBatchMessages, 100)
})

test('config：gate 可覆盖（字符串时长 + 数字）并拒绝非法值', () => {
  const custom = normalizeConfig({
    wsUrl: 'ws://x',
    accessToken: 't',
    selfId: 1,
    gate: { enabled: true, mentionBypass: false, fastWindow: '30s', debounce: 2000, slowTimer: '1h', maxBatchMessages: 20 },
  })
  assert.equal(custom.ok, true)
  assert.equal(custom.config.gate.enabled, true)
  assert.equal(custom.config.gate.mentionBypass, false)
  assert.equal(custom.config.gate.fastWindow, 30 * 1000)
  assert.equal(custom.config.gate.debounce, 2000)
  assert.equal(custom.config.gate.slowTimer, 60 * 60 * 1000)
  assert.equal(custom.config.gate.maxBatchMessages, 20)

  const invalid = normalizeConfig({
    wsUrl: 'ws://x',
    accessToken: 't',
    selfId: 1,
    gate: { enabled: 'yes', fastWindow: '3s', debounce: 'soon', maxBatchMessages: 0, unknownKey: 1 },
  })
  assert.equal(invalid.ok, false)
  assert.ok(invalid.problems.some((p) => p.includes('gate.enabled')))
  assert.ok(invalid.problems.some((p) => p.includes('gate.fastWindow')))
  assert.ok(invalid.problems.some((p) => p.includes('gate.debounce')))
  assert.ok(invalid.problems.some((p) => p.includes('gate.maxBatchMessages')))
  assert.ok(invalid.problems.some((p) => p.includes('未知配置项')))
})

test('gate：parseDuration 支持毫秒数字与 500ms / 45s / 10m / 2h', () => {
  assert.equal(parseDuration(1500), 1500)
  assert.equal(parseDuration('500ms'), 500)
  assert.equal(parseDuration('45s'), 45000)
  assert.equal(parseDuration('10m'), 600000)
  assert.equal(parseDuration('2h'), 7200000)
  assert.equal(parseDuration(' 3 s '), 3000)
  assert.equal(parseDuration('soon'), null)
  assert.equal(parseDuration(-1), null)
  assert.equal(parseDuration(null), null)
})

test('gate：分类器决策不合规一律 fail closed', () => {
  const ok = normalizeDecision({ reply: true, confidence: 0.82, reason: '用户在问 bot', targetMsgIds: ['m1'] })
  assert.deepEqual(ok, { reply: true, confidence: 0.82, reason: '用户在问 bot', targetMsgIds: ['m1'] })

  const cases = [
    null,
    {},
    { reply: 'yes', confidence: 1, reason: 'x' },
    { reply: true, confidence: 1.5, reason: 'x' },
    { reply: true, confidence: 0.5 },
    { reply: true, reason: 'no confidence' },
  ]
  for (const raw of cases) {
    const decision = normalizeDecision(raw)
    assert.equal(decision.reply, false, JSON.stringify(raw))
    assert.equal(decision.confidence, 0)
    assert.ok(decision.reason.startsWith('invalid-decision'))
  }

  const trimmed = normalizeDecision({ reply: false, confidence: 0.1, reason: '不需要', targetMsgIds: ['a', '', 3, 'b'] })
  assert.deepEqual(trimmed.targetMsgIds, ['a', 'b'])
})

test('gate：批次截断与 prompt 拼接', () => {
  const records = Array.from({ length: 5 }, (_, index) => ({
    messageId: 'm' + String(index), userId: 'u', nickname: index === 0 ? '' : 'n' + String(index), role: 'member', text: 't' + String(index), time: index,
  }))
  const batch = buildBatch(records, { maxBatchMessages: 3 })
  assert.equal(batch.length, 3)
  assert.deepEqual(batch.map((item) => item.messageId), ['m2', 'm3', 'm4'])
  assert.equal(buildBatch(null).length, 0)

  assert.equal(formatBatchPrompt(batch), '[n2] t2\n[n3] t3\n[n4] t4')
  assert.equal(formatBatchPrompt([{ messageId: 'x', userId: '42', nickname: '', text: 'hi' }]), '[42] hi')
  assert.equal(formatBatchPrompt([{ text: '   ' }]), '')
  assert.equal(formatBatchPrompt(null), '')
})

test('gate：快路窗口与最小发言间隔', () => {
  const config = normalizeGateConfig({ fastWindow: '10m', fastMinReplyInterval: '45s' })
  const now = 1_000_000_000
  assert.equal(fastPathActive({ now, lastBotSpeakAt: now - 1000, config }), true)
  assert.equal(fastPathActive({ now, lastBotSpeakAt: now - 11 * 60 * 1000, config }), false)
  assert.equal(fastPathActive({ now, lastBotSpeakAt: 0, config }), false)

  assert.equal(minIntervalRemaining({ now, lastReplyAt: now - 45_000, config }), 0)
  assert.equal(minIntervalRemaining({ now, lastReplyAt: now - 44_000, config }), 1000)
  assert.equal(minIntervalRemaining({ now, lastReplyAt: 0, config }), 0)
})

test('gate：未接分类器时永远不接话', async () => {
  const classifier = createNullClassifier()
  const decision = await classifier.classify({ groupId: 1, messages: [] })
  assert.equal(decision.reply, false)
  assert.equal(decision.reason, 'classifier-not-configured')
})

test('reply：发送失败分类（风控退避 vs 明确失败）', () => {
  assert.equal(classifySendFailure({ retcode: 1200, wording: '发送过于频繁，请稍后再试' }).kind, 'frequency')
  assert.equal(classifySendFailure({ retcode: 100, message: '操作太快了' }).kind, 'frequency')
  assert.equal(classifySendFailure({ retcode: 1400, wording: '权限不足' }).kind, 'fatal')
  assert.equal(classifySendFailure({ retcode: 1401 }).message, 'retcode=1401')
  assert.equal(classifySendFailure(null).kind, 'fatal')
})

test('gate-log：追加 / 读取 / 保留期清理', (t) => {
  const dir = tempDir(t)
  const log = createGateLog({ dir, retentionDays: 7 })
  const now = Date.now()

  log.append({ time: now, groupId: 100, trigger: 'fast', batch: 3, reply: true, confidence: 0.8, reason: '测试', costMs: 12, messageIds: ['m1', 'm2'] })
  log.append({ time: now + 1, groupId: 100, trigger: 'slow', batch: 1, reply: false, confidence: 0, reason: '不需要', costMs: 5 })

  const recent = log.readRecent(0, now + 10)
  assert.equal(recent.length, 2)
  assert.equal(recent[0].trigger, 'fast')
  assert.equal(recent[0].reply, true)
  assert.deepEqual(recent[0].messageIds, ['m1', 'm2'])
  assert.equal(recent[1].reply, false)
  assert.ok(!JSON.stringify(recent).includes('正文'), '决策日志只存 message_id 不存正文')

  // 伪造一份旧日志，验证 prune
  writeFileSync(join(dir, '2020-01-01.jsonl'), '{}\n', 'utf8')
  assert.equal(log.prune(now, 7), 1)
  assert.equal(log.readRecent(0, now + 10).length, 2)
})

test('gate-log：坏行与非法记录被容忍', (t) => {
  const dir = tempDir(t)
  const log = createGateLog({ dir })
  writeFileSync(log.fileFor(Date.now()), '{ bad json\n', 'utf8')
  assert.equal(log.append({ groupId: 'x', trigger: 'weird' }).groupId, 0)
  assert.equal(log.append(null), null)
  const records = log.readRecent(0, Date.now() + 10)
  assert.equal(records.length, 1)
  assert.equal(records[0].trigger, 'fast')
  assert.equal(records[0].batch, 0)
})

test('approval：文本命令匹配同意 / 拒绝', () => {
  for (const word of APPROVE_WORDS) {
    assert.equal(matchApprovalDecision(word), 'allow', word)
    assert.equal(matchApprovalDecision(' ' + word + '！'), 'allow', word)
    assert.equal(matchApprovalDecision(word.toUpperCase()), 'allow', word)
  }
  for (const word of REJECT_WORDS) {
    assert.equal(matchApprovalDecision(word), 'deny', word)
  }
  // 「不允许」必须先命中拒绝，不能被子串「允许」误判
  assert.equal(matchApprovalDecision('不允许'), 'deny')
  assert.equal(matchApprovalDecision('同意一下'), null)
  assert.equal(matchApprovalDecision(''), null)
  assert.equal(matchApprovalDecision(null), null)
})

test('approval：决策者角色校验', () => {
  assert.equal(canDecideApproval({ sender: { role: 'owner' } }), true)
  assert.equal(canDecideApproval({ sender: { role: 'admin' } }), true)
  assert.equal(canDecideApproval({ sender: { role: 'member' } }), false)
  assert.equal(canDecideApproval({ sender: {} }), false)
  assert.equal(canDecideApproval(null), false)
  assert.equal(canDecideApproval({ sender: { role: 'member' } }, ['owner', 'admin', 'member']), true)
})

test('approval：提示文案含工具 / 原因 / 超时秒数', () => {
  const text = formatApprovalPrompt({ toolName: 'bash', reason: '需要写入工作区外', timeoutMs: 120000 })
  assert.match(text, /bash/)
  assert.match(text, /需要写入工作区外/)
  assert.match(text, /120 秒/)
  assert.match(text, /同意/)
  assert.match(text, /拒绝/)
  const minimal = formatApprovalPrompt({})
  assert.match(minimal, /未知工具/)
})

test('config：approval 段默认与校验', () => {
  const ok = normalizeConfig({ wsUrl: 'ws://x', accessToken: 't', selfId: 1 })
  assert.equal(ok.config.approval.enabled, true)
  assert.equal(ok.config.approval.timeoutMs, 120000)
  assert.deepEqual(ok.config.approval.roles, ['owner', 'admin'])

  const custom = normalizeConfig({ wsUrl: 'ws://x', accessToken: 't', selfId: 1, approval: { enabled: false, timeoutMs: '90s', roles: ['admin'] } })
  assert.equal(custom.ok, true)
  assert.equal(custom.config.approval.enabled, false)
  assert.equal(custom.config.approval.timeoutMs, 90000)
  assert.deepEqual(custom.config.approval.roles, ['admin'])

  const invalid = normalizeConfig({ wsUrl: 'ws://x', accessToken: 't', selfId: 1, approval: { enabled: 'yes', timeoutMs: '1s', roles: ['boss'] } })
  assert.equal(invalid.ok, false)
  assert.ok(invalid.problems.some((p) => p.includes('approval.enabled')))
  assert.ok(invalid.problems.some((p) => p.includes('approval.timeoutMs')))
  assert.ok(invalid.problems.some((p) => p.includes('approval.roles')))
})

test('config：reply 段默认与校验（v0.11.1）', () => {
  const defaults = normalizeConfig({ wsUrl: 'ws://x', accessToken: 't', selfId: 1 })
  assert.deepEqual(defaults.config.reply, { quote: true, ackDelayMs: 8000, mergeWindowMs: 400 })

  const custom = normalizeConfig({
    wsUrl: 'ws://x',
    accessToken: 't',
    selfId: 1,
    reply: { quote: false, ackDelayMs: '3s', mergeWindowMs: '500ms' },
  })
  assert.equal(custom.ok, true)
  assert.equal(custom.config.reply.quote, false)
  assert.equal(custom.config.reply.ackDelayMs, 3000)
  assert.equal(custom.config.reply.mergeWindowMs, 500)

  const invalid = normalizeConfig({
    wsUrl: 'ws://x',
    accessToken: 't',
    selfId: 1,
    reply: { quote: 'yes', ackDelayMs: '5m', mergeWindowMs: 6000 },
  })
  assert.equal(invalid.ok, false)
  assert.ok(invalid.problems.some((p) => p.includes('reply.quote')))
  assert.ok(invalid.problems.some((p) => p.includes('reply.ackDelayMs')))
  assert.ok(invalid.problems.some((p) => p.includes('reply.mergeWindowMs')))
})

test('config：gate 的 jev 分类器默认与校验', () => {
  const defaults = normalizeConfig({ wsUrl: 'ws://x', accessToken: 't', selfId: 1 })
  assert.equal(defaults.config.gate.model, 'typesafe/jev-1.14')
  assert.equal(defaults.config.gate.jevEndpoint, 'https://openrouter.ai/api/alpha/decisions')
  assert.equal(defaults.config.gate.jevApiKeyEnv, 'OPENROUTER_API_KEY')
  assert.equal(defaults.config.gate.jevThreshold, 0.7)
  assert.equal(defaults.config.gate.classifierTimeoutMs, 8000)

  const custom = normalizeConfig({
    wsUrl: 'ws://x',
    accessToken: 't',
    selfId: 1,
    gate: { model: 'typesafe/jev-1.14', jevThreshold: 0.55, jevEndpoint: 'https://proxy.example.com/decisions', jevApiKeyEnv: 'MY_JEV_KEY', classifierTimeoutMs: '10s' },
  })
  assert.equal(custom.ok, true)
  assert.equal(custom.config.gate.jevThreshold, 0.55)
  assert.equal(custom.config.gate.jevEndpoint, 'https://proxy.example.com/decisions')
  assert.equal(custom.config.gate.jevApiKeyEnv, 'MY_JEV_KEY')
  assert.equal(custom.config.gate.classifierTimeoutMs, 10000)

  const invalid = normalizeConfig({
    wsUrl: 'ws://x',
    accessToken: 't',
    selfId: 1,
    gate: { model: '', jevThreshold: 1.5, jevEndpoint: 'http://x', jevApiKeyEnv: 'bad-key' },
  })
  assert.equal(invalid.ok, false)
  assert.ok(invalid.problems.some((p) => p.includes('gate.model')))
  assert.ok(invalid.problems.some((p) => p.includes('gate.jevThreshold')))
  assert.ok(invalid.problems.some((p) => p.includes('gate.jevEndpoint')))
  assert.ok(invalid.problems.some((p) => p.includes('gate.jevApiKeyEnv')))
})

test('config：poke 段默认与校验（v0.15.0）', () => {
  const defaults = normalizeConfig({ wsUrl: 'ws://x', accessToken: 't', selfId: 1 })
  assert.deepEqual(defaults.config.poke, { enabled: true, react: true, cooldownMs: 10000 })

  const custom = normalizeConfig({
    wsUrl: 'ws://x',
    accessToken: 't',
    selfId: 1,
    poke: { enabled: false, react: false, cooldownMs: '30s' },
  })
  assert.equal(custom.ok, true)
  assert.equal(custom.config.poke.enabled, false)
  assert.equal(custom.config.poke.react, false)
  assert.equal(custom.config.poke.cooldownMs, 30000)

  const invalid = normalizeConfig({
    wsUrl: 'ws://x',
    accessToken: 't',
    selfId: 1,
    poke: { enabled: 'yes', react: 1, cooldownMs: '20m' },
  })
  assert.equal(invalid.ok, false)
  assert.ok(invalid.problems.some((p) => p.includes('poke.enabled')))
  assert.ok(invalid.problems.some((p) => p.includes('poke.react')))
  assert.ok(invalid.problems.some((p) => p.includes('poke.cooldownMs')))
})
test('config：proxyReply 段默认与校验（v0.18.0）', () => {
  const defaults = normalizeConfig({ wsUrl: 'ws://x', accessToken: 't', selfId: 1 })
  assert.deepEqual(defaults.config.proxyReply, { enabled: false, targets: [], silenceWindow: 600000 })

  const custom = normalizeConfig({
    wsUrl: 'ws://x',
    accessToken: 't',
    selfId: 1,
    proxyReply: { enabled: true, targets: ['10003', ' @群主 ', '群主'], silenceWindow: '30m' },
  })
  assert.equal(custom.ok, true)
  assert.equal(custom.config.proxyReply.enabled, true)
  assert.deepEqual(custom.config.proxyReply.targets, ['10003', '群主'])
  assert.equal(custom.config.proxyReply.silenceWindow, 1800000)

  // 0 = 不检查沉默（总是代答）
  assert.equal(normalizeConfig({
    wsUrl: 'ws://x', accessToken: 't', selfId: 1, proxyReply: { silenceWindow: 0 },
  }).config.proxyReply.silenceWindow, 0)

  const invalid = normalizeConfig({
    wsUrl: 'ws://x',
    accessToken: 't',
    selfId: 1,
    proxyReply: { enabled: 'yes', targets: '205', silenceWindow: '2d' },
  })
  assert.equal(invalid.ok, false)
  assert.ok(invalid.problems.some((p) => p.includes('proxyReply.enabled')))
  assert.ok(invalid.problems.some((p) => p.includes('proxyReply.targets')))
  assert.ok(invalid.problems.some((p) => p.includes('proxyReply.silenceWindow')))
})

test('config：files 段默认与校验（v0.16.0）', () => {
  const defaults = normalizeConfig({ wsUrl: 'ws://x', accessToken: 't', selfId: 1 })
  assert.deepEqual(defaults.config.files, { enabled: true, react: true })

  const custom = normalizeConfig({
    wsUrl: 'ws://x',
    accessToken: 't',
    selfId: 1,
    files: { enabled: false, react: false },
  })
  assert.equal(custom.ok, true)
  assert.equal(custom.config.files.enabled, false)
  assert.equal(custom.config.files.react, false)

  const invalid = normalizeConfig({
    wsUrl: 'ws://x',
    accessToken: 't',
    selfId: 1,
    files: { enabled: 'yes', react: 1 },
  })
  assert.equal(invalid.ok, false)
  assert.ok(invalid.problems.some((p) => p.includes('files.enabled')))
  assert.ok(invalid.problems.some((p) => p.includes('files.react')))
})

