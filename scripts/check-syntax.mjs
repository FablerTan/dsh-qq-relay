/**
 * dsh-qq-relay 自检闸门（pnpm check 的第一环）。
 *
 * 1) 对 lib/ 下所有已存在的 .js 与 scripts/ 下所有 .mjs 跑 node --check；
 * 2) 校验 package.json 的 dsh.bundle.patch 与 dsh.client 元数据齐备，
 *    且 dsh.client.inject 是字符串数组；
 * 3) 校验 cordis.patch.yml 里存在与包名一致的 id/name 行。
 * 任一环红即退出非零。零外部依赖，只用 node: 内置模块。
 *
 * 注意：lib/client.js 是构建产物（vite + wrap-client），本脚本只做语法检查，
 * 不检查它是否与 src/ 同步——那是 pnpm build 的责任。
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function walk(dir) {
  if (!existsSync(dir)) return []
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const child = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(child))
    else if (entry.isFile()) out.push(child)
  }
  return out
}

const targets = [
  ...walk(join(root, 'lib')).filter((file) => file.endsWith('.js')),
  ...walk(join(root, 'scripts')).filter((file) => file.endsWith('.mjs')),
]

let failed = 0
if (targets.length === 0) {
  console.error('check: 没有可检查的 JS 产物（lib/ 为空？）')
  failed += 1
}
for (const file of targets) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' })
  if (result.status !== 0) {
    console.error('check: 语法失败 ' + file)
    failed += 1
  }
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
if (pkg.dsh === undefined || pkg.dsh.bundle === undefined || pkg.dsh.bundle.patch === undefined) {
  console.error('check: package.json 缺 dsh.bundle.patch')
  failed += 1
}
if (pkg.dsh === undefined || pkg.dsh.client === undefined) {
  console.error('check: package.json 缺 dsh.client')
  failed += 1
}
const inject = pkg.dsh?.client?.inject
if (!Array.isArray(inject) || inject.some((name) => typeof name !== 'string')) {
  console.error('check: dsh.client.inject 必须是字符串数组')
  failed += 1
}

const patch = readFileSync(join(root, 'cordis.patch.yml'), 'utf8')
if (!patch.includes('id: ' + pkg.name) || !patch.includes('name: ' + pkg.name)) {
  console.error('check: cordis.patch.yml 缺少 id/name = ' + pkg.name + ' 的插入行')
  failed += 1
}

if (failed > 0) {
  console.error('check: ' + String(failed) + ' 项失败')
  process.exit(1)
}
console.log('check OK：' + String(targets.length) + ' 个 JS 文件语法通过；bundle/client 元数据与 patch 行齐备')
