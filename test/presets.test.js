/**
 * 插件预设模型单测（node:test）：校验 / 组合定义 / 存储 / 种子。
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  PRESET_LIMIT,
  buildPresetDefinition,
  createPresetStore,
  defaultPresets,
  normalizePreset,
  normalizePresetList,
  presetFingerprint,
  presetView,
} from '../lib/model/presets.js'
import { PRESET_BASE_PLUGINS } from '../lib/model/preset-template.js'

/** 递归收集组合表里的 config 字段名（组行的 config 是子行数组）。 */
function configKeysOf(rows) {
  const keys = []
  for (const row of rows) {
    if (Array.isArray(row.config)) keys.push(...configKeysOf(row.config))
    else if (row.config !== null && typeof row.config === 'object') keys.push(...Object.keys(row.config))
  }
  return keys
}

function tempDir(t) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-qq-relay-presets-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

test('presets：种子预设合法，组合表是 standard 的 21 行（persona 在最前）', () => {
  const seed = defaultPresets()
  assert.equal(seed.length, 1)
  assert.equal(seed[0].id, 'qq-relay')
  const normalized = normalizePreset(seed[0])
  assert.equal(normalized.ok, true)
  assert.equal(normalized.preset.persona.includes('relay 会自动回发'), true)

  const definition = buildPresetDefinition(normalized.preset)
  assert.equal(definition.id, 'qq-relay')
  assert.equal(definition.plugins.length, 21)
  assert.equal(definition.plugins[0].id, 'persona')
  assert.equal(definition.plugins[0].name, '@deepseek-ai/dsh-persona')
  assert.equal(definition.plugins[0].config.prefix, normalized.preset.persona)
  const ids = definition.plugins.map((row) => row.id)
  for (const expected of ['tool-bash', 'tool-fs', 'compaction', 'delegation', 'tool-web']) {
    assert.equal(ids.includes(expected), true, '组合表缺行：' + expected)
  }
  // 模板是深拷贝：修改定义不能污染冻结的模板
  definition.plugins[1].name = 'mutated'
  assert.notEqual(buildPresetDefinition(normalized.preset).plugins[1].name, 'mutated')
})

test('presets：id / 名称 / 人设 / 模型成对 / 排序校验', () => {
  assert.equal(normalizePreset({ id: 'QQ', name: 'x', persona: 'y' }).ok, false)
  assert.equal(normalizePreset({ id: 'ok', name: '', persona: 'y' }).ok, false)
  assert.equal(normalizePreset({ id: 'ok', name: 'x', persona: '' }).ok, false)
  assert.equal(normalizePreset({ id: 'ok', name: 'x', persona: 'y', model: { provider: 'p' } }).ok, false)
  assert.equal(normalizePreset({ id: 'ok', name: 'x', persona: 'y', model: { provider: 'p', model: 'm' } }).ok, true)
  assert.equal(normalizePreset({ id: 'ok', name: 'x', persona: 'y', order: 0 }).ok, false)
  assert.equal(normalizePreset({ id: 'ok', name: 'x', persona: 'y', order: 10001 }).ok, false)

  const ok = normalizePreset({
    id: 'catgirl',
    name: '猫娘',
    persona: '你是猫娘。',
    model: { provider: 'deepseek-account', model: 'deepseek-flash', reasoningEffort: 'low' },
    permissionPreset: 'workspace-write',
    order: 120,
  })
  assert.equal(ok.ok, true)
  assert.deepEqual(ok.preset.model, { provider: 'deepseek-account', model: 'deepseek-flash', reasoningEffort: 'low' })
  assert.deepEqual(presetView(ok.preset), {
    id: 'catgirl',
    name: '猫娘',
    description: '',
    persona: '你是猫娘。',
    model: { provider: 'deepseek-account', model: 'deepseek-flash', reasoningEffort: 'low' },
    permissionPreset: 'workspace-write',
    order: 120,
  })
})

