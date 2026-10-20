/**
 * 配置表单 ⇄ 提交 patch 的纯逻辑（client Model 层，不认识 React）。
 *
 * 表单里一律是字符串（受控 input 的天然形态）；这里负责：
 *  - 从 host 配置视图初始化表单；
 *  - 提交前把「人读文本」解析成结构化字段（群号、前缀、数字）；
 *  - 只提交用户真正能改的字段；token 留空表示沿用现有值。
 *
 * 校验只做「页面能立刻发现」的那一层；完整校验（URL 协议、路径绝对性等）
 * 由 host 的 normalizeConfig 负责，错误信息原样显示。
 */

import type { RelayConfigPatch, RelayConfigView, RelayPresetView, RelayStatusView } from './api.js'

/** 受控表单状态：全部字符串，方便 input 直接绑定。 */
export interface RelayFormState {
  wsUrl: string
  accessToken: string
  selfId: string
  groups: string
  workspace: string
  chatRetentionDays: string
  gateDebounce: string
  gateFastMinReplyInterval: string
  gateJevThreshold: string
  sessionTitle: string
  replyChunkSize: string
  commandPrefixes: string
  /** 代答开关（v0.18.0）：Toggle 控件用布尔，不走 updateField 的字符串通道。 */
  proxyEnabled: boolean
  /** 代答目标：QQ 号或群名片 / 昵称，逗号分隔。 */
  proxyTargets: string
  /** 代答沉默窗口：人读时长（10m / 30m / 0s）。 */
  proxySilenceWindow: string
  /** DSH agent preset id（v0.19.0）；空串 = 宿主默认预设。 */
  agentPreset: string
  /** 轻量人设开关（v0.19.0）：布尔，走 setPersonaEnabled。 */
  personaEnabled: boolean
  /** 轻量人设文本（v0.19.0）。 */
  personaText: string
  /** ComfyUI 画图开关（v0.21.0）：布尔，走 setComfyEnabled。 */
  comfyEnabled: boolean
  /** ComfyUI 服务地址（http(s) URL；host 会校验）。 */
  comfyBaseUrl: string
  /** 探测超时：人读时长（如 30s）。 */
  comfyTimeout: string
  /** 连接成功后加载画图 skill（v0.21.0）：布尔，走 setComfySkillEnabled。 */
  comfySkillEnabled: boolean
  /** 环境页开关（v0.23.0）：布尔，走 setEnvEnabled。 */
  envEnabled: boolean
  /** NapCat Docker 环境目录（绝对路径或 ~/ 开头；host 会校验）。 */
  envDir: string
  /** NapCat WebUI token（v0.23.0）：只写不读，留空表示不修改。 */
  envWebuiToken: string
}

/** 解析结果：成功带值，失败带可逐条显示的问题。 */
export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; problems: string[] }

/** 空表单（状态还没加载时用）。 */
export function emptyForm(): RelayFormState {
  return {
    wsUrl: '',
    accessToken: '',
    selfId: '',
    groups: '',
    workspace: '',
    chatRetentionDays: '',
    gateDebounce: '',
    gateFastMinReplyInterval: '',
    gateJevThreshold: '',
    sessionTitle: '',
    replyChunkSize: '',
    commandPrefixes: '',
    proxyEnabled: false,
    proxyTargets: '',
    proxySilenceWindow: '',
    agentPreset: '',
    personaEnabled: false,
    personaText: '',
    comfyEnabled: false,
    comfyBaseUrl: '',
    comfyTimeout: '30s',
    comfySkillEnabled: true,
    envEnabled: true,
    envDir: '',
    envWebuiToken: '',
  }
}

