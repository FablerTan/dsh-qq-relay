/**
 * 设置页面板纯逻辑单测（v0.14.0，node:test）：最近消息查询校验 + 聊天记录 → 面板视图。
 */

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  PANEL_MESSAGES_DEFAULT_LIMIT,
  PANEL_MESSAGES_MAX_LIMIT,
  normalizeMessagesQuery,
  panelMessages,
  toPanelMessage,
} from '../lib/model/panel.js'

test('panel：最近消息查询校验（默认条数 / 上限截断 / 非法值）', () => {
  assert.deepEqual(normalizeMessagesQuery({ groupId: '100' }), {
    ok: true,
    groupId: 100,
    limit: PANEL_MESSAGES_DEFAULT_LIMIT,
  })
  assert.deepEqual(normalizeMessagesQuery({ groupId: '100', limit: '5' }), { ok: true, groupId: 100, limit: 5 })
  assert.deepEqual(normalizeMessagesQuery({ groupId: '100', limit: '' }), {
    ok: true,
    groupId: 100,
    limit: PANEL_MESSAGES_DEFAULT_LIMIT,
  })
  const clamped = normalizeMessagesQuery({ groupId: '100', limit: '999' })
  assert.equal(clamped.ok, true)
  assert.equal(clamped.limit, PANEL_MESSAGES_MAX_LIMIT)

  for (const groupId of ['', 'abc', '0', '-1', '1.5', null, undefined]) {
    const result = normalizeMessagesQuery({ groupId })
    assert.equal(result.ok, false, '应拒绝群号：' + String(groupId))
    assert.ok(result.message.includes('groupId'))
  }
  for (const limit of ['0', '-1', 'abc', '2.5']) {
    const result = normalizeMessagesQuery({ groupId: '100', limit })
    assert.equal(result.ok, false, '应拒绝条数：' + String(limit))
    assert.ok(result.message.includes('limit'))
  }
})

test('panel：聊天记录 → 面板消息（显示名优先级 / 媒体收敛 / 脏数据过滤）', () => {
  const media = [
    { kind: 'image', status: 'saved', path: '.qq-relay/media/100/2026-10-19/1.jpg', bytes: 10, extra: 'x' },
    { kind: 'face', status: 'metadata', text: '[笑]' },
  ]
  const withCard = toPanelMessage({
    messageId: 'm1',
    time: 1000,
    card: '群名片',
    nickname: '昵称',
    userId: '10003',
    text: '你好',
    mentionsSelf: true,
    replyToId: 'm0',
    media,
  })
  assert.deepEqual(withCard, {
    messageId: 'm1',
    time: 1000,
    name: '群名片',
    text: '你好',
    mentionsSelf: true,
    replyToId: 'm0',
    media: [
      { kind: 'image', status: 'saved', path: '.qq-relay/media/100/2026-10-19/1.jpg' },
      { kind: 'face', status: 'metadata', path: '' },
    ],
  })

  assert.equal(toPanelMessage({ nickname: '昵称', userId: '10003' }).name, '昵称')
  assert.equal(toPanelMessage({ userId: '10003' }).name, '10003')
  assert.equal(toPanelMessage({ messageId: 'm2' }).time, 0)
  assert.equal(toPanelMessage({ messageId: 'm2' }).replyToId, '')
  assert.equal(toPanelMessage(null), null)
})

test('panel：panelMessages 取最后 N 条（时间升序，丢弃脏记录）', () => {
  const records = [1, 2, 3, 4, 5].map((n) => ({
    messageId: 'm' + String(n),
    time: n,
    nickname: 'n' + String(n),
    text: 't' + String(n),
  }))
  const messages = panelMessages([...records, null, 'bad'], 3)
  assert.deepEqual(messages.map((message) => message.messageId), ['m3', 'm4', 'm5'])
  assert.deepEqual(panelMessages([], 5), [])
  assert.equal(panelMessages(records, 0).length, records.length, '非法 limit 回退默认条数')
})
