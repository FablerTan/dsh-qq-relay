/**
 * 消息闸门调度器单测（node:test，零依赖）：去抖合并、最小间隔、慢路定时、
 * 分类器 fail closed、pending 持久化与重启恢复。
 *
 * 定时器用注入的假时钟（controller/gate.js 的 timers 选项），不依赖真实等待。
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { normalizeGateConfig } from '../lib/model/gate.js'
import { createStateStore } from '../lib/model/state.js'
import { createGateLog } from '../lib/model/gate-log.js'
import { createGate } from '../lib/controller/gate.js'

const flush = () => new Promise((resolve) => setImmediate(resolve))
const realWait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** 假时钟：定时器按需推进，evaluate 里的异步决策用 setImmediate 冲刷。 */
function createClock(start = 1_000_000) {
  let current = start
  let nextId = 0
  const jobs = new Map()

  async function advance(ms) {
    const target = current + ms
    await flush()
    for (;;) {
      let next = null
      for (const [id, job] of jobs) {
        if (job.at > target) continue
        if (next === null || job.at < next.job.at || (job.at === next.job.at && job.order < next.job.order)) next = { id, job }
      }
      if (next === null) break
      jobs.delete(next.id)
      current = next.job.at
      next.job.fn()
      await flush()
    }
    current = target
    await flush()
  }

  return {
    now: () => current,
    setTimeout: (fn, ms) => {
      const id = ++nextId
      jobs.set(id, { at: current + Math.max(0, Number(ms) || 0), fn, order: id })
      return id
    },
    clearTimeout: (id) => { jobs.delete(id) },
    advance,
  }
}