/** 从 host 配置视图生成表单（token 永远留空：host 不回显）。 */
export function formFromConfig(config: RelayConfigView): RelayFormState {
  return {
    wsUrl: config.wsUrl,
    accessToken: '',
    selfId: config.selfId > 0 ? String(config.selfId) : '',
    groups: config.groups.join(', '),
    workspace: config.workspace,
    chatRetentionDays: String(config.chatRetentionDays),
    gateDebounce: formatDurationMs(config.gate.debounceMs),
    gateFastMinReplyInterval: formatDurationMs(config.gate.fastMinReplyIntervalMs),
    gateJevThreshold: String(config.gate.jevThreshold),
    sessionTitle: config.sessionTitle,
    replyChunkSize: config.replyChunkSize > 0 ? String(config.replyChunkSize) : '',
    commandPrefixes: config.commandPrefixes.join(', '),
    proxyEnabled: config.proxyReply.enabled,
    proxyTargets: config.proxyReply.targets.join(', '),
    proxySilenceWindow: formatDurationMs(config.proxyReply.silenceWindowMs),
    agentPreset: config.agentPreset,
    personaEnabled: config.persona.enabled,
    personaText: config.persona.text,
    comfyEnabled: config.comfy.enabled,
    comfyBaseUrl: config.comfy.baseUrl,
    comfyTimeout: formatDurationMs(config.comfy.timeoutMs),
    comfySkillEnabled: config.comfy.skillEnabled,
    envEnabled: config.environment.enabled,
    envDir: config.environment.dir,
    // token 只写不读：表单永远从空开始，留空表示不修改。
    envWebuiToken: '',
  }
}

/** 毫秒 → 人读时长（优先 h / m / s，否则 ms）。 */
export function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0s'
  if (ms % (60 * 60 * 1000) === 0) return String(ms / (60 * 60 * 1000)) + 'h'
  if (ms % (60 * 1000) === 0) return String(ms / (60 * 1000)) + 'm'
  if (ms % 1000 === 0) return String(ms / 1000) + 's'
  return String(ms) + 'ms'
}

/** 时间点 → 人读相对时间（0 / 非法 → 空串）。 */
export function formatAgo(at: number, now: number = Date.now()): string {
  if (!Number.isFinite(at) || at <= 0) return ''
  const diff = Math.max(0, now - at)
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 60 * 60 * 1000) return Math.floor(diff / (60 * 1000)) + ' 分钟前'
  if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / (60 * 60 * 1000)) + ' 小时前'
  return Math.floor(diff / (24 * 60 * 60 * 1000)) + ' 天前'
}

/** 时间点 → 本地 HH:mm:ss（0 / 非法 → '--:--:--'）。 */
export function formatClockTime(at: number): string {
  if (!Number.isFinite(at) || at <= 0) return '--:--:--'
  const date = new Date(at)
  const pad = (value: number) => String(value).padStart(2, '0')
  return pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds())
}

/** 人读时长 → 毫秒（支持 500ms / 3s / 10m / 2h）；非法返回 null。 */
export function parseDurationMs(text: string): number | null {
  const match = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h)$/iu.exec(text.trim())
  if (match === null) return null
  const units: Record<string, number> = { ms: 1, s: 1000, m: 60 * 1000, h: 60 * 60 * 1000 }
  const unit = units[match[2].toLowerCase()]
  if (unit === undefined) return null
  const amount = Number(match[1])
  if (!Number.isFinite(amount) || amount < 0) return null
  return Math.round(amount * unit)
}

/** 按逗号 / 顿号 / 空白切分并去空。 */
function splitList(text: string): string[] {
  return text.split(/[,，\s]+/u).map((item) => item.trim()).filter((item) => item !== '')
}

/** 解析群号列表：正整数，自动去重。 */
export function parseGroups(text: string): ParseResult<number[]> {
  const problems: string[] = []
  const groups: number[] = []
  for (const item of splitList(text)) {
    if (!/^\d+$/u.test(item)) {
      problems.push('群号必须是数字：' + item)
      continue
    }
    const value = Number(item)
    if (!Number.isSafeInteger(value) || value <= 0) {
      problems.push('群号必须是正整数：' + item)
      continue
    }
    if (!groups.includes(value)) groups.push(value)
  }
  return problems.length > 0 ? { ok: false, problems } : { ok: true, value: groups }
}

/**
 * 解析代答目标：只按逗号 / 顿号切（昵称里可能有空格），去掉开头的 @。
 */
export function parseProxyTargets(text: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of text.split(/[,，]/u)) {
    const value = item.trim().replace(/^@/u, '').trim()
    if (value === '') continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(value)
  }
  return out
}

