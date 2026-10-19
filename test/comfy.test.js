/**
 * ComfyUI 画图能力单测（node:test）：
 *  - comfy 配置段校验 / 覆盖合并 / 对外视图；
 *  - SKILL.md 模板渲染（frontmatter 剥离、占位符替换、残留占位符报错）；
 *  - probeComfy 的成功 / 失败 / 超时；
 *  - controller 的探测 + 动态 skill 注册 / 注销 / 抖动保持 + 测试连接不改状态。
 *
 * 全部离线：fetch 用桩注入，skill 模板写到临时目录。
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  DEFAULT_COMFY,
  maskComfyConfig,
  normalizeComfyConfig,
  renderComfySkillContent,
  stripFrontmatter,
} from '../lib/model/comfy.js'
import { normalizeConfig } from '../lib/model/config.js'
import { maskConfig, mergeConfig, pickEditable } from '../lib/model/settings.js'
import { createComfyController, probeComfy } from '../lib/controller/comfy.js'

function tempSkill(t, text) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-qq-relay-comfy-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const templatePath = join(dir, 'SKILL.md')
  writeFileSync(templatePath, text, 'utf8')
  return { dir, templatePath }
}

/** 桩 fetch：routes 是 pathname → JSON 的函数 / 值；mode 可切换成失败。 */
function fakeFetch(routes, state = { mode: 'ok' }, calls = []) {
  return async (url) => {
    calls.push(String(url))
    if (state.mode === 'throw') throw new TypeError('fetch failed')
    if (state.mode === 'timeout') {
      const error = new Error('timed out')
      error.name = 'TimeoutError'
      throw error
    }
    const path = new URL(String(url)).pathname
    const entry = routes[path]
    if (entry === undefined) {
      return { ok: false, status: 404, async text() { return '' } }
    }
    return {
      ok: true,
      status: 200,
      async text() { return JSON.stringify(entry) },
    }
  }
}

const STATS = {
  system: { os: 'linux', comfyui_version: '0.3.9' },
  devices: [{ name: 'NVIDIA GeForce RTX 4070', type: 'cuda', vram_total: 12884901888 }],
}
const QUEUE = { queue_running: [['1']], queue_pending: [['2'], ['3']] }

test('comfy：配置默认值 / 校验 / 视图兜底', () => {
  assert.deepEqual(normalizeComfyConfig(undefined), { ...DEFAULT_COMFY })
  assert.deepEqual(normalizeComfyConfig({}), { ...DEFAULT_COMFY })

  const ok = normalizeComfyConfig({
    enabled: true,
    baseUrl: 'http://127.0.0.1:8188/',
    timeoutMs: 5000,
    skillEnabled: false,
  })
  assert.deepEqual(ok, {
    enabled: true,
    baseUrl: 'http://127.0.0.1:8188',
    timeoutMs: 5000,
    skillEnabled: false,
  })

  const problems = []
  const bad = normalizeComfyConfig({
    enabled: 'yes',
    baseUrl: 'ftp://example.com',
    timeoutMs: 10,
    skillEnabled: 'no',
  }, problems)
  assert.equal(problems.length, 4)
  assert.equal(bad.enabled, false)
  assert.equal(bad.baseUrl, DEFAULT_COMFY.baseUrl)
  assert.equal(bad.timeoutMs, DEFAULT_COMFY.timeoutMs)
  assert.equal(bad.skillEnabled, true)

  assert.equal(normalizeComfyConfig('nope', problems).baseUrl, DEFAULT_COMFY.baseUrl)

  assert.deepEqual(maskComfyConfig(null), { ...DEFAULT_COMFY })
  assert.deepEqual(maskComfyConfig({ enabled: true, baseUrl: 'http://h:1' }), {
    enabled: true,
    baseUrl: 'http://h:1',
    timeoutMs: DEFAULT_COMFY.timeoutMs,
    skillEnabled: true,
  })
})

