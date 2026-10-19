/**
 * 配置页的公共控件（client View 层）。
 *
 * 只依赖 React 与本地类名，视觉全部来自 `theme.ts` 的样式与宿主 --dsw-* token；
 * 形态对齐 DSH 设置页：卡片 + 行（左侧标题 / 说明，右侧控件）、紧凑按钮。
 */

import type { ReactElement, ReactNode } from 'react'

import type { StatusLine, StatusTone } from '../viewmodel/settings.js'

/** 一枚状态点。 */
export function StatusDot({ tone }: { tone: StatusTone }): ReactElement {
  return <span className="qqr-dot" data-tone={tone} aria-hidden="true" />
}

/** 按钮：默认 ghost（设置页内的次要动作），primary 用于保存。 */
export function Button(props: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'ghost' | 'primary' | 'outline'
  title?: string
}): ReactElement {
  return (
    <button
      type="button"
      className="qqr-btn"
      data-variant={props.variant ?? 'ghost'}
      onClick={props.onClick}
      disabled={props.disabled === true}
      title={props.title}
    >
      {props.children}
    </button>
  )
}

/** 卡片：设置卡片材质（R20 + settings-card fill/stroke）。 */
export function Card({ children }: { children: ReactNode }): ReactElement {
  return <div className="qqr-card">{children}</div>
}

/** 一行：左侧标题 + 说明，右侧控件。 */
export function Row(props: {
  label: string
  hint?: string
  children: ReactNode
}): ReactElement {
  return (
    <div className="qqr-row">
      <div className="qqr-row-text">
        <span className="qqr-label">{props.label}</span>
        {props.hint !== undefined ? <span className="qqr-hint">{props.hint}</span> : null}
      </div>
      <div className="qqr-control">{props.children}</div>
    </div>
  )
}

/** 不受行栅格约束的块（说明 / 表格 / 消息列表）。 */
export function Block({ children }: { children: ReactNode }): ReactElement {
  return <div className="qqr-block">{children}</div>
}

/** 一行提示（成功 / 失败 / 警告 / 说明）。 */
export function Line(props: { tone?: 'ok' | 'warn' | 'error' | 'muted'; role?: 'alert' | 'status'; children: ReactNode }): ReactElement {
  return (
    <p className="qqr-line" data-tone={props.tone ?? 'muted'} role={props.role}>
      {props.children}
    </p>
  )
}

/** 把状态行画成「点 + 文案」。 */
export function StatusLineView({ line }: { line: StatusLine }): ReactElement {
  return (
    <span className="qqr-status">
      <StatusDot tone={line.tone} />
      <span>{line.text}</span>
    </span>
  )
}

/** 开关（受控）：轨道用中性底色，开启态用宿主 success 语义色。 */
export function Toggle(props: {
  checked: boolean
  onChange: (value: boolean) => void
  ariaLabel?: string
  disabled?: boolean
}): ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      aria-label={props.ariaLabel}
      className="qqr-toggle"
      data-on={props.checked ? 'true' : 'false'}
      disabled={props.disabled === true}
      onClick={() => { props.onChange(!props.checked) }}
    >
      <span className="qqr-toggle-knob" aria-hidden="true" />
    </button>
  )
}

/** 多行文本域（受控）。 */
export function TextArea(props: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  ariaLabel?: string
}): ReactElement {
  return (
    <textarea
      className="qqr-textarea"
      value={props.value}
      placeholder={props.placeholder}
      rows={props.rows ?? 4}
      spellCheck={false}
      aria-label={props.ariaLabel}
      onChange={(event) => { props.onChange(event.target.value) }}
    />
  )
}

/** 下拉选项。 */
export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
  title?: string
}

/** 下拉选择（受控）。 */
export function Select(props: {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  ariaLabel?: string
}): ReactElement {
  return (
    <select
      className="qqr-select"
      value={props.value}
      aria-label={props.ariaLabel}
      onChange={(event) => { props.onChange(event.target.value) }}
    >
      {props.options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled === true} title={option.title}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

/** 文本输入框（受控）。 */
export function TextInput(props: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'password'
  inputMode?: 'numeric' | 'decimal'
  autoComplete?: string
  ariaLabel?: string
}): ReactElement {
  return (
    <input
      className="qqr-input"
      type={props.type ?? 'text'}
      value={props.value}
      placeholder={props.placeholder}
      inputMode={props.inputMode}
      autoComplete={props.autoComplete ?? 'off'}
      spellCheck={false}
      aria-label={props.ariaLabel}
      onChange={(event) => { props.onChange(event.target.value) }}
    />
  )
}
