/**
 * 组合根集成单测（node:test）：用假 ctx / 假 webServer 把 `apply()` 拉起来，
 * 走真实的路由注册 + 配置保存 + 连接重建路径（WS 指向不存在的端口，只验证状态机）。
 *
 * 存储目录通过 HOME 指向临时目录（组合根用 os.homedir() 拼路径），
 * 因此不会碰本机真实 relay 状态、也不会抢真实实例的单实例锁。
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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
    // 宿主服务表里没有 agentPresets（或尚未就绪）时必须安全降级——
    // 曾经的回归：get() 返回 undefined，代码只判 null 导致激活抛错、路由全丢。
    get: () => undefined,
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

/** 本地日期键 YYYY-MM-DD（与聊天日志 / 媒体的按天分片一致）。 */
function dateKey(ms) {
  const date = new Date(ms)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + d
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

  assert.equal(routes.length, 11, '应注册 status / config / reconnect / rebind / cleanup / messages / mapping 二条 / presets 二条 / comfy test 一条路由')

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
  assert.deepEqual(status.config.groupWorkspaces, {}, '默认没有群项目覆盖')
  assert.equal(status.config.chatRetentionDays, 0, '聊天记录默认永久保留')
  assert.equal(JSON.stringify(status).includes('patch-token'), false)
  assert.deepEqual(status.problems, [])
  assert.deepEqual(status.mappings, [])
  assert.equal(status.gate.enabled, false)
  assert.equal(status.gate.classifier, null)
  assert.equal(status.gate.threshold, 0.7)
  assert.deepEqual(status.agentPresets, { supported: false, items: [], missing: false })
  assert.equal(status.presets.length, 1)
  assert.equal(status.presets[0].id, 'qq-relay')
  assert.deepEqual(status.presetService, { supported: false, registered: [] })
  assert.equal(status.modelCatalog, null)
  assert.equal(status.permissionCatalog, null)
  assert.equal(status.config.comfySupported, true)
  assert.deepEqual(status.config.comfy, {
    enabled: false,
    baseUrl: 'http://192.168.1.10:8188',
    timeoutMs: 30000,
    skillEnabled: true,
  })
  assert.equal(status.comfy.enabled, false)
  assert.equal(status.comfy.supported, false, '假 ctx 没有 skills 服务')
  assert.equal(status.comfy.skill.loaded, false)

  // v0.21.0：测试连接路由必须 await 异步探测（回归：Promise 被当成同步结果 → CONFIG_FAILED）
  const comfyTest = await call(routes, '/dsh-qq-relay/api/comfy/test', {
    method: 'POST',
    body: JSON.stringify({ baseUrl: 'http://127.0.0.1:1', timeoutMs: 3000 }),
  })
  assert.equal(comfyTest.status, 200)
  assert.equal(comfyTest.payload.ok, true)
  assert.equal(comfyTest.payload.value.probe.reachable, false)
  assert.equal(comfyTest.payload.value.probe.target, 'http://127.0.0.1:1')

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

  // 群项目目录覆盖：保存后 status 可见，settings.json 整表落盘
  const projectPath = join(home, 'projects', 'proj-200')
  const projectsSaved = await call(routes, '/dsh-qq-relay/api/config', {
    method: 'POST',
    body: JSON.stringify({ groupWorkspaces: { '200': projectPath } }),
  })
  assert.equal(projectsSaved.status, 200)
  assert.deepEqual(projectsSaved.payload.value.config.groupWorkspaces, { '200': projectPath })
  const storedProjects = JSON.parse(readFileSync(settingsFile, 'utf8'))
  assert.deepEqual(storedProjects.config.groupWorkspaces, { '200': projectPath })

  // 闸门三参数：可热改，写入 settings.json，非法值 400
  const gateSaved = await call(routes, '/dsh-qq-relay/api/config', {
    method: 'POST',
    body: JSON.stringify({ gate: { debounce: '3s', fastMinReplyInterval: '10s', jevThreshold: 0.6 } }),
  })
  assert.equal(gateSaved.status, 200)
  assert.deepEqual(gateSaved.payload.value.config.gate, {
    debounceMs: 3000,
    fastMinReplyIntervalMs: 10000,
    jevThreshold: 0.6,
  })
  const storedGate = JSON.parse(readFileSync(settingsFile, 'utf8'))
  assert.deepEqual(storedGate.config.gate, { debounce: '3s', fastMinReplyInterval: '10s', jevThreshold: 0.6 })

  const badGate = await call(routes, '/dsh-qq-relay/api/config', {
    method: 'POST',
    body: JSON.stringify({ gate: { jevThreshold: 3 } }),
  })
  assert.equal(badGate.status, 400)
  assert.ok(badGate.payload.error.message.includes('jevThreshold'))

  // 重新绑定：白名单群成功，未知群 400
  const rebound = await call(routes, '/dsh-qq-relay/api/rebind', {
    method: 'POST',
    body: JSON.stringify({ groupId: 200 }),
  })
  assert.equal(rebound.status, 200)
  assert.equal(rebound.payload.value.started, true)

  const badRebind = await call(routes, '/dsh-qq-relay/api/rebind', {
    method: 'POST',
    body: JSON.stringify({ groupId: 999 }),
  })
  assert.equal(badRebind.status, 400)
  assert.equal(badRebind.payload.error.code, 'REBIND_GROUP_INVALID')
})

