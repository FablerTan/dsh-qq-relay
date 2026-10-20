/**
 * 环境一键配置的 host Controller（P12 / v0.23.0）。
 *
 * 职责：
 *  1) 探测本机 NapCat Docker 环境的 7 个步骤（docker CLI / 引擎 / compose / 容器 /
 *     登录 / OneBot 配置 / 插件回填），结果交给 `model/env.js` 求值；
 *  2) 执行白名单动作：固定 argv（不经 shell）、只写环境目录里的两个文件、回填插件配置；
 *  3) 给「环境」页提供状态快照（步骤 + 动作 + 动作日志尾部）。
 *
 * 生命周期：没有定时器；页面轮询 `GET /api/env` 时由 {@link ensureFresh} 触发后台重探。
 * 命令全部 `spawn` + 参数数组（`shell: false`），安装类动作必须显式确认。
 *
 * 零外部依赖：只用 node: 内置模块。
 */

import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import {
  DEFAULT_ENVIRONMENT,
  ENV_ACTIONS,
  ENV_COMMAND_TIMEOUT_MS,
  ENV_COMPOSE_NAME,
  ENV_CONTAINER_NAME,
  ENV_ONEBOT_PORT,
  ENV_PLATFORMS,
  ENV_PROBE_MAX_AGE_MS,
  ENV_PROBE_TIMEOUT_MS,
  ENV_STEPS,
  ENV_WEBUI_PORT,
  actionView,
  buildActionArgv,
  computeFixSequence,
  createLogBuffer,
  evaluateEnvSteps,
  expandHome,
  isEnvActionId,
  nextEnvStep,
  normalizeEnvConfig,
  parseComposeFile,
  parseWsUrl,
  renderComposeFile,
  validateOneBotConfig,
} from '../model/env.js'

/** 一键修复最多推进的轮数（每轮一个动作；防止没有推进时死循环）。 */
const ENV_FIX_MAX_ROUNDS = 12

/** 探测失败时的兜底快照（页面仍能渲染「未探测」）。 */
function emptyProbe(platform) {
  return {
    platform,
    docker: { ok: false, version: '', error: '' },
    compose: { ok: false, version: '', error: '' },
    daemon: { ok: false, serverVersion: '', provider: '', directError: '', error: '', endpoint: '', endpointExists: null, attempts: [] },
    contexts: { current: '', list: [], error: '' },
    engines: { colima: { installed: false, running: false }, orbstack: { installed: false }, dockerDesktop: { installed: false } },
    colima: { running: false, error: '' },
    composeFile: { path: null, tokenPresent: false, containerName: ENV_CONTAINER_NAME, ports: [], error: '' },
    container: { name: ENV_CONTAINER_NAME, state: '', running: false, error: '' },
    login: { uin: 0, file: '' },
    onebot: null,
    relay: { started: false, connected: false, selfId: 0, wsUrl: '', accessTokenConfigured: false, accessToken: '' },
  }
}

/** 路径存在（不抛异常）。 */
function pathExists(path) {
  try {
    return path !== '' && existsSync(path)
  } catch {
    return false
  }
}

/** unix:// endpoint 的 socket 是否还在；非 unix:// 返回 null（无法判断）。 */
function endpointExistsOf(endpoint) {
  if (typeof endpoint !== 'string' || !endpoint.startsWith('unix://')) return null
  return pathExists(endpoint.slice('unix://'.length))
}

function messageOf(error) {
  if (error === null || error === undefined) return '未知错误'
  if (typeof error === 'string') return error
  const message = typeof error.message === 'string' && error.message !== '' ? error.message : String(error)
  return message
}

/**
 * 探测命令失败时的可读原因。
 *
 * docker / colima 都把真正的原因写在 stderr（例如 "failed to connect to the docker API at
 * unix:///var/run/docker.sock"），只显示「退出码 1」等于什么都没说。
 */
function probeMessage(result, fallback = '命令执行失败') {
  const stderr = typeof result?.stderr === 'string' ? result.stderr.trim() : ''
  const stdout = typeof result?.stdout === 'string' ? result.stdout.trim() : ''
  const lines = (stderr !== '' ? stderr : stdout)
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line !== '')
  if (lines.length > 0) return lines[lines.length - 1].slice(0, 300)
  if (typeof result?.error === 'string' && result.error !== '') return result.error
  return fallback
}

/** 命令输出按行截断（避免一次安装刷爆日志缓冲）。 */
function tailLines(text, maxLines = 60, maxChars = 4000) {
  const value = typeof text === 'string' ? text.trim() : ''
  if (value === '') return []
  const lines = value.split(/\r?\n/u)
  const sliced = lines.length > maxLines ? lines.slice(-maxLines) : lines
  const out = []
  let chars = 0
  for (const line of sliced) {
    if (chars + line.length > maxChars) break
    out.push(line)
    chars += line.length + 1
  }
  return out
}

