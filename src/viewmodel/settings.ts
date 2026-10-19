/**
 * 配置页的呈现态与动作（client ViewModel 层）。
 *
 * 只做三件事：
 *  - 把 host 状态翻译成「页面上直接能画的东西」（连接态 / token 提示 / 闸门摘要）；
 *  - 持有表单、群项目表、最近消息这些**页面状态**，暴露动作（保存 / 重连 / 重新绑定 / 清理）；
 *  - 轮询状态（5 秒一次，只刷新状态不覆盖正在编辑的表单）。
 *
 * 不认识的只有 React：这里不放 JSX；HTTP 在 `../model/api`，表单纯逻辑在
 * `../model/form`。契约见 docs/client.md。
 */

import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  createRelaySettingsApi,
  type RelayApiResult,
  type RelayPanelMessageView,
  type RelayStatusView,
} from '../model/api.js'
import {
  buildConfigPatch,
  buildGroupWorkspacesPatch,
  emptyForm,
  formFromConfig,
  isFormDirty,
  isProjectRowsDirty,
  projectRowsFromStatus,
  type GroupProjectRow,
  type RelayFormState,
} from '../model/form.js'

/**
 * 浏览器半身唯一的 HTTP 注入点：同源相对路由，页面生命周期内一个实例。
 * （host 侧注册在 `lib/controller/config-routes.js`。）
 */
const api = createRelaySettingsApi({ fetch: (input, init) => globalThis.fetch(input, init) })

/** 配置页的二级页面。 */
export type SettingsTab = 'connection' | 'project' | 'behavior' | 'records'

/** 二级页面导航（顺序即渲染顺序）。 */
export const SETTINGS_TABS: ReadonlyArray<{ id: SettingsTab; label: string }> = [
  { id: 'connection', label: '连接' },
  { id: 'project', label: '项目' },
  { id: 'behavior', label: '行为' },
  { id: 'records', label: '记录' },
]

/** 表单里的字符串字段；`proxyEnabled` / `personaEnabled`（开关）走单独的 setter。 */
export type RelayFormTextField = Exclude<keyof RelayFormState, 'proxyEnabled' | 'personaEnabled'>

/** 状态点的色调（View 层只认这个，不认具体颜色）。 */
export type StatusTone = 'ok' | 'warn' | 'error' | 'muted'

/** 一行状态文案。 */
export interface StatusLine {
  tone: StatusTone
  text: string
}

/** 把失败结果翻译成一行文案。 */
export function errorText<T>(result: RelayApiResult<T>): string {
  return result.ok ? '' : result.error.message
}

/** 连接状态：已连接 / 连接中 / 未启动（含单实例锁与配置问题）。 */
export function describeStatus(status: RelayStatusView | null): StatusLine {
  if (status === null) return { tone: 'muted', text: '加载中…' }
  if (!status.started) {
    if (status.lock !== null) {
      return { tone: 'warn', text: '未启动：另一个实例（pid ' + String(status.lock.pid) + '）正在运行' }
    }
    if (status.problems.length > 0) return { tone: 'error', text: '未启动：配置待补全' }
    return { tone: 'muted', text: '未启动（等待宿主就绪）' }
  }
  if (status.connected) {
    const login = status.login
    const who = login !== null && (login.nickname !== '' || login.userId > 0)
      ? 'QQ ' + (login.nickname !== '' ? login.nickname : String(login.userId))
      : String(status.config.selfId)
    return { tone: 'ok', text: '已连接（' + who + '）' }
  }
  return { tone: 'warn', text: '连接中…（断线自动重连）' }
}

/** token 输入框的提示：只写不读，页面永远看不到明文。 */
export function tokenHint(status: RelayStatusView | null): string {
  if (status === null) return '保存后生效'
  if (!status.config.accessTokenConfigured) return '未配置；建议在 profile patch 里用 !!js 从环境变量读取'
  const source = status.config.accessTokenSource === 'settings' ? '配置页保存值' : 'profile patch / 环境变量'
  return '已配置（来源：' + source + '）；留空表示不修改'
}

