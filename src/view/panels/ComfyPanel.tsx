/**
 * 「画图」二级页（v0.21.0，client View 层）：
 * 管理 ComfyUI 连接（启用 / 地址 / 超时 / skill 开关 / 测试连接），
 * 展示画图 skill 的加载状态，并说明在群里怎么用。
 * 数据源是 host 状态快照里的 `config.comfy` 与 `comfy`；
 * 「测试连接」走 `POST /dsh-qq-relay/api/comfy/test`。
 */

import type { ReactElement } from 'react'

import { Block, Button, Card, Line, Row, StatusLineView, TextInput, Toggle } from '../controls.js'
import { formatAgo } from '../../model/form.js'
import type { RelaySettingsModel } from '../../viewmodel/settings.js'

/** 探测结果表格里的一行。 */
function ProbeRow({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <tr>
      <td className="qqr-td">{label}</td>
      <td className="qqr-td">{value}</td>
    </tr>
  )
}

/** 画图配置 + 运行状态 + 使用说明。 */
export function ComfyPanel({ model }: { model: RelaySettingsModel }): ReactElement {
  const { form, updateField, status, comfyProbe } = model
  const comfy = status?.comfy ?? null
  const probe = comfyProbe.result
  const legacyNote = status !== null && !status.config.comfySupported
    ? <Line tone="warn">宿主版本较旧，需重启该 profile 的 GUI 后此页才生效。</Line>
    : null

  const probeTable = probe === null ? null : (
    <div className="qqr-scroll">
      <table className="qqr-table">
        <thead>
          <tr>
            <th className="qqr-th">项目</th>
            <th className="qqr-th">结果</th>
          </tr>
        </thead>
        <tbody>
          <ProbeRow label="目标地址" value={probe.target !== '' ? probe.target : '（空）'} />
          <ProbeRow label="可达" value={probe.reachable ? '是' : '否'} />
          <ProbeRow label="ComfyUI 版本" value={probe.version !== '' ? probe.version : '未知'} />
          <ProbeRow label="GPU" value={probe.device !== '' ? probe.device : '未知'} />
          <ProbeRow
            label="队列"
            value={String(probe.queue.running) + ' 运行 / ' + String(probe.queue.pending) + ' 等待'}
          />
          <ProbeRow label="延迟" value={String(probe.latencyMs) + ' ms'} />
          <ProbeRow label="错误" value={probe.error !== '' ? probe.error : '—'} />
        </tbody>
      </table>
    </div>
  )

  const statusTable = comfy === null ? (
    <Block><p className="qqr-empty">状态读取中…</p></Block>
  ) : !comfy.enabled ? (
    <Block><p className="qqr-empty">画图能力已关闭；启用并保存后显示运行状态。</p></Block>
  ) : (
    <div className="qqr-scroll">
      <table className="qqr-table">
        <thead>
          <tr>
            <th className="qqr-th">项目</th>
            <th className="qqr-th">状态</th>
          </tr>
        </thead>
        <tbody>
          <ProbeRow label="可达" value={comfy.reachable ? '是' : '否'} />
          <ProbeRow label="ComfyUI 版本" value={comfy.version !== '' ? comfy.version : '未知'} />
          <ProbeRow label="设备" value={comfy.device !== '' ? comfy.device : '未知'} />
          <ProbeRow
            label="队列"
            value={String(comfy.queue.running) + ' 运行 / ' + String(comfy.queue.pending) + ' 等待'}
          />
          <ProbeRow label="最近检查" value={formatAgo(comfy.checkedAt) !== '' ? formatAgo(comfy.checkedAt) : '尚未检查'} />
          <tr>
            <td className="qqr-td">画图 skill</td>
            <td className="qqr-td">
              {(comfy.skill.name !== '' ? comfy.skill.name : 'comfy-image')
                + ' · ' + (comfy.skill.loaded ? '已加载' : '未加载')}
              {comfy.skill.error !== ''
                ? <span className="qqr-hint qqr-mono-block">{comfy.skill.error}</span>
                : null}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )

  const skillHint = comfy !== null && comfy.enabled && comfy.reachable && !comfy.skill.loaded
    ? (comfy.skillEnabled
        ? <Line tone="warn">画图 skill 尚未加载：保存配置或重启该 profile 的 GUI 后，host 连上 ComfyUI 会重新注册。</Line>
        : <Line tone="muted">画图能力已开启，但「连接成功后加载画图 skill」是关闭的：打开上面的开关并保存后才会加载。</Line>)
    : null

  return (
    <div className="qqr-panel">
      <Card>
        <Block>
          <h4 className="qqr-subhead">ComfyUI 服务</h4>
          <p className="qqr-hint">
            host 在启用后定期探测这个地址（约 1 分钟一次），连上 ComfyUI 且开关打开时把
            <code> comfy-image </code>skill 动态注册给 DSH；关闭画图会注销 skill。
          </p>
          {legacyNote}
        </Block>
        <Row label="启用画图" hint="关闭时不探测，也不加载画图 skill">
          <Toggle
            checked={form.comfyEnabled}
            onChange={model.setComfyEnabled}
            ariaLabel="启用画图"
          />
        </Row>
        <Row label="服务地址" hint="ComfyUI HTTP 地址（无鉴权，只填可信网络里的地址）">
          <TextInput
            value={form.comfyBaseUrl}
            onChange={(value) => { updateField('comfyBaseUrl', value) }}
            placeholder="http://192.168.1.10:8188"
            ariaLabel="ComfyUI 服务地址"
          />
        </Row>
        <Row label="探测超时" hint="3s..120s；测试连接与后台探测都用它">
          <TextInput
            value={form.comfyTimeout}
            onChange={(value) => { updateField('comfyTimeout', value) }}
            placeholder="30s"
            ariaLabel="ComfyUI 探测超时"
          />
        </Row>
        <Row label="连接成功后加载画图 skill" hint="注册成 DSH 的运行时 skill；保存后立即按新配置探测">
          <Toggle
            checked={form.comfySkillEnabled}
            onChange={model.setComfySkillEnabled}
            ariaLabel="连接成功后加载画图 skill"
          />
        </Row>
        <Block>
          <div className="qqr-headline">
            <Button variant="outline" onClick={model.testComfy} disabled={comfyProbe.busy}>
              {comfyProbe.busy ? '测试中…' : '测试连接'}
            </Button>
            <span className="qqr-hint">用上面填的地址与超时探测一次（只探测，不保存配置）。</span>
          </div>
          {comfyProbe.error !== null ? <Line tone="error" role="alert">{comfyProbe.error}</Line> : null}
          {probeTable}
        </Block>
      </Card>

      <Card>
        <Block>
          <h4 className="qqr-subhead">运行状态</h4>
          <StatusLineView line={model.comfyLine} />
          {comfy !== null && comfy.enabled && !comfy.reachable
            ? <Line tone="warn">请检查服务地址与 ComfyUI 是否已启动；保存配置或等待下一轮探测。</Line>
            : null}
          {skillHint}
        </Block>
        {statusTable}
      </Card>

      <Card>
        <Block>
          <h4 className="qqr-subhead">在群里画图</h4>
          <ul className="qqr-list">
            <li>群里直接说「画一张……」即可触发画图 skill，例如「画一张夕阳下的猫」。</li>
            <li>改图先发参考图，再说「改成……」；工作流：<code>qwen-t2i</code> 文生图、<code>qwen-i2i</code> 参考图、<code>qwen-edit</code> 编辑。</li>
            <li>产物落在群项目 <code>assets/comfy/output/</code>，agent 会用 <code>qq_send</code> 把图发回群里。</li>
            <li>ComfyUI 无鉴权，只在家用可信网络使用；不要在公网暴露。</li>
          </ul>
        </Block>
      </Card>
    </div>
  )
}
