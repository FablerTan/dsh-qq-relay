/**
 * ComfyUI 画图能力的 host Controller（v0.21.0）。
 *
 * 职责：
 *  1) 探测 `comfy.baseUrl` 的 ComfyUI 服务（`/system_stats` + `/queue`）；
 *  2) 连接成功且配置允许时，把插件自带的两个 skill（`comfy-image` 出图 /
 *     `comfy-video` 视频）注册到 `ctx.skills`（runtime skill，所有 cwd 的会话
 *     都能看到）；配置关闭时注销；
 *  3) 给配置页提供状态快照与「测试连接」探测结果。
 *
 * 生命周期与宿主服务解耦：`skills` 服务可能比本插件晚就绪（或不存在），
 * 由组合根 `ctx.inject(['skills'], ...)` 调 {@link createComfyController}.`attachSkills`；
 * 服务缺失时画面仍可探测，只是 skill 不加载（status.supported=false）。
 *
 * 注册策略（避免 ComfyUI 抖动导致 skill 反复进出会话目录）：
 *  - 首次连上、且 enabled && skillEnabled → 注册并保持（两个 skill 各自独立，
 *    一个模板坏了不影响另一个）；
 *  - 之后探测失败**不**注销（生成会失败，但目录不抖）；显式关闭配置才注销。
 *
 * 零外部依赖：只用 node: 内置模块与全局 fetch（可注入 fetchImpl 供单测）。
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  COMFY_SKILLS,
  DEFAULT_COMFY,
  renderComfySkillContent,
} from '../model/comfy.js'

/** 插件内 skill 目录：<plugin>/lib/skills/comfy-image。 */
export const COMFY_SKILL_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills', 'comfy-image')

/** 默认探测间隔（毫秒）：服务晚于插件启动才可用时，靠它自动补注册。 */
export const COMFY_CHECK_INTERVAL_MS = 60 * 1000

/** 状态快照的初始探测字段。 */
function idleProbe() {
  return {
    reachable: false,
    checking: false,
    checkedAt: 0,
    error: '',
    version: '',
    device: '',
    queue: { running: 0, pending: 0 },
  }
}

function messageOf(error) {
  if (error === null || error === undefined) return '未知错误'
  if (typeof error === 'string') return error
  const message = typeof error.message === 'string' && error.message !== '' ? error.message : String(error)
  return message
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** 超时信号：优先 AbortSignal.timeout（Node 18+），否则手写 AbortController。 */
function timeoutSignal(timeoutMs) {
  try {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      return AbortSignal.timeout(timeoutMs)
    }
  } catch {}
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    if (typeof timer.unref === 'function') timer.unref()
    return controller.signal
  } catch {
    return undefined
  }
}

/** GET 一个 JSON 接口；非 2xx / 解析失败都抛错。 */
async function getJson(url, { fetchImpl, timeoutMs }) {
  if (typeof fetchImpl !== 'function') throw new Error('当前宿主没有 fetch 实现')
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: { accept: 'application/json' },
    signal: timeoutSignal(timeoutMs),
  })
  if (response === null || typeof response !== 'object' || response.ok !== true) {
    const status = response !== null && typeof response === 'object' ? response.status : undefined
    throw new Error(typeof status === 'number' ? 'HTTP ' + String(status) : '请求失败')
  }
  let text = ''
  if (typeof response.text === 'function') {
    text = await response.text()
  } else if (typeof response.json === 'function') {
    return await response.json()
  }
  if (text === '') return null
  return JSON.parse(text)
}

function queueLength(value) {
  return Array.isArray(value) ? value.length : 0
}

/**
 * 探测一个 ComfyUI 实例。
 *
 * @param options.baseUrl - 服务地址（尾部斜杠会被去掉）
 * @param options.timeoutMs - 单请求超时（毫秒）
 * @param options.fetchImpl - fetch 实现（单测注入；默认 globalThis.fetch）
 * @returns 探测快照：`{ target, reachable, version, device, queue, error, checkedAt, latencyMs }`
 */