test('apply：rebind 删除群映射并重建（下次消息按新项目建会话）', async (t) => {
  const home = mkdtempSync(join(tmpdir(), 'dsh-qq-relay-apply-rebind-'))
  const previousHome = process.env.HOME
  process.env.HOME = home
  t.after(() => {
    if (previousHome === undefined) delete process.env.HOME
    else process.env.HOME = previousHome
    rmSync(home, { recursive: true, force: true })
  })

  // 预置一条旧映射（模拟升级前已绑定的群）
  const storageDir = join(home, '.dsh', 'storages', 'dsh-qq-relay')
  mkdirSync(storageDir, { recursive: true })
  writeFileSync(join(storageDir, 'mapping.json'), JSON.stringify({
    100: { sessionId: 'session-old', workspacePath: join(home, 'old-project'), title: 'QQ群：旧', createdAt: 1 },
  }), 'utf8')

  const { ctx, routes, cleanups } = fakeCtx()
  t.after(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup() })
  apply(ctx, {
    wsUrl: 'ws://127.0.0.1:1',
    accessToken: 'patch-token',
    selfId: 999,
    groups: [100],
    workspace: join(home, 'ws'),
  })

  const before = await call(routes, '/dsh-qq-relay/api/status')
  assert.equal(before.payload.value.mappings.length, 1)

  const rebound = await call(routes, '/dsh-qq-relay/api/rebind', {
    method: 'POST',
    body: JSON.stringify({ groupId: 100 }),
  })
  assert.equal(rebound.status, 200)
  assert.equal(rebound.payload.value.mappings.length, 0, '映射应被删除')
  const stored = JSON.parse(readFileSync(join(storageDir, 'mapping.json'), 'utf8'))
  assert.deepEqual(stored, {})
})

test('apply：立即清理按 body 的保留天数删除过期聊天与媒体', async (t) => {
  const home = mkdtempSync(join(tmpdir(), 'dsh-qq-relay-apply-cleanup-'))
  const previousHome = process.env.HOME
  process.env.HOME = home
  t.after(() => {
    if (previousHome === undefined) delete process.env.HOME
    else process.env.HOME = previousHome
    rmSync(home, { recursive: true, force: true })
  })

  const now = Date.now()
  const oldKey = dateKey(now - 30 * 24 * 60 * 60 * 1000)
  const newKey = dateKey(now)
  const project = join(home, 'projects', 'my-app')
  const group = '100'

  // 预置已绑定群映射（聊天目录 / 媒体目录都以该群项目为准）
  const storageDir = join(home, '.dsh', 'storages', 'dsh-qq-relay')
  mkdirSync(storageDir, { recursive: true })
  writeFileSync(join(storageDir, 'mapping.json'), JSON.stringify({
    100: { sessionId: 'session-old', workspacePath: project, title: 'QQ群：旧', createdAt: 1 },
  }), 'utf8')

  const chatDir = join(project, '.qq-relay', 'chat', group)
  mkdirSync(chatDir, { recursive: true })
  const oldChat = join(chatDir, oldKey + '.jsonl')
  const newChat = join(chatDir, newKey + '.jsonl')
  writeFileSync(oldChat, JSON.stringify({ time: now - 30 * 24 * 60 * 60 * 1000, text: '旧' }) + '\n', 'utf8')
  writeFileSync(newChat, JSON.stringify({ time: now, text: '新' }) + '\n', 'utf8')

  const mediaDir = join(project, '.qq-relay', 'media', group)
  mkdirSync(join(mediaDir, oldKey), { recursive: true })
  mkdirSync(join(mediaDir, newKey), { recursive: true })

  const { ctx, routes, cleanups } = fakeCtx()
  t.after(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup() })
  apply(ctx, {
    wsUrl: 'ws://127.0.0.1:1',
    accessToken: 'patch-token',
    selfId: 999,
    groups: [100],
    workspace: project,
  })

  const result = await call(routes, '/dsh-qq-relay/api/cleanup', {
    method: 'POST',
    body: JSON.stringify({ days: 7 }),
  })
  assert.equal(result.status, 200)
  assert.equal(result.payload.ok, true)
  assert.equal(result.payload.value.cleanup.days, 7)
  assert.equal(result.payload.value.cleanup.chat, 1)
  assert.equal(result.payload.value.cleanup.media, 1)
  assert.equal(result.payload.value.status.started, true)
  assert.equal(existsSync(oldChat), false, '过期聊天文件应删除')
  assert.equal(existsSync(newChat), true, '近期聊天文件应保留')
  assert.equal(existsSync(join(mediaDir, oldKey)), false, '过期媒体目录应删除')
  assert.equal(existsSync(join(mediaDir, newKey)), true, '近期媒体目录应保留')

  // 非法天数（0 = 永不自动删除）→ 400，且不删除任何东西
  const invalid = await call(routes, '/dsh-qq-relay/api/cleanup', {
    method: 'POST',
    body: JSON.stringify({ days: 0 }),
  })
  assert.equal(invalid.status, 400)
  assert.equal(invalid.payload.error.code, 'CLEANUP_DAYS_INVALID')
})

