/**
 * host 工具：`qq_send`（P3；v0.12.0 起支持出向图片 / 文件）——
 * 让任意 DSH 会话把文本、图片、文件主动推到白名单 QQ 群。
 *
 * 注册形态：**不 import `@deepseek-ai/dsh-tools`**（本插件运行时零外部依赖），
 * 直接返回 `ToolDefinition` 形状的普通对象：注册表只要求 name / description /
 * parameters（原始 JSON Schema）/ output { schema, render } / execute。
 * 由于是「原始 JSON Schema 工具」，参数校验由本文件自己负责（注册表不校验）。
 *
 * 副作用只经 sendText / sendImage / sendFile 注入（单测可替换）；白名单与离线队列语义在
 * relay 侧，这里再挡一次群号，保证错误信息对模型可读。
 */

export const QQ_SEND_TOOL_NAME = 'qq_send'

const MAX_TEXT_LENGTH = 20000
const MAX_IMAGES = 4

function fail(message) {
  throw new Error(message)
}

/**
 * 构造 `qq_send` 工具定义。
 *
 * @param options.sendText - `async (groupId, text) => { groupId, chunks, queued, messageIds }`
 * @param options.sendImage - `async (groupId, pathOrUrl) => { groupId, chunks, queued, messageIds }`（可缺省）
 * @param options.sendFile - `async (groupId, path, name) => { groupId, fileName, fileId }`（可缺省）
 * @param options.getGroups - 返回当前白名单群号数组
 * @returns 可直接交给 `ctx.tools.register` 的定义对象
 */
export function createQqSendTool({ sendText, sendImage = null, sendFile = null, getGroups }) {
  if (typeof sendText !== 'function') throw new Error('createQqSendTool 需要 sendText')
  return {
    name: QQ_SEND_TOOL_NAME,
    description: 'Send a message to a configured QQ group (proactive push, e.g. task completion notices): '
      + 'plain text, images, and/or one file. The target group must be in the plugin group whitelist; omit groupId when exactly one group is configured. '
      + 'Images accept local absolute paths (JPEG / PNG / GIF / WEBP / BMP, <=10 MiB) or http(s) URLs, max 4. '
      + 'file accepts a local absolute path (<=30 MiB) and is uploaded to the group file system. '
      + 'When the relay is offline, text is queued (kept up to 30 minutes) and delivered after reconnection (queued=true); '
      + 'images and files fail instead of queueing.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        text: { type: 'string', description: 'Plain text to send. Markdown is not rendered by QQ.' },
        images: {
          type: 'array',
          items: { type: 'string' },
          description: 'Images to send: local absolute path or http(s) URL. At most 4.',
        },
        file: { type: 'string', description: 'Local absolute path of one file to upload to the group file system.' },
        fileName: { type: 'string', description: 'Display name for the uploaded file; defaults to the path basename.' },
        groupId: { type: 'integer', description: 'Target QQ group id. Optional when exactly one group is whitelisted.' },
      },
      required: [],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          groupId: { type: 'integer', description: 'Group actually targeted.' },
          chunks: { type: 'integer', description: 'Number of text message chunks.' },
          queued: { type: 'boolean', description: 'True when the relay was offline and the text is queued.' },
          messageIds: { type: 'array', items: { type: 'string' }, description: 'Sent message ids, in order.' },
          media: {
            type: 'object',
            additionalProperties: false,
            properties: {
              images: { type: 'integer', description: 'Number of images sent.' },
              file: { type: 'string', description: 'Uploaded file name; empty when no file was sent.' },
            },
            required: ['images', 'file'],
            description: 'Present only when images or a file were sent.',
          },
        },
        required: ['groupId', 'chunks', 'queued', 'messageIds'],
      },
      render(args, value) {
        const target = '群 ' + String(value.groupId)
        const parts = []
        if (value.queued === true) {
          parts.push(target + ' 当前离线：消息已进入发送队列（' + String(value.chunks) + ' 条），重连后补发。')
        } else if (value.chunks > 0) {
          parts.push('已发送到' + target + '（' + String(value.chunks) + ' 条，message_id ' + value.messageIds.join(', ') + '）。')
        } else if (value.media !== undefined && value.media !== null) {
          parts.push('已发送到' + target + '。')
        }
        if (value.media !== undefined && value.media !== null) {
          const details = []
          if (value.media.images > 0) details.push(String(value.media.images) + ' 张图片')
          if (typeof value.media.file === 'string' && value.media.file !== '') details.push('文件 ' + value.media.file)
          if (details.length > 0) parts.push('另发送：' + details.join('、') + '。')
        }
        return [{ type: 'text', text: parts.join('') }]
      },
    },
    async execute(rawArgs, exec) {
      if (typeof exec?.signal?.throwIfAborted === 'function') exec.signal.throwIfAborted()
      const args = rawArgs !== null && typeof rawArgs === 'object' ? rawArgs : {}
      const text = typeof args.text === 'string' ? args.text.trim() : ''
      if (text.length > MAX_TEXT_LENGTH) fail('text 过长（上限 ' + String(MAX_TEXT_LENGTH) + ' 字符）')
      const images = Array.isArray(args.images)
        ? args.images.filter((item) => typeof item === 'string' && item.trim() !== '').map((item) => item.trim())
        : []
      const file = typeof args.file === 'string' ? args.file.trim() : ''
      const fileName = typeof args.fileName === 'string' ? args.fileName.trim() : ''
      if (images.length > MAX_IMAGES) fail('images 最多 ' + String(MAX_IMAGES) + ' 张')
      if (text === '' && images.length === 0 && file === '') fail('text / images / file 至少要有一个')
      if (images.length > 0 && typeof sendImage !== 'function') fail('当前 relay 不支持发送图片')
      if (file !== '' && typeof sendFile !== 'function') fail('当前 relay 不支持上传文件')

      const groups = (typeof getGroups === 'function' ? getGroups() : []).filter((id) => Number.isInteger(id) && id > 0)
      let groupId = args.groupId
      if (groupId === undefined || groupId === null) {
        if (groups.length === 1) groupId = groups[0]
        else if (groups.length === 0) fail('还没有配置任何群白名单（先在设置页「QQ 机器人」里填群号）')
        else fail('配置了多个群（' + groups.join(', ') + '），请显式传 groupId')
      }
      if (!Number.isInteger(groupId) || groupId <= 0) fail('groupId 必须是正整数')
      if (!groups.includes(groupId)) fail('群 ' + String(groupId) + ' 不在白名单（允许：' + (groups.join(', ') || '无') + '）')

      let result = { groupId, chunks: 0, queued: false, messageIds: [] }
      if (text !== '') result = { ...(await sendText(groupId, text)), groupId }
      const messageIds = Array.isArray(result.messageIds) ? [...result.messageIds] : []
      let imagesSent = 0
      for (const image of images) {
        const sent = await sendImage(groupId, image)
        imagesSent += 1
        if (Array.isArray(sent?.messageIds)) messageIds.push(...sent.messageIds)
      }
      let uploadedFile = ''
      if (file !== '') {
        const sent = await sendFile(groupId, file, fileName)
        uploadedFile = typeof sent?.fileName === 'string' && sent.fileName !== '' ? sent.fileName : fileName
        if (Array.isArray(sent?.messageIds)) messageIds.push(...sent.messageIds)
      }
      const output = {
        groupId,
        chunks: Number.isInteger(result.chunks) && result.chunks > 0 ? result.chunks : 0,
        queued: result.queued === true,
        messageIds,
      }
      if (imagesSent > 0 || uploadedFile !== '') output.media = { images: imagesSent, file: uploadedFile }
      return output
    },
  }
}

