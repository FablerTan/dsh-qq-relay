/**
 * 配置规范化与校验（P1；P2.1 起含 gate 闸门配置段）。
 *
 * 配置来自 profile 的 `cordis.patch.yml`（`- id: dsh-qq-relay` + `config:`），
 * 由 host 组合根在 `apply(ctx, config)` 拿到后交给这里。
 *
 * 纪律：**永不抛异常**。校验失败返回 `{ ok: false, problems }`，由调用方决定
 * 打日志并静默不启动（fail closed），不能因为配置写错而 crash boot。
 */

import { homedir } from 'node:os'
import { isAbsolute, join } from 'node:path'

import { DEFAULT_GATE, normalizeGateConfig, parseDuration } from './gate.js'
import { DEFAULT_APPROVAL_ROLES } from './approval.js'
import { DEFAULT_COMMAND_ROLES } from './commands.js'

/** 默认值；调用方不应直接改这个对象。 */
export const DEFAULT_CONFIG = Object.freeze({
  /** NapCat 正向 WS 地址，例如 ws://127.0.0.1:3001 */
  wsUrl: '',
  /** OneBot access_token；建议用 $DSH_HOME/.env + !!js 引用 */
  accessToken: '',
  /** bot 小号 QQ 号，连接后用 get_login_info 校验 */
  selfId: 0,
  /** 群白名单；未列出的群直接丢弃 */
  groups: [],
  /** relay 会话的默认工作目录（未单独配置群项目时用） */
  workspace: '~/dsh/qq-relay-ws',
  /** 群级项目目录：群号 → 项目绝对路径（聊天记录与会话 cwd 都落在这里） */
  groupWorkspaces: Object.freeze({}),
  /** 聊天记录保留天数；0 = 永不自动删除（默认，用户 2026-10-19 决定） */
  chatRetentionDays: 0,
  /** 自动创建会话的标题模板 */
  sessionTitle: 'QQ群：{groupName}',
  /** 出向文本切分上限（字符数） */
  replyChunkSize: 1500,
  /** 直通命令前缀（群消息以这些前缀开头时绕过闸门） */
  commandPrefixes: Object.freeze(['/dsh']),
  /** QQ 侧命令层（A / v0.11.0）：/new /stop /status /help */
  commands: Object.freeze({ enabled: true, bare: true, roles: Object.freeze(['owner', 'admin']) }),
  /** 出向回复体验（v0.11.1）：引用触发消息 / 处理中占位 / 直通连发合并 */
  reply: Object.freeze({ quote: true, ackDelayMs: 8000, mergeWindowMs: 400 }),
  /** 戳一戳（v0.15.0）：识别群内 poke 事件；被戳时触发一轮回复，按群冷却防刷屏 */
  poke: Object.freeze({ enabled: true, react: true, cooldownMs: 10 * 1000 }),
  /** 断线重连退避 */
  reconnect: Object.freeze({ minMs: 1000, maxMs: 30000 }),
  /** 消息闸门（P2）；默认关闭，行为与 P1 一致（只直通 @ / 引用 / 命令） */
  gate: DEFAULT_GATE,
  /** QQ 侧审批（P3）：把需要人确认的操作发到群里，用文本命令决定 */
  approval: Object.freeze({ enabled: true, timeoutMs: 120 * 1000, roles: Object.freeze(['owner', 'admin']) }),
})

/** 把 `~` / `~/x` 展开为绝对路径。 */
export function expandHome(path) {
  if (typeof path !== 'string' || path === '') return path
  if (path === '~') return homedir()
  if (path.startsWith('~/')) return join(homedir(), path.slice(2))
  return path
}

function isPositiveInt(value) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function normalizeGroups(raw, problems) {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) {
    problems.push('groups 必须是群号数组')
    return []
  }
  const seen = new Set()
  const out = []
  for (const item of raw) {
    const value = typeof item === 'string' && item.trim() !== '' ? Number(item) : item
    if (!isPositiveInt(value)) {
      problems.push('groups 里有非法群号：' + String(item))
      continue
    }
    if (seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}

function normalizeCommandPrefixes(raw, problems) {
  if (raw === undefined) return [...DEFAULT_CONFIG.commandPrefixes]
  if (!Array.isArray(raw)) {
    problems.push('commandPrefixes 必须是字符串数组')
    return [...DEFAULT_CONFIG.commandPrefixes]
  }
  const out = []
  for (const item of raw) {
    if (typeof item !== 'string' || item.trim() === '') {
      problems.push('commandPrefixes 里有非法前缀：' + String(item))
      continue
    }
    out.push(item.trim())
  }
  return out
}

function normalizeGroupWorkspaces(raw, problems) {
  if (raw === undefined || raw === null) return {}
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    problems.push('groupWorkspaces 必须是对象（群号 → 项目路径）')
    return {}
  }
  const out = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!/^\d+$/.test(key)) {
      problems.push('groupWorkspaces 的键必须是群号：' + key)
      continue
    }
    if (typeof value !== 'string' || value.trim() === '') {
      problems.push('groupWorkspaces["' + key + '"] 必须是非空的项目路径')
      continue
    }
    const expanded = expandHome(value.trim())
    if (!isAbsolute(expanded)) {
      problems.push('groupWorkspaces["' + key + '"] 必须是绝对路径（或 ~ 开头）：' + value)
      continue
    }
    out[key] = expanded
  }
  return out
}

