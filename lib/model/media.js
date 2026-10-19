/**
 * 入向媒体落盘（v0.9.0）：把 CQ 图片 / 贴纸下载到群项目的 .qq-relay/media/ 下，
 * 并把相对路径写进聊天记录，供 agent 直接 read。
 *
 * 布局：<project>/.qq-relay/media/<群号>/<日期>/<messageId>-<序号>.<ext>
 * 纪律：下载失败不阻断消息流，只记 status=failed；只接受 http(s)；有超时与大小上限。
 */

import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { RELAY_DIR_NAME, ensureRelayDir } from './project.js'

/** 单文件上限：20 MiB（避免被大文件拖垮）。 */
export const MEDIA_MAX_BYTES = 20 * 1024 * 1024
/** 单个下载超时：10 秒。 */
export const MEDIA_TIMEOUT_MS = 10 * 1000
/** 单条消息最多处理的媒体数（QQ 单条最多 9 图 + 余量）。 */
export const MEDIA_MAX_PER_MESSAGE = 10

const CONTENT_TYPE_EXT = Object.freeze({
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/bmp': '.bmp',
  'image/avif': '.avif',
})

function asString(value) {
  return typeof value === 'string' ? value : ''
}

function asNumber(value) {
  return Number.isFinite(value) ? value : 0
}

/** 本地日期键 YYYY-MM-DD（与 chat-log 的按天分文件一致）。 */
export function mediaDateKey(ms) {
  const date = new Date(ms)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + d
}

