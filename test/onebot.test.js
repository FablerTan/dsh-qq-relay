/**
 * OneBot controller 层单测（codec / client / api），零外部依赖。
 * 运行：pnpm test  ==  node --test test/*.test.js
 */

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  bypassReason,
  dedupeKey,
  detectCommand,
  detectMention,
  detectReplyId,
  extractAtTargets,
  extractText,
  normalizeSegments,
  toChatLogRecord,
  toInternalEvent,
} from '../lib/controller/onebot/codec.js'
import { buildWsUrl, createOneBotClient } from '../lib/controller/onebot/client.js'
import { createOneBotApi, failureText, isOk } from '../lib/controller/onebot/api.js'

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

class FakeWebSocket {
  static instances = []
  static reset() { FakeWebSocket.instances = [] }
  constructor(url) {
    this.url = url
    this.sent = []
    this.readyState = 0
    this.onopen = null
    this.onmessage = null
    this.onerror = null
    this.onclose = null
    FakeWebSocket.instances.push(this)
  }
  send(data) { this.sent.push(JSON.parse(data)) }
  close() { if (this.readyState !== 3) { this.readyState = 3; this.onclose?.({}) } }
  open() { this.readyState = 1; this.onopen?.({}) }
  message(frame) { this.onmessage?.({ data: JSON.stringify(frame) }) }
  respond(echo, data) { this.message({ status: 'ok', retcode: 0, data, echo }) }
}

const atEvent = {
  self_id: 10001,
  user_id: 10003,
  time: 1792340775,
  message_id: 8582504,
  message_type: 'group',
  sender: { user_id: 10003, nickname: 'tester', card: '', role: 'owner' },
  raw_message: '[CQ:at,qq=10001] 测试',
  message: [
    { type: 'at', data: { qq: '10001' } },
    { type: 'text', data: { text: ' ' } },
    { type: 'text', data: { text: '测试' } },
  ],
  post_type: 'message',
  group_id: 10002,
  group_name: '示例群',
}

const plainEvent = {
  self_id: 10001,
  user_id: 10003,
  time: 1792340798,
  message_id: 645195019,
  message_type: 'group',
  sender: { user_id: 10003, nickname: 'tester', card: '', role: 'owner' },
  raw_message: '111',
  message: [{ type: 'text', data: { text: '111' } }],
  post_type: 'message',
  group_id: 10002,
  group_name: '示例群',
}

const replyEvent = {
  ...plainEvent,
  message_id: 1330646793,
  raw_message: '[CQ:reply,id=1210103539][CQ:at,qq=10001] 1',
  message: [
    { type: 'reply', data: { id: '1210103539' } },
    { type: 'at', data: { qq: '10001' } },
    { type: 'text', data: { text: ' ' } },
    { type: 'text', data: { text: '1' } },
  ],
}

test('codec：@ 群消息规范化', () => {
  const event = toInternalEvent(atEvent)
  assert.equal(event.kind, 'group-message')
  assert.equal(event.selfId, 10001)
  assert.equal(event.groupId, 10002)
  assert.equal(event.messageId, '8582504')
  assert.equal(event.timeMs, 1792340775 * 1000)
  assert.equal(event.text, ' 测试')
  assert.equal(event.mentionsSelf, true)
  assert.equal(event.mentionsOthers, false)
  assert.deepEqual(event.atTargets, ['10001'])
  assert.equal(event.replyToId, null)
  assert.deepEqual(bypassReason(event, { commandPrefixes: ['/dsh'] }), { bypass: true, reason: 'mention' })
  assert.equal(dedupeKey(event), '10002:8582504')
  const record = toChatLogRecord(event)
  assert.equal(record.mentionsSelf, true)
  assert.equal(record.replyToId, null)
  assert.equal(record.groupId, '10002')
  assert.equal(record.card, '')
  assert.equal(record.text, '测试')
})