test('apply：面板数据——闸门每群状态 / 最近消息 / 解除绑定', async (t) => {
  const home = mkdtempSync(join(tmpdir(), 'dsh-qq-relay-apply-panel-'))
  const previousHome = process.env.HOME
  process.env.HOME = home
  t.after(() => {
    if (previousHome === undefined) delete process.env.HOME
    else process.env.HOME = previousHome
    rmSync(home, { recursive: true, force: true })
  })

  const now = Date.now()
  const project = join(home, 'projects', 'my-app')
  const storageDir = join(home, '.dsh', 'storages', 'dsh-qq-relay')
  mkdirSync(storageDir, { recursive: true })
  writeFileSync(join(storageDir, 'mapping.json'), JSON.stringify({
    100: { sessionId: 'session-old', workspacePath: project, title: 'QQ群：旧', createdAt: 1 },
  }), 'utf8')

  const chatDir = join(project, '.qq-relay', 'chat', '100')
  mkdirSync(chatDir, { recursive: true })
  writeFileSync(join(chatDir, dateKey(now) + '.jsonl'), [
    JSON.stringify({ time: now - 2000, messageId: 'm1', userId: '1', nickname: 'tester', card: 'tester', text: '第一条' }),
    JSON.stringify({ time: now - 1000, messageId: 'm2', userId: '2', nickname: '另一位', text: '第二条', mentionsSelf: true }),
    '',
  ].join('\n'), 'utf8')

  const { ctx, routes, cleanups } = fakeCtx()
  t.after(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup() })
  apply(ctx, {
    wsUrl: 'ws://127.0.0.1:1',
    accessToken: 'patch-token',
    selfId: 999,
    groups: [100],
    workspace: project,
  })

  // 闸门状态：每群一行 + 全局计数（WS 未连上，队列为 0）
  const status = await call(routes, '/dsh-qq-relay/api/status')
  assert.equal(status.status, 200)
  const gate = status.payload.value.gate
  assert.equal(typeof gate.pendingMessages, 'number')
  assert.equal(gate.pendingMessages, 0)
  assert.equal(gate.queue, 0)
  assert.equal(Array.isArray(gate.groups), true)
  assert.equal(gate.groups.length, 1)
  assert.equal(gate.groups[0].groupId, 100)
  assert.equal(gate.groups[0].pending, 0)
  assert.equal(gate.groups[0].dshBusy, false)

  // 最近消息：只读视图（显示名 / @ 标记），按时间升序
  const messages = await call(routes, '/dsh-qq-relay/api/messages', {
    method: 'GET',
    url: '/dsh-qq-relay/api/messages?groupId=100&limit=10',
  })
  assert.equal(messages.status, 200)
  assert.deepEqual(messages.payload.value.messages.map((message) => message.messageId), ['m1', 'm2'])
  assert.equal(messages.payload.value.messages[0].name, 'tester')
  assert.equal(messages.payload.value.messages[1].mentionsSelf, true)

  // 未知群 / 非法群号被拒绝
  const badGroup = await call(routes, '/dsh-qq-relay/api/messages', {
    method: 'GET',
    url: '/dsh-qq-relay/api/messages?groupId=200',
  })
  assert.equal(badGroup.status, 400)
  assert.equal(badGroup.payload.error.code, 'MESSAGES_GROUP_INVALID')

  // 解除绑定：映射删除、状态里的 mappings 变空、下条消息会重新建会话
  const deleted = await call(routes, '/dsh-qq-relay/api/mapping/delete', {
    method: 'POST',
    body: JSON.stringify({ groupId: 100 }),
  })
  assert.equal(deleted.status, 200)
  assert.deepEqual(deleted.payload.value.mapping, { groupId: 100, removed: true })
  assert.deepEqual(deleted.payload.value.status.mappings, [])
  assert.deepEqual(JSON.parse(readFileSync(join(storageDir, 'mapping.json'), 'utf8')), {})
})

