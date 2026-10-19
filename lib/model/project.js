/**
 * 群项目目录（P4）：决定聊天记录落盘位置与 DSH 会话 cwd。
 *
 * 解析优先级（按群）：
 *   1. `mapping.json[groupId].workspacePath` —— 会话创建时钉住的项目，聊天目录与 cwd 同源；
 *   2. `config.groupWorkspaces[groupId]` —— 设置页配置；
 *   3. `config.workspace` —— 插件默认项目。
 *
 * 每个项目下用隐藏目录 `.qq-relay/` 存放聊天记录（`chat/<group_id>/YYYY-MM-DD.jsonl`），
 * 目录里的 `.gitignore` 内容为 `*`，保证聊天记录永不进用户仓库。
 *
 * 纪律：纯路径 / 建目录逻辑，不读配置来源、不认识 DSH；失败抛异常由调用方降级。
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'

/** 项目根下的隐藏目录名（短名，用户 2026-10-19 决定）。 */
export const RELAY_DIR_NAME = '.qq-relay'

const GITIGNORE_CONTENT = '*\n'

/**
 * 解析某个群的项目目录；无法解析时返回空串。
 *
 * @param options.config - 规范化后的配置（可含 `groupWorkspaces` / `workspace`）
 * @param options.mapping - 会话映射仓库（可缺省）
 * @param options.groupId - 群号
 * @returns 绝对路径；没有任何可用配置时为空串
 */
export function projectDirFor({ config, mapping = null, groupId }) {
  const key = String(groupId)
  const entry = mapping !== null && typeof mapping?.get === 'function' ? mapping.get(groupId) : undefined
  if (entry !== undefined && entry !== null
    && typeof entry.workspacePath === 'string' && entry.workspacePath !== '') {
    return entry.workspacePath
  }
  const groupWorkspaces = config?.groupWorkspaces
  if (groupWorkspaces !== null && typeof groupWorkspaces === 'object') {
    const configured = groupWorkspaces[key]
    if (typeof configured === 'string' && configured !== '') return configured
  }
  return typeof config?.workspace === 'string' ? config.workspace : ''
}

/** `<project>/.qq-relay`。 */
export function relayDirOf(projectDir) {
  return join(projectDir, RELAY_DIR_NAME)
}

/** 聊天日志根目录 `<project>/.qq-relay/chat`。 */
export function chatRootFor(projectDir) {
  return join(relayDirOf(projectDir), 'chat')
}

/** 某群的聊天日志目录 `<project>/.qq-relay/chat/<group_id>`。 */
export function chatDirFor(projectDir, groupId) {
  return join(chatRootFor(projectDir), String(groupId))
}

/**
 * 确保 `<project>/.qq-relay/` 存在，并在缺失时写入自我忽略的 `.gitignore`。
 *
 * @param projectDir - 项目根（必须是绝对路径）
 * @param options.logger - 可选 `{ warn }`，`.gitignore` 写失败只记日志
 * @returns `.qq-relay` 绝对路径
 */
export function ensureRelayDir(projectDir, { logger = null } = {}) {
  if (typeof projectDir !== 'string' || projectDir === '') throw new Error('ensureRelayDir 需要项目目录')
  if (!isAbsolute(projectDir)) throw new Error('项目目录必须是绝对路径：' + projectDir)
  const relayDir = relayDirOf(projectDir)
  mkdirSync(relayDir, { recursive: true })
  const ignoreFile = join(relayDir, '.gitignore')
  if (!existsSync(ignoreFile)) {
    try {
      writeFileSync(ignoreFile, GITIGNORE_CONTENT, 'utf8')
    } catch (error) {
      try { logger?.warn?.('[relay] 写入 .qq-relay/.gitignore 失败：' + String(error?.message ?? error)) } catch {}
    }
  }
  return relayDir
}
