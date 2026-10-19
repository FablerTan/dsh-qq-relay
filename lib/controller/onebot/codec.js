/**
 * OneBot 11 事件编解码（P1）。
 *
 * 只做纯函数：raw 事件 → 内部事件模型；@ / 引用 / 命令判定；聊天日志记录。
 * 不做网络、不落盘、不依赖 DSH。
 *
 * 实测契约（docs/onebot-channel.md §5）：
 * - message 段的 at.qq 是字符串；
 * - reply.data.id 是被引用消息的 message_id（字符串）；
 * - message_id 非全局唯一，去重键用 (group_id, message_id)；
 * - reportSelfMessage=false 时自己发的消息不会出现。
 */

/** 把 message 字段规范化为消息段数组。 */
export function normalizeSegments(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const segment of raw) {
    if (segment === null || typeof segment !== 'object') continue
    if (typeof segment.type !== 'string') continue
    out.push({ type: segment.type, data: segment.data !== null && typeof segment.data === 'object' ? segment.data : {} })
  }
  return out
}

/** 拼接文本段（忽略 at / reply / face 等非文本段）。 */
export function extractText(segments) {
  return segments
    .filter((segment) => segment.type === 'text' && typeof segment.data.text === 'string')
    .map((segment) => segment.data.text)
    .join('')
}

/** 消息段里所有 @ 目标（qq 字符串，去重保序；含 @全体成员 的 `all`）。 */
export function extractAtTargets(segments) {
  const out = []
  for (const segment of segments) {
    if (segment.type !== 'at') continue
    const qq = String(segment.data.qq ?? '')
    if (qq === '' || out.includes(qq)) continue
    out.push(qq)
  }
  return out
}

/** 是否 @ 了 selfId（message 段优先，raw_message 的 CQ 码兜底）。 */
export function detectMention(segments, rawMessage, selfId) {
  const target = String(selfId)
  const hit = segments.some((segment) => segment.type === 'at' && String(segment.data.qq ?? '') === target)
  if (hit) return true
  if (typeof rawMessage !== 'string' || target === '0') return false
  return new RegExp('\\[CQ:at,qq=' + target + '\\]').test(rawMessage)
}

/** 返回被引用消息的 message_id（没有则 null）。 */
export function detectReplyId(segments) {
  for (const segment of segments) {
    if (segment.type !== 'reply') continue
    const id = segment.data.id
    if (typeof id === 'string' && id !== '') return id
    if (typeof id === 'number') return String(id)
  }
  return null
}

/** 文本是否以任一命令前缀开头（已去首尾空白）。 */
export function detectCommand(text, prefixes = []) {
  const value = typeof text === 'string' ? text.trimStart() : ''
  return prefixes.some((prefix) => typeof prefix === 'string' && prefix !== '' && value.startsWith(prefix))
}

function toMs(time) {
  if (!Number.isFinite(time)) return Date.now()
  return time > 1e12 ? time : time * 1000
}

/**
 * 规范化一条 OneBot 事件；无法识别时返回 null。
 *
 * @returns {null | { kind: string, ... }}
 */
