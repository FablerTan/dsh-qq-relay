/**
 * 环境一键配置单测（node:test）：
 *  - environment 配置段（默认 / 校验 / 只写 token 的视图）与设置覆盖合并；
 *  - compose 文件生成 / 静态解析、OneBot 配置校验、wsUrl 解析；
 *  - 探测快照求值成 7 步、一键修复序列、动作 argv 白名单、日志脱敏环形缓冲；
 *  - controller：临时环境目录 + 桩命令执行器（不跑 docker），覆盖刷新 / 写 OneBot /
 *    回填 / open-webui / 确认制。
 *
 * 全部离线：不执行 docker / brew / colima。
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  DEFAULT_ENVIRONMENT,
  ENV_ONEBOT_PORT,
  buildActionArgv,
  computeFixSequence,
  createLogBuffer,
  evaluateEnvSteps,
  maskEnvConfig,
  nextEnvStep,
  normalizeEnvConfig,
  parseComposeFile,
  parseWsUrl,
  redactSecrets,
  renderComposeFile,
  validateOneBotConfig,
} from '../lib/model/env.js'
import { normalizeConfig } from '../lib/model/config.js'
import { maskConfig, mergeConfig, pickEditable } from '../lib/model/settings.js'
import { createEnvController } from '../lib/controller/env.js'

/** 一个完整的 OneBot 配置。 */
function onebotConfig(overrides = {}) {
  return {
    network: {
      websocketServers: [{
        enable: true,
        host: '0.0.0.0',
        port: ENV_ONEBOT_PORT,
        token: 'secret-token-123',
        messagePostFormat: 'array',
        reportSelfMessage: false,
        ...overrides,
      }],
    },
  }
}

/** 完整探测快照（全部正常）。 */
function goodProbe(overrides = {}) {
  return {
    platform: 'darwin',
    docker: { ok: true, version: 'Docker version 29.9.1', error: '' },
    compose: { ok: true, version: 'Docker Compose version 5.6.0', error: '' },
    daemon: { ok: true, serverVersion: '29.9.1', provider: '', directError: '', error: '' },
    colima: { running: true, error: '' },
    composeFile: { path: '/tmp/napcat/compose.yaml', tokenPresent: true, containerName: 'napcat', ports: [], error: '' },
    container: { name: 'napcat', state: 'running', running: true, error: '' },
    login: { uin: 10001, file: '/tmp/napcat/data/config/onebot11_10001.json' },
    onebot: {
      file: '/tmp/napcat/data/config/onebot11_10001.json',
      uin: 10001,
      port: ENV_ONEBOT_PORT,
      token: 'secret-token-123',
      ready: true,
      issues: [],
      reportSelfMessage: false,
      messagePostFormat: 'array',
      error: '',
    },
    relay: {
      started: true,
      connected: true,
      selfId: 10001,
      wsUrl: 'ws://127.0.0.1:' + String(ENV_ONEBOT_PORT),
      accessToken: 'secret-token-123',
      accessTokenConfigured: true,
    },
    ...overrides,
  }
}

test('env：配置默认值 / 校验容错 / token 只写不读', () => {
  assert.deepEqual(normalizeEnvConfig(undefined), { ...DEFAULT_ENVIRONMENT })
  assert.deepEqual(normalizeEnvConfig({}), { ...DEFAULT_ENVIRONMENT })

  // 目录可写 ~/x 或绝对路径；结尾斜杠去掉。
  assert.equal(normalizeEnvConfig({ dir: '~/napcat-docker/' }).dir, '~/napcat-docker')
  assert.equal(normalizeEnvConfig({ dir: '/opt/napcat/' }).dir, '/opt/napcat')

  // 非法目录不判死整份配置：回退默认，且不产生 problems。
  const problems = []
  const fallback = normalizeEnvConfig({ dir: 'relative/path' }, problems)
  assert.equal(fallback.dir, DEFAULT_ENVIRONMENT.dir)
  assert.deepEqual(problems, [])

  const masked = maskEnvConfig({ enabled: false, dir: '~/x', webuiToken: 'abc' })
  assert.deepEqual(masked, { enabled: false, dir: '~/x', webuiTokenConfigured: true })
  assert.equal(JSON.stringify(masked).includes('abc'), false)
})