test('comfy：normalizeConfig 接入 / 设置页覆盖合并 / maskConfig 视图', () => {
  const base = { wsUrl: 'ws://127.0.0.1:3001', accessToken: 't', selfId: 1, groups: [100] }

  const defaults = normalizeConfig(base)
  assert.equal(defaults.ok, true)
  assert.deepEqual(defaults.config.comfy, { ...DEFAULT_COMFY })

  const withComfy = normalizeConfig({
    ...base,
    comfy: { enabled: true, baseUrl: 'http://192.168.1.10:8188', timeoutMs: 60000, skillEnabled: false },
  })
  assert.equal(withComfy.ok, true)
  assert.equal(withComfy.config.comfy.enabled, true)
  assert.equal(withComfy.config.comfy.timeoutMs, 60000)

  const invalid = normalizeConfig({ ...base, comfy: { enabled: true, baseUrl: 'not a url' } })
  assert.equal(invalid.ok, false)
  assert.equal(invalid.problems.some((problem) => problem.includes('comfy.baseUrl')), true)

  const picked = pickEditable({ comfy: { enabled: true, baseUrl: 'http://h:1', nope: 1 }, selfId: 2 })
  assert.deepEqual(picked, { selfId: 2, comfy: { enabled: true, baseUrl: 'http://h:1' } })

  const merged = mergeConfig(
    { comfy: { baseUrl: 'http://base:8188', timeoutMs: 30000 } },
    { comfy: { enabled: true } },
  )
  assert.deepEqual(merged.comfy, { baseUrl: 'http://base:8188', timeoutMs: 30000, enabled: true })

  const view = maskConfig({ comfy: { enabled: true, baseUrl: 'http://h:1', timeoutMs: 5000, skillEnabled: false } })
  assert.deepEqual(view.comfy, { enabled: true, baseUrl: 'http://h:1', timeoutMs: 5000, skillEnabled: false })
  assert.equal(view.comfySupported, true)
  assert.equal(maskConfig({}).comfySupported, false)
})

test('comfy：SKILL.md 模板渲染（frontmatter 剥离 / 占位符替换 / 残留报错）', () => {
  const template = [
    '---',
    'name: comfy-image',
    'description: demo',
    'whenToUse: demo',
    '---',
    '',
    '# 标题',
    'host={{COMFY_HOST}}',
    'dir={{SKILL_DIR}}',
  ].join('\n')

  assert.equal(stripFrontmatter(template).startsWith('# 标题'), true)
  assert.equal(stripFrontmatter('no frontmatter').trim(), 'no frontmatter')

  const content = renderComfySkillContent(template, {
    baseUrl: 'http://192.168.1.10:8188',
    skillDir: '/tmp/skill',
  })
  assert.equal(content.includes('host=http://192.168.1.10:8188'), true)
  assert.equal(content.includes('dir=/tmp/skill'), true)
  assert.equal(content.includes('---'), false, 'frontmatter 必须去掉')
  assert.equal(content.includes('{{'), false)

  assert.throws(
    () => renderComfySkillContent('{{UNKNOWN}}', { baseUrl: 'http://h', skillDir: '/d' }),
    /占位符/u,
  )
})

test('comfy：probeComfy 成功 / 连接失败 / 超时', async () => {
  const ok = await probeComfy({
    baseUrl: 'http://192.168.1.10:8188/',
    timeoutMs: 3000,
    fetchImpl: fakeFetch({ '/system_stats': STATS, '/queue': QUEUE }),
  })
  assert.equal(ok.reachable, true)
  assert.equal(ok.target, 'http://192.168.1.10:8188')
  assert.equal(ok.version, '0.3.9')
  assert.equal(ok.device, 'NVIDIA GeForce RTX 4070')
  assert.deepEqual(ok.queue, { running: 1, pending: 2 })
  assert.equal(ok.error, '')
  assert.equal(ok.latencyMs >= 0, true)

  const failed = await probeComfy({
    baseUrl: 'http://127.0.0.1:1',
    timeoutMs: 3000,
    fetchImpl: fakeFetch({}, { mode: 'throw' }),
  })
  assert.equal(failed.reachable, false)
  assert.equal(failed.error.includes('连不上 ComfyUI'), true)

  const timeout = await probeComfy({
    baseUrl: 'http://127.0.0.1:1',
    timeoutMs: 3000,
    fetchImpl: fakeFetch({}, { mode: 'timeout' }),
  })
  assert.equal(timeout.reachable, false)
  assert.equal(timeout.error.includes('连接超时'), true)

  const noFetch = await probeComfy({ baseUrl: 'http://127.0.0.1:8188', timeoutMs: 3000, fetchImpl: null })
  assert.equal(noFetch.reachable, false)
})