/**
 * 默认命令执行器：spawn + 参数数组，超时 SIGKILL，输出有上限。
 *
 * @param bin - 可执行文件（白名单动作给出的固定值）
 * @param args - 固定参数数组（不会经过 shell）
 * @param options.timeoutMs - 超时（毫秒）
 * @param options.cwd - 工作目录（可选）
 * @param options.maxBytes - 单路输出上限（默认 256 KiB）
 * @returns `{ ok, code, signal, stdout, stderr, timedOut, error }`（**永不 reject**）
 */
export function runCommand(bin, args, { timeoutMs = ENV_PROBE_TIMEOUT_MS, cwd = '', maxBytes = 256 * 1024 } = {}) {
  return new Promise((resolve) => {
    let child
    try {
      child = spawn(bin, Array.isArray(args) ? args : [], {
        cwd: typeof cwd === 'string' && cwd !== '' ? cwd : undefined,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      })
    } catch (error) {
      resolve({ ok: false, code: null, signal: null, stdout: '', stderr: '', timedOut: false, error: messageOf(error) })
      return
    }
    let stdout = ''
    let stderr = ''
    let settled = false
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      try { child.kill('SIGKILL') } catch {}
    }, timeoutMs)
    if (typeof timer.unref === 'function') timer.unref()
    const append = (target, chunk) => {
      const text = chunk.toString('utf8')
      if (target === 'out') {
        if (stdout.length < maxBytes) stdout += text.slice(0, maxBytes - stdout.length)
      } else if (stderr.length < maxBytes) {
        stderr += text.slice(0, maxBytes - stderr.length)
      }
    }
    child.stdout?.on('data', (chunk) => { append('out', chunk) })
    child.stderr?.on('data', (chunk) => { append('err', chunk) })
    child.on('error', (error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({ ok: false, code: null, signal: null, stdout, stderr, timedOut: false, error: messageOf(error) })
    })
    child.on('close', (code, signal) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({
        ok: code === 0 && !timedOut,
        code,
        signal: signal ?? null,
        stdout,
        stderr,
        timedOut,
        error: timedOut
          ? '命令超时（' + String(Math.round(timeoutMs / 1000)) + 's）'
          : (code === 0 ? '' : '退出码 ' + String(code)),
      })
    })
  })
}

/**
 * 构造环境 controller。
 *
 * @param options.getConfig - `() => config.environment`（配置无效时返回默认段）
 * @param options.getRelayInfo - `() => { started, connected, selfId, wsUrl, accessToken }`
 * @param options.backfill - `(values) => { ok, value?, code?, message? }`：回填插件配置（组合根注入保存 + 重连）
 * @param options.log - `{ info?, warn?, error? }` 日志回调
 * @param options.run - 命令执行器（单测注入；默认 {@link runCommand}）
 * @param options.platform - 平台（默认 process.platform）
 * @param options.now - 时间源（单测注入）
 * @returns 控制器；方法见各函数注释
 */