test('env：配置段接入 normalizeConfig / 设置覆盖 / 状态视图', () => {
  const base = {
    wsUrl: 'ws://127.0.0.1:3001',
    accessToken: 't',
    selfId: 123,
    environment: { enabled: false, dir: '/opt/napcat' },
  }
  const normalized = normalizeConfig(base)
  assert.equal(normalized.ok, true)
  assert.equal(normalized.config.environment.enabled, false)
  assert.equal(normalized.config.environment.dir, '/opt/napcat')

  const picked = pickEditable({ environment: { dir: '~/other', webuiToken: 'tok' } })
  assert.deepEqual(picked.environment, { dir: '~/other', webuiToken: 'tok' })
  const merged = mergeConfig({ environment: { enabled: true, dir: '~/napcat-docker', webuiToken: '' } }, picked)
  assert.deepEqual(merged.environment, { enabled: true, dir: '~/other', webuiToken: 'tok' })

  const view = maskConfig({ environment: { enabled: true, dir: '~/napcat-docker', webuiToken: 'x' } })
  assert.deepEqual(view.environment, { enabled: true, dir: '~/napcat-docker', webuiTokenConfigured: true })
  assert.equal(view.environmentSupported, true)
})

test('env：compose 文件生成与静态解析', () => {
  const text = renderComposeFile({ webuiToken: 'tok-123' })
  assert.match(text, /WEBUI_TOKEN: "tok-123"/)
  assert.match(text, /container_name: napcat/)
  const parsed = parseComposeFile(text)
  assert.equal(parsed.tokenPresent, true)
  assert.equal(parsed.containerName, 'napcat')
  assert.equal(parsed.volumeCount, 3)
  assert.deepEqual(parsed.ports.map((port) => port.host), [6099, 3001])

  // 缺 token / 已有 docker-compose.yml 也能解析。
  const legacy = parseComposeFile('services:\n  napcat:\n    container_name: my-napcat\n    ports:\n      - "127.0.0.1:3001:3001"')
  assert.equal(legacy.tokenPresent, false)
  assert.equal(legacy.containerName, 'my-napcat')
})

test('env：OneBot 配置校验', () => {
  const ok = validateOneBotConfig(onebotConfig())
  assert.equal(ok.ready, true)
  assert.equal(ok.port, ENV_ONEBOT_PORT)

  const wrongPort = validateOneBotConfig(onebotConfig({ port: 3999 }))
  assert.equal(wrongPort.ready, false)
  assert.ok(wrongPort.issues.some((issue) => issue.includes('3999')))

  const badFormat = validateOneBotConfig(onebotConfig({ messagePostFormat: 'string', reportSelfMessage: true, token: '' }))
  assert.equal(badFormat.ready, false)
  assert.ok(badFormat.issues.some((issue) => issue.includes('array')))
  assert.ok(badFormat.issues.some((issue) => issue.includes('reportSelfMessage')))
  assert.ok(badFormat.issues.some((issue) => issue.includes('token')))

  const noServers = validateOneBotConfig({ network: {} })
  assert.equal(noServers.ready, false)
  assert.ok(noServers.issues.length > 0)
})

test('env：wsUrl 解析与动作 argv 白名单', () => {
  assert.deepEqual(parseWsUrl('ws://127.0.0.1:3001'), { host: '127.0.0.1', port: 3001 })
  assert.deepEqual(parseWsUrl('wss://example.com'), { host: 'example.com', port: 443 })
  assert.equal(parseWsUrl('http://127.0.0.1:3001'), null)

  assert.deepEqual(buildActionArgv('install-docker', { platform: 'linux' }).error, '只支持 macOS（brew install colima docker docker-compose）')
  assert.deepEqual(buildActionArgv('install-docker', { platform: 'darwin' }), {
    bin: 'brew', args: ['install', 'colima', 'docker', 'docker-compose'], cwd: '',
  })
  assert.deepEqual(buildActionArgv('start-daemon', { platform: 'darwin' }).args.slice(0, 2), ['start', '--cpu'])

  const up = buildActionArgv('compose-up', { platform: 'darwin', composePath: '/tmp/napcat/compose.yaml' })
  assert.deepEqual(up.args, ['compose', '-f', '/tmp/napcat/compose.yaml', 'up', '-d'])

  assert.deepEqual(buildActionArgv('restart-daemon', { platform: 'darwin' }), {
    bin: 'colima', args: ['restart'], cwd: '',
  })
  assert.equal(buildActionArgv('restart-daemon', { platform: 'linux' }).error, '只支持 macOS（colima restart）')

  const restart = buildActionArgv('restart-napcat', {
    platform: 'darwin',
    composePath: '/tmp/napcat/compose.yaml',
    containerName: 'napcat',
  })
  assert.deepEqual(restart.args, ['compose', '-f', '/tmp/napcat/compose.yaml', 'restart', 'napcat'])

  assert.equal(buildActionArgv('compose-up', { platform: 'darwin', composePath: '' }).error !== undefined, true)
})

