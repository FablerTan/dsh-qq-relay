/**
 * 「记录」二级页：聊天记录保留天数 + 立即清理（client View 层）。
 */

import type { ReactElement } from 'react'

import { Block, Button, Card, Row, TextInput } from '../controls.js'
import type { RelaySettingsModel } from '../../viewmodel/settings.js'

/** 记录清理配置。 */
export function RecordsPanel({ model }: { model: RelaySettingsModel }): ReactElement {
  const { form, updateField } = model
  return (
    <div className="qqr-panel">
      <Card>
        <Row label="聊天记录保留天数" hint="0 = 永不自动删除；7..3650 = 自动清理天数（保存后生效）">
          <TextInput
            value={form.chatRetentionDays}
            onChange={(value) => { updateField('chatRetentionDays', value) }}
            inputMode="numeric"
            placeholder="0"
            ariaLabel="聊天记录保留天数"
          />
        </Row>
        <Block>
          <p className="qqr-hint">
            聊天记录与媒体文件默认<b>永不自动删除</b>（保留天数 0）。填 7..3650 保存后，
            宿主启动时与每天各清理一次超过该天数的 <code>.qq-relay/chat/</code> 日文件与
            <code> .qq-relay/media/</code> 日期目录。
          </p>
          <div className="qqr-headline">
            <Button variant="outline" onClick={model.cleanup} disabled={model.busy || model.loading}>
              立即清理
            </Button>
            <span className="qqr-hint">用上面的天数（1..3650）清一次，不改配置、不动群映射；删除后不可恢复。</span>
          </div>
        </Block>
      </Card>
    </div>
  )
}
