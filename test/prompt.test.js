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
  PROMPT_PLATFORM_NOTE,
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
  assert.equal(lines.length, 5)
  assert.equal(lines[0], '[QQ群：示例群（10002）] 2026-10-19 11:21 新消息 2 条')
  assert.equal(lines[1], '[11:21:39] [tester] 测试')
  assert.equal(lines[2], '[11:21:47] [tester]（@你）再回复一句话')
  assert.equal(lines[3], '[历史记录：.qq-relay/chat/10002/（JSONL，按天分文件）]')
  assert.equal(lines[4], PROMPT_PLATFORM_NOTE)
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

test('prompt：媒体标记（图片 / 表情 / face / 失败）与纯媒体行', () => {
  const imageOnly = formatIncomingPrompt({
    groupId: 100,
    groupName: '测试群',
    now: T,
    messages: [{
      text: '',
      time: T,
      nickname: 'TS',
      media: [{ kind: 'image', status: 'saved', path: '.qq-relay/media/100/2026-10-19/1-0.png' }],
    }],
  })
  assert.ok(imageOnly.includes('新消息 1 条'), imageOnly)
  assert.ok(imageOnly.includes('[11:21:39] [TS] [图片：.qq-relay/media/100/2026-10-19/1-0.png]'), imageOnly)

  const withText = formatIncomingPrompt({
    groupId: 100,
    groupName: '测试群',
    now: T,
    messages: [{
      text: '这是什么',
      time: T,
      nickname: 'TS',
      media: [{ kind: 'sticker', status: 'saved', path: '.qq-relay/media/100/x.gif' }],
    }],
  })
  assert.ok(withText.includes('[表情：.qq-relay/media/100/x.gif] 这是什么'), withText)

  const face = formatIncomingPrompt({
    groupId: 100,
    groupName: '测试群',
    now: T,
    messages: [{ text: '', time: T, nickname: 'TS', media: [{ kind: 'face', status: 'metadata', text: '/失眠' }] }],
  })
  assert.ok(face.includes('[表情 /失眠]'), face)

  const failed = formatIncomingPrompt({
    groupId: 100,
    groupName: '测试群',
    now: T,
    messages: [{ text: '图呢', time: T, nickname: 'TS', media: [{ kind: 'image', status: 'failed', reason: 'timeout' }] }],
  })
  assert.ok(failed.includes('[媒体下载失败] 图呢'), failed)

  const videoAndVoice = formatIncomingPrompt({
    groupId: 100,
    groupName: '测试群',
    now: T,
    messages: [{
      text: '',
      time: T,
      nickname: 'TS',
      media: [
        { kind: 'video', status: 'saved', path: '.qq-relay/media/100/v.mp4' },
        { kind: 'voice', status: 'saved', path: '.qq-relay/media/100/r.amr' },
      ],
    }],
  })
  assert.ok(videoAndVoice.includes('[视频：.qq-relay/media/100/v.mp4]'), videoAndVoice)
  assert.ok(videoAndVoice.includes('[语音：.qq-relay/media/100/r.amr]'), videoAndVoice)

  const metadataOnly = formatIncomingPrompt({
    groupId: 100,
    groupName: '测试群',
    now: T,
    messages: [{
      text: '听一下',
      time: T,
      nickname: 'TS',
      media: [
        { kind: 'video', status: 'metadata', file: 'v.mp4' },
        { kind: 'voice', status: 'metadata', file: 'r.amr' },
      ],
    }],
  })
  assert.ok(metadataOnly.includes('[视频（未下载）]'), metadataOnly)
  assert.ok(metadataOnly.includes('[语音（未下载）]'), metadataOnly)
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
test('prompt：@ 其他人标记与代答说明（v0.18.0）', () => {
  const text = formatIncomingPrompt({
    groupId: 100,
    groupName: '测试群',
    now: T,
    reason: 'proxy',
    notes: ['代答：这条消息 @ 了「群主」，TA 最近 10 分钟没有在本群发言，请代 TA 回应（回复以机器人身份发出）。'],
    messages: [{ text: '帮我看下', time: T, nickname: 'tester', atNames: ['群主'] }],
  })
  const lines = text.split('\n')
  assert.ok(lines[0].includes('（直通：代答）'), lines[0])
  assert.equal(lines[1], '[11:21:39] [tester]（@群主）帮我看下')
  assert.equal(lines[2], '[代答：这条消息 @ 了「群主」，TA 最近 10 分钟没有在本群发言，请代 TA 回应（回复以机器人身份发出）。]')
  assert.equal(lines[3], '[历史记录：.qq-relay/chat/100/（JSONL，按天分文件）]')

  // notes 空行被忽略
  const noNote = formatIncomingPrompt({ groupId: 100, now: T, notes: [''], messages: [{ text: 'x', time: T }] })
  assert.ok(!noNote.includes('[]'), noNote)
})

test('prompt：群文件媒体标记（v0.16.0）', () => {
  const saved = formatIncomingPrompt({
    groupId: 100,
    groupName: '测试群',
    now: T,
    messages: [{
      text: '看看这个',
      time: T,
      nickname: 'TS',
      media: [{ kind: 'file', status: 'saved', path: '.qq-relay/media/100/f-报告.pdf', file: '报告.pdf' }],
    }],
  })
  assert.ok(saved.includes('[文件：.qq-relay/media/100/f-报告.pdf]'), saved)
  assert.ok(saved.includes('看看这个'), saved)

  const failed = formatIncomingPrompt({
    groupId: 100,
    groupName: '测试群',
    now: T,
    messages: [{
      text: '文件呢',
      time: T,
      nickname: 'TS',
      media: [{ kind: 'file', status: 'failed', reason: 'too-large', file: 'big.zip' }],
    }],
  })
  assert.ok(failed.includes('[群文件下载失败]'), failed)
})

test('prompt：轻量人设与平台约定（v0.19.0）', () => {
  const text = formatIncomingPrompt({
    groupId: 100,
    groupName: '测试群',
    now: T,
    persona: '你是猫娘\n说话带喵',
    messages: [{ text: 'x', time: T }],
  })
  const lines = text.split('\n')
  assert.equal(lines[0], '[QQ群：测试群（100）] 2026-10-19 11:21 新消息 1 条')
  assert.equal(lines[1], '[角色设定：你是猫娘 说话带喵]')
  assert.equal(lines[lines.length - 1], PROMPT_PLATFORM_NOTE)

  const noNote = formatIncomingPrompt({ groupId: 100, now: T, platformNote: false, messages: [{ text: 'x', time: T }] })
  assert.ok(!noNote.includes(PROMPT_PLATFORM_NOTE), noNote)
  assert.ok(!noNote.includes('角色设定'), noNote)
})