test('env：探测求值 / 一键修复序列按步骤逐步展开', () => {
  const healthy = evaluateEnvSteps(goodProbe(), DEFAULT_ENVIRONMENT)
  assert.equal(healthy.steps.length, 7)
  assert.deepEqual(healthy.summary, { ok: 7, warn: 0, error: 0, skip: 0 })
  assert.deepEqual(computeFixSequence(healthy.steps), [])
  assert.equal(nextEnvStep(healthy.steps), null)

  // 新机器：没有 docker。容器 / OneBot 步骤是 skip（前置缺失），只有 compose 能补；
  // 安装项现在也进序列（页面确认后执行），否则永远补不到 NapCat 容器。
  const broken = evaluateEnvSteps(goodProbe({
    docker: { ok: false, version: '', error: '找不到 docker 命令' },
    daemon: { ok: false, serverVersion: '', error: 'daemon down' },
    composeFile: { path: null, tokenPresent: false, containerName: 'napcat', ports: [], error: '' },
    container: { name: 'napcat', state: '', running: false, error: 'no such container' },
    login: { uin: 0, file: '' },
    onebot: null,
    relay: { started: false, connected: false, selfId: 0, wsUrl: '', accessToken: '', accessTokenConfigured: false },
  }), { ...DEFAULT_ENVIRONMENT, webuiToken: 'tok' })
  const byId = Object.fromEntries(broken.steps.map((step) => [step.id, step]))
  assert.equal(byId['docker-cli'].status, 'error')
  assert.deepEqual(byId['docker-cli'].actions, ['install-docker'])
  assert.equal(byId['container'].status, 'skip')
  assert.deepEqual(byId['container'].actions, [])
  assert.equal(byId['compose-file'].status, 'error')
  assert.deepEqual(byId['compose-file'].actions, ['write-compose'])
  assert.deepEqual(computeFixSequence(broken.steps), ['install-docker', 'write-compose'])
  assert.equal(nextEnvStep(broken.steps).id, 'docker-cli')

  // 装好 CLI、引擎没起：容器步骤仍是 skip，序列里没有 compose-up（这是 v0.23.0 跳过 NapCat 的原因）。
  const engineDown = evaluateEnvSteps(goodProbe({
    daemon: { ok: false, serverVersion: '', error: 'daemon down' },
    colima: { running: false, error: 'colima is not running' },
    composeFile: { path: null, tokenPresent: false, containerName: 'napcat', ports: [], error: '' },
    container: { name: 'napcat', state: '', running: false, error: '' },
    login: { uin: 0, file: '' },
    onebot: null,
    relay: { started: true, connected: false, selfId: 10001, wsUrl: 'ws://127.0.0.1:3001', accessToken: 'secret-token-123', accessTokenConfigured: true },
  }), { ...DEFAULT_ENVIRONMENT, webuiToken: 'tok' })
  assert.deepEqual(computeFixSequence(engineDown.steps), ['start-daemon', 'write-compose'])

  // Colima 在跑但 daemon 连不上：序列里换成「重启引擎」，而不是重复无效果的 colima start。
  const daemonWedged = evaluateEnvSteps(goodProbe({
    daemon: { ok: false, serverVersion: '', error: 'failed to connect to the docker API at unix:///var/run/docker.sock' },
    colima: { running: true, error: '' },
    composeFile: { path: null, tokenPresent: false, containerName: 'napcat', ports: [], error: '' },
    container: { name: 'napcat', state: '', running: false, error: '' },
    login: { uin: 0, file: '' },
    onebot: null,
    relay: { started: true, connected: false, selfId: 10001, wsUrl: 'ws://127.0.0.1:3001', accessToken: 'secret-token-123', accessTokenConfigured: true },
  }), { ...DEFAULT_ENVIRONMENT, webuiToken: 'tok' })
  assert.deepEqual(computeFixSequence(daemonWedged.steps), ['restart-daemon', 'write-compose'])

  // 引擎起来后重新求值：容器从 skip 变 error，compose-up 才进入序列（逐步补全的关键）。
  const engineUp = evaluateEnvSteps(goodProbe({
    composeFile: { path: null, tokenPresent: false, containerName: 'napcat', ports: [], error: '' },
    container: { name: 'napcat', state: '', running: false, error: '' },
    login: { uin: 0, file: '' },
    onebot: null,
    relay: { started: true, connected: false, selfId: 10001, wsUrl: 'ws://127.0.0.1:3001', accessToken: 'secret-token-123', accessTokenConfigured: true },
  }), { ...DEFAULT_ENVIRONMENT, webuiToken: 'tok' })
  assert.deepEqual(computeFixSequence(engineUp.steps), ['write-compose', 'compose-up'])

  // 非 macOS / Linux 平台全部跳过。
  const windows = evaluateEnvSteps(goodProbe({ platform: 'win32' }), DEFAULT_ENVIRONMENT)
  assert.equal(windows.platformSupported, false)
  assert.equal(windows.steps.every((step) => step.status === 'skip'), true)
})