test('apply：清空全部映射', async (t) => {
  const home = mkdtempSync(join(tmpdir(), 'dsh-qq-relay-apply-clear-'))
  const previousHome = process.env.HOME
  process.env.HOME = home
  t.after(() => {
    if (previousHome === undefined) delete process.env.HOME
    else process.env.HOME = previousHome
    rmSync(home, { recursive: true, force: true })
  })

  const storageDir = join(home, '.dsh', 'storages', 'dsh-qq-relay')
  mkdirSync(storageDir, { recursive: true })
  writeFileSync(join(storageDir, 'mapping.json'), JSON.stringify({
    100: { sessionId: 'session-a', workspacePath: join(home, 'ws'), title: 'A', createdAt: 1 },
    200: { sessionId: 'session-b', workspacePath: join(home, 'ws'), title: 'B', createdAt: 2 },
  }), 'utf8')

  const { ctx, routes, cleanups } = fakeCtx()
  t.after(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup() })
  apply(ctx, {
    wsUrl: 'ws://127.0.0.1:1',
    accessToken: 'patch-token',
    selfId: 999,
    groups: [100],
    workspace: join(home, 'ws'),
  })

  const cleared = await call(routes, '/dsh-qq-relay/api/mapping/clear', { method: 'POST' })
  assert.equal(cleared.status, 200)
  assert.deepEqual(cleared.payload.value.mappings, { cleared: 2 })
  assert.deepEqual(cleared.payload.value.status.mappings, [])
  assert.deepEqual(JSON.parse(readFileSync(join(storageDir, 'mapping.json'), 'utf8')), {})
})

test('apply：注册 qq_send / qq_poke 工具，离线时返回 queued / 报错', async (t) => {
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
  assert.equal(routes.length, 11)
  assert.equal(tools.length, 2)
  const send = tools.find((tool) => tool.name === 'qq_send')
  const poke = tools.find((tool) => tool.name === 'qq_poke')
  assert.ok(send, '应注册 qq_send')
  assert.ok(poke, '应注册 qq_poke')
  assert.equal(typeof send.execute, 'function')
  assert.equal(typeof send.output.render, 'function')

  // v0.21.1 回归：runtime 包装曾漏掉 sendImage / sendFile，qq_send 发图直接
  // 「sendImage is not a function」。离线时应是 relay 的可读错误，而不是 TypeError。
  await assert.rejects(
    () => send.execute({ images: ['/tmp/not-a-real-image.png'] }, {}),
    (error) => {
      const message = String(error?.message ?? error)
      assert.equal(message.includes('is not a function'), false)
      assert.equal(message.includes('当前离线'), true)
      return true
    },
  )
  assert.equal(typeof poke.execute, 'function')
  assert.equal(typeof poke.output.render, 'function')

  // WS 指向不存在的端口 → 离线；工具应把消息排进发送队列
  const value = await send.execute({ groupId: 100, text: '测试推送' })
  assert.equal(value.groupId, 100)
  assert.equal(value.chunks, 1)
  assert.equal(value.queued, true)
  assert.deepEqual(value.messageIds, [])

  // 非白名单群被拒绝；离线时戳一戳直接报错（不排队）
  await assert.rejects(() => send.execute({ groupId: 200, text: 'x' }), /不在白名单/)
  await assert.rejects(() => poke.execute({ groupId: 100, userId: 205 }), /当前离线/)
})

