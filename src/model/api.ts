/**
 * 配置页 ⇄ host 的 HTTP 面（client Model 层）。
 *
 * 三条同源相对路由（host 侧注册在 `lib/controller/config-routes.js`）：
 *   GET  /dsh-qq-relay/api/status
 *   POST /dsh-qq-relay/api/config
 *   POST /dsh-qq-relay/api/reconnect
 *
 * 统一信封 `{ ok: true, value }` / `{ ok: false, error: { code, message } }`。
 * `fetch` 由组合根注入：ViewModel / View 不碰全局，桩实现即可覆盖成功与失败两条路。
 */

/** 闸门里可在设置页编辑的三个参数（时长单位：毫秒）。 */
export interface RelayGateConfigView {
  debounceMs: number
  fastMinReplyIntervalMs: number
  jevThreshold: number
}

/** 闸门运行状态（只读提示用）。 */
export interface RelayGateStatusView {
  enabled: boolean
  classifier: string | null
  model: string
  threshold: number
  slowTimer: number
}

/** host 侧的配置视图（token 永不出现，只有是否已配置与来源）。 */
export interface RelayConfigView {
  wsUrl: string
  selfId: number
  groups: number[]
  workspace: string
  /** 群号 → 项目目录（设置页可编辑）。 */
  groupWorkspaces: Record<string, string>
  /** 聊天记录保留天数；0 = 永不自动删除。 */
  chatRetentionDays: number
  /** 闸门参数（设置页可编辑）。 */
  gate: RelayGateConfigView
  /** host 是否已经返回 gate 配置（旧版 host 为 false，页面应提示重启）。 */
  gateSupported: boolean
  sessionTitle: string
  replyChunkSize: number
  commandPrefixes: string[]
  accessTokenConfigured: boolean
  accessTokenSource: 'profile' | 'settings'
}

/** 群 → DSH 会话映射（只读）。 */
export interface RelayMappingView {
  groupId: number
  sessionId: string
  title: string
  workspacePath: string
  createdAt: number
}

/** 状态快照：连接 / 配置 / 单实例锁 / 群映射。 */
export interface RelayStatusView {
  plugin: string
  started: boolean
  connected: boolean
  login: { userId: number; nickname: string } | null
  problems: string[]
  lock: { pid: number; startedAt: number; host?: string } | null
  config: RelayConfigView
  /** 闸门运行状态；配置无效时为 null。 */
  gate: RelayGateStatusView | null
  mappings: RelayMappingView[]
}

/** 立即清理的结果（v0.13.0）：删除计数 + 清理后的状态快照。 */
export interface RelayCleanupView {
  days: number
  chat: number
  media: number
  at: number
}

/** 立即清理接口的 value：计数 + 最新状态（页面据此刷新状态行）。 */
export interface RelayCleanupValue {
  cleanup: RelayCleanupView
  status: RelayStatusView
}

/** 保存时提交的可编辑字段（未改的字段不出现）。 */
export interface RelayConfigPatch {
  wsUrl?: string
  accessToken?: string
  selfId?: number
  groups?: number[]
  workspace?: string
  groupWorkspaces?: Record<string, string>
  chatRetentionDays?: number
  /** 只提交设置页可改的子项；时长用 45s / 10m 这类文本，host 校验。 */
  gate?: {
    debounce?: string
    fastMinReplyInterval?: string
    jevThreshold?: number
  }
  sessionTitle?: string
  replyChunkSize?: number
  commandPrefixes?: string[]
}

/** 失败信封里的错误。 */
export interface RelayApiError {
  code: string
  message: string
}

/** 统一的成功 / 失败结果。 */
export type RelayApiResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: RelayApiError }

/** 路由常量（与 host 侧保持同名同值）。 */
export const STATUS_PATH = '/dsh-qq-relay/api/status'
export const CONFIG_PATH = '/dsh-qq-relay/api/config'
export const RECONNECT_PATH = '/dsh-qq-relay/api/reconnect'
/** 重新绑定群项目（P4）：删映射并按当前项目目录重建。 */
export const REBIND_PATH = '/dsh-qq-relay/api/rebind'
/** 立即清理聊天记录 / 媒体（v0.13.0）。 */
export const CLEANUP_PATH = '/dsh-qq-relay/api/cleanup'