test('env：容器引擎失败区分「启动」与「重启」，错误可读', () => {
  const daemonError = 'failed to connect to the docker API at unix:///var/run/docker.sock'
  const failed = (colimaRunning) => evaluateEnvSteps(goodProbe({
    daemon: { ok: false, serverVersion: '', provider: '', directError: '', error: daemonError },
    colima: { running: colimaRunning, error: colimaRunning ? '' : 'colima is not running' },
  }), DEFAULT_ENVIRONMENT)

  // Colima 没起 → 启动引擎；错误显示 stderr 原文，而不是「退出码 1」。
  const stoppedStep = failed(false).steps.find((step) => step.id === 'docker-daemon')
  assert.equal(stoppedStep.status, 'error')
  assert.deepEqual(stoppedStep.actions, ['start-daemon'])
  assert.match(stoppedStep.detail, /failed to connect/u)
  assert.ok(stoppedStep.evidence.some((line) => line.includes('failed to connect')))

  // Colima 在跑但 daemon 连不上 → 重启引擎。
  const runningStep = failed(true).steps.find((step) => step.id === 'docker-daemon')
  assert.equal(runningStep.status, 'error')
  assert.deepEqual(runningStep.actions, ['restart-daemon'])
  assert.match(runningStep.detail, /重启容器引擎/u)
  assert.match(runningStep.detail, /failed to connect/u)

  // 直连失败、colima context 可用 → ok，并把原因写进证据。
  const viaContext = evaluateEnvSteps(goodProbe({
    daemon: { ok: true, serverVersion: '29.5.2', provider: 'colima context', directError: daemonError, error: '' },
  }), DEFAULT_ENVIRONMENT)
  const contextStep = viaContext.steps.find((step) => step.id === 'docker-daemon')
  assert.equal(contextStep.status, 'ok')
  assert.match(contextStep.detail, /colima context/u)
  assert.ok(contextStep.evidence.some((line) => line.includes('直连失败')))
  assert.ok(contextStep.evidence.some((line) => line.includes('--context colima')))
})

test('env：日志环形缓冲 + token 脱敏', () => {
  assert.equal(redactSecrets('token=secret-123 ok', ['secret-123']), 'token=*** ok')
  assert.equal(redactSecrets('token=abc', ['ab']), 'token=abc')

  const buffer = createLogBuffer({ limit: 3, now: () => 42 })
  buffer.append('info', 'hello secret-123', ['secret-123'])
  buffer.append('warn', 'w2')
  buffer.append('error', 'w3')
  buffer.append('info', 'w4')
  assert.equal(buffer.cursor(), 4)
  assert.deepEqual(buffer.tail(10).map((entry) => entry.text), ['w2', 'w3', 'w4'])
  assert.equal(buffer.since(2).length, 2)
  assert.equal(buffer.tail(10)[0].at, 42)
})

