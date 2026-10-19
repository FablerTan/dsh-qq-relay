/**
 * 「项目」二级页：默认项目目录 / 会话标题 / 群项目目录表 + 最近消息（client View 层）。
 */

import type { ReactElement } from 'react'

import { Block, Button, Card, Line, Row, TextInput } from '../controls.js'
import { formatClockTime } from '../../model/form.js'
import type { RelaySettingsModel } from '../../viewmodel/settings.js'
import type { RelayPanelMessageView } from '../../model/api.js'

/** 面板消息里的媒体标记（只读展示，不暴露 URL）。 */
function mediaLabels(media: RelayPanelMessageView['media']): string[] {
  const labels: Record<string, string> = { image: '图片', sticker: '表情', face: '表情', video: '视频', voice: '语音', file: '文件' }
  return media.map((entry) => (entry.status === 'failed'
    ? (entry.kind === 'file' ? '[群文件下载失败]' : '[媒体下载失败]')
    : '[' + (labels[entry.kind] ?? '媒体') + ']'))
}

/** 最近消息：某群最近 24 小时（最多 20 条）的只读视图。 */
function MessagesCard({ model }: { model: RelaySettingsModel }): ReactElement | null {
  const { messages } = model
  if (messages.groupId === null) return null
  const hours = Math.max(1, Math.round(messages.windowMs / 3600000))
  return (
    <Card>
      <Block>
        <div className="qqr-headline">
          <h4 className="qqr-subhead">最近消息 · 群 {messages.groupId}</h4>
          <span className="qqr-muted">最近 {hours} 小时 · 最多 20 条</span>
          <span className="qqr-inline-actions">
            <Button onClick={model.reloadMessages} disabled={messages.busy}>刷新</Button>
            <Button onClick={model.closeMessages} disabled={messages.busy}>关闭</Button>
          </span>
        </div>
        {messages.busy ? (
          <p className="qqr-muted">读取中…</p>
        ) : messages.error !== null ? (
          <Line tone="error" role="alert">{messages.error}</Line>
        ) : messages.items.length === 0 ? (
          <p className="qqr-muted">最近 24 小时没有消息。</p>
        ) : (
          <div>
            {messages.items.map((message) => (
              <div
                key={(message.messageId || String(message.time)) + ':' + String(message.time)}
                className="qqr-msg"
              >
                <span className="qqr-msg-meta">
                  {formatClockTime(message.time)} · {message.name}
                  {message.mentionsSelf ? '（@你）' : ''}
                  {message.replyToId !== '' ? '（引用 ' + message.replyToId + '）' : ''}
                  {mediaLabels(message.media).length > 0 ? ' ' + mediaLabels(message.media).join(' ') : ''}
                </span>
                {message.text !== '' ? <span className="qqr-msg-text">{message.text}</span> : null}
              </div>
            ))}
          </div>
        )}
      </Block>
    </Card>
  )
}

/** 群项目目录表：每行可改目录、重新绑定、看消息、解除绑定。 */
function ProjectsCard({ model }: { model: RelaySettingsModel }): ReactElement {
  const { status, projectRows, busy, loading } = model
  return (
    <Card>
      <Block>
        <div className="qqr-headline">
          <h4 className="qqr-subhead">群项目目录</h4>
          <span className="qqr-inline-actions">
            {status !== null && status.mappings.length > 0 ? (
              <Button onClick={model.clearMappings} disabled={busy || loading} variant="outline">
                清空全部映射（{status.mappings.length}）
              </Button>
            ) : null}
          </span>
        </div>
        <p className="qqr-hint">
          每个群的聊天记录写进该项目的 <code>.qq-relay/chat/&lt;群号&gt;/</code>，DSH 会话也以它为工作目录；
          留空表示跟随上面的默认项目。改目录只影响之后新建的会话——已建会话请点「重新绑定」
          （旧项目里的聊天记录不会移动）。
        </p>
      </Block>
      {status === null || projectRows.length === 0 ? (
        <Block>
          <p className="qqr-empty">还没有群：把群号填进「群白名单」，或在群里 @ 机器人后会自动出现。</p>
        </Block>
      ) : (
        <Block>
          <div className="qqr-scroll">
            <table className="qqr-table">
              <thead>
                <tr>
                  <th className="qqr-th">群号</th>
                  <th className="qqr-th">会话</th>
                  <th className="qqr-th">项目目录</th>
                  <th className="qqr-th">操作</th>
                </tr>
              </thead>
              <tbody>
                {projectRows.map((row) => (
                  <tr key={row.groupId}>
                    <td className="qqr-td">{row.groupId}</td>
                    <td className="qqr-td">
                      {row.sessionId === '' ? (
                        <span className="qqr-muted">未创建</span>
                      ) : (
                        <>
                          <span>{row.sessionTitle !== '' ? row.sessionTitle : '—'}</span>
                          <span className="qqr-mono qqr-mono-block">{row.sessionId}</span>
                        </>
                      )}
                    </td>
                    <td className="qqr-td qqr-col-dir">
                      <TextInput
                        value={row.projectDir}
                        onChange={(value) => { model.updateProjectRow(row.groupId, value) }}
                        placeholder={status.config.workspace}
                        ariaLabel={'群 ' + String(row.groupId) + ' 的项目目录'}
                      />
                    </td>
                    <td className="qqr-td">
                      <div className="qqr-row-actions">
                        <Button
                          variant="outline"
                          onClick={() => { model.rebind(row.groupId) }}
                          disabled={busy || row.sessionId === ''}
                        >
                          重新绑定
                        </Button>
                        <Button onClick={() => { model.openMessages(row.groupId) }} disabled={busy || loading}>
                          消息
                        </Button>
                        <Button
                          onClick={() => { model.deleteMapping(row.groupId) }}
                          disabled={busy || row.sessionId === ''}
                        >
                          解除绑定
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Block>
      )}
    </Card>
  )
}

/** 项目配置。 */
export function ProjectPanel({ model }: { model: RelaySettingsModel }): ReactElement {
  const { form, updateField } = model
  return (
    <div className="qqr-panel">
      <Card>
        <Row label="默认项目目录" hint="未单独配置群项目时，聊天记录与 DSH 会话使用的目录">
          <TextInput
            value={form.workspace}
            onChange={(value) => { updateField('workspace', value) }}
            placeholder="~/dsh/qq-relay-ws"
            ariaLabel="默认项目目录"
          />
        </Row>
        <Row label="会话标题模板" hint="可用 {groupName} / {groupId}">
          <TextInput
            value={form.sessionTitle}
            onChange={(value) => { updateField('sessionTitle', value) }}
            placeholder="QQ群：{groupName}"
            ariaLabel="会话标题模板"
          />
        </Row>
      </Card>
      <ProjectsCard model={model} />
      <MessagesCard model={model} />
    </div>
  )
}
