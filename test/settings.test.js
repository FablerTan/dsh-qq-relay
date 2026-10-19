/**
 * 配置页 host 侧单测（node:test，零依赖）：配置覆盖模型 + HTTP 路由面。
 * 运行：pnpm test
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  EDITABLE_KEYS,
  createSettingsStore,
  maskConfig,
  mergeConfig,
  pickEditable,
  resolveConfig,
} from '../lib/model/settings.js'
import { createConfigRoutes, CONFIG_PATH, REBIND_PATH, RECONNECT_PATH, STATUS_PATH } from '../lib/controller/config-routes.js'

function tempDir(t) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-qq-relay-settings-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

/** patch 层的合法配置（token 来自 profile 是常见形态）。 */
const PATCH_CONFIG = Object.freeze({
  wsUrl: 'ws://127.0.0.1:3001',
  accessToken: 'profile-token',
  selfId: 10001,
  groups: [10002],
  workspace: '~/dsh/qq-relay-ws',
})

function fakeReq({ method = 'GET', url = '/', body = null, headers = {} } = {}) {
  const chunks = body === null ? [] : [Buffer.from(body, 'utf8')]
  return {
    method,
    url,
    headers,
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk
    },
  }
}

function fakeRes() {
  return {
    statusCode: 0,
    headers: null,
    body: '',
    writeHead(status, headers) {
      this.statusCode = status
      this.headers = headers
    },
    end(chunk) {
      if (chunk !== undefined && chunk !== null) this.body += String(chunk)
    },
  }
}

function parseResponse(res) {
  assert.notEqual(res.body, '', '响应体为空')
  return JSON.parse(res.body)
}

test('settings：pickEditable 只保留可编辑字段，null/undefined 表示未修改', () => {
  const picked = pickEditable({
    wsUrl: 'ws://x',
    accessToken: null,
    selfId: undefined,
    groups: [1],
    reconnect: { minMs: 5 },
    unknown: 1,
  })
  assert.deepEqual(Object.keys(picked).sort(), ['groups', 'wsUrl'])
  assert.equal(picked.wsUrl, 'ws://x')
})

test('settings：mergeConfig 覆盖只在可编辑字段上生效', () => {
  const merged = mergeConfig(PATCH_CONFIG, {
    selfId: 10000,
    groups: [42],
    reconnect: { minMs: 999999 },
    unknown: 'x',
  })
  assert.equal(merged.selfId, 10000)
  assert.deepEqual(merged.groups, [42])
  assert.equal(merged.wsUrl, PATCH_CONFIG.wsUrl)
  assert.equal(merged.accessToken, 'profile-token')
  // 只读字段不被页面覆盖
  assert.deepEqual(merged.reconnect, undefined)
})

test('settings：resolveConfig 用 patch 的 token + 页面覆盖的其余字段得到合法配置', () => {
  const resolved = resolveConfig(PATCH_CONFIG, {
    selfId: 10000,
    groups: ['10002', 42],
    workspace: '~/qq-ws',
    replyChunkSize: 500,
  })
  assert.equal(resolved.ok, true)
  assert.deepEqual(resolved.problems, [])
  assert.equal(resolved.config.selfId, 10000)
  assert.deepEqual(resolved.config.groups, [10002, 42])
  assert.equal(resolved.config.replyChunkSize, 500)
})

test('settings：resolveConfig 校验失败时返回 problems（不抛异常）', () => {
  const resolved = resolveConfig({}, { wsUrl: 'http://x', selfId: 0, groups: ['abc'] })
  assert.equal(resolved.ok, false)
  assert.ok(resolved.problems.some((problem) => problem.includes('wsUrl')))
  assert.ok(resolved.problems.some((problem) => problem.includes('selfId')))
  assert.ok(resolved.problems.some((problem) => problem.includes('groups')))
})