/** 配置页用到的能力面（组合根注入 `fetch` 后得到实例）。 */
export interface RelaySettingsApi {
  getStatus(): Promise<RelayApiResult<RelayStatusView>>
  saveConfig(patch: RelayConfigPatch): Promise<RelayApiResult<RelayStatusView>>
  reconnect(): Promise<RelayApiResult<RelayStatusView>>
  rebind(groupId: number): Promise<RelayApiResult<RelayStatusView>>
  cleanup(days: number): Promise<RelayApiResult<RelayCleanupValue>>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * 把未知 JSON 读成状态快照。
 * 只做形状兜底（页面不能因为 host 版本漂移白屏），字段级默认值给全。
 */
function asStatus(value: unknown): RelayStatusView | null {
  if (!isRecord(value)) return null
  const config = isRecord(value.config) ? value.config : {}
  const login = isRecord(value.login) ? value.login : null
  const lock = isRecord(value.lock) ? value.lock : null
  const mappings = Array.isArray(value.mappings) ? value.mappings.filter(isRecord) : []
  return {
    plugin: typeof value.plugin === 'string' ? value.plugin : 'dsh-qq-relay',
    started: value.started === true,
    connected: value.connected === true,
    login: login === null
      ? null
      : {
          userId: typeof login.userId === 'number' ? login.userId : 0,
          nickname: typeof login.nickname === 'string' ? login.nickname : '',
        },
    problems: Array.isArray(value.problems)
      ? value.problems.filter((problem): problem is string => typeof problem === 'string')
      : [],
    lock: lock === null
      ? null
      : {
          pid: typeof lock.pid === 'number' ? lock.pid : 0,
          startedAt: typeof lock.startedAt === 'number' ? lock.startedAt : 0,
          host: typeof lock.host === 'string' ? lock.host : undefined,
        },
    config: {
      wsUrl: typeof config.wsUrl === 'string' ? config.wsUrl : '',
      selfId: typeof config.selfId === 'number' ? config.selfId : 0,
      groups: Array.isArray(config.groups)
        ? config.groups.filter((groupId): groupId is number => typeof groupId === 'number')
        : [],
      workspace: typeof config.workspace === 'string' ? config.workspace : '',
      groupWorkspaces: isRecord(config.groupWorkspaces)
        ? Object.fromEntries(
            Object.entries(config.groupWorkspaces)
              .filter(([key, value]) => /^\d+$/u.test(key) && typeof value === 'string' && value !== '')
              .map(([key, value]) => [key, value as string]),
          )
        : {},
      chatRetentionDays: typeof config.chatRetentionDays === 'number' ? config.chatRetentionDays : 0,
      gate: isRecord(config.gate)
        ? {
            debounceMs: typeof config.gate.debounceMs === 'number' ? config.gate.debounceMs : 5000,
            fastMinReplyIntervalMs: typeof config.gate.fastMinReplyIntervalMs === 'number'
              ? config.gate.fastMinReplyIntervalMs
              : 45000,
            jevThreshold: typeof config.gate.jevThreshold === 'number' ? config.gate.jevThreshold : 0.7,
          }
        : { debounceMs: 5000, fastMinReplyIntervalMs: 45000, jevThreshold: 0.7 },
      gateSupported: isRecord(config.gate),
      sessionTitle: typeof config.sessionTitle === 'string' ? config.sessionTitle : '',
      replyChunkSize: typeof config.replyChunkSize === 'number' ? config.replyChunkSize : 0,
      commandPrefixes: Array.isArray(config.commandPrefixes)
        ? config.commandPrefixes.filter((prefix): prefix is string => typeof prefix === 'string')
        : [],
      accessTokenConfigured: config.accessTokenConfigured === true,
      accessTokenSource: config.accessTokenSource === 'settings' ? 'settings' : 'profile',
    },
    gate: isRecord(value.gate)
      ? {
          enabled: value.gate.enabled === true,
          classifier: typeof value.gate.classifier === 'string' ? value.gate.classifier : null,
          model: typeof value.gate.model === 'string' ? value.gate.model : '',
          threshold: typeof value.gate.threshold === 'number' ? value.gate.threshold : 0,
          slowTimer: typeof value.gate.slowTimer === 'number' ? value.gate.slowTimer : 0,
        }
      : null,
    mappings: mappings.map((entry) => ({
      groupId: typeof entry.groupId === 'number' ? entry.groupId : 0,
      sessionId: typeof entry.sessionId === 'string' ? entry.sessionId : '',
      title: typeof entry.title === 'string' ? entry.title : '',
      workspacePath: typeof entry.workspacePath === 'string' ? entry.workspacePath : '',
      createdAt: typeof entry.createdAt === 'number' ? entry.createdAt : 0,
    })),
  }
}

/** 底层请求：只负责 fetch + 统一信封，`value` 保持 unknown 交给上层解释。 */
async function requestEnvelope(
  fetchImpl: typeof fetch,
  path: string,
  init?: RequestInit,
): Promise<RelayApiResult<unknown>> {
  let response: Response
  try {
    response = await fetchImpl(path, { cache: 'no-store', ...init })
  } catch (error) {
    const detail = error instanceof Error && error.message !== '' ? '：' + error.message : ''
    return { ok: false, error: { code: 'NETWORK', message: '连不上 host' + detail } }
  }
  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }
  if (isRecord(payload) && payload.ok === true) {
    return { ok: true, value: payload.value }
  }
  const error = isRecord(payload) && isRecord(payload.error) ? payload.error : null
  return {
    ok: false,
    error: {
      code: error !== null && typeof error.code === 'string' ? error.code : 'HTTP_' + String(response.status),
      message: error !== null && typeof error.message === 'string' && error.message !== ''
        ? error.message
        : '请求失败（HTTP ' + String(response.status) + '）。',
    },
  }
}

