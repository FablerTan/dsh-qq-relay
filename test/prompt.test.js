/**
 * 消息拼接单测（node:test，零依赖）：批内格式、@ / 引用标记、直通原因、历史指针。
 */

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  chatHistoryPointer,
  displayName,
  formatClock,
  formatDateTime,
  formatIncomingPrompt,
  promptLine,
} from '../lib/model/prompt.js'

/** 用本地时间构造，格式化结果与运行机时区无关。 */
const T = new Date(2026, 9, 19, 11, 21, 39).getTime()

test('prompt：闸门批次格式（群名 / 时间 / 条数 / 行 / 历史指针）', () => {
  const text = formatIncomingPrompt({
    groupId: 10002,
    groupName: '示例群',
    now: T,
    messages: [
      { text: '测试', time: T, card: 'tester' },
      { text: '再回复一句话', time: T + 8000, nickname: 'tester', mentionsSelf: true },
      { text: '   ', time: T + 9000 },
    ],
  })
  const lines = text.split('\n')
  assert.equal(lines.length, 4)
  assert.equal(lines[0], '[QQ群：示例群（10002）] 2026-10-19 11:21 新消息 2 条')
  assert.equal(lines[1], '[11:21:39] [tester] 测试')
  assert.equal(lines[2], '[11:21:47] [tester]（@你）再回复一句话')
  assert.equal(lines[3], '[历史记录：.qq-relay/chat/10002/（JSONL，按天分文件）]')
})

test('prompt：引用标记与 @ 同时出现时按顺序拼接', () => {
  const text = formatIncomingPrompt({
    groupId: 100,
    groupName: '测试群',
    now: T,
    messages: [{ text: '在吗', time: T, nickname: 'tester', mentionsSelf: true, replyToId: '42' }],
  })
  assert.ok(text.includes('[11:21:39] [tester]（@你，引用 42）在吗'), text)
})

test('prompt：直通原因标签（@ / 引用 / 命令）', () => {
  for (const [reason, label] of [['mention', '@'], ['reply', '引用'], ['command', '命令']]) {
    const text = formatIncomingPrompt({
      groupId: 100, groupName: '测试群', now: T, reason,
      messages: [{ text: 'x', time: T, nickname: 'tester' }],
    })
    assert.ok(text.includes('新消息 1 条（直通：' + label + '）'), text)
  }
  const noReason = formatIncomingPrompt({ groupId: 100, groupName: '测试群', now: T, messages: [{ text: 'x', time: T }] })
  assert.ok(!noReason.includes('直通'), noReason)
})

test('prompt：群名缺省 / 显示名回退 / 空批次', () => {
  assert.equal(formatIncomingPrompt({ groupId: 7, messages: [] }), '')
  assert.equal(formatIncomingPrompt({ groupId: 7, messages: null }), '')

  const anonymousGroup = formatIncomingPrompt({
    groupId: 7, now: T, messages: [{ text: 'x', time: T, userId: '205' }],
  })
  assert.ok(anonymousGroup.startsWith('[QQ群：群 7（7）] '), anonymousGroup)
  assert.ok(anonymousGroup.includes('[205] x'), anonymousGroup)

  // 没有时间时用 now 兜底
  const undated = formatIncomingPrompt({ groupId: 7, groupName: 'g', now: T, messages: [{ text: 'y', nickname: 'n' }] })
  assert.ok(undated.includes('[11:21:39] [n] y'), undated)
})

test('prompt：displayName 优先级 card > nickname > userId', () => {
  assert.equal(displayName({ card: '名片', nickname: '昵称', userId: '1' }), '名片')
  assert.equal(displayName({ card: '', nickname: '昵称', userId: '1' }), '昵称')
  assert.equal(displayName({ nickname: '', userId: '1' }), '1')
  assert.equal(displayName(null), '')
})

test('prompt：时间格式化与历史指针', () => {
  assert.equal(formatClock(T), '11:21:39')
  assert.equal(formatDateTime(T), '2026-10-19 11:21')
  assert.equal(chatHistoryPointer(10002), '.qq-relay/chat/10002/')
  assert.equal(promptLine({ text: 'x' }, T), '[11:21:39] x')
})
