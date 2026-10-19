/**
 * QQ 侧命令层（A / v0.11.0）：解析、角色校验与回复文案。
 *
 * 支持两种写法（见 docs/commands.md）：
 * - 前缀式：`/dsh new`（前缀取 config.commandPrefixes）
 * - 裸写式：`/new`（config.commands.bare !== false）
 *
 * 纪律：只识别 COMMAND_ALIASES 里的命令名；不认识的 `/xxx` 一律返回 null，
 * 交回 relay 按原有「命令前缀直通」逻辑处理（也就是照旧转给 DSH）。
 * 这里是纯逻辑：不碰 DSH 服务、不发消息、不读文件。
 */

/** 命令别名 → 规范名；键统一小写。 */
export const COMMAND_ALIASES = Object.freeze({
  new: 'new',
  newchat: 'new',
  reset: 'new',
  stop: 'stop',
  cancel: 'stop',
  status: 'status',
  info: 'status',
  help: 'help',
  '?': 'help',
  菜单: 'help',
})

/** 规范命令名（用于文档 / 帮助文案排序）。 */
export const COMMAND_NAMES = Object.freeze(['new', 'stop', 'status', 'help'])

/** 默认允许执行命令的角色（与审批桥一致：群主 / 管理员）。 */
export const DEFAULT_COMMAND_ROLES = Object.freeze(['owner', 'admin'])

function firstToken(value) {
  const match = /^\S+/.exec(value)
  return match === null ? '' : match[0]
}

function splitCommand(value) {
  const token = firstToken(value)
  if (token === '') return null
  const name = COMMAND_ALIASES[token.toLowerCase()]
  if (name === undefined) return null
  const args = value.slice(token.length).trim()
  return { name, args }
}

function sortedPrefixes(prefixes) {
  if (!Array.isArray(prefixes)) return []
  return prefixes
    .filter((prefix) => typeof prefix === 'string' && prefix !== '')
    .slice()
    .sort((left, right) => right.length - left.length)
}

/**
 * 解析一条群消息文本里的命令。
 *
 * @param text - 消息正文（未 trim 也可）
 * @param options.prefixes - 命令前缀（config.commandPrefixes）
 * @param options.bare - 是否接受裸写的 `/new` 形式
 * @returns `{ name, args, form, prefix } | null`
 */
export function parseCommand(text, { prefixes = [], bare = true } = {}) {
  if (typeof text !== 'string') return null
  const value = text.trim()
  if (value === '') return null

  for (const prefix of sortedPrefixes(prefixes)) {
    if (!value.startsWith(prefix)) continue
    // 前缀后必须是空白或结尾：避免把 /dshnew 当成 /dsh new。
    if (value.length > prefix.length && !/\s/.test(value[prefix.length])) continue
    const rest = value.slice(prefix.length).trim()
    if (rest === '') continue
    const parsed = splitCommand(rest)
    if (parsed !== null) return { ...parsed, form: 'prefix', prefix }
  }

  if (bare === true && value.startsWith('/')) {
    const parsed = splitCommand(value.slice(1).trimStart())
    if (parsed !== null) return { ...parsed, form: 'bare', prefix: '/' }
  }
  return null
}

/**
 * 发送者是否有执行命令的资格（按群角色 owner / admin）。
 *
 * @param event - 内部群消息事件（用 sender.role）
 * @param roles - 允许的角色列表
 */
export function canRunCommand(event, roles = DEFAULT_COMMAND_ROLES) {
  const role = typeof event?.sender?.role === 'string' ? event.sender.role : ''
  return Array.isArray(roles) && roles.includes(role)
}

/** 命令帮助文案（纯文本，QQ 不渲染 Markdown）。 */
export function formatCommandHelp({ prefixes = ['/dsh'] } = {}) {
  const prefix = Array.isArray(prefixes) && typeof prefixes[0] === 'string' && prefixes[0] !== ''
    ? prefixes[0]
    : '/dsh'
  return [
    '【QQ relay 命令】',
    '/new [标题]  新建会话并绑定本群（旧会话留在 GUI）',
    '/stop        中断当前正在跑的轮次',
    '/status      查看会话 / 闸门 / 队列状态',
    '/help        显示这份帮助',
    '',
    '前缀写法同样可用：' + prefix + ' new；仅群主 / 管理员可执行。',
  ].join('\n')
}

