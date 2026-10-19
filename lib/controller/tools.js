/**
 * host 工具：`qq_send`（P3）——让任意 DSH 会话把纯文本主动推到白名单 QQ 群。
 *
 * 注册形态：**不 import `@deepseek-ai/dsh-tools`**（本插件运行时零外部依赖），
 * 直接返回 `ToolDefinition` 形状的普通对象：注册表只要求 name / description /
 * parameters（原始 JSON Schema）/ output { schema, render } / execute。
 * 由于是「原始 JSON Schema 工具」，参数校验由本文件自己负责（注册表不校验）。
 *
 * 副作用只经 `sendText` 注入（单测可替换）；白名单与离线队列语义在 relay 侧，
 * 这里再挡一次群号，保证错误信息对模型可读。
 */

export const QQ_SEND_TOOL_NAME = 'qq_send'

const MAX_TEXT_LENGTH = 20000

function fail(message) {
  throw new Error(message)
}

/**
 * 构造 `qq_send` 工具定义。
 *
 * @param options.sendText - `async (groupId, text) => { groupId, chunks, queued, messageIds }`
 * @param options.getGroups - 返回当前白名单群号数组
 * @returns 可直接交给 `ctx.tools.register` 的定义对象
 */
export function createQqSendTool({ sendText, getGroups }) {
  if (typeof sendText !== 'function') throw new Error('createQqSendTool 需要 sendText')
  return {
    name: QQ_SEND_TOOL_NAME,
    description: 'Send a plain-text message to a configured QQ group (proactive push, e.g. task completion notices). '
      + 'The target group must be in the plugin group whitelist; omit groupId when exactly one group is configured. '
      + 'When the relay is offline the text is queued (kept up to 30 minutes) and delivered after reconnection, '
      + 'in which case the result has queued=true.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        text: { type: 'string', description: 'Plain text to send. Markdown is not rendered by QQ.' },
        groupId: { type: 'integer', description: 'Target QQ group id. Optional when exactly one group is whitelisted.' },
      },
      required: ['text'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          groupId: { type: 'integer', description: 'Group actually targeted.' },
          chunks: { type: 'integer', description: 'Number of message chunks.' },
          queued: { type: 'boolean', description: 'True when the relay was offline and the text is queued.' },
          messageIds: { type: 'array', items: { type: 'string' }, description: 'Sent message ids, in order.' },
        },
        required: ['groupId', 'chunks', 'queued', 'messageIds'],
      },
      render(args, value) {
        const target = '群 ' + String(value.groupId)
        if (value.queued === true) {
          return [{ type: 'text', text: target + ' 当前离线：消息已进入发送队列（' + String(value.chunks) + ' 条），重连后补发。' }]
        }
        return [{ type: 'text', text: '已发送到' + target + '（' + String(value.chunks) + ' 条，message_id ' + value.messageIds.join(', ') + '）。' }]
      },
    },
    async execute(rawArgs, exec) {
      if (typeof exec?.signal?.throwIfAborted === 'function') exec.signal.throwIfAborted()
      const args = rawArgs !== null && typeof rawArgs === 'object' ? rawArgs : {}
      const text = typeof args.text === 'string' ? args.text.trim() : ''
      if (text === '') fail('text 不能为空')
      if (text.length > MAX_TEXT_LENGTH) fail('text 过长（上限 ' + String(MAX_TEXT_LENGTH) + ' 字符）')

      const groups = (typeof getGroups === 'function' ? getGroups() : []).filter((id) => Number.isInteger(id) && id > 0)
      let groupId = args.groupId
      if (groupId === undefined || groupId === null) {
        if (groups.length === 1) groupId = groups[0]
        else if (groups.length === 0) fail('还没有配置任何群白名单（先在设置页「QQ 机器人」里填群号）')
        else fail('配置了多个群（' + groups.join(', ') + '），请显式传 groupId')
      }
      if (!Number.isInteger(groupId) || groupId <= 0) fail('groupId 必须是正整数')
      if (!groups.includes(groupId)) fail('群 ' + String(groupId) + ' 不在白名单（允许：' + (groups.join(', ') || '无') + '）')

      return sendText(groupId, text)
    },
  }
}
