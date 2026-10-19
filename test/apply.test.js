/**
 * 组合根集成单测（node:test）：用假 ctx / 假 webServer 把 `apply()` 拉起来，
 * 走真实的路由注册 + 配置保存 + 连接重建路径（WS 指向不存在的端口，只验证状态机）。
 *
 * 存储目录通过 HOME 指向临时目录（组合根用 os.homedir() 拼路径），
 * 因此不会碰本机真实 relay 状态、也不会抢真实实例的单实例锁。
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { apply } from '../lib/index.js'

function fakeCtx() {
  const routes = []
  const cleanups = []
  const tools = []
  const fake = {
    logger: () => ({ info() {}, warn() {}, error() {} }),
    on: () => () => {},
    inject: (_names, callback) => {
      let dispose
      try {
        dispose = callback(fake)
      } catch (error) {
        throw error
      }
      return { dispose: () => { if (typeof dispose === 'function') dispose() } }
    },
    effect: (fn) => {
      const cleanup = fn()
      cleanups.push(() => {
        if (typeof cleanup === 'function') cleanup()
        else if (cleanup !== null && typeof cleanup?.dispose === 'function') cleanup.dispose()
      })
      return () => {}
    },
    sessionController: {
      async create() { return { sessionId: 'session-test' } },
      async rename() {},
      async prompt() { return { accepted: true } },
    },
    workspaceRegistry: {
      async create(path) { return { path, async attachSession() {} } },
    },
    webServer: {
      register(route) {
        routes.push(route)
        return () => {
          const index = routes.indexOf(route)
          if (index >= 0) routes.splice(index, 1)
        }
      },
    },
    tools: {
      register(definition) {
        tools.push(definition)
        return () => {
          const index = tools.indexOf(definition)
          if (index >= 0) tools.splice(index, 1)
        }
      },
    },
  }
  return { ctx: fake, routes, cleanups, tools }
}

function fakeReq({ method = 'GET', url = '/', body = null } = {}) {
  const chunks = body === null ? [] : [Buffer.from(body, 'utf8')]
  return {
    method,
    url,
    headers: {},
    async *[Symbol.asyncIterator]() { for (const chunk of chunks) yield chunk },
  }
}

function fakeRes() {
  return {
    statusCode: 0,
    body: '',
    writeHead(status) { this.statusCode = status },
    end(chunk) { if (chunk !== undefined && chunk !== null) this.body += String(chunk) },
  }
}

async function call(routes, path, options) {
  const route = routes.find((item) => item.path === path)
  assert.notEqual(route, undefined, '路由不存在：' + path)
  const res = fakeRes()
  await route.handler(fakeReq({ url: path, ...options }), res)
  return { status: res.statusCode, payload: res.body === '' ? null : JSON.parse(res.body) }
}

test('apply：配置页路由注册、状态快照、保存校验与重连', async (t) => {
  const home = mkdtempSync(join(tmpdir(), 'dsh-qq-relay-apply-'))
  const previousHome = process.env.HOME
  process.env.HOME = home
  t.after(() => {
    if (previousHome === undefined) delete process.env.HOME
    else process.env.HOME = previousHome
    rmSync(home, { recursive: true, force: true })
  })

  const { ctx, routes, cleanups, tools } = fakeCtx()
  t.after(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup() })

  const workspace = join(home, 'ws')
  apply(ctx, {
    wsUrl: 'ws://127.0.0.1:1',
    accessToken: 'patch-token',
    selfId: 999,
    groups: [100],
    workspace,
    commandPrefixes: ['/dsh'],
  })

  assert.equal(routes.length, 3, '应注册 status / config / reconnect 三条路由')

  const initial = await call(routes, '/dsh-qq-relay/api/status')
  assert.equal(initial.status, 200)
  assert.equal(initial.payload.ok, true)
  const status = initial.payload.value
  assert.equal(status.started, true)
  assert.equal(status.connected, false)
  assert.equal(status.config.selfId, 999)
  assert.deepEqual(status.config.groups, [100])
  assert.equal(status.config.accessTokenConfigured, true)
  assert.equal(status.config.accessTokenSource, 'profile')
  assert.equal(JSON.stringify(status).includes('patch-token'), false)
  assert.deepEqual(status.problems, [])
  assert.deepEqual(status.mappings, [])
  assert.equal(status.gate.enabled, false)
  assert.equal(status.gate.classifier, null)
  assert.equal(status.gate.threshold, 0.7)

  const invalid = await call(routes, '/dsh-qq-relay/api/config', {
    method: 'POST',
    body: JSON.stringify({ wsUrl: 'http://nope', groups: ['abc'] }),
  })
  assert.equal(invalid.status, 400)
  assert.equal(invalid.payload.error.code, 'CONFIG_INVALID')
  const settingsFile = join(home, '.dsh', 'storages', 'dsh-qq-relay', 'settings.json')
  assert.equal(existsSync(settingsFile), false, '校验失败时不应落盘')

  const saved = await call(routes, '/dsh-qq-relay/api/config', {
    method: 'POST',
    body: JSON.stringify({ groups: [200, 300], replyChunkSize: 800 }),
  })
  assert.equal(saved.status, 200)
  assert.equal(saved.payload.ok, true)
  assert.deepEqual(saved.payload.value.config.groups, [200, 300])
  assert.equal(saved.payload.value.config.replyChunkSize, 800)
  assert.equal(saved.payload.value.config.accessTokenSource, 'profile')
  const stored = JSON.parse(readFileSync(settingsFile, 'utf8'))
  assert.deepEqual(Object.keys(stored.config).sort(), ['groups', 'replyChunkSize'])
  assert.deepEqual(stored.config.groups, [200, 300])

  // token 只能写不能读：新 token 保存后只出现在来源标记上
  const tokenSaved = await call(routes, '/dsh-qq-relay/api/config', {
    method: 'POST',
    body: JSON.stringify({ accessToken: 'page-token' }),
  })
  assert.equal(tokenSaved.status, 200)
  assert.equal(tokenSaved.payload.value.config.accessTokenConfigured, true)
  assert.equal(tokenSaved.payload.value.config.accessTokenSource, 'settings')
  assert.equal(JSON.stringify(tokenSaved.payload.value).includes('page-token'), false)

  const reconnected = await call(routes, '/dsh-qq-relay/api/reconnect', { method: 'POST' })
  assert.equal(reconnected.status, 200)
  assert.equal(reconnected.payload.ok, true)
  assert.equal(reconnected.payload.value.started, true)
})

test('apply：注册 qq_send 工具，离线时返回 queued', async (t) => {
  const home = mkdtempSync(join(tmpdir(), 'dsh-qq-relay-apply-tool-'))
  const previousHome = process.env.HOME
  process.env.HOME = home
  t.after(() => {
    if (previousHome === undefined) delete process.env.HOME
    else process.env.HOME = previousHome
    rmSync(home, { recursive: true, force: true })
  })

  const { ctx, routes, cleanups, tools } = fakeCtx()
  t.after(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup() })

  apply(ctx, {
    wsUrl: 'ws://127.0.0.1:1',
    accessToken: 'patch-token',
    selfId: 999,
    groups: [100],
    workspace: join(home, 'ws'),
  })
  assert.equal(routes.length, 3)
  assert.equal(tools.length, 1)
  const definition = tools[0]
  assert.equal(definition.name, 'qq_send')
  assert.equal(typeof definition.execute, 'function')
  assert.equal(typeof definition.output.render, 'function')

  // WS 指向不存在的端口 → 离线；工具应把消息排进发送队列
  const value = await definition.execute({ groupId: 100, text: '测试推送' })
  assert.equal(value.groupId, 100)
  assert.equal(value.chunks, 1)
  assert.equal(value.queued, true)
  assert.deepEqual(value.messageIds, [])

  // 非白名单群被拒绝
  await assert.rejects(() => definition.execute({ groupId: 200, text: 'x' }), /不在白名单/)
})