test('presets：列表去重 / 数量上限', () => {
  const duplicated = normalizePresetList([
    { id: 'a', name: 'A', persona: 'x' },
    { id: 'a', name: 'A2', persona: 'x' },
  ])
  assert.equal(duplicated.ok, false)
  assert.ok(duplicated.problems.some((problem) => problem.includes('重复')))

  const many = Array.from({ length: PRESET_LIMIT + 1 }, (_, index) => ({
    id: 'p' + String(index), name: 'P' + String(index), persona: 'x',
  }))
  const over = normalizePresetList(many)
  assert.equal(over.ok, false)
  assert.equal(over.presets.length, PRESET_LIMIT)
})

test('presets：store 种子 / 原子保存 / 坏文件回退', (t) => {
  const dir = tempDir(t)
  const file = join(dir, 'presets.json')
  const store = createPresetStore(file)

  const seeded = store.load()
  assert.equal(seeded.seeded, true)
  assert.equal(seeded.presets[0].id, 'qq-relay')

  const saved = [{ id: 'catgirl', name: '猫娘', persona: '你是猫娘。', order: 120 }]
  store.save(saved)
  const reloaded = store.load()
  assert.equal(reloaded.seeded, false)
  assert.deepEqual(reloaded.presets.map((preset) => preset.id), ['catgirl'])
  assert.equal(JSON.parse(readFileSync(file, 'utf8')).version, 1)

  writeFileSync(file, '{ not json', 'utf8')
  const broken = store.load()
  assert.equal(broken.seeded, true)
  assert.equal(broken.presets[0].id, 'qq-relay')
})

test('presets：指纹随人设 / 模型 / 权限变化', () => {
  const base = normalizePreset({ id: 'a', name: 'A', persona: 'x' }).preset
  const changedPersona = normalizePreset({ id: 'a', name: 'A', persona: 'y' }).preset
  const changedModel = normalizePreset({ id: 'a', name: 'A', persona: 'x', model: { provider: 'p', model: 'm' } }).preset
  const changedPermission = normalizePreset({ id: 'a', name: 'A', persona: 'x', permissionPreset: 'workspace-write' }).preset
  assert.notEqual(presetFingerprint(base), presetFingerprint(changedPersona))
  assert.notEqual(presetFingerprint(base), presetFingerprint(changedModel))
  assert.notEqual(presetFingerprint(base), presetFingerprint(changedPermission))
  assert.equal(presetFingerprint(base), presetFingerprint(normalizePreset({ id: 'a', name: 'A', persona: 'x' }).preset))
})
test('presets：动态注册与会话首次应用模型 / 权限（v0.20.0）', async () => {
  const { createPresetController } = await import('../lib/controller/presets.js')
  const registered = []
  const appended = []
  const permissionCalls = []
  const agent = {
    session: {
      requestHeader: () => undefined,
      append: (type, data) => { appended.push({ type, data }) },
    },
  }
  const services = {
    permissionPresets: {
      set: (session, name) => { permissionCalls.push(name) },
    },
    sessionProjections: {
      stateOf: () => ({ pending: null, lastUsed: null }),
    },
  }
  const ctx = {
    get: (name) => services[name],
    sessionController: {
      resolveAgent: async () => ({ agent }),
    },
  }
  const presets = [{
    id: 'qq-relay',
    name: 'QQ 群聊',
    description: '',
    persona: '你是群友。',
    model: { provider: 'p', model: 'm', reasoningEffort: 'low' },
    permissionPreset: 'workspace-write',
    order: 100,
  }]
  const controller = createPresetController({
    ctx,
    log: { info() {}, warn() {}, error() {} },
    getPresets: () => presets,
    getSelectedPresetId: () => 'qq-relay',
    getModelCatalog: () => ({ groups: [{ id: 'p', models: [{ id: 'm', reasoning: { efforts: [{ id: 'low' }, { id: 'high' }] } }] }] }),
  })
  const registry = {
    register: async (definition) => {
      registered.push(definition)
      return async () => {}
    },
  }
  controller.attach(registry)
  await controller.refresh()

  assert.equal(registered.length, 1)
  assert.equal(registered[0].plugins.length, 21)
  assert.equal(registered[0].plugins[0].config.prefix, '你是群友。')
  assert.deepEqual(controller.registeredIds(), ['qq-relay'])

  await controller.applySession('session-1')
  assert.deepEqual(permissionCalls, ['workspace-write'])
  assert.deepEqual(appended, [{
    type: 'model/selection',
    data: { provider: 'p', model: 'm', reasoningEffort: 'low' },
  }])

  // 同一个会话只应用一次
  await controller.applySession('session-1')
  assert.equal(appended.length, 1)

  controller.dispose()
})