test('apply：启动时把旧全局聊天日志迁移到群项目 .qq-relay', async (t) => {
  const home = mkdtempSync(join(tmpdir(), 'dsh-qq-relay-apply-chat-'))
  const previousHome = process.env.HOME
  process.env.HOME = home
  t.after(() => {
    if (previousHome === undefined) delete process.env.HOME
    else process.env.HOME = previousHome
    rmSync(home, { recursive: true, force: true })
  })

  const project = join(home, 'projects', 'my-app')
  const storageDir = join(home, '.dsh', 'storages', 'dsh-qq-relay')
  mkdirSync(join(storageDir, 'chat', '100'), { recursive: true })
  writeFileSync(join(storageDir, 'chat', '100', '2026-10-19.jsonl'), JSON.stringify({ time: Date.now(), text: '旧消息' }) + '\n', 'utf8')
  writeFileSync(join(storageDir, 'mapping.json'), JSON.stringify({
    100: { sessionId: 'session-old', workspacePath: project, title: 'QQ群：旧', createdAt: 1 },
  }), 'utf8')

  const { ctx, cleanups } = fakeCtx()
  t.after(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup() })
  apply(ctx, {
    wsUrl: 'ws://127.0.0.1:1',
    accessToken: 'patch-token',
    selfId: 999,
    groups: [100],
    workspace: project,
  })

  const migrated = join(project, '.qq-relay', 'chat', '100', '2026-10-19.jsonl')
  assert.equal(existsSync(migrated), true, '旧聊天日志应迁移到群项目')
  assert.equal(readFileSync(migrated, 'utf8').includes('旧消息'), true)
  assert.equal(readFileSync(join(project, '.qq-relay', '.gitignore'), 'utf8'), '*\n')
  assert.equal(existsSync(join(storageDir, 'chat', '100', '2026-10-19.jsonl')), false, '旧文件应被移走')
  assert.equal(existsSync(join(storageDir, 'chat-migration.json')), true)
})
test('apply：插件预设 CRUD（v0.20.0）', async (t) => {
  const home = mkdtempSync(join(tmpdir(), 'dsh-qq-relay-presets-'))
  const previousHome = process.env.HOME
  process.env.HOME = home
  t.after(() => {
    if (previousHome === undefined) delete process.env.HOME
    else process.env.HOME = previousHome
    rmSync(home, { recursive: true, force: true })
  })

  const { ctx, routes, cleanups } = fakeCtx()
  t.after(() => {
    for (const cleanup of cleanups.splice(0).reverse()) {
      try { if (typeof cleanup === 'function') cleanup() } catch {}
    }
  })
  apply(ctx, {
    wsUrl: 'ws://127.0.0.1:1',
    accessToken: 't',
    selfId: 999,
    groups: [100],
    workspace: join(home, 'ws'),
  })

  const saved = await call(routes, '/dsh-qq-relay/api/presets', {
    method: 'POST',
    body: JSON.stringify({ preset: { id: 'catgirl', name: '猫娘', persona: '你是群里的猫娘助手。', order: 120 } }),
  })
  assert.equal(saved.status, 200)
  assert.equal(saved.payload.value.presets.length, 2)
  assert.equal(saved.payload.value.presets.some((preset) => preset.id === 'catgirl'), true)
  assert.equal(saved.payload.value.status.presets.some((preset) => preset.id === 'catgirl'), true)

  const presetFile = join(home, '.dsh', 'storages', 'dsh-qq-relay', 'presets.json')
  assert.equal(existsSync(presetFile), true)
  const stored = JSON.parse(readFileSync(presetFile, 'utf8'))
  assert.deepEqual(stored.presets.map((preset) => preset.id).sort(), ['catgirl', 'qq-relay'])

  const invalid = await call(routes, '/dsh-qq-relay/api/presets', {
    method: 'POST',
    body: JSON.stringify({ preset: { id: 'Bad Id', name: '', persona: '' } }),
  })
  assert.equal(invalid.status, 400)
  assert.equal(invalid.payload.error.code, 'PRESET_INVALID')

  // 正在被 QQ 会话使用的预设拒绝删除
  const selected = await call(routes, '/dsh-qq-relay/api/config', {
    method: 'POST',
    body: JSON.stringify({ agentPreset: 'qq-relay' }),
  })
  assert.equal(selected.status, 200)
  const inUse = await call(routes, '/dsh-qq-relay/api/presets/delete', {
    method: 'POST',
    body: JSON.stringify({ id: 'qq-relay' }),
  })
  assert.equal(inUse.status, 409)
  assert.equal(inUse.payload.error.code, 'PRESET_IN_USE')

  const removed = await call(routes, '/dsh-qq-relay/api/presets/delete', {
    method: 'POST',
    body: JSON.stringify({ id: 'catgirl' }),
  })
  assert.equal(removed.status, 200)
  assert.equal(removed.payload.value.presets.some((preset) => preset.id === 'catgirl'), false)
})
