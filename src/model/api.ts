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

/** 闸门里可在设置页编辑的参数（时长单位：毫秒）。 */
export interface RelayGateConfigView {
  debounceMs: number
  fastMinReplyIntervalMs: number
  jevThreshold: number
  /** jev 决策模型 id（v0.25.6；默认 typesafe/jev-1.14，页面可改）。 */
  model: string
  /** jev 分类器地址（v0.25.6；默认 OpenRouter Decisions API，页面可改，host 只接受 https）。 */
  jevEndpoint: string
  /** jev API key 是否已配置（v0.24.0；host **永不回显 key 本身**）。 */
  jevApiKeyConfigured: boolean
  /** key 来源：config = 设置页保存，env = 环境变量，none = 未配置。 */
  jevApiKeySource: 'config' | 'env' | 'none'
  /** 兜底环境变量名（gate.jevApiKeyEnv，默认 OPENROUTER_API_KEY）。 */
  jevApiKeyEnv: string
}

/** 每群闸门状态（v0.14.0 面板；来自 state 文件，只读）。 */
export interface RelayGateGroupStatusView {
  groupId: number
  pending: number
  lastBotSpeakAt: number
  lastReplyAt: number
  lastUserMessageAt: number
  cooldownUntil: number
  evaluating: boolean
  dshBusy: boolean
}

/** 闸门运行状态（只读提示用）。 */
export interface RelayGateStatusView {
  enabled: boolean
  classifier: string | null
  model: string
  threshold: number
  slowTimer: number
  /** 实时计数（v0.14.0；旧 host 缺字段时为 0）。 */
  pendingMessages: number
  pendingGroups: number
  timers: number
  queue: number
  sendQueue: number
  groups: RelayGateGroupStatusView[]
}

/** 代答（v0.18.0）：@ 名单里的人且 TA 最近没说话时，以机器人身份代 TA 回应。 */
export interface RelayProxyReplyConfigView {
  enabled: boolean
  /** 目标名单：QQ 号或群名片 / 昵称。 */
  targets: string[]
  /** 沉默窗口（毫秒）；0 = 不检查沉默（总是代答）。 */
  silenceWindowMs: number
}

/** DSH agent preset 名册里的一个预设（v0.19.0）。 */
export interface RelayAgentPresetView {
  id: string
  name: string
  description: string
  /** 非空 = 该预设激活失败，不能用于新会话。 */
  broken: string
}

/** 轻量人设（v0.19.0）：每轮 prompt 前注入的文本，不依赖 profile 改动。 */
export interface RelayPersonaConfigView {
  enabled: boolean
  text: string
}

/** ComfyUI 画图配置（v0.21.0）：设置页「画图」二级页可编辑。 */
export interface RelayComfyConfigView {
  /** 是否启用画图能力（关闭时探测与 skill 注册都停止）。 */
  enabled: boolean
  /** ComfyUI HTTP 地址（无鉴权，只应指向可信网络）。 */
  baseUrl: string
  /** 探测 / 请求超时（毫秒）。 */
  timeoutMs: number
  /** 连接成功后是否把画图 skill 注册给 DSH。 */
  skillEnabled: boolean
}

/** ComfyUI 队列长度（运行中 / 等待中）。 */
export interface RelayComfyQueueView {
  running: number
  pending: number
}

/** 一个画图 / 视频 skill 的动态注册状态（v0.22.0 起 status.comfy.skills 数组的元素）。 */
export interface RelayComfySkillStateView {
  name: string
  loaded: boolean
  error: string
}

/**
 * ComfyUI 运行状态（v0.22.0 起含 `skills` 数组：comfy-image / comfy-video）。
 * 旧 host 缺字段时按「未连接 / 不支持」兜底，页面不白屏。
 */
export interface RelayComfyStatusView {
  enabled: boolean
  baseUrl: string
  timeoutMs: number
  skillEnabled: boolean
  /** false = 宿主没有 skills 服务，画图 skill 无法加载。 */
  supported: boolean
  reachable: boolean
  checking: boolean
  checkedAt: number
  error: string
  version: string
  device: string
  queue: RelayComfyQueueView
  /** 连接成功后 host 尝试注册的 skill（每项带自己的加载状态与错误）；坏数据回落空数组。 */
  skills: RelayComfySkillStateView[]
}

/** 一次连通性探测的结果（`POST /api/comfy/test` 的 probe）。 */
export interface RelayComfyProbeView {
  target: string
  reachable: boolean
  version: string
  device: string
  queue: RelayComfyQueueView
  error: string
  checkedAt: number
  latencyMs: number
}

/** 「测试连接」接口的 value：探测结果 + 最新状态快照。 */
export interface RelayComfyTestValue {
  probe: RelayComfyProbeView
  status: RelayStatusView
}

/** 环境配置（v0.23.0）：NapCat Docker 环境目录 + WebUI token（只写不读）。 */
export interface RelayEnvConfigView {
  enabled: boolean
  dir: string
  webuiTokenConfigured: boolean
}

/** 环境页的一个白名单动作（host 下发的动作目录）。 */
export interface RelayEnvActionView {
  id: string
  title: string
  kind: string
  confirm: boolean
  description: string
}