test('codec：普通群消息不直通，聊天记录字段正确', () => {
  const event = toInternalEvent(plainEvent)
  assert.equal(event.kind, 'group-message')
  assert.equal(event.mentionsSelf, false)
  assert.equal(event.mentionsOthers, false)
  assert.deepEqual(event.atTargets, [])
  assert.deepEqual(bypassReason(event, { commandPrefixes: ['/dsh'] }), { bypass: false, reason: null })
  assert.deepEqual(toChatLogRecord(event), {
    time: 1792340798 * 1000,
    groupId: '10002',
    messageId: '645195019',
    userId: '10003',
    nickname: 'tester',
    card: '',
    role: 'owner',
    text: '111',
    mentionsSelf: false,
    replyToId: null,
    raw: '111',
  })
})

test('codec：引用回复识别', () => {
  const event = toInternalEvent(replyEvent)
  assert.equal(event.replyToId, '1210103539')
  assert.equal(event.mentionsSelf, true)
  // @ 与引用同时出现时，@ 优先级更高
  assert.equal(bypassReason(event, {}).reason, 'mention')

  const replyOnly = toInternalEvent({
    ...plainEvent,
    message_id: 9,
    raw_message: '[CQ:reply,id=1210103539] 1',
    message: [{ type: 'reply', data: { id: '1210103539' } }, { type: 'text', data: { text: '1' } }],
  })
  assert.equal(replyOnly.mentionsSelf, false)
  // 引用别人的消息不算直通；只有引用 bot 自己的消息才是「回复」
  assert.equal(bypassReason(replyOnly, {}).reason, null)
  assert.equal(bypassReason(replyOnly, { replyToSelf: true }).reason, 'reply')
})

test('codec：@ 别人不算 @ bot，也不直通（v0.18.0）', () => {
  const event = toInternalEvent({
    ...plainEvent,
    message_id: 10,
    message: [{ type: 'at', data: { qq: '1211176477' } }, { type: 'text', data: { text: ' 你好' } }],
    raw_message: '[CQ:at,qq=1211176477] 你好',
  })
  assert.equal(event.mentionsSelf, false)
  assert.equal(event.mentionsOthers, true)
  assert.deepEqual(event.atTargets, ['1211176477'])
  assert.deepEqual(bypassReason(event, {}), { bypass: false, reason: null })

  const all = toInternalEvent({
    ...plainEvent,
    message_id: 11,
    message: [{ type: 'at', data: { qq: 'all' } }, { type: 'text', data: { text: ' 开会' } }],
    raw_message: '[CQ:at,qq=all] 开会',
  })
  assert.equal(all.mentionsSelf, false)
  assert.equal(all.mentionsOthers, true)
  assert.deepEqual(all.atTargets, ['all'])
  assert.deepEqual(extractAtTargets([
    { type: 'at', data: { qq: '1' } },
    { type: 'at', data: { qq: '1' } },
    { type: 'text', data: { text: 'x' } },
  ]), ['1'])
})

test('codec：message_sent 归为 self-message', () => {
  const event = toInternalEvent({ ...plainEvent, post_type: 'message_sent' })
  assert.equal(event.kind, 'self-message')
})

test('codec：raw_message CQ 码兜底识别 @', () => {
  const event = toInternalEvent({
    ...plainEvent,
    message: [{ type: 'text', data: { text: 'hi' } }],
    raw_message: '[CQ:at,qq=10001] hi',
  })
  assert.equal(event.mentionsSelf, true)
})

test('codec：命令前缀与工具函数', () => {
  const event = toInternalEvent({
    ...plainEvent,
    message: [{ type: 'text', data: { text: '/dsh 你好' } }],
    raw_message: '/dsh 你好',
  })
  assert.equal(detectCommand(event.text, ['/dsh']), true)
  assert.equal(detectCommand(event.text, []), false)
  assert.equal(bypassReason(event, { commandPrefixes: ['/dsh'] }).reason, 'command')

  assert.deepEqual(normalizeSegments([{ type: 'text', data: { text: 'a' } }, { data: {} }, null]), [{ type: 'text', data: { text: 'a' } }])
  assert.equal(detectMention([{ type: 'at', data: { qq: '1' } }], '', 1), true)
  assert.equal(detectMention([], '', 1), false)
  assert.equal(detectReplyId([{ type: 'reply', data: { id: 42 } }]), '42')
  assert.equal(detectReplyId([]), null)
  assert.equal(extractText([{ type: 'face', data: { id: '1' } }, { type: 'text', data: { text: 'x' } }]), 'x')
})

