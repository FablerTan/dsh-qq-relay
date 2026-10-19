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
} from '../lib/model/media.js'
import { RELAY_DIR_NAME } from '../lib/model/project.js'

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
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

test('media：扩展名来自 content-type（URL 无扩展名时）', async (t) => {
  const dir = tempDir(t)
  const project = join(dir, 'proj')
  const fetchImpl = async () => okResponse(PNG, { contentType: 'image/webp' })
  const records = await attachMedia({
    projectDir: project, groupId: 100, messageId: 7, timeMs: T,
    media: [{ kind: 'sticker', url: 'https://example.com/download' }],
    fetchImpl,
  })
  assert.equal(records[0].path, '.qq-relay/media/100/2026-10-19/7-0.webp')
  assert.equal(records[0].kind, 'sticker')
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