/** 环境检查的一步（ok / warn / error / skip）。 */
export interface RelayEnvStepView {
  id: string
  title: string
  status: string
  detail: string
  evidence: string[]
  actions: string[]
}

/** 环境步骤汇总计数。 */
export interface RelayEnvSummaryView {
  ok: number
  warn: number
  error: number
  skip: number
}

/** 一条动作日志。 */
export interface RelayEnvLogEntryView {
  seq: number
  at: number
  level: string
  text: string
}

/** 一键修复计划（v0.25.0）：页面据此提示「将执行什么」并在需要时弹一次确认。 */
export interface RelayEnvFixPlanView {
  /** 本次会依次执行的动作 id（按执行顺序）。 */
  sequence: string[]
  /** 与 sequence 对齐的动作标题（确认框 / 提示行用）。 */
  titles: string[]
  /** 计划里有安装 / 启动引擎 / 覆盖 compose → 点「一键修复」要先确认。 */
  needsConfirm: boolean
  /** 第一个还没通过的步骤（全部通过时为 null）。 */
  next: { id: string; title: string; status: string; detail: string } | null
}

/** 环境页状态（GET /api/env）：步骤 + 动作目录 + 日志尾部。 */
export interface RelayEnvStatusView {
  supported: boolean
  platform: string
  enabled: boolean
  dir: string
  webuiTokenConfigured: boolean
  checking: boolean
  checkedAt: number
  running: { action: string; startedAt: number } | null
  summary: RelayEnvSummaryView
  steps: RelayEnvStepView[]
  /** 一键修复计划（旧 host 没有这个字段 → 空计划）。 */
  fixPlan: RelayEnvFixPlanView
  actions: RelayEnvActionView[]
  log: { cursor: number; entries: RelayEnvLogEntryView[] }
}

/** 环境动作的 value：最新状态 + 日志游标；open-webui 会带 url。 */
export interface RelayEnvActionValue {
  action: string
  status: RelayEnvStatusView
  logCursor: number
  accepted?: boolean
  url?: string
}

/** host 侧 agent preset 名册（服务缺失时 supported=false，页面隐藏选择器）。 */
export interface RelayAgentPresetsView {
  supported: boolean
  items: RelayAgentPresetView[]
  /** 当前配置的 preset 不在名册里（已删除 / 未声明），下次建会话会退回默认。 */
  missing: boolean
}

/** 插件管理的 QQ 预设（v0.20.0）：persona + 可选模型 / 思考层级 / 权限。 */
export interface RelayPresetView {
  id: string
  name: string
  description: string
  persona: string
  model: {
    provider: string
    model: string
    /** 空串 = 跟随模型默认。 */
    reasoningEffort: string
  }
  /** 空串 = 不指定权限预设。 */
  permissionPreset: string
  order: number
}

/** 模型目录里的一个思考层级。 */
export interface RelayReasoningEffortView {
  id: string
  name: string
  description: string
}

/** 模型目录里的一个模型。 */
export interface RelayModelView {
  id: string
  name: string
  description: string
  /** 空数组 = 该模型没有可选思考层级。 */
  efforts: RelayReasoningEffortView[]
  defaultEffort: string
}

/** 模型目录里的一个 provider。 */
export interface RelayModelProviderView {
  id: string
  name: string
  models: RelayModelView[]
}

/** 宿主模型目录（页面里选 provider / model / 思考层级）。 */
export interface RelayModelCatalogView {
  groups: RelayModelProviderView[]
  default: { provider: string; model: string; reasoningEffort: string }
}

/** 权限预设目录（沙箱 + 审批的组合）。 */
export interface RelayPermissionOptionView {
  value: string
  name: string
  description: string
}

