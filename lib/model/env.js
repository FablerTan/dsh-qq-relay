/**
 * 环境一键配置（P12 / v0.23.0）：配置模型 + 探测结果求值 + 动作清单 + 日志环形缓冲。
 *
 * 目标：把「装 Docker / 起 Colima / 拉 NapCat / 扫码登录 / 写 OneBot 配置 / 回填插件配置」
 * 从 docs/onebot-channel.md §3 的手工步骤收敛成插件面板「环境」页——每步一个状态与按钮。
 *
 * 本文件只放**纯逻辑**（零 node: 依赖之外的东西、可单测）：
 *  1) `environment` 配置段规范化 / 对外视图（webuiToken 只写不读）；
 *  2) `docker-compose` 文件生成与静态解析（不跑 docker）；
 *  3) OneBot 配置文件校验（port / token / messagePostFormat / reportSelfMessage）；
 *  4) 把探测快照求值成 7 个步骤（ok / warn / error / skip + 证据 + 可执行动作）；
 *  5) 动作白名单与固定 argv（配置页按钮 → controller 只按这里执行，不经 shell）；
 *  6) 动作日志环形缓冲（token 脱敏）。
 *
 * 纪律：**永不抛异常**。坏配置 / 坏 JSON / 坏动作 id 一律返回可渲染的降级值或 problems，
 * 由 controller 决定是否只打日志。
 */

/** `environment` 配置段的默认值；调用方不应直接改这个对象。 */
export const DEFAULT_ENVIRONMENT = Object.freeze({
  /** 是否在「环境」页探测并允许动作（关闭时页面只留说明）。 */
  enabled: true,
  /** NapCat Docker 环境目录（绝对路径或 ~/ 开头）；默认 ~/napcat-docker。 */
  dir: '~/napcat-docker',
  /** NapCat WebUI token（只写不读；用于打开 /webui?token=… 与生成 compose 文件）。 */
  webuiToken: '',
})

/** 环境目录最大长度。 */
export const ENV_DIR_MAX = 200

/** token 最大长度。 */
export const ENV_TOKEN_MAX = 200

/** 动作日志保留条数。 */
export const ENV_LOG_LIMIT = 200

/** 一次动作命令的默认超时（安装类可能要几分钟）。 */
export const ENV_COMMAND_TIMEOUT_MS = 10 * 60 * 1000

/** 单次探测命令的超时。 */
export const ENV_PROBE_TIMEOUT_MS = 15 * 1000

/** 探测结果的新鲜期：状态轮询超过它就后台重探。 */
export const ENV_PROBE_MAX_AGE_MS = 15 * 1000

/** NapCat WebUI 端口（compose 里只绑 127.0.0.1:6099）。 */
export const ENV_WEBUI_PORT = 6099

/** OneBot 正向 WebSocket 端口（compose 里只绑 127.0.0.1:3001）。 */
export const ENV_ONEBOT_PORT = 3001

/** 默认 compose 文件名（也接受 docker-compose.yml）。 */
export const ENV_COMPOSE_NAME = 'compose.yaml'

/** 默认容器名（compose 里 container_name: napcat）。 */
export const ENV_CONTAINER_NAME = 'napcat'

/** 环境页支持的平台（Windows / WSL 暂不支持，页面只提示）。 */
export const ENV_PLATFORMS = Object.freeze(['darwin', 'linux'])

/** 七个步骤的固定顺序（页面按这个顺序渲染）。 */
export const ENV_STEPS = Object.freeze([
  Object.freeze({ id: 'docker-cli', title: 'Docker 命令行' }),
  Object.freeze({ id: 'docker-daemon', title: '容器引擎' }),
  Object.freeze({ id: 'compose-file', title: 'Compose 文件' }),
  Object.freeze({ id: 'container', title: 'NapCat 容器' }),
  Object.freeze({ id: 'login', title: 'QQ 登录' }),
  Object.freeze({ id: 'onebot', title: 'OneBot 配置' }),
  Object.freeze({ id: 'relay', title: '插件回填 / 自检' }),
])