test('settings：maskConfig 不回显 token，并标注来源', () => {
  const view = maskConfig(resolveConfig(PATCH_CONFIG, {}).config, { accessTokenSource: 'profile' })
  assert.equal(JSON.stringify(view).includes('profile-token'), false)
  assert.equal(view.accessTokenConfigured, true)
  assert.equal(view.accessTokenSource, 'profile')
  assert.equal(view.wsUrl, PATCH_CONFIG.wsUrl)
  assert.deepEqual(view.groups, [10002])

  const fromSettings = maskConfig({ ...PATCH_CONFIG, accessToken: 'other' }, { accessTokenSource: 'settings' })
  assert.equal(fromSettings.accessTokenSource, 'settings')
  assert.equal(JSON.stringify(fromSettings).includes('other'), false)

  const empty = maskConfig({}, {})
  assert.equal(empty.accessTokenConfigured, false)
  assert.equal(empty.wsUrl, '')
})

test('settings：groupWorkspaces / chatRetentionDays 可编辑、校验、整表覆盖', (t) => {
  const picked = pickEditable({ groupWorkspaces: { '100': '/p' }, chatRetentionDays: 0, accessToken: null })
  assert.deepEqual(picked, { groupWorkspaces: { '100': '/p' }, chatRetentionDays: 0 })

  const resolved = resolveConfig(PATCH_CONFIG, { groupWorkspaces: { '10002': '~/projects/app' } })
  assert.equal(resolved.ok, true)
  assert.equal(resolved.config.groupWorkspaces['10002'], join(homedir(), 'projects', 'app'))

  const replaced = resolveConfig(PATCH_CONFIG, { groupWorkspaces: { '42': '/tmp/x' } })
  assert.deepEqual(replaced.config.groupWorkspaces, { '42': '/tmp/x' }, '覆盖是整表替换')

  const bad = resolveConfig(PATCH_CONFIG, { groupWorkspaces: { abc: '/tmp/x', '42': 'relative' } })
  assert.equal(bad.ok, false)
  assert.ok(bad.problems.some((problem) => problem.includes('groupWorkspaces')))

  assert.equal(resolveConfig(PATCH_CONFIG, { chatRetentionDays: 0 }).config.chatRetentionDays, 0)
  assert.equal(resolveConfig(PATCH_CONFIG, { chatRetentionDays: 30 }).config.chatRetentionDays, 30)
  assert.equal(resolveConfig(PATCH_CONFIG, { chatRetentionDays: 3 }).ok, false)

  const dir = tempDir(t)
  const store = createSettingsStore(join(dir, 'settings.json'))
  store.save({ groupWorkspaces: { '42': '/tmp/x' }, chatRetentionDays: 30 })
  assert.deepEqual(store.load(), { groupWorkspaces: { '42': '/tmp/x' }, chatRetentionDays: 30 })
})

test('settings：maskConfig 暴露群项目目录与保留天数', () => {
  const resolved = resolveConfig(PATCH_CONFIG, {
    groupWorkspaces: { '42': '/tmp/proj' },
    chatRetentionDays: 30,
  })
  const view = maskConfig(resolved.config, {})
  assert.deepEqual(view.groupWorkspaces, { '42': '/tmp/proj' })
  assert.equal(view.chatRetentionDays, 30)
  assert.equal(JSON.stringify(view).includes('profile-token'), false)
})

test('settings：gate 三参数可编辑、与 patch 合并、校验与脱敏视图', () => {
  const picked = pickEditable({
    gate: { debounce: '3s', fastMinReplyInterval: '10s', jevThreshold: 0.6, slowTimer: '1h', enabled: false },
  })
  assert.deepEqual(picked, { gate: { debounce: '3s', fastMinReplyInterval: '10s', jevThreshold: 0.6 } })

  const merged = mergeConfig(
    { ...PATCH_CONFIG, gate: { enabled: true, slowTimer: '2h', model: 'typesafe/jev-1.14' } },
    { gate: { debounce: 3000 } },
  )
  assert.equal(merged.gate.enabled, true)
  assert.equal(merged.gate.slowTimer, '2h')
  assert.equal(merged.gate.model, 'typesafe/jev-1.14')
  assert.equal(merged.gate.debounce, 3000)

  const resolved = resolveConfig(
    { ...PATCH_CONFIG, gate: { enabled: true } },
    { gate: { debounce: '3s', fastMinReplyInterval: '10s', jevThreshold: 0.6 } },
  )
  assert.equal(resolved.ok, true)
  assert.equal(resolved.config.gate.debounce, 3000)
  assert.equal(resolved.config.gate.fastMinReplyInterval, 10000)
  assert.equal(resolved.config.gate.jevThreshold, 0.6)
  assert.equal(resolved.config.gate.enabled, true)

  const view = maskConfig(resolved.config, {})
  assert.deepEqual(view.gate, { debounceMs: 3000, fastMinReplyIntervalMs: 10000, jevThreshold: 0.6 })

  const bad = resolveConfig(PATCH_CONFIG, { gate: { debounce: '90s', jevThreshold: 2 } })
  assert.equal(bad.ok, false)
  assert.ok(bad.problems.some((problem) => problem.includes('gate.debounce')))
  assert.ok(bad.problems.some((problem) => problem.includes('gate.jevThreshold')))
})