/**
 * 新会话标题：给了参数就用参数，否则在原模板标题后加时间后缀。
 *
 * @param baseTitle - sessionTitle 模板渲染后的标题
 * @param options.args - `/new` 后面的自定义标题
 * @param options.now - 时间源（单测注入）
 */
export function formatNewSessionTitle(baseTitle, { args = '', now = Date.now() } = {}) {
  const custom = typeof args === 'string' ? args.trim() : ''
  if (custom !== '') return custom.slice(0, 60)
  const date = new Date(now)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return String(baseTitle) + '（' + hh + ':' + mm + '）'
}

/** 毫秒 → 人类可读时长（5s / 10s / 45s / 2h）。 */
export function formatDuration(ms) {
  const value = Number(ms)
  if (!Number.isFinite(value) || value <= 0) return '0s'
  if (value < 1000) return String(Math.round(value)) + 'ms'
  if (value < 60 * 1000) {
    const seconds = value / 1000
    return (Number.isInteger(seconds) ? String(seconds) : seconds.toFixed(1)) + 's'
  }
  const minutes = Math.round(value / (60 * 1000))
  if (minutes < 60) return String(minutes) + 'm'
  const hours = value / (60 * 60 * 1000)
  return (Number.isInteger(hours) ? String(hours) : hours.toFixed(1)) + 'h'
}

/** 时间戳 → 「刚刚 / N 分钟前」；没有时间则返回空串。 */
export function formatAgo(timeMs, now = Date.now()) {
  const at = Number(timeMs)
  if (!Number.isFinite(at) || at <= 0) return ''
  const diff = Math.max(0, now - at)
  if (diff < 60 * 1000) return '刚刚'
  const minutes = Math.floor(diff / (60 * 1000))
  if (minutes < 60) return String(minutes) + ' 分钟前'
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return String(hours) + ' 小时前'
  return String(Math.floor(hours / 24)) + ' 天前'
}

function clockOf(timeMs) {
  const date = new Date(timeMs)
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, '0'))
    .join(':')
}

/** `/status` 的回复文案。 */
export function formatStatusReply(fields = {}) {
  const {
    groupId = 0,
    groupName = '',
    sessionTitle = '',
    sessionId = '',
    projectDir = '',
    gate = null,
    pendingMessages = 0,
    pendingGroups = 0,
    lastReplyAt = 0,
    dshBusy = false,
    queue = 0,
    sendQueue = 0,
    now = Date.now(),
  } = fields

  const groupText = groupName !== '' ? String(groupId) + '（' + groupName + '）' : String(groupId)
  const lines = ['【QQ relay 状态】', '群：' + groupText]
  if (sessionId === '') {
    lines.push('会话：未创建（收到消息后自动建）')
  } else {
    lines.push('会话：' + (sessionTitle !== '' ? sessionTitle : '未命名') + '（' + sessionId + '）')
  }
  if (typeof projectDir === 'string' && projectDir !== '') lines.push('项目：' + projectDir)
  if (gate === null || gate === undefined) {
    lines.push('闸门：未知')
  } else if (gate.enabled !== true) {
    lines.push('闸门：关（普通消息不接话，@ / 引用 / 命令仍直通）')
  } else {
    lines.push('闸门：开 · 阈值 ' + Number(gate.jevThreshold ?? 0).toFixed(2)
      + ' · 去抖 ' + formatDuration(gate.debounceMs)
      + ' · 最小间隔 ' + formatDuration(gate.fastMinReplyIntervalMs))
  }
  lines.push('待评估：' + String(pendingMessages) + ' 条 / ' + String(pendingGroups) + ' 批')
  if (Number.isFinite(Number(lastReplyAt)) && Number(lastReplyAt) > 0) {
    lines.push('最近发言：' + clockOf(Number(lastReplyAt)) + '（' + formatAgo(Number(lastReplyAt), now) + '）')
  } else {
    lines.push('最近发言：还没发过言')
  }
  lines.push('运行中：' + (dshBusy === true ? '是' : '否') + ' · 等待派发：' + String(queue) + ' 条 · 待发送：' + String(sendQueue) + ' 条')
  return lines.join('\n')
}