/** 解析命令前缀：按逗号 / 顿号切分，保持用户顺序。 */
export function parseCommandPrefixes(text: string): ParseResult<string[]> {
  const prefixes = text
    .split(/[,，]/u)
    .map((item) => item.trim())
    .filter((item) => item !== '')
  return { ok: true, value: prefixes }
}

/**
 * 把表单打成提交 patch。
 *
 * @param form - 受控表单
 * @returns 成功时只含需要提交的字段；失败时给出页面可显示的问题列表
 */
export function buildConfigPatch(form: RelayFormState): ParseResult<RelayConfigPatch> {
  const problems: string[] = []
  const patch: RelayConfigPatch = {}

  const wsUrl = form.wsUrl.trim()
  if (wsUrl === '') problems.push('wsUrl 必填')
  else patch.wsUrl = wsUrl

  if (form.accessToken.trim() !== '') patch.accessToken = form.accessToken.trim()

  const selfIdText = form.selfId.trim()
  if (!/^\d+$/u.test(selfIdText) || Number(selfIdText) <= 0) {
    problems.push('selfId 必须是正整数')
  } else {
    patch.selfId = Number(selfIdText)
  }

  const groups = parseGroups(form.groups)
  if (groups.ok) patch.groups = groups.value
  else problems.push(...groups.problems)

  const workspace = form.workspace.trim()
  if (workspace === '') problems.push('workspace 必填')
  else patch.workspace = workspace

  // 空输入按 0（永不自动删除）处理；自动清理只接受 0 或 7..3650（与 host 校验一致）。
  const retentionText = form.chatRetentionDays.trim()
  const retentionRaw = retentionText === '' ? '0' : retentionText
  const retention = Number(retentionRaw)
  if (!/^\d+$/u.test(retentionRaw) || !Number.isInteger(retention)
    || !(retention === 0 || (retention >= 7 && retention <= 3650))) {
    problems.push('聊天记录保留天数必须是 0（永不自动删除）或 7..3650 的整数')
  } else {
    patch.chatRetentionDays = retention
  }

  const sessionTitle = form.sessionTitle.trim()
  if (sessionTitle === '') problems.push('sessionTitle 必填')
  else patch.sessionTitle = sessionTitle

  const chunkText = form.replyChunkSize.trim()
  const chunk = Number(chunkText)
  if (!/^\d+$/u.test(chunkText) || !Number.isInteger(chunk) || chunk < 100 || chunk > 20000) {
    problems.push('replyChunkSize 必须是 100..20000 的整数')
  } else {
    patch.replyChunkSize = chunk
  }

  const prefixes = parseCommandPrefixes(form.commandPrefixes)
  if (prefixes.ok) patch.commandPrefixes = prefixes.value
  else problems.push(...prefixes.problems)

  // 代答（v0.18.0）：开关 / 名单 / 沉默窗口一起提交；开启时必须至少一个目标。
  const proxyTargets = parseProxyTargets(form.proxyTargets)
  if (form.proxyEnabled && proxyTargets.length === 0) {
    problems.push('开启代答时至少要填一个目标（QQ 号或群名片 / 昵称）')
  }
  const proxySilenceText = form.proxySilenceWindow.trim()
  const proxySilenceMs = parseDurationMs(proxySilenceText)
  if (proxySilenceMs === null || proxySilenceMs > 24 * 60 * 60 * 1000) {
    problems.push('代答沉默窗口必须是 0..24h 的时长（如 10m / 30m；0s = 总是代答）')
  } else {
    patch.proxyReply = {
      enabled: form.proxyEnabled,
      targets: proxyTargets,
      silenceWindow: proxySilenceText,
    }
  }

  // 角色与人设（v0.19.0）：agent preset 与轻量人设一起提交；preset 空串表示跟随宿主默认。
  const agentPreset = form.agentPreset.trim()
  patch.agentPreset = agentPreset
  const personaText = form.personaText.trim()
  if (form.personaEnabled && personaText === '') {
    problems.push('开启轻量人设时至少要填一段人设文本')
  }
  if (personaText.length > 4000) {
    problems.push('轻量人设最多 4000 字符')
  }
  patch.persona = { enabled: form.personaEnabled, text: personaText }

  // ComfyUI 画图（v0.21.0）：整块提交；超时 3s..120s（与 host 校验一致）。
  const comfyBaseUrl = form.comfyBaseUrl.trim()
  if (comfyBaseUrl === '') {
    problems.push('ComfyUI 服务地址必填（如 http://192.168.1.10:8188）')
  }
  const comfyTimeoutText = form.comfyTimeout.trim()
  const comfyTimeoutMs = parseDurationMs(comfyTimeoutText)
  if (comfyTimeoutMs === null || comfyTimeoutMs < 3000 || comfyTimeoutMs > 120000) {
    problems.push('ComfyUI 超时必须是 3s..120s 的时长（如 30s）')
  } else if (comfyBaseUrl !== '') {
    patch.comfy = {
      enabled: form.comfyEnabled,
      baseUrl: comfyBaseUrl,
      timeoutMs: comfyTimeoutMs,
      skillEnabled: form.comfySkillEnabled,
    }
  }

  // 环境配置（v0.23.0）：目录必填且必须是绝对路径 / ~ 开头；token 留空表示不修改。
  const envDir = form.envDir.trim()
  if (envDir === '') {
    problems.push('环境目录必填（默认 ~/napcat-docker）')
  } else if (envDir !== '~' && !envDir.startsWith('~/') && !envDir.startsWith('/')) {
    problems.push('环境目录必须是绝对路径或 ~/ 开头')
  } else if (envDir.split('/').includes('..')) {
    problems.push('环境目录不能包含 ..')
  }
  if (envDir !== '' && !problems.some((problem) => problem.startsWith('环境目录'))) {
    const environment: NonNullable<RelayConfigPatch['environment']> = {
      enabled: form.envEnabled,
      dir: envDir,
    }
    const token = form.envWebuiToken.trim()
    if (token !== '') environment.webuiToken = token
    patch.environment = environment
  }

  const gate: NonNullable<RelayConfigPatch['gate']> = {}
  const debounceText = form.gateDebounce.trim()
  const debounceMs = parseDurationMs(debounceText)
  if (debounceMs === null || debounceMs > 60 * 1000) {
    problems.push('去抖窗口必须是 0..60s 的时长（如 3s / 500ms）')
  } else {
    gate.debounce = debounceText
  }
  const intervalText = form.gateFastMinReplyInterval.trim()
  const intervalMs = parseDurationMs(intervalText)
  if (intervalMs === null || intervalMs > 60 * 60 * 1000) {
    problems.push('最小发言间隔必须是 0..60m 的时长（如 10s / 45s）')
  } else {
    gate.fastMinReplyInterval = intervalText
  }
  const thresholdText = form.gateJevThreshold.trim()
  const threshold = Number(thresholdText)
  if (thresholdText === '' || !Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    problems.push('jev 阈值必须是 0..1 的数字（如 0.7）')
  } else {
    gate.jevThreshold = threshold
  }
  patch.gate = gate

  return problems.length > 0 ? { ok: false, problems } : { ok: true, value: patch }
}

