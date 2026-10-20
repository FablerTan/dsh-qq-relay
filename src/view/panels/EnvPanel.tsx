/**
 * 「环境」二级页（v0.23.0，client View 层）：
 * 把 docs/onebot-channel.md §3 的手工步骤收敛成 7 个状态 + 按钮（环境目录 / Docker CLI /
 * 容器引擎 / compose 文件 / NapCat 容器 / QQ 登录 / OneBot 配置 / 插件回填）。
 *
 * 数据源是 `GET /dsh-qq-relay/api/env`（见 src/viewmodel/env.ts）；动作走
 * `POST /api/env/action`，安装类动作在执行前二次确认。目录 / token 属于配置字段，
 * 用顶部的「保存并重连」落盘（只写 token，页面不回显）。
 */

import { useEffect } from 'react'
import type { ReactElement } from 'react'

import { Block, Button, Card, Line, Row, StatusDot, TextInput, Toggle } from '../controls.js'
import type { StatusTone } from '../../viewmodel/settings.js'
import type { RelaySettingsModel } from '../../viewmodel/settings.js'
import { useRelayEnv, type RelayEnvModel } from '../../viewmodel/env.js'
import type { RelayEnvActionView, RelayEnvStepView } from '../../model/api.js'

/** 步骤状态 → 状态点色调。 */
function toneOf(status: string): StatusTone {
  if (status === 'ok') return 'ok'
  if (status === 'warn') return 'warn'
  if (status === 'error') return 'error'
  return 'muted'
}

/** 步骤状态 → 中文标签。 */
function labelOf(status: string): string {
  if (status === 'ok') return '正常'
  if (status === 'warn') return '待处理'
  if (status === 'error') return '未通过'
  return '跳过'
}

/** 动作按钮：确认类动作先弹 confirm，再带 confirm:true 发给 host。 */
function ActionButton(props: {
  action: RelayEnvActionView
  disabled: boolean
  env: RelayEnvModel
  onDone: () => void
}): ReactElement {
  const { action, disabled, env, onDone } = props
  const tone = action.kind === 'command' || action.kind === 'chain' ? 'outline' : 'ghost'
  const handle = (): void => {
    if (action.confirm) {
      const confirmFn = (globalThis as { confirm?: (message: string) => boolean }).confirm
      // 没有确认能力就不执行系统类动作（不能默认「同意」）。
      if (typeof confirmFn !== 'function') return
      const approved = confirmFn(action.title + '\n\n' + action.description)
      if (!approved) return
    }
    env.run(action.id, { confirm: action.confirm, onDone })
  }
  return (
    <Button variant={tone} onClick={handle} disabled={disabled} title={action.description}>
      {action.title}
    </Button>
  )
}

/** 一个步骤在表格里的一行。 */
function StepRow(props: {
  step: RelayEnvStepView
  catalog: Map<string, RelayEnvActionView>
  env: RelayEnvModel
  onDone: () => void
}): ReactElement {
  const { step, catalog, env, onDone } = props
  const disabled = env.busy || (env.env !== null && env.env.running !== null)
  return (
    <tr>
      <td className="qqr-td">
        <StatusDot tone={toneOf(step.status)} />
        {' ' + step.title}
      </td>
      <td className="qqr-td">{labelOf(step.status)}</td>
      <td className="qqr-td">
        {step.detail}
        {step.evidence.length > 0 ? (
          <div className="qqr-mono-block">
            {step.evidence.map((line, index) => (
              <div key={String(index)}>{line}</div>
            ))}
          </div>
        ) : null}
      </td>
      <td className="qqr-td">
        {step.actions.map((id) => {
          const action = catalog.get(id)
          return action === undefined
            ? null
            : (
              <ActionButton
                key={id}
                action={action}
                disabled={disabled}
                env={env}
                onDone={onDone}
              />
            )
        })}
      </td>
    </tr>
  )
}