export function createEnvController({
  getConfig,
  getRelayInfo,
  backfill,
  log = {},
  run = runCommand,
  platform = process.platform,
  now = () => Date.now(),
} = {}) {
  const info = typeof log.info === 'function' ? log.info : () => {}
  const warn = typeof log.warn === 'function' ? log.warn : () => {}
  const buffer = createLogBuffer({ now })
  /** 最近一次探测快照（含 token 等敏感值，**绝不直接序列化**）。 */
  let probe = null
  let checkedAt = 0
  let checking = false
  /** 正在执行的动作：`{ action, startedAt }` 或 null。 */
  let running = null
  let disposed = false
  let queue = Promise.resolve()
  /** 直连 docker 失败时自动改用的 context 名（任意引擎，例如 colima / orbstack / default）；每轮探测重算。 */
  let dockerContext = ''

  /** 给 docker 命令加上 context（直连 endpoint 连不上时的兜底）。 */
  function dockerArgs(args) {
    return dockerContext === '' ? args : ['--context', dockerContext, ...args]
  }

  /** 把 context 兜底应用到动作命令规格上（只对 docker 生效，已是 error 的原样返回）。 */
  function applyDockerContext(spec) {
    if (spec === null || typeof spec !== 'object' || spec.error !== undefined) return spec
    if (dockerContext === '' || spec.bin !== 'docker') return spec
    return { ...spec, args: ['--context', dockerContext, ...spec.args] }
  }

  const relayInfo = () => {
    try {
      const value = typeof getRelayInfo === 'function' ? getRelayInfo() : null
      return value !== null && typeof value === 'object' ? value : emptyProbe(platform).relay
    } catch {
      return emptyProbe(platform).relay
    }
  }

  function configOf() {
    const raw = typeof getConfig === 'function' ? getConfig() : null
    return normalizeEnvConfig(raw, [])
  }

  function dirOf(config) {
    return expandHome(config.dir)
  }

  /** 当前已知 secret（日志脱敏用）。 */
  function secrets() {
    const list = [configOf().webuiToken, relayInfo().accessToken]
    if (probe !== null && probe.onebot !== null && typeof probe.onebot.token === 'string') list.push(probe.onebot.token)
    return list
  }

  function logLine(level, text) {
    return buffer.append(level, text, secrets())
  }

  async function execProbe(bin, args, timeoutMs = ENV_PROBE_TIMEOUT_MS) {
    try {
      const result = await run(bin, args, { timeoutMs })
      return result !== null && typeof result === 'object' ? result : { ok: false, error: '执行器没有返回结果' }
    } catch (error) {
      return { ok: false, stdout: '', stderr: '', error: messageOf(error) }
    }
  }

  /**
   * 读 docker 认的 context 列表（endpoint / 当前 context）。
   *
   * 用途：直连失败时知道还能试哪些 endpoint，也才能说清「docker 当前指向哪个引擎」。
   * 失败只当作「没有 context 信息」，不影响其余探测。
   */
  async function probeDockerContexts() {
    const result = await execProbe('docker', ['context', 'ls', '--format', '{{json .}}'], 8000)
    const list = []
    if (result.ok === true) {
      for (const line of String(result.stdout || '').split('\n')) {
        const text = line.trim()
        if (!text.startsWith('{')) continue
        try {
          const item = JSON.parse(text)
          if (item === null || typeof item !== 'object' || Array.isArray(item)) continue
          const name = typeof item.Name === 'string' ? item.Name : ''
          if (name === '') continue
          list.push({
            name,
            endpoint: typeof item.DockerEndpoint === 'string' ? item.DockerEndpoint : '',
            current: item.Current === true,
          })
        } catch {
          // 坏行（版本差异 / 被截断）忽略即可。
        }
      }
    }
    const current = list.find((item) => item.current === true)
    return { current: current === undefined ? '' : current.name, list, error: result.ok === true ? '' : probeMessage(result, '') }
  }

  /**
   * 等 daemon 起来（`open -a OrbStack` / `open -a Docker` 是立即返回的，
   * 不等待就会误判成「执行了但没推进」）。
   */
  async function waitDaemonUp(timeoutMs) {
    const deadline = now() + timeoutMs
    for (;;) {
      const check = await execProbe('docker', dockerArgs(['info', '--format', '{{.ServerVersion}}']), 8000)
      if (check.ok === true) return true
      if (disposed || now() >= deadline) return false
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
  }

  /** 读环境目录里的 compose 文件（存在优先 compose.yaml）。 */
  function readCompose(dirAbs) {
    const candidates = [join(dirAbs, ENV_COMPOSE_NAME), join(dirAbs, 'docker-compose.yml'), join(dirAbs, 'docker-compose.yaml')]
    for (const path of candidates) {
      try {
        if (!existsSync(path)) continue
        const stat = statSync(path)
        if (!stat.isFile() || stat.size > 256 * 1024) {
          return { path, tokenPresent: false, containerName: ENV_CONTAINER_NAME, ports: [], error: 'compose 文件异常（过大或不是普通文件）' }
        }
        const parsed = parseComposeFile(readFileSync(path, 'utf8'))
        return { path, ...parsed, error: '' }
      } catch (error) {
        return { path, tokenPresent: false, containerName: ENV_CONTAINER_NAME, ports: [], error: messageOf(error) }
      }
    }
    return { path: null, tokenPresent: false, containerName: ENV_CONTAINER_NAME, ports: [], error: '' }
  }

  /** 找登录后的 NapCat 配置文件（data/config/onebot11_<uin>.json）。 */
  function readOneBot(dirAbs, expectedPort) {
    const configDir = join(dirAbs, 'data', 'config')
    let entries = []
    try {
      entries = readdirSync(configDir)
    } catch {
      return { login: { uin: 0, file: '' }, onebot: null }
    }
    const candidates = entries.filter((name) => /^onebot11_\d+\.json$/u.test(name))
    if (candidates.length === 0) return { login: { uin: 0, file: '' }, onebot: null }
    const file = join(configDir, candidates[0])
    const login = { uin: Number(candidates[0].match(/^onebot11_(\d+)\.json$/u)?.[1] ?? 0), file }
    try {
      const text = readFileSync(file, 'utf8')
      const parsedJson = JSON.parse(text)
      const parsed = validateOneBotConfig(parsedJson, { expectedPort })
      return {
        login,
        onebot: {
          file,
          uin: login.uin,
          port: parsed.port,
          token: parsed.token,
          ready: parsed.ready,
          issues: parsed.issues,
          reportSelfMessage: parsed.reportSelfMessage,
          messagePostFormat: parsed.messagePostFormat,
          error: '',
        },
      }
    } catch (error) {
      return {
        login,
        onebot: { file, uin: login.uin, port: 0, token: '', ready: false, issues: [], error: messageOf(error) },
      }
    }
  }

  /** 执行一次完整探测（串行；页面轮询时按需后台跑）。 */
  async function doRefresh() {
    if (disposed) return
    const config = configOf()
    const dirAbs = dirOf(config)
    const next = emptyProbe(platform)
    next.composeFile = readCompose(dirAbs)

    if (ENV_PLATFORMS.includes(platform)) {
      const docker = await execProbe('docker', ['--version'], 8000)
      next.docker = {
        ok: docker.ok === true,
        version: docker.ok === true ? String(docker.stdout || docker.stderr || '').trim() : '',
        error: docker.ok === true ? '' : (docker.error || '找不到 docker 命令'),
      }
      const compose = await execProbe('docker', ['compose', 'version'], 10000)
      next.compose = {
        ok: compose.ok === true,
        version: compose.ok === true ? String(compose.stdout || compose.stderr || '').trim() : '',
        error: compose.ok === true ? '' : (compose.error || 'compose 不可用'),
      }
      const contexts = await probeDockerContexts()
      next.contexts = contexts
      const currentContext = contexts.list.find((item) => item.current === true) ?? null
      let daemon = await execProbe('docker', ['info', '--format', '{{.ServerVersion}}'], 10000)
      let directError = ''
      let context = ''
      let endpoint = currentContext === null ? '' : currentContext.endpoint
      const attempts = []
      if (daemon.ok !== true) {
        directError = probeMessage(daemon, 'docker info 失败')
        // 直连 endpoint 可能被 docker context / DOCKER_HOST 指到别的（甚至已经卸装的）引擎：
        // 逐个试列出来的 context，谁通了就整轮沿用它（动作命令也带 --context）。
        for (const item of contexts.list) {
          if (item.current === true || item.name === '' || item.name === 'default') continue
          const retry = await execProbe('docker', ['--context', item.name, 'info', '--format', '{{.ServerVersion}}'], 10000)
          if (retry.ok === true) {
            daemon = retry
            context = item.name
            endpoint = item.endpoint
            break
          }
          attempts.push({ name: item.name, error: probeMessage(retry, '失败') })
        }
      }
      dockerContext = context
      next.daemon = {
        ok: daemon.ok === true,
        serverVersion: daemon.ok === true ? String(daemon.stdout || '').trim() : '',
        provider: context,
        directError: daemon.ok === true ? directError : '',
        endpoint,
        endpointExists: endpointExistsOf(endpoint),
        attempts: daemon.ok === true ? [] : attempts,
        error: daemon.ok === true ? '' : directError,
      }
      if (platform === 'darwin') {
        const colima = await execProbe('colima', ['status'], 8000)
        const colimaError = colima.ok === true ? '' : probeMessage(colima, 'colima status 失败')
        next.colima = { running: colima.ok === true, error: colimaError }
        // 引擎装没装：没装就不要给「启动引擎」这种注定失败的动作。
        const rawColimaError = colimaError + ' ' + String(colima.error ?? '') + ' ' + String(colima.stderr ?? '')
        const colimaInstalled = colima.ok === true || !/not found|no such file|ENOENT|cannot find|未找到/iu.test(rawColimaError)
        next.engines = {
          colima: { installed: colimaInstalled, running: colima.ok === true },
          orbstack: { installed: pathExists('/Applications/OrbStack.app') || pathExists(join(homedir(), '.orbstack')) },
          dockerDesktop: { installed: pathExists('/Applications/Docker.app') },
        }
      }
      if (next.daemon.ok) {
        const containerName = next.composeFile.containerName || ENV_CONTAINER_NAME
        const inspect = await execProbe(
          'docker',
          dockerArgs(['inspect', '--format', '{{.State.Status}}', containerName]),
          10000,
        )
        const state = inspect.ok === true ? String(inspect.stdout || '').trim() : ''
        next.container = {
          name: containerName,
          state,
          running: state === 'running',
          error: state === '' ? (inspect.error || 'docker inspect 失败') : '',
        }
      }
      const expectedPort = parseWsUrl(relayInfo().wsUrl)?.port ?? ENV_ONEBOT_PORT
      const read = readOneBot(dirAbs, expectedPort)
      next.login = read.login
      next.onebot = read.onebot
    }
    next.relay = relayInfo()
    probe = next
    checkedAt = now()
  }

  /**
   * 重新探测（并发调用会排队；失败只记日志不抛）。
   * @returns 最新状态快照
   */
  function refresh() {
    const runNext = queue.then(async () => {
      if (disposed) return status()
      checking = true
      try {
        await doRefresh()
      } catch (error) {
        warn('[env] 环境探测失败：' + messageOf(error))
      } finally {
        checking = false
      }
      return status()
    }, async () => {
      checking = true
      try {
        await doRefresh()
      } catch (error) {
        warn('[env] 环境探测失败：' + messageOf(error))
      } finally {
        checking = false
      }
      return status()
    })
    queue = runNext.then(() => undefined, () => undefined)
    return runNext
  }

  /** 状态轮询用：探测过期 / 从没探测过就后台刷新（不阻塞）。 */
  function ensureFresh(maxAgeMs = ENV_PROBE_MAX_AGE_MS) {
    if (disposed || checking) return
    if (probe !== null && now() - checkedAt < maxAgeMs) return
    // 先置 checking，第一次 GET /api/env 就能告诉页面「正在检查」，而不是拿空探测结果报错。
    checking = true
    void refresh()
  }

  /**
   * 一键修复计划：告诉页面「点下去会依次执行什么」以及是否需要先确认。
   *
   * needsConfirm = 计划里有安装 / 启动引擎，或要覆盖已存在的 compose 文件
   * （页面据此弹一次确认；host 在 {@link action} 里同样强制校验，不只靠页面）。
   */
  function fixPlanOf(steps) {
    const sequence = computeFixSequence(steps)
    const titles = sequence.map((id) => (isEnvActionId(id) ? ENV_ACTIONS[id].title : id))
    const overwriteCompose = sequence.includes('write-compose') && probe !== null && probe.composeFile.path !== null
    return {
      sequence,
      titles,
      needsConfirm: sequence.includes('install-docker') || sequence.includes('install-orbstack')
        || sequence.includes('start-daemon') || sequence.includes('restart-daemon') || overwriteCompose,
      next: nextEnvStep(steps),
    }
  }

  function snapshotOf(config) {
    const evaluated = probe === null
      ? evaluateEnvSteps(emptyProbe(platform), config)
      : evaluateEnvSteps(probe, config)
    const supported = ENV_PLATFORMS.includes(platform)
    const visibleSteps = config.enabled ? evaluated.steps : []
    return {
      supported,
      platform,
      enabled: config.enabled,
      dir: config.dir,
      webuiTokenConfigured: config.webuiToken !== '',
      checking,
      checkedAt,
      running: running === null ? null : { action: running.action, startedAt: running.startedAt },
      summary: evaluated.summary,
      steps: visibleSteps,
      fixPlan: fixPlanOf(visibleSteps),
      actions: Object.keys(ENV_ACTIONS).map((id) => actionView(id)).filter((view) => view !== null),
      log: {
        cursor: buffer.cursor(),
        entries: buffer.tail(60),
      },
    }
  }

  /** 状态快照（配置页轮询的数据源；**永不包含 token**）。 */
  function status() {
    return snapshotOf(configOf())
  }

  function fail(code, message) {
    return { ok: false, code, message }
  }

  function okValue(action, extra = {}) {
    return {
      ok: true,
      value: {
        action,
        status: status(),
        logCursor: buffer.cursor(),
        ...extra,
      },
    }
  }

  /** 把一次命令结果写进动作日志（stdout / stderr 各截断）。 */
  function logCommandResult(command, result) {
    logLine('info', '$ ' + command)
    for (const line of tailLines(result.stdout)) logLine('info', line)
    for (const line of tailLines(result.stderr)) logLine(result.ok === true ? 'warn' : 'error', line)
    if (result.ok === true) {
      logLine('info', '完成：' + command)
    } else if (result.timedOut === true) {
      logLine('error', '超时：' + command)
    } else {
      logLine('error', '失败：' + command + '（' + (result.error || '未知错误') + '）')
    }
  }

  /** 命令类动作：后台执行，立即返回 accepted（安装可能要几分钟）。 */
  function startCommandAction(id, spec) {
    running = { action: id, startedAt: now() }
    const command = [spec.bin, ...spec.args].join(' ')
    logLine('info', '开始：' + ENV_ACTIONS[id].title)
    void (async () => {
      try {
        const result = await run(spec.bin, spec.args, { timeoutMs: ENV_COMMAND_TIMEOUT_MS, cwd: spec.cwd || '' })
        logCommandResult(command, result)
        // open -a 是立即返回的：等引擎把 daemon 起来，否则页面会先看到「未运行」。
        if (result.ok === true && (id === 'start-orbstack' || id === 'start-docker-desktop')) {
          const up = await waitDaemonUp(25000)
          logLine(up ? 'info' : 'warn', up ? '容器引擎已响应 docker info' : '等了 25 秒容器引擎仍未就绪')
        }
      } catch (error) {
        logLine('error', '执行失败：' + messageOf(error))
      } finally {
        running = null
        await refresh()
        info('[env] 动作 ' + id + ' 结束')
      }
    })()
    return okValue(id, { accepted: true })
  }

  /** 直接写 compose 文件（调用方负责确认覆盖）。 */
  function writeCompose(config, { allowOverwrite }) {
    if (config.webuiToken === '') return fail('ENV_TOKEN_MISSING', '先在环境配置里填 WebUI token（compose 需要它）。')
    const dirAbs = dirOf(config)
    const existing = readCompose(dirAbs)
    if (existing.path !== null && !allowOverwrite) {
      return fail('ENV_OVERWRITE_CONFIRM', 'compose 文件已存在（' + existing.path + '）；确认覆盖后重试。')
    }
    const target = existing.path !== null ? existing.path : join(dirAbs, ENV_COMPOSE_NAME)
    try {
      mkdirSync(dirAbs, { recursive: true })
      writeFileSync(target, renderComposeFile({ webuiToken: config.webuiToken }), 'utf8')
      logLine('info', '已写入 compose 文件：' + target)
      return { ok: true, target }
    } catch (error) {
      return fail('ENV_ACTION_FAILED', '写 compose 文件失败：' + messageOf(error))
    }
  }

  /** 把 token / 端口 / array / reportSelfMessage=false 写进登录后的 OneBot 配置。 */
  async function writeOneBot(config) {
    if (probe === null || probe.onebot === null || probe.onebot.file === '') {
      return fail('ENV_NOT_READY', '还没找到登录后的 OneBot 配置：先扫码登录。')
    }
    const relay = relayInfo()
    const expectedPort = parseWsUrl(relay.wsUrl)?.port ?? ENV_ONEBOT_PORT
    const file = probe.onebot.file
    try {
      const parsed = JSON.parse(readFileSync(file, 'utf8'))
      const network = parsed !== null && typeof parsed === 'object' && parsed.network !== null && typeof parsed.network === 'object'
        ? parsed.network
        : parsed
      if (network === null || typeof network !== 'object') return fail('ENV_ACTION_FAILED', 'OneBot 配置结构无法识别。')
      const servers = Array.isArray(network.websocketServers) ? network.websocketServers : []
      let server = servers.find((entry) => entry !== null && typeof entry === 'object' && entry.enable === true)
      if (server === undefined) {
        server = servers.find((entry) => entry !== null && typeof entry === 'object')
      }
      if (server === undefined) {
        server = { name: 'ws' }
        servers.push(server)
      }
      // token 三选一：插件已有 → 用它；OneBot 已有 → 保留（回填会同步到插件）；
      // 两边都空 → 生成随机 token（否则「扫码后一键修复」永远卡在缺 token，回填也无从取值）。
      const pluginToken = relay.accessTokenConfigured === true && typeof relay.accessToken === 'string' ? relay.accessToken : ''
      const existingToken = typeof server.token === 'string' ? server.token : ''
      const generated = pluginToken === '' && existingToken === ''
      const token = pluginToken !== '' ? pluginToken : (existingToken !== '' ? existingToken : randomBytes(16).toString('hex'))
      server.enable = true
      server.host = '0.0.0.0'
      server.port = expectedPort
      server.token = token
      server.messagePostFormat = 'array'
      server.reportSelfMessage = false
      network.websocketServers = servers
      const backup = file + '.bak-' + String(now())
      copyFileSync(file, backup)
      const tmp = file + '.tmp-' + String(process.pid)
      writeFileSync(tmp, JSON.stringify(parsed, null, 2) + '\n', 'utf8')
      try {
        renameSync(tmp, file)
      } catch (error) {
        try { unlinkSync(tmp) } catch {}
        throw error
      }
      logLine(
        'info',
        '已写入 OneBot 配置：' + file + '（备份 ' + backup
          + (generated ? '；两边都没有 token，已生成随机 token，随后回填到插件配置' : '')
          + '）',
      )
      // 配置要重启 NapCat 才生效（docs/onebot-channel.md §3.4）。
      const composePath = probe.composeFile.path
      if (composePath !== null) {
        const spec = applyDockerContext(buildActionArgv('restart-napcat', { platform, composePath, containerName: probe.container.name }))
        if (spec !== null && spec.error === undefined) {
          const result = await run(spec.bin, spec.args, { timeoutMs: ENV_COMMAND_TIMEOUT_MS, cwd: spec.cwd || '' })
          logCommandResult([spec.bin, ...spec.args].join(' '), result)
        }
      }
      return { ok: true }
    } catch (error) {
      return fail('ENV_ACTION_FAILED', '写 OneBot 配置失败：' + messageOf(error))
    }
  }

  /** 回填插件配置（wsUrl / access_token / selfId）并重建连接。 */
  function backfillConfig() {
    if (probe === null || probe.onebot === null || probe.onebot.ready !== true) {
      return fail('ENV_NOT_READY', 'OneBot 配置还没就绪：先「写入 OneBot 配置」并重启 NapCat。')
    }
    if (typeof backfill !== 'function') {
      return fail('ENV_ACTION_FAILED', '当前实例不支持回填配置。')
    }
    const port = probe.onebot.port || ENV_ONEBOT_PORT
    const values = {
      wsUrl: 'ws://127.0.0.1:' + String(port),
      accessToken: probe.onebot.token,
      selfId: probe.login.uin,
    }
    let result
    try {
      result = backfill(values)
    } catch (error) {
      return fail('ENV_ACTION_FAILED', '回填失败：' + messageOf(error))
    }
    if (result === null || typeof result !== 'object' || result.ok !== true) {
      return fail(
        typeof result?.code === 'string' ? result.code : 'ENV_ACTION_FAILED',
        typeof result?.message === 'string' ? result.message : '回填失败。',
      )
    }
    logLine('info', '已回填插件配置：' + values.wsUrl + '（selfId ' + String(values.selfId) + '）并重建连接')
    return { ok: true }
  }

  /** 同步动作的统一入口；命令类返回规格由调用方决定是否后台跑。 */
  async function performSync(id, { allowOverwrite = false } = {}) {
    const config = configOf()
    if (id === 'write-compose') {
      const written = writeCompose(config, { allowOverwrite })
      if (written.ok !== true) return written
      await refresh()
      return { ok: true }
    }
    if (id === 'write-onebot') {
      const written = await writeOneBot(config)
      if (written.ok !== true) return written
      await refresh()
      return { ok: true }
    }
    if (id === 'backfill-config') {
      const filled = backfillConfig()
      if (filled.ok !== true) return filled
      await refresh()
      return { ok: true }
    }
    return fail('ENV_ACTION_UNKNOWN', '未知的同步动作：' + id)
  }

  function ensureFreshProbe() {
    if (probe === null) return refresh()
    return Promise.resolve(status())
  }

  /**
   * 执行一个动作。
   *
   * @param input - `{ action, confirm? }`
   * @returns `{ ok: true, value: { action, status, logCursor, url?, accepted? } }` 或
   *          `{ ok: false, code, message }`
   */
  async function action(input) {
    const payload = input !== null && typeof input === 'object' ? input : {}
    const id = payload.action
    if (!isEnvActionId(id)) return fail('ENV_ACTION_UNKNOWN', '未知动作：' + String(id))
    if (id === 'refresh') {
      await refresh()
      return okValue(id)
    }
    if (disposed) return fail('ENV_ACTION_FAILED', '插件已卸载。')
    if (running !== null) return fail('ENV_ACTION_RUNNING', '已有动作在执行：' + running.action)
    const config = configOf()
    if (!config.enabled) return fail('ENV_INVALID', '环境页已关闭：先在「环境」页启用并保存。')
    if (!ENV_PLATFORMS.includes(platform)) {
      return fail('ENV_PLATFORM_UNSUPPORTED', '当前平台（' + platform + '）暂不支持环境动作。')
    }
    const meta = ENV_ACTIONS[id]
    if (meta.confirm === true && payload.confirm !== true) {
      return fail('ENV_CONFIRM_REQUIRED', '「' + meta.title + '」需要确认后执行（会改系统或文件）。')
    }
    await ensureFreshProbe()
    if (probe === null) return fail('ENV_ACTION_FAILED', '环境探测还没完成；请稍后重试。')

    if (id === 'open-webui') {
      if (config.webuiToken === '') return fail('ENV_TOKEN_MISSING', '先在环境配置里填 WebUI token。')
      const url = 'http://127.0.0.1:' + String(ENV_WEBUI_PORT) + '/webui?token=' + encodeURIComponent(config.webuiToken)
      return okValue(id, { url })
    }
    if (id === 'write-compose') {
      const result = await performSync(id, { allowOverwrite: payload.confirm === true })
      if (result.ok !== true) return result
      return okValue(id)
    }
    if (id === 'write-onebot' || id === 'backfill-config') {
      const result = await performSync(id)
      if (result.ok !== true) return result
      return okValue(id, { accepted: false })
    }
    if (id === 'fix-all') {
      // 确认框依赖「这次到底要做什么」：先重探一次，避免用过期快照决定是否要确认。
      await refresh()
      const plan = planNow()
      if (plan.sequence.length > 0 && plan.needsConfirm && payload.confirm !== true) {
        return fail(
          'ENV_CONFIRM_REQUIRED',
          '一键修复会执行：' + plan.titles.join(' → ') + '（含安装 / 启动引擎 / 覆盖 compose）；确认后重试。',
        )
      }
      return startFixAll({ confirm: payload.confirm === true })
    }

    const composePath = probe.composeFile.path ?? ''
    const spec = applyDockerContext(buildActionArgv(id, { platform, composePath, containerName: probe.container.name }))
    if (spec === null) return fail('ENV_ACTION_UNKNOWN', '动作没有命令规格：' + id)
    if (spec.error !== undefined) return fail('ENV_ACTION_FAILED', spec.error)
    return startCommandAction(id, spec)
  }

  /** 当前探测快照求值 + 修复计划（含「下一步」提示）。 */
  function planSnapshot() {
    const steps = evaluateEnvSteps(probe ?? emptyProbe(platform), configOf()).steps
    return { steps, plan: fixPlanOf(steps) }
  }

  function planNow() {
    return planSnapshot().plan
  }

  async function runFixAction(id, { confirm = false } = {}) {
    if (id === 'write-compose') {
      const written = writeCompose(configOf(), { allowOverwrite: confirm === true })
      if (written.ok !== true) return written
      await refresh()
      return { ok: true }
    }
    if (id === 'write-onebot') {
      const written = await writeOneBot(configOf())
      if (written.ok !== true) return written
      await refresh()
      return { ok: true }
    }
    if (id === 'backfill-config') {
      const filled = backfillConfig()
      if (filled.ok !== true) return filled
      await refresh()
      return { ok: true }
    }
    const spec = applyDockerContext(buildActionArgv(id, {
      platform,
      composePath: probe?.composeFile?.path ?? '',
      containerName: probe?.container?.name ?? ENV_CONTAINER_NAME,
    }))
    if (spec === null) return fail('ENV_ACTION_UNKNOWN', '动作没有命令规格：' + id)
    if (spec.error !== undefined) return fail('ENV_ACTION_FAILED', spec.error)
    const result = await run(spec.bin, spec.args, { timeoutMs: ENV_COMMAND_TIMEOUT_MS, cwd: spec.cwd || '' })
    logCommandResult([spec.bin, ...spec.args].join(' '), result)
    if (result.ok !== true) {
      return fail('ENV_ACTION_FAILED', '「' + (ENV_ACTIONS[id]?.title ?? id) + '」失败：' + probeMessage(result, '未知错误'))
    }
    if (id === 'start-orbstack' || id === 'start-docker-desktop') {
      const up = await waitDaemonUp(25000)
      logLine(up ? 'info' : 'warn', up ? '容器引擎已响应 docker info' : '等了 25 秒容器引擎仍未就绪')
    }
    await refresh()
    return { ok: true }
  }

  function startFixAll({ confirm = false } = {}) {
    running = { action: 'fix-all', startedAt: now() }
    logLine('info', '开始「一键修复」' + (confirm === true ? '（已确认系统类动作）' : ''))
    void (async () => {
      try {
        await refresh()
        const done = []
        // 推不动的动作记在这里：不重复尝试、也不让整条链停在它身上（后面可能还有独立步骤）。
        const stalled = new Set()
        for (let round = 0; round < ENV_FIX_MAX_ROUNDS; round += 1) {
          if (disposed) break
          const snapshot = planSnapshot()
          const id = snapshot.plan.sequence.find((action) => !stalled.has(action))
          if (id === undefined) break
          const title = ENV_ACTIONS[id]?.title ?? id
          if (confirm !== true && (id === 'install-docker' || id === 'install-orbstack' || id === 'start-daemon' || id === 'restart-daemon')) {
            logLine('warn', '「' + title + '」需要确认：页面确认后再点一次「一键修复」。')
            break
          }
          logLine('info', '第 ' + String(done.length + 1) + ' 步：' + title)
          const result = await runFixAction(id, { confirm })
          if (result.ok !== true) {
            logLine('warn', '「' + title + '」失败：' + (result.message ?? '未知错误') + '；跳过它，继续后面的步骤。')
            stalled.add(id)
            continue
          }
          done.push(id)
          const after = planSnapshot()
          if (after.plan.sequence.includes(id)) {
            // 命令退出码 0 不等于目标达成（例如 colima 说 already running，但 docker info 仍失败）。
            const entry = after.steps.find((step) => step.actions.includes(id))
            logLine(
              'warn',
              '「' + title + '」执行后步骤没有推进' + (entry !== undefined ? '：' + entry.detail : '')
                + '；跳过它，继续后面的步骤。',
            )
            stalled.add(id)
          }
        }
        const final = planSnapshot()
        if (final.plan.sequence.length === 0) {
          if (final.plan.next === null) logLine('info', '环境已就绪：7 个步骤全部通过。')
          else logLine('warn', '可自动完成的步骤已跑完；下一步（' + final.plan.next.title + '）：' + final.plan.next.detail)
        } else {
          for (const action of final.plan.sequence.filter((item) => stalled.has(item))) {
            const entry = final.steps.find((step) => step.actions.includes(action))
            logLine(
              'warn',
              '「' + (ENV_ACTIONS[action]?.title ?? action) + '」没能自动完成'
                + (entry !== undefined ? '：' + entry.detail : '') + '（可在对应步骤手动处理）',
            )
          }
          const remaining = final.plan.sequence.filter((item) => !stalled.has(item))
          if (remaining.length > 0) {
            logLine('warn', '还有未执行的步骤：' + remaining.map((item) => ENV_ACTIONS[item]?.title ?? item).join(' → '))
          }
        }
      } catch (error) {
        logLine('error', '一键修复失败：' + messageOf(error))
      } finally {
        running = null
        await refresh()
        info('[env] 一键修复结束')
      }
    })()
    return okValue('fix-all', { accepted: true })
  }

  /**
   * 「测试动作」只暴露给组合根（不做 HTTP）：只做探测，不执行任何命令。
   * @returns 最新状态快照（Promise）
   */
  function probeOnly() {
    return refresh()
  }

  /** 插件卸载：停掉探测队标、清空日志（不 kill 已启动的命令）。 */
  function dispose() {
    if (disposed) return
    disposed = true
    buffer.clear()
  }

  return {
    status,
    refresh,
    ensureFresh,
    action,
    probeOnly,
    dispose,
    supported: () => ENV_PLATFORMS.includes(platform),
    steps: () => ENV_STEPS.map((entry) => ({ ...entry })),
    actions: () => Object.keys(ENV_ACTIONS).map((id) => actionView(id)).filter((view) => view !== null),
  }
}