test('env controller：探测 / 写 OneBot / 回填 / open-webui / 确认制', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-qq-relay-env-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  mkdirSync(join(dir, 'data', 'config'), { recursive: true })
  const onebotFile = join(dir, 'data', 'config', 'onebot11_10001.json')
  writeFileSync(onebotFile, JSON.stringify(onebotConfig({ port: 3999, messagePostFormat: 'string', reportSelfMessage: true, token: '' })), 'utf8')
  writeFileSync(join(dir, 'compose.yaml'), renderComposeFile({ webuiToken: 'tok-123' }), 'utf8')

  const calls = []
  const run = async (bin, args) => {
    calls.push([bin, ...args].join(' '))
    if (bin === 'docker' && args[0] === '--version') return { ok: true, code: 0, stdout: 'Docker version 29.9.1', stderr: '' }
    if (bin === 'docker' && args[0] === 'compose') return { ok: true, code: 0, stdout: 'Docker Compose version 5.6.0', stderr: '' }
    if (bin === 'docker' && args[0] === 'info') return { ok: true, code: 0, stdout: '29.9.1', stderr: '' }
    if (bin === 'docker' && args[0] === 'inspect') return { ok: true, code: 0, stdout: 'running', stderr: '' }
    return { ok: true, code: 0, stdout: '', stderr: '' }
  }

  const backfilled = []
  const controller = createEnvController({
    getConfig: () => ({ enabled: true, dir, webuiToken: 'tok-123' }),
    getRelayInfo: () => ({
      started: true,
      connected: false,
      selfId: 10001,
      wsUrl: 'ws://127.0.0.1:3001',
      accessToken: 'secret-token-123',
      accessTokenConfigured: true,
    }),
    backfill: (values) => {
      backfilled.push(values)
      return { ok: true, value: {} }
    },
    run,
    platform: 'darwin',
  })
  t.after(() => controller.dispose())

  const status = await controller.refresh()
  assert.equal(status.supported, true)
  assert.equal(status.enabled, true)
  // 动作目录随状态下发（页面按它渲染按钮 / 确认标记）。
  assert.ok(status.actions.some((item) => item.id === 'fix-all' && item.kind === 'chain'))
  assert.ok(status.actions.some((item) => item.id === 'install-docker' && item.confirm === true))
  assert.match(status.dir, /dsh-qq-relay-env-/)
  const steps = Object.fromEntries(status.steps.map((step) => [step.id, step]))
  assert.equal(steps['docker-cli'].status, 'ok')
  assert.equal(steps['container'].status, 'ok')
  assert.equal(steps['login'].status, 'ok')
  assert.equal(steps.onebot.status, 'error')
  assert.equal(steps.relay.status, 'warn')

  // 未确认不能跑安装类动作。
  const refused = await controller.action({ action: 'install-docker' })
  assert.equal(refused.ok, false)
  assert.equal(refused.code, 'ENV_CONFIRM_REQUIRED')

  // 写 OneBot 配置：补齐端口 / token / array / reportSelfMessage，并备份。
  const written = await controller.action({ action: 'write-onebot', confirm: true })
  assert.equal(written.ok, true, JSON.stringify(written))
  const saved = JSON.parse(readFileSync(onebotFile, 'utf8'))
  const server = saved.network.websocketServers[0]
  assert.equal(server.port, 3001)
  assert.equal(server.token, 'secret-token-123')
  assert.equal(server.messagePostFormat, 'array')
  assert.equal(server.reportSelfMessage, false)
  assert.ok(calls.some((call) => call.includes('restart napcat')))

  const refreshed = await controller.refresh()
  assert.equal(refreshed.steps.find((step) => step.id === 'onebot').status, 'ok')
  assert.equal(refreshed.steps.find((step) => step.id === 'relay').status, 'warn')

  // 回填：把 wsUrl / token / selfId 交给组合根。
  const filled = await controller.action({ action: 'backfill-config' })
  assert.equal(filled.ok, true)
  assert.deepEqual(backfilled[0], {
    wsUrl: 'ws://127.0.0.1:3001',
    accessToken: 'secret-token-123',
    selfId: 10001,
  })

  // open-webui：链接里带 token（encodeURIComponent），状态快照里没有 token。
  const webui = await controller.action({ action: 'open-webui' })
  assert.equal(webui.ok, true)
  assert.equal(webui.value.url, 'http://127.0.0.1:6099/webui?token=tok-123')
  assert.equal(JSON.stringify(webui.value.status).includes('tok-123'), false)

  // 日志脱敏：命令输出里即便出现 token 也不明文返回。
  const logText = JSON.stringify(webui.value.status.log)
  assert.equal(logText.includes('secret-token-123'), false)
})