function createHarness(t, options = {}) {
  const dir = options.dir ?? mkdtempSync(join(tmpdir(), 'dsh-qq-relay-gate-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))

  const clock = createClock()
  const state = createStateStore({ dir: join(dir, 'state') })
  const gateLog = createGateLog({ dir: join(dir, 'gate') })
  const gateConfig = normalizeGateConfig({ enabled: true, ...(options.gate ?? {}) })
  const classifierCalls = []
  const dispatched = []
  const classifier = options.classifier ?? {
    async classify(input) {
      classifierCalls.push(input)
      return { reply: true, confidence: 0.9, reason: '测试', targetMsgIds: [] }
    },
  }
  const gate = createGate({
    config: gateConfig,
    groups: [100],
    state,
    logger: null,
    classifier,
    gateLog,
    chatLog: options.chatLog ?? null,
    now: clock.now,
    timers: clock,
    dispatch: async (messages, decision, meta) => { dispatched.push({ messages, decision, meta }) },
  })
  gate.start()
  t.after(() => gate.stop())
  return { gate, state, gateConfig, classifierCalls, dispatched, clock, dir, gateLog }
}

function groupMessage(overrides = {}) {
  return {
    kind: 'group-message',
    groupId: 100,
    groupName: '测试群',
    messageId: 'm' + String(Math.random()).slice(2, 10),
    userId: 205,
    timeMs: 0,
    text: 'hi',
    sender: { nickname: 'tester', role: 'owner' },
    ...overrides,
  }
}

test('gate：关闭时普通消息不触发任何调度', async (t) => {
  const { gate, classifierCalls, dispatched, clock } = createHarness(t, { gate: { enabled: false } })
  gate.ingest(groupMessage())
  await clock.advance(3 * 60 * 60 * 1000)
  assert.equal(classifierCalls.length, 0)
  assert.equal(dispatched.length, 0)
})

test('gate：空文本消息（表情 / 图片）不进 pending、不调分类器', async (t) => {
  const { gate, classifierCalls, dispatched, clock, state } = createHarness(t)
  gate.ingest(groupMessage({ text: '' }))
  gate.ingest(groupMessage({ text: '   ' }))
  await clock.advance(3 * 60 * 60 * 1000)
  assert.equal(classifierCalls.length, 0)
  assert.equal(dispatched.length, 0)
  assert.deepEqual(state.get(100).pending, [])
})

test('gate：快路 3 条消息合并为一次分类与一次派发', async (t) => {
  const { gate, state, classifierCalls, dispatched, clock, gateLog } = createHarness(t)
  state.update(100, { lastBotSpeakAt: clock.now() - 1000 })
  gate.ingest(groupMessage({ text: '第一条' }))
  gate.ingest(groupMessage({ text: '第二条' }))
  gate.ingest(groupMessage({ text: '第三条' }))
  await clock.advance(5000)

  assert.equal(classifierCalls.length, 1)
  assert.equal(classifierCalls[0].trigger, 'fast')
  assert.equal(classifierCalls[0].groupId, 100)
  assert.equal(classifierCalls[0].groupName, '测试群')
  assert.deepEqual(classifierCalls[0].messages.map((item) => item.text), ['第一条', '第二条', '第三条'])
  assert.equal(dispatched.length, 1)
  assert.equal(dispatched[0].messages.length, 3)
  assert.equal(dispatched[0].meta.groupId, 100)
  assert.equal(state.get(100).pending.length, 0, '派发后 pending 应清空')

  const logged = gateLog.readRecent(0, clock.now() + 1)
  assert.equal(logged.length, 1)
  assert.equal(logged[0].trigger, 'fast')
  assert.equal(logged[0].batch, 3)
  assert.equal(logged[0].reply, true)
})

test('gate：同一 message_id 重复事件只进批次一次', async (t) => {
  const { gate, state, classifierCalls, clock } = createHarness(t)
  state.update(100, { lastBotSpeakAt: clock.now() - 1000 })
  const event = groupMessage({ messageId: 'dup-1' })
  gate.ingest(event)
  gate.ingest(event)
  await clock.advance(5000)
  assert.equal(classifierCalls.length, 1)
  assert.equal(classifierCalls[0].messages.length, 1)
})

test('gate：分类器报错 / 输出不合规 → fail closed（不派发）', async (t) => {
  const cases = [
    { async classify() { throw new Error('模型挂了') } },
    { async classify() { return { reply: 'yes' } } },
    { async classify() { return null } },
  ]
  for (const classifier of cases) {
    const harness = createHarness(t, { classifier })
    harness.state.update(100, { lastBotSpeakAt: harness.clock.now() - 1000 })
    harness.gate.ingest(groupMessage())
    await harness.clock.advance(5000)
    assert.equal(harness.dispatched.length, 0)
    assert.equal(harness.state.get(100).pending.length, 0)
  }
})

test('gate：分类器超时 → fail closed', async (t) => {
  const harness = createHarness(t, {
    gate: { classifierTimeoutMs: '100ms' },
    classifier: { classify: () => new Promise(() => {}) },
  })
  harness.state.update(100, { lastBotSpeakAt: harness.clock.now() - 1000 })
  harness.gate.ingest(groupMessage())
  await harness.clock.advance(5000)
  assert.equal(harness.dispatched.length, 0)
  await realWait(250)
  assert.equal(harness.dispatched.length, 0)
})

test('gate：慢路在 slowTimer（2h）到点后评估', async (t) => {
  const { gate, classifierCalls, dispatched, clock } = createHarness(t)
  gate.ingest(groupMessage({ text: '久未发言时的消息' }))
  await clock.advance(60 * 60 * 1000)
  assert.equal(classifierCalls.length, 0, '慢路不应提前评估')
  await clock.advance(61 * 60 * 1000)
  assert.equal(classifierCalls.length, 1)
  assert.equal(classifierCalls[0].trigger, 'slow')
  assert.equal(dispatched.length, 1)
})

test('gate：最小发言间隔未到 → 本批延后，不丢', async (t) => {
  const { gate, state, classifierCalls, dispatched, clock } = createHarness(t)
  const base = clock.now()
  state.update(100, { lastBotSpeakAt: base - 1000, lastReplyAt: base - 20 * 1000 })
  gate.ingest(groupMessage({ text: '间隔内的消息' }))
  await clock.advance(5000)
  assert.equal(classifierCalls.length, 0, '间隔未到不应调用分类器')
  assert.equal(dispatched.length, 0)
  await clock.advance(25 * 1000)
  assert.equal(classifierCalls.length, 1)
  assert.equal(dispatched.length, 1)
})

test('gate：慢路只评估最近 slowWindow 内的消息', async (t) => {
  const { gate, clock, classifierCalls } = createHarness(t)
  await clock.advance(4 * 60 * 60 * 1000) // 让「三小时前」仍是正数时间戳
  gate.ingest(groupMessage({ text: '三小时前的旧消息', timeMs: clock.now() - 3 * 60 * 60 * 1000 }))
  gate.ingest(groupMessage({ text: '刚发的消息', timeMs: clock.now() }))
  await clock.advance(2 * 60 * 60 * 1000)
  assert.equal(classifierCalls.length, 1)
  assert.equal(classifierCalls[0].trigger, 'slow')
  assert.deepEqual(classifierCalls[0].messages.map((item) => item.text), ['刚发的消息'])
})

test('gate：DSH 忙（dshBusy）时延后判定，不丢批次', async (t) => {
  const { gate, state, classifierCalls, dispatched, clock } = createHarness(t)
  state.update(100, { lastBotSpeakAt: clock.now() - 1000, dshBusy: true })
  gate.ingest(groupMessage({ text: '等 DSH 忙完' }))
  await clock.advance(5000)
  assert.equal(classifierCalls.length, 0, 'DSH 忙时不应调用分类器')

  state.update(100, { dshBusy: false })
  await clock.advance(5000)
  assert.equal(classifierCalls.length, 1)
  assert.equal(dispatched.length, 1)
})

test('gate：noteBotSpoke 清空 pending，后续不再评估', async (t) => {
  const { gate, state, classifierCalls, clock } = createHarness(t)
  state.update(100, { lastBotSpeakAt: clock.now() - 1000 })
  gate.ingest(groupMessage())
  gate.noteBotSpoke(100)
  await clock.advance(3 * 60 * 60 * 1000)
  assert.equal(classifierCalls.length, 0)
  assert.equal(state.get(100).pending.length, 0)
})

test('gate：pending 落盘，重启后恢复', async (t) => {
  const first = createHarness(t)
  first.gate.ingest(groupMessage({ text: '重启前的消息' }))
  first.gate.stop()
  assert.equal(first.state.get(100).pending.length, 1)

  const second = createHarness(t, { dir: first.dir })
  second.gate.start()
  second.gate.ingest(groupMessage({ text: '重启后的消息' }))
  await second.clock.advance(2 * 60 * 60 * 1000)
  assert.equal(second.classifierCalls.length, 1)
  assert.deepEqual(second.classifierCalls[0].messages.map((item) => item.text), ['重启前的消息', '重启后的消息'])
})

test('gate：stop 后定时器不再触发', async (t) => {
  const { gate, classifierCalls, clock } = createHarness(t)
  gate.ingest(groupMessage())
  gate.stop()
  await clock.advance(3 * 60 * 60 * 1000)
  assert.equal(classifierCalls.length, 0)
})

test('gate：分类器拿到聊天上下文（含 bot 发言），派发只带本批', async (t) => {
  const contextRecords = [
    { time: 1_000_200, messageId: 'bot-1', userId: '999', nickname: 'bot', role: 'bot', text: '刚才的回复' },
  ]
  const chatLog = { readRecent: () => contextRecords }
  const harness = createHarness(t, { chatLog })
  harness.state.update(100, { lastBotSpeakAt: harness.clock.now() - 1000 })
  harness.gate.ingest(groupMessage({ messageId: 'msg-1', text: '再回复一句话' }))
  await harness.clock.advance(5000)

  assert.equal(harness.classifierCalls.length, 1)
  assert.deepEqual(harness.classifierCalls[0].messages.map((item) => item.text), ['刚才的回复'])
  assert.deepEqual(harness.classifierCalls[0].batch.map((item) => item.text), ['再回复一句话'])
  assert.deepEqual(harness.dispatched[0].messages.map((item) => item.text), ['再回复一句话'])
})

test('gate：聊天日志读取失败时退回本批消息', async (t) => {
  const chatLog = { readRecent: () => { throw new Error('broken log') } }
  const harness = createHarness(t, { chatLog })
  harness.state.update(100, { lastBotSpeakAt: harness.clock.now() - 1000 })
  harness.gate.ingest(groupMessage({ messageId: 'msg-2', text: '求助' }))
  await harness.clock.advance(5000)
  assert.equal(harness.classifierCalls.length, 1)
  assert.equal(harness.classifierCalls[0].messages.length, 1)
  assert.equal(harness.classifierCalls[0].messages[0].text, '求助')
})