test('client：buildWsUrl 带 token', () => {
  assert.equal(buildWsUrl('ws://127.0.0.1:3001', 'abc'), 'ws://127.0.0.1:3001/?access_token=abc')
  assert.equal(buildWsUrl('ws://127.0.0.1:3001', ''), 'ws://127.0.0.1:3001/')
})

test('client：连接后校验 self_id 并发 login 事件', async () => {
  FakeWebSocket.reset()
  const errors = []
  const client = createOneBotClient({
    wsUrl: 'ws://127.0.0.1:3001',
    accessToken: 'tok',
    selfId: 10001,
    WebSocketImpl: FakeWebSocket,
    reconnect: { minMs: 5, maxMs: 5 },
  })
  client.on('error', (error) => errors.push(error))
  const opened = new Promise((resolve) => client.on('open', resolve))
  client.start()
  const ws = FakeWebSocket.instances[0]
  assert.match(ws.url, /access_token=tok/)

  ws.open()
  await opened
  assert.equal(ws.sent[0].action, 'get_login_info')
  ws.respond(ws.sent[0].echo, { user_id: 10001, nickname: 'bot' })
  await tick()
  assert.equal(client.isOpen(), true)
  assert.equal(errors.length, 0)
  client.stop()
})

test('client：self_id 不匹配时停止', async () => {
  FakeWebSocket.reset()
  const errors = []
  const client = createOneBotClient({
    wsUrl: 'ws://x',
    selfId: 42,
    WebSocketImpl: FakeWebSocket,
    reconnect: { minMs: 5, maxMs: 5 },
  })
  client.on('error', (error) => errors.push(error))
  const opened = new Promise((resolve) => client.on('open', resolve))
  client.start()
  const ws = FakeWebSocket.instances[0]
  ws.open()
  await opened
  ws.respond(ws.sent[0].echo, { user_id: 7 })
  await tick()
  await tick()
  assert.ok(errors.some((error) => String(error.message).includes('self_id 不匹配')))
  assert.equal(client.isOpen(), false)
})

test('client：请求超时', async () => {
  FakeWebSocket.reset()
  const client = createOneBotClient({
    wsUrl: 'ws://x',
    WebSocketImpl: FakeWebSocket,
    requestTimeoutMs: 20,
  })
  client.start()
  FakeWebSocket.instances[0].open()
  await tick()
  await assert.rejects(client.call('get_status'), /超时/)
  client.stop()
})

test('client：事件透传', async () => {
  FakeWebSocket.reset()
  const events = []
  const client = createOneBotClient({ wsUrl: 'ws://x', WebSocketImpl: FakeWebSocket })
  client.on('event', (event) => events.push(event))
  client.start()
  const ws = FakeWebSocket.instances[0]
  ws.open()
  await tick()
  ws.message({ post_type: 'meta_event', meta_event_type: 'heartbeat', time: 1, self_id: 1 })
  assert.equal(events.length, 1)
  assert.equal(events[0].post_type, 'meta_event')
  client.stop()
})

test('client：断线按退避重连，stop 后不再重连', async () => {
  FakeWebSocket.reset()
  const client = createOneBotClient({ wsUrl: 'ws://x', WebSocketImpl: FakeWebSocket, reconnect: { minMs: 5, maxMs: 5 } })
  client.start()
  const first = FakeWebSocket.instances[0]
  first.open()
  await tick()
  first.close()
  await sleep(30)
  assert.equal(FakeWebSocket.instances.length, 2)

  client.stop()
  const count = FakeWebSocket.instances.length
  await sleep(30)
  assert.equal(FakeWebSocket.instances.length, count)
})

