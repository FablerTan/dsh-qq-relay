/**
 * 从 docs/changelog.md 取出当前 package.json 版本对应的段落，生成 GitHub Release 正文。
 *
 * 用法：node scripts/release-notes.mjs [--out release-notes.md]
 * 约定：docs/changelog.md 里必须有 '## v<version> …' 标题（版本历史按版本倒序）。
 * 找不到 / 段落为空时退出码 1，避免发布一个没有版本更新说明的 Release。
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const version = String(pkg.version ?? '').trim()
if (version === '') {
  console.error('release-notes: package.json 缺少 version')
  process.exit(1)
}

const changelogPath = join(root, 'docs', 'changelog.md')
const changelog = readFileSync(changelogPath, 'utf8')
const escaped = version.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
const heading = new RegExp('^## v' + escaped + '(?:[ \\t][^\\n]*)?\\n', 'mu')
const match = heading.exec(changelog)
if (match === null) {
  console.error('release-notes: docs/changelog.md 里没有 v' + version + ' 的版本段；请先补版本历史再发布')
  process.exit(1)
}

const rest = changelog.slice(match.index + match[0].length)
const next = rest.search(/^## /mu)
const body = (next === -1 ? rest : rest.slice(0, next)).trim()
if (body === '') {
  console.error('release-notes: v' + version + ' 的版本段为空')
  process.exit(1)
}

const outIndex = process.argv.indexOf('--out')
const out = outIndex >= 0 && process.argv[outIndex + 1] !== undefined
  ? process.argv[outIndex + 1]
  : 'release-notes.md'
writeFileSync(out, body + '\n')
console.log('release-notes: v' + version + ' -> ' + out)