test('settings：store 原子读写覆盖，坏文件当空覆盖', (t) => {
  const dir = tempDir(t)
  const file = join(dir, 'settings.json')
  const store = createSettingsStore(file)
  assert.deepEqual(store.load(), {})

  store.save({
    wsUrl: 'ws://127.0.0.1:3001',
    accessToken: 'page-token',
    selfId: 10000,
    reconnect: { minMs: 1 },
    unknown: true,
  })
  const parsed = JSON.parse(readFileSync(file, 'utf8'))
  assert.equal(parsed.version, 1)
  assert.equal(typeof parsed.updatedAt, 'number')
  assert.deepEqual(Object.keys(parsed.config).sort(), ['accessToken', 'selfId', 'wsUrl'])
  assert.deepEqual(store.load(), { wsUrl: 'ws://127.0.0.1:3001', accessToken: 'page-token', selfId: 10000 })
  assert.equal(EDITABLE_KEYS.includes('accessToken'), true)

  writeFileSync(file, '{ 这不是 JSON', 'utf8')
  assert.deepEqual(store.load(), {})
  // 读坏文件不阻止再次写入
  store.save({ wsUrl: 'ws://y' })
  assert.deepEqual(store.load(), { wsUrl: 'ws://y' })
})

test('routes：GET /status 返回信封与状态快照', async () => {
  const status = { plugin: 'dsh-qq-relay', started: true, connected: false, config: {}, mappings: [] }
  const routes = createConfigRoutes({
    getStatus: () => status,
    saveConfig: () => ({ ok: false, code: 'CONFIG_INVALID', message: 'x' }),
    reconnect: () => ({ ok: false, code: 'RELAY_NOT_STARTED', message: 'x' }),
  })
  const statusRoute = routes.find((route) => route.path === STATUS_PATH)
  assert.equal(statusRoute.kind, 'exact')
  const res = fakeRes()
  await statusRoute.handler(fakeReq({ method: 'GET', url: STATUS_PATH }), res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.headers['cache-control'], 'no-store')
  assert.deepEqual(parseResponse(res), { ok: true, value: status })
})

test('routes：GET /status 拒绝 POST（405）', async () => {
  const routes = createConfigRoutes({ getStatus: () => ({}) })
  const statusRoute = routes.find((route) => route.path === STATUS_PATH)
  const res = fakeRes()
  await statusRoute.handler(fakeReq({ method: 'POST', url: STATUS_PATH }), res)
  assert.equal(res.statusCode, 405)
  assert.equal(parseResponse(res).error.code, 'CONFIG_METHOD_NOT_ALLOWED')
})

test('routes：POST /config 把请求体交给 saveConfig 并回传结果', async () => {
  const calls = []
  const routes = createConfigRoutes({
    getStatus: () => ({}),
    saveConfig: (payload) => {
      calls.push(payload)
      return { ok: true, value: { saved: true } }
    },
  })
  const configRoute = routes.find((route) => route.path === CONFIG_PATH)
  const res = fakeRes()
  await configRoute.handler(
    fakeReq({ method: 'POST', url: CONFIG_PATH, body: JSON.stringify({ wsUrl: 'ws://x', selfId: 1 }) }),
    res,
  )
  assert.deepEqual(calls, [{ wsUrl: 'ws://x', selfId: 1 }])
  assert.equal(res.statusCode, 200)
  assert.deepEqual(parseResponse(res), { ok: true, value: { saved: true } })
})