/**
 * 动作白名单。
 *
 * - `kind: command`：执行固定 argv（`buildActionArgv` 给出），`confirm` 为 true 时
 *   请求必须显式带 `confirm: true`（安装 / 启动这类重动作）；
 * - `kind: fs`：只写环境目录里的文件（compose / OneBot 配置）；
 * - `kind: callback`：回填插件配置（由组合根提供的 saveConfig 落盘并重连）；
 * - `kind: link`：只返回 WebUI 链接，不执行任何东西。
 */
export const ENV_ACTIONS = Object.freeze({
  refresh: Object.freeze({ title: '重新检测', kind: 'none', confirm: false, description: '重新探测所有步骤（不执行任何命令）。' }),
  'install-docker': Object.freeze({
    title: '安装 Docker / Colima',
    kind: 'command',
    confirm: true,
    description: 'brew install colima docker docker-compose（仅 macOS；可能耗时数分钟）。',
  }),
  'start-daemon': Object.freeze({
    title: '启动容器引擎',
    kind: 'command',
    confirm: true,
    description: 'colima start --cpu 4 --memory 4 --disk 60 --vm-type vz（仅 macOS）。',
  }),
  'write-compose': Object.freeze({
    title: '生成 Compose 文件',
    kind: 'fs',
    confirm: true,
    description: '在环境目录写 compose.yaml（端口只绑 127.0.0.1，三个数据卷；已存在文件会覆盖）。',
  }),
  'compose-up': Object.freeze({
    title: '启动 NapCat 容器',
    kind: 'command',
    confirm: false,
    description: 'docker compose -f <环境目录>/compose.yaml up -d。',
  }),
  'restart-napcat': Object.freeze({
    title: '重启 NapCat',
    kind: 'command',
    confirm: false,
    description: 'docker compose -f <环境目录>/compose.yaml restart napcat。',
  }),
  'write-onebot': Object.freeze({
    title: '写入 OneBot 配置',
    kind: 'fs',
    confirm: true,
    description: '把 token / 端口 / messagePostFormat=array / reportSelfMessage=false 写进登录后的 OneBot 配置（先备份）。',
  }),
  'backfill-config': Object.freeze({
    title: '回填插件配置并重连',
    kind: 'callback',
    confirm: false,
    description: '用 OneBot 配置里的地址 / token / 登录 QQ 号写插件配置，然后重建连接。',
  }),
  'fix-all': Object.freeze({
    title: '一键修复',
    kind: 'chain',
    confirm: false,
    description: '从当前进度往后逐个补齐（安装引擎 → 生成 compose → 启动 NapCat → 写 OneBot → 回填），每步完成后重新探测；安装 / 启动引擎 / 覆盖 compose 需确认。',
  }),
  'open-webui': Object.freeze({
    title: '打开 WebUI 扫码',
    kind: 'link',
    confirm: false,
    description: '返回 http://127.0.0.1:6099/webui?token=…（token 来自环境配置）。',
  }),
})

/** 动作 id 是否在白名单里。 */
export function isEnvActionId(value) {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ENV_ACTIONS, value)
}