/** 表单是否有未提交的改动（只用于显示「已修改」，不阻止保存）。 */
export function isFormDirty(form: RelayFormState, config: RelayConfigView): boolean {
  const base = formFromConfig(config)
  return (Object.keys(base) as (keyof RelayFormState)[]).some((key) => form[key] !== base[key])
}

/** 插件预设编辑器里的受控状态（v0.20.0；全部字符串）。 */
export interface RelayPresetDraft {
  id: string
  name: string
  description: string
  persona: string
  provider: string
  model: string
  reasoningEffort: string
  permissionPreset: string
  order: string
}

/** 空预设草稿。 */
export function emptyPresetDraft(): RelayPresetDraft {
  return {
    id: '',
    name: '',
    description: '',
    persona: '',
    provider: '',
    model: '',
    reasoningEffort: '',
    permissionPreset: '',
    order: '100',
  }
}

/** host 预设视图 → 草稿。 */
export function presetDraftFromView(preset: RelayPresetView): RelayPresetDraft {
  return {
    id: preset.id,
    name: preset.name,
    description: preset.description,
    persona: preset.persona,
    provider: preset.model.provider,
    model: preset.model.model,
    reasoningEffort: preset.model.reasoningEffort,
    permissionPreset: preset.permissionPreset,
    order: String(preset.order),
  }
}

