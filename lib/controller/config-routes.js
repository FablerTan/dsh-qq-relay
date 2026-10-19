/**
 * 配置页 HTTP 面（host Controller 层，P1.5）。
 *
 * 三条 exact 路由，全部同源、无鉴权（GUI 默认只绑 loopback；本插件不引入额外
 * 认证策略，与仓库既有插件一致）：
 *
 *   GET  /dsh-qq-relay/api/status     → 连接 / 配置 / 群映射快照
 *   GET  /dsh-qq-relay/api/config     → 同 status（配置视图在 status.config 里）
 *   POST /dsh-qq-relay/api/config     → body: 可编辑字段子集 → 保存覆盖并重连
 *   POST /dsh-qq-relay/api/reconnect  → 用当前配置重建连接
 *   POST /dsh-qq-relay/api/rebind     → body: { groupId } → 删映射并按新项目重建（P4）
 *   POST /dsh-qq-relay/api/cleanup    → body: { days } → 立即清理聊天记录与媒体（v0.13.0）
 *   GET  /dsh-qq-relay/api/messages   → query: groupId & limit → 最近消息（v0.14.0）
 *   POST /dsh-qq-relay/api/mapping/delete → body: { groupId } → 解除单个群的会话绑定（v0.14.0）
 *   POST /dsh-qq-relay/api/mapping/clear  → 解除全部群映射（v0.14.0）
 *   POST /dsh-qq-relay/api/comfy/test → body: { baseUrl?, timeoutMs? } → 探测 ComfyUI（v0.21.0）
 *
 * 这里只做 HTTP 编排（方法分派、请求体解析、状态码映射）；字段校验在
 * `model/settings.js`，连接重建在 `controller/runtime.js`。
 */

import { readRequestBody, sendError, sendOk } from './http.js'

/** 状态快照路径（exact）。 */
export const STATUS_PATH = '/dsh-qq-relay/api/status'
/** 配置读写路径（exact，按方法分派）。 */
export const CONFIG_PATH = '/dsh-qq-relay/api/config'
/** 重连动作路径（exact）。 */
export const RECONNECT_PATH = '/dsh-qq-relay/api/reconnect'
/** 重新绑定群项目路径（exact，P4）。 */
export const REBIND_PATH = '/dsh-qq-relay/api/rebind'
/** 立即清理聊天记录 / 媒体路径（exact，v0.13.0）。 */
export const CLEANUP_PATH = '/dsh-qq-relay/api/cleanup'
/** 最近消息路径（exact，v0.14.0；群号走 query）。 */
export const MESSAGES_PATH = '/dsh-qq-relay/api/messages'
/** 解除单个群映射路径（exact，v0.14.0）。 */
export const MAPPING_DELETE_PATH = '/dsh-qq-relay/api/mapping/delete'
/** 解除全部群映射路径（exact，v0.14.0）。 */
export const MAPPING_CLEAR_PATH = '/dsh-qq-relay/api/mapping/clear'
/** 插件预设读写路径（exact，v0.20.0；GET 返回状态，POST 保存一个预设）。 */
export const PRESETS_PATH = '/dsh-qq-relay/api/presets'
/** 删除插件预设路径（exact，v0.20.0）。 */
export const PRESETS_DELETE_PATH = '/dsh-qq-relay/api/presets/delete'
/** ComfyUI 连接测试路径（exact，v0.21.0；body 可覆盖 baseUrl / timeoutMs）。 */
export const COMFY_TEST_PATH = '/dsh-qq-relay/api/comfy/test'

/** 请求体上限：可编辑字段只有几个短字符串，64 KiB 足够。 */
const DEFAULT_MAX_BODY_BYTES = 64 * 1024

