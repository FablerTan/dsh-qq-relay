/**
 * 「行为」二级页：出向文本切分 / 直通前缀 / 闸门参数与实时状态（client View 层）。
 */

import type { ReactElement } from 'react'

import { Block, Card, Line, Row, TextInput } from '../controls.js'
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
      <GateStatusCard model={model} />
    </div>
  )
}
