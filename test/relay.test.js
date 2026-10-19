/**
 * relay 单测：用假 ctx / 假 client / 假 api 验证入向判定与出向回发。
 * 运行：pnpm test  ==  node --test test/*.test.js
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { normalizeConfig } from '../lib/model/config.js'
import { createMappingStore } from '../lib/model/mapping.js'
import { createStateStore } from '../lib/model/state.js'
import { createChatLog, localDateKey } from '../lib/model/chat-log.js'
import { chatRootFor, ensureRelayDir, projectDirFor } from '../lib/model/project.js'
import { ACK_TEXT } from '../lib/model/reply.js'
import { createRelay } from '../lib/controller/relay.js'

const flush = async () => {
  for (let i = 0; i < 8; i += 1) await new Promise((resolve) => setTimeout(resolve, 0))
}
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function createHarness(t, options = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-qq-relay-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))

  const handlers = new Map()
  const calls = { create: [], rename: [], prompt: [], attach: [], workspace: [], sends: [], replies: [], cancel: [] }

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
      cancel(request) { calls.cancel.push(request); return { accepted: true } },
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

  const clientHandlers = new Map()
  const client = {
    connected: options.connected !== false,
    on(name, handler) {
      if (!clientHandlers.has(name)) clientHandlers.set(name, new Set())
      clientHandlers.get(name).add(handler)
      return () => { clientHandlers.get(name)?.delete(handler) }
    },
    emit(name, payload) {
      for (const handler of [...(clientHandlers.get(name) ?? [])]) handler(payload)
    },
    isOpen() { return this.connected },
  }
  const api = {
    async sendGroupText(groupId, text) {
      calls.sends.push({ groupId, text })
      return { status: 'ok', retcode: 0, data: { message_id: 'm' + String(calls.sends.length) } }
    },
    async sendGroupReply(groupId, messageId, text) {
      calls.replies.push({ groupId, messageId, text })
      if (options.replyFails === true) {
        return { status: 'failed', retcode: 1200, message: '引用消息不存在', data: null }
      }
      calls.sends.push({ groupId, text })
      return { status: 'ok', retcode: 0, data: { message_id: 'r' + String(calls.replies.length) } }
    },
  }

  const config = normalizeConfig({
    wsUrl: 'ws://127.0.0.1:3001',
    accessToken: 'token',
    selfId: 999,
    groups: [100],
    workspace: dir,
    commandPrefixes: ['/dsh'],
    gate: options.gate,
    // 单测默认关掉回复体验增强（引用 / 连发合并 / 处理中占位），避免每条消息多等窗口。
    reply: options.reply ?? { quote: false, mergeWindowMs: 0, ackDelayMs: 0 },
  }).config

  const mapping = createMappingStore(join(dir, 'mapping.json'))
  const state = createStateStore({ dir: join(dir, 'state') })
  const chatLog = createChatLog({
    // 与组合根一致：聊天日志落在群项目的 .qq-relay/chat 下
    rootFor: (groupId) => {
      const projectDir = projectDirFor({ config, mapping, groupId })
      ensureRelayDir(projectDir)
      return chatRootFor(projectDir)
    },
    retentionDays: 7,
  })
  const relay = createRelay({ ctx, config, logger: null, client, api, mapping, state, chatLog, classifier: options.classifier ?? null, interceptors: options.interceptors ?? [], fetchImpl: options.fetchImpl ?? null })
  relay.start()

  t.after(() => relay.stop())
  return { relay, ctx, calls, mapping, state, chatLog, config, client, dir }
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

function textEvent(text, overrides = {}) {
  return groupEvent({
    message: [{ type: 'text', data: { text } }],
    raw_message: text,
    ...overrides,
  })
}

test('relay：@ 消息直通、建会话、prompt 带群名 / 时间 / @ 标记 / 历史指针', async (t) => {
  const { relay, calls, mapping, config } = createHarness(t)
  relay.handleRawEvent(groupEvent())
  await flush()

  assert.equal(calls.create.length, 1)
  assert.equal(calls.rename[0].title, 'QQ群：测试群')
  assert.deepEqual(calls.attach, ['session-1'])
  assert.equal(calls.prompt.length, 1)
  const text = calls.prompt[0].content[0].text
  assert.ok(text.startsWith('[QQ群：测试群（100）] '), text)
  assert.ok(text.includes('新消息 1 条（直通：@）'), text)
  assert.ok(text.includes('[tester]（@你）你好'), text)
  assert.ok(text.includes('[历史记录：.qq-relay/chat/100/'), text)
  assert.equal(calls.prompt[0].sessionId, 'session-1')
  assert.equal(calls.create[0].cwd, config.workspace, '会话 cwd 用群项目目录')
  assert.equal(mapping.get(100).sessionId, 'session-1')
  assert.equal(mapping.get(100).workspacePath, config.workspace)
})

test('relay：聊天日志与 .qq-relay 落在群项目目录（含 @ / 引用元信息）', async (t) => {
  const { relay, dir } = createHarness(t)
  relay.handleRawEvent(groupEvent({
    message_id: 71,
    message: [{ type: 'text', data: { text: '记录我' } }],
    raw_message: '记录我',
  }))
  relay.handleRawEvent(groupEvent({ message_id: 72 }))
  relay.handleRawEvent(groupEvent({
    message_id: 73,
    message: [{ type: 'reply', data: { id: '42' } }, { type: 'text', data: { text: '引用我' } }],
    raw_message: '[CQ:reply,id=42] 引用我',
  }))
  await flush()

  assert.equal(readFileSync(join(dir, '.qq-relay', '.gitignore'), 'utf8'), '*\n')
  const chatDir = join(dir, '.qq-relay', 'chat', '100')
  const files = readdirSync(chatDir)
  assert.equal(files.length, 1)
  const records = readFileSync(join(chatDir, files[0]), 'utf8').trim().split('\n').map((line) => JSON.parse(line))
  assert.equal(records.length, 3)
  assert.deepEqual(records.map((record) => record.messageId).sort(), ['71', '72', '73'])
  assert.equal(records.every((record) => record.groupId === '100'), true, '每条记录都带 groupId')

  const plain = records.find((record) => record.messageId === '71')
  assert.equal(plain.text, '记录我')
  assert.equal(plain.mentionsSelf, false)

  const mention = records.find((record) => record.messageId === '72')
  assert.equal(mention.mentionsSelf, true, '日志要保留 @ 元信息')
  assert.equal(mention.replyToId, null)

  const quote = records.find((record) => record.messageId === '73')
  assert.equal(quote.replyToId, '42', '日志要保留引用元信息')
  assert.equal(quote.mentionsSelf, false)
})

test('relay：图片消息下载到 .qq-relay/media 并写进聊天日志', async (t) => {
  const body = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4])
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    headers: { get: (name) => (String(name).toLowerCase() === 'content-type' ? 'image/png' : null) },
    async arrayBuffer() { return body },
  })
  const { relay, dir } = createHarness(t, { fetchImpl })
  relay.handleRawEvent(groupEvent({
    message_id: 81,
    message: [{ type: 'image', data: { file: 'x.png', url: 'https://example.com/x.png', sub_type: 0 } }],
    raw_message: '[CQ:image,file=x.png,url=https://example.com/x.png]',
  }))
  await wait(30)

  const dateKey = localDateKey(1792340775 * 1000)
  const mediaFile = join(dir, '.qq-relay', 'media', '100', dateKey, '81-0.png')
  assert.equal(existsSync(mediaFile), true, '图片应下载到 .qq-relay/media')
  assert.equal(readFileSync(mediaFile).length, body.length)

  const chatDir = join(dir, '.qq-relay', 'chat', '100')
  const records = readFileSync(join(chatDir, readdirSync(chatDir)[0]), 'utf8').trim().split('\n').map((line) => JSON.parse(line))
  const record = records.find((item) => item.messageId === '81')
  assert.equal(record.media.length, 1)
  assert.equal(record.media[0].status, 'saved')
  assert.equal(record.media[0].path, '.qq-relay/media/100/' + dateKey + '/81-0.png')
  assert.equal(existsSync(join(dir, record.media[0].path)), true, '日志里的相对路径可直接访问')
})

test('relay：@ 带图且无文本时，prompt 带媒体标记并转给 DSH', async (t) => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    headers: { get: (name) => (String(name).toLowerCase() === 'content-type' ? 'image/png' : null) },
    async arrayBuffer() { return Buffer.from([1, 2, 3]) },
  })
  const { relay, calls } = createHarness(t, { fetchImpl })
  relay.handleRawEvent(groupEvent({
    message_id: 82,
    message: [
      { type: 'at', data: { qq: '999' } },
      { type: 'image', data: { file: 'y.png', url: 'https://example.com/y.png', sub_type: 0 } },
    ],
    raw_message: '[CQ:at,qq=999][CQ:image,file=y.png,url=https://example.com/y.png]',
  }))
  await wait(30)

  assert.equal(calls.prompt.length, 1)
  const text = calls.prompt[0].content[0].text
  assert.ok(text.includes('（直通：@）'), text)
  assert.ok(text.includes('（@你）'), text)
  assert.ok(text.includes('[图片：.qq-relay/media/100/'), text)
})

test('relay：媒体下载失败时聊天日志记 failed 且不阻断消息', async (t) => {
  const fetchImpl = async () => ({ ok: false, status: 403, headers: { get: () => null }, async arrayBuffer() { return Buffer.alloc(0) } })
  const { relay, calls, dir } = createHarness(t, { fetchImpl })
  relay.handleRawEvent(groupEvent({
    message_id: 83,
    message: [
      { type: 'at', data: { qq: '999' } },
      { type: 'image', data: { file: 'z.png', url: 'https://example.com/z.png', sub_type: 0 } },
    ],
    raw_message: '[CQ:at,qq=999][CQ:image,file=z.png,url=https://example.com/z.png]',
  }))
  await wait(30)

  const chatDir = join(dir, '.qq-relay', 'chat', '100')
  const records = readFileSync(join(chatDir, readdirSync(chatDir)[0]), 'utf8').trim().split('\n').map((line) => JSON.parse(line))
  const record = records.find((item) => item.messageId === '83')
  assert.equal(record.media[0].status, 'failed')
  assert.equal(record.media[0].reason, 'http-403')
  assert.equal(calls.prompt.length, 1, '下载失败不阻断直通')
  assert.ok(calls.prompt[0].content[0].text.includes('[媒体下载失败]'))
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
  const text = calls.prompt[0].content[0].text
  assert.ok(text.includes('（直通：命令）'), text)
  assert.ok(text.includes('[tester] /dsh 状态'), text)
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
  const text = calls.prompt[0].content[0].text
  assert.ok(text.includes('（直通：引用）'), text)
  assert.ok(text.includes('[tester]（引用 42）在吗'), text)
})

test('relay：turn/end 收集 assistant 文本并回发', async (t) => {
  const { relay, ctx, calls, state, chatLog } = createHarness(t)
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

  // bot 自己的发言也写进聊天日志，供 jev 分类器当上下文
  const botRecord = chatLog.readRecent(100, 0).find((record) => record.role === 'bot')
  assert.equal(botRecord.text, '你好呀')
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

test('relay：闸门开启后普通消息合并成一次 prompt', async (t) => {
  const classifierCalls = []
  const classifier = {
    async classify(input) {
      classifierCalls.push(input)
      return { reply: true, confidence: 0.9, reason: '测试', targetMsgIds: [] }
    },
  }
  const { relay, ctx, calls, state } = createHarness(t, { gate: { enabled: true, debounce: '20ms' }, classifier })
  state.update(100, { lastBotSpeakAt: Date.now() - 1000 })
  relay.handleRawEvent(textEvent('第一条', { message_id: 11 }))
  relay.handleRawEvent(textEvent('第二条', { message_id: 12 }))
  await wait(150)

  assert.equal(classifierCalls.length, 1)
  assert.equal(classifierCalls[0].messages.length, 2)
  assert.equal(calls.prompt.length, 1)
  const text = calls.prompt[0].content[0].text
  assert.ok(text.startsWith('[QQ群：测试群（100）] '), text)
  assert.ok(text.includes('[tester] 第一条\n'), text)
  assert.ok(text.includes('[tester] 第二条'), text)
  assert.ok(text.includes('[历史记录：.qq-relay/chat/100/'), text)
  assert.equal(state.get(100).dshBusy, true, '派发后应标记 DSH 忙')

  ctx.emit('session/event', { header: { id: 'session-1' } }, {
    type: 'turn/end',
    data: { turn: 1, reason: { kind: 'completed' } },
  })
  await flush()
  assert.equal(state.get(100).dshBusy, false, 'turn 结束后应解除忙标记')
})

test('relay：闸门开启时 @ 直通立即派发，不调用分类器', async (t) => {
  const classifierCalls = []
  const classifier = {
    async classify(input) {
      classifierCalls.push(input)
      return { reply: false, confidence: 0, reason: '不需要', targetMsgIds: [] }
    },
  }
  const { relay, calls } = createHarness(t, { gate: { enabled: true, debounce: '10ms' }, classifier })
  relay.handleRawEvent(groupEvent({ message_id: 21 }))
  await flush()
  assert.equal(calls.prompt.length, 1)

  await wait(80)
  assert.equal(classifierCalls.length, 0)
  assert.equal(calls.prompt.length, 1)
})

test('relay：闸门开启但未接分类器 → 普通消息 fail closed 不派发', async (t) => {
  const { relay, calls, state } = createHarness(t, { gate: { enabled: true, debounce: '10ms' } })
  state.update(100, { lastBotSpeakAt: Date.now() - 1000 })
  relay.handleRawEvent(textEvent('有人说话', { message_id: 31 }))
  await wait(100)
  assert.equal(calls.prompt.length, 0)
})

test('relay：断线时回复进入发送队列，重连后补发', async (t) => {
  const { relay, ctx, calls, client } = createHarness(t, { connected: false })
  relay.handleRawEvent(groupEvent({ message_id: 41 }))
  await flush()
  assert.equal(calls.prompt.length, 1)

  const requestId = calls.prompt[0].requestId
  ctx.emit('agent/inbox/claimed', {
    agent: { session: { id: 'session-1' } },
    message: { source: { rpcId: requestId } },
    turn: 1,
  })
  ctx.emit('session/event', { header: { id: 'session-1' } }, {
    type: 'assistant/message',
    data: { turn: 1, message: { content: [{ type: 'text', text: '离线期间的回复' }] } },
  })
  ctx.emit('session/event', { header: { id: 'session-1' } }, {
    type: 'turn/end',
    data: { turn: 1, reason: { kind: 'completed' } },
  })
  await flush()
  assert.equal(calls.sends.length, 0, '断线时不应直接发送')

  client.connected = true
  client.emit('open')
  await flush()
  assert.deepEqual(calls.sends, [{ groupId: 100, text: '离线期间的回复' }])
})

test('relay：sendText 切分发送并刷新发言状态', async (t) => {
  const { relay, calls, state } = createHarness(t)
  const value = await relay.sendText(100, 'x'.repeat(3200))
  assert.equal(value.queued, false)
  assert.equal(value.chunks, 3)
  assert.equal(value.groupId, 100)
  assert.equal(calls.sends.length, 3)
  assert.equal(calls.sends.map((send) => send.text).join(''), 'x'.repeat(3200))
  assert.ok(state.get(100).lastBotSpeakAt > 0)
})

test('relay：sendText 校验白名单', async (t) => {
  const { relay, calls } = createHarness(t)
  await assert.rejects(() => relay.sendText(999, 'hi'), /不在白名单/)
  assert.equal(calls.sends.length, 0)
})

test('relay：sendText 离线进队列，重连后补发', async (t) => {
  const { relay, calls, client } = createHarness(t, { connected: false })
  const value = await relay.sendText(100, '离线通知')
  assert.equal(value.queued, true)
  assert.equal(calls.sends.length, 0)

  client.connected = true
  client.emit('open')
  await flush()
  assert.deepEqual(calls.sends, [{ groupId: 100, text: '离线通知' }])
})

test('relay：入向拦截器可以消费群消息（审批回复优先于直通）', async (t) => {
  const consumed = []
  const interceptors = [(event) => { consumed.push(event.messageId); return true }]
  const { relay, calls } = createHarness(t, { interceptors })
  relay.handleRawEvent(groupEvent({ message_id: 61 }))
  await flush()
  assert.deepEqual(consumed, ['61'])
  assert.equal(calls.prompt.length, 0, '被拦截的 @ 消息不应派发')
})

test('relay：拦截器返回 false 时消息照常走直通', async (t) => {
  const interceptors = [() => false]
  const { relay, calls } = createHarness(t, { interceptors })
  relay.handleRawEvent(groupEvent({ message_id: 62 }))
  await flush()
  assert.equal(calls.prompt.length, 1)
})

test('relay：拦截器抛异常不影响后续处理', async (t) => {
  const interceptors = [() => { throw new Error('boom') }]
  const { relay, calls } = createHarness(t, { interceptors })
  relay.handleRawEvent(groupEvent({ message_id: 63 }))
  await flush()
  assert.equal(calls.prompt.length, 1)
})
test('relay：/new 裸写命令新建会话并重绑映射，不派发 prompt', async (t) => {
  const { relay, calls, mapping } = createHarness(t)
  relay.handleRawEvent(textEvent('/new', { message_id: 91 }))
  await wait(20)

  assert.equal(calls.prompt.length, 0, '命令不应变成 prompt')
  assert.equal(calls.create.length, 1)
  assert.equal(calls.sends.length, 1)
  assert.ok(calls.sends[0].text.includes('已新建会话'), calls.sends[0].text)
  assert.ok(calls.sends[0].text.includes('session-1'), calls.sends[0].text)
  assert.equal(mapping.get(100).sessionId, 'session-1')
  assert.ok(mapping.get(100).title.startsWith('QQ群：测试群（'), mapping.get(100).title)

  // 下一条 @ 消息复用新会话
  relay.handleRawEvent(groupEvent({ message_id: 92 }))
  await flush()
  assert.equal(calls.prompt.length, 1)
  assert.equal(calls.prompt[0].sessionId, 'session-1')
})

test('relay：/new 支持自定义标题与 /dsh 前缀写法', async (t) => {
  const { relay, calls, mapping } = createHarness(t)
  relay.handleRawEvent(textEvent('/dsh new 修登录', { message_id: 93 }))
  await wait(20)
  assert.equal(calls.create.length, 1)
  assert.equal(mapping.get(100).title, '修登录')
  assert.ok(calls.sends[0].text.includes('修登录'), calls.sends[0].text)
})

test('relay：/status 汇报会话 / 闸门 / 队列，且不刷新闸门发言窗口', async (t) => {
  const { relay, calls, state } = createHarness(t)
  relay.handleRawEvent(textEvent('/status', { message_id: 94 }))
  await wait(20)

  assert.equal(calls.prompt.length, 0)
  assert.equal(calls.sends.length, 1)
  const text = calls.sends[0].text
  assert.ok(text.includes('【QQ relay 状态】'), text)
  assert.ok(text.includes('100（测试群）'), text)
  assert.ok(text.includes('会话：未创建'), text)
  assert.ok(text.includes('待评估：0 条 / 0 批'), text)
  assert.equal(Number(state.get(100).lastReplyAt) || 0, 0, '命令回复不算接话，不能刷新发言窗口')
})

test('relay：/help 列出命令', async (t) => {
  const { relay, calls } = createHarness(t)
  relay.handleRawEvent(textEvent('/help', { message_id: 95 }))
  await wait(20)
  assert.equal(calls.sends.length, 1)
  assert.ok(calls.sends[0].text.includes('QQ relay 命令'), calls.sends[0].text)
  assert.ok(calls.sends[0].text.includes('/dsh new'), calls.sends[0].text)
})

test('relay：非管理员发命令被静默忽略', async (t) => {
  const { relay, calls } = createHarness(t)
  relay.handleRawEvent(textEvent('/new', {
    message_id: 96,
    sender: { user_id: 205, nickname: '路人', card: '', role: 'member' },
  }))
  await wait(20)
  assert.equal(calls.create.length, 0)
  assert.equal(calls.sends.length, 0, '不回复以避免刷屏')
  assert.equal(calls.prompt.length, 0, '命令也不能当普通消息派发')
})

test('relay：未识别的 /dsh 文本仍按命令前缀直通给 DSH', async (t) => {
  const { relay, calls } = createHarness(t)
  relay.handleRawEvent(textEvent('/dsh 帮我看看这段代码', { message_id: 97 }))
  await flush()
  assert.equal(calls.sends.length, 0)
  assert.equal(calls.prompt.length, 1, '未知命令名 → 保持原直通行为')
  assert.ok(calls.prompt[0].content[0].text.includes('帮我看看这段代码'), calls.prompt[0].content[0].text)
  assert.ok(calls.prompt[0].content[0].text.includes('直通：命令'), calls.prompt[0].content[0].text)
})

test('relay：/stop 中断进行中的轮次并回复', async (t) => {
  const { relay, calls, ctx } = createHarness(t)
  relay.handleRawEvent(groupEvent({ message_id: 98 }))
  await flush()
  assert.equal(calls.prompt.length, 1)

  relay.handleRawEvent(textEvent('/stop', { message_id: 99 }))
  await wait(20)
  assert.deepEqual(calls.cancel, [{ sessionId: 'session-1' }])
  assert.equal(calls.sends.length, 1)
  assert.ok(calls.sends[0].text.includes('已请求中断'), calls.sends[0].text)

  // 让本轮结束，避免 t.after 里的 stop 留下 pending（无副作用，仅清理）
  ctx.emit('session/event', { header: { id: 'session-1' }, id: 'session-1' }, { type: 'turn/end', data: { turn: 0, reason: { kind: 'cancelled' } } })
  await flush()
})

test('relay：/stop 在没有进行中轮次时只回提示', async (t) => {
  const { relay, calls } = createHarness(t)
  relay.handleRawEvent(textEvent('/stop', { message_id: 100 }))
  await wait(20)
  assert.equal(calls.cancel.length, 0)
  assert.ok(calls.sends[0].text.includes('本群还没有会话'), calls.sends[0].text)
})
test('relay：回复引用触发消息（v0.11.1）', async (t) => {
  const { relay, ctx, calls } = createHarness(t, { reply: { quote: true, mergeWindowMs: 0, ackDelayMs: 0 } })
  relay.handleRawEvent(groupEvent({ message_id: 77 }))
  await flush()

  const requestId = calls.prompt[0].requestId
  ctx.emit('agent/inbox/claimed', {
    agent: { session: { id: 'session-1' } },
    message: { source: { rpcId: requestId } },
    turn: 1,
  })
  ctx.emit('session/event', { header: { id: 'session-1' } }, {
    type: 'assistant/message',
    data: { turn: 1, message: { content: [{ type: 'text', text: '回答' }] } },
  })
  ctx.emit('session/event', { header: { id: 'session-1' } }, {
    type: 'turn/end',
    data: { turn: 1, reason: { kind: 'completed' } },
  })
  await flush()

  assert.deepEqual(calls.replies, [{ groupId: 100, messageId: '77', text: '回答' }])
  assert.equal(calls.sends.length, 1, '引用发送成功后不再发普通消息')
})

test('relay：引用发送被拒时回退成普通发送', async (t) => {
  const { relay, ctx, calls } = createHarness(t, {
    reply: { quote: true, mergeWindowMs: 0, ackDelayMs: 0 },
    replyFails: true,
  })
  relay.handleRawEvent(groupEvent({ message_id: 79 }))
  await flush()

  const requestId = calls.prompt[0].requestId
  ctx.emit('agent/inbox/claimed', {
    agent: { session: { id: 'session-1' } },
    message: { source: { rpcId: requestId } },
    turn: 1,
  })
  ctx.emit('session/event', { header: { id: 'session-1' } }, {
    type: 'assistant/message',
    data: { turn: 1, message: { content: [{ type: 'text', text: '回答' }] } },
  })
  ctx.emit('session/event', { header: { id: 'session-1' } }, {
    type: 'turn/end',
    data: { turn: 1, reason: { kind: 'completed' } },
  })
  await flush()

  assert.equal(calls.replies.length, 1, '先尝试引用发送')
  assert.equal(calls.replies[0].messageId, '79')
  assert.deepEqual(calls.sends, [{ groupId: 100, text: '回答' }], '引用失败后普通发送兜底')
})

test('relay：慢轮次先回「处理中」占位，结束后再发结果', async (t) => {
  const { relay, ctx, calls } = createHarness(t, { reply: { quote: false, mergeWindowMs: 0, ackDelayMs: 20 } })
  relay.handleRawEvent(groupEvent({ message_id: 80 }))
  await wait(60)

  assert.equal(calls.sends.length, 1)
  assert.equal(calls.sends[0].text, ACK_TEXT)

  const requestId = calls.prompt[0].requestId
  ctx.emit('agent/inbox/claimed', {
    agent: { session: { id: 'session-1' } },
    message: { source: { rpcId: requestId } },
    turn: 1,
  })
  ctx.emit('session/event', { header: { id: 'session-1' } }, {
    type: 'assistant/message',
    data: { turn: 1, message: { content: [{ type: 'text', text: '最终回答' }] } },
  })
  ctx.emit('session/event', { header: { id: 'session-1' } }, {
    type: 'turn/end',
    data: { turn: 1, reason: { kind: 'completed' } },
  })
  await flush()

  assert.equal(calls.sends.length, 2)
  assert.equal(calls.sends[1].text, '最终回答')
})

test('relay：快轮次不产生「处理中」占位', async (t) => {
  const { relay, ctx, calls } = createHarness(t, { reply: { quote: false, mergeWindowMs: 0, ackDelayMs: 1000 } })
  relay.handleRawEvent(groupEvent({ message_id: 83 }))
  await flush()

  const requestId = calls.prompt[0].requestId
  ctx.emit('agent/inbox/claimed', {
    agent: { session: { id: 'session-1' } },
    message: { source: { rpcId: requestId } },
    turn: 1,
  })
  ctx.emit('session/event', { header: { id: 'session-1' } }, {
    type: 'assistant/message',
    data: { turn: 1, message: { content: [{ type: 'text', text: '很快' }] } },
  })
  ctx.emit('session/event', { header: { id: 'session-1' } }, {
    type: 'turn/end',
    data: { turn: 1, reason: { kind: 'completed' } },
  })
  await flush()

  assert.equal(calls.sends.length, 1)
  assert.equal(calls.sends[0].text, '很快')
})

test('relay：已回「处理中」但本轮无文本时补一句收尾', async (t) => {
  const { relay, ctx, calls } = createHarness(t, { reply: { quote: false, mergeWindowMs: 0, ackDelayMs: 20 } })
  relay.handleRawEvent(groupEvent({ message_id: 84 }))
  await wait(60)
  assert.equal(calls.sends[0].text, ACK_TEXT)

  const requestId = calls.prompt[0].requestId
  ctx.emit('agent/inbox/claimed', {
    agent: { session: { id: 'session-1' } },
    message: { source: { rpcId: requestId } },
    turn: 1,
  })
  ctx.emit('session/event', { header: { id: 'session-1' } }, {
    type: 'turn/end',
    data: { turn: 1, reason: { kind: 'completed' } },
  })
  await flush()

  assert.equal(calls.sends.length, 2)
  assert.ok(calls.sends[1].text.includes('没有可发送的文本'), calls.sends[1].text)
})

test('relay：直通连发在窗口内合并成一次 prompt', async (t) => {
  const { relay, ctx, calls } = createHarness(t, { reply: { quote: true, mergeWindowMs: 40, ackDelayMs: 0 } })
  const mention = (text, id) => groupEvent({
    message_id: id,
    message: [{ type: 'at', data: { qq: '999' } }, { type: 'text', data: { text } }],
    raw_message: '[CQ:at,qq=999] ' + text,
  })
  relay.handleRawEvent(mention('第一条', 201))
  relay.handleRawEvent(mention('第二条', 202))
  await wait(100)

  assert.equal(calls.prompt.length, 1, '两条 @ 合并成一轮')
  const text = calls.prompt[0].content[0].text
  assert.ok(text.includes('新消息 2 条'), text)
  assert.ok(text.includes('第一条') && text.includes('第二条'), text)
  assert.ok(text.includes('（直通：@）'), text)

  const requestId = calls.prompt[0].requestId
  ctx.emit('agent/inbox/claimed', {
    agent: { session: { id: 'session-1' } },
    message: { source: { rpcId: requestId } },
    turn: 1,
  })
  ctx.emit('session/event', { header: { id: 'session-1' } }, {
    type: 'assistant/message',
    data: { turn: 1, message: { content: [{ type: 'text', text: '合并回答' }] } },
  })
  ctx.emit('session/event', { header: { id: 'session-1' } }, {
    type: 'turn/end',
    data: { turn: 1, reason: { kind: 'completed' } },
  })
  await flush()

  assert.equal(calls.replies[0].messageId, '202', '引用批次里最后一条消息')
})

test('relay：关闭合并窗口时每条 @ 各自成一轮', async (t) => {
  const { relay, ctx, calls } = createHarness(t, { reply: { quote: false, mergeWindowMs: 0, ackDelayMs: 0 } })
  const mention = (text, id) => groupEvent({
    message_id: id,
    message: [{ type: 'at', data: { qq: '999' } }, { type: 'text', data: { text } }],
    raw_message: '[CQ:at,qq=999] ' + text,
  })
  relay.handleRawEvent(mention('第一条', 203))
  relay.handleRawEvent(mention('第二条', 204))
  await flush()
  assert.equal(calls.prompt.length, 1, '同群串行：第二条先排队')

  // 第一轮结束 → 队列里的第二条补派
  const requestId = calls.prompt[0].requestId
  ctx.emit('agent/inbox/claimed', {
    agent: { session: { id: 'session-1' } },
    message: { source: { rpcId: requestId } },
    turn: 1,
  })
  ctx.emit('session/event', { header: { id: 'session-1' } }, {
    type: 'turn/end',
    data: { turn: 1, reason: { kind: 'completed' } },
  })
  await flush()
  assert.equal(calls.prompt.length, 2)
  assert.ok(calls.prompt[1].content[0].text.includes('第二条'), calls.prompt[1].content[0].text)
})

test('relay：命令回复不引用、也不触发处理中占位', async (t) => {
  const { relay, calls } = createHarness(t, { reply: { quote: true, mergeWindowMs: 40, ackDelayMs: 20 } })
  relay.handleRawEvent(textEvent('/status', { message_id: 205 }))
  await wait(80)

  assert.equal(calls.prompt.length, 0)
  assert.equal(calls.replies.length, 0)
  assert.equal(calls.sends.length, 1)
  assert.ok(calls.sends[0].text.includes('【QQ relay 状态】'), calls.sends[0].text)
})