test('routes：POST /config 的非法 JSON / 模型层失败映射到 4xx', async () => {
  const routes = createConfigRoutes({
    getStatus: () => ({}),
    saveConfig: () => ({ ok: false, code: 'CONFIG_INVALID', message: 'wsUrl 必填' }),
  })
  const configRoute = routes.find((route) => route.path === CONFIG_PATH)

  const badJson = fakeRes()
  await configRoute.handler(fakeReq({ method: 'POST', url: CONFIG_PATH, body: '{oops' }), badJson)
  assert.equal(badJson.statusCode, 400)
  assert.equal(parseResponse(badJson).error.code, 'CONFIG_BAD_JSON')

  const invalid = fakeRes()
  await configRoute.handler(fakeReq({ method: 'POST', url: CONFIG_PATH, body: '{}' }), invalid)
  assert.equal(invalid.statusCode, 400)
  assert.equal(parseResponse(invalid).error.code, 'CONFIG_INVALID')
  assert.equal(parseResponse(invalid).error.message, 'wsUrl 必填')
})

test('routes：POST /config 超限返回 413', async () => {
  const routes = createConfigRoutes({
    getStatus: () => ({}),
    saveConfig: () => ({ ok: true, value: {} }),
    maxBodyBytes: 8,
  })
  const configRoute = routes.find((route) => route.path === CONFIG_PATH)
  const res = fakeRes()
  await configRoute.handler(fakeReq({ method: 'POST', url: CONFIG_PATH, body: '{"a":"0123456789"}' }), res)
  assert.equal(res.statusCode, 413)
  assert.equal(parseResponse(res).error.code, 'CONFIG_BODY_TOO_LARGE')
})

test('routes：POST /rebind 把 groupId 交给 rebind 并回传结果', async () => {
  const calls = []
  const routes = createConfigRoutes({
    getStatus: () => ({}),
    rebind: (groupId) => { calls.push(groupId); return { ok: true, value: { rebound: groupId } } },
  })
  const route = routes.find((item) => item.path === REBIND_PATH)
  assert.equal(route.kind, 'exact')
  const res = fakeRes()
  await route.handler(fakeReq({ method: 'POST', url: REBIND_PATH, body: '{"groupId":100}' }), res)
  assert.deepEqual(calls, [100])
  assert.equal(res.statusCode, 200)
  assert.deepEqual(parseResponse(res), { ok: true, value: { rebound: 100 } })
})

test('routes：rebind 未实现 501、非法 JSON 400、非 POST 405', async () => {
  const missing = createConfigRoutes({ getStatus: () => ({}) })
  const missingRoute = missing.find((item) => item.path === REBIND_PATH)
  const missingRes = fakeRes()
  await missingRoute.handler(fakeReq({ method: 'POST', url: REBIND_PATH, body: '{"groupId":100}' }), missingRes)
  assert.equal(missingRes.statusCode, 501)

  const routes = createConfigRoutes({
    getStatus: () => ({}),
    rebind: () => ({ ok: true, value: {} }),
  })
  const route = routes.find((item) => item.path === REBIND_PATH)
  const badJson = fakeRes()
  await route.handler(fakeReq({ method: 'POST', url: REBIND_PATH, body: '{oops' }), badJson)
  assert.equal(badJson.statusCode, 400)
  assert.equal(parseResponse(badJson).error.code, 'CONFIG_BAD_JSON')

  const wrongMethod = fakeRes()
  await route.handler(fakeReq({ method: 'GET', url: REBIND_PATH }), wrongMethod)
  assert.equal(wrongMethod.statusCode, 405)
})

test('routes：POST /reconnect 调 reconnect 并回传结果', async () => {
  let called = 0
  const routes = createConfigRoutes({
    getStatus: () => ({}),
    reconnect: () => { called += 1; return { ok: true, value: { started: true } } },
  })
  const route = routes.find((item) => item.path === RECONNECT_PATH)
  const res = fakeRes()
  await route.handler(fakeReq({ method: 'POST', url: RECONNECT_PATH }), res)
  assert.equal(called, 1)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(parseResponse(res), { ok: true, value: { started: true } })
})