/** 闸门摘要：开关 / 分类器 / 当前阈值，外加「宿主版本过旧」的提醒。 */
export function describeGate(status: RelayStatusView | null): StatusLine {
  if (status === null) return { tone: 'muted', text: '闸门状态读取中…' }
  if (!status.config.gateSupported) {
    return { tone: 'warn', text: '宿主还是旧版本（未加载支持闸门配置的版本）：下面参数暂时不会生效，重启该 profile 的 GUI 后再保存。' }
  }
  const gate = status.gate
  if (gate === null) return { tone: 'muted', text: '闸门状态读取中…' }
  if (!gate.enabled) {
    return { tone: 'muted', text: '闸门当前关闭（gate.enabled 来自 profile patch）：下面的参数会保存，开启后才生效。' }
  }
  if (gate.classifier === null) {
    return { tone: 'warn', text: '闸门已开启，但分类器未就绪：普通群消息不会接话（@ / 引用 / 命令仍直通）。' }
  }
  return {
    tone: 'ok',
    text: '闸门已开启 · 分类器 ' + gate.classifier + ' · 阈值 ' + String(gate.threshold) + '；保存后立即重建闸门。',
  }
}

/** 最近消息面板的状态。 */
export interface RelayMessagesState {
  groupId: number | null
  items: RelayPanelMessageView[]
  busy: boolean
  error: string | null
  windowMs: number
}

const EMPTY_MESSAGES: RelayMessagesState = { groupId: null, items: [], busy: false, error: null, windowMs: 0 }

/** 页面拿到的全部状态与动作。 */
export interface RelaySettingsModel {
  status: RelayStatusView | null
  form: RelayFormState
  projectRows: GroupProjectRow[]
  loading: boolean
  busy: boolean
  error: string | null
  notice: string | null
  tab: SettingsTab
  dirty: boolean
  statusLine: StatusLine
  tokenHint: string
  gateLine: StatusLine
  messages: RelayMessagesState
  setTab: (tab: SettingsTab) => void
  updateField: (key: RelayFormTextField, value: string) => void
  /** 代答开关（v0.18.0）：布尔字段单独走这里，不进 updateField 的字符串通道。 */
  setProxyEnabled: (enabled: boolean) => void
  /** 轻量人设开关（v0.19.0）。 */
  setPersonaEnabled: (enabled: boolean) => void
  updateProjectRow: (groupId: number, projectDir: string) => void
  refresh: () => void
  save: () => void
  reconnect: () => void
  rebind: (groupId: number) => void
  deleteMapping: (groupId: number) => void
  clearMappings: () => void
  cleanup: () => void
  openMessages: (groupId: number) => void
  closeMessages: () => void
  reloadMessages: () => void
}