/** host 返回的形状无法识别时的统一失败结果。 */
function badPayload<T>(): RelayApiResult<T> {
  return { ok: false, error: { code: 'BAD_PAYLOAD', message: 'host 返回了无法识别的数据。' } }
}

/**
 * 创建配置页 API。
 *
 * @param options.fetch - 注入的 fetch 实现（浏览器用 `globalThis.fetch`）
 */
export function createRelaySettingsApi(options: { fetch: typeof fetch }): RelaySettingsApi {
  const fetchImpl = options.fetch

  /** 所有返回「最新状态」的接口共用：成功时把 value 解释成状态快照。 */
  async function requestStatus(path: string, init?: RequestInit): Promise<RelayApiResult<RelayStatusView>> {
    const result = await requestEnvelope(fetchImpl, path, init)
    if (!result.ok) return result
    const status = asStatus(result.value)
    return status !== null ? { ok: true, value: status } : badPayload<RelayStatusView>()
  }

  const jsonPost = (body: unknown): RequestInit => ({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  return {
    getStatus: () => requestStatus(STATUS_PATH),
    saveConfig: (patch) => requestStatus(CONFIG_PATH, jsonPost(patch)),
    reconnect: () => requestStatus(RECONNECT_PATH, { method: 'POST' }),
    rebind: (groupId) => requestStatus(REBIND_PATH, jsonPost({ groupId })),
    async cleanup(days) {
      const result = await requestEnvelope(fetchImpl, CLEANUP_PATH, jsonPost({ days }))
      if (!result.ok) return result
      const value = result.value
      const status = isRecord(value) ? asStatus(value.status) : null
      const cleanup = isRecord(value) && isRecord(value.cleanup) ? value.cleanup : null
      if (status === null || cleanup === null) return badPayload<RelayCleanupValue>()
      return {
        ok: true,
        value: {
          cleanup: {
            days: typeof cleanup.days === 'number' ? cleanup.days : days,
            chat: typeof cleanup.chat === 'number' ? cleanup.chat : 0,
            media: typeof cleanup.media === 'number' ? cleanup.media : 0,
            at: typeof cleanup.at === 'number' ? cleanup.at : 0,
          },
          status,
        },
      }
    },
  }
}
