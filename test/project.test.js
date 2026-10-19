/**
 * 群项目目录单测（node:test，零依赖）：解析优先级、目录布局、.gitignore、多项目聊天日志。
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createChatLog, localDateKey } from '../lib/model/chat-log.js'
import {
  chatDirFor,
  chatRootFor,
  ensureRelayDir,
  projectDirFor,
  relayDirOf,
  RELAY_DIR_NAME,
} from '../lib/model/project.js'

function tempDir(t) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-qq-relay-project-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

test('project：解析优先级 mapping > groupWorkspaces > workspace', () => {
  const config = { workspace: '/ws/default', groupWorkspaces: { 100: '/ws/group100' } }
  const mappingWith = (workspacePath) => ({ get: (groupId) => (String(groupId) === '100' ? { workspacePath } : undefined) })
  assert.equal(projectDirFor({ config, mapping: mappingWith('/ws/mapped100'), groupId: 100 }), '/ws/mapped100')
  assert.equal(projectDirFor({ config, mapping: mappingWith(''), groupId: 100 }), '/ws/group100')
  assert.equal(projectDirFor({ config, mapping: mappingWith(''), groupId: 200 }), '/ws/default')
  assert.equal(projectDirFor({ config: {}, mapping: null, groupId: 1 }), '')
  assert.equal(projectDirFor({ config: null, mapping: null, groupId: 1 }), '')
})

test('project：目录布局与 .gitignore 自我忽略', (t) => {
  const dir = tempDir(t)
  const projectDir = join(dir, 'my-app')
  const relayDir = ensureRelayDir(projectDir)
  assert.equal(relayDir, join(projectDir, RELAY_DIR_NAME))
  assert.equal(relayDirOf(projectDir), relayDir)
  assert.equal(chatRootFor(projectDir), join(projectDir, RELAY_DIR_NAME, 'chat'))
  assert.equal(chatDirFor(projectDir, 100), join(projectDir, RELAY_DIR_NAME, 'chat', '100'))
  assert.equal(readFileSync(join(relayDir, '.gitignore'), 'utf8'), '*\n')

  // 用户已有 .gitignore 时不覆盖
  writeFileSync(join(relayDir, '.gitignore'), 'custom\n', 'utf8')
  ensureRelayDir(projectDir)
  assert.equal(readFileSync(join(relayDir, '.gitignore'), 'utf8'), 'custom\n')
})

test('project：非绝对路径 / 空路径抛错（由调用方降级）', () => {
  assert.throws(() => ensureRelayDir('relative/path'), /绝对路径/)
  assert.throws(() => ensureRelayDir(''), /需要项目目录/)
})

test('project：聊天日志按群项目分目录，prune 按群清理', (t) => {
  const dir = tempDir(t)
  const projects = { 100: join(dir, 'proj-a'), 200: join(dir, 'proj-b') }
  const chatLog = createChatLog({
    rootFor: (groupId) => {
      const projectDir = projects[groupId]
      if (projectDir === undefined) throw new Error('没有项目目录')
      ensureRelayDir(projectDir)
      return chatRootFor(projectDir)
    },
  })
  const now = Date.now()
  chatLog.append(100, { time: now, messageId: 'a', userId: 'u', nickname: 'n', text: '群 100' })
  chatLog.append(200, { time: now, messageId: 'b', userId: 'u', nickname: 'n', text: '群 200' })

  assert.equal(readFileSync(join(projects[100], RELAY_DIR_NAME, 'chat', '100', localDateKey(now) + '.jsonl'), 'utf8').trim().length > 0, true)
  assert.equal(readFileSync(join(projects[200], RELAY_DIR_NAME, 'chat', '200', localDateKey(now) + '.jsonl'), 'utf8').trim().length > 0, true)
  assert.equal(chatLog.readRecent(100, now - 1000)[0].text, '群 100')
  assert.equal(chatLog.readRecent(200, now - 1000)[0].text, '群 200')

  // 伪造旧文件验证按群清理
  writeFileSync(join(projects[100], RELAY_DIR_NAME, 'chat', '100', '2020-01-01.jsonl'), '{}\n', 'utf8')
  writeFileSync(join(projects[200], RELAY_DIR_NAME, 'chat', '200', '2020-01-01.jsonl'), '{}\n', 'utf8')
  assert.equal(chatLog.prune(now, 7, [100]), 1)
  assert.equal(chatLog.prune(now, 0, [100, 200]), 0, '0 表示永不清理')
})