export const QQ_POKE_TOOL_NAME = 'qq_poke'

/**
 * 构造 `qq_poke` 工具定义（v0.15.0）：在白名单群里戳指定成员（QQ「戳一戳」）。
 *
 * 与 `qq_send` 一样手写 ToolDefinition、零外部依赖；副作用只经注入的 `poke`，
 * 白名单 / 离线语义在 relay 侧，这里再挡一次群号与 userId。
 *
 * @param options.poke - `async (groupId, userId) => { groupId, userId }`
 * @param options.getGroups - 返回当前白名单群号数组
 * @returns 可直接交给 `ctx.tools.register` 的定义对象
 */
export function createQqPokeTool({ poke, getGroups }) {
  if (typeof poke !== 'function') throw new Error('createQqPokeTool 需要 poke')
  return {
    name: QQ_POKE_TOOL_NAME,
    description: 'Poke a member in a configured QQ group (QQ "戳一戳" nudge). '
      + 'The target group must be in the plugin group whitelist; omit groupId when exactly one group is configured. '
      + 'Use sparingly: pokes are visible to the whole group and may hit QQ rate limits.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        userId: { type: 'integer', description: 'QQ id of the member to poke.' },
        groupId: { type: 'integer', description: 'Target QQ group id. Optional when exactly one group is whitelisted.' },
      },
      required: ['userId'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          groupId: { type: 'integer', description: 'Group actually targeted.' },
          userId: { type: 'integer', description: 'Member actually poked.' },
        },
        required: ['groupId', 'userId'],
      },
      render(args, value) {
        return [{ type: 'text', text: '已在群 ' + String(value.groupId) + ' 戳了 ' + String(value.userId) + ' 一下。' }]
      },
    },
    async execute(rawArgs, exec) {
      if (typeof exec?.signal?.throwIfAborted === 'function') exec.signal.throwIfAborted()
      const args = rawArgs !== null && typeof rawArgs === 'object' ? rawArgs : {}
      const userId = args.userId
      if (!Number.isInteger(userId) || userId <= 0) fail('userId 必须是正整数')

      const groups = (typeof getGroups === 'function' ? getGroups() : []).filter((id) => Number.isInteger(id) && id > 0)
      let groupId = args.groupId
      if (groupId === undefined || groupId === null) {
        if (groups.length === 1) groupId = groups[0]
        else if (groups.length === 0) fail('还没有配置任何群白名单（先在设置页「QQ 机器人」里填群号）')
        else fail('配置了多个群（' + groups.join(', ') + '），请显式传 groupId')
      }
      if (!Number.isInteger(groupId) || groupId <= 0) fail('groupId 必须是正整数')
      if (!groups.includes(groupId)) fail('群 ' + String(groupId) + ' 不在白名单（允许：' + (groups.join(', ') || '无') + '）')

      return await poke(groupId, userId)
    },
  }
}
