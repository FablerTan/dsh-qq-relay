/**
 * qq_send 工具定义单测（node:test，零依赖）：参数校验、群解析、白名单、
 * 输出 schema / render，以及 execute 的透传语义（文本 / 图片 / 文件，v0.12.0）。
 *
 * 工具注册本身（ctx.tools.register）在 apply.test.js 里用假 tools 服务覆盖。
 */

import test from 'node:test'
import assert from 'node:assert/strict'

import { createQqPokeTool, createQqSendTool, QQ_POKE_TOOL_NAME, QQ_SEND_TOOL_NAME } from '../lib/controller/tools.js'

const TEXT_RESULT = { chunks: 1, queued: false, messageIds: ['m1'] }

function createHarness(groups = [100], options = {}) {
  const calls = { texts: [], images: [], files: [] }
  const tool = createQqSendTool({
    getGroups: () => groups,
    sendText: async (groupId, text) => {
      calls.texts.push({ groupId, text })
      return { ...(options.textResult ?? TEXT_RESULT), groupId }
    },
    sendImage: async (groupId, source) => {
      calls.images.push({ groupId, source })
      return { groupId, chunks: 1, queued: false, messageIds: ['img' + String(calls.images.length)] }
    },
    sendFile: async (groupId, filePath, name) => {
      calls.files.push({ groupId, filePath, name })
      return { groupId, fileName: name === '' ? 'report.pdf' : name, fileId: 'f1' }
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
  assert.equal(tool.description.includes('image'), true)
  assert.equal(tool.parameters.type, 'object')
  assert.deepEqual(tool.parameters.required, [])
  assert.equal(tool.parameters.additionalProperties, false)
  assert.deepEqual(Object.keys(tool.parameters.properties).sort(), ['file', 'fileName', 'groupId', 'images', 'text'])
  assert.deepEqual(Object.keys(tool.output.schema.properties).sort(), ['chunks', 'groupId', 'media', 'messageIds', 'queued'])
  assert.deepEqual(tool.output.schema.required.slice().sort(), ['chunks', 'groupId', 'messageIds', 'queued'])
  assert.equal(typeof tool.output.render, 'function')
  assert.equal(typeof tool.execute, 'function')
})

test('qq_send：纯文本透传，返回发送结果', async () => {
  const { tool, calls } = createHarness([100, 200])
  const value = await tool.execute({ groupId: 200, text: '  任务完成  ' }, exec)
  assert.deepEqual(calls.texts, [{ groupId: 200, text: '任务完成' }])
  assert.deepEqual(value, { groupId: 200, chunks: 1, queued: false, messageIds: ['m1'] })
})

test('qq_send：文本 + 图片 + 文件，输出 media 摘要', async () => {
  const { tool, calls } = createHarness([100])
  const value = await tool.execute({
    text: '看下这两个文件',
    images: ['/tmp/a.png', 'https://example.com/b.jpg'],
    file: '/tmp/report.pdf',
    fileName: '日报.pdf',
  }, exec)
  assert.deepEqual(calls.texts, [{ groupId: 100, text: '看下这两个文件' }])
  assert.deepEqual(calls.images, [
    { groupId: 100, source: '/tmp/a.png' },
    { groupId: 100, source: 'https://example.com/b.jpg' },
  ])
  assert.deepEqual(calls.files, [{ groupId: 100, filePath: '/tmp/report.pdf', name: '日报.pdf' }])
  assert.equal(value.chunks, 1)
  assert.deepEqual(value.messageIds, ['m1', 'img1', 'img2'])
  assert.deepEqual(value.media, { images: 2, file: '日报.pdf' })

  const rendered = tool.output.render({}, value).map((block) => block.text).join('')
  assert.match(rendered, /2 张图片/)
  assert.match(rendered, /日报\.pdf/)
})

test('qq_send：只发图片也可以（没有 text）', async () => {
  const { tool, calls } = createHarness([100])
  const value = await tool.execute({ images: ['/tmp/chart.png'] }, exec)
  assert.equal(calls.texts.length, 0)
  assert.equal(value.chunks, 0)
  assert.deepEqual(value.media, { images: 1, file: '' })
  const rendered = tool.output.render({}, value).map((block) => block.text).join('')
  assert.match(rendered, /已发送到群 100/)
  assert.match(rendered, /1 张图片/)
})

test('qq_send：唯一群时可省略 groupId', async () => {
  const { tool, calls } = createHarness([100])
  const value = await tool.execute({ text: 'hi' }, exec)
  assert.deepEqual(calls.texts, [{ groupId: 100, text: 'hi' }])
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

test('qq_send：空内容 / 超长文本 / 图片过多 / 非法 groupId 被拒绝', async () => {
  const { tool } = createHarness([100])
  await assert.rejects(() => tool.execute({ text: '   ' }, exec), /至少要有一个/)
  await assert.rejects(() => tool.execute({}, exec), /至少要有一个/)
  await assert.rejects(() => tool.execute({ text: 'x'.repeat(20001) }, exec), /过长/)
  await assert.rejects(() => tool.execute({ images: ['1', '2', '3', '4', '5'] }, exec), /最多 4/)
  await assert.rejects(() => tool.execute({ groupId: 1.5, text: 'hi' }, exec), /正整数/)
})

test('qq_send：离线排队时 queued=true，render 说明补发', async () => {
  const { tool } = createHarness([100], { textResult: { chunks: 2, queued: true, messageIds: [] } })
  const value = await tool.execute({ text: '离线通知' }, exec)
  assert.equal(value.queued, true)
  const queuedText = tool.output.render({}, value).map((block) => block.text).join('')
  assert.match(queuedText, /发送队列/)

  const okText = tool.output.render({}, { groupId: 100, chunks: 1, queued: false, messageIds: ['m9'] }).map((block) => block.text).join('')
  assert.match(okText, /已发送到群 100/)
  assert.match(okText, /m9/)
})

test('qq_send：缺 sendImage / sendFile 时给出可读错误', async () => {
  const tool = createQqSendTool({
    getGroups: () => [100],
    sendText: async () => ({ groupId: 100, chunks: 1, queued: false, messageIds: [] }),
  })
  await assert.rejects(() => tool.execute({ images: ['/tmp/a.png'] }, exec), /不支持发送图片/)
  await assert.rejects(() => tool.execute({ file: '/tmp/a.pdf' }, exec), /不支持上传文件/)
})

test('qq_send：exec.signal 已中止时直接失败', async () => {
  const { tool, calls } = createHarness([100])
  const signal = { throwIfAborted() { throw new Error('aborted') } }
  await assert.rejects(() => tool.execute({ text: 'hi' }, { signal }), /aborted/)
  assert.equal(calls.texts.length, 0)
})
function createPokeHarness(groups = [100], options = {}) {
  const calls = { pokes: [] }
  const tool = createQqPokeTool({
    getGroups: () => groups,
    poke: async (groupId, userId) => {
      calls.pokes.push({ groupId, userId })
      if (options.fails === true) throw new Error('戳一戳失败：mock')
      return { groupId, userId }
    },
  })
  return { tool, calls }
}

test('qq_poke：定义形状（name / 参数 / 输出 schema）', () => {
  const { tool } = createPokeHarness()
  assert.equal(tool.name, QQ_POKE_TOOL_NAME)
  assert.equal(tool.name, 'qq_poke')
  assert.equal(typeof tool.description, 'string')
  assert.deepEqual(tool.parameters.required, ['userId'])
  assert.equal(tool.parameters.additionalProperties, false)
  assert.deepEqual(Object.keys(tool.parameters.properties).sort(), ['groupId', 'userId'])
  assert.deepEqual(Object.keys(tool.output.schema.properties).sort(), ['groupId', 'userId'])
  assert.equal(typeof tool.output.render, 'function')
  assert.equal(typeof tool.execute, 'function')
})

test('qq_poke：唯一群时可省略 groupId，结果透传并 render', async () => {
  const { tool, calls } = createPokeHarness([100])
  const value = await tool.execute({ userId: 205 }, exec)
  assert.deepEqual(calls.pokes, [{ groupId: 100, userId: 205 }])
  assert.deepEqual(value, { groupId: 100, userId: 205 })
  const rendered = tool.output.render({}, value).map((block) => block.text).join('')
  assert.match(rendered, /群 100/)
  assert.match(rendered, /205/)
})

test('qq_poke：多群缺 groupId / 不在白名单 / userId 非法时报错', async () => {
  const multi = createPokeHarness([100, 200])
  await assert.rejects(() => multi.tool.execute({ userId: 205 }, exec), /多个群/)

  const { tool } = createPokeHarness([100])
  await assert.rejects(() => tool.execute({ userId: 205, groupId: 999 }, exec), /不在白名单/)
  await assert.rejects(() => tool.execute({}, exec), /userId/)
  await assert.rejects(() => tool.execute({ userId: 0 }, exec), /userId/)
  await assert.rejects(() => tool.execute({ userId: '205' }, exec), /userId/)
})

test('qq_poke：没有白名单 / 透传失败 / exec 中止', async (t) => {
  const empty = createPokeHarness([])
  await assert.rejects(() => empty.tool.execute({ userId: 205 }, exec), /白名单/)

  const failing = createPokeHarness([100], { fails: true })
  await assert.rejects(() => failing.tool.execute({ userId: 205 }, exec), /戳一戳失败/)

  const { tool, calls } = createPokeHarness([100])
  const signal = { throwIfAborted() { throw new Error('aborted') } }
  await assert.rejects(() => tool.execute({ userId: 205 }, { signal }), /aborted/)
  assert.equal(calls.pokes.length, 0)
})