/** 把 NapCat 写进 CQ 码里的 HTML 实体还原（&#44; &amp; 等）。 */
export function decodeEntities(text) {
  return String(text ?? '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

/** 从 raw_message 的 face CQ 码里取 faceText（/失眠、[汪汪] 等），失败返回空串。 */
function faceTextFromRaw(rawMessage, faceId) {
  if (typeof rawMessage !== 'string' || rawMessage === '' || faceId === '') return ''
  const escaped = faceId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp('\\[CQ:face,id=' + escaped + ',raw=\\{([^}]*)\\}\\]')
  const match = pattern.exec(rawMessage)
  if (match === null) return ''
  try {
    const parsed = JSON.parse('{' + decodeEntities(match[1]) + '}')
    return typeof parsed?.faceText === 'string' ? parsed.faceText : ''
  } catch {
    return ''
  }
}

/**
 * 从 OneBot 消息段里提取媒体计划（还没有下载）。
 *
 * @param segments - 内部事件的 segments（{ type, data } 数组）
 * @param rawMessage - OneBot raw_message（用于补 faceText）
 * @returns 最多 MEDIA_MAX_PER_MESSAGE 个 { kind, url, file, summary, faceId, text, bytes }
 */
export function planMedia(segments, rawMessage = '') {
  const out = []
  if (!Array.isArray(segments)) return out
  for (const segment of segments) {
    if (segment === null || typeof segment !== 'object') continue
    const data = segment.data !== null && typeof segment.data === 'object' ? segment.data : {}
    if (segment.type === 'image' || segment.type === 'mface') {
      const kind = segment.type === 'mface' || String(data.sub_type) === '1' ? 'sticker' : 'image'
      out.push({
        kind,
        url: asString(data.url),
        file: asString(data.file),
        summary: asString(data.summary),
        bytes: asNumber(data.file_size),
      })
    } else if (segment.type === 'face') {
      const faceId = asString(data.id)
      out.push({
        kind: 'face',
        faceId,
        text: asString(data.faceText) || faceTextFromRaw(rawMessage, faceId),
      })
    }
    if (out.length >= MEDIA_MAX_PER_MESSAGE) break
  }
  return out
}

/** 把聊天记录 / prompt 里的媒体条目归一化（容忍脏数据）。 */
export function normalizeMediaRecords(list) {
  if (!Array.isArray(list)) return []
  const out = []
  for (const raw of list) {
    if (raw === null || typeof raw !== 'object') continue
    const kind = raw.kind === 'sticker' || raw.kind === 'face' ? raw.kind : 'image'
    const status = raw.status === 'saved' ? 'saved' : (raw.status === 'failed' ? 'failed' : 'metadata')
    const entry = { kind, status }
    if (typeof raw.path === 'string' && raw.path !== '') entry.path = raw.path
    if (typeof raw.text === 'string' && raw.text !== '') entry.text = raw.text
    if (typeof raw.faceId === 'string' && raw.faceId !== '') entry.faceId = raw.faceId
    if (typeof raw.file === 'string' && raw.file !== '') entry.file = raw.file
    if (typeof raw.summary === 'string' && raw.summary !== '') entry.summary = raw.summary
    if (typeof raw.contentType === 'string' && raw.contentType !== '') entry.contentType = raw.contentType
    if (typeof raw.reason === 'string' && raw.reason !== '') entry.reason = raw.reason
    if (Number.isFinite(raw.bytes) && raw.bytes > 0) entry.bytes = raw.bytes
    out.push(entry)
    if (out.length >= MEDIA_MAX_PER_MESSAGE) break
  }
  return out
}

/** 相对项目根的媒体路径（写进聊天记录 / prompt，agent 可直接 read）。 */
export function mediaRelativePath({ groupId, dateKey, messageId, index, ext }) {
  const name = sanitizeStem(messageId) + '-' + String(index) + (ext === '' ? '.bin' : ext)
  return RELAY_DIR_NAME + '/media/' + String(groupId) + '/' + dateKey + '/' + name
}

/** 文件名 stem 清洗：只留安全字符。 */
export function sanitizeStem(value) {
  const text = String(value ?? '').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 48)
  return text === '' ? 'msg' : text
}

/** 按文件头识别图片真实类型（优先于 CQ file 名 / content-type）。 */
export function sniffImageExt(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return ''
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return '.jpg'
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return '.png'
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return '.gif'
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) return '.bmp'
  if (buffer.length >= 12 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46
    && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return '.webp'
  return ''
}

function extFromName(name) {
  const match = /\.([A-Za-z0-9]{1,5})$/.exec(String(name ?? ''))
  return match === null ? '' : '.' + match[1].toLowerCase()
}

function extFromPath(pathname) {
  const base = String(pathname ?? '').split('/').pop() ?? ''
  return extFromName(base)
}

function headerOf(response, name) {
  if (typeof response?.headers?.get !== 'function') return ''
  try {
    const value = response.headers.get(name)
    return value === null || value === undefined ? '' : String(value)
  } catch {
    return ''
  }
}

/** 下载单个媒体；返回 { status, path?, bytes?, contentType?, reason? }。 */
async function downloadOne({ projectDir, groupId, dateKey, messageId, index, url, file, fetchImpl, logger, timeoutMs }) {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return { status: 'failed', reason: 'invalid-url' }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { status: 'failed', reason: 'unsupported-protocol' }
  }
  let ext = extFromName(file) || extFromPath(parsed.pathname)
  if (ext === '.bin') ext = ''
  const dir = join(projectDir, RELAY_DIR_NAME, 'media', String(groupId), dateKey)
  const base = sanitizeStem(messageId) + '-' + String(index)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchImpl(url, { signal: controller.signal })
    if (response === null || typeof response !== 'object') {
      return { status: 'failed', reason: 'bad-response' }
    }
    if (response.ok !== true) {
      return { status: 'failed', reason: 'http-' + String(response.status ?? 0) }
    }
    const contentType = headerOf(response, 'content-type').split(';')[0].trim().toLowerCase()
    const lengthHeader = Number(headerOf(response, 'content-length'))
    if (Number.isFinite(lengthHeader) && lengthHeader > MEDIA_MAX_BYTES) {
      return { status: 'failed', reason: 'too-large' }
    }
    if (typeof response.arrayBuffer !== 'function') {
      return { status: 'failed', reason: 'bad-response' }
    }
    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length === 0) return { status: 'failed', reason: 'empty' }
    if (buffer.length > MEDIA_MAX_BYTES) return { status: 'failed', reason: 'too-large' }
    // 扩展名以真实内容为准：CQ file / URL 后缀可能和实际格式不符（QQ 图片常见）。
    ext = sniffImageExt(buffer) || CONTENT_TYPE_EXT[contentType] || ext || '.bin'
    mkdirSync(dir, { recursive: true })
    const target = join(dir, base + ext)
    const tmp = join(dir, '.' + base + '.' + String(process.pid) + '.tmp')
    writeFileSync(tmp, buffer)
    try {
      renameSync(tmp, target)
    } catch (error) {
      try { unlinkSync(tmp) } catch {}
      throw error
    }
    try {
      logger?.info?.('[relay] 媒体已落盘：' + mediaRelativePath({ groupId, dateKey, messageId, index, ext }))
    } catch {}
    return {
      status: 'saved',
      path: mediaRelativePath({ groupId, dateKey, messageId, index, ext }),
      bytes: buffer.length,
      contentType,
    }
  } catch (error) {
    if (controller.signal.aborted || error?.name === 'AbortError') {
      return { status: 'failed', reason: 'timeout' }
    }
    return { status: 'failed', reason: 'network' }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 下载一条消息里的全部媒体，返回可直接写聊天记录的归一化数组。
 *
 * @param options.projectDir - 群项目根（绝对路径）
 * @param options.groupId - 群号
 * @param options.messageId - QQ message_id
 * @param options.timeMs - 消息时间（决定日期目录）
 * @param options.media - planMedia 的结果
 * @param options.fetchImpl - fetch 实现（单测注入）
 * @param options.logger - 可选 { info, warn }
 */
export async function attachMedia({ projectDir, groupId, messageId, timeMs = Date.now(), media = [], fetchImpl = globalThis.fetch, logger = null, timeoutMs = MEDIA_TIMEOUT_MS }) {
  if (typeof projectDir !== 'string' || projectDir === '') throw new Error('attachMedia 需要项目目录')
  if (typeof fetchImpl !== 'function') throw new Error('attachMedia 需要 fetch')
  ensureRelayDir(projectDir, { logger })
  const dateKey = mediaDateKey(timeMs)
  const entries = []
  let downloadIndex = 0
  for (const item of (Array.isArray(media) ? media : []).slice(0, MEDIA_MAX_PER_MESSAGE)) {
    if (item === null || typeof item !== 'object') continue
    const kind = item.kind === 'sticker' ? 'sticker' : (item.kind === 'face' ? 'face' : 'image')
    if (kind === 'face') {
      entries.push({ kind, status: 'metadata', faceId: asString(item.faceId), text: asString(item.text) })
      continue
    }
    const url = asString(item.url)
    if (url === '') {
      entries.push({ kind, status: 'metadata', file: asString(item.file), summary: asString(item.summary) })
      continue
    }
    const index = downloadIndex
    downloadIndex += 1
    const result = await downloadOne({
      projectDir, groupId, dateKey, messageId, index, url,
      file: asString(item.file), fetchImpl, logger, timeoutMs,
    })
    if (result.status !== 'saved') {
      try { logger?.warn?.('[relay] 媒体下载失败（' + String(result.reason) + '）：' + url.slice(0, 80)) } catch {}
    }
    entries.push({ kind, ...result })
  }
  return normalizeMediaRecords(entries)
}

/**
 * 按日期目录清理过期媒体（与 chatRetentionDays 联动）。
 *
 * @param options.groupIds - 要清理的群号
 * @param options.projectDirFor - (groupId) => 项目目录（空串跳过）
 * @param options.nowMs - 当前时间
 * @param options.days - 保留天数（<= 0 时直接返回 0）
 * @returns 删除的日期目录数
 */
export function pruneMedia({ groupIds = [], projectDirFor, nowMs = Date.now(), days = 0 }) {
  if (!(days > 0) || typeof projectDirFor !== 'function') return 0
  const cutoff = mediaDateKey(nowMs - days * 24 * 60 * 60 * 1000)
  let removed = 0
  for (const groupId of groupIds) {
    let projectDir = ''
    try { projectDir = projectDirFor(groupId) } catch { projectDir = '' }
    if (typeof projectDir !== 'string' || projectDir === '') continue
    const groupDir = join(projectDir, RELAY_DIR_NAME, 'media', String(groupId))
    if (!existsSync(groupDir)) continue
    for (const entry of readdirSync(groupDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || !/^\d{4}-\d{2}-\d{2}$/.test(entry.name)) continue
      if (entry.name >= cutoff) continue
      try {
        rmSync(join(groupDir, entry.name), { recursive: true, force: true })
        removed += 1
      } catch {}
    }
  }
  return removed
}