/** 草稿 → 提交给 host 的预设对象；校验只做页面能立刻发现的那一层。 */
export function buildPresetFromDraft(draft: RelayPresetDraft): ParseResult<RelayPresetView> {
  const problems: string[] = []
  const id = draft.id.trim()
  if (!/^[a-z0-9][a-z0-9-]{0,40}$/u.test(id)) {
    problems.push('预设 id 只能用小写字母 / 数字 / 连字符，且不超过 41 字符')
  }
  const name = draft.name.trim()
  if (name === '') problems.push('预设名称必填')
  const persona = draft.persona.trim()
  if (persona === '') problems.push('人设文本必填')
  if (persona.length > 4000) problems.push('人设文本最多 4000 字符')
  const provider = draft.provider.trim()
  const model = draft.model.trim()
  if ((provider === '') !== (model === '')) problems.push('模型必须同时选 provider 与 model（或都留空）')
  const orderRaw = draft.order.trim() === '' ? '100' : draft.order.trim()
  const order = Number(orderRaw)
  if (!/^\d+$/u.test(orderRaw) || !Number.isInteger(order) || order < 1 || order > 10000) {
    problems.push('预设排序必须是 1..10000 的整数')
  }
  if (problems.length > 0) return { ok: false, problems }
  return {
    ok: true,
    value: {
      id,
      name,
      description: draft.description.trim(),
      persona,
      model: {
        provider,
        model,
        reasoningEffort: provider === '' ? '' : draft.reasoningEffort.trim(),
      },
      permissionPreset: draft.permissionPreset.trim(),
      order,
    },
  }
}

/** 群项目目录表格的一行（白名单 ∪ 已映射 ∪ 已配置项目）。 */
export interface GroupProjectRow {
  groupId: number
  sessionId: string
  sessionTitle: string
  /** 输入框里的项目目录；空串 = 跟随默认项目。 */
  projectDir: string
}

/**
 * 由状态快照生成「群项目目录」表格行。
 *
 * 行集合 = 白名单群 ∪ `groupWorkspaces` 里配置的群 ∪ 已映射群，按群号升序。
 */
export function projectRowsFromStatus(status: RelayStatusView): GroupProjectRow[] {
  const byGroup = new Map<number, GroupProjectRow>()
  const ensure = (groupId: number): GroupProjectRow => {
    let row = byGroup.get(groupId)
    if (row === undefined) {
      row = { groupId, sessionId: '', sessionTitle: '', projectDir: '' }
      byGroup.set(groupId, row)
    }
    return row
  }
  for (const groupId of status.config.groups) ensure(groupId)
  for (const [key, value] of Object.entries(status.config.groupWorkspaces)) {
    const groupId = Number(key)
    if (!Number.isSafeInteger(groupId) || groupId <= 0) continue
    ensure(groupId).projectDir = value
  }
  for (const mapping of status.mappings) {
    const row = ensure(mapping.groupId)
    row.sessionId = mapping.sessionId
    row.sessionTitle = mapping.title
  }
  return [...byGroup.values()].sort((left, right) => left.groupId - right.groupId)
}

/**
 * 把表格行打成 `groupWorkspaces` 覆盖（整表替换；空行表示跟随默认项目）。
 * 只做 trim，路径合法性交给 host 的 normalizeConfig。
 */
export function buildGroupWorkspacesPatch(rows: GroupProjectRow[]): Record<string, string> {
  const value: Record<string, string> = {}
  for (const row of rows) {
    const projectDir = row.projectDir.trim()
    if (projectDir === '') continue
    value[String(row.groupId)] = projectDir
  }
  return value
}

/** 群项目目录表格是否有未保存改动。 */
export function isProjectRowsDirty(rows: GroupProjectRow[], status: RelayStatusView): boolean {
  const base = new Map(projectRowsFromStatus(status).map((row) => [row.groupId, row.projectDir]))
  return rows.some((row) => (base.get(row.groupId) ?? '') !== row.projectDir.trim())
}