export interface RelayPermissionCatalogView {
  options: RelayPermissionOptionView[]
  defaultPreset: string
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
  /** 代答配置（v0.18.0；旧 host 缺字段时按默认关闭兜底）。 */
  proxyReply: RelayProxyReplyConfigView
  /** 会话使用的 DSH agent preset id（v0.19.0）；空串 = 宿主默认预设。 */
  agentPreset: string
  /** 轻量人设（v0.19.0）；默认关闭。 */
  persona: RelayPersonaConfigView
  /** ComfyUI 画图配置（v0.21.0）；旧 host 缺字段时按默认值兜底。 */
  comfy: RelayComfyConfigView
  /** host 是否已经返回 comfy 配置（旧版 host 为 false，页面应提示重启）。 */
  comfySupported: boolean
  /** 环境配置（v0.23.0）；旧 host 缺字段时按默认值兜底。 */
  environment: RelayEnvConfigView
  /** host 是否已经返回 environment 段（旧版 host 为 false，页面应提示重启）。 */
  environmentSupported: boolean
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

/** workspace 挂载失败的会话（v0.21.1）：会在 DSH 侧栏显示为「未分组」。 */
export interface RelayWorkspaceAttachIssueView {
  groupId: number
  sessionId: string
  error: string
  at: number
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
  /** DSH agent preset 名册（v0.19.0）；旧 host 缺字段时按「不支持」兜底。 */
  agentPresets: RelayAgentPresetsView
  /** 插件管理的预设（v0.20.0）。 */
  presets: RelayPresetView[]
  /** 动态注册状态：supported=false 时预设只在 presets.json 里、DSH 不可选。 */
  presetService: { supported: boolean; registered: string[] }
  /** 模型目录（v0.20.0；可能是 null：宿主未就绪 / 无可用 provider）。 */
  modelCatalog: RelayModelCatalogView | null
  /** 权限目录（v0.20.0；可能是 null：宿主没有 permission-presets 行）。 */
  permissionCatalog: RelayPermissionCatalogView | null
  /** ComfyUI 画图状态（v0.21.0）；旧 host 缺字段时按「未连接 / 不支持」兜底。 */
  comfy: RelayComfyStatusView
  mappings: RelayMappingView[]
  /** workspace 挂载健康（v0.21.1；旧 host 缺字段时为空数组）。 */
  workspace: { attachIssues: RelayWorkspaceAttachIssueView[] }
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

/** 最近消息（v0.14.0 面板）：聊天记录里的一条只读消息。 */
export interface RelayPanelMessageMediaView {
  kind: string
  status: string
  path: string
}

export interface RelayPanelMessageView {
  messageId: string
  time: number
  name: string
  text: string
  mentionsSelf: boolean
  replyToId: string
  media: RelayPanelMessageMediaView[]
}

/** `GET /messages` 的 value。 */
export interface RelayMessagesValue {
  groupId: number
  limit: number
  windowMs: number
  messages: RelayPanelMessageView[]
}

/** 解除单个群绑定的 value。 */
export interface RelayMappingDeleteValue {
  mapping: { groupId: number; removed: boolean }
  status: RelayStatusView
}

/** 清空全部映射的 value。 */
export interface RelayMappingsClearValue {
  mappings: { cleared: number }
  status: RelayStatusView
}

/** 保存 / 删除预设的 value（最新预设列表 + 状态）。 */
export interface RelayPresetsValue {
  presets: RelayPresetView[]
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
    /** v0.25.6：jev 模型 id / 分类器地址（可读可改）。 */
    model?: string
    jevEndpoint?: string
    /** v0.24.0：只写不读；留空 / 缺省表示不修改。 */
    jevApiKey?: string
  }
  /** 代答（v0.18.0）：只提交这三个子项；沉默窗口用 10m 这类文本，host 校验。 */
  proxyReply?: {
    enabled?: boolean
    targets?: string[]
    silenceWindow?: string
  }
  /** 会话使用的 DSH agent preset id（v0.19.0）；空串 = 宿主默认预设。 */
  agentPreset?: string
  /** 轻量人设（v0.19.0）：开关 + 文本一起提交。 */
  persona?: {
    enabled?: boolean
    text?: string
  }
  /** ComfyUI 画图（v0.21.0）：整块提交；timeoutMs 用毫秒数字，baseUrl 由 host 校验。 */
  comfy?: {
    enabled?: boolean
    baseUrl?: string
    timeoutMs?: number
    skillEnabled?: boolean
  }
  /** 环境配置（v0.23.0）：webuiToken 留空表示不修改（只写不读）。 */
  environment?: {
    enabled?: boolean
    dir?: string
    webuiToken?: string
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
/** 最近消息（v0.14.0）：群号走 query，例如 ?groupId=100&limit=20。 */
export const MESSAGES_PATH = '/dsh-qq-relay/api/messages'
/** 解除单个群映射（v0.14.0）。 */
export const MAPPING_DELETE_PATH = '/dsh-qq-relay/api/mapping/delete'
/** 解除全部群映射（v0.14.0）。 */
export const MAPPING_CLEAR_PATH = '/dsh-qq-relay/api/mapping/clear'
/** 插件预设保存 / 读取（v0.20.0）。 */
export const PRESETS_PATH = '/dsh-qq-relay/api/presets'
/** 插件预设删除（v0.20.0）。 */
export const PRESETS_DELETE_PATH = '/dsh-qq-relay/api/presets/delete'
/** ComfyUI 连通性测试（v0.21.0）；body 可选 { baseUrl?, timeoutMs? }。 */
export const COMFY_TEST_PATH = '/dsh-qq-relay/api/comfy/test'
/** 环境页状态（v0.23.0）。 */
export const ENV_PATH = '/dsh-qq-relay/api/env'
/** 环境页动作（v0.23.0）；body { action, confirm? }。 */
export const ENV_ACTION_PATH = '/dsh-qq-relay/api/env/action'

/** 配置页用到的能力面（组合根注入 `fetch` 后得到实例）。 */
export interface RelaySettingsApi {
  getStatus(): Promise<RelayApiResult<RelayStatusView>>
  saveConfig(patch: RelayConfigPatch): Promise<RelayApiResult<RelayStatusView>>
  reconnect(): Promise<RelayApiResult<RelayStatusView>>
  rebind(groupId: number): Promise<RelayApiResult<RelayStatusView>>
  cleanup(days: number): Promise<RelayApiResult<RelayCleanupValue>>
  messages(groupId: number, limit?: number): Promise<RelayApiResult<RelayMessagesValue>>
  deleteMapping(groupId: number): Promise<RelayApiResult<RelayMappingDeleteValue>>
  clearMappings(): Promise<RelayApiResult<RelayMappingsClearValue>>
  savePreset(preset: RelayPresetView): Promise<RelayApiResult<RelayPresetsValue>>
  deletePreset(id: string): Promise<RelayApiResult<RelayPresetsValue>>
  /** ComfyUI 连通性测试（v0.21.0）：只探测，不改配置 / skill 注册。 */
  testComfy(input?: { baseUrl?: string; timeoutMs?: number }): Promise<RelayApiResult<RelayComfyTestValue>>
  /** 环境页状态（v0.23.0）：步骤 + 动作目录 + 日志尾部。 */
  getEnv(): Promise<RelayApiResult<RelayEnvStatusView>>
  /** 环境页动作（v0.23.0）：安装类必须带 confirm:true。 */
  envAction(input: { action: string; confirm?: boolean }): Promise<RelayApiResult<RelayEnvActionValue>>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** 每群闸门状态数组兜底（旧 host 没有这个字段 → 空数组）。 */
function asGateGroups(value: unknown): RelayGateGroupStatusView[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord).map((entry) => ({
    groupId: typeof entry.groupId === 'number' ? entry.groupId : 0,
    pending: typeof entry.pending === 'number' ? entry.pending : 0,
    lastBotSpeakAt: typeof entry.lastBotSpeakAt === 'number' ? entry.lastBotSpeakAt : 0,
    lastReplyAt: typeof entry.lastReplyAt === 'number' ? entry.lastReplyAt : 0,
    lastUserMessageAt: typeof entry.lastUserMessageAt === 'number' ? entry.lastUserMessageAt : 0,
    cooldownUntil: typeof entry.cooldownUntil === 'number' ? entry.cooldownUntil : 0,
    evaluating: entry.evaluating === true,
    dshBusy: entry.dshBusy === true,
  }))
}

/** 最近消息数组兜底。 */
function asPanelMessages(value: unknown): RelayPanelMessageView[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord).map((entry) => ({
    messageId: typeof entry.messageId === 'string' ? entry.messageId : '',
    time: typeof entry.time === 'number' ? entry.time : 0,
    name: typeof entry.name === 'string' ? entry.name : '',
    text: typeof entry.text === 'string' ? entry.text : '',
    mentionsSelf: entry.mentionsSelf === true,
    replyToId: typeof entry.replyToId === 'string' ? entry.replyToId : '',
    media: Array.isArray(entry.media)
      ? entry.media.filter(isRecord).map((media) => ({
          kind: typeof media.kind === 'string' ? media.kind : '',
          status: typeof media.status === 'string' ? media.status : '',
          path: typeof media.path === 'string' ? media.path : '',
        }))
      : [],
  }))
}

/** workspace 挂载失败数组兜底（旧 host 没有这个字段 → 空数组）。 */
function asWorkspaceAttachIssues(value: unknown): RelayWorkspaceAttachIssueView[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord).map((entry) => ({
    groupId: typeof entry.groupId === 'number' ? entry.groupId : 0,
    sessionId: typeof entry.sessionId === 'string' ? entry.sessionId : '',
    error: typeof entry.error === 'string' ? entry.error : '',
    at: typeof entry.at === 'number' ? entry.at : 0,
  })).filter((issue) => issue.sessionId !== '')
}

/** 预设数组兜底。 */
function asPresets(value: unknown): RelayPresetView[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord).map((entry) => {
    const model = isRecord(entry.model) ? entry.model : {}
    return {
      id: typeof entry.id === 'string' ? entry.id : '',
      name: typeof entry.name === 'string' ? entry.name : '',
      description: typeof entry.description === 'string' ? entry.description : '',
      persona: typeof entry.persona === 'string' ? entry.persona : '',
      model: {
        provider: typeof model.provider === 'string' ? model.provider : '',
        model: typeof model.model === 'string' ? model.model : '',
        reasoningEffort: typeof model.reasoningEffort === 'string' ? model.reasoningEffort : '',
      },
      permissionPreset: typeof entry.permissionPreset === 'string' ? entry.permissionPreset : '',
      order: typeof entry.order === 'number' ? entry.order : 100,
    }
  }).filter((preset) => preset.id !== '')
}

