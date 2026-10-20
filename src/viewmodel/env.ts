/**
 * 「环境」二级页的呈现态与动作（client ViewModel 层，v0.23.0）。
 *
 * 数据源是 host 的 `GET /dsh-qq-relay/api/env`（步骤清单 + 动作目录 + 日志尾部）；
 * 动作走 `POST /dsh-qq-relay/api/env/action`（安装类要 confirm）。页面挂着时每 5 秒
 * 轮询；动作执行中（或 host 报告 running）加快到 2 秒。
 *
 * 不依赖 React 以外的运行时：不 import 任何 `@deepseek-ai/*`。
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  createRelaySettingsApi,
  type RelayEnvLogEntryView,
  type RelayEnvStatusView,
} from '../model/api.js'

const api = createRelaySettingsApi({ fetch: (input, init) => globalThis.fetch(input, init) })

/** 环境页拿到的全部状态与动作。 */
export interface RelayEnvModel {
  env: RelayEnvStatusView | null
  /** 动作日志（host 返回的尾部，已脱敏）。 */
  entries: RelayEnvLogEntryView[]
  /** 是否有动作请求在飞（命令类动作的后续进度看 env.running）。 */
  busy: boolean
  error: string | null
  notice: string | null
  /** open-webui 返回的链接（页面据此新开标签页）。 */
  webuiUrl: string | null
  refresh: () => void
  /** 执行一个白名单动作；confirm 必需的动作用 options.confirm。 */
  run: (action: string, options?: { confirm?: boolean; onDone?: () => void }) => void
  /** 打开 NapCat WebUI（token 由 host 拼进链接）。 */
  openWebui: () => void
}

/** 环境页状态与动作（挂载即拉一次，之后轮询）。 */
export function useRelayEnv(): RelayEnvModel {
  const [env, setEnv] = useState<RelayEnvStatusView | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [webuiUrl, setWebuiUrl] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const load = useCallback(async (reportError = false) => {
    const result = await api.getEnv()
    if (!mounted.current) return
    if (result.ok) {
      setEnv(result.value)
      // 探测失败不算页面错误：步骤清单里已经有可读的说明。
      if (reportError) setError(null)
    } else if (reportError) {
      setError(result.error.message)
    }
  }, [])

  useEffect(() => { void load(true) }, [load])

  useEffect(() => {
    const timer = setInterval(() => { void load(false) }, 5000)
    return () => clearInterval(timer)
  }, [load])

  const running = busy || (env !== null && env.running !== null)
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => { void load(false) }, 2000)
    return () => clearInterval(timer)
  }, [running, load])

  const run = useCallback(async (action: string, options?: { confirm?: boolean; onDone?: () => void }) => {
    setBusy(true)
    setError(null)
    setNotice(null)
    setWebuiUrl(null)
    const result = await api.envAction({ action, confirm: options?.confirm === true })
    if (!mounted.current) return
    setBusy(false)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setEnv(result.value.status)
    if (result.value.url !== undefined) {
      setWebuiUrl(result.value.url)
      setNotice('已生成 WebUI 链接。')
    } else if (result.value.accepted === true) {
      setNotice('已开始执行；完成后会自动刷新（日志见下方）。')
    } else {
      setNotice('动作已完成。')
    }
    options?.onDone?.()
  }, [])

  return {
    env,
    entries: env === null ? [] : env.log.entries,
    busy,
    error,
    notice,
    webuiUrl,
    refresh: () => { void load(true) },
    run: (action, options) => { void run(action, options) },
    openWebui: () => { void run('open-webui') },
  }
}