/** 环境配置 + 检查清单 + 动作日志。 */
export function EnvPanel({ model }: { model: RelaySettingsModel }): ReactElement {
  const env = useRelayEnv()
  const status = env.env
  const catalog = new Map<string, RelayEnvActionView>()
  for (const action of status?.actions ?? []) catalog.set(action.id, action)
  const onDone = (): void => { model.refresh() }
  const disabled = env.busy || (status !== null && status.running !== null)
  const legacyNote = model.status !== null && !model.status.config.environmentSupported
    ? <Line tone="warn">宿主版本较旧，需重启该 profile 的 GUI 后此页才生效。</Line>
    : null

  // open-webui 返回链接后新开标签页（浏览器可能拦截弹窗：下面同时给出手动链接）。
  useEffect(() => {
    if (env.webuiUrl === null) return
    const open = (globalThis as { open?: (url: string) => unknown }).open
    if (typeof open === 'function') open(env.webuiUrl)
  }, [env.webuiUrl])

  const summary = status === null
    ? null
    : (
      <span className="qqr-hint">
        {'正常 ' + String(status.summary.ok) + ' · 待处理 ' + String(status.summary.warn)
          + ' · 未通过 ' + String(status.summary.error) + ' · 跳过 ' + String(status.summary.skip)}
        {status.checkedAt > 0 ? '（最近检查 ' + new Date(status.checkedAt).toLocaleTimeString() + '）' : ''}
        {status.running !== null ? ' · 正在执行：' + status.running.action : ''}
      </span>
    )

  const table = status === null ? (
    <Block><p className="qqr-empty">环境状态读取中…</p></Block>
  ) : status.checkedAt === 0 && status.checking ? (
    <Block><p className="qqr-empty">正在检查环境（docker / 文件 / OneBot 配置）…</p></Block>
  ) : !status.supported ? (
    <Block>
      <Line tone="warn">
        {'当前平台（' + (status.platform || '未知') + '）暂不支持环境页：只支持 macOS（Colima）与 Linux（Docker）。'}
      </Line>
    </Block>
  ) : !status.enabled ? (
    <Block><p className="qqr-empty">环境页已关闭：打开上面的「启用环境页」并保存后开始探测。</p></Block>
  ) : (
    <div className="qqr-scroll">
      <table className="qqr-table">
        <thead>
          <tr>
            <th className="qqr-th">步骤</th>
            <th className="qqr-th">状态</th>
            <th className="qqr-th">说明</th>
            <th className="qqr-th">操作</th>
          </tr>
        </thead>
        <tbody>
          {status.steps.map((step) => (
            <StepRow key={step.id} step={step} catalog={catalog} env={env} onDone={onDone} />
          ))}
        </tbody>
      </table>
    </div>
  )

  const plan = status === null ? null : status.fixPlan
  const planTitles = plan === null ? [] : plan.titles

  /**
   * 一键修复：host 会在计划里列出「这次会做什么」；含安装 / 启动引擎 / 覆盖 compose 时
   * 先弹一次确认（host 侧同样强制校验 confirm:true，不只靠页面）。
   */
  const handleFixAll = (): void => {
    const needsConfirm = plan !== null && plan.needsConfirm
    if (needsConfirm) {
      const confirmFn = (globalThis as { confirm?: (message: string) => boolean }).confirm
      // 没有确认能力就不执行（不能默认「同意」系统类动作）。
      if (typeof confirmFn !== 'function') return
      const approved = confirmFn(
        '一键修复会依次执行：\n' + planTitles.join(' → ')
          + '\n\n其中安装 / 启动容器引擎或覆盖 compose 会修改系统，确认继续？',
      )
      if (!approved) return
    }
    env.run('fix-all', { confirm: needsConfirm, onDone })
  }

  const planHint = status === null || !status.supported || !status.enabled
    ? null
    : (
      <p className="qqr-hint">
        {planTitles.length > 0
          ? '一键修复将依次执行：' + planTitles.join(' → ')
          : '当前没有可自动修复的步骤。'}
        {status.fixPlan.next !== null
          ? ' 下一步：' + status.fixPlan.next.title + ' — ' + status.fixPlan.next.detail
          : ''}
      </p>
    )

  const actionsBar = status === null || !status.supported || !status.enabled
    ? null
    : (
      <div className="qqr-headline">
        <Button
          variant="outline"
          onClick={handleFixAll}
          disabled={disabled}
          title={planTitles.length > 0 ? '将执行：' + planTitles.join(' → ') : '当前没有可自动修复的步骤'}
        >
          {status.running !== null && status.running.action === 'fix-all' ? '一键修复执行中…' : '一键修复'}
        </Button>
        <Button onClick={env.refresh} disabled={env.busy}>重新检测</Button>
        {status.webuiTokenConfigured
          ? <Button variant="outline" onClick={env.openWebui} disabled={disabled}>打开 WebUI 扫码</Button>
          : null}
      </div>
    )

  return (
    <div className="qqr-panel">
      <Card>
        <Block>
          <h4 className="qqr-subhead">NapCat Docker 环境</h4>
          <p className="qqr-hint">
            环境目录里放 <code>compose.yaml</code> 与 <code>data/</code>（NapCat 的 QQ 配置）；
            host 只探测与执行白名单命令（固定 argv、不经 shell、不 sudo）。改完目录 / token 后
            点页面顶部「保存并重连」落盘（token 只写不读）。
          </p>
          {legacyNote}
        </Block>
        <Row label="启用环境页" hint="关闭时不探测、也不允许执行任何动作">
          <Toggle checked={model.form.envEnabled} onChange={model.setEnvEnabled} ariaLabel="启用环境页" />
        </Row>
        <Row label="环境目录" hint="绝对路径或 ~/ 开头；默认 ~/napcat-docker">
          <TextInput
            value={model.form.envDir}
            onChange={(value) => { model.updateField('envDir', value) }}
            placeholder="~/napcat-docker"
            ariaLabel="环境目录"
          />
        </Row>
        <Row label="WebUI token" hint="只写不读；NapCat 的 WEBUI_TOKEN（compose 里那行）">
          <TextInput
            value={model.form.envWebuiToken}
            onChange={(value) => { model.updateField('envWebuiToken', value) }}
            placeholder={model.status?.config.environment.webuiTokenConfigured ? '已配置；留空表示不修改' : '未配置'}
            type="password"
            ariaLabel="WebUI token"
          />
        </Row>
        <Block>
          <p className="qqr-hint">
            保存后 host 用新目录重新探测；token 用于生成 compose 文件与「打开 WebUI」。
            {model.status?.config.environment.webuiTokenConfigured
              ? ' 当前已配置 token。'
              : ' 当前还没有 token。'}
          </p>
        </Block>
      </Card>

      <Card>
        <Block>
          <h4 className="qqr-subhead">检查清单</h4>
          {summary}
          {actionsBar}
          {planHint}
        </Block>
        {table}
        {env.error !== null ? <Block><Line tone="error" role="alert">{env.error}</Line></Block> : null}
        {env.notice !== null ? <Block><Line tone="ok" role="status">{env.notice}</Line></Block> : null}
        {env.webuiUrl !== null
          ? (
            <Block>
              <p className="qqr-hint">
                WebUI 已在新的标签页打开（没反应就手动点）：
                {' '}
                <a href={env.webuiUrl} target="_blank" rel="noreferrer">{env.webuiUrl}</a>
              </p>
            </Block>
          )
          : null}
      </Card>

      <Card>
        <Block>
          <h4 className="qqr-subhead">动作日志</h4>
          {env.entries.length === 0
            ? <p className="qqr-empty">还没有动作记录：执行「一键修复」或任一步按钮后，这里显示命令输出（token 已脱敏）。</p>
            : (
              <pre className="qqr-mono-block">
                {env.entries.map((entry) => (
                  new Date(entry.at).toLocaleTimeString() + ' [' + entry.level + '] ' + entry.text
                )).join('\n')}
              </pre>
            )}
        </Block>
      </Card>

      <Card>
        <Block>
          <h4 className="qqr-subhead">安全边界</h4>
          <ul className="qqr-list">
            <li>只跑白名单命令（<code>docker</code> / <code>docker compose</code> / <code>brew</code> / <code>colima</code>），参数固定、不经 shell，不 <code>sudo</code>，不下载可执行文件。</li>
            <li>「一键修复」逐步补全：每完成一步自动重新探测并继续下一个能做的步骤；安装 / 启动引擎 / 覆盖 compose 会先弹一次确认。</li>
            <li>安装 Docker / Colima、启动容器引擎、写 OneBot 配置单独点击时都会二次确认（「一键修复」里的系统类动作同样先确认）；写 OneBot 前先备份 <code>.bak-时间戳</code>。</li>
            <li>「打开 WebUI」把 token 拼进链接返回给页面（仅本机 loopback 访问）；状态快照里永远不返回 token 明文。</li>
            <li>Windows / WSL 暂不支持：页面只显示说明，不执行动作。</li>
          </ul>
        </Block>
      </Card>
    </div>
  )
}