/** 保存/重连失败码 → HTTP 状态码；未知错误按服务端故障处理。 */
const STATUS_OF_ERROR = {
  CONFIG_INVALID: 400,
  CONFIG_EMPTY: 400,
  CONFIG_BAD_JSON: 400,
  RELAY_NOT_STARTED: 409,
  RELAY_NOT_CONFIGURED: 409,
  REBIND_GROUP_INVALID: 400,
  REBIND_NOT_STARTED: 409,
  CLEANUP_DAYS_INVALID: 400,
  CLEANUP_NOT_CONFIGURED: 409,
  MESSAGES_GROUP_INVALID: 400,
  MESSAGES_NOT_CONFIGURED: 409,
  MESSAGES_FAILED: 500,
  MAPPING_GROUP_INVALID: 400,
  MAPPING_NOT_STARTED: 409,
  PRESET_INVALID: 400,
  PRESET_NOT_FOUND: 404,
  PRESET_IN_USE: 409,
  PRESET_LIMIT: 400,
  PRESET_SAVE_FAILED: 500,
  COMFY_INVALID: 400,
  COMFY_TEST_FAILED: 500,
  CONFIG_SAVE_FAILED: 500,
}

function statusOf(result) {
  return STATUS_OF_ERROR[result.code] ?? 500
}

function tooLargeMessage(maxBytes) {
  return '配置请求超过上限（' + String(maxBytes) + ' 字节）；请缩小后重试。'
}

/**
 * 构造配置页路由表。
 *
 * @param options.getStatus - `() => object`：当前状态快照（可含 problems）
 * @param options.saveConfig - `(patch) => { ok, value? , code?, message? }`
 * @param options.reconnect - `() => { ok, value? , code?, message? }`
 * @param options.rebind - `(groupId) => { ok, value? , code?, message? }`（P4 重新绑定群项目）
 * @param options.cleanup - `(days) => { ok, value? , code?, message? }`（v0.13.0 立即清理）
 * @param options.getMessages - `(query) => { ok, value? , code?, message? }`（v0.14.0 最近消息）
 * @param options.deleteMapping - `(groupId) => { ok, value? , code?, message? }`（v0.14.0 解除单群绑定）
 * @param options.clearMappings - `() => { ok, value? , code?, message? }`（v0.14.0 解除全部映射）
 * @param options.testComfy - `(input) => { ok, value? , code?, message? }`（v0.21.0 探测 ComfyUI）
 * @param options.maxBodyBytes - 请求体上限（探针可调小）
 * @returns `WebRoute[]`（`{ kind, path, handler }`），交给组合根注册
 */
