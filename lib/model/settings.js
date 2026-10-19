/**
 * 运行期配置覆盖（P1.5 基础配置页）：设置页保存的字段落盘到
 * `~/.dsh/storages/dsh-qq-relay/settings.json`，叠加在 profile patch 之上。
 *
 * 层序（后写覆盖前写）：
 *   1. profile `cordis.patch.yml` 里 `- id: dsh-qq-relay` 的 `config`
 *      （可含 `!!js`，从启动环境读 token）；
 *   2. 本文件（设置页保存的覆盖）。
 *
 * 两层都是**启动/保存时的快照**：改动后由组合根重建连接
 * （见 `controller/runtime.js` 的 `applyConfig`），不做字段级热更新。
 *
 * 纪律：
 *  - 只允许页面覆盖 {@link EDITABLE_KEYS}；`reconnect` 等其余字段保持 patch 只读；
 *  - **token 永不回显**：对外视图只给 `accessTokenConfigured` / `accessTokenSource`；
 *  - 读容忍脏数据（坏文件当空覆盖），写用临时文件 + rename 原子替换；
 *  - 校验一律复用 {@link normalizeConfig}，失败时返回 problems 而不是抛异常。
 */

import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { normalizeConfig } from './config.js'
import { DEFAULT_GATE } from './gate.js'

/** settings.json 的结构版本；将来换字段布局时用于迁移。 */
export const SETTINGS_VERSION = 1

/** 允许设置页覆盖的字段（其余 patch 字段只读）。 */
export const EDITABLE_KEYS = Object.freeze([
  'wsUrl',
  'accessToken',
  'selfId',
  'groups',
  'workspace',
  'groupWorkspaces',
  'chatRetentionDays',
  'gate',
  'sessionTitle',
  'replyChunkSize',
  'commandPrefixes',
])

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** 设置页可改的 gate 子项（其余 gate 字段仍 patch 只读）。 */
export const EDITABLE_GATE_KEYS = Object.freeze(['debounce', 'fastMinReplyInterval', 'jevThreshold'])

function pickGate(raw) {
  if (!isPlainObject(raw)) return null
  const gate = {}
  for (const key of EDITABLE_GATE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) continue
    const value = raw[key]
    if (value === undefined || value === null) continue
    gate[key] = value
  }
  return Object.keys(gate).length > 0 ? gate : null
}

/**
 * 从任意输入里挑出可覆盖字段。
 * `undefined` / `null` 视为「本次不修改」——页面保存时用字段缺省表达「没动它」。
 *
 * @param raw - 页面提交的 patch（可能含未知键 / 脏类型）
 * @returns 仅含 {@link EDITABLE_KEYS} 的子集（浅拷贝）
 */
export function pickEditable(raw) {
  const out = {}
  if (!isPlainObject(raw)) return out
  for (const key of EDITABLE_KEYS) {
    if (key === 'gate') continue
    if (!Object.prototype.hasOwnProperty.call(raw, key)) continue
    const value = raw[key]
    if (value === undefined || value === null) continue
    out[key] = value
  }
  const gate = pickGate(raw.gate)
  if (gate !== null) out.gate = gate
  return out
}

/**
 * 合并 patch 配置与页面覆盖：覆盖只在 {@link EDITABLE_KEYS} 上生效。
 *
 * @param patchConfig - profile patch 里的 config（任意值）
 * @param overrides - settings.json 里的覆盖（任意值）
 * @returns 合并后的原始 config（尚未校验）
 */
export function mergeConfig(patchConfig, overrides) {
  const base = isPlainObject(patchConfig) ? patchConfig : {}
  const picked = pickEditable(overrides)
  const merged = { ...base, ...picked }
  if (picked.gate !== undefined) {
    // gate 是嵌套对象：只覆盖设置页允许的子项，其余字段保留 patch 值。
    const baseGate = isPlainObject(base.gate) ? base.gate : {}
    merged.gate = { ...baseGate, ...picked.gate }
  }
  return merged
}

/**
 * 解析「patch + 覆盖」的最终配置。
 *
 * @param patchConfig - profile patch 里的 config
 * @param overrides - settings.json 里的覆盖
 * @returns {@link normalizeConfig} 的结果（`ok` / `problems` / `config`）
 */
