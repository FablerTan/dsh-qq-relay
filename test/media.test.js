/**
 * 媒体落盘单测（node:test，零依赖）：计划解析 / 下载 / 失败 / 归一化 / 清理。
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  attachMedia,
  decodeEntities,
  mediaDateKey,
  mediaRelativePath,
  normalizeMediaRecords,
  planMedia,
  pruneMedia,
  sanitizeStem,
  sniffImageExt,
  sniffMediaExt,
} from '../lib/model/media.js'
import { RELAY_DIR_NAME } from '../lib/model/project.js'

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 2])
const WEBP = Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 1, 2, 3])
const T = new Date(2026, 9, 19, 10, 0, 0).getTime()

function tempDir(t) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-qq-relay-media-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

function okResponse(body, options = {}) {
  const contentType = options.contentType ?? 'image/png'
  const contentLength = options.contentLength ?? null
  const status = options.status ?? 200
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        const key = String(name).toLowerCase()
        if (key === 'content-type') return contentType
        if (key === 'content-length') return contentLength === null ? null : String(contentLength)
        return null
      },
    },
    async arrayBuffer() { return body },
  }
}

test('media：planMedia 解析 image / sticker / face', () => {
  const segments = [
    { type: 'image', data: { url: 'https://x/a.jpg', file: 'a.jpg', sub_type: 0 } },
    { type: 'image', data: { url: 'https://x/b.png', file: 'b.png', sub_type: 1, summary: '[动画表情]' } },
    { type: 'mface', data: { url: 'https://x/c.gif', summary: '[商城表情]' } },
    { type: 'face', data: { id: '468', faceText: '/失眠' } },
  ]
  const media = planMedia(segments)
  assert.deepEqual(media.map((item) => item.kind), ['image', 'sticker', 'sticker', 'face'])
  assert.equal(media[0].url, 'https://x/a.jpg')
  assert.equal(media[3].text, '/失眠')

  const fromRaw = planMedia(
    [{ type: 'face', data: { id: '468' } }],
    '[CQ:face,id=468,raw={"faceIndex":468&#44;"faceText":"&#91;汪汪&#93;"}]',
  )
  assert.equal(fromRaw[0].text, '[汪汪]')
})

test('media：planMedia 单条最多 10 个', () => {
  const segments = Array.from({ length: 12 }, () => ({ type: 'image', data: { url: 'https://x/a.png' } }))
  assert.equal(planMedia(segments).length, 10)
})

test('media：decodeEntities / sanitizeStem / mediaRelativePath', () => {
  assert.equal(decodeEntities('a&amp;b&#44;c&#91;d&#93;'), 'a&b,c[d]')
  assert.equal(sanitizeStem('a/b:c d'), 'a_b_c_d')
  assert.equal(sanitizeStem(''), 'msg')
  assert.equal(sanitizeStem('1'.repeat(80)).length, 48)
  assert.equal(mediaDateKey(T), '2026-10-19')
  assert.equal(
    mediaRelativePath({ groupId: 100, dateKey: '2026-10-19', messageId: '42', index: 0, ext: '.png' }),
    '.qq-relay/media/100/2026-10-19/42-0.png',
  )
})

test('media：下载成功写文件、建 .gitignore、记录相对路径', async (t) => {
  const dir = tempDir(t)
  const project = join(dir, 'my-app')
  const calls = []
  const fetchImpl = async (url, init) => { calls.push({ url, init }); return okResponse(PNG) }
  const records = await attachMedia({
    projectDir: project,
    groupId: 100,
    messageId: '42',
    timeMs: T,
    media: [{ kind: 'image', url: 'https://example.com/a.png' }],
    fetchImpl,
    timeoutMs: 50,
  })
  assert.equal(records[0].status, 'saved')
  assert.equal(records[0].kind, 'image')
  assert.equal(records[0].path, '.qq-relay/media/100/2026-10-19/42-0.png')
  assert.equal(records[0].bytes, PNG.length)
  assert.equal(records[0].contentType, 'image/png')
  assert.equal(existsSync(join(project, records[0].path)), true)
  assert.equal(readFileSync(join(project, records[0].path)).length, PNG.length)
  assert.equal(readFileSync(join(project, RELAY_DIR_NAME, '.gitignore'), 'utf8'), '*\n')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://example.com/a.png')
})

test('media：扩展名按真实内容（magic bytes）优先，不信 CQ file 后缀', async (t) => {
  const project = join(tempDir(t), 'proj')

  // QQ 常见：CQ file 说是 .png，实际字节是 JPEG
  const wrongName = await attachMedia({
    projectDir: project, groupId: 100, messageId: 7, timeMs: T,
    media: [{ kind: 'image', file: '97883368.png', url: 'https://example.com/97883368.png' }],
    fetchImpl: async () => okResponse(JPEG, { contentType: 'image/jpeg' }),
  })
  assert.equal(wrongName[0].path, '.qq-relay/media/100/2026-10-19/7-0.jpg')
  assert.equal(wrongName[0].contentType, 'image/jpeg')

  // URL 没有扩展名：用响应头之外的字节判断（WEBP）
  const webp = await attachMedia({
    projectDir: project, groupId: 100, messageId: 8, timeMs: T,
    media: [{ kind: 'sticker', url: 'https://example.com/download' }],
    fetchImpl: async () => okResponse(WEBP, { contentType: 'application/octet-stream' }),
  })
  assert.equal(webp[0].path, '.qq-relay/media/100/2026-10-19/8-0.webp')

  // 字节无法识别时退回 content-type
  const unknownBytes = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])
  const byType = await attachMedia({
    projectDir: project, groupId: 100, messageId: 9, timeMs: T,
    media: [{ kind: 'image', url: 'https://example.com/blob' }],
    fetchImpl: async () => okResponse(unknownBytes, { contentType: 'image/png' }),
  })
  assert.equal(byType[0].path, '.qq-relay/media/100/2026-10-19/9-0.png')
})

test('media：sniffImageExt 识别常见图片头', () => {
  assert.equal(sniffImageExt(JPEG), '.jpg')
  assert.equal(sniffImageExt(PNG), '.png')
  assert.equal(sniffImageExt(WEBP), '.webp')
  assert.equal(sniffImageExt(Buffer.from([0x47, 0x49, 0x46, 0x38, 0, 0, 0, 0, 0, 0, 0, 0])), '.gif')
  assert.equal(sniffImageExt(Buffer.from([0x42, 0x4d, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])), '.bmp')
  assert.equal(sniffImageExt(Buffer.from('not an image!')), '')
  assert.equal(sniffImageExt(Buffer.from([1, 2, 3])), '')
})

test('media：HTTP 失败 / 网络失败 / 超时 / 超大 / 非 http 都记 failed', async (t) => {
  const project = join(tempDir(t), 'proj')
  const base = { projectDir: project, groupId: 100, messageId: '9', timeMs: T }

  const httpFail = await attachMedia({
    ...base,
    media: [{ kind: 'image', url: 'https://example.com/a.png' }],
    fetchImpl: async () => okResponse(PNG, { status: 403 }),
  })
  assert.equal(httpFail[0].status, 'failed')
  assert.equal(httpFail[0].reason, 'http-403')

  const network = await attachMedia({
    ...base,
    media: [{ kind: 'image', url: 'https://example.com/a.png' }],
    fetchImpl: async () => { throw new Error('boom') },
  })
  assert.equal(network[0].reason, 'network')

  const timeout = await attachMedia({
    ...base,
    media: [{ kind: 'image', url: 'https://example.com/a.png' }],
    timeoutMs: 10,
    fetchImpl: (url, init) => new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
    }),
  })
  assert.equal(timeout[0].reason, 'timeout')

  const tooLarge = await attachMedia({
    ...base,
    media: [{ kind: 'image', url: 'https://example.com/a.png' }],
    fetchImpl: async () => okResponse(PNG, { contentLength: 999999999 }),
  })
  assert.equal(tooLarge[0].reason, 'too-large')

  const localFile = await attachMedia({
    ...base,
    media: [{ kind: 'image', url: 'file:///etc/passwd' }],
    fetchImpl: async () => okResponse(PNG),
  })
  assert.equal(localFile[0].reason, 'unsupported-protocol')
})

test('media：face / 无 url 的媒体只记元信息', async (t) => {
  const project = join(tempDir(t), 'proj')
  const records = await attachMedia({
    projectDir: project, groupId: 100, messageId: 11, timeMs: T,
    media: [
      { kind: 'face', faceId: '468', text: '/失眠' },
      { kind: 'image', file: 'x.jpg', summary: '[图片]' },
    ],
    fetchImpl: async () => { throw new Error('不应被调用') },
  })
  assert.equal(records.length, 2)
  assert.equal(records[0].status, 'metadata')
  assert.equal(records[0].kind, 'face')
  assert.equal(records[0].text, '/失眠')
  assert.equal(records[1].status, 'metadata')
  assert.equal(records[1].file, 'x.jpg')
})

test('media：normalizeMediaRecords 容忍脏数据', () => {
  const out = normalizeMediaRecords([
    { kind: 'sticker', status: 'saved', path: '.qq-relay/media/x.jpg', bytes: 3, contentType: 'image/jpeg' },
    { kind: 'face', status: 'metadata', faceId: '1', text: '/x' },
    { kind: 'image', status: 'failed', reason: 'timeout' },
    null,
    { kind: 'image', status: 'weird', path: '' },
  ])
  assert.equal(out.length, 4)
  assert.equal(out[0].kind, 'sticker')
  assert.equal(out[0].status, 'saved')
  assert.equal(out[1].status, 'metadata')
  assert.equal(out[2].reason, 'timeout')
  assert.equal(out[3].status, 'metadata')
})

test('media：pruneMedia 按日期目录清理（days<=0 不清理）', (t) => {
  const dir = tempDir(t)
  const project = join(dir, 'proj')
  const groupDir = join(project, RELAY_DIR_NAME, 'media', '100')
  mkdirSync(join(groupDir, '2026-10-01'), { recursive: true })
  mkdirSync(join(groupDir, '2026-10-19'), { recursive: true })
  const projectDirFor = () => project
  assert.equal(pruneMedia({ groupIds: [100], projectDirFor, nowMs: T, days: 0 }), 0)
  assert.equal(pruneMedia({ groupIds: [100], projectDirFor, nowMs: T, days: 7 }), 1)
  assert.equal(existsSync(join(groupDir, '2026-10-01')), false)
  assert.equal(existsSync(join(groupDir, '2026-10-19')), true)
  assert.equal(pruneMedia({ groupIds: [101], projectDirFor, nowMs: T, days: 7 }), 0)
})
test('media：planMedia 解析 video / record（v0.12.0）', () => {
  const media = planMedia([
    { type: 'video', data: { url: 'https://x/v.mp4', file: 'v.mp4', file_size: 1024 } },
    { type: 'record', data: { url: 'https://x/r.amr', file: 'r.amr', file_size: 32 } },
  ])
  assert.deepEqual(media.map((item) => item.kind), ['video', 'voice'])
  assert.equal(media[0].url, 'https://x/v.mp4')
  assert.equal(media[0].bytes, 1024)
  assert.equal(media[1].file, 'r.amr')
})

test('media：sniffMediaExt 识别视频 / 语音头，图片优先', () => {
  const mp4 = Buffer.from([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32])
  const avi = Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x41, 0x56, 0x49, 0x20])
  const wav = Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45])
  const webm = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0])
  const flv = Buffer.from('FLV\x01\x05\x00\x00')
  const amr = Buffer.from('#!AMR\n')
  const silk = Buffer.from([0x02, 0x23, 0x21, 0x53, 0x49, 0x4c, 0x4b, 0x5f, 0x56, 0x33])
  const mp3 = Buffer.from('ID3\x04\x00')
  const ogg = Buffer.from('OggS\x00\x02')

  assert.equal(sniffMediaExt(mp4), '.mp4')
  assert.equal(sniffMediaExt(avi), '.avi')
  assert.equal(sniffMediaExt(wav), '.wav')
  assert.equal(sniffMediaExt(webm), '.webm')
  assert.equal(sniffMediaExt(flv), '.flv')
  assert.equal(sniffMediaExt(amr), '.amr')
  assert.equal(sniffMediaExt(silk), '.silk')
  assert.equal(sniffMediaExt(mp3), '.mp3')
  assert.equal(sniffMediaExt(ogg), '.ogg')
  assert.equal(sniffMediaExt(PNG), '.png', '图片仍然优先识别')
  assert.equal(sniffMediaExt(Buffer.from([1, 2, 3])), '')
})

test('media：视频 / 语音落盘按真实内容定扩展名', async (t) => {
  const project = join(tempDir(t), 'proj')
  const mp4 = Buffer.from([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32, 1, 2])
  const amr = Buffer.from('#!AMR\n\x01\x02\x03', 'latin1')

  const video = await attachMedia({
    projectDir: project, groupId: 100, messageId: 21, timeMs: T,
    media: [{ kind: 'video', file: 'clip.bin', url: 'https://example.com/clip.bin' }],
    fetchImpl: async () => okResponse(mp4, { contentType: 'application/octet-stream' }),
  })
  assert.equal(video[0].kind, 'video')
  assert.equal(video[0].status, 'saved')
  assert.equal(video[0].path, '.qq-relay/media/100/2026-10-19/21-0.mp4')

  const voice = await attachMedia({
    projectDir: project, groupId: 100, messageId: 22, timeMs: T,
    media: [{ kind: 'voice', file: 'voice.bin', url: 'https://example.com/voice.bin' }],
    fetchImpl: async () => okResponse(amr, { contentType: 'application/octet-stream' }),
  })
  assert.equal(voice[0].kind, 'voice')
  assert.equal(voice[0].path, '.qq-relay/media/100/2026-10-19/22-0.amr')
})

test('media：normalizeMediaRecords 保留 video / voice', () => {
  const out = normalizeMediaRecords([
    { kind: 'video', status: 'saved', path: '.qq-relay/media/100/v.mp4', bytes: 10 },
    { kind: 'voice', status: 'failed', reason: 'timeout' },
    { kind: 'weird', status: 'saved', path: '.qq-relay/media/100/x.bin' },
  ])
  assert.equal(out[0].kind, 'video')
  assert.equal(out[1].kind, 'voice')
  assert.equal(out[1].status, 'failed')
  assert.equal(out[2].kind, 'image', '未知 kind 回退成 image')
})
