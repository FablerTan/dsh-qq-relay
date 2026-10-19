/**
 * QQ 侧审批桥单测（node:test，零依赖）：映射反查、群里文本审批、角色限制、
 * 超时 / 取消 / 离线 fail closed、并发请求交给 GUI。
 *
 * 假 ctx 只实现 `on`（返回 disposer）；假时钟推进超时。
 */

import test from 'node:test'
import assert from 'node:assert/strict'

import { createApprovalBridge } from '../lib/controller/approval.js'

const flush = async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve() }

function createClock() {
  let now = 0
  let id = 0
  const jobs = new Map()
  return {
    now: () => now,
    setTimeout: (fn, ms) => { const next = ++id; jobs.set(next, { at: now + (Number(ms) || 0), fn }); return next },
    clearTimeout: (jobId) => { jobs.delete(jobId) },
    advance: (ms) => {
      now += ms
      for (const [jobId, job] of [...jobs]) {
        if (job.at <= now) { jobs.delete(jobId); job.fn() }
      }
    },
  }
}

function createHarness(t, options = {}) {
  const clock = createClock()
  const handlers = new Map()
  const ctx = {
    on(name, handler) {
      const list = handlers.get(name) ?? []
      list.push(handler)
      handlers.set(name, list)
      return () => { const index = list.indexOf(handler); if (index >= 0) list.splice(index, 1) }
    },
  }
  const sent = []
  const mapping = options.mapping ?? { all: () => ({ 100: { sessionId: 'session-1' } }) }
  const sendText = options.sendText ?? (async (groupId, text) => { sent.push({ groupId, text }); return { queued: false } })
  const config = { enabled: true, timeoutMs: 120000, roles: ['owner', 'admin'], ...(options.config ?? {}) }
  const bridge = createApprovalBridge({ getConfig: () => config, mapping, sendText, logger: null, timers: clock })
  bridge.start(ctx)
  t.after(() => bridge.stop())

  const trigger = (req, next = () => Promise.resolve('unavailable')) => (handlers.get('approval/request') ?? [])[0](req, next)
  return { bridge, clock, sent, trigger, config, handlers }
}

function approvalRequest(overrides = {}) {
  const controller = new AbortController()
  return {
    req: {
      agent: { session: { id: 'session-1' } },
      toolName: 'bash',
      reason: '需要写入工作区外',
      signal: controller.signal,
      ...overrides,
    },
    controller,
  }
}

function groupReply(text, role = 'owner') {
  return { groupId: 100, text, sender: { role }, userId: 205, messageId: 'm-approve' }
}

test('approval bridge：非映射会话交给下一个应答者（GUI）', async (t) => {
  const { trigger } = createHarness(t)
  let nextCalled = false
  const { req } = approvalRequest({ agent: { session: { id: 'session-gui' } } })
  const outcome = await trigger(req, () => { nextCalled = true; return Promise.resolve('rejected') })
  assert.equal(nextCalled, true)
  assert.equal(outcome, 'rejected')
})

test('approval bridge：群里「同意」→ allowed-once，并回执', async (t) => {
  const { bridge, sent, trigger } = createHarness(t)
  const { req } = approvalRequest()
  const pending = trigger(req)
  await flush()
  assert.equal(sent.length, 1)
  assert.match(sent[0].text, /审批请求/)
  assert.match(sent[0].text, /bash/)
  assert.equal(bridge.pendingCount(), 1)

  assert.equal(bridge.intercept(groupReply('同意')), true)
  assert.equal(await pending, 'allowed-once')
  await flush()
  assert.ok(sent.some((item) => item.text.includes('已同意')))
})

test('approval bridge：群里「拒绝」→ rejected', async (t) => {
  const { bridge, trigger } = createHarness(t)
  const pending = trigger(approvalRequest().req)
  await flush()
  assert.equal(bridge.intercept(groupReply('拒绝')), true)
  assert.equal(await pending, 'rejected')
})

test('approval bridge：普通成员回复被忽略，消息被消费并提示', async (t) => {
  const { bridge, sent, trigger } = createHarness(t)
  const pending = trigger(approvalRequest().req)
  await flush()
  assert.equal(bridge.intercept(groupReply('同意', 'member')), true)
  assert.equal(bridge.pendingCount(), 1)
  await flush()
  assert.ok(sent.some((item) => item.text.includes('群主')))

  assert.equal(bridge.intercept(groupReply('拒绝', 'admin')), true)
  assert.equal(await pending, 'rejected')
})

test('approval bridge：超时按拒绝处理并提示', async (t) => {
  const { bridge, clock, sent, trigger } = createHarness(t)
  const pending = trigger(approvalRequest().req)
  await flush()
  assert.equal(bridge.pendingCount(), 1)
  clock.advance(120000)
  assert.equal(await pending, 'rejected')
  await flush()
  assert.ok(sent.some((item) => item.text.includes('超时')))
})

test('approval bridge：请求被取消（signal abort）→ cancelled', async (t) => {
  const { sent, trigger } = createHarness(t)
  const { req, controller } = approvalRequest()
  const pending = trigger(req)
  await flush()
  controller.abort()
  assert.equal(await pending, 'cancelled')
  assert.equal(sent.length, 1, '取消不再重复发送提示')
})

test('approval bridge：relay 离线 / 发送失败 → unavailable（fail closed）', async (t) => {
  const offline = createHarness(t, { sendText: async () => ({ queued: true }) })
  assert.equal(await offline.trigger(approvalRequest().req), 'unavailable')
  assert.equal(offline.bridge.pendingCount(), 0)

  const failing = createHarness(t, { sendText: async () => { throw new Error('relay 未启动') } })
  assert.equal(await failing.trigger(approvalRequest().req), 'unavailable')
})

test('approval bridge：同群已有待审批 → 交给 GUI', async (t) => {
  const { bridge, trigger } = createHarness(t)
  const first = trigger(approvalRequest().req)
  await flush()
  let nextCalled = false
  const second = await trigger(approvalRequest().req, () => { nextCalled = true; return Promise.resolve('rejected') })
  assert.equal(nextCalled, true)
  assert.equal(second, 'rejected')
  bridge.intercept(groupReply('同意'))
  assert.equal(await first, 'allowed-once')
})

test('approval bridge：非审批文本不消费、非本群不消费', async (t) => {
  const { bridge, trigger } = createHarness(t)
  const pending = trigger(approvalRequest().req)
  await flush()
  assert.equal(bridge.intercept({ groupId: 100, text: '你好', sender: { role: 'owner' } }), false)
  assert.equal(bridge.intercept({ groupId: 200, text: '同意', sender: { role: 'owner' } }), false)
  bridge.intercept(groupReply('同意'))
  assert.equal(await pending, 'allowed-once')
})

test('approval bridge：停用时全部交给 GUI；stop() 取消待审批', async (t) => {
  const disabled = createHarness(t, { config: { enabled: false } })
  let nextCalled = false
  await disabled.trigger(approvalRequest().req, () => { nextCalled = true; return Promise.resolve('rejected') })
  assert.equal(nextCalled, true)

  const active = createHarness(t)
  const pending = active.trigger(approvalRequest().req)
  await flush()
  active.bridge.stop()
  assert.equal(await pending, 'cancelled')
  assert.equal(active.handlers.get('approval/request').length, 0)
})
