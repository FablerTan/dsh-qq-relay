/**
 * qq_send 工具定义单测（node:test，零依赖）：参数校验、群解析、白名单、
 * 输出 schema / render，以及 execute 的透传语义。
 *
 * 工具注册本身（ctx.tools.register）在 apply.test.js 里用假 tools 服务覆盖。
 */

import test from 'node:test'
import assert from 'node:assert/strict'

import { createQqSendTool, QQ_SEND_TOOL_NAME } from '../lib/controller/tools.js'

function createHarness(groups = [100], result = { chunks: 1, queued: false, messageIds: ['m1'] }) {
  const calls = []
  const tool = createQqSendTool({
    getGroups: () => groups,
    sendText: async (groupId, text) => {
      calls.push({ groupId, text })
      return { groupId, ...result }
    },
  })
  return { tool, calls }
}

const exec = { signal: { throwIfAborted() {} } }

test('qq_send：定义形状（name / description / 参数 / 输出 schema）', () => {
  const { tool } = createHarness()
  assert.equal(tool.name, QQ_SEND_TOOL_NAME)
  assert.equal(tool.name, 'qq_send')
  assert.equal(tool.description.includes('QQ'), true)
  assert.equal(tool.parameters.type, 'object')
  assert.deepEqual(tool.parameters.required, ['text'])
  assert.equal(tool.parameters.additionalProperties, false)
  assert.deepEqual(Object.keys(tool.output.schema.properties).sort(), ['chunks', 'groupId', 'messageIds', 'queued'])
  assert.deepEqual(tool.output.schema.required.slice().sort(), ['chunks', 'groupId', 'messageIds', 'queued'])
  assert.equal(typeof tool.output.render, 'function')
  assert.equal(typeof tool.execute, 'function')
})

test('qq_send：显式 groupId 透传，返回发送结果', async () => {
  const { tool, calls } = createHarness([100, 200])
  const value = await tool.execute({ groupId: 200, text: '  任务完成  ' }, exec)
  assert.deepEqual(calls, [{ groupId: 200, text: '任务完成' }])
  assert.deepEqual(value, { groupId: 200, chunks: 1, queued: false, messageIds: ['m1'] })
})

test('qq_send：唯一群时可省略 groupId', async () => {
  const { tool, calls } = createHarness([100])
  const value = await tool.execute({ text: 'hi' }, exec)
  assert.deepEqual(calls, [{ groupId: 100, text: 'hi' }])
  assert.equal(value.groupId, 100)
})

test('qq_send：多群时缺 groupId 报错', async () => {
  const { tool } = createHarness([100, 200])
  await assert.rejects(() => tool.execute({ text: 'hi' }, exec), /多个群/)
})

test('qq_send：没有白名单 / 群不在白名单时报错', async () => {
  const empty = createHarness([])
  await assert.rejects(() => empty.tool.execute({ text: 'hi' }, exec), /白名单/)

  const { tool } = createHarness([100])
  await assert.rejects(() => tool.execute({ groupId: 999, text: 'hi' }, exec), /不在白名单/)
})

test('qq_send：空文本 / 超长文本 / 非法 groupId 被拒绝', async () => {
  const { tool } = createHarness([100])
  await assert.rejects(() => tool.execute({ text: '   ' }, exec), /不能为空/)
  await assert.rejects(() => tool.execute({ text: 'x'.repeat(20001) }, exec), /过长/)
  await assert.rejects(() => tool.execute({ groupId: 1.5, text: 'hi' }, exec), /正整数/)
  await assert.rejects(() => tool.execute({}, exec), /不能为空/)
})

test('qq_send：离线排队时 queued=true，render 说明补发', async () => {
  const { tool } = createHarness([100], { chunks: 2, queued: true, messageIds: [] })
  const value = await tool.execute({ text: '离线通知' }, exec)
  assert.equal(value.queued, true)
  const queuedText = tool.output.render({}, value).map((block) => block.text).join('')
  assert.match(queuedText, /发送队列/)

  const okText = tool.output.render({}, { groupId: 100, chunks: 1, queued: false, messageIds: ['m9'] }).map((block) => block.text).join('')
  assert.match(okText, /已发送到群 100/)
  assert.match(okText, /m9/)
})

test('qq_send：exec.signal 已中止时直接失败', async () => {
  const { tool, calls } = createHarness([100])
  const signal = { throwIfAborted() { throw new Error('aborted') } }
  await assert.rejects(() => tool.execute({ text: 'hi' }, { signal }), /aborted/)
  assert.equal(calls.length, 0)
})
