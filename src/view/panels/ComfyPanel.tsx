/**
 * 「画图 / 视频」二级页（v0.22.0，client View 层）：
 * 管理 ComfyUI 连接（启用 / 地址 / 超时 / skill 开关 / 测试连接），
 * 逐条展示 comfy-image（出图）与 comfy-video（视频）两个 skill 的加载状态，
 * 并说明在群里怎么用。数据源是 host 状态快照里的 `config.comfy` 与 `comfy`；
 * 「测试连接」走 `POST /dsh-qq-relay/api/comfy/test`。
 */

import type { ReactElement } from 'react'

import { Block, Button, Card, Line, Row, StatusLineView, TextInput, Toggle } from '../controls.js'
import { formatAgo } from '../../model/form.js'
import type { RelaySettingsModel } from '../../viewmodel/settings.js'

/** skill 名的中文用途注释（未知名字原样显示）。 */
const SKILL_LABELS: Record<string, string> = {
  'comfy-image': '出图',
  'comfy-video': '视频',
}

/** skill 名 + 用途，例如 comfy-video（视频）。 */
function skillLabel(name: string): string {
  const label = SKILL_LABELS[name]
  return label === undefined ? name : name + '（' + label + '）'
}

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
    <Block><p className="qqr-empty">画图 / 视频能力已关闭；启用并保存后显示运行状态。</p></Block>
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
          {comfy.skills.length === 0 ? (
            <tr>
              <td className="qqr-td">skill</td>
              <td className="qqr-td"><span className="qqr-hint">宿主没有返回 skill 状态（旧版 host？）</span></td>
            </tr>
          ) : comfy.skills.map((skill) => (
            <tr key={skill.name}>
              <td className="qqr-td">{skillLabel(skill.name)}</td>
              <td className="qqr-td">
                {skill.loaded ? '已加载' : '未加载'}
                {skill.error !== ''
                  ? <span className="qqr-hint qqr-mono-block">{skill.error}</span>
                  : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const unloadedSkills = comfy === null ? [] : comfy.skills.filter((skill) => !skill.loaded)
  const skillHint = comfy !== null && comfy.enabled && comfy.reachable && unloadedSkills.length > 0
    ? (comfy.skillEnabled
      ? (
        <Line tone="warn">
          {'有 skill 尚未加载：' + unloadedSkills.map((skill) => skill.name).join(' / ')
            + '；保存配置或重启该 profile 的 GUI 后，host 连上 ComfyUI 会重新注册。'}
        </Line>
      )
      : <Line tone="muted">画图 / 视频能力已开启，但「连接成功后加载 skill」是关闭的：打开上面的开关并保存后才会加载。</Line>)
    : null

  return (
    <div className="qqr-panel">
      <Card>
        <Block>
          <h4 className="qqr-subhead">ComfyUI 服务（出图 / 视频）</h4>
          <p className="qqr-hint">
            host 在启用后定期探测这个地址（约 1 分钟一次）；连接成功后为 DSH 加载
            <code> comfy-image </code>（出图）与<code> comfy-video </code>（视频）两个 skill，
            关闭画图 / 视频会注销它们。
          </p>
          {legacyNote}
        </Block>
        <Row label="启用画图 / 视频" hint="关闭时不探测，也不加载画图 / 视频 skill">
          <Toggle
            checked={form.comfyEnabled}
            onChange={model.setComfyEnabled}
            ariaLabel="启用画图 / 视频"
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
        <Row label="连接成功后加载 skill" hint="注册 comfy-image（出图）与 comfy-video（视频）；保存后立即按新配置探测">
          <Toggle
            checked={form.comfySkillEnabled}
            onChange={model.setComfySkillEnabled}
            ariaLabel="连接成功后加载 skill"
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
          <h4 className="qqr-subhead">在群里画图 / 做视频</h4>
          <ul className="qqr-list">
            <li>群里直接说「画一张……」或「生成一段……视频」即可触发对应 skill，例如「画一张夕阳下的猫」「让这张图动起来」。</li>
            <li>改图先发参考图，再说「改成……」；出图工作流：<code>qwen-t2i</code> 文生图、<code>qwen-i2i</code> 参考图、<code>qwen-edit</code> 编辑。</li>
            <li>视频工作流：<code>h3-t2v</code> 文生视频、<code>h3-i2v</code> 首帧转视频、<code>h3-r2v</code> 参考图转视频（带原生音频）。</li>
            <li>产物落在群项目 <code>assets/comfy/output/</code>；图片用 <code>{'qq_send({ images: [...] })'}</code> 发回群，视频用 <code>{'qq_send({ videos: [...] })'}</code> 发回群。</li>
            <li>ComfyUI 无鉴权，只在家用可信网络使用；不要在公网暴露。</li>
          </ul>
        </Block>
      </Card>
    </div>
  )
}