export function toInternalEvent(raw) {
  if (raw === null || typeof raw !== 'object') return null
  const postType = raw.post_type
  const selfId = Number(raw.self_id) || 0

  if (postType === 'message') {
    const messageType = raw.message_type
    const segments = normalizeSegments(raw.message)
    const text = extractText(segments)
    const base = {
      kind: messageType === 'group' ? 'group-message' : 'private-message',
      postType,
      selfId,
      userId: Number(raw.user_id) || 0,
      messageId: String(raw.message_id ?? ''),
      timeMs: toMs(raw.time),
      segments,
      text,
      rawMessage: typeof raw.raw_message === 'string' ? raw.raw_message : '',
      sender: {
        userId: Number(raw.sender?.user_id ?? raw.user_id) || 0,
        nickname: typeof raw.sender?.nickname === 'string' ? raw.sender.nickname : '',
        card: typeof raw.sender?.card === 'string' ? raw.sender.card : '',
        role: typeof raw.sender?.role === 'string' ? raw.sender.role : '',
      },
    }
    if (messageType !== 'group') return base
    const groupId = Number(raw.group_id) || 0
    const atTargets = extractAtTargets(segments)
    const selfKey = String(selfId)
    return {
      ...base,
      groupId,
      groupName: typeof raw.group_name === 'string' ? raw.group_name : '',
      mentionsSelf: detectMention(segments, base.rawMessage, selfId),
      // @ 了别人（含 @全体成员）：这条消息不是对 bot 说的。@ 自己时不算。
      mentionsOthers: atTargets.some((target) => target !== selfKey),
      atTargets,
      replyToId: detectReplyId(segments),
    }
  }

  if (postType === 'message_sent') {
    return {
      kind: 'self-message',
      postType,
      selfId,
      messageId: String(raw.message_id ?? ''),
      groupId: Number(raw.group_id) || 0,
      userId: Number(raw.user_id) || 0,
      timeMs: toMs(raw.time),
    }
  }

  if (postType === 'meta_event') {
    return {
      kind: 'meta',
      postType,
      selfId,
      metaType: typeof raw.meta_event_type === 'string' ? raw.meta_event_type : '',
      status: raw.status !== null && typeof raw.status === 'object' ? raw.status : null,
      timeMs: toMs(raw.time),
    }
  }

  if (postType === 'notice') {
    const noticeType = typeof raw.notice_type === 'string' ? raw.notice_type : ''
    const subType = typeof raw.sub_type === 'string' ? raw.sub_type : ''
    const groupId = Number(raw.group_id) || 0
    const userId = Number(raw.user_id) || 0
    // 戳一戳（v0.15.0）：notice_type=notify + sub_type=poke，target_id 是被戳者。
    if (noticeType === 'notify' && subType === 'poke') {
      const targetId = Number(raw.target_id) || 0
      return {
        kind: 'poke',
        postType,
        selfId,
        noticeType,
        subType,
        groupId,
        userId,
        targetId,
        targetsSelf: targetId > 0 && targetId === selfId,
        timeMs: toMs(raw.time),
      }
    }
    // 群文件上传（v0.16.0）：notice_type=group_upload，file = { id, name, size, busid }。
    if (noticeType === 'group_upload') {
      const fileRaw = raw.file !== null && typeof raw.file === 'object' ? raw.file : {}
      return {
        kind: 'group-file',
        postType,
        selfId,
        noticeType,
        groupId,
        userId,
        file: {
          id: String(fileRaw.id ?? fileRaw.file_id ?? ''),
          name: typeof fileRaw.name === 'string' ? fileRaw.name : '',
          size: Number(fileRaw.size) || 0,
          busid: Number(fileRaw.busid ?? fileRaw.bus_id) || 0,
        },
        timeMs: toMs(raw.time),
      }
    }
    return {
      kind: 'notice',
      postType,
      selfId,
      noticeType,
      subType,
      groupId,
      userId,
      operatorId: Number(raw.operator_id) || 0,
      targetId: Number(raw.target_id) || 0,
      timeMs: toMs(raw.time),
    }
  }

  if (postType === 'request') {
    return {
      kind: 'request',
      postType,
      selfId,
      requestType: typeof raw.request_type === 'string' ? raw.request_type : '',
      subType: typeof raw.sub_type === 'string' ? raw.sub_type : '',
      groupId: Number(raw.group_id) || 0,
      userId: Number(raw.user_id) || 0,
      comment: typeof raw.comment === 'string' ? raw.comment : '',
      flag: String(raw.flag ?? ''),
      timeMs: toMs(raw.time),
    }
  }

  return null
}

/**
 * 群消息是否直通（@ bot / 引用**bot 自己的**消息 / 命令前缀）。
 *
 * 引用别人消息不算直通：手机 QQ 里 @ 某人常会带一个 reply 段，若按「有引用就算
 * 回复 bot」处理，@ 别人也会触发会话（v0.18.0 修正）。由 relay 用
 * {@link createRelay} 里维护的 bot 消息 id 集合判定 `replyToSelf`。
 *
 * @param options.replyToSelf - 被引用消息是否是 bot 自己发的（由调用方判定）
 * @returns {{ bypass: boolean, reason: 'mention' | 'reply' | 'command' | null }}
 */
export function bypassReason(event, { commandPrefixes = [], replyToSelf = false } = {}) {
  if (event === null || typeof event !== 'object' || event.kind !== 'group-message') {
    return { bypass: false, reason: null }
  }
  if (event.mentionsSelf) return { bypass: true, reason: 'mention' }
  if (replyToSelf === true && typeof event.replyToId === 'string' && event.replyToId !== '') {
    return { bypass: true, reason: 'reply' }
  }
  if (detectCommand(event.text, commandPrefixes)) return { bypass: true, reason: 'command' }
  return { bypass: false, reason: null }
}

/** 去重键：群号 + message_id（message_id 非全局唯一）。 */
export function dedupeKey(event) {
  if (event === null || typeof event !== 'object') return ''
  return String(event.groupId ?? '') + ':' + String(event.messageId ?? '')
}

/** 写入聊天日志的记录（time 为毫秒；@ / 引用等元信息一并保留）。 */
export function toChatLogRecord(event) {
  return {
    time: event.timeMs,
    groupId: String(event.groupId ?? ''),
    messageId: event.messageId,
    userId: String(event.userId),
    nickname: event.sender?.nickname ?? '',
    card: event.sender?.card ?? '',
    role: event.sender?.role ?? '',
    text: typeof event.text === 'string' ? event.text.trim() : '',
    mentionsSelf: event.mentionsSelf === true,
    replyToId: typeof event.replyToId === 'string' ? event.replyToId : null,
    raw: event.rawMessage ?? '',
  }
}