test('comfy：controller 探测成功 → 注册 skill；关闭配置 → 注销', async (t) => {
  const { dir, templatePath } = tempSkill(t, [
    '---',
    'name: comfy-image',
    'description: demo',
    '---',
    '# 画图',
    'host={{COMFY_HOST}}',
    'runner={{SKILL_DIR}}/scripts/comfy_run.py',
  ].join('\n'))
  const registrations = []
  const disposals = []
  const skills = {
    register(definition) {
      registrations.push(definition)
      return () => { disposals.push(definition.name) }
    },
  }
  const state = { mode: 'ok' }
  const config = { enabled: true, baseUrl: 'http://192.168.1.10:8188', timeoutMs: 3000, skillEnabled: true }
  const controller = createComfyController({
    getConfig: () => config,
    fetchImpl: fakeFetch({ '/system_stats': STATS, '/queue': QUEUE }, state),
    skillDir: dir,
    templatePath,
  })
  t.after(() => controller.dispose())

  controller.attachSkills(skills)
  await controller.refresh()

  const status = controller.status()
  assert.equal(status.supported, true)
  assert.equal(status.reachable, true)
  assert.equal(status.version, '0.3.9')
  assert.equal(status.device, 'NVIDIA GeForce RTX 4070')
  assert.deepEqual(status.queue, { running: 1, pending: 2 })
  assert.equal(status.skill.loaded, true)
  assert.equal(status.skill.error, '')
  assert.equal(registrations.length, 1)
  assert.equal(registrations[0].name, 'comfy-image')
  assert.equal(registrations[0].source, 'custom')
  assert.equal(registrations[0].provider, 'dsh-qq-relay')
  assert.equal(registrations[0].resourceBase.kind, 'directory')
  assert.equal(registrations[0].resourceBase.path, dir)
  assert.equal(registrations[0].content.includes('host=http://192.168.1.10:8188'), true)
  assert.equal(registrations[0].content.includes('runner=' + dir + '/scripts/comfy_run.py'), true)

  // 关闭配置 → 下一轮 refresh 注销 skill
  config.enabled = false
  await controller.refresh()
  assert.equal(controller.status().skill.loaded, false)
  assert.deepEqual(disposals, ['comfy-image'])

  // 重新打开 → 再注册
  config.enabled = true
  await controller.refresh()
  assert.equal(controller.status().skill.loaded, true)
  assert.equal(registrations.length, 2)
})

test('comfy：ComfyUI 抖动时保持已注册 skill（不反复进出目录）', async (t) => {
  const { dir, templatePath } = tempSkill(t, '# x\nhost={{COMFY_HOST}}')
  const registrations = []
  const disposals = []
  const skills = {
    register(definition) {
      registrations.push(definition)
      return () => { disposals.push(definition.name) }
    },
  }
  const state = { mode: 'ok' }
  const config = { enabled: true, baseUrl: 'http://h:1', timeoutMs: 3000, skillEnabled: true }
  const controller = createComfyController({
    getConfig: () => config,
    fetchImpl: fakeFetch({ '/system_stats': STATS, '/queue': QUEUE }, state),
    skillDir: dir,
    templatePath,
  })
  t.after(() => controller.dispose())

  controller.attachSkills(skills)
  await controller.refresh()
  assert.equal(controller.status().skill.loaded, true)

  // 连不上：保持注册，但状态变成不可达
  state.mode = 'throw'
  await controller.refresh()
  assert.equal(controller.status().reachable, false)
  assert.equal(controller.status().skill.loaded, true)
  assert.equal(disposals.length, 0)
  assert.equal(registrations.length, 1)

  // 显式关掉 skillEnabled → 注销
  config.skillEnabled = false
  await controller.refresh()
  assert.equal(controller.status().skill.loaded, false)
  assert.deepEqual(disposals, ['comfy-image'])
})