/** 模型目录兜底（null = 宿主未提供）。 */
function asModelCatalog(value: unknown): RelayModelCatalogView | null {
  if (!isRecord(value) || !Array.isArray(value.groups)) return null
  const groups = value.groups.filter(isRecord).map((group) => ({
    id: typeof group.id === 'string' ? group.id : '',
    name: typeof group.name === 'string' ? group.name : '',
    models: Array.isArray(group.models)
      ? group.models.filter(isRecord).map((model) => {
          const reasoning = isRecord(model.reasoning) ? model.reasoning : null
          return {
            id: typeof model.id === 'string' ? model.id : '',
            name: typeof model.name === 'string' ? model.name : '',
            description: typeof model.description === 'string' ? model.description : '',
            efforts: reasoning !== null && Array.isArray(reasoning.efforts)
              ? reasoning.efforts.filter(isRecord).map((effort) => ({
                  id: typeof effort.id === 'string' ? effort.id : '',
                  name: typeof effort.name === 'string' ? effort.name : '',
                  description: typeof effort.description === 'string' ? effort.description : '',
                }))
              : [],
            defaultEffort: reasoning !== null && typeof reasoning.defaultEffort === 'string'
              ? reasoning.defaultEffort
              : '',
          }
        })
      : [],
  }))
  const def = isRecord(value.default) ? value.default : {}
  return {
    groups,
    default: {
      provider: typeof def.provider === 'string' ? def.provider : '',
      model: typeof def.model === 'string' ? def.model : '',
      reasoningEffort: typeof def.reasoningEffort === 'string' ? def.reasoningEffort : '',
    },
  }
}