/** 配置页的状态与动作（挂载即拉一次状态，之后每 5 秒静默刷新）。 */
export function useRelaySettings(): RelaySettingsModel {
  const [status, setStatus] = useState<RelayStatusView | null>(null)
  const [form, setForm] = useState<RelayFormState>(emptyForm)
  const [projectRows, setProjectRows] = useState<GroupProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [tab, setTab] = useState<SettingsTab>('connection')
  const [messages, setMessages] = useState<RelayMessagesState>(EMPTY_MESSAGES)

  const applyStatus = useCallback((next: RelayStatusView, syncForm: boolean) => {
    setStatus(next)
    if (syncForm) {
      setForm(formFromConfig(next.config))
      setProjectRows(projectRowsFromStatus(next))
    }
  }, [])

  /** 拉状态：`syncForm` 时把表单重置为 host 的当前配置。 */
  const load = useCallback(async (syncForm: boolean, reportError = true) => {
    const result = await api.getStatus()
    setLoading(false)
    if (result.ok) {
      applyStatus(result.value, syncForm)
      if (syncForm && reportError) setError(null)
    } else if (reportError) {
      setError(errorText(result))
    }
  }, [applyStatus])

  useEffect(() => { void load(true) }, [load])
  useEffect(() => {
    const timer = setInterval(() => { void load(false, false) }, 5000)
    return () => clearInterval(timer)
  }, [load])

  const updateField = useCallback((key: RelayFormTextField, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }))
  }, [])

  const setProxyEnabled = useCallback((enabled: boolean) => {
    setForm((previous) => ({ ...previous, proxyEnabled: enabled }))
  }, [])

  const setPersonaEnabled = useCallback((enabled: boolean) => {
    setForm((previous) => ({ ...previous, personaEnabled: enabled }))
  }, [])

  const updateProjectRow = useCallback((groupId: number, projectDir: string) => {
    setProjectRows((previous) => previous.map((row) => (row.groupId === groupId ? { ...row, projectDir } : row)))
  }, [])

  const refresh = useCallback(() => { void load(true) }, [load])

  const save = useCallback(async () => {
    const patch = buildConfigPatch(form)
    if (!patch.ok) {
      setNotice(null)
      setError(patch.problems.join('；'))
      return
    }
    const rowsPatch = buildGroupWorkspacesPatch(projectRows)
    setBusy(true)
    setError(null)
    setNotice(null)
    const result = await api.saveConfig({ ...patch.value, groupWorkspaces: rowsPatch })
    setBusy(false)
    if (result.ok) {
      applyStatus(result.value, true)
      setNotice('已保存并重建连接。')
    } else {
      setError(errorText(result))
    }
  }, [form, projectRows, applyStatus])

  const reconnect = useCallback(async () => {
    setBusy(true)
    setError(null)
    setNotice(null)
    const result = await api.reconnect()
    setBusy(false)
    if (result.ok) {
      applyStatus(result.value, false)
      setNotice('已请求重新连接。')
    } else {
      setError(errorText(result))
    }
  }, [applyStatus])

  /** 重新绑定：删该群映射并按当前项目目录重建（旧聊天记录不移动）。 */
  const rebind = useCallback(async (groupId: number) => {
    const confirmFn = (globalThis as { confirm?: (message: string) => boolean }).confirm
    if (typeof confirmFn === 'function') {
      const approved = confirmFn(
        '重新绑定群 ' + String(groupId) + '？\n'
        + '会删除该群现有会话映射，下次消息按当前项目目录新建会话；旧项目里的聊天记录不会移动。',
      )
      if (!approved) return
    }
    setBusy(true)
    setError(null)
    setNotice(null)
    const result = await api.rebind(groupId)
    setBusy(false)
    if (result.ok) {
      applyStatus(result.value, true)
      setNotice('已重新绑定：下一条消息会按新项目建会话。')
    } else {
      setError(errorText(result))
    }
  }, [applyStatus])

  /** 最近消息：拉某群最近 24 小时（最多 20 条）的只读消息。 */
  const loadMessages = useCallback(async (groupId: number) => {
    setMessages((previous) => ({ ...previous, groupId, busy: true, error: null }))
    const result = await api.messages(groupId, 20)
    if (result.ok) {
      setMessages({
        groupId,
        items: result.value.messages,
        busy: false,
        error: null,
        windowMs: result.value.windowMs,
      })
    } else {
      setMessages({ groupId, items: [], busy: false, error: errorText(result), windowMs: 0 })
    }
  }, [])

  const openMessages = useCallback((groupId: number) => { void loadMessages(groupId) }, [loadMessages])

  const closeMessages = useCallback(() => { setMessages(EMPTY_MESSAGES) }, [])

  const reloadMessages = useCallback(() => {
    if (messages.groupId !== null) void loadMessages(messages.groupId)
  }, [loadMessages, messages.groupId])

  /** 解除单个群绑定：删映射并重建 relay；旧会话保留在 GUI。 */
  const deleteMapping = useCallback(async (groupId: number) => {
    const confirmFn = (globalThis as { confirm?: (message: string) => boolean }).confirm
    if (typeof confirmFn === 'function') {
      const approved = confirmFn(
        '解除群 ' + String(groupId) + ' 的会话绑定？\n'
        + '旧会话保留在 GUI；下一条群消息会按当前项目目录新建会话。',
      )
      if (!approved) return
    }
    setBusy(true)
    setError(null)
    setNotice(null)
    const result = await api.deleteMapping(groupId)
    setBusy(false)
    if (result.ok) {
      applyStatus(result.value.status, true)
      setNotice(result.value.mapping.removed
        ? '已解除群 ' + String(groupId) + ' 的会话绑定。'
        : '群 ' + String(groupId) + ' 本来没有绑定。')
      setMessages((previous) => (previous.groupId === groupId ? EMPTY_MESSAGES : previous))
    } else {
      setError(errorText(result))
    }
  }, [applyStatus])

  /** 清空全部映射：一次删掉所有群绑定（旧会话保留在 GUI）。 */
  const clearMappings = useCallback(async () => {
    const count = status === null ? 0 : status.mappings.length
    if (count === 0) return
    const confirmFn = (globalThis as { confirm?: (message: string) => boolean }).confirm
    if (typeof confirmFn === 'function') {
      const approved = confirmFn(
        '清空全部 ' + String(count) + ' 条群映射？\n'
        + '旧会话保留在 GUI；之后每个群的下一条消息都会重新建会话。',
      )
      if (!approved) return
    }
    setBusy(true)
    setError(null)
    setNotice(null)
    const result = await api.clearMappings()
    setBusy(false)
    if (result.ok) {
      applyStatus(result.value.status, true)
      setNotice('已清空 ' + String(result.value.mappings.cleared) + ' 条群映射。')
      setMessages(EMPTY_MESSAGES)
    } else {
      setError(errorText(result))
    }
  }, [applyStatus, status])

  /**
   * 立即清理：用「保留天数」输入框里的值（1..3650）清一次聊天记录 + 媒体。
   * 与保存无关（不落盘、不改配置）；0 表示永不自动删除，不能用于立即清理。
   */
  const cleanup = useCallback(async () => {
    const days = Number(form.chatRetentionDays.trim() === '' ? '0' : form.chatRetentionDays.trim())
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      setNotice(null)
      setError('立即清理需要先在「保留天数」里填 1..3650 的整数（0 = 永不删除，不能清理）。')
      return
    }
    const confirmFn = (globalThis as { confirm?: (message: string) => boolean }).confirm
    if (typeof confirmFn === 'function') {
      const approved = confirmFn(
        '立即清理超过 ' + String(days) + ' 天的聊天记录与媒体文件？\n'
        + '删除后不可恢复；群映射与会话不受影响。',
      )
      if (!approved) return
    }
    setBusy(true)
    setError(null)
    setNotice(null)
    const result = await api.cleanup(days)
    setBusy(false)
    if (result.ok) {
      const { cleanup: report, status: next } = result.value
      applyStatus(next, false)
      setNotice('已清理：聊天记录 ' + String(report.chat) + ' 个文件、媒体 '
        + String(report.media) + ' 个日期目录（保留 ' + String(report.days) + ' 天）。')
    } else {
      setError(errorText(result))
    }
  }, [form.chatRetentionDays, applyStatus])

  const dirty = useMemo(
    () => status !== null && (isFormDirty(form, status.config) || isProjectRowsDirty(projectRows, status)),
    [form, projectRows, status],
  )
  const statusLine = useMemo(() => describeStatus(status), [status])
  const gateLine = useMemo(() => describeGate(status), [status])
  const hint = useMemo(() => tokenHint(status), [status])

  return {
    status,
    form,
    projectRows,
    loading,
    busy,
    error,
    notice,
    tab,
    dirty,
    statusLine,
    tokenHint: hint,
    gateLine,
    messages,
    setTab,
    updateField,
    setProxyEnabled,
    setPersonaEnabled,
    updateProjectRow,
    refresh,
    save: () => { void save() },
    reconnect: () => { void reconnect() },
    rebind: (groupId) => { void rebind(groupId) },
    deleteMapping: (groupId) => { void deleteMapping(groupId) },
    clearMappings: () => { void clearMappings() },
    cleanup: () => { void cleanup() },
    openMessages,
    closeMessages,
    reloadMessages,
  }
}
