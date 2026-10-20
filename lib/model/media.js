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
/** 入向群文件上限：20 MiB（与消息媒体一致，避免被大文件拖垮）。 */
export const GROUP_FILE_MAX_BYTES = MEDIA_MAX_BYTES
/** 出向图片上限：10 MiB（base64 走 WS，别太大）。 */
export const OUTBOUND_IMAGE_MAX_BYTES = 10 * 1024 * 1024
/** 出向文件上限：30 MiB（base64 走 WS）。 */
export const OUTBOUND_FILE_MAX_BYTES = 30 * 1024 * 1024
/** 出向视频上限：30 MiB（base64 走 WS；5s 864x480 的 mp4 通常几 MB）。 */
export const OUTBOUND_VIDEO_MAX_BYTES = 30 * 1024 * 1024

const CONTENT_TYPE_EXT = Object.freeze({
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/bmp': '.bmp',
  'image/avif': '.avif',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
  'audio/amr': '.amr',
  'audio/silk': '.silk',
  'audio/mpeg': '.mp3',
  'audio/ogg': '.ogg',
  'audio/wav': '.wav',
})

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.avif'])

/** 扩展名是否是可发送的图片。 */
export function isImageExt(ext) {
  return IMAGE_EXTS.has(String(ext ?? '').toLowerCase())
}

const VIDEO_EXTS = new Set(['.mp4', '.mov', '.webm', '.flv', '.avi', '.mkv'])

/** 扩展名是否是可发送的视频（qq_send 的 videos 参数）。 */
export function isVideoExt(ext) {
  return VIDEO_EXTS.has(String(ext ?? '').toLowerCase())
}

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
    } else if (segment.type === 'video') {
      out.push({
        kind: 'video',
        url: asString(data.url),
        file: asString(data.file),
        bytes: asNumber(data.file_size),
      })
    } else if (segment.type === 'record') {
      out.push({
        kind: 'voice',
        url: asString(data.url),
        file: asString(data.file),
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
    const kind = ['sticker', 'face', 'video', 'voice', 'file'].includes(raw.kind) ? raw.kind : 'image'
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

/**
 * 群文件显示名 → 安全 stem（保留 Unicode 字母 / 数字，去掉路径与危险字符）。
 * 扩展名由 downloadOne 统一追加，所以这里先剥掉原扩展名。
 */
export function sanitizeFileStem(value) {
  const base = String(value ?? '').split(/[\\/]/).pop() ?? ''
  const stem = base.replace(/\.[A-Za-z0-9]{1,8}$/, '')
  const cleaned = stem.replace(/[^\p{L}\p{N}._-]+/gu, '_').replace(/^[._]+/, '').slice(0, 60)
  return cleaned === '' ? 'file' : cleaned
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

/**
 * 按文件头识别媒体扩展名：图片（sniffImageExt）+ 视频 / 语音（v0.12.0）。
 * 入向视频 / 语音的 CQ file 名同样不可靠，落盘时以真实内容为准。
 */
export function sniffMediaExt(buffer) {
  const image = sniffImageExt(buffer)
  if (image !== '') return image
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return ''
  if (buffer.length >= 12 && buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) return '.mp4'
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && buffer.length >= 12) {
    if (buffer[8] === 0x41 && buffer[9] === 0x56 && buffer[10] === 0x49) return '.avi'
    if (buffer[8] === 0x57 && buffer[9] === 0x41 && buffer[10] === 0x56 && buffer[11] === 0x45) return '.wav'
  }
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) return '.webm'
  if (buffer[0] === 0x46 && buffer[1] === 0x4c && buffer[2] === 0x56) return '.flv'
  if (buffer.length >= 5 && buffer[0] === 0x23 && buffer[1] === 0x21 && buffer[2] === 0x41 && buffer[3] === 0x4d && buffer[4] === 0x52) return '.amr'
  if (buffer.length >= 8 && buffer[0] === 0x02 && buffer.slice(1, 8).toString('latin1').startsWith('#!SILK_')) return '.silk'
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) return '.mp3'
  if (buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) return '.ogg'
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
async function downloadOne({ projectDir, groupId, dateKey, messageId, index, url, file, fetchImpl, logger, timeoutMs, baseName = '' }) {
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
  const base = typeof baseName === 'string' && baseName !== '' ? baseName : sanitizeStem(messageId) + '-' + String(index)
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
    ext = sniffMediaExt(buffer) || CONTENT_TYPE_EXT[contentType] || ext || '.bin'
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
    const relativePath = RELAY_DIR_NAME + '/media/' + String(groupId) + '/' + dateKey + '/' + base + ext
    try {
      logger?.info?.('[relay] 媒体已落盘：' + relativePath)
    } catch {}
    return {
      status: 'saved',
      path: relativePath,
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
    const kind = ['sticker', 'face', 'video', 'voice', 'file'].includes(item.kind) ? item.kind : 'image'
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
 * 入向群文件（v0.16.0）：从 `get_group_file_url` 拿到的 URL 下载到
 * `.qq-relay/media/<群号>/<日期>/<fileId>-<安全文件名><扩展名>`。
 *
 * 与消息媒体的差异：群文件没有 message_id、文件名更长、可能是任意类型；
 * 扩展名优先用原文件名，内容识别失败时退化 `.bin`；超过上限不下载，只记 failed。
 *
 * @param options.projectDir - 群项目根（绝对路径）
 * @param options.groupId - 群号
 * @param options.fileId - 群文件事件里的 file.id（NapCat）
 * @param options.fileName - 原始文件名
 * @param options.size - 事件里的大小（字节；0 = 未知）
 * @param options.url - get_group_file_url 返回的下载地址（空串 = 获取失败）
 * @param options.timeMs - 上传时间（决定日期目录）
 * @param options.fetchImpl - fetch 实现（单测注入）
 * @param options.logger - 可选 { info, warn }
 * @returns 归一化后的 media 数组（单条，kind=file）
 */
export async function attachGroupFile({ projectDir, groupId, fileId, fileName, size = 0, url = '', timeMs = Date.now(), fetchImpl = globalThis.fetch, logger = null, timeoutMs = MEDIA_TIMEOUT_MS }) {
  if (typeof projectDir !== 'string' || projectDir === '') throw new Error('attachGroupFile 需要项目目录')
  if (typeof fetchImpl !== 'function') throw new Error('attachGroupFile 需要 fetch')
  ensureRelayDir(projectDir, { logger })
  const dateKey = mediaDateKey(timeMs)
  const name = typeof fileName === 'string' ? fileName : ''
  const meta = { kind: 'file', file: name, bytes: Number.isFinite(size) && size > 0 ? size : 0 }
  if (Number.isFinite(size) && size > GROUP_FILE_MAX_BYTES) {
    return normalizeMediaRecords([{ ...meta, status: 'failed', reason: 'too-large' }])
  }
  if (typeof url !== 'string' || url === '') {
    return normalizeMediaRecords([{ ...meta, status: 'failed', reason: 'invalid-url' }])
  }
  const baseName = sanitizeStem(fileId) + '-' + sanitizeFileStem(name)
  const result = await downloadOne({
    projectDir,
    groupId,
    dateKey,
    messageId: String(fileId ?? ''),
    index: 0,
    baseName,
    url,
    file: name,
    fetchImpl,
    logger,
    timeoutMs,
  })
  if (result.status !== 'saved') {
    try { logger?.warn?.('[relay] 群文件下载失败（' + String(result.reason) + '）：' + name) } catch {}
  }
  return normalizeMediaRecords([{ ...meta, ...result }])
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