/** 权限目录兜底。 */
function asPermissionCatalog(value: unknown): RelayPermissionCatalogView | null {
  if (!isRecord(value) || !Array.isArray(value.options)) return null
  return {
    options: value.options.filter(isRecord).map((option) => ({
      value: typeof option.value === 'string' ? option.value : '',
      name: typeof option.name === 'string' ? option.name : '',
      description: typeof option.description === 'string' ? option.description : '',
    })).filter((option) => option.value !== ''),
    defaultPreset: typeof value.defaultPreset === 'string' ? value.defaultPreset : '',
  }
}

/** agent preset 名册数组兜底（旧 host / 服务缺失 → 空数组）。 */
function asAgentPresetItems(value: unknown): RelayAgentPresetView[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord).map((entry) => ({
    id: typeof entry.id === 'string' ? entry.id : '',
    name: typeof entry.name === 'string' ? entry.name : '',
    description: typeof entry.description === 'string' ? entry.description : '',
    broken: typeof entry.broken === 'string' ? entry.broken : '',
  })).filter((entry) => entry.id !== '')
}

/** ComfyUI 队列兜底。 */
function asComfyQueue(value: unknown): RelayComfyQueueView {
  if (!isRecord(value)) return { running: 0, pending: 0 }
  return {
    running: typeof value.running === 'number' ? value.running : 0,
    pending: typeof value.pending === 'number' ? value.pending : 0,
  }
}

/**
 * ComfyUI 配置兜底（旧 host 没有 comfy 段 → 默认关闭）。
 * 默认值与 host 侧 `DEFAULT_COMFY` / `maskComfyConfig` 保持一致。
 */
function asComfyConfig(value: unknown): RelayComfyConfigView {
  if (!isRecord(value)) {
    return {
      enabled: false,
      baseUrl: 'http://192.168.1.10:8188',
      timeoutMs: 30000,
      skillEnabled: true,
    }
  }
  return {
    enabled: value.enabled === true,
    baseUrl: typeof value.baseUrl === 'string' && value.baseUrl !== ''
      ? value.baseUrl
      : 'http://192.168.1.10:8188',
    timeoutMs: typeof value.timeoutMs === 'number' ? value.timeoutMs : 30000,
    skillEnabled: value.skillEnabled !== false,
  }
}

/**
 * skill 列表兜底：优先读新字段 `skills`（数组），回退旧 host 的单数 `skill`
 * （生成单元素数组）；坏数据一律回落空数组。
 */
function asComfySkills(value: Record<string, unknown>): RelayComfySkillStateView[] {
  if (Array.isArray(value.skills)) {
    return value.skills.filter(isRecord).map((entry) => ({
      name: typeof entry.name === 'string' ? entry.name : '',
      loaded: entry.loaded === true,
      error: typeof entry.error === 'string' ? entry.error : '',
    })).filter((entry) => entry.name !== '')
  }
  // 旧 host（v0.21.x）只有 comfy.skill 单数对象。
  const legacy = isRecord(value.skill) ? value.skill : null
  if (legacy === null) return []
  const name = typeof legacy.name === 'string' ? legacy.name : ''
  if (name === '') return []
  return [{
    name,
    loaded: legacy.loaded === true,
    error: typeof legacy.error === 'string' ? legacy.error : '',
  }]
}

/** ComfyUI 运行状态兜底（旧 host 缺字段 → 全部关闭，页面不白屏）。 */
function asComfyStatus(value: unknown): RelayComfyStatusView {
  if (!isRecord(value)) {
    return {
      enabled: false,
      baseUrl: '',
      timeoutMs: 30000,
      skillEnabled: false,
      supported: false,
      reachable: false,
      checking: false,
      checkedAt: 0,
      error: '',
      version: '',
      device: '',
      queue: { running: 0, pending: 0 },
      skills: [],
    }
  }
  return {
    enabled: value.enabled === true,
    baseUrl: typeof value.baseUrl === 'string' ? value.baseUrl : '',
    timeoutMs: typeof value.timeoutMs === 'number' ? value.timeoutMs : 30000,
    skillEnabled: value.skillEnabled !== false,
    supported: value.supported === true,
    reachable: value.reachable === true,
    checking: value.checking === true,
    checkedAt: typeof value.checkedAt === 'number' ? value.checkedAt : 0,
    error: typeof value.error === 'string' ? value.error : '',
    version: typeof value.version === 'string' ? value.version : '',
    device: typeof value.device === 'string' ? value.device : '',
    queue: asComfyQueue(value.queue),
    skills: asComfySkills(value),
  }
}

