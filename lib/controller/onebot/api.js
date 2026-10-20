/**
 * OneBot action 封装（P1）：只包一层，不做业务判定。
 *
 * 返回值是 OneBot 原始响应：{ status, retcode, data, message, wording, echo }。
 * 发送结果由 relay 决定是否重试；这里只提供判断辅助。
 */

/** 判断响应是否成功（retcode 0 为同步成功，1 为异步已受理）。 */
export function isOk(response) {
  if (response === null || typeof response !== 'object') return false
  if (response.status !== 'ok') return false
  return response.retcode === 0 || response.retcode === 1
}

/** 失败响应的人类可读描述。 */
export function failureText(response) {
  if (response === null || typeof response !== 'object') return '无响应'
  if (typeof response.message === 'string' && response.message !== '') return response.message
  if (typeof response.wording === 'string' && response.wording !== '') return response.wording
  return 'retcode=' + String(response.retcode ?? '?')
}

export function createOneBotApi(client) {
  const call = (action, params) => client.call(action, params)

  return {
    call,
    getLoginInfo: () => call('get_login_info', {}),
    getStatus: () => call('get_status', {}),
    getGroupInfo: (groupId) => call('get_group_info', { group_id: String(groupId) }),
    getGroupMemberInfo: (groupId, userId, noCache = false) => call('get_group_member_info', { group_id: String(groupId), user_id: String(userId), no_cache: noCache }),
    getGroupMsgHistory: (groupId, count = 20) => call('get_group_msg_history', { group_id: String(groupId), count }),
    /** 群戳一戳（NapCat 扩展 action）：user_id 是被戳者。 */
    groupPoke: (groupId, userId) => call('group_poke', { group_id: Number(groupId), user_id: Number(userId) }),
    /** 群文件下载链接（NapCat 扩展 action）：file_id 用 group_upload 事件里的 file.id。 */
    getGroupFileUrl: (groupId, fileId, busid = 0) => call('get_group_file_url', {
      group_id: Number(groupId),
      file_id: String(fileId),
      busid: Number(busid) || 0,
    }),
    sendGroupMsg: (groupId, message) => call('send_group_msg', { group_id: String(groupId), message }),
    sendGroupText: (groupId, text) => call('send_group_msg', {
      group_id: String(groupId),
      message: [{ type: 'text', data: { text: String(text) } }],
    }),
    /** 引用回复：在文本前加 reply 段，群里会显示被引用的原消息。 */
    sendGroupReply: (groupId, messageId, text) => call('send_group_msg', {
      group_id: String(groupId),
      message: [
        { type: 'reply', data: { id: String(messageId) } },
        { type: 'text', data: { text: String(text) } },
      ],
    }),
    /**
     * 发群图片：file 可以是 `base64://...` 或 http(s) URL（NapCat 端解析）。
     * NapCat 跑在 Docker 里看不到宿主路径，所以出向一律走 base64 / URL。
     */
    sendGroupImage: (groupId, file, summary = '') => call('send_group_msg', {
      group_id: String(groupId),
      message: [{
        type: 'image',
        data: summary === ''
          ? { file: String(file) }
          : { file: String(file), summary: String(summary) },
      }],
    }),
    /** 发群视频：file 为 `base64://...` 或 URL（NapCat 解码后转成视频消息，内联播放）。 */
    sendGroupVideo: (groupId, file) => call('send_group_msg', {
      group_id: String(groupId),
      message: [{
        type: 'video',
        data: { file: String(file) },
      }],
    }),
    /** 上传群文件：file 为 `base64://...` 或 URL（NapCat 解码后上传到群文件）。 */
    uploadGroupFile: (groupId, file, name) => call('upload_group_file', {
      group_id: String(groupId),
      file: String(file),
      name: String(name),
    }),
  }
}
