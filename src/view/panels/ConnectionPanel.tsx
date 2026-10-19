/**
 * 「连接」二级页：协议端地址 / token / bot 账号 / 群白名单 + 运行状态（client View 层）。
 */

import type { ReactElement } from 'react'

import { Block, Card, Line, Row, TextInput } from '../controls.js'
import type { RelaySettingsModel } from '../../viewmodel/settings.js'

/** 运行状态块：把 status 里只读的运行信息摊平成一屏。 */
function RuntimeCard({ model }: { model: RelaySettingsModel }): ReactElement {
  const { status } = model
  const login = status?.login ?? null
  const account = login !== null && (login.nickname !== '' || login.userId > 0)
    ? (login.nickname !== '' ? login.nickname : '未取到昵称') + '（' + String(login.userId) + '）'
    : '未登录'
  const lock = status?.lock ?? null
  return (
    <Card>
      <Block>
        <h4 className="qqr-subhead">运行状态</h4>
        <p className="qqr-hint">
          协议端：<span className="qqr-mono">{status?.config.wsUrl ?? '—'}</span>
        </p>
        <p className="qqr-hint">登录账号：{account}</p>
        <p className="qqr-hint">
          单实例锁：{lock === null ? '本进程持有' : '另一个进程持有（pid ' + String(lock.pid) + '）'}
          {' · '}群映射：{status === null ? 0 : status.mappings.length} 个
        </p>
      </Block>
      {status !== null && status.problems.length > 0 ? (
        <Block>
          <ul className="qqr-list">
            {status.problems.map((problem) => (
              <li key={problem}><Line tone="error">{problem}</Line></li>
            ))}
          </ul>
        </Block>
      ) : null}
    </Card>
  )
}

/** 连接配置。 */
export function ConnectionPanel({ model }: { model: RelaySettingsModel }): ReactElement {
  const { form, updateField } = model
  return (
    <div className="qqr-panel">
      <Card>
        <Row label="协议端 WebSocket" hint="NapCat 正向 WS，例如 ws://127.0.0.1:3001">
          <TextInput
            value={form.wsUrl}
            onChange={(value) => { updateField('wsUrl', value) }}
            placeholder="ws://127.0.0.1:3001"
            ariaLabel="协议端 WebSocket 地址"
          />
        </Row>
        <Row label="Access Token" hint={model.tokenHint}>
          <TextInput
            type="password"
            value={form.accessToken}
            onChange={(value) => { updateField('accessToken', value) }}
            placeholder={model.status?.config.accessTokenConfigured === true ? '留空保持不变' : '写入新的 token'}
            ariaLabel="Access Token"
          />
        </Row>
        <Row label="机器人 QQ 号" hint="连接后用 get_login_info 校验，不匹配会断开">
          <TextInput
            value={form.selfId}
            onChange={(value) => { updateField('selfId', value) }}
            inputMode="numeric"
            ariaLabel="机器人 QQ 号"
          />
        </Row>
        <Row label="群白名单" hint="逗号分隔的群号；未列出的群只记日志不回话">
          <TextInput
            value={form.groups}
            onChange={(value) => { updateField('groups', value) }}
            placeholder="10002"
            ariaLabel="群白名单"
          />
        </Row>
      </Card>
      <RuntimeCard model={model} />
    </div>
  )
}
