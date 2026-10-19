/**
 * 配置页外壳（client View 层）：状态行 + 二级页面导航（连接 / 项目 / 行为 / 预设 / 记录）。
 *
 * 注册落点是插件面板里 dsh-qq-relay 组合包自己的页面（`plugins.bundle.config`，
 * key = 包名），页面标题 / 描述 / 启动开关由插件页负责，这里只画表单内容。
 * 呈现态与动作在 `../viewmodel/settings`，样式在 `./theme`。
 */

import { type ReactElement } from 'react'

import { Button, Line, StatusLineView } from './controls.js'
import { useRelayStyles } from './theme.js'
import { SETTINGS_TABS, useRelaySettings } from '../viewmodel/settings.js'
import { BehaviorPanel } from './panels/BehaviorPanel.js'
import { ConnectionPanel } from './panels/ConnectionPanel.js'
import { PresetsPanel } from './panels/PresetsPanel.js'
import { ProjectPanel } from './panels/ProjectPanel.js'
import { RecordsPanel } from './panels/RecordsPanel.js'

/** 插件面板里 dsh-qq-relay 组合包的配置页。 */
export function RelaySettingsPage(): ReactElement {
  const model = useRelaySettings()
  useRelayStyles()

  const panel = model.tab === 'connection'
    ? <ConnectionPanel model={model} />
    : model.tab === 'project'
      ? <ProjectPanel model={model} />
      : model.tab === 'behavior'
        ? <BehaviorPanel model={model} />
        : model.tab === 'presets'
          ? <PresetsPanel model={model} />
          : <RecordsPanel model={model} />

  return (
    <div className="qqr-root" data-plugin="dsh-qq-relay">
      <div className="qqr-head">
        <StatusLineView line={model.statusLine} />
        <div className="qqr-actions">
          <Button onClick={model.refresh} disabled={model.loading || model.busy}>
            刷新
          </Button>
          <Button variant="outline" onClick={model.reconnect} disabled={model.loading || model.busy}>
            重新连接
          </Button>
          <Button variant="primary" onClick={model.save} disabled={model.loading || model.busy}>
            保存并重连
          </Button>
        </div>
      </div>

      <nav className="qqr-tabs" role="tablist" aria-label="QQ 机器人配置">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={'qqr-tab-' + tab.id}
            className="qqr-tab"
            data-active={model.tab === tab.id}
            aria-selected={model.tab === tab.id}
            aria-controls="qqr-tabpanel"
            onClick={() => { model.setTab(tab.id) }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {model.error !== null ? <Line tone="error" role="alert">{model.error}</Line> : null}
      {model.notice !== null ? <Line tone="ok" role="status">{model.notice}</Line> : null}
      {model.dirty ? <Line tone="warn">有未保存的修改。</Line> : null}

      <div
        id="qqr-tabpanel"
        role="tabpanel"
        aria-labelledby={'qqr-tab-' + model.tab}
      >
        {panel}
      </div>

      <p className="qqr-footer">
        配置来源：profile 的 <code>cordis.patch.yml</code>，本页保存的覆盖写入
        <code> ~/.dsh/storages/dsh-qq-relay/settings.json</code>；预设写入同目录的
        <code>presets.json</code> 并在启动时动态注册。token 只写不读，页面永远看不到明文。
      </p>
    </div>
  )
}
