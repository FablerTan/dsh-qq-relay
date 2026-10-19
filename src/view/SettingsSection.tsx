/**
 * 设置页「QQ 机器人」（client View 层，P1.5 基础配置页）。
 *
 * 只负责渲染与本地交互：状态 / 表单解析在 `../model/`，HTTP 在 `./model/api`。
 * 每次保存都由 host 校验并**立即重建连接**（见 host 的 `saveConfig`），
 * 页面只把结果翻译成提示，不自己猜配置是否生效。
 */

import { useCallback, useEffect, useState, type ReactElement } from 'react'

import {
  createRelaySettingsApi,
  type RelayApiResult,
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

/** 组合根是唯一注入 fetch 的地方（Model 不碰全局）。 */
const api = createRelaySettingsApi({ fetch: (input, init) => globalThis.fetch(input, init) })

const MUTED = 'rgba(127, 127, 127, 0.75)'
const BORDER = '1px solid rgba(127, 127, 127, 0.32)'
const INPUT_STYLE = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '6px 8px',
  borderRadius: 6,
  border: BORDER,
  background: 'rgba(127, 127, 127, 0.08)',
  color: 'inherit',
  font: 'inherit',
} as const
const BUTTON_STYLE = {
  padding: '6px 12px',
  borderRadius: 6,
  border: BORDER,
  background: 'rgba(127, 127, 127, 0.14)',
  color: 'inherit',
  font: 'inherit',
  cursor: 'pointer',
} as const

/** 一处表单字段（label + 控件 + 可选说明）。 */
function Field(props: { label: string; hint?: string; children: ReactElement }): ReactElement {
  return (
    <label style={{ display: 'block', marginBottom: 10 }} data-plugin-field="">
      <span style={{ display: 'block', fontSize: '0.85em', marginBottom: 3, opacity: 0.85 }}>{props.label}</span>
      {props.children}
      {props.hint !== undefined ? (
        <span style={{ display: 'block', fontSize: '0.78em', marginTop: 2, color: MUTED }}>{props.hint}</span>
      ) : null}
    </label>
  )
}

/** 连接状态一行（圆点 + 文案）。 */
function statusView(status: RelayStatusView | null): { tone: string; text: string } {
  if (status === null) return { tone: MUTED, text: '加载中…' }
  if (!status.started) {
    if (status.lock !== null) return { tone: '#e0a23a', text: '未启动：另一个实例（pid ' + String(status.lock.pid) + '）正在运行' }
    if (status.problems.length > 0) return { tone: '#e05a4f', text: '未启动：配置待补全' }
    return { tone: MUTED, text: '未启动（等待宿主就绪）' }
  }
  if (status.connected) {
    const login = status.login
    const who = login !== null && (login.nickname !== '' || login.userId > 0)
      ? 'QQ ' + (login.nickname !== '' ? login.nickname : String(login.userId))
      : String(status.config.selfId)
    return { tone: '#2e9e5b', text: '已连接（' + who + '）' }
  }
  return { tone: '#e0a23a', text: '连接中…（断线自动重连）' }
}

/** 把失败结果翻译成一行文案。 */
function errorText(result: RelayApiResult<RelayStatusView>): string {
  return result.ok ? '' : result.error.message
}