export async function probeComfy({ baseUrl, timeoutMs = 30000, fetchImpl = globalThis.fetch } = {}) {
  const target = typeof baseUrl === 'string' ? baseUrl.trim().replace(/\/+$/u, '') : ''
  const checkedAt = Date.now()
  const started = Date.now()
  const timeout = Number.isInteger(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_COMFY.timeoutMs
  if (target === '') {
    return {
      target,
      reachable: false,
      version: '',
      device: '',
      queue: { running: 0, pending: 0 },
      error: 'ComfyUI 地址为空',
      checkedAt,
      latencyMs: 0,
    }
  }
  try {
    const stats = await getJson(target + '/system_stats', { fetchImpl, timeoutMs: timeout })
    const system = isPlainObject(stats) && isPlainObject(stats.system) ? stats.system : {}
    const devices = isPlainObject(stats) && Array.isArray(stats.devices) ? stats.devices : []
    const firstDevice = devices.find((device) => isPlainObject(device)) ?? null
    let queue = { running: 0, pending: 0 }
    try {
      const queueData = await getJson(target + '/queue', { fetchImpl, timeoutMs: timeout })
      queue = {
        running: queueLength(queueData?.queue_running),
        pending: queueLength(queueData?.queue_pending),
      }
    } catch {
      // /queue 失败不影响「连得上」的结论。
    }
    return {
      target,
      reachable: true,
      version: typeof system.comfyui_version === 'string' ? system.comfyui_version : '',
      device: firstDevice !== null && typeof firstDevice.name === 'string' ? firstDevice.name : '',
      queue,
      error: '',
      checkedAt,
      latencyMs: Date.now() - started,
    }
  } catch (error) {
    const name = isPlainObject(error) || error instanceof Error ? error.name : ''
    const detail = name === 'TimeoutError' || name === 'AbortError'
      ? '连接超时（' + String(timeout) + 'ms）'
      : messageOf(error)
    return {
      target,
      reachable: false,
      version: '',
      device: '',
      queue: { running: 0, pending: 0 },
      error: '连不上 ComfyUI：' + detail,
      checkedAt,
      latencyMs: Date.now() - started,
    }
  }
}

/**
 * 构造 ComfyUI 画图 controller。
 *
 * @param options.getConfig - `() => config.comfy`（配置无效时返回默认段）
 * @param options.log - `{ info?, warn?, error? }` 日志回调
 * @param options.fetchImpl - fetch 实现（单测注入）
 * @param options.skillDir - skill 目录（单测注入临时目录；需含 SKILL.md 与 SKILL-video.md）
 * @returns 控制器；方法见各函数注释
 */
export function createComfyController({
  getConfig,
  log = {},
  fetchImpl = globalThis.fetch,
  skillDir = COMFY_SKILL_DIR,
  checkIntervalMs = COMFY_CHECK_INTERVAL_MS,
} = {}) {
  const info = typeof log.info === 'function' ? log.info : () => {}
  const warn = typeof log.warn === 'function' ? log.warn : () => {}
  const state = idleProbe()
  let skillsService = null
  /** name → { loaded, error, dispose }（每个 skill 独立记录，互不影响）。 */
  const skillStates = new Map()
  /** 模板文件 → 正文缓存（同一个 skill 目录里两个模板）。 */
  const templateCache = new Map()
  let timer = null
  let disposed = false
  let queue = Promise.resolve()

  function configOf() {
    const raw = typeof getConfig === 'function' ? getConfig() : null
    return isPlainObject(raw) ? { ...DEFAULT_COMFY, ...raw } : DEFAULT_COMFY
  }

  /** 读某个 skill 的模板（带缓存；模板文件缺失时抛错）。 */
  function readTemplate(definition) {
    const cached = templateCache.get(definition.template)
    if (cached !== undefined) return cached
    const text = readFileSync(join(skillDir, definition.template), 'utf8')
    templateCache.set(definition.template, text)
    return text
  }

  /** 把缺失的 skill 注册给 DSH；单个失败只记该 skill 的 error，不影响另一个。 */
  function registerSkills(config) {
    if (skillsService === null) {
      for (const definition of COMFY_SKILLS) {
        const current = skillStates.get(definition.name)
        if (current !== undefined && current.loaded) continue
        skillStates.set(definition.name, {
          loaded: false,
          error: '宿主没有 skills 服务，无法加载 ' + definition.name + ' skill',
          dispose: null,
        })
      }
      return
    }
    for (const definition of COMFY_SKILLS) {
      const current = skillStates.get(definition.name)
      if (current !== undefined && current.loaded) continue
      try {
        const template = readTemplate(definition)
        const content = renderComfySkillContent(template, { baseUrl: config.baseUrl, skillDir })
        const dispose = skillsService.register({
          name: definition.name,
          description: definition.description,
          whenToUse: definition.whenToUse,
          content,
          source: 'custom',
          provider: 'dsh-qq-relay',
          path: join(skillDir, definition.template),
          resourceBase: { kind: 'directory', path: skillDir },
        })
        skillStates.set(definition.name, {
          loaded: true,
          error: '',
          dispose: typeof dispose === 'function' ? dispose : null,
        })
        info('[comfy] 已加载 skill ' + definition.name + '（' + config.baseUrl + '）')
      } catch (error) {
        const message = 'skill ' + definition.name + ' 加载失败：' + messageOf(error)
        skillStates.set(definition.name, { loaded: false, error: message, dispose: null })
        warn('[comfy] ' + message)
      }
    }
  }

  /** 注销全部 skill（幂等）。 */
  function unregisterSkills() {
    for (const [name, entry] of skillStates) {
      if (entry.dispose !== null) {
        try { entry.dispose() } catch {}
      }
      if (entry.loaded) info('[comfy] 已卸载 skill ' + name)
    }
    skillStates.clear()
  }

  /** 执行一次探测 + skill 同步；调用方不应直接调，走 refresh() 排队。 */
  async function doRefresh() {
    if (disposed) return status()
    const config = configOf()
    if (!config.enabled) {
      unregisterSkills()
      return status()
    }
    state.checking = true
    try {
      const probe = await probeComfy({ baseUrl: config.baseUrl, timeoutMs: config.timeoutMs, fetchImpl })
      state.reachable = probe.reachable
      state.checkedAt = probe.checkedAt
      state.error = probe.error
      state.version = probe.version
      state.device = probe.device
      state.queue = { ...probe.queue }
      if (probe.reachable) {
        if (config.skillEnabled) registerSkills(config)
        else unregisterSkills()
      } else if (!config.skillEnabled) {
        // 连不上且配置已关闭 skill：确保不残留注册。
        unregisterSkills()
      }
    } catch (error) {
      state.error = '探测 ComfyUI 失败：' + messageOf(error)
      warn('[comfy] ' + state.error)
    } finally {
      state.checking = false
    }
    return status()
  }

  /** 状态快照（配置页轮询的数据源）。 */
  function status() {
    const config = configOf()
    return {
      enabled: config.enabled,
      baseUrl: config.baseUrl,
      timeoutMs: config.timeoutMs,
      skillEnabled: config.skillEnabled,
      supported: skillsService !== null,
      reachable: state.reachable,
      checking: state.checking,
      checkedAt: state.checkedAt,
      error: state.error,
      version: state.version,
      device: state.device,
      queue: { running: state.queue.running, pending: state.queue.pending },
      skills: COMFY_SKILLS.map((definition) => {
        const entry = skillStates.get(definition.name)
        return {
          name: definition.name,
          loaded: entry !== undefined && entry.loaded === true,
          error: entry === undefined ? '' : entry.error,
        }
      }),
    }
  }

  /**
   * 重新探测并同步 skill（串行执行，页面 / 保存 / 定时器可并发调用）。
   * @returns 最新状态快照
   */
  function refresh() {
    const run = queue.then(() => doRefresh(), () => doRefresh())
    queue = run.then(() => undefined, () => undefined)
    return run
  }

  /** 状态轮询用：超过 maxAgeMs 没有探测过就后台刷新（不阻塞）。 */
  function ensureFresh(maxAgeMs = 30 * 1000) {
    if (disposed || state.checking) return
    const config = configOf()
    if (!config.enabled) return
    if (Date.now() - state.checkedAt >= maxAgeMs) void refresh()
  }

  /**
   * 「测试连接」：只探测，不改状态、不改 skill 注册。
   *
   * @param options.baseUrl - 目标地址（缺省用当前配置）
   * @param options.timeoutMs - 超时（缺省用当前配置）
   * @returns 探测快照（含 latencyMs）
   */
  function test({ baseUrl, timeoutMs } = {}) {
    const config = configOf()
    const target = typeof baseUrl === 'string' && baseUrl.trim() !== ''
      ? baseUrl.trim().replace(/\/+$/u, '')
      : config.baseUrl
    const timeout = Number.isInteger(timeoutMs) && timeoutMs > 0 ? timeoutMs : config.timeoutMs
    return probeComfy({ baseUrl: target, timeoutMs: timeout, fetchImpl })
  }

  /** 挂到 `ctx.skills` 服务；挂上后立即探测一次。 */
  function attachSkills(service) {
    if (disposed) return
    skillsService = service ?? null
    void refresh()
  }

  /** 宿主服务卸载：注销全部 skill 并忘记服务。 */
  function detachSkills() {
    unregisterSkills()
    skillsService = null
  }

  /** 启动周期性探测（服务晚于插件可用时自动补注册）；重复调用无副作用。 */
  function start() {
    if (timer !== null || disposed) return
    timer = setInterval(() => {
      const config = configOf()
      if (!config.enabled || state.checking) return
      if (Date.now() - state.checkedAt >= checkIntervalMs) void refresh()
    }, checkIntervalMs)
    if (typeof timer.unref === 'function') timer.unref()
  }

  /** 插件卸载：停定时器、注销全部 skill。 */
  function dispose() {
    if (disposed) return
    disposed = true
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
    unregisterSkills()
    skillsService = null
  }

  return { status, refresh, ensureFresh, test, attachSkills, detachSkills, start, dispose, supported: () => skillsService !== null }
}
