/**
 * dsh-qq-relay 文档↔源码配对校验（pnpm check 的最后一环）。
 *
 * 把上级纪律「改动插件同步更新其 README / docs」机器化：本次变更（默认为工作区
 * + 暂存区的改动集，`--staged` 只看暂存集）里若触碰了源码 / 装配面，却没有在
 * 同一变更里触碰 README.md / AGENTS.md / docs/**，即失败退出。
 *
 * 注：本项目**不使用 openspec**（用户 2026-10-16 决定），因此 `openspec/` 不在文档面里；
 * 规格与设计随 README 与 `docs/` 走。
 *
 * 例外：
 *  - 环境变量 SKIP_PNPM_CHECK=1 或命令行 --allow：跳过并打印说明
 *    （须在 commit message 写明理由）；
 *  - lib/client.js（纯构建产物）刻意不列入源码映射表——重建不该被迫带文档。
 *
 * 零外部依赖，只用 node: 内置模块与 git。
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

if (process.env.SKIP_PNPM_CHECK === '1' || process.argv.includes('--allow')) {
  console.log('check:docs 已按显式豁免跳过（SKIP_PNPM_CHECK=1 / --allow）——请在 commit message 写明理由')
  process.exit(0)
}

const stagedOnly = process.argv.includes('--staged')

/** 源码 / 装配面：改了这些就必须带文档。 */
const SOURCE = [
  /^src\//,
  /^lib\//,
  /^scripts\//,
  /^package\.json$/,
  /^cordis\.patch\.yml$/,
  /^vite\.config\.ts$/,
  /^tsconfig\.json$/,
  /^pnpm-workspace\.yaml$/,
]

/** 文档面：命中任一即视为「带上了文档」。 */
const DOC = [/^README\.md$/, /^AGENTS\.md$/, /^docs\//]

/** lib/client.js 是构建产物，不触发配对要求。 */
const BUILD_ONLY = new Set(['lib/client.js'])

function git(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' })
  if (result.status !== 0) return []
  return result.stdout.split('\n').map((line) => line.trim()).filter((line) => line !== '')
}

/** @returns {string[]} 本次变更涉及的仓库相对路径。 */
function changedFiles() {
  if (stagedOnly) {
    return git(['diff', '--cached', '--name-only'])
  }
  const hasHead = spawnSync('git', ['rev-parse', '--verify', 'HEAD'], { cwd: root, encoding: 'utf8' }).status === 0
  const tracked = hasHead ? git(['diff', 'HEAD', '--name-only']) : []
  // 未跟踪的新文件不在 diff 里，单独取（首次落盘的一批源码否则会漏检）。
  const untracked = git(['ls-files', '--others', '--exclude-standard'])
  return [...new Set([...tracked, ...untracked])]
}

const changed = changedFiles()
const touchedSources = changed.filter((path) => !BUILD_ONLY.has(path) && SOURCE.some((re) => re.test(path)))
const touchedDocs = changed.filter((path) => DOC.some((re) => re.test(path)))

if (touchedSources.length > 0 && touchedDocs.length === 0) {
  console.error('check:docs 配对失败——本次变更改了源码/装配面，却没有同步 README.md / AGENTS.md / docs/：')
  for (const path of touchedSources) console.error('  - ' + path)
  console.error('请在同一个变更里补上对应文档（或在 commit message 写明理由后用 SKIP_PNPM_CHECK=1 / --allow 跳过）。')
  process.exit(1)
}

console.log('check:docs OK：本次变更 ' + String(changed.length) + ' 个文件，源码 ' + String(touchedSources.length) + ' / 文档 ' + String(touchedDocs.length))
