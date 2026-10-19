/**
 * 审批桥纯逻辑（P3）：审批请求文案、文本命令匹配、决策者角色校验。
 *
 * 设计见 docs/approval.md。这里不碰 DSH 服务、不发送消息：调度在
 * controller/approval.js，发送走 relay.sendText。
 */

/** 同意类命令词（匹配前会去空白与首尾标点，忽略大小写）。 */
export const APPROVE_WORDS = Object.freeze(['同意', '允许', '批准', '通过', '可以', '答应', 'ok', 'okay', 'yes', 'allow', 'approve', 'y'])
/** 拒绝类命令词。 */
export const REJECT_WORDS = Object.freeze(['拒绝', '不允许', '不行', '驳回', '不要', '不准', 'no', 'deny', 'reject', 'n'])

const TRIM_RE = /^[\s,，.。!！?？~～、]+|[\s,，.。!！?？~～、]+$/g

function normalize(text) {
  if (typeof text !== 'string') return ''
  return text.toLowerCase().replace(TRIM_RE, '')
}

/**
 * 把一条群消息文本解析为审批决定。
 *
 * @param text - 群消息正文
 * @returns `'allow'` / `'deny'` / `null`（不是审批命令）
 */
export function matchApprovalDecision(text) {
  const value = normalize(text)
  if (value === '') return null
  // 先比拒绝词：「不允许」包含「允许」，必须先命中拒绝。
  if (REJECT_WORDS.includes(value)) return 'deny'
  if (APPROVE_WORDS.includes(value)) return 'allow'
  return null
}

/** 默认允许审批的角色（群主 / 管理员）。 */
export const DEFAULT_APPROVAL_ROLES = Object.freeze(['owner', 'admin'])

/**
 * 发送者是否有审批资格。
 *
 * @param event - 内部群消息事件（用 sender.role）
 * @param roles - 允许的角色列表
 */
export function canDecideApproval(event, roles = DEFAULT_APPROVAL_ROLES) {
  const role = typeof event?.sender?.role === 'string' ? event.sender.role : ''
  return Array.isArray(roles) && roles.includes(role)
}

/**
 * 生成发到群里的审批提示文本（纯文本，QQ 不渲染 Markdown）。
 *
 * @param options.toolName - 请求审批的工具名
 * @param options.reason - 请求方给的原因（可缺省）
 * @param options.timeoutMs - 超时时间
 */
export function formatApprovalPrompt({ toolName, reason, timeoutMs }) {
  const seconds = Math.max(1, Math.round(Number(timeoutMs) / 1000))
  const lines = [
    '【审批请求】' + (typeof toolName === 'string' && toolName !== '' ? toolName : '未知工具') + ' 需要你确认。',
  ]
  if (typeof reason === 'string' && reason.trim() !== '') lines.push('原因：' + reason.trim())
  lines.push('回复「同意」或「拒绝」（' + String(seconds) + ' 秒内有效，超时按拒绝处理）。')
  return lines.join('\n')
}