test('env controller：一键修复按现状补缺（写 compose → 启动容器）', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-qq-relay-env-fix-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  mkdirSync(join(dir, 'data', 'config'), { recursive: true })
  writeFileSync(join(dir, 'data', 'config', 'onebot11_1.json'), JSON.stringify(onebotConfig()), 'utf8')

  const calls = []
  const run = async (bin, args) => {
    calls.push([bin, ...args].join(' '))
    if (bin === 'docker' && args[0] === '--version') return { ok: true, code: 0, stdout: 'Docker version 29', stderr: '' }
    if (bin === 'docker' && args[0] === 'compose') return { ok: true, code: 0, stdout: 'Compose 5', stderr: '' }
    if (bin === 'docker' && args[0] === 'info') return { ok: true, code: 0, stdout: '29', stderr: '' }
    if (bin === 'docker' && args[0] === 'inspect') {
      const started = calls.some((call) => call.includes('up -d'))
      return { ok: true, code: 0, stdout: started ? 'running' : 'exited', stderr: '' }
    }
    return { ok: true, code: 0, stdout: '', stderr: '' }
  }

  const controller = createEnvController({
    getConfig: () => ({ enabled: true, dir, webuiToken: 'tok' }),
    getRelayInfo: () => ({
      started: true,
      connected: false,
      selfId: 1,
      wsUrl: 'ws://127.0.0.1:3001',
      accessToken: 'secret-token-123',
      accessTokenConfigured: true,
    }),
    backfill: () => ({ ok: true, value: {} }),
    run,
    platform: 'darwin',
  })
  t.after(() => controller.dispose())

  const result = await controller.action({ action: 'fix-all' })
  assert.equal(result.ok, true)
  assert.equal(result.value.accepted, true)

  // 等后台链结束（running 回到 null）。
  for (let index = 0; index < 100; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 20))
    if (controller.status().running === null) break
  }
  assert.equal(controller.status().running, null)
  assert.ok(calls.some((call) => call.includes('up -d')))
  // OneBot 配置本来就正常 → 序列里没有写 OneBot / 重启，只补 compose 与容器。
  assert.equal(calls.some((call) => call.includes('restart napcat')), false)
  const steps = Object.fromEntries(controller.status().steps.map((step) => [step.id, step]))
  assert.equal(steps.container.status, 'ok')
  assert.equal(steps.relay.status, 'warn')
  // 回填过一次仍没连上（桩 relay 永远未连接）→ 计划里只剩它且不再重复执行。
  assert.deepEqual(controller.status().fixPlan.sequence, ['backfill-config'])
  assert.ok(controller.status().log.entries.some((entry) => entry.text.includes('没有推进')))
})

test('env controller：一键修复逐步补全（确认后安装 → 启动引擎 → compose → 启动 NapCat）', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-qq-relay-env-chain-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))

  const state = { installed: false, daemon: false, up: false }
  const calls = []
  const run = async (bin, args) => {
    calls.push([bin, ...args].join(' '))
    if (bin === 'brew') {
      state.installed = true
      return { ok: true, code: 0, stdout: '', stderr: '' }
    }
    if (bin === 'colima' && args[0] === 'status') {
      return state.daemon
        ? { ok: true, code: 0, stdout: 'colima is running', stderr: '' }
        : { ok: false, code: 1, stdout: '', stderr: 'colima is not running', error: 'colima is not running' }
    }
    if (bin === 'colima') {
      state.daemon = true
      return { ok: true, code: 0, stdout: '', stderr: '' }
    }
    if (bin === 'docker' && args[0] === '--version') {
      return state.installed
        ? { ok: true, code: 0, stdout: 'Docker version 29.9.1', stderr: '' }
        : { ok: false, code: 127, stdout: '', stderr: 'command not found', error: '找不到 docker 命令' }
    }
    if (bin === 'docker' && args[0] === 'compose' && args.includes('version')) {
      return state.installed
        ? { ok: true, code: 0, stdout: 'Docker Compose version 5.6.0', stderr: '' }
        : { ok: false, code: 127, stdout: '', stderr: '', error: 'compose 不可用' }
    }
    if (bin === 'docker' && args[0] === 'info') {
      return state.daemon
        ? { ok: true, code: 0, stdout: '29.5.2', stderr: '' }
        : { ok: false, code: 1, stdout: '', stderr: 'Cannot connect', error: 'docker info 失败' }
    }
    if (bin === 'docker' && args[0] === '--context') {
      return state.daemon
        ? { ok: true, code: 0, stdout: '29.5.2', stderr: '' }
        : { ok: false, code: 1, stdout: '', stderr: 'context "colima" does not exist' }
    }
    if (bin === 'docker' && args[0] === 'inspect') {
      return state.up
        ? { ok: true, code: 0, stdout: 'running', stderr: '' }
        : { ok: false, code: 1, stdout: '', stderr: '', error: 'no such container' }
    }
    if (bin === 'docker' && args[0] === 'compose' && args.includes('up')) {
      state.up = true
      return { ok: true, code: 0, stdout: '', stderr: '' }
    }
    return { ok: true, code: 0, stdout: '', stderr: '' }
  }

  const controller = createEnvController({
    getConfig: () => ({ enabled: true, dir, webuiToken: 'tok' }),
    getRelayInfo: () => ({
      started: true,
      connected: false,
      selfId: 0,
      wsUrl: 'ws://127.0.0.1:3001',
      accessToken: '',
      accessTokenConfigured: false,
    }),
    backfill: () => ({ ok: true }),
    run,
    platform: 'darwin',
  })
  t.after(() => controller.dispose())

  const status = await controller.refresh()
  assert.deepEqual(status.fixPlan.sequence, ['install-docker', 'write-compose'])
  assert.equal(status.fixPlan.needsConfirm, true)
  assert.equal(status.fixPlan.next.id, 'docker-cli')
  assert.equal(status.fixPlan.titles[0], '安装 Docker / Colima')

  // 系统类动作（安装 / 启动引擎）没有确认时整条链拒绝执行。
  const refused = await controller.action({ action: 'fix-all' })
  assert.equal(refused.ok, false)
  assert.equal(refused.code, 'ENV_CONFIRM_REQUIRED')

  const started = await controller.action({ action: 'fix-all', confirm: true })
  assert.equal(started.ok, true)
  assert.equal(started.value.accepted, true)
  for (let index = 0; index < 300; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 20))
    if (controller.status().running === null) break
  }
  assert.equal(controller.status().running, null)

  // 一条链走完：brew install → colima start → 写 compose → compose up -d。
  assert.ok(calls.some((call) => call.startsWith('brew install colima')))
  assert.ok(calls.some((call) => call.startsWith('colima start')))
  assert.ok(calls.some((call) => call.includes('up -d')))

  const after = controller.status()
  const steps = Object.fromEntries(after.steps.map((step) => [step.id, step]))
  assert.equal(steps['docker-cli'].status, 'ok')
  assert.equal(steps['docker-daemon'].status, 'ok')
  assert.equal(steps['compose-file'].status, 'ok')
  assert.equal(steps.container.status, 'ok')
  assert.equal(steps.login.status, 'warn')
  // 没有扫码 → 停在登录；序列为空，下一步提示登录。
  assert.deepEqual(after.fixPlan.sequence, [])
  assert.equal(after.fixPlan.next.id, 'login')
  assert.ok(after.log.entries.some((entry) => entry.text.includes('下一步')))
})

