/**
 * 命令层纯逻辑单测（v0.11.0）：解析 / 角色 / 文案。
 * 运行：pnpm test == node --test test/*.test.js
 */

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  canRunCommand,
  formatAgo,
  formatCommandHelp,
  formatDuration,
  formatNewSessionTitle,
  formatStatusReply,
  parseCommand,
} from '../lib/model/commands.js'

const PREFIXES = ['/dsh']
const parse = (text, options = {}) => parseCommand(text, { prefixes: PREFIXES, bare: true, ...options })

test('commands：裸写 / 前缀写法都能解析', () => {
  assert.deepEqual(parse('/new'), { name: 'new', args: '', form: 'bare', prefix: '/' })
  assert.deepEqual(parse(' /status '), { name: 'status', args: '', form: 'bare', prefix: '/' })
  assert.deepEqual(parse('/dsh new'), { name: 'new', args: '', form: 'prefix', prefix: '/dsh' })
  assert.deepEqual(parse('/dsh   stop'), { name: 'stop', args: '', form: 'prefix', prefix: '/dsh' })
  assert.deepEqual(parse('/new 修一下登录'), { name: 'new', args: '修一下登录', form: 'bare', prefix: '/' })
  assert.deepEqual(parse('/dsh new 发版'), { name: 'new', args: '发版', form: 'prefix', prefix: '/dsh' })
})

test('commands：别名与大小写', () => {
  assert.equal(parse('/NEW').name, 'new')
  assert.equal(parse('/reset').name, 'new')
  assert.equal(parse('/cancel').name, 'stop')
  assert.equal(parse('/info').name, 'status')
  assert.equal(parse('/菜单').name, 'help')
  assert.equal(parse('/?').name, 'help')
})

test('commands：只认白名单命令名，其余返回 null', () => {
  assert.equal(parse('/hello'), null)
  assert.equal(parse('你好 /new'), null)
  assert.equal(parse('/dsh'), null, '前缀后面没有命令名不算命令')
  assert.equal(parse('/dshnew'), null, '前缀后必须跟空白，不能粘着写')
  assert.equal(parse('/dsh 帮我看看这段代码'), null, '不是已知命令 → 交回直通')
  assert.equal(parse(''), null)
  assert.equal(parse(null), null)
  assert.equal(parse(undefined), null)
})

test('commands：bare=false 时只接受前缀写法', () => {
  assert.equal(parse('/new', { bare: false }), null)
  assert.equal(parse('/dsh new', { bare: false }).name, 'new')
})

test('commands：最长前缀优先', () => {
  const parsed = parseCommand('/dsh relay new', { prefixes: ['/dsh', '/dsh relay'], bare: false })
  assert.equal(parsed.name, 'new')
  assert.equal(parsed.prefix, '/dsh relay', '最长的前缀命中')
  const parsed2 = parseCommand('/dsh relay status', { prefixes: ['/dsh', '/dsh relay'], bare: false })
  assert.equal(parsed2.name, 'status')
  assert.equal(parsed2.prefix, '/dsh relay')
})

test('commands：角色校验只看群角色', () => {
  const event = (role) => ({ sender: { role } })
  assert.equal(canRunCommand(event('owner')), true)
  assert.equal(canRunCommand(event('admin')), true)
  assert.equal(canRunCommand(event('member')), false)
  assert.equal(canRunCommand(event('')), false)
  assert.equal(canRunCommand(null), false)
  assert.equal(canRunCommand(event('member'), ['member']), true)
})

test('commands：新会话标题（自定义 / 时间后缀）', () => {
  const now = new Date(2026, 0, 2, 3, 4, 5).getTime()
  assert.equal(formatNewSessionTitle('QQ群：测试群', { args: '  修 bug  ', now }), '修 bug')
  assert.equal(formatNewSessionTitle('QQ群：测试群', { now }), 'QQ群：测试群（03:04）')
  assert.equal(formatNewSessionTitle('QQ群：测试群', { args: 'x'.repeat(80), now }).length, 60)
})

test('commands：帮助文案带命令与前缀写法', () => {
  const text = formatCommandHelp({ prefixes: ['/dsh'] })
  for (const name of ['/new', '/stop', '/status', '/help']) assert.ok(text.includes(name), text)
  assert.ok(text.includes('/dsh new'), text)
})

test('commands：status 文案（有会话 / 无会话 / 闸门关）', () => {
  const now = new Date(2026, 0, 2, 3, 4, 5).getTime()
  const text = formatStatusReply({
    groupId: 100,
    groupName: '测试群',
    sessionTitle: 'QQ群：测试群',
    sessionId: 'session-1',
    projectDir: '/tmp/ws',
    gate: { enabled: true, jevThreshold: 0.7, debounceMs: 5000, fastMinReplyIntervalMs: 45000 },
    pendingMessages: 3,
    pendingGroups: 2,
    lastReplyAt: now - 5 * 60 * 1000,
    dshBusy: true,
    queue: 1,
    sendQueue: 2,
    now,
  })
  assert.ok(text.includes('【QQ relay 状态】'), text)
  assert.ok(text.includes('100（测试群）'), text)
  assert.ok(text.includes('session-1'), text)
  assert.ok(text.includes('阈值 0.70'), text)
  assert.ok(text.includes('去抖 5s'), text)
  assert.ok(text.includes('最小间隔 45s'), text)
  assert.ok(text.includes('待评估：3 条 / 2 批'), text)
  assert.ok(text.includes('最近发言：02:59:05（5 分钟前）'), text)
  assert.ok(text.includes('运行中：是'), text)

  const empty = formatStatusReply({ groupId: 100, gate: { enabled: false }, now })
  assert.ok(empty.includes('会话：未创建'), empty)
  assert.ok(empty.includes('闸门：关'), empty)
  assert.ok(empty.includes('最近发言：还没发过言'), empty)
})

test('commands：时长与相对时间格式化', () => {
  assert.equal(formatDuration(5000), '5s')
  assert.equal(formatDuration(45000), '45s')
  assert.equal(formatDuration(2 * 60 * 60 * 1000), '2h')
  assert.equal(formatDuration(0), '0s')
  assert.equal(formatDuration(1500), '1.5s')
  assert.equal(formatAgo(100, 100 + 30 * 1000), '刚刚')
  assert.equal(formatAgo(100, 100 + 5 * 60 * 1000), '5 分钟前')
  assert.equal(formatAgo(100, 100 + 3 * 60 * 60 * 1000), '3 小时前')
  assert.equal(formatAgo(0), '')
})