function normalizeChatRetentionDays(raw, problems) {
  if (raw === undefined || raw === null) return DEFAULT_CONFIG.chatRetentionDays
  const value = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw
  if (!Number.isInteger(value) || value < 0 || value > 3650 || (value > 0 && value < 7)) {
    problems.push('chatRetentionDays 必须是 0（永不删除）或 7..3650 的整数')
    return DEFAULT_CONFIG.chatRetentionDays
  }
  return value
}

const APPROVAL_ROLE_VALUES = ['owner', 'admin', 'member']

function normalizeApproval(raw, problems) {
  const base = { enabled: true, timeoutMs: 120 * 1000, roles: [...DEFAULT_APPROVAL_ROLES] }
  if (raw === undefined) return base
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    problems.push('approval 必须是对象')
    return base
  }
  const out = { ...base }
  if (raw.enabled !== undefined) {
    if (typeof raw.enabled !== 'boolean') problems.push('approval.enabled 必须是布尔值')
    else out.enabled = raw.enabled
  }
  if (raw.timeoutMs !== undefined) {
    const ms = parseDuration(raw.timeoutMs)
    if (ms === null || ms < 10 * 1000 || ms > 10 * 60 * 1000) {
      problems.push('approval.timeoutMs 非法（需 10s..10m，或毫秒数字）')
    } else {
      out.timeoutMs = ms
    }
  }
  if (raw.roles !== undefined) {
    if (!Array.isArray(raw.roles) || raw.roles.length === 0) {
      problems.push('approval.roles 必须是非空数组（owner / admin / member）')
    } else {
      const bad = raw.roles.filter((role) => !APPROVAL_ROLE_VALUES.includes(role))
      if (bad.length > 0) problems.push('approval.roles 里有非法角色：' + bad.join(', '))
      else out.roles = [...new Set(raw.roles)]
    }
  }
  return out
}

const COMMAND_ROLE_VALUES = APPROVAL_ROLE_VALUES

function normalizeCommands(raw, problems) {
  const base = { enabled: true, bare: true, roles: [...DEFAULT_COMMAND_ROLES] }
  if (raw === undefined) return base
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    problems.push('commands 必须是对象')
    return base
  }
  const out = { ...base, roles: [...base.roles] }
  if (raw.enabled !== undefined) {
    if (typeof raw.enabled !== 'boolean') problems.push('commands.enabled 必须是布尔值')
    else out.enabled = raw.enabled
  }
  if (raw.bare !== undefined) {
    if (typeof raw.bare !== 'boolean') problems.push('commands.bare 必须是布尔值')
    else out.bare = raw.bare
  }
  if (raw.roles !== undefined) {
    if (!Array.isArray(raw.roles) || raw.roles.length === 0) {
      problems.push('commands.roles 必须是非空数组（owner / admin / member）')
    } else {
      const bad = raw.roles.filter((role) => !COMMAND_ROLE_VALUES.includes(role))
      if (bad.length > 0) problems.push('commands.roles 里有非法角色：' + bad.join(', '))
      else out.roles = [...new Set(raw.roles)]
    }
  }
  return out
}

function normalizeReply(raw, problems) {
  const base = { quote: true, ackDelayMs: 8000, mergeWindowMs: 400 }
  if (raw === undefined) return base
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    problems.push('reply 必须是对象')
    return base
  }
  const out = { ...base }
  if (raw.quote !== undefined) {
    if (typeof raw.quote !== 'boolean') problems.push('reply.quote 必须是布尔值')
    else out.quote = raw.quote
  }
  if (raw.ackDelayMs !== undefined) {
    const ms = parseDuration(raw.ackDelayMs)
    if (ms === null || ms < 0 || ms > 120 * 1000) {
      problems.push('reply.ackDelayMs 非法（需 0..120s，0 = 关闭处理中占位）')
    } else {
      out.ackDelayMs = ms
    }
  }
  if (raw.mergeWindowMs !== undefined) {
    const ms = parseDuration(raw.mergeWindowMs)
    if (ms === null || ms < 0 || ms > 5000) {
      problems.push('reply.mergeWindowMs 非法（需 0..5s，0 = 不合并连发）')
    } else {
      out.mergeWindowMs = ms
    }
  }
  return out
}

/** 戳一戳配置（v0.15.0）：是否识别 / 被戳是否接话 / 每群冷却。 */
function normalizePoke(raw, problems) {
  const base = { enabled: true, react: true, cooldownMs: 10 * 1000 }
  if (raw === undefined) return base
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    problems.push('poke 必须是对象')
    return base
  }
  const out = { ...base }
  if (raw.enabled !== undefined) {
    if (typeof raw.enabled !== 'boolean') problems.push('poke.enabled 必须是布尔值')
    else out.enabled = raw.enabled
  }
  if (raw.react !== undefined) {
    if (typeof raw.react !== 'boolean') problems.push('poke.react 必须是布尔值')
    else out.react = raw.react
  }
  if (raw.cooldownMs !== undefined) {
    const ms = parseDuration(raw.cooldownMs)
    if (ms === null || ms < 0 || ms > 10 * 60 * 1000) {
      problems.push('poke.cooldownMs 非法（需 0..10m，0 = 不限制）')
    } else {
      out.cooldownMs = ms
    }
  }
  return out
}

