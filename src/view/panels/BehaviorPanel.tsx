/**
 * 「行为」二级页：出向文本切分 / 直通前缀 / 闸门参数与实时状态（client View 层）。
 */

import type { ReactElement } from 'react'

import { Block, Card, Line, Row, Select, TextArea, TextInput, Toggle } from '../controls.js'
import { formatAgo, formatClockTime } from '../../model/form.js'
import type { RelaySettingsModel } from '../../viewmodel/settings.js'

/** 闸门每群实时状态表（只读，5 秒轮询）。 */
function GateStatusCard({ model }: { model: RelaySettingsModel }): ReactElement | null {
  const gate = model.status?.gate ?? null
  if (gate === null || gate.groups.length === 0) return null
  return (
    <Card>
      <Block>
        <h4 className="qqr-subhead">闸门实时状态</h4>
        <p className="qqr-hint">
          待评估 {gate.pendingMessages} 条 / {gate.pendingGroups} 群 · 活动定时器 {gate.timers}
          {' · '}待派发 {gate.queue} · 待发送 {gate.sendQueue}
        </p>
        <div className="qqr-scroll">
          <table className="qqr-table">
            <thead>
              <tr>
                <th className="qqr-th">群号</th>
                <th className="qqr-th">待评估</th>
                <th className="qqr-th">最近发言</th>
                <th className="qqr-th">冷却</th>
                <th className="qqr-th">状态</th>
              </tr>
            </thead>
            <tbody>
              {gate.groups.map((group) => (
                <tr key={group.groupId}>
                  <td className="qqr-td">{group.groupId}</td>
                  <td className="qqr-td">{group.pending}</td>
                  <td className="qqr-td">{formatAgo(group.lastBotSpeakAt) || '未发言'}</td>
                  <td className="qqr-td">
                    {group.cooldownUntil > Date.now() ? '冷却至 ' + formatClockTime(group.cooldownUntil) : '—'}
                  </td>
                  <td className="qqr-td">
                    {group.dshBusy ? '忙（有轮次在跑）' : group.evaluating ? '评估中' : '空闲'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Block>
    </Card>
  )
}

/** 行为配置。 */
export function BehaviorPanel({ model }: { model: RelaySettingsModel }): ReactElement {
  const { form, updateField } = model
  const presets = model.status?.agentPresets ?? null
  const presetItems = presets?.items ?? []
  const presetOptions = [
    { value: '', label: '不指定（跟随 DSH 默认）' },
    ...presetItems.map((preset) => ({
      value: preset.id,
      label: (preset.name !== '' ? preset.name : preset.id) + (preset.broken !== '' ? '（不可用）' : ''),
      disabled: preset.broken !== '',
      title: preset.broken !== '' ? preset.broken : preset.description,
    })),
  ]
  if (form.agentPreset !== '' && !presetItems.some((preset) => preset.id === form.agentPreset)) {
    presetOptions.push({ value: form.agentPreset, label: form.agentPreset + '（不在名册中）', disabled: false })
  }
  const presetNote = presets === null || !presets.supported
    ? <Line tone="warn">当前宿主没有提供 agent preset 服务（可能版本过旧或不是 Web bundle）：预设选择不会生效，轻量人设仍可用。</Line>
    : presets.missing
      ? <Line tone="warn">配置里的预设不在当前名册里：下次建会话会退回 DSH 默认预设。</Line>
      : null
  return (
    <div className="qqr-panel">
      <Card>
        <Row label="回发文本切分上限" hint="100..20000 字符；超长回复按此切分成多条">
          <TextInput
            value={form.replyChunkSize}
            onChange={(value) => { updateField('replyChunkSize', value) }}
            inputMode="numeric"
            ariaLabel="回发文本切分上限"
          />
        </Row>
        <Row label="直通命令前缀" hint="逗号分隔；群消息以此开头时绕过闸门直接进 DSH">
          <TextInput
            value={form.commandPrefixes}
            onChange={(value) => { updateField('commandPrefixes', value) }}
            placeholder="/dsh"
            ariaLabel="直通命令前缀"
          />
        </Row>
      </Card>
      <Card>
        <Block>
          <h4 className="qqr-subhead">消息闸门</h4>
          <Line tone={model.gateLine.tone === 'ok' ? 'ok' : model.gateLine.tone === 'warn' ? 'warn' : 'muted'}>
            {model.gateLine.text}
          </Line>
        </Block>
        <Row label="普通消息去抖窗口" hint="同一波消息合并等待，0..60s（如 3s / 500ms）">
          <TextInput
            value={form.gateDebounce}
            onChange={(value) => { updateField('gateDebounce', value) }}
            placeholder="5s"
            ariaLabel="普通消息去抖窗口"
          />
        </Row>
        <Row label="最小发言间隔" hint="距上次发言不足该间隔时延后评估，0..60m（如 10s / 45s）">
          <TextInput
            value={form.gateFastMinReplyInterval}
            onChange={(value) => { updateField('gateFastMinReplyInterval', value) }}
            placeholder="45s"
            ariaLabel="最小发言间隔"
          />
        </Row>
        <Row label="jev 接话阈值" hint="0..1；越高越保守（默认 0.7）">
          <TextInput
            value={form.gateJevThreshold}
            onChange={(value) => { updateField('gateJevThreshold', value) }}
            inputMode="decimal"
            placeholder="0.7"
            ariaLabel="jev 接话阈值"
          />
        </Row>
      </Card>
      <Card>
        <Block>
          <h4 className="qqr-subhead">角色与人设</h4>
          <p className="qqr-hint">
            所有群共用一个 DSH agent preset；切换后只影响之后新建的会话（群里发 /new，或到「项目」页点「重新绑定」）。
            下拉包含 DSH 内置预设和「预设」页里插件管理的预设（自带一个「QQ 群聊」）。
          </p>
          {presetNote}
        </Block>
        <Row label="默认 Agent 预设" hint="空 = 跟随 DSH 默认；preset 在会话创建时固定">
          <Select
            value={form.agentPreset}
            onChange={(value) => { updateField('agentPreset', value) }}
            options={presetOptions}
            ariaLabel="默认 Agent 预设"
          />
        </Row>
        <Row label="启用轻量人设" hint="每轮 prompt 前注入；默认关闭；不依赖 profile 改动">
          <Toggle
            checked={form.personaEnabled}
            onChange={model.setPersonaEnabled}
            ariaLabel="启用轻量人设"
          />
        </Row>
        <Block>
          <TextArea
            value={form.personaText}
            onChange={(value) => { updateField('personaText', value) }}
            placeholder="例如：你是群里的猫娘助手，说话带「喵」，可以偶尔发一个表情。"
            rows={4}
            ariaLabel="轻量人设文本"
          />
          <p className="qqr-hint">
            人设文本最多 4000 字符，开启时不能为空；它叠加在系统提示词里的预设人设之上，适合补群内角色设定。
            平台约定（最终回复自动回发、不要用 qq_send 往本群发）始终会附在 prompt 末尾。
          </p>
        </Block>
      </Card>
      <Card>
        <Block>
          <h4 className="qqr-subhead">代答（@ 特定的人）</h4>
          <p className="qqr-hint">
            开启后，群里有人 @ 名单里的人、且 TA 最近没在本群说话时，机器人代 TA 回应（默认关闭）。
            名单之外的 @ 别人消息只记聊天记录，不会触发会话。
          </p>
        </Block>
        <Row label="开启代答" hint="默认关闭；开启时下面至少填一个目标">
          <Toggle
            checked={form.proxyEnabled}
            onChange={model.setProxyEnabled}
            ariaLabel="开启代答"
          />
        </Row>
        <Row label="代答目标" hint="QQ 号或群名片 / 昵称，逗号分隔（如 10003, 群主）">
          <TextInput
            value={form.proxyTargets}
            onChange={(value) => { updateField('proxyTargets', value) }}
            placeholder="10003, 群主"
            ariaLabel="代答目标"
          />
        </Row>
        <Row label="沉默窗口" hint="TA 多久没在本群发言才代答；0s = 总是代答（如 10m / 30m）">
          <TextInput
            value={form.proxySilenceWindow}
            onChange={(value) => { updateField('proxySilenceWindow', value) }}
            placeholder="10m"
            ariaLabel="代答沉默窗口"
          />
        </Row>
      </Card>
      <GateStatusCard model={model} />
    </div>
  )
}