/** 「测试连接」的 probe 兜底（host 返回脏数据时用最新状态拼一个可渲染结果）。 */
function asComfyProbe(value: unknown, fallback: RelayComfyStatusView): RelayComfyProbeView {
  if (!isRecord(value)) {
    return {
      target: fallback.baseUrl,
      reachable: fallback.reachable,
      version: fallback.version,
      device: fallback.device,
      queue: asComfyQueue(fallback.queue),
      error: fallback.error,
      checkedAt: fallback.checkedAt,
      latencyMs: 0,
    }
  }
  return {
    target: typeof value.target === 'string' ? value.target : fallback.baseUrl,
    reachable: value.reachable === true,
    version: typeof value.version === 'string' ? value.version : '',
    device: typeof value.device === 'string' ? value.device : '',
    queue: asComfyQueue(value.queue),
    error: typeof value.error === 'string' ? value.error : '',
    checkedAt: typeof value.checkedAt === 'number' ? value.checkedAt : 0,
    latencyMs: typeof value.latencyMs === 'number' ? value.latencyMs : 0,
  }
}

/** 环境配置兜底（旧 host 没有 environment 段 → 默认开启 + 默认目录）。 */
function asEnvConfig(value: unknown): RelayEnvConfigView {
  if (!isRecord(value)) {
    return { enabled: true, dir: '~/napcat-docker', webuiTokenConfigured: false }
  }
  return {
    enabled: value.enabled !== false,
    dir: typeof value.dir === 'string' && value.dir !== '' ? value.dir : '~/napcat-docker',
    webuiTokenConfigured: value.webuiTokenConfigured === true,
  }
}

/** 环境步骤数组兜底。 */
function asEnvSteps(value: unknown): RelayEnvStepView[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord).map((entry) => ({
    id: typeof entry.id === 'string' ? entry.id : '',
    title: typeof entry.title === 'string' ? entry.title : '',
    status: typeof entry.status === 'string' ? entry.status : 'skip',
    detail: typeof entry.detail === 'string' ? entry.detail : '',
    evidence: Array.isArray(entry.evidence)
      ? entry.evidence.filter((line): line is string => typeof line === 'string')
      : [],
    actions: Array.isArray(entry.actions)
      ? entry.actions.filter((action): action is string => typeof action === 'string')
      : [],
  })).filter((entry) => entry.id !== '')
}

/** 环境动作目录兜底。 */
function asEnvActions(value: unknown): RelayEnvActionView[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord).map((entry) => ({
    id: typeof entry.id === 'string' ? entry.id : '',
    title: typeof entry.title === 'string' ? entry.title : '',
    kind: typeof entry.kind === 'string' ? entry.kind : 'none',
    confirm: entry.confirm === true,
    description: typeof entry.description === 'string' ? entry.description : '',
  })).filter((entry) => entry.id !== '')
}

/** 环境动作日志兜底。 */
function asEnvLogEntries(value: unknown): RelayEnvLogEntryView[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord).map((entry) => ({
    seq: typeof entry.seq === 'number' ? entry.seq : 0,
    at: typeof entry.at === 'number' ? entry.at : 0,
    level: typeof entry.level === 'string' ? entry.level : 'info',
    text: typeof entry.text === 'string' ? entry.text : '',
  }))
}

/** 一键修复计划兜底（旧 host 没有 fixPlan → 空计划，页面不显示提示）。 */
function asEnvFixPlan(value: unknown): RelayEnvFixPlanView {
  const source = isRecord(value) ? value : {}
  const sequence = Array.isArray(source.sequence)
    ? source.sequence.filter((id): id is string => typeof id === 'string')
    : []
  const titles = Array.isArray(source.titles)
    ? source.titles.filter((title): title is string => typeof title === 'string')
    : []
  const nextRaw = isRecord(source.next) ? source.next : null
  return {
    sequence,
    titles: titles.length === sequence.length ? titles : sequence,
    needsConfirm: source.needsConfirm === true,
    next: nextRaw === null
      ? null
      : {
          id: typeof nextRaw.id === 'string' ? nextRaw.id : '',
          title: typeof nextRaw.title === 'string' ? nextRaw.title : '',
          status: typeof nextRaw.status === 'string' ? nextRaw.status : '',
          detail: typeof nextRaw.detail === 'string' ? nextRaw.detail : '',
        },
  }
}