test('presets：会话已有模型选择时不再覆盖（v0.20.0）', async () => {
  const { createPresetController } = await import('../lib/controller/presets.js')
  const appended = []
  const agent = {
    session: {
      requestHeader: () => ({ config: { provider: 'x', model: 'y' } }),
      append: (type, data) => { appended.push({ type, data }) },
    },
  }
  const ctx = {
    get: () => undefined,
    sessionController: { resolveAgent: async () => ({ agent }) },
  }
  const controller = createPresetController({
    ctx,
    log: { info() {}, warn() {}, error() {} },
    getPresets: () => [{
      id: 'qq-relay', name: 'QQ', description: '', persona: 'p',
      model: { provider: 'p', model: 'm', reasoningEffort: '' }, permissionPreset: '', order: 100,
    }],
    getSelectedPresetId: () => 'qq-relay',
    getModelCatalog: () => null,
  })
  await controller.applySession('session-2')
  assert.deepEqual(appended, [])
  controller.dispose()
})

test('presets：组合表对齐 DSH 0.2.1-rc.2（不得出现 toolFilter / persona）', () => {
  const keys = configKeysOf(PRESET_BASE_PLUGINS)
  assert.equal(keys.includes('toolFilter'), false, '组合表不能带宿主已移除的 toolFilter')
  assert.equal(keys.includes('persona'), false, '人设走插件注入的 persona 行，组合表里不能有 persona')

  const delegation = PRESET_BASE_PLUGINS.find((row) => row.id === 'delegation')
  assert.notEqual(delegation, undefined)
  const spawn = delegation.config.find((row) => row.id === 'tool-subagent')
  const fork = delegation.config.find((row) => row.id === 'tool-subagent-fork')
  assert.deepEqual(Object.keys(spawn.config).sort(), ['modelSelectionSettings', 'provider', 'toolName'])
  assert.deepEqual(Object.keys(fork.config).sort(), ['provider', 'toolName'])
  assert.equal(spawn.config.toolName, 'subagent')
  assert.equal(fork.config.toolName, 'subagent_fork')
})

test('presets：宿主移除字段时自动剔除并重新注册（v0.25.5）', async () => {
  const { createPresetController } = await import('../lib/controller/presets.js')
  const attempts = []
  const warnings = []
  const ctx = { get: () => undefined, sessionController: { resolveAgent: async () => ({ agent: null }) } }
  const presets = [normalizePreset({ id: 'qq-relay', name: 'QQ', persona: '你是群友。' }).preset]
  const registry = {
    register: async (definition) => {
      attempts.push(JSON.parse(JSON.stringify(definition)))
      const delegation = definition.plugins.find((row) => row.id === 'delegation')
      const spawn = delegation.config.find((row) => row.id === 'tool-subagent')
      if ('modelSelectionSettings' in spawn.config) {
        throw new Error('tool-subagent (@deepseek-ai/dsh-tool-subagent): modelSelectionSettings is no longer supported; configure persona and tool plugins in an Agent Preset and select it with agentPreset (spawn only)')
      }
      return async () => {}
    },
  }
  const controller = createPresetController({
    ctx,
    log: { info() {}, warn: (message) => { warnings.push(message) }, error() {} },
    getPresets: () => presets,
    getSelectedPresetId: () => '',
    getModelCatalog: () => null,
  })
  controller.attach(registry)
  await controller.refresh()

  assert.equal(attempts.length, 2)
  const retriedSpawn = attempts[1].plugins.find((row) => row.id === 'delegation')
    .config.find((row) => row.id === 'tool-subagent')
  assert.equal('modelSelectionSettings' in retriedSpawn.config, false)
  assert.deepEqual(retriedSpawn.config, { provider: 'spawn', toolName: 'subagent' })
  assert.ok(warnings.some((message) => message.includes('modelSelectionSettings')))
  assert.deepEqual(controller.registeredIds(), ['qq-relay'])
  controller.dispose()
})