function normalizeReconnect(raw, problems) {
  const base = { ...DEFAULT_CONFIG.reconnect }
  if (raw === undefined) return base
  if (raw === null || typeof raw !== 'object') {
    problems.push('reconnect 必须是对象')
    return base
  }
  const minMs = raw.minMs ?? base.minMs
  const maxMs = raw.maxMs ?? base.maxMs
  if (!isPositiveInt(minMs) || !isPositiveInt(maxMs) || maxMs < minMs) {
    problems.push('reconnect.minMs / maxMs 非法（需正整数且 maxMs >= minMs）')
    return base
  }
  return { minMs, maxMs }
}

/**
 * 规范化并校验配置。
 *
 * @param raw profile patch 里的 config（可能为 undefined / 任意脏数据）
 * @returns {{ ok: boolean, config: object, problems: string[] }}
 */
export function normalizeConfig(raw) {
  const problems = []
  const input = raw !== null && typeof raw === 'object' ? raw : {}

  const wsUrl = typeof input.wsUrl === 'string' ? input.wsUrl.trim() : ''
  if (wsUrl === '') {
    problems.push('wsUrl 必填')
  } else {
    try {
      const url = new URL(wsUrl)
      if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
        problems.push('wsUrl 必须是 ws:// 或 wss:// 地址')
      }
    } catch {
      problems.push('wsUrl 不是合法 URL：' + wsUrl)
    }
  }

  const accessToken = typeof input.accessToken === 'string' ? input.accessToken.trim() : ''
  if (accessToken === '') problems.push('accessToken 必填（建议从 \$DSH_HOME/.env 读取）')

  const selfId = typeof input.selfId === 'string' && input.selfId.trim() !== '' ? Number(input.selfId) : input.selfId
  if (!isPositiveInt(selfId)) problems.push('selfId 必须是正整数（bot 小号 QQ 号）')

  const groups = normalizeGroups(input.groups, problems)

  const workspaceRaw = typeof input.workspace === 'string' && input.workspace.trim() !== '' ? input.workspace.trim() : DEFAULT_CONFIG.workspace
  const workspace = expandHome(workspaceRaw)
  if (!isAbsolute(workspace)) problems.push('workspace 必须是绝对路径（或 ~ 开头）：' + workspaceRaw)

  const groupWorkspaces = normalizeGroupWorkspaces(input.groupWorkspaces, problems)

  const sessionTitle = typeof input.sessionTitle === 'string' && input.sessionTitle.trim() !== '' ? input.sessionTitle.trim() : DEFAULT_CONFIG.sessionTitle

  const chunkRaw = input.replyChunkSize === undefined ? DEFAULT_CONFIG.replyChunkSize : input.replyChunkSize
  const replyChunkSize = typeof chunkRaw === 'string' && chunkRaw.trim() !== '' ? Number(chunkRaw) : chunkRaw
  if (!isPositiveInt(replyChunkSize) || replyChunkSize < 100 || replyChunkSize > 20000) {
    problems.push('replyChunkSize 必须是 100..20000 之间的整数')
  }

  const chatRetentionDays = normalizeChatRetentionDays(input.chatRetentionDays, problems)
  const commandPrefixes = normalizeCommandPrefixes(input.commandPrefixes, problems)
  const reconnect = normalizeReconnect(input.reconnect, problems)
  const gate = normalizeGateConfig(input.gate, problems)
  const approval = normalizeApproval(input.approval, problems)
  const commands = normalizeCommands(input.commands, problems)
  const reply = normalizeReply(input.reply, problems)
  const poke = normalizePoke(input.poke, problems)

  return {
    ok: problems.length === 0,
    problems,
    config: {
      wsUrl,
      accessToken,
      selfId,
      groups,
      workspace,
      groupWorkspaces,
      chatRetentionDays,
      sessionTitle,
      replyChunkSize: Math.min(Math.max(Number.isFinite(replyChunkSize) ? replyChunkSize : DEFAULT_CONFIG.replyChunkSize, 100), 20000),
      commandPrefixes,
      reconnect,
      gate,
      approval,
      commands,
      reply,
      poke,
    },
  }
}

/** 用群名生成会话标题；群名缺失时退化为群号。 */
export function formatSessionTitle(template, { groupId, groupName }) {
  const tpl = typeof template === 'string' && template !== '' ? template : DEFAULT_CONFIG.sessionTitle
  const name = typeof groupName === 'string' && groupName !== '' ? groupName : '群 ' + String(groupId)
  return tpl.replaceAll('{groupName}', name).replaceAll('{groupId}', String(groupId))
}