test('env controller：写 OneBot 时 token 双空自动生成并随后回填', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-qq-relay-env-token-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  mkdirSync(join(dir, 'data', 'config'), { recursive: true })
  const onebotFile = join(dir, 'data', 'config', 'onebot11_10001.json')
  writeFileSync(onebotFile, JSON.stringify(onebotConfig({ token: '' })), 'utf8')
  writeFileSync(join(dir, 'compose.yaml'), renderComposeFile({ webuiToken: 'tok' }), 'utf8')

  const calls = []
  const run = async (bin, args) => {
    calls.push([bin, ...args].join(' '))
    if (bin === 'docker' && args[0] === 'inspect') return { ok: true, code: 0, stdout: 'running', stderr: '' }
    return { ok: true, code: 0, stdout: '', stderr: '' }
  }
  const backfilled = []
  const controller = createEnvController({
    getConfig: () => ({ enabled: true, dir, webuiToken: 'tok' }),
    getRelayInfo: () => ({
      started: true,
      connected: false,
      selfId: 10001,
      wsUrl: 'ws://127.0.0.1:3001',
      accessToken: '',
      accessTokenConfigured: false,
    }),
    backfill: (values) => {
      backfilled.push(values)
      return { ok: true }
    },
    run,
    platform: 'darwin',
  })
  t.after(() => controller.dispose())

  await controller.refresh()
  const written = await controller.action({ action: 'write-onebot', confirm: true })
  assert.equal(written.ok, true, JSON.stringify(written))
  const token = JSON.parse(readFileSync(onebotFile, 'utf8')).network.websocketServers[0].token
  assert.match(token, /^[0-9a-f]{32}$/u)
  assert.equal(calls.some((call) => call.includes('restart napcat')), true)

  const filled = await controller.action({ action: 'backfill-config' })
  assert.equal(filled.ok, true)
  assert.equal(backfilled[0].accessToken, token)
  // 状态快照 / 日志里都不出现生成的 token 明文。
  assert.equal(JSON.stringify(controller.status()).includes(token), false)
})