/** 把动作 id 转成页面可渲染的视图（未知 id 返回 null）。 */
export function actionView(id) {
  if (!isEnvActionId(id)) return null
  const action = ENV_ACTIONS[id]
  return {
    id,
    title: action.title,
    kind: action.kind,
    confirm: action.confirm,
    description: action.description,
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** 把 `~` / `~/x` 展开为绝对路径（与 config.js 同语义；本地实现避免循环依赖）。 */
export function expandHome(path) {
  if (typeof path !== 'string' || path === '') return path
  const home = (() => {
    try {
      return typeof process === 'object' && process !== null && typeof process.env === 'object'
        ? String(process.env.HOME ?? '')
        : ''
    } catch {
      return ''
    }
  })()
  if (home === '') return path
  if (path === '~') return home
  if (path.startsWith('~/')) return home + path.slice(1)
  return path
}

/** 校验并规范化环境目录；非法返回 null（调用方保留原值 / 默认值）。 */
function normalizeDir(raw) {
  if (typeof raw !== 'string') return null
  const value = raw.trim().replace(/\/+$/u, '')
  if (value === '' || value.length > ENV_DIR_MAX) return null
  if (/[\u0000-\u001f\u007f]/u.test(value)) return null
  if (value !== '~' && !value.startsWith('~/') && !value.startsWith('/')) return null
  for (const segment of value.split('/')) {
    if (segment === '..') return null
  }
  return value === '' ? '/' : value
}

/** 校验并规范化 token；非法返回 null，空串表示未配置。 */
function normalizeToken(raw) {
  if (typeof raw !== 'string') return null
  const value = raw.trim()
  if (value.length > ENV_TOKEN_MAX) return null
  if (/[\u0000-\u001f\u007f]/u.test(value)) return null
  return value
}

/**
 * 规范化 `environment` 配置段。
 *
 * 容错优先：目录 / token 非法时**不**把整份配置判死（否则 relay 会因环境页的笔误停摆），
 * 只保留原默认值；日志由调用方按需提示。
 *
 * @param raw - profile patch / settings.json 里的 environment 段（任意脏数据）
 * @param problems - 收集问题的数组（可选；目前只报告类型错误）
 * @returns `{ enabled, dir, webuiToken }`
 */
export function normalizeEnvConfig(raw, problems = []) {
  const out = { ...DEFAULT_ENVIRONMENT }
  if (raw === undefined || raw === null) return out
  if (!isPlainObject(raw)) {
    // 容错到底：类型错误也只回退默认值（problems 保留给调用方自行提示，不判死配置）。
    problems.push('environment 必须是对象（enabled / dir / webuiToken）')
    return out
  }
  if (raw.enabled !== undefined) {
    if (typeof raw.enabled !== 'boolean') problems.push('environment.enabled 必须是布尔值')
    else out.enabled = raw.enabled
  }
  const dir = normalizeDir(raw.dir)
  if (dir !== null) out.dir = dir
  const token = normalizeToken(raw.webuiToken)
  if (token !== null) out.webuiToken = token
  return out
}

/**
 * 对外（HTTP / 页面）的视图：**永不回显 webuiToken 本身**。
 *
 * @param raw - 任意输入
 * @returns `{ enabled, dir, webuiTokenConfigured }`
 */
export function maskEnvConfig(raw) {
  const source = isPlainObject(raw) ? raw : {}
  const dir = normalizeDir(source.dir)
  return {
    enabled: source.enabled !== false,
    dir: dir !== null ? dir : DEFAULT_ENVIRONMENT.dir,
    webuiTokenConfigured: typeof source.webuiToken === 'string' && source.webuiToken.trim() !== '',
  }
}

/** compose 文件内容（与 docs/onebot-channel.md §3.3 一致；token 用 JSON 字符串转义）。 */
export function renderComposeFile({ webuiToken }) {
  const token = typeof webuiToken === 'string' ? webuiToken : ''
  const tokenLine = '      WEBUI_TOKEN: ' + JSON.stringify(token)
  return [
    '# 由 dsh-qq-relay「环境」页生成；端口只绑定 127.0.0.1，数据都在 ./data 下。',
    'services:',
    '  napcat:',
    '    image: mlikiowa/napcat-docker:latest',
    '    container_name: ' + ENV_CONTAINER_NAME,
    '    restart: unless-stopped',
    '    environment:',
    '      MODE: ws',
    tokenLine,
    '    ports:',
    '      - "127.0.0.1:' + String(ENV_WEBUI_PORT) + ':' + String(ENV_WEBUI_PORT) + '"',
    '      - "127.0.0.1:' + String(ENV_ONEBOT_PORT) + ':' + String(ENV_ONEBOT_PORT) + '"',
    '    volumes:',
    '      - ./data/qq:/app/.config/QQ',
    '      - ./data/config:/app/napcat/config',
    '      - ./data/plugins:/app/napcat/plugins',
    '',
  ].join('\n')
}

/**
 * 静态解析 compose 文件（只看特征，不跑 docker）。
 *
 * @param text - compose 文件正文
 * @returns `{ tokenPresent, containerName, ports, volumeCount }`
 */
export function parseComposeFile(text) {
  const source = typeof text === 'string' ? text : ''
  const tokenMatch = source.match(/WEBUI_TOKEN:\s*("([^"]*)"|'([^']*)'|([^\s#]+))/u)
  const tokenValue = tokenMatch === null
    ? ''
    : (tokenMatch[2] ?? tokenMatch[3] ?? tokenMatch[4] ?? '')
  const containerMatch = source.match(/container_name:\s*([A-Za-z0-9_.-]+)/u)
  const ports = []
  const portRe = /-\s*["']?(?:127\.0\.0\.1:)?(\d{2,5}):(\d{2,5})["']?/gu
  let match
  while ((match = portRe.exec(source)) !== null) {
    ports.push({ host: Number(match[1]), container: Number(match[2]), loopback: source.includes('127.0.0.1:' + match[1]) })
  }
  return {
    tokenPresent: tokenValue !== '',
    containerName: containerMatch === null ? ENV_CONTAINER_NAME : containerMatch[1],
    ports,
    volumeCount: (source.match(/^\s*-\s+\.\//gmu) ?? []).length,
  }
}

/**
 * 校验 OneBot 配置对象（NapCat `onebot11_<uin>.json` 的格式）。
 *
 * @param value - 解析后的 JSON
 * @param options.expectedPort - 期望的 WS 端口（默认 3001）
 * @returns `{ servers, issues, ready, port, token, reportSelfMessage, messagePostFormat }`
 */
export function validateOneBotConfig(value, { expectedPort = ENV_ONEBOT_PORT } = {}) {
  const issues = []
  const empty = {
    servers: [],
    issues,
    ready: false,
    port: 0,
    token: '',
    reportSelfMessage: true,
    messagePostFormat: '',
  }
  if (!isPlainObject(value)) {
    issues.push('OneBot 配置不是 JSON 对象')
    return empty
  }
  const network = isPlainObject(value.network) ? value.network : value
  const serversRaw = Array.isArray(network.websocketServers) ? network.websocketServers : []
  const servers = serversRaw.filter(isPlainObject).map((server) => ({
    enable: server.enable === true,
    port: Number(server.port) || 0,
    token: typeof server.token === 'string' ? server.token : '',
    messagePostFormat: typeof server.messagePostFormat === 'string' ? server.messagePostFormat : '',
    reportSelfMessage: server.reportSelfMessage !== false,
  }))
  if (servers.length === 0) {
    issues.push('没有 websocketServers 配置')
    return { ...empty, servers }
  }
  const active = servers.find((server) => server.enable) ?? servers[0]
  if (servers.every((server) => !server.enable)) issues.push('WebSocket 服务器没有启用（enable）')
  if (active.port !== expectedPort) {
    issues.push('WebSocket 端口是 ' + String(active.port) + '，期望 ' + String(expectedPort) + '（与插件 wsUrl 一致）')
  }
  if (active.token === '') issues.push('WebSocket token 为空（插件无法通过校验）')
  if (active.messagePostFormat !== 'array') issues.push('messagePostFormat 不是 array')
  if (active.reportSelfMessage) issues.push('reportSelfMessage 应为 false（否则会回环自己的消息）')
  return {
    servers,
    issues,
    ready: issues.length === 0,
    port: active.port,
    token: active.token,
    reportSelfMessage: active.reportSelfMessage,
    messagePostFormat: active.messagePostFormat,
  }
}

/** 解析 ws(s) URL 的 host / 端口（端口缺省按协议 80 / 443）。 */
export function parseWsUrl(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') return null
  try {
    const url = new URL(raw.trim())
    if (url.protocol !== 'ws:' && url.protocol !== 'wss:') return null
    const fallback = url.protocol === 'wss:' ? 443 : 80
    return { host: url.hostname, port: Number(url.port) || fallback }
  } catch {
    return null
  }
}

/** 本机回环判断（只允许回填到本机 NapCat）。 */
export function isLoopbackHost(host) {
  return host === '127.0.0.1' || host === 'localhost' || host === '::1' || host === '[::1]'
}

function step(id, status, detail, evidence = [], actions = []) {
  return { id, title: ENV_STEPS.find((entry) => entry.id === id)?.title ?? id, status, detail, evidence, actions }
}

/**
 * 把一次探测快照求值成步骤清单。
 *
 * @param probe - controller 探测结果（见 docs/env.md 的 shape）
 * @param config - 规范化后的 `environment` 段
 * @returns `{ steps, summary, platformSupported }`
 */
export function evaluateEnvSteps(probe, config = DEFAULT_ENVIRONMENT) {
  const env = normalizeEnvConfig(config, [])
  const platform = typeof probe?.platform === 'string' ? probe.platform : ''
  const platformSupported = ENV_PLATFORMS.includes(platform)
  const docker = isPlainObject(probe?.docker) ? probe.docker : { ok: false, error: '未探测' }
  const compose = isPlainObject(probe?.compose) ? probe.compose : { ok: false, error: '未探测' }
  const daemon = isPlainObject(probe?.daemon) ? probe.daemon : { ok: false, error: '未探测' }
  const composeFile = isPlainObject(probe?.composeFile) ? probe.composeFile : { path: null, tokenPresent: false }
  const container = isPlainObject(probe?.container) ? probe.container : { name: ENV_CONTAINER_NAME, state: '', running: false }
  const login = isPlainObject(probe?.login) ? probe.login : { uin: 0, file: '' }
  const onebot = isPlainObject(probe?.onebot) ? probe.onebot : null
  const relay = isPlainObject(probe?.relay) ? probe.relay : {}
  const steps = []

  if (!platformSupported) {
    steps.push(step('docker-cli', 'skip', '当前平台（' + (platform || '未知') + '）暂不支持环境页：只支持 macOS（Colima）与 Linux（Docker）。', [], []))
    for (const id of ['docker-daemon', 'compose-file', 'container', 'login', 'onebot', 'relay']) {
      steps.push(step(id, 'skip', '暂不支持该平台。', [], []))
    }
    return { steps, summary: summarize(steps), platformSupported }
  }

  // 1) Docker CLI
  const installActions = platform === 'darwin' ? ['install-docker'] : []
  if (docker.ok) {
    steps.push(step('docker-cli', 'ok', docker.version || '已安装', ['docker --version → ' + (docker.version || 'ok')], []))
  } else {
    steps.push(step('docker-cli', 'error', docker.error || '未找到 docker 命令', docker.error ? [docker.error] : [], installActions))
  }

  // 2) 容器引擎
  if (!docker.ok) {
    steps.push(step('docker-daemon', 'skip', '先安装 Docker 命令行。', [], []))
  } else if (daemon.ok) {
    const where = daemon.provider ? '（' + daemon.provider + '）' : ''
    steps.push(step('docker-daemon', 'ok', '容器引擎已运行' + where, ['docker info → ' + (daemon.serverVersion || 'ok')], []))
  } else {
    steps.push(step('docker-daemon', 'error', '容器引擎未运行：' + (daemon.error || 'docker info 失败'), [], platform === 'darwin' ? ['start-daemon'] : []))
  }

  // 3) Compose 文件（只是文件检查，不依赖 docker 命令行）
  const composeActions = composeFile.path === null ? ['write-compose'] : (composeFile.tokenPresent ? [] : ['write-compose'])
  if (composeFile.path === null) {
    steps.push(step('compose-file', 'error', '环境目录里没有 compose.yaml / docker-compose.yml；可一键生成。', [], composeActions))
  } else if (!composeFile.tokenPresent) {
    steps.push(step('compose-file', 'warn', 'compose 文件缺少 WEBUI_TOKEN；WebUI 将无法用 token 打开（一键修复会覆盖生成，需确认）。', [composeFile.path], composeActions))
  } else {
    steps.push(step('compose-file', 'ok', '已就绪', [composeFile.path], []))
  }

  // 4) 容器
  if (!daemon.ok) {
    // 前置缺失时这里只能跳过；但说明里要写清「先解决哪一步」，否则用户只会看到「跳过」。
    steps.push(step('container', 'skip', '容器引擎没运行，无法检查 NapCat 容器：先解决上面的「容器引擎」这一步。', [], []))
  } else if (container.running) {
    steps.push(step('container', 'ok', '容器 ' + (container.name || ENV_CONTAINER_NAME) + ' 正在运行（' + (container.state || 'running') + '）', [], []))
  } else if (container.state !== '') {
    steps.push(step('container', 'warn', '容器 ' + (container.name || ENV_CONTAINER_NAME) + ' 存在但状态是 ' + container.state, [], ['compose-up']))
  } else {
    steps.push(step('container', 'error', '没有找到容器 ' + (container.name || ENV_CONTAINER_NAME) + '（docker inspect 失败）', [], ['compose-up']))
  }

  // 5) 登录
  const webuiActions = env.webuiToken !== '' ? ['open-webui'] : []
  if (login.file !== '') {
    steps.push(step('login', 'ok', '已登录（QQ ' + String(login.uin || '未知') + '）', [login.file], []))
  } else {
    steps.push(step('login', 'warn', env.webuiToken === ''
      ? '还没扫码登录；先在「环境目录」里填 WebUI token，再用下面的按钮打开 WebUI。'
      : '还没扫码登录：点「打开 WebUI」扫码。', [], webuiActions))
  }

  // 6) OneBot 配置
  if (onebot === null || onebot.file === '') {
    steps.push(step('onebot', 'skip', '登录后再检查 OneBot 配置。', [], []))
  } else if (onebot.error) {
    steps.push(step('onebot', 'error', 'OneBot 配置读取失败：' + onebot.error, [onebot.file], ['write-onebot']))
  } else if (onebot.ready) {
    steps.push(step('onebot', 'ok', '已启用：端口 ' + String(onebot.port) + ' / array / reportSelfMessage=false', [onebot.file], []))
  } else {
    steps.push(step('onebot', 'error', 'OneBot 配置待修正：' + (onebot.issues ?? []).join('；'), [onebot.file, ...(onebot.issues ?? [])], ['write-onebot']))
  }

  // 7) 插件回填 / 自检
  const ws = parseWsUrl(relay.wsUrl)
  const relayActions = onebot !== null && onebot.ready ? ['backfill-config'] : []
  if (relay.started !== true) {
    steps.push(step('relay', 'warn', 'relay 尚未启动（配置待补全，或另一个实例在运行）。', [], relayActions))
  } else if (relay.connected === true) {
    steps.push(step('relay', 'ok', '已连接 QQ ' + String(relay.selfId || '') + '；wsUrl ' + (relay.wsUrl || '（空）'), [], []))
  } else if (ws === null) {
    steps.push(step('relay', 'error', '插件 wsUrl 不是 ws:// 地址：' + (relay.wsUrl || '（空）'), [], relayActions))
  } else if (onebot !== null && onebot.ready && onebot.port !== ws.port) {
    steps.push(step('relay', 'error', 'wsUrl 端口 ' + String(ws.port) + ' 与 OneBot 端口 ' + String(onebot.port) + ' 不一致。', [], relayActions))
  } else if (relay.accessTokenConfigured !== true) {
    steps.push(step('relay', 'error', '插件还没有 access_token。', [], relayActions))
  } else {
    steps.push(step('relay', 'warn', '配置就绪，但还没连上（检查协议端 / 断线会重连）。', [], relayActions))
  }

  return { steps, summary: summarize(steps), platformSupported }
}

function summarize(steps) {
  const summary = { ok: 0, warn: 0, error: 0, skip: 0 }
  for (const entry of steps) {
    if (entry.status === 'ok') summary.ok += 1
    else if (entry.status === 'warn') summary.warn += 1
    else if (entry.status === 'error') summary.error += 1
    else summary.skip += 1
  }
  return summary
}

/**
 * 一键修复的执行顺序。
 *
 * 与 v0.23.0 的差别：**包含** `install-docker` / `start-daemon`（页面确认后执行），
 * 这样新机器点一次「一键修复」就能从装引擎一路走到 `compose-up`；
 * `restart-napcat` 不再出现在链里——写 OneBot 配置时本身会重启 NapCat（见 controller）。
 */
export const ENV_FIX_ORDER = Object.freeze([
  'install-docker',
  'start-daemon',
  'write-compose',
  'compose-up',
  'write-onebot',
  'backfill-config',
])

/**
 * 一键修复的动作序列（按 {@link ENV_FIX_ORDER} 排序）。
 *
 * 只收集「未通过 / 待处理」步骤自己列出的动作：前置缺失被 `skip` 的步骤不贡献动作，
 * 由调用方**每执行一个动作后重新探测**，让 skip 逐步变成 error 再进入下一轮——
 * 这一步是「逐步补全」的关键，只算一次快照会漏掉 NapCat 容器（compose-up）。
 *
 * @param steps - `evaluateEnvSteps` 的结果
 * @returns 动作 id 数组（按执行顺序；可能为空）
 */
export function computeFixSequence(steps) {
  const pending = new Set()
  for (const entry of steps) {
    if (entry.status === 'ok' || entry.status === 'skip') continue
    for (const action of entry.actions) {
      if (action === 'open-webui') continue
      pending.add(action)
    }
  }
  return ENV_FIX_ORDER.filter((action) => pending.has(action))
}

/**
 * 第一个还没通过的步骤（页面用来提示「下一步做什么」）。
 *
 * @param steps - `evaluateEnvSteps` 的结果
 * @returns `{ id, title, status, detail }` 或 null（全部通过）
 */
export function nextEnvStep(steps) {
  if (!Array.isArray(steps)) return null
  for (const entry of steps) {
    if (entry.status === 'ok') continue
    return { id: entry.id, title: entry.title, status: entry.status, detail: entry.detail }
  }
  return null
}

/**
 * 动作命令的固定 argv（不经 shell 拼接；缺上下文 / 平台不支持时返回 null）。
 *
 * @param id - 动作 id
 * @param options.platform - process.platform
 * @param options.composePath - compose 文件绝对路径（write-compose 之外的动作需要）
 * @param options.containerName - 容器名
 * @returns `{ bin, args, cwd }` 或 `{ error }`
 */
export function buildActionArgv(id, { platform = process.platform, composePath = '', containerName = ENV_CONTAINER_NAME } = {}) {
  if (id === 'install-docker') {
    if (platform !== 'darwin') return { error: '只支持 macOS（brew install colima docker docker-compose）' }
    return { bin: 'brew', args: ['install', 'colima', 'docker', 'docker-compose'], cwd: '' }
  }
  if (id === 'start-daemon') {
    if (platform !== 'darwin') return { error: '只支持 macOS（colima start）' }
    return { bin: 'colima', args: ['start', '--cpu', '4', '--memory', '4', '--disk', '60', '--vm-type', 'vz'], cwd: '' }
  }
  if (composePath === '') {
    if (id === 'compose-up' || id === 'restart-napcat') return { error: '还没有 compose 文件：先「生成 Compose 文件」。' }
    return null
  }
  if (id === 'compose-up') {
    return { bin: 'docker', args: ['compose', '-f', composePath, 'up', '-d'], cwd: '' }
  }
  if (id === 'restart-napcat') {
    return { bin: 'docker', args: ['compose', '-f', composePath, 'restart', containerName], cwd: '' }
  }
  return null
}

/** 脱敏：把已知 secret（长度 ≥ 4）替换成 ***。 */
export function redactSecrets(text, secrets = []) {
  let out = typeof text === 'string' ? text : String(text ?? '')
  for (const secret of secrets) {
    if (typeof secret !== 'string' || secret.length < 4) continue
    out = out.split(secret).join('***')
  }
  return out
}

/**
 * 动作日志环形缓冲（token 在写入前脱敏）。
 *
 * @param options.limit - 保留条数（默认 {@link ENV_LOG_LIMIT}）
 * @param options.now - 时间源（单测注入）
 * @returns `{ append, since, tail, cursor, clear }`
 */
export function createLogBuffer({ limit = ENV_LOG_LIMIT, now = () => Date.now() } = {}) {
  const entries = []
  let seq = 0
  function append(level, text, secrets = []) {
    const message = redactSecrets(text, secrets).replace(/\r\n?/gu, '\n').trimEnd()
    if (message === '') return seq
    seq += 1
    entries.push({ seq, at: now(), level: level === 'error' ? 'error' : (level === 'warn' ? 'warn' : 'info'), text: message })
    while (entries.length > limit) entries.shift()
    return seq
  }
  function since(after = 0) {
    const cursor = Number.isFinite(after) ? after : 0
    return entries.filter((entry) => entry.seq > cursor)
  }
  function tail(count = 50) {
    const size = Number.isInteger(count) && count > 0 ? count : 50
    return entries.slice(-size)
  }
  return {
    append,
    since,
    tail,
    cursor: () => seq,
    clear: () => { entries.length = 0 },
  }
}
