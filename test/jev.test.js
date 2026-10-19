/**
 * jev 分类器单测（node:test，零依赖）：Decisions API 请求构造、响应解析、
 * 阈值判定，以及网络 / HTTP / 格式 / 超时各类失败的 fail closed。
 *
 * 用注入的 fetchImpl 模拟 OpenRouter，不发真实网络请求。
 */

import test from 'node:test'
import assert from 'node:assert/strict'

import { buildJevRequest, createJevClassifier, decideFromJev, parseJevResponse } from '../lib/model/jev.js'

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return body },
  }
}

function noul(probability) {
  return { answers: { reply: { type: 'noul', noul: probability } }, usage: { cost: 0.0001 } }
}

const messages = [
  { messageId: 'm1', userId: '205', nickname: 'tester', role: 'owner', text: '机器人在吗', time: 1 },
  { messageId: 'm2', userId: '206', nickname: 'TS', role: 'member', text: '在的？', time: 2 },
]

function createClassifier(t, options = {}) {
  const calls = []
  const fetchImpl = options.fetchImpl ?? (async (url, init) => { calls.push({ url, init }); return response(200, noul(0.82)) })
  const classifier = createJevClassifier({
    endpoint: options.endpoint ?? 'https://openrouter.ai/api/alpha/decisions',
    apiKey: 'test-key',
    model: options.model ?? 'typesafe/jev-1.14',
    threshold: options.threshold ?? 0.7,
    timeoutMs: options.timeoutMs ?? 5000,
    logger: null,
    fetchImpl,
  })
  return { classifier, calls }
}

test('jev：请求体包含模型、群状态与 Noul 问题', () => {
  const request = buildJevRequest({ model: 'typesafe/jev-1.14', messages, groupName: '示例群', trigger: 'fast' })
  assert.equal(request.model, 'typesafe/jev-1.14')
  assert.equal(request.state.channel, 'qq-group')
  assert.equal(request.state.group, '示例群')
  assert.equal(request.state.trigger, 'fast')
  assert.equal(request.state.transcript.length, 2)
  assert.equal(request.state.transcript[0].speaker, 'tester')
  assert.equal(request.state.transcript[1].text, '在的？')
  assert.equal(request.questions.reply.type, 'noul')
  assert.equal(typeof request.questions.reply.instructions, 'string')
  assert.equal(typeof request.questions.reply.criteria.true, 'string')
  assert.equal(typeof request.questions.reply.criteria.false, 'string')
})

test('jev：transcript 截断与空消息过滤', () => {
  const many = Array.from({ length: 80 }, (_, index) => ({ nickname: 'u' + String(index), text: 't' + String(index) }))
  const request = buildJevRequest({ messages: many, trigger: 'slow' })
  assert.equal(request.state.transcript.length, 60)
  assert.equal(request.state.transcript[0].text, 't20')
  assert.equal(request.state.transcript[59].text, 't79')

  const withEmpty = buildJevRequest({ messages: [{ nickname: 'a', text: 'hi' }, { nickname: 'b', text: '   ' }, { nickname: 'c', text: 'yo' }] })
  assert.deepEqual(withEmpty.state.transcript.map((item) => item.text), ['hi', 'yo'])
  assert.equal(buildJevRequest({ messages: null }).state.transcript.length, 0)
})

test('jev：响应解析只接受合规 Noul', () => {
  assert.deepEqual(parseJevResponse(noul(0.82)), { probability: 0.82 })
  assert.equal(parseJevResponse(null), null)
  assert.equal(parseJevResponse({}), null)
  assert.equal(parseJevResponse({ answers: { reply: { type: 'choice', choice: 'x' } } }), null)
  assert.equal(parseJevResponse({ answers: { reply: { type: 'noul', noul: 1.5 } } }), null)
  assert.equal(parseJevResponse({ answers: { reply: { type: 'noul', noul: '0.8' } } }), null)
})

test('jev：概率按阈值转成决策', () => {
  const hit = decideFromJev({ probability: 0.82, threshold: 0.7 })
  assert.equal(hit.reply, true)
  assert.equal(hit.confidence, 0.82)
  assert.match(hit.reason, /jev noul=0.82/)
  assert.equal(decideFromJev({ probability: 0.7, threshold: 0.7 }).reply, true)
  assert.equal(decideFromJev({ probability: 0.3, threshold: 0.7 }).reply, false)
})

test('jev：classify 发 POST、带 Bearer token，并返回决策', async (t) => {
  const { classifier, calls } = createClassifier(t)
  const decision = await classifier.classify({ groupId: 100, groupName: '示例群', trigger: 'fast', messages })
  assert.equal(decision.reply, true)
  assert.equal(decision.confidence, 0.82)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://openrouter.ai/api/alpha/decisions')
  assert.equal(calls[0].init.method, 'POST')
  assert.equal(calls[0].init.headers.Authorization, 'Bearer test-key')
  const body = JSON.parse(calls[0].init.body)
  assert.equal(body.model, 'typesafe/jev-1.14')
  assert.equal(body.questions.reply.type, 'noul')
  assert.equal(body.state.transcript.length, 2)
})

test('jev：低于阈值 → 不接话', async (t) => {
  const { classifier } = createClassifier(t, { fetchImpl: async () => response(200, noul(0.31)) })
  const decision = await classifier.classify({ messages })
  assert.equal(decision.reply, false)
  assert.equal(decision.confidence, 0.31)
})

test('jev：HTTP 非 2xx → fail closed', async (t) => {
  const { classifier } = createClassifier(t, { fetchImpl: async () => response(401, { error: 'unauthorized' }) })
  assert.deepEqual(await classifier.classify({ messages }), { reply: false, confidence: 0, reason: 'jev-http-error', targetMsgIds: [] })
})

test('jev：响应 JSON 坏 / 形状不合规 → fail closed', async (t) => {
  const badJson = createClassifier(t, { fetchImpl: async () => ({ ok: true, status: 200, async json() { throw new SyntaxError('bad json') } }) })
  assert.equal((await badJson.classifier.classify({ messages })).reason, 'jev-unavailable')

  const badShape = createClassifier(t, { fetchImpl: async () => response(200, { answers: {} }) })
  assert.equal((await badShape.classifier.classify({ messages })).reason, 'jev-invalid-response')
})

test('jev：网络异常 → fail closed', async (t) => {
  const { classifier } = createClassifier(t, { fetchImpl: async () => { throw new Error('ECONNREFUSED') } })
  const decision = await classifier.classify({ messages })
  assert.equal(decision.reply, false)
  assert.equal(decision.reason, 'jev-unavailable')
})

test('jev：超时 → fail closed（abort 请求）', async (t) => {
  const { classifier } = createClassifier(t, {
    timeoutMs: 40,
    fetchImpl: (url, init) => new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error('aborted')))
    }),
  })
  const decision = await classifier.classify({ messages })
  assert.equal(decision.reply, false)
  assert.equal(decision.reason, 'jev-unavailable')
})
