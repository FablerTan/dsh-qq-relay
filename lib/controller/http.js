/**
 * 配置页 HTTP 面的共用件（host Controller 层）。
 *
 * 约定与仓库既有插件一致：统一 JSON 信封
 *   `{ ok: true, value }` / `{ ok: false, error: { code, message } }`
 * 加 `cache-control: no-store`（配置与连接状态都是活的），以及带体量上限的
 * 请求体读取。这里不含任何业务：字段校验留在 `model/settings.js`。
 */

/** 成功/失败响应一律禁缓存。 */
export const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
}

/**
 * 写出 JSON 响应。
 *
 * @param res - 响应对象
 * @param status - HTTP 状态码
 * @param payload - 信封对象
 * @param bodyless - 只发头（HEAD）
 */
export function sendJson(res, status, payload, bodyless = false) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8')
  res.writeHead(status, { ...JSON_HEADERS, 'content-length': String(body.length) })
  if (bodyless) res.end()
  else res.end(body)
}

/** 成功信封。 */
export function sendOk(res, value, status = 200, bodyless = false) {
  sendJson(res, status, { ok: true, value }, bodyless)
}

/** 失败信封；`message` 必须面向用户、不含宿主路径。 */
export function sendError(res, status, code, message, bodyless = false) {
  sendJson(res, status, { ok: false, error: { code, message } }, bodyless)
}

/**
 * 带体量上限地读取请求体。
 *
 * @param req - 请求对象（可异步迭代）
 * @param maxBytes - 上限字节数
 * @param tooLargeMessage - 超限时的可读文案
 * @returns `{ ok: true, buffer }` 或 `{ ok: false, message }`
 */
export async function readRequestBody(req, maxBytes, tooLargeMessage) {
  const message = tooLargeMessage ?? ('请求体超过上限（' + String(maxBytes) + ' 字节）；请缩小后重试。')
  const declared = Number(req.headers === undefined ? Number.NaN : req.headers['content-length'])
  if (Number.isFinite(declared) && declared > maxBytes) {
    if (typeof req.destroy === 'function') req.destroy()
    return { ok: false, message }
  }
  const chunks = []
  let size = 0
  try {
    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      size += buffer.length
      if (size > maxBytes) {
        if (typeof req.destroy === 'function') req.destroy()
        return { ok: false, message }
      }
      chunks.push(buffer)
    }
  } catch {
    return { ok: false, message: '读取请求体失败；请重试。' }
  }
  return { ok: true, buffer: Buffer.concat(chunks) }
}