/** 环境页状态兜底（旧 host / 不支持时返回 null，页面显示「不支持」）。 */
function asEnvStatus(value: unknown): RelayEnvStatusView | null {
  if (!isRecord(value)) return null
  const summary = isRecord(value.summary) ? value.summary : {}
  const running = isRecord(value.running) ? value.running : null
  const log = isRecord(value.log) ? value.log : {}
  return {
    supported: value.supported === true,
    platform: typeof value.platform === 'string' ? value.platform : '',
    enabled: value.enabled !== false,
    dir: typeof value.dir === 'string' ? value.dir : '',
    webuiTokenConfigured: value.webuiTokenConfigured === true,
    checking: value.checking === true,
    checkedAt: typeof value.checkedAt === 'number' ? value.checkedAt : 0,
    running: running === null
      ? null
      : {
          action: typeof running.action === 'string' ? running.action : '',
          startedAt: typeof running.startedAt === 'number' ? running.startedAt : 0,
        },
    summary: {
      ok: typeof summary.ok === 'number' ? summary.ok : 0,
      warn: typeof summary.warn === 'number' ? summary.warn : 0,
      error: typeof summary.error === 'number' ? summary.error : 0,
      skip: typeof summary.skip === 'number' ? summary.skip : 0,
    },
    steps: asEnvSteps(value.steps),
    fixPlan: asEnvFixPlan(value.fixPlan),
    actions: asEnvActions(value.actions),
    log: {
      cursor: typeof log.cursor === 'number' ? log.cursor : 0,
      entries: asEnvLogEntries(log.entries),
    },
  }
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
            model: typeof config.gate.model === 'string' && config.gate.model !== ''
              ? config.gate.model
              : 'typesafe/jev-1.14',
            jevEndpoint: typeof config.gate.jevEndpoint === 'string' && config.gate.jevEndpoint !== ''
              ? config.gate.jevEndpoint
              : 'https://openrouter.ai/api/alpha/decisions',
            jevApiKeyConfigured: config.gate.jevApiKeyConfigured === true,
            jevApiKeySource: config.gate.jevApiKeySource === 'env'
              ? 'env'
              : (config.gate.jevApiKeySource === 'config' || config.gate.jevApiKeyConfigured === true ? 'config' : 'none'),
            jevApiKeyEnv: typeof config.gate.jevApiKeyEnv === 'string' && config.gate.jevApiKeyEnv !== ''
              ? config.gate.jevApiKeyEnv
              : 'OPENROUTER_API_KEY',
          }
        : {
            debounceMs: 5000,
            fastMinReplyIntervalMs: 45000,
            jevThreshold: 0.7,
            model: 'typesafe/jev-1.14',
            jevEndpoint: 'https://openrouter.ai/api/alpha/decisions',
            jevApiKeyConfigured: false,
            jevApiKeySource: 'none',
            jevApiKeyEnv: 'OPENROUTER_API_KEY',
          },
      gateSupported: isRecord(config.gate),
      proxyReply: isRecord(config.proxyReply)
        ? {
            enabled: config.proxyReply.enabled === true,
            targets: Array.isArray(config.proxyReply.targets)
              ? config.proxyReply.targets.filter((target): target is string => typeof target === 'string' && target !== '')
              : [],
            silenceWindowMs: typeof config.proxyReply.silenceWindowMs === 'number'
              ? config.proxyReply.silenceWindowMs
              : 10 * 60 * 1000,
          }
        : { enabled: false, targets: [], silenceWindowMs: 10 * 60 * 1000 },
      agentPreset: typeof config.agentPreset === 'string' ? config.agentPreset : '',
      persona: isRecord(config.persona)
        ? {
            enabled: config.persona.enabled === true,
            text: typeof config.persona.text === 'string' ? config.persona.text : '',
          }
        : { enabled: false, text: '' },
      comfy: asComfyConfig(config.comfy),
      comfySupported: config.comfySupported === true,
      environment: asEnvConfig(config.environment),
      environmentSupported: isRecord(config.environment),
      sessionTitle: typeof config.sessionTitle === 'string' ? config.sessionTitle : '',
      replyChunkSize: typeof config.replyChunkSize === 'number' ? config.replyChunkSize : 0,
      commandPrefixes: Array.isArray(config.commandPrefixes)
        ? config.commandPrefixes.filter((prefix): prefix is string => typeof prefix === 'string')
        : [],
      accessTokenConfigured: config.accessTokenConfigured === true,
      accessTokenSource: config.accessTokenSource === 'settings' ? 'settings' : 'profile',
    },
    agentPresets: isRecord(value.agentPresets)
      ? {
          supported: value.agentPresets.supported === true,
          items: asAgentPresetItems(value.agentPresets.items),
          missing: value.agentPresets.missing === true,
        }
      : { supported: false, items: [], missing: false },
    presets: asPresets(value.presets),
    presetService: isRecord(value.presetService)
      ? {
          supported: value.presetService.supported === true,
          registered: Array.isArray(value.presetService.registered)
            ? value.presetService.registered.filter((id): id is string => typeof id === 'string')
            : [],
        }
      : { supported: false, registered: [] },
    modelCatalog: asModelCatalog(value.modelCatalog),
    permissionCatalog: asPermissionCatalog(value.permissionCatalog),
    comfy: asComfyStatus(value.comfy),
    gate: isRecord(value.gate)
      ? {
          enabled: value.gate.enabled === true,
          classifier: typeof value.gate.classifier === 'string' ? value.gate.classifier : null,
          model: typeof value.gate.model === 'string' ? value.gate.model : '',
          threshold: typeof value.gate.threshold === 'number' ? value.gate.threshold : 0,
          slowTimer: typeof value.gate.slowTimer === 'number' ? value.gate.slowTimer : 0,
          pendingMessages: typeof value.gate.pendingMessages === 'number' ? value.gate.pendingMessages : 0,
          pendingGroups: typeof value.gate.pendingGroups === 'number' ? value.gate.pendingGroups : 0,
          timers: typeof value.gate.timers === 'number' ? value.gate.timers : 0,
          queue: typeof value.gate.queue === 'number' ? value.gate.queue : 0,
          sendQueue: typeof value.gate.sendQueue === 'number' ? value.gate.sendQueue : 0,
          groups: asGateGroups(value.gate.groups),
        }
      : null,
    workspace: {
      attachIssues: isRecord(value.workspace) ? asWorkspaceAttachIssues(value.workspace.attachIssues) : [],
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
    async messages(groupId, limit) {
      const params = new URLSearchParams({ groupId: String(groupId) })
      if (typeof limit === 'number' && Number.isFinite(limit)) params.set('limit', String(limit))
      const result = await requestEnvelope(fetchImpl, MESSAGES_PATH + '?' + params.toString())
      if (!result.ok) return result
      if (!isRecord(result.value)) return badPayload<RelayMessagesValue>()
      return {
        ok: true,
        value: {
          groupId: typeof result.value.groupId === 'number' ? result.value.groupId : groupId,
          limit: typeof result.value.limit === 'number' ? result.value.limit : 0,
          windowMs: typeof result.value.windowMs === 'number' ? result.value.windowMs : 0,
          messages: asPanelMessages(result.value.messages),
        },
      }
    },
    async savePreset(preset) {
      const result = await requestEnvelope(fetchImpl, PRESETS_PATH, jsonPost({ preset }))
      if (!result.ok) return result
      const value = result.value
      const status = isRecord(value) ? asStatus(value.status) : null
      if (status === null || !isRecord(value)) return badPayload<RelayPresetsValue>()
      return { ok: true, value: { presets: asPresets(value.presets), status } }
    },
    async deletePreset(id) {
      const result = await requestEnvelope(fetchImpl, PRESETS_DELETE_PATH, jsonPost({ id }))
      if (!result.ok) return result
      const value = result.value
      const status = isRecord(value) ? asStatus(value.status) : null
      if (status === null || !isRecord(value)) return badPayload<RelayPresetsValue>()
      return { ok: true, value: { presets: asPresets(value.presets), status } }
    },
    async getEnv() {
      const result = await requestEnvelope(fetchImpl, ENV_PATH)
      if (!result.ok) return result
      const env = asEnvStatus(result.value)
      return env !== null ? { ok: true, value: env } : badPayload<RelayEnvStatusView>()
    },
    async envAction(input) {
      const body: { action: string; confirm?: boolean } = { action: input.action }
      if (input.confirm === true) body.confirm = true
      const result = await requestEnvelope(fetchImpl, ENV_ACTION_PATH, jsonPost(body))
      if (!result.ok) return result
      const value = result.value
      const status = isRecord(value) ? asEnvStatus(value.status) : null
      if (status === null || !isRecord(value)) return badPayload<RelayEnvActionValue>()
      return {
        ok: true,
        value: {
          action: typeof value.action === 'string' ? value.action : input.action,
          status,
          logCursor: typeof value.logCursor === 'number' ? value.logCursor : 0,
          accepted: value.accepted === true,
          url: typeof value.url === 'string' ? value.url : undefined,
        },
      }
    },
    async testComfy(input) {
      const body: { baseUrl?: string; timeoutMs?: number } = {}
      if (typeof input?.baseUrl === 'string' && input.baseUrl.trim() !== '') body.baseUrl = input.baseUrl.trim()
      if (typeof input?.timeoutMs === 'number' && Number.isFinite(input.timeoutMs)) body.timeoutMs = input.timeoutMs
      const result = await requestEnvelope(fetchImpl, COMFY_TEST_PATH, jsonPost(body))
      if (!result.ok) return result
      const value = result.value
      const status = isRecord(value) ? asStatus(value.status) : null
      if (status === null || !isRecord(value)) return badPayload<RelayComfyTestValue>()
      return {
        ok: true,
        value: { probe: asComfyProbe(value.probe, status.comfy), status },
      }
    },
    async deleteMapping(groupId) {
      const result = await requestEnvelope(fetchImpl, MAPPING_DELETE_PATH, jsonPost({ groupId }))
      if (!result.ok) return result
      const value = result.value
      const status = isRecord(value) ? asStatus(value.status) : null
      const mapping = isRecord(value) && isRecord(value.mapping) ? value.mapping : null
      if (status === null || mapping === null) return badPayload<RelayMappingDeleteValue>()
      return {
        ok: true,
        value: {
          mapping: {
            groupId: typeof mapping.groupId === 'number' ? mapping.groupId : groupId,
            removed: mapping.removed === true,
          },
          status,
        },
      }
    },
    async clearMappings() {
      const result = await requestEnvelope(fetchImpl, MAPPING_CLEAR_PATH, { method: 'POST' })
      if (!result.ok) return result
      const value = result.value
      const status = isRecord(value) ? asStatus(value.status) : null
      const mappings = isRecord(value) && isRecord(value.mappings) ? value.mappings : null
      if (status === null || mappings === null) return badPayload<RelayMappingsClearValue>()
      return {
        ok: true,
        value: {
          mappings: { cleared: typeof mappings.cleared === 'number' ? mappings.cleared : 0 },
          status,
        },
      }
    },
  }
}