export function resolveConfig(patchConfig, overrides) {
  return normalizeConfig(mergeConfig(patchConfig, overrides))
}

/**
 * 对外（HTTP）的配置视图：**绝不含 token 本身**。
 *
 * 容错：即使 config 是非法数据，也返回可渲染的空值，页面不会因脏配置白屏。
 *
 * @param config - 规范化后的 config（或任意脏数据）
 * @param options.accessTokenSource - token 来自哪层（`settings` / `profile`）
 * @returns 可安全 JSON 化的配置视图
 */
export function maskConfig(config, options = {}) {
  const source = isPlainObject(config) ? config : {}
  const groups = Array.isArray(source.groups)
    ? source.groups.filter((groupId) => Number.isInteger(groupId) && groupId > 0)
    : []
  const prefixes = Array.isArray(source.commandPrefixes)
    ? source.commandPrefixes.filter((prefix) => typeof prefix === 'string' && prefix !== '')
    : []
  const accessToken = typeof source.accessToken === 'string' ? source.accessToken : ''
  const groupWorkspaces = {}
  if (source.groupWorkspaces !== null && typeof source.groupWorkspaces === 'object' && !Array.isArray(source.groupWorkspaces)) {
    for (const [key, value] of Object.entries(source.groupWorkspaces)) {
      if (!/^\d+$/.test(key)) continue
      if (typeof value !== 'string' || value === '') continue
      groupWorkspaces[key] = value
    }
  }
  const retention = Number.isInteger(source.chatRetentionDays) && source.chatRetentionDays >= 0
    ? source.chatRetentionDays
    : 0
  return {
    wsUrl: typeof source.wsUrl === 'string' ? source.wsUrl : '',
    selfId: Number.isInteger(source.selfId) && source.selfId > 0 ? source.selfId : 0,
    groups,
    workspace: typeof source.workspace === 'string' ? source.workspace : '',
    groupWorkspaces,
    chatRetentionDays: retention,
    gate: {
      debounceMs: Number.isFinite(source.gate?.debounce) ? source.gate.debounce : DEFAULT_GATE.debounce,
      fastMinReplyIntervalMs: Number.isFinite(source.gate?.fastMinReplyInterval)
        ? source.gate.fastMinReplyInterval
        : DEFAULT_GATE.fastMinReplyInterval,
      jevThreshold: Number.isFinite(source.gate?.jevThreshold)
        ? source.gate.jevThreshold
        : DEFAULT_GATE.jevThreshold,
    },
    sessionTitle: typeof source.sessionTitle === 'string' ? source.sessionTitle : '',
    replyChunkSize: Number.isInteger(source.replyChunkSize) ? source.replyChunkSize : 0,
    commandPrefixes: prefixes,
    accessTokenConfigured: accessToken !== '',
    accessTokenSource: options.accessTokenSource === 'settings' ? 'settings' : 'profile',
  }
}

/**
 * settings.json 读写器（路径由组合根给出，便于单测传临时目录）。
 *
 * @param filePath - settings.json 的绝对路径
 * @returns `{ filePath, load, save }`
 */
export function createSettingsStore(filePath) {
  /** 读取覆盖；坏文件 / 缺文件都当空覆盖，永不抛。 */
  function load() {
    try {
      if (!existsSync(filePath)) return {}
      const parsed = JSON.parse(readFileSync(filePath, 'utf8'))
      if (!isPlainObject(parsed) || !isPlainObject(parsed.config)) return {}
      return pickEditable(parsed.config)
    } catch {
      return {}
    }
  }

  /**
   * 原子写入覆盖。
   *
   * @param overrides - 覆盖字段（仅 {@link EDITABLE_KEYS} 生效）
   * @returns 实际写下的结构化内容
   */
  function save(overrides) {
    const dir = dirname(filePath)
    mkdirSync(dir, { recursive: true })
    const payload = {
      version: SETTINGS_VERSION,
      updatedAt: Date.now(),
      config: pickEditable(overrides),
    }
    const tmp = join(dir, '.' + String(process.pid) + '.settings.json.tmp')
    writeFileSync(tmp, JSON.stringify(payload, null, 2) + '\n', 'utf8')
    try {
      renameSync(tmp, filePath)
    } catch (error) {
      try { unlinkSync(tmp) } catch {}
      throw error
    }
    return payload
  }

  return { filePath, load, save }
}
