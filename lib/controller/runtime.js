/**
 * relay 运行实例（P1.5）：把「一份已校验的配置」装成 client + api + relay 三件套，
 * 并支持**整份热替换**（配置页保存后立即重建连接）。
 *
 * 与单实例锁解耦：锁由组合根在整个进程生命周期内持有，这里只负责连接与转发的
 * 重建——因此同一进程重复 applyConfig 不会撞锁（`acquireLock` 把同 pid 当占用）。
 *
 * 配置无效时组合根不会调用 applyConfig（由设置页/日志提示修改），实例保持未启动。
 */

import { createOneBotClient } from './onebot/client.js'
import { createOneBotApi } from './onebot/api.js'
import { createRelay } from './relay.js'

/**
 * @param options.ctx - 已注入 sessionController / workspaceRegistry 的子上下文
 * @param options.logger - `{ info, warn, error }`
 * @param options.mapping - 会话映射仓库
 * @param options.state - 每群状态仓库
 * @param options.chatLog - 聊天日志
 * @param options.classifier - 闸门分类器（P2.1 未接模型，缺省 fail closed）
 */
export function createRelayRuntime({ ctx, logger, mapping, state, chatLog, classifier = null }) {
  const log = {
    info: (message) => { try { logger?.info?.(message) } catch {} },
    warn: (message) => { try { logger?.warn?.(message) } catch {} },
    error: (message) => { try { logger?.error?.(message) } catch {} },
  }

  /** 当前配置（`null` = 未配置/已停止）。 */
  let config = null
  /** 当前活动连接：`{ client, relay, config }`。 */
  let active = null
  /** OneBot 登录信息：`{ userId, nickname }`。 */
  let login = null

  function cleanupActive() {
    if (active === null) return
    try { active.relay.stop() } catch (error) { log.warn('[relay] relay 停止失败：' + String(error?.message ?? error)) }
    try { active.client.stop() } catch (error) { log.warn('[relay] client 停止失败：' + String(error?.message ?? error)) }
    active = null
  }

  /**
   * 用一份配置启动连接。调用前配置必须已通过 `normalizeConfig`。
   *
   * @param nextConfig - 规范化后的配置
   */
  function applyConfig(nextConfig) {
    cleanupActive()
    config = nextConfig
    login = null
    if (config === null || typeof config !== 'object') return

    const client = createOneBotClient({
      wsUrl: config.wsUrl,
      accessToken: config.accessToken,
      selfId: config.selfId,
      reconnect: config.reconnect,
      logger: logger ?? undefined,
    })
    client.on('login', (info) => {
      const userId = Number(info?.user_id ?? info?.userId ?? 0)
      login = {
        userId: Number.isInteger(userId) && userId > 0 ? userId : 0,
        nickname: typeof info?.nickname === 'string' ? info.nickname : '',
      }
    })
    const api = createOneBotApi(client)
    const relay = createRelay({
      ctx,
      config,
      logger: logger ?? undefined,
      client,
      api,
      mapping,
      state,
      chatLog,
      classifier,
    })

    active = { client, relay, config }
    relay.start()
    client.start()
    log.info('[relay] 已启动：' + config.wsUrl + '，selfId=' + String(config.selfId)
      + '，群白名单=' + config.groups.join(','))
  }

  /** 停止当前连接（保留配置，供 reconnect 复用）。 */
  function stop() {
    cleanupActive()
    login = null
  }

  /**
   * 用当前配置重建连接（配置页「重新连接」按钮）。
   *
   * @returns 是否真的重建了（未配置时为 `false`）
   */
  function reconnect() {
    if (config === null) return false
    const current = config
    applyConfig(current)
    return true
  }

  /** 运行状态快照（HTTP 面直接序列化它）。 */
  function status() {
    return {
      started: active !== null,
      connected: active !== null && active.client.isOpen() === true,
      login,
    }
  }

  return { applyConfig, stop, reconnect, status, getConfig: () => config }
}
