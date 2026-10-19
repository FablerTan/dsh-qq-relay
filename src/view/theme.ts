/**
 * 配置页样式注入（client View 层）。
 *
 * client 半身只依赖 React，不能 import 宿主的 CSS Modules；这里把一份普通 CSS
 * 挂到 document.head 一次，全部使用宿主 ui-theme 的 `--dsw-*` 语义 token，
 * 因此跟随明暗主题与字号设置，不写任何字面色值。
 */

import { useEffect } from 'react'

/** 样式元素的 id（重复挂载时复用）。 */
const STYLE_ID = 'dsh-qq-relay-client-style'

/** 配置页样式文本（类名统一 qqr- 前缀，避免与宿主样式撞名）。 */
export const RELAY_CSS = `/* dsh-qq-relay 配置页样式：全部走宿主 ui-theme 的 --dsw-* 语义 token，
 * 不写字面色值、不定义主题分支；几何遵循 DSH 圆角规范（控件 R12 / 卡片 R20）。 */

.qqr-root {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  max-width: 760px;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 20px;
}

.qqr-head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.qqr-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.qqr-dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  corner-shape: round;
  background: var(--dsw-alias-state-idle-primary);
}

.qqr-dot[data-tone='ok'] { background: var(--dsw-alias-state-success-primary); }
.qqr-dot[data-tone='warn'] { background: var(--dsw-alias-state-warn-primary); }
.qqr-dot[data-tone='error'] { background: var(--dsw-alias-state-error-primary); }

.qqr-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex-wrap: wrap;
}

.qqr-btn {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  cursor: pointer;
  transition:
    background-color var(--ds-transition-duration-fast) var(--ds-ease-in-out),
    color var(--ds-transition-duration-fast) var(--ds-ease-in-out);
}

.qqr-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.qqr-btn:active:not(:disabled) { background: var(--dsw-alias-interactive-bg-active); }
.qqr-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.qqr-btn[data-variant='primary'] {
  background: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-label-primary-foreground);
}

.qqr-btn[data-variant='primary']:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }

.qqr-btn[data-variant='outline'] { border: 0.5px solid var(--dsw-alias-border-l3); }

.qqr-btn:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}

.qqr-tabs {
  display: flex;
  align-items: flex-end;
  gap: 22px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l2);
  margin-top: 2px;
}

.qqr-tab {
  position: relative;
  border: 0;
  padding: 7px 1px 9px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  cursor: pointer;
}

.qqr-tab:hover,
.qqr-tab[data-active='true'] { color: var(--dsw-alias-label-primary); }

.qqr-tab[data-active='true']::after {
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: var(--dsw-alias-label-primary);
  content: '';
}

.qqr-tab:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
  border-radius: 2px;
  color: var(--dsw-alias-label-primary);
}

.qqr-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.qqr-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-radius: var(--dsw-radius-xl);
  border: 0.5px solid var(--dsw-alias-settings-card-stroke);
  background: var(--dsw-alias-settings-card-fill);
  overflow: hidden;
}

.qqr-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 280px);
  gap: 16px;
  align-items: start;
  padding: 10px 14px;
}

.qqr-row + .qqr-row { border-top: 0.5px solid var(--dsw-alias-border-l1); }

.qqr-row-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.qqr-label { color: var(--dsw-alias-label-primary); }

.qqr-hint,
.qqr-muted {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}

.qqr-control { min-width: 0; }

.qqr-input {
  box-sizing: border-box;
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border: 0.5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
}

.qqr-input::placeholder { color: var(--dsw-alias-label-dimmed); }

.qqr-input:focus {
  outline: none;
  border-color: var(--dsw-alias-state-business-primary);
}

.qqr-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  min-width: 0;
}

.qqr-block + .qqr-block { border-top: 0.5px solid var(--dsw-alias-border-l1); }

.qqr-headline {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.qqr-subhead {
  margin: 0;
  font-size: 13px;
  line-height: 20px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
}

.qqr-row-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.qqr-scroll {
  min-width: 0;
  overflow-x: auto;
}

.qqr-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  line-height: 18px;
}

.qqr-th {
  padding: 6px 8px;
  text-align: left;
  font-weight: 500;
  color: var(--dsw-alias-label-tertiary);
  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
  white-space: nowrap;
}

.qqr-td {
  padding: 6px 8px;
  border-top: 0.5px solid var(--dsw-alias-border-l1);
  vertical-align: middle;
}

.qqr-table tbody tr:first-child .qqr-td { border-top: 0; }

.qqr-mono {
  font-family: var(--ds-font-family-code);
  font-size: 11px;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
  word-break: break-all;
}

.qqr-msg {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 0;
  border-top: 0.5px solid var(--dsw-alias-border-l1);
}

.qqr-msg:first-child { border-top: 0; }

.qqr-msg-meta {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}

.qqr-msg-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.qqr-line { margin: 0; }
.qqr-line[data-tone='error'] { color: var(--dsw-alias-state-error-primary); }
.qqr-line[data-tone='warn'] { color: var(--dsw-alias-state-warn-primary); }
.qqr-line[data-tone='ok'] { color: var(--dsw-alias-state-success-primary); }

.qqr-list {
  margin: 0;
  padding-left: 1.1rem;
}

.qqr-footer {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}

.qqr-empty {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
}

.qqr-root code {
  padding: 1px 4px;
  border-radius: var(--dsw-radius-xs);
  background: var(--dsw-alias-markdown-inline-code);
  color: var(--dsw-alias-label-secondary);
  font-family: var(--ds-font-family-code);
  font-size: 11px;
  line-height: 16px;
}

.qqr-inline-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-left: auto;
}

.qqr-mono-block {
  display: block;
}

.qqr-col-dir {
  min-width: 200px;
}

@media (max-width: 680px) {
  .qqr-row { grid-template-columns: minmax(0, 1fr); }
}
`

/** 挂载配置页样式；卸载时移除（HMR / 重复挂载安全）。 */
export function useRelayStyles(): void {
  useEffect(() => {
    if (document.getElementById(STYLE_ID) !== null) return
    const element = document.createElement('style')
    element.id = STYLE_ID
    element.textContent = RELAY_CSS
    document.head.appendChild(element)
    return () => { element.remove() }
  }, [])
}