test('comfy：测试连接只探测，不改状态 / 不动注册；无 skills 服务时明确报错', async (t) => {
  const { dir, templatePath } = tempSkill(t, '# x\nhost={{COMFY_HOST}}')
  const registrations = []
  const skills = {
    register(definition) {
      registrations.push(definition)
      return () => {}
    },
  }
  const state = { mode: 'ok' }
  const config = { enabled: true, baseUrl: 'http://h:1', timeoutMs: 3000, skillEnabled: true }
  const controller = createComfyController({
    getConfig: () => config,
    fetchImpl: fakeFetch({ '/system_stats': STATS, '/queue': QUEUE }, state),
    skillDir: dir,
    templatePath,
  })
  t.after(() => controller.dispose())

  const probe = await controller.test({ baseUrl: 'http://other:8188', timeoutMs: 2000 })
  assert.equal(probe.reachable, true)
  assert.equal(probe.target, 'http://other:8188')
  assert.equal(controller.status().checkedAt, 0, '测试连接不写状态')
  assert.equal(registrations.length, 0, '测试连接不注册 skill')

  // 没有 skills 服务：状态 supported=false，注册被跳过并给出可读错误
  await controller.refresh()
  assert.equal(controller.status().supported, false)
  assert.equal(controller.status().skill.loaded, false)
  assert.equal(controller.status().skill.error.includes('skills 服务'), true)
  assert.equal(registrations.length, 0)
})

test('comfy：skill 模板缺失时注册失败但探测状态仍可用', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-qq-relay-comfy-empty-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const skills = { register() { return () => {} } }
  const config = { enabled: true, baseUrl: 'http://h:1', timeoutMs: 3000, skillEnabled: true }
  const controller = createComfyController({
    getConfig: () => config,
    fetchImpl: fakeFetch({ '/system_stats': STATS, '/queue': QUEUE }),
    skillDir: dir,
  })
  t.after(() => controller.dispose())

  controller.attachSkills(skills)
  await controller.refresh()
  assert.equal(controller.status().reachable, true)
  assert.equal(controller.status().skill.loaded, false)
  assert.equal(controller.status().skill.error.includes('加载失败'), true)
})
test('comfy：/api/comfy/test 路由会 await 异步探测结果并回传（回归：Promise 被当成同步结果）', async () => {
  const { createConfigRoutes, COMFY_TEST_PATH } = await import('../lib/controller/config-routes.js')
  const probe = {
    target: 'http://h:1',
    reachable: false,
    version: '',
    device: '',
    queue: { running: 0, pending: 0 },
    error: '连不上 ComfyUI：连接被拒绝',
    checkedAt: 1,
    latencyMs: 2,
  }
  const routes = createConfigRoutes({
    getStatus: () => ({ ok: true }),
    testComfy: async (payload) => ({
      ok: true,
      value: { probe: { ...probe, target: String(payload.baseUrl) }, status: { comfy: { enabled: true } } },
    }),
  })
  const route = routes.find((item) => item.path === COMFY_TEST_PATH)
  assert.notEqual(route, undefined, '应注册 /api/comfy/test')
  const req = {
    method: 'POST',
    url: COMFY_TEST_PATH,
    headers: {},
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(JSON.stringify({ baseUrl: 'http://127.0.0.1:1', timeoutMs: 3000 }), 'utf8')
    },
  }
  const res = {
    statusCode: 0,
    body: '',
    writeHead(status) { this.statusCode = status },
    end(chunk) { if (chunk !== undefined && chunk !== null) this.body += String(chunk) },
  }
  await route.handler(req, res)
  assert.equal(res.statusCode, 200)
  const payload = JSON.parse(res.body)
  assert.equal(payload.ok, true)
  assert.equal(payload.value.probe.target, 'http://127.0.0.1:1')
  assert.equal(payload.value.probe.reachable, false)

  const getRes = {
    statusCode: 0,
    body: '',
    writeHead(status) { this.statusCode = status },
    end(chunk) { if (chunk !== undefined && chunk !== null) this.body += String(chunk) },
  }
  await route.handler({ method: 'GET', url: COMFY_TEST_PATH, headers: {} }, getRes)
  assert.equal(getRes.statusCode, 405)
})
