/**
 * 「预设」二级页（v0.20.0，client View 层）：
 * 列出插件管理的 QQ 预设（persona + 模型 / 思考层级 / 权限），可新建 / 编辑 / 删除。
 * 数据源是 host 的 `presets.json`；保存后 host 动态注册成 DSH agent preset。
 */

import type { ReactElement } from 'react'

import { Block, Button, Card, Line, Row, Select, TextArea, TextInput } from '../controls.js'
import type { RelaySettingsModel } from '../../viewmodel/settings.js'

/** 预设列表 + 编辑器。 */
export function PresetsPanel({ model }: { model: RelaySettingsModel }): ReactElement {
  const { status, presets, presetDraft, presetEditingId, presetBusy, updatePresetDraft } = model
  const catalog = status?.modelCatalog ?? null
  const providers = catalog?.groups ?? []
  const selectedProvider = providers.find((provider) => provider.id === presetDraft.provider)
  const models = selectedProvider?.models ?? []
  const selectedModel = models.find((item) => item.id === presetDraft.model)
  const efforts = selectedModel?.efforts ?? []
  const permissionOptions = status?.permissionCatalog?.options ?? []

  const providerOptions = [
    { value: '', label: '不指定（跟随 DSH 默认）' },
    ...providers.map((provider) => ({ value: provider.id, label: provider.name !== '' ? provider.name : provider.id })),
  ]
  const modelOptions = [
    { value: '', label: '不指定' },
    ...models.map((item) => ({ value: item.id, label: item.name !== '' ? item.name : item.id })),
  ]
  const effortOptions = [
    { value: '', label: '默认' },
    ...efforts.map((effort) => ({ value: effort.id, label: effort.name !== '' ? effort.name : effort.id })),
  ]
  const permissionSelectOptions = [
    { value: '', label: '不指定（跟随当前）' },
    ...permissionOptions.map((option) => ({ value: option.value, label: option.name !== '' ? option.name : option.value })),
  ]

  const editing = presetEditingId !== null
  const serviceNote = status !== null && !status.presetService.supported
    ? <Line tone="warn">宿主没有提供 agentPresets 服务（或尚未就绪）：预设会保存在本地，但暂时无法在 DSH 里选到，重启 GUI 后再看。</Line>
    : null

  return (
    <div className="qqr-panel">
      <Card>
        <Block>
          <div className="qqr-headline">
            <h4 className="qqr-subhead">QQ 预设</h4>
            <span className="qqr-inline-actions">
              <Button variant="outline" onClick={model.newPreset} disabled={presetBusy}>新建预设</Button>
            </span>
          </div>
          <p className="qqr-hint">
            预设 = 系统提示词人设（persona）+ 会话模型 / 思考层级 / 权限。保存后 host 动态注册成
            DSH agent preset（无需重启 GUI）；已有群会话要发 /new 或「重新绑定」才会换过去。
            插件自带的「QQ 群聊」也可以改。
          </p>
          {serviceNote}
        </Block>
        <Block>
          {presets.length === 0 ? (
            <p className="qqr-empty">还没有预设。点「新建预设」开始。</p>
          ) : (
            <div className="qqr-scroll">
              <table className="qqr-table">
                <thead>
                  <tr>
                    <th className="qqr-th">预设</th>
                    <th className="qqr-th">模型</th>
                    <th className="qqr-th">权限</th>
                    <th className="qqr-th">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {presets.map((preset) => (
                    <tr key={preset.id}>
                      <td className="qqr-td">
                        <span>{preset.name !== '' ? preset.name : preset.id}</span>
                        <span className="qqr-mono qqr-mono-block">{preset.id}</span>
                        {status !== null && status.presetService.supported
                          && !status.presetService.registered.includes(preset.id) ? (
                            <span className="qqr-hint">（未注册：可能与 DSH 内置预设冲突）</span>
                          ) : null}
                      </td>
                      <td className="qqr-td">
                        {preset.model.provider === ''
                          ? '跟随默认'
                          : preset.model.provider + '/' + preset.model.model
                            + (preset.model.reasoningEffort === '' ? '' : ' · ' + preset.model.reasoningEffort)}
                      </td>
                      <td className="qqr-td">{preset.permissionPreset === '' ? '跟随当前' : preset.permissionPreset}</td>
                      <td className="qqr-td">
                        <div className="qqr-row-actions">
                          <Button variant="outline" onClick={() => { model.editPreset(preset.id) }} disabled={presetBusy}>
                            编辑
                          </Button>
                          <Button onClick={() => { model.deletePreset(preset.id) }} disabled={presetBusy}>
                            删除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Block>
      </Card>

      {editing ? (
        <Card>
          <Block>
            <h4 className="qqr-subhead">{presetEditingId === '' ? '新建预设' : '编辑预设：' + presetEditingId}</h4>
            <p className="qqr-hint">
              id 创建后不可修改（DSH 会话按它恢复）；人设会作为系统提示词的人设段。模型 / 权限只对
              使用该预设的新会话生效。
            </p>
          </Block>
          <Row label="预设 id" hint="小写字母 / 数字 / 连字符；创建后不可改">
            <TextInput
              value={presetDraft.id}
              onChange={(value) => { updatePresetDraft('id', value) }}
              placeholder="catgirl"
              disabled={presetEditingId !== ''}
              ariaLabel="预设 id"
            />
          </Row>
          <Row label="名称" hint="显示在 DSH preset 选择器里">
            <TextInput
              value={presetDraft.name}
              onChange={(value) => { updatePresetDraft('name', value) }}
              placeholder="猫娘"
              ariaLabel="预设名称"
            />
          </Row>
          <Row label="描述" hint="可选；一句话说明这个预设的用途">
            <TextInput
              value={presetDraft.description}
              onChange={(value) => { updatePresetDraft('description', value) }}
              placeholder="群里的猫娘角色"
              ariaLabel="预设描述"
            />
          </Row>
          <Block>
            <span className="qqr-label">人设（persona）</span>
            <TextArea
              value={presetDraft.persona}
              onChange={(value) => { updatePresetDraft('persona', value) }}
              placeholder="你是群里的猫娘助手，说话带「喵」；直接输出最终回复即可，不要用 qq_send 往本群发。"
              rows={5}
              ariaLabel="预设人设"
            />
            <p className="qqr-hint">
              建议保留「直接输出最终回复、不要用 qq_send 往本群发」——不然模型可能用工具回话导致双发。
            </p>
          </Block>
          {catalog === null ? (
            <>
              <Row label="模型 provider" hint="宿主模型目录不可用，可手填（留空 = 跟随默认）">
                <TextInput value={presetDraft.provider} onChange={(value) => { updatePresetDraft('provider', value) }} placeholder="deepseek-account" ariaLabel="模型 provider" />
              </Row>
              <Row label="模型 id" hint="留空 = 跟随默认">
                <TextInput value={presetDraft.model} onChange={(value) => { updatePresetDraft('model', value) }} placeholder="deepseek-flash" ariaLabel="模型 id" />
              </Row>
              <Row label="思考层级" hint="留空 = 跟随模型默认">
                <TextInput value={presetDraft.reasoningEffort} onChange={(value) => { updatePresetDraft('reasoningEffort', value) }} placeholder="low / medium / high" ariaLabel="思考层级" />
              </Row>
            </>
          ) : (
            <>
              <Row label="模型 provider" hint="留空 = 跟随 DSH 默认模型">
                <Select
                  value={presetDraft.provider}
                  onChange={(value) => {
                    updatePresetDraft('provider', value)
                    updatePresetDraft('model', '')
                    updatePresetDraft('reasoningEffort', '')
                  }}
                  options={providerOptions}
                  ariaLabel="模型 provider"
                />
              </Row>
              <Row label="模型" hint="留空 = 不覆盖">
                <Select
                  value={presetDraft.model}
                  onChange={(value) => {
                    updatePresetDraft('model', value)
                    updatePresetDraft('reasoningEffort', '')
                  }}
                  options={modelOptions}
                  ariaLabel="模型"
                />
              </Row>
              <Row label="思考层级" hint="留空 = 跟随模型默认">
                <Select
                  value={presetDraft.reasoningEffort}
                  onChange={(value) => { updatePresetDraft('reasoningEffort', value) }}
                  options={effortOptions}
                  ariaLabel="思考层级"
                />
              </Row>
            </>
          )}
          <Row label="权限预设" hint="沙箱 + 审批组合；留空 = 跟随当前">
            <Select
              value={presetDraft.permissionPreset}
              onChange={(value) => { updatePresetDraft('permissionPreset', value) }}
              options={permissionSelectOptions}
              ariaLabel="权限预设"
            />
          </Row>
          <Row label="排序" hint="DSH preset 列表里的位置（1..10000）">
            <TextInput
              value={presetDraft.order}
              onChange={(value) => { updatePresetDraft('order', value) }}
              inputMode="numeric"
              placeholder="100"
              ariaLabel="预设排序"
            />
          </Row>
          <Block>
            <div className="qqr-headline">
              <Button variant="primary" onClick={model.savePreset} disabled={presetBusy}>
                {presetBusy ? '保存中…' : '保存预设'}
              </Button>
              <Button variant="outline" onClick={model.cancelPresetEdit} disabled={presetBusy}>取消</Button>
            </div>
          </Block>
        </Card>
      ) : null}
    </div>
  )
}
