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
  mappings: RelayMappingView[]
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

/** 配置页用到的能力面（组合根注入 `fetch` 后得到实例）。 */
export interface RelaySettingsApi {
  getStatus(): Promise<RelayApiResult<RelayStatusView>>
  saveConfig(patch: RelayConfigPatch): Promise<RelayApiResult<RelayStatusView>>
  reconnect(): Promise<RelayApiResult<RelayStatusView>>
  rebind(groupId: number): Promise<RelayApiResult<RelayStatusView>>
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
      sessionTitle: typeof config.sessionTitle === 'string' ? config.sessionTitle : '',
      replyChunkSize: typeof config.replyChunkSize === 'number' ? config.replyChunkSize : 0,
      commandPrefixes: Array.isArray(config.commandPrefixes)
        ? config.commandPrefixes.filter((prefix): prefix is string => typeof prefix === 'string')
        : [],
      accessTokenConfigured: config.accessTokenConfigured === true,
      accessTokenSource: config.accessTokenSource === 'settings' ? 'settings' : 'profile',
    },
    mappings: mappings.map((entry) => ({
      groupId: typeof entry.groupId === 'number' ? entry.groupId : 0,
      sessionId: typeof entry.sessionId === 'string' ? entry.sessionId : '',
      title: typeof entry.title === 'string' ? entry.title : '',
      workspacePath: typeof entry.workspacePath === 'string' ? entry.workspacePath : '',
      createdAt: typeof entry.createdAt === 'number' ? entry.createdAt : 0,
    })),
  }
}

/**
 * 创建配置页 API。
 *
 * @param options.fetch - 注入的 fetch 实现（浏览器用 `globalThis.fetch`）
 */
export function createRelaySettingsApi(options: { fetch: typeof fetch }): RelaySettingsApi {
  const fetchImpl = options.fetch

  async function request(path: string, init?: RequestInit): Promise<RelayApiResult<RelayStatusView>> {
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
      const status = asStatus(payload.value)
      if (status !== null) return { ok: true, value: status }
      return { ok: false, error: { code: 'BAD_PAYLOAD', message: 'host 返回了无法识别的状态数据。' } }
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

  return {
    getStatus: () => request(STATUS_PATH),
    saveConfig: (patch) => request(CONFIG_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    }),
    reconnect: () => request(RECONNECT_PATH, { method: 'POST' }),
    rebind: (groupId) => request(REBIND_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ groupId }),
    }),
  }
}