test('api：封装 action 与响应判定', async () => {
  const calls = []
  const fakeClient = {
    call(action, params) {
      calls.push({ action, params })
      return Promise.resolve({ status: 'ok', retcode: 0, data: { message_id: 'm1' } })
    },
  }
  const api = createOneBotApi(fakeClient)

  const response = await api.sendGroupText(10002, 'hi')
  assert.equal(calls[0].action, 'send_group_msg')
  assert.equal(calls[0].params.group_id, '10002')
  assert.deepEqual(calls[0].params.message, [{ type: 'text', data: { text: 'hi' } }])
  assert.equal(isOk(response), true)

  await api.getGroupMemberInfo(1, 2, true)
  assert.deepEqual(calls[1], {
    action: 'get_group_member_info',
    params: { group_id: '1', user_id: '2', no_cache: true },
  })

  await api.groupPoke(1, 2)
  assert.deepEqual(calls[2], {
    action: 'group_poke',
    params: { group_id: 1, user_id: 2 },
  })

  await api.getGroupFileUrl(1, 'file-id', 0)
  assert.deepEqual(calls[3], {
    action: 'get_group_file_url',
    params: { group_id: 1, file_id: 'file-id', busid: 0 },
  })

  await api.getGroupFileUrl(1, 'file-id', 102)
  assert.deepEqual(calls[4], {
    action: 'get_group_file_url',
    params: { group_id: 1, file_id: 'file-id', busid: 102 },
  })

  assert.equal(isOk({ status: 'failed', retcode: 1200 }), false)
  assert.equal(isOk(null), false)
  assert.equal(failureText({ status: 'failed', retcode: 1200, message: '被移出群' }), '被移出群')
  assert.equal(failureText({ retcode: 5 }), 'retcode=5')
})
test('codec：戳一戳事件（notice notify poke）', () => {
  const poke = toInternalEvent({
    post_type: 'notice',
    notice_type: 'notify',
    sub_type: 'poke',
    self_id: 999,
    group_id: 100,
    user_id: 205,
    target_id: 999,
    time: 1792340775,
    raw_info: [{ type: 'nor', txt: '戳了戳' }],
  })
  assert.equal(poke.kind, 'poke')
  assert.equal(poke.groupId, 100)
  assert.equal(poke.userId, 205)
  assert.equal(poke.targetId, 999)
  assert.equal(poke.targetsSelf, true)
  assert.equal(poke.timeMs, 1792340775 * 1000)

  const other = toInternalEvent({
    post_type: 'notice',
    notice_type: 'notify',
    sub_type: 'poke',
    self_id: 999,
    group_id: 100,
    user_id: 205,
    target_id: 206,
    time: 1792340775,
  })
  assert.equal(other.kind, 'poke')
  assert.equal(other.targetsSelf, false)

  // 其他 notice 仍走通用分支
  const generic = toInternalEvent({ post_type: 'notice', notice_type: 'group_recall', self_id: 1, group_id: 100, user_id: 205 })
  assert.equal(generic.kind, 'notice')
  assert.equal(generic.noticeType, 'group_recall')
  assert.equal(generic.subType, '')
  assert.equal(generic.targetId, 0)
})

test('codec：群文件上传事件（notice group_upload）', () => {
  const event = toInternalEvent({
    post_type: 'notice',
    notice_type: 'group_upload',
    self_id: 999,
    group_id: 100,
    user_id: 205,
    time: 1792401431,
    file: { id: '7a7517222c484cf6bd30d0cff47157ec', name: '报告.pdf', size: 12345, busid: 0 },
  })
  assert.equal(event.kind, 'group-file')
  assert.equal(event.groupId, 100)
  assert.equal(event.userId, 205)
  assert.equal(event.file.id, '7a7517222c484cf6bd30d0cff47157ec')
  assert.equal(event.file.name, '报告.pdf')
  assert.equal(event.file.size, 12345)
  assert.equal(event.file.busid, 0)
  assert.equal(event.timeMs, 1792401431 * 1000)

  // 脏 file / 缺字段时也给出稳定形状
  const dirty = toInternalEvent({ post_type: 'notice', notice_type: 'group_upload', self_id: 1, group_id: 100, user_id: 205, file: null })
  assert.equal(dirty.kind, 'group-file')
  assert.deepEqual(dirty.file, { id: '', name: '', size: 0, busid: 0 })
})