export function createConfigRoutes(options = {}) {
  const getStatus = typeof options.getStatus === 'function' ? options.getStatus : () => ({})
  const saveConfig = typeof options.saveConfig === 'function' ? options.saveConfig : null
  const reconnect = typeof options.reconnect === 'function' ? options.reconnect : null
  const rebind = typeof options.rebind === 'function' ? options.rebind : null
  const cleanup = typeof options.cleanup === 'function' ? options.cleanup : null
  const getMessages = typeof options.getMessages === 'function' ? options.getMessages : null
  const deleteMapping = typeof options.deleteMapping === 'function' ? options.deleteMapping : null
  const clearMappings = typeof options.clearMappings === 'function' ? options.clearMappings : null
  const savePreset = typeof options.savePreset === 'function' ? options.savePreset : null
  const deletePreset = typeof options.deletePreset === 'function' ? options.deletePreset : null
  const testComfy = typeof options.testComfy === 'function' ? options.testComfy : null
  const maxBodyBytes = Number.isInteger(options.maxBodyBytes) && options.maxBodyBytes > 0
    ? options.maxBodyBytes
    : DEFAULT_MAX_BODY_BYTES

  /** 把模型层的结果对象写成响应。 */
  function sendResult(res, result, method) {
    if (result !== null && typeof result === 'object' && result.ok === true) {
      sendOk(res, result.value, 200, method === 'HEAD')
      return
    }
    const code = typeof result?.code === 'string' ? result.code : 'CONFIG_FAILED'
    const message = typeof result?.message === 'string' && result.message !== '' ? result.message : '操作失败'
    sendError(res, statusOf(result ?? {}), code, message, method === 'HEAD')
  }

  /** GET /status 与 GET /config 共用：状态快照是唯一事实源。 */
  function handleRead(req, res, method) {
    try {
      sendOk(res, getStatus(), 200, method === 'HEAD')
    } catch (error) {
      sendError(res, 500, 'CONFIG_STATUS_FAILED', '读取状态失败；请稍后重试。', method === 'HEAD')
    }
  }

  /** POST /config：解析 JSON → 交给模型层校验与保存。 */
  async function handleSave(req, res) {
    if (saveConfig === null) {
      sendError(res, 501, 'CONFIG_UNSUPPORTED', '当前实例不支持保存配置。')
      return
    }
    const body = await readRequestBody(req, maxBodyBytes, tooLargeMessage(maxBodyBytes))
    if (body.ok !== true) {
      sendError(res, 413, 'CONFIG_BODY_TOO_LARGE', body.message)
      return
    }
    let payload
    try {
      payload = JSON.parse(body.buffer.toString('utf8'))
    } catch {
      sendError(res, 400, 'CONFIG_BAD_JSON', '请求体不是合法 JSON；请刷新页面后重试。')
      return
    }
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
      sendError(res, 400, 'CONFIG_BAD_JSON', '请求体必须是 JSON 对象；请刷新页面后重试。')
      return
    }
    sendResult(res, saveConfig(payload))
  }

  /** POST /reconnect：用当前配置重建连接。 */
  function handleReconnect(req, res) {
    if (reconnect === null) {
      sendError(res, 501, 'CONFIG_UNSUPPORTED', '当前实例不支持重新连接。')
      return
    }
    sendResult(res, reconnect())
  }

  /**
   * 读 JSON 对象请求体；失败时已写出错误响应并返回 null。
   * 超限 → 413，非对象 / 坏 JSON → 400（与既有路由同一套码）。
   */
  async function readJsonObject(req, res) {
    const body = await readRequestBody(req, maxBodyBytes, tooLargeMessage(maxBodyBytes))
    if (body.ok !== true) {
      sendError(res, 413, 'CONFIG_BODY_TOO_LARGE', body.message)
      return null
    }
    let payload
    try {
      payload = JSON.parse(body.buffer.toString('utf8'))
    } catch {
      sendError(res, 400, 'CONFIG_BAD_JSON', '请求体不是合法 JSON；请刷新页面后重试。')
      return null
    }
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
      sendError(res, 400, 'CONFIG_BAD_JSON', '请求体必须是 JSON 对象；请刷新页面后重试。')
      return null
    }
    return payload
  }

  /** POST /rebind：删掉某群映射并按新的项目目录重建（下次消息重新建会话）。 */
  async function handleRebind(req, res) {
    if (rebind === null) {
      sendError(res, 501, 'CONFIG_UNSUPPORTED', '当前实例不支持重新绑定。')
      return
    }
    const payload = await readJsonObject(req, res)
    if (payload === null) return
    sendResult(res, rebind(payload.groupId))
  }

  /** POST /cleanup：body 里的 days → 立即清理聊天记录与媒体（与自动清理同一实现）。 */
  async function handleCleanup(req, res) {
    if (cleanup === null) {
      sendError(res, 501, 'CONFIG_UNSUPPORTED', '当前实例不支持立即清理。')
      return
    }
    const payload = await readJsonObject(req, res)
    if (payload === null) return
    sendResult(res, cleanup(payload.days))
  }

  /** POST /mapping/delete：解除单个群的会话绑定（下条消息按当前项目重新建会话）。 */
  async function handleMappingDelete(req, res) {
    if (deleteMapping === null) {
      sendError(res, 501, 'CONFIG_UNSUPPORTED', '当前实例不支持解除绑定。')
      return
    }
    const payload = await readJsonObject(req, res)
    if (payload === null) return
    sendResult(res, deleteMapping(payload.groupId))
  }

  /** POST /mapping/clear：解除全部群映射（旧会话保留在 GUI）。 */
  function handleMappingClear(req, res) {
    if (clearMappings === null) {
      sendError(res, 501, 'CONFIG_UNSUPPORTED', '当前实例不支持清空映射。')
      return
    }
    sendResult(res, clearMappings())
  }

  /** POST /presets：保存（新增或覆盖）一个插件预设。 */
  async function handlePresetSave(req, res) {
    if (savePreset === null) {
      sendError(res, 501, 'CONFIG_UNSUPPORTED', '当前实例不支持保存预设。')
      return
    }
    const payload = await readJsonObject(req, res)
    if (payload === null) return
    sendResult(res, savePreset(payload.preset))
  }

  /** POST /comfy/test：探测 ComfyUI（可带未保存的 baseUrl / timeoutMs）。 */
  async function handleComfyTest(req, res) {
    if (testComfy === null) {
      sendError(res, 501, 'CONFIG_UNSUPPORTED', '当前实例不支持 ComfyUI 连接测试。')
      return
    }
    const payload = await readJsonObject(req, res)
    if (payload === null) return
    // testComfy 是异步探测（可能要等到 timeout）：必须 await 后再写响应。
    sendResult(res, await testComfy(payload))
  }

  /** POST /presets/delete：删除一个插件预设（正在使用的会被拒绝）。 */
  async function handlePresetDelete(req, res) {
    if (deletePreset === null) {
      sendError(res, 501, 'CONFIG_UNSUPPORTED', '当前实例不支持删除预设。')
      return
    }
    const payload = await readJsonObject(req, res)
    if (payload === null) return
    sendResult(res, deletePreset(payload.id))
  }

  /** GET /messages?groupId=…&limit=… → 最近 24 小时聊天记录（面板只读视图）。 */
  async function handleMessages(req, res, method) {
    if (getMessages === null) {
      sendError(res, 501, 'CONFIG_UNSUPPORTED', '当前实例不支持读取最近消息。', method === 'HEAD')
      return
    }
    let query = {}
    try {
      const url = new URL(req.url ?? MESSAGES_PATH, 'http://localhost')
      query = {
        groupId: url.searchParams.get('groupId') ?? undefined,
        limit: url.searchParams.get('limit') ?? undefined,
      }
    } catch {}
    sendResult(res, getMessages(query), method)
  }

  return [
    {
      kind: 'exact',
      path: STATUS_PATH,
      handler: (req, res) => {
        const method = req.method ?? 'GET'
        if (method !== 'GET' && method !== 'HEAD') {
          sendError(res, 405, 'CONFIG_METHOD_NOT_ALLOWED', '只支持 GET / HEAD。')
          return
        }
        handleRead(req, res, method)
      },
    },
    {
      kind: 'exact',
      path: CONFIG_PATH,
      handler: (req, res) => {
        const method = req.method ?? 'GET'
        if (method === 'GET' || method === 'HEAD') {
          handleRead(req, res, method)
          return
        }
        if (method === 'POST') {
          // 返回 promise：宿主与探针都能等到响应真正写完。
          return handleSave(req, res).catch(() => {
            try { sendError(res, 500, 'CONFIG_SAVE_FAILED', '保存配置失败；请重试。') } catch {}
          })
        }
        sendError(res, 405, 'CONFIG_METHOD_NOT_ALLOWED', '只支持 GET / HEAD / POST。')
      },
    },
    {
      kind: 'exact',
      path: RECONNECT_PATH,
      handler: (req, res) => {
        if ((req.method ?? 'GET') !== 'POST') {
          sendError(res, 405, 'CONFIG_METHOD_NOT_ALLOWED', '只支持 POST。')
          return
        }
        handleReconnect(req, res)
      },
    },
    {
      kind: 'exact',
      path: REBIND_PATH,
      handler: (req, res) => {
        if ((req.method ?? 'GET') !== 'POST') {
          sendError(res, 405, 'CONFIG_METHOD_NOT_ALLOWED', '只支持 POST。')
          return
        }
        return handleRebind(req, res).catch(() => {
          try { sendError(res, 500, 'CONFIG_FAILED', '重新绑定失败；请重试。') } catch {}
        })
      },
    },
    {
      kind: 'exact',
      path: CLEANUP_PATH,
      handler: (req, res) => {
        if ((req.method ?? 'GET') !== 'POST') {
          sendError(res, 405, 'CONFIG_METHOD_NOT_ALLOWED', '只支持 POST。')
          return
        }
        return handleCleanup(req, res).catch(() => {
          try { sendError(res, 500, 'CLEANUP_FAILED', '立即清理失败；请稍后重试。') } catch {}
        })
      },
    },
    {
      kind: 'exact',
      path: MESSAGES_PATH,
      handler: (req, res) => {
        const method = req.method ?? 'GET'
        if (method !== 'GET' && method !== 'HEAD') {
          sendError(res, 405, 'CONFIG_METHOD_NOT_ALLOWED', '只支持 GET / HEAD。')
          return
        }
        return handleMessages(req, res, method).catch(() => {
          try { sendError(res, 500, 'MESSAGES_FAILED', '读取最近消息失败；请稍后重试。') } catch {}
        })
      },
    },
    {
      kind: 'exact',
      path: MAPPING_DELETE_PATH,
      handler: (req, res) => {
        if ((req.method ?? 'GET') !== 'POST') {
          sendError(res, 405, 'CONFIG_METHOD_NOT_ALLOWED', '只支持 POST。')
          return
        }
        return handleMappingDelete(req, res).catch(() => {
          try { sendError(res, 500, 'MAPPING_DELETE_FAILED', '解除绑定失败；请稍后重试。') } catch {}
        })
      },
    },
    {
      kind: 'exact',
      path: PRESETS_PATH,
      handler: (req, res) => {
        const method = req.method ?? 'GET'
        if (method === 'GET' || method === 'HEAD') {
          handleRead(req, res, method)
          return
        }
        if (method !== 'POST') {
          sendError(res, 405, 'CONFIG_METHOD_NOT_ALLOWED', '只支持 GET / HEAD / POST。')
          return
        }
        return handlePresetSave(req, res).catch(() => {
          try { sendError(res, 500, 'PRESET_SAVE_FAILED', '保存预设失败；请重试。') } catch {}
        })
      },
    },
    {
      kind: 'exact',
      path: COMFY_TEST_PATH,
      handler: (req, res) => {
        if ((req.method ?? 'GET') !== 'POST') {
          sendError(res, 405, 'CONFIG_METHOD_NOT_ALLOWED', '只支持 POST。')
          return
        }
        return handleComfyTest(req, res).catch(() => {
          try { sendError(res, 500, 'COMFY_TEST_FAILED', 'ComfyUI 连接测试失败；请稍后重试。') } catch {}
        })
      },
    },
    {
      kind: 'exact',
      path: PRESETS_DELETE_PATH,
      handler: (req, res) => {
        if ((req.method ?? 'GET') !== 'POST') {
          sendError(res, 405, 'CONFIG_METHOD_NOT_ALLOWED', '只支持 POST。')
          return
        }
        return handlePresetDelete(req, res).catch(() => {
          try { sendError(res, 500, 'PRESET_SAVE_FAILED', '删除预设失败；请重试。') } catch {}
        })
      },
    },
    {
      kind: 'exact',
      path: MAPPING_CLEAR_PATH,
      handler: (req, res) => {
        if ((req.method ?? 'GET') !== 'POST') {
          sendError(res, 405, 'CONFIG_METHOD_NOT_ALLOWED', '只支持 POST。')
          return
        }
        try { handleMappingClear(req, res) } catch (error) {
          try { sendError(res, 500, 'MAPPING_CLEAR_FAILED', '清空映射失败；请稍后重试。') } catch {}
        }
      },
    },
  ]
}