/** 设置页入口组件。 */
export function RelaySettingsSection(): ReactElement {
  const [status, setStatus] = useState<RelayStatusView | null>(null)
  const [form, setForm] = useState<RelayFormState>(emptyForm)
  const [projectRows, setProjectRows] = useState<GroupProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

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

  // 挂载时同步一次表单；之后每 5 秒只刷新状态（连接态会自己变）。
  useEffect(() => { void load(true) }, [load])
  useEffect(() => {
    const timer = setInterval(() => { void load(false, false) }, 5000)
    return () => clearInterval(timer)
  }, [load])

  const updateField = (key: keyof RelayFormState, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  const updateProjectRow = (groupId: number, projectDir: string) => {
    setProjectRows((previous) => previous.map((row) => (
      row.groupId === groupId ? { ...row, projectDir } : row
    )))
  }

  const onSave = useCallback(async () => {
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

  const onReconnect = useCallback(async () => {
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
  const onRebind = useCallback(async (groupId: number) => {
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

  const current = statusView(status)
  const dirty = status !== null && (isFormDirty(form, status.config) || isProjectRowsDirty(projectRows, status))
  const tokenHint = status === null
    ? '保存后生效'
    : status.config.accessTokenConfigured
      ? '已配置（来源：' + (status.config.accessTokenSource === 'settings' ? '设置页保存值' : 'profile patch / 环境变量') + '）；留空表示不修改'
      : '未配置；建议在 profile patch 里用 !!js 从环境变量读取'

  return (
    <div data-plugin="dsh-qq-relay" style={{ padding: '10px 4px', lineHeight: 1.7 }}>
      <h2 style={{ margin: '0 0 4px', fontSize: '1.05rem' }}>QQ 机器人</h2>
      <p style={{ margin: '0 0 12px', color: MUTED, fontSize: '0.86em' }}>
        通过 OneBot 11 正向 WebSocket 把 QQ 群接到 DSH 会话。保存后立即用新配置重建连接；
        群映射（一群一会话）保存在本机，不受配置改动影响。
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: current.tone, flex: 'none' }} />
        <span style={{ fontSize: '0.9em' }}>{current.text}</span>
        <button type="button" onClick={() => { void load(true) }} disabled={loading || busy} style={{ ...BUTTON_STYLE, marginLeft: 'auto', fontSize: '0.82em', padding: '3px 8px' }}>
          刷新
        </button>
      </div>

      {status !== null && status.problems.length > 0 ? (
        <ul style={{ margin: '0 0 10px', paddingLeft: '1.1rem', color: '#e05a4f', fontSize: '0.85em' }}>
          {status.problems.map((problem) => <li key={problem}>{problem}</li>)}
        </ul>
      ) : null}

      <Field label="协议端 WebSocket 地址" hint="NapCat 正向 WS，例如 ws://127.0.0.1:3001">
        <input
          value={form.wsUrl}
          onChange={(event) => updateField('wsUrl', event.target.value)}
          placeholder="ws://127.0.0.1:3001"
          style={INPUT_STYLE}
          spellCheck={false}
        />
      </Field>

      <Field label="Access Token" hint={tokenHint}>
        <input
          type="password"
          value={form.accessToken}
          onChange={(event) => updateField('accessToken', event.target.value)}
          placeholder={status?.config.accessTokenConfigured === true ? '留空保持不变' : '写入新的 token'}
          style={INPUT_STYLE}
          autoComplete="off"
          spellCheck={false}
        />
      </Field>

      <Field label="机器人 QQ 号（selfId）" hint="连接后用 get_login_info 校验，不匹配会断开">
        <input
          value={form.selfId}
          onChange={(event) => updateField('selfId', event.target.value)}
          inputMode="numeric"
          style={INPUT_STYLE}
          spellCheck={false}
        />
      </Field>

      <Field label="群白名单" hint="逗号分隔的群号；未列出的群只记日志不回复">
        <input
          value={form.groups}
          onChange={(event) => updateField('groups', event.target.value)}
          placeholder="10002"
          style={INPUT_STYLE}
          spellCheck={false}
        />
      </Field>

      <Field label="会话工作目录" hint="未单独配置群项目时，聊天记录与 DSH 会话使用的默认项目目录">
        <input
          value={form.workspace}
          onChange={(event) => updateField('workspace', event.target.value)}
          placeholder="~/dsh/qq-relay-ws"
          style={INPUT_STYLE}
          spellCheck={false}
        />
      </Field>

      <Field label="会话标题模板" hint="可用 {groupName} / {groupId}">
        <input
          value={form.sessionTitle}
          onChange={(event) => updateField('sessionTitle', event.target.value)}
          placeholder="QQ群：{groupName}"
          style={INPUT_STYLE}
          spellCheck={false}
        />
      </Field>

      <Field label="回发文本切分上限" hint="100..20000 字符；超长回复按此切分成多条">
        <input
          value={form.replyChunkSize}
          onChange={(event) => updateField('replyChunkSize', event.target.value)}
          inputMode="numeric"
          style={INPUT_STYLE}
          spellCheck={false}
        />
      </Field>

      <Field label="直通命令前缀" hint="逗号分隔；群消息以此开头时绕过闸门直接进 DSH">
        <input
          value={form.commandPrefixes}
          onChange={(event) => updateField('commandPrefixes', event.target.value)}
          placeholder="/dsh"
          style={INPUT_STYLE}
          spellCheck={false}
        />
      </Field>

      <h3 style={{ margin: '14px 0 6px', fontSize: '0.95rem' }}>闸门</h3>
      <p style={{ margin: '0 0 8px', color: MUTED, fontSize: '0.82em' }}>
        {status !== null && !status.config.gateSupported ? (
          <span style={{ color: '#e0a23a' }}>
            宿主还是旧版本（未加载 v0.10.0）：下面三个参数暂时不会生效，请重启 dwdev GUI 后再保存。
          </span>
        ) : null}
        {status === null || status.gate === null
          ? '闸门状态读取中…'
          : status.gate.enabled
            ? '闸门已开启（' + (status.gate.classifier === null
                ? '分类器未就绪：普通消息不会接话'
                : '分类器 ' + status.gate.classifier + '，阈值 ' + String(status.gate.threshold))
              + '）。保存后立即重建闸门，无需重启。'
            : '闸门当前关闭（gate.enabled 来自 profile patch）：以下参数会保存，开启后才生效。'}
      </p>
      <Field label="普通消息去抖窗口" hint="同一波消息合并等待，0..60s（如 3s / 500ms）">
        <input
          value={form.gateDebounce}
          onChange={(event) => updateField('gateDebounce', event.target.value)}
          placeholder="5s"
          style={INPUT_STYLE}
          spellCheck={false}
        />
      </Field>
      <Field label="最小发言间隔" hint="距上次发言不足该间隔时延后评估，0..60m（如 10s / 45s）">
        <input
          value={form.gateFastMinReplyInterval}
          onChange={(event) => updateField('gateFastMinReplyInterval', event.target.value)}
          placeholder="45s"
          style={INPUT_STYLE}
          spellCheck={false}
        />
      </Field>
      <Field label="jev 接话阈值" hint="0..1；越高越保守（默认 0.7）">
        <input
          value={form.gateJevThreshold}
          onChange={(event) => updateField('gateJevThreshold', event.target.value)}
          inputMode="decimal"
          placeholder="0.7"
          style={INPUT_STYLE}
          spellCheck={false}
        />
      </Field>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 12px', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => { void onSave() }} disabled={busy || loading} style={BUTTON_STYLE}>
          保存并重连
        </button>
        <button type="button" onClick={() => { void onReconnect() }} disabled={busy || loading} style={BUTTON_STYLE}>
          重新连接
        </button>
        {dirty ? <span style={{ fontSize: '0.82em', color: '#e0a23a' }}>有未保存的修改</span> : null}
      </div>

      {error !== null ? (
        <p style={{ margin: '0 0 10px', color: '#e05a4f', fontSize: '0.85em' }} role="alert">{error}</p>
      ) : null}
      {notice !== null ? (
        <p style={{ margin: '0 0 10px', color: '#2e9e5b', fontSize: '0.85em' }} role="status">{notice}</p>
      ) : null}

      <h3 style={{ margin: '16px 0 6px', fontSize: '0.95rem' }}>群项目目录</h3>
      <p style={{ margin: '0 0 8px', color: MUTED, fontSize: '0.82em' }}>
        每个群的聊天记录写进该项目的 <code>.qq-relay/chat/&lt;群号&gt;/</code>，DSH 会话也以它为工作目录；
        留空表示跟随上面的默认工作目录。改目录只影响之后新建的会话——已建会话请点「重新绑定」
        （旧项目里的聊天记录不会移动）。
      </p>
      {status === null || projectRows.length === 0 ? (
        <p style={{ margin: 0, color: MUTED, fontSize: '0.84em' }}>
          还没有群：把群号填进「群白名单」，或在群里 @ 机器人后会自动出现。
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82em' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: MUTED }}>
                <th style={{ padding: '4px 6px', borderBottom: BORDER }}>群号</th>
                <th style={{ padding: '4px 6px', borderBottom: BORDER }}>会话</th>
                <th style={{ padding: '4px 6px', borderBottom: BORDER }}>项目目录</th>
                <th style={{ padding: '4px 6px', borderBottom: BORDER }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {projectRows.map((row) => (
                <tr key={row.groupId}>
                  <td style={{ padding: '4px 6px', borderBottom: BORDER }}>{row.groupId}</td>
                  <td style={{ padding: '4px 6px', borderBottom: BORDER }}>
                    {row.sessionId === '' ? (
                      <span style={{ color: MUTED }}>未创建</span>
                    ) : (
                      <>
                        <span>{row.sessionTitle !== '' ? row.sessionTitle : '—'}</span>
                        <span style={{ display: 'block', fontFamily: 'ui-monospace, monospace', fontSize: '0.9em', color: MUTED }}>
                          {row.sessionId}
                        </span>
                      </>
                    )}
                  </td>
                  <td style={{ padding: '4px 6px', borderBottom: BORDER, minWidth: 200 }}>
                    <input
                      value={row.projectDir}
                      onChange={(event) => updateProjectRow(row.groupId, event.target.value)}
                      placeholder={status.config.workspace}
                      style={{ ...INPUT_STYLE, fontSize: '0.95em' }}
                      spellCheck={false}
                    />
                  </td>
                  <td style={{ padding: '4px 6px', borderBottom: BORDER }}>
                    <button
                      type="button"
                      onClick={() => { void onRebind(row.groupId) }}
                      disabled={busy || row.sessionId === ''}
                      style={{ ...BUTTON_STYLE, fontSize: '0.82em', padding: '3px 8px' }}
                    >
                      重新绑定
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ margin: '12px 0 0', color: MUTED, fontSize: '0.78em' }}>
        配置来源：profile 的 <code>cordis.patch.yml</code>，设置页保存的覆盖写入
        <code> ~/.dsh/storages/dsh-qq-relay/settings.json</code>。token 只写不读：页面永远看不到明文。
      </p>
    </div>
  )
}
