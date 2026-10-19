/**
 * relay 单测：用假 ctx / 假 client / 假 api 验证入向判定与出向回发。
 * 运行：pnpm test  ==  node --test test/*.test.js
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { normalizeConfig } from '../lib/model/config.js'
import { createMappingStore } from '../lib/model/mapping.js'
import { createStateStore } from '../lib/model/state.js'
import { createChatLog } from '../lib/model/chat-log.js'
import { createRelay } from '../lib/controller/relay.js'

const flush = async () => {
  for (let i = 0; i < 8; i += 1) await new Promise((resolve) => setTimeout(resolve, 0))
}

function createHarness(t) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-qq-relay-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))

  const handlers = new Map()
  const calls = { create: [], rename: [], prompt: [], attach: [], workspace: [], sends: [] }

  const ctx = {
    logger: () => ({ info() {}, warn() {}, error() {} }),
    on(name, handler) {
      if (!handlers.has(name)) handlers.set(name, new Set())
      handlers.get(name).add(handler)
      return () => handlers.get(name)?.delete(handler)
    },
    emit(name, ...args) {
      for (const handler of [...(handlers.get(name) ?? [])]) handler(...args)
    },
    sessionController: {
      async create(request) {
        calls.create.push(request)
        return { sessionId: 'session-' + String(calls.create.length) }
      },
      async rename(request) { calls.rename.push(request) },
      async prompt(request) { calls.prompt.push(request); return { accepted: true } },
    },
    workspaceRegistry: {
      async create(path) {
        calls.workspace.push(path)
        return {
          path,
          async attachSession(sessionId) { calls.attach.push(sessionId) },
        }
      },
    },
  }

  const client = { on() { return () => {} } }
  const api = {
    async sendGroupText(groupId, text) {
      calls.sends.push({ groupId, text })
      return { status: 'ok', retcode: 0, data: { message_id: 'm' + String(calls.sends.length) } }
    },
  }

  const config = normalizeConfig({
    wsUrl: 'ws://127.0.0.1:3001',
    accessToken: 'token',
    selfId: 999,
    groups: [100],
    workspace: dir,
    commandPrefixes: ['/dsh'],
  }).config

  const mapping = createMappingStore(join(dir, 'mapping.json'))
  const state = createStateStore(join(dir, 'state.json'))
  const chatLog = createChatLog({ dir: join(dir, 'chat'), retentionDays: 7 })
  const relay = createRelay({ ctx, config, logger: null, client, api, mapping, state, chatLog })
  relay.start()

  t.after(() => relay.stop())
  return { relay, ctx, calls, mapping, state, chatLog, config }
}

function groupEvent(overrides = {}) {
  return {
    post_type: 'message',
    message_type: 'group',
    self_id: 999,
    group_id: 100,
    group_name: '测试群',
    user_id: 205,
    message_id: 1,
    time: 1792340775,
    sender: { user_id: 205, nickname: 'tester', card: '', role: 'owner' },
    message: [
      { type: 'at', data: { qq: '999' } },
      { type: 'text', data: { text: ' ' } },
      { type: 'text', data: { text: '你好' } },
    ],
    raw_message: '[CQ:at,qq=999] 你好',
    ...overrides,
  }
}

test('relay：@ 消息直通、建会话、prompt 带昵称前缀', async (t) => {
  const { relay, calls, mapping } = createHarness(t)
  relay.handleRawEvent(groupEvent())
  await flush()

  assert.equal(calls.create.length, 1)
  assert.equal(calls.rename[0].title, 'QQ群：测试群')
  assert.deepEqual(calls.attach, ['session-1'])
  assert.equal(calls.prompt.length, 1)
  assert.equal(calls.prompt[0].content[0].text, '[tester] 你好')
  assert.equal(calls.prompt[0].sessionId, 'session-1')
  assert.equal(mapping.get(100).sessionId, 'session-1')
})

test('relay：同一条 message_id 只处理一次', async (t) => {
  const { relay, calls } = createHarness(t)
  relay.handleRawEvent(groupEvent())
  relay.handleRawEvent(groupEvent())
  await flush()
  assert.equal(calls.prompt.length, 1)
  assert.equal(calls.create.length, 1)
})

test('relay：非白名单群直接丢弃', async (t) => {
  const { relay, calls } = createHarness(t)
  relay.handleRawEvent(groupEvent({ group_id: 200 }))
  await flush()
  assert.equal(calls.prompt.length, 0)
  assert.equal(calls.create.length, 0)
})

test('relay：普通消息落聊天日志但不直通', async (t) => {
  const { relay, calls, chatLog } = createHarness(t)
  relay.handleRawEvent(groupEvent({
    message: [{ type: 'text', data: { text: '随便聊聊' } }],
    raw_message: '随便聊聊',
  }))
  await flush()
  assert.equal(calls.prompt.length, 0)
  // 事件自带固定 time，不能拿「当前时间前一小时」当窗口（会随时间腐烂）；窗口从 0 起。
  const records = chatLog.readRecent(100, 0)
  assert.equal(records.length, 1)
  assert.equal(records[0].text, '随便聊聊')
})

test('relay：命令前缀直通', async (t) => {
  const { relay, calls } = createHarness(t)
  relay.handleRawEvent(groupEvent({
    message_id: 2,
    message: [{ type: 'text', data: { text: '/dsh 状态' } }],
    raw_message: '/dsh 状态',
  }))
  await flush()
  assert.equal(calls.prompt.length, 1)
  assert.equal(calls.prompt[0].content[0].text, '[tester] /dsh 状态')
})

test('relay：引用回复直通', async (t) => {
  const { relay, calls } = createHarness(t)
  relay.handleRawEvent(groupEvent({
    message_id: 3,
    raw_message: '[CQ:reply,id=42] 在吗',
    message: [{ type: 'reply', data: { id: '42' } }, { type: 'text', data: { text: '在吗' } }],
  }))
  await flush()
  assert.equal(calls.prompt.length, 1)
  assert.equal(calls.prompt[0].content[0].text, '[tester] 在吗')
})

test('relay：turn/end 收集 assistant 文本并回发', async (t) => {
  const { relay, ctx, calls, state } = createHarness(t)
  relay.handleRawEvent(groupEvent())
  await flush()

  const requestId = calls.prompt[0].requestId
  ctx.emit('agent/inbox/claimed', {
    agent: { session: { id: 'session-1' } },
    message: { source: { rpcId: requestId } },
    turn: 3,
  })
  ctx.emit('session/event', { header: { id: 'session-1' } }, {
    type: 'assistant/message',
    data: { turn: 3, message: { content: [{ type: 'reasoning', text: '思考' }, { type: 'text', text: '你好呀' }] } },
  })
  ctx.emit('session/event', { header: { id: 'session-1' } }, {
    type: 'turn/end',
    data: { turn: 3, reason: { kind: 'completed' } },
  })
  await flush()

  assert.deepEqual(calls.sends, [{ groupId: 100, text: '你好呀' }])
  assert.ok(state.get(100).lastBotSpeakAt > 0)
})

test('relay：非本轮的 turn/end 不回发', async (t) => {
  const { relay, ctx, calls } = createHarness(t)
  relay.handleRawEvent(groupEvent())
  await flush()

  const requestId = calls.prompt[0].requestId
  ctx.emit('agent/inbox/claimed', {
    agent: { session: { id: 'session-1' } },
    message: { source: { rpcId: requestId } },
    turn: 3,
  })
  ctx.emit('session/event', { header: { id: 'session-1' } }, {
    type: 'assistant/message',
    data: { turn: 3, message: { content: [{ type: 'text', text: '你好呀' }] } },
  })
  ctx.emit('session/event', { header: { id: 'session-1' } }, {
    type: 'turn/end',
    data: { turn: 4, reason: { kind: 'completed' } },
  })
  await flush()
  assert.equal(calls.sends.length, 0)
})

test('relay：长回复按 chunk 切分', async (t) => {
  const { relay, ctx, calls } = createHarness(t)
  relay.handleRawEvent(groupEvent())
  await flush()

  const requestId = calls.prompt[0].requestId
  ctx.emit('agent/inbox/claimed', {
    agent: { session: { id: 'session-1' } },
    message: { source: { rpcId: requestId } },
    turn: 1,
  })
  ctx.emit('session/event', { header: { id: 'session-1' } }, {
    type: 'assistant/message',
    data: { turn: 1, message: { content: [{ type: 'text', text: 'y'.repeat(3200) }] } },
  })
  ctx.emit('session/event', { header: { id: 'session-1' } }, {
    type: 'turn/end',
    data: { turn: 1, reason: { kind: 'completed' } },
  })
  await flush()

  assert.equal(calls.sends.length, 3)
  assert.ok(calls.sends.every((send) => send.text.length <= 1500))
  assert.equal(calls.sends.map((send) => send.text).join(''), 'y'.repeat(3200))
})