test('env controller：docker 直连失败时自动改用 colima context', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-qq-relay-env-context-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))

  const state = { up: false }
  const calls = []
  const run = async (bin, args) => {
    calls.push([bin, ...args].join(' '))
    if (bin === 'colima' && args[0] === 'status') return { ok: true, code: 0, stdout: 'colima is running', stderr: '' }
    if (bin === 'docker' && args[0] === '--version') return { ok: true, code: 0, stdout: 'Docker version 29.9.1', stderr: '' }
    if (bin === 'docker' && args[0] === 'compose' && args.includes('version')) {
      return { ok: true, code: 0, stdout: 'Docker Compose version 5.6.0', stderr: '' }
    }
    if (bin === 'docker' && args[0] === 'info') {
      return { ok: false, code: 1, stdout: '', stderr: 'failed to connect to the docker API at unix:///var/run/docker.sock' }
    }
    if (bin === 'docker' && args[0] === '--context' && args.includes('info')) {
      return { ok: true, code: 0, stdout: '29.5.2', stderr: '' }
    }
    if (bin === 'docker' && args[0] === '--context' && args.includes('inspect')) {
      return state.up
        ? { ok: true, code: 0, stdout: 'running', stderr: '' }
        : { ok: false, code: 1, stdout: '', stderr: '', error: 'no such container' }
    }
    if (bin === 'docker' && args[0] === '--context' && args.includes('up')) {
      state.up = true
      return { ok: true, code: 0, stdout: '', stderr: '' }
    }
    return { ok: true, code: 0, stdout: '', stderr: '' }
  }

  const controller = createEnvController({
    getConfig: () => ({ enabled: true, dir, webuiToken: 'tok' }),
    getRelayInfo: () => ({
      started: true,
      connected: false,
      selfId: 0,
      wsUrl: 'ws://127.0.0.1:3001',
      accessToken: '',
      accessTokenConfigured: false,
    }),
    backfill: () => ({ ok: true }),
    run,
    platform: 'darwin',
  })
  t.after(() => controller.dispose())

  const status = await controller.refresh()
  const daemon = status.steps.find((step) => step.id === 'docker-daemon')
  assert.equal(daemon.status, 'ok')
  assert.ok(daemon.evidence.some((line) => line.includes('直连失败')))
  assert.ok(daemon.evidence.some((line) => line.includes('--context colima')))
  assert.deepEqual(status.fixPlan.sequence, ['write-compose', 'compose-up'])

  const started = await controller.action({ action: 'fix-all' })
  assert.equal(started.ok, true)
  for (let index = 0; index < 300; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 20))
    if (controller.status().running === null) break
  }
  // 后续 docker 命令都带上兜底 context。
  assert.ok(calls.some((call) => call.includes('--context colima compose') && call.includes('up -d')))
  assert.ok(calls.some((call) => call.includes('--context colima inspect')))
  const steps = Object.fromEntries(controller.status().steps.map((step) => [step.id, step]))
  assert.equal(steps.container.status, 'ok')
})

test('env controller：动作没有推进时跳过它，继续后面的步骤', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-qq-relay-env-stall-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))

  const calls = []
  const run = async (bin, args) => {
    calls.push([bin, ...args].join(' '))
    if (bin === 'colima' && args[0] === 'status') return { ok: true, code: 0, stdout: 'colima is running', stderr: '' }
    if (bin === 'colima') return { ok: true, code: 0, stdout: '', stderr: '' }
    if (bin === 'docker' && args[0] === '--version') return { ok: true, code: 0, stdout: 'Docker version 29.9.1', stderr: '' }
    if (bin === 'docker' && args[0] === 'compose' && args.includes('version')) {
      return { ok: true, code: 0, stdout: 'Docker Compose version 5.6.0', stderr: '' }
    }
    if (bin === 'docker' && args[0] === 'info') {
      return { ok: false, code: 1, stdout: '', stderr: 'failed to connect to the docker API at unix:///var/run/docker.sock' }
    }
    if (bin === 'docker' && args[0] === '--context') {
      return { ok: false, code: 1, stdout: '', stderr: 'cannot connect with colima context' }
    }
    return { ok: true, code: 0, stdout: '', stderr: '' }
  }

  const controller = createEnvController({
    getConfig: () => ({ enabled: true, dir, webuiToken: 'tok' }),
    getRelayInfo: () => ({
      started: true,
      connected: false,
      selfId: 0,
      wsUrl: 'ws://127.0.0.1:3001',
      accessToken: '',
      accessTokenConfigured: false,
    }),
    backfill: () => ({ ok: true }),
    run,
    platform: 'darwin',
  })
  t.after(() => controller.dispose())

  const status = await controller.refresh()
  assert.deepEqual(status.fixPlan.sequence, ['restart-daemon', 'write-compose'])
  assert.equal(status.fixPlan.needsConfirm, true)

  const started = await controller.action({ action: 'fix-all', confirm: true })
  assert.equal(started.ok, true)
  for (let index = 0; index < 300; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 20))
    if (controller.status().running === null) break
  }

  assert.ok(calls.some((call) => call.startsWith('colima restart')))
  // 引擎没救回来，但没有卡死：compose 文件仍然生成了。
  assert.equal(existsSync(join(dir, 'compose.yaml')), true)
  const logText = controller.status().log.entries.map((entry) => entry.text).join('\n')
  assert.ok(logText.includes('没能自动完成'))
  assert.ok(logText.includes('failed to connect'))
})
