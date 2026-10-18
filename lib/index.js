/**
 * dsh-qq-relay — host 半身组合根（P1：@ 直通）。
 *
 * 职责只有：读配置、单实例锁、装配 model + controller、把 relay 挂到宿主生命周期。
 * 协议细节在 lib/controller/onebot/，业务在 lib/controller/relay.js，
 * 纯逻辑与持久化在 lib/model/。
 *
 * 纪律：缺服务 / 配置非法 / 端口冲突时**静默降级**（打日志返回），永不 crash boot；
 * 运行时零外部依赖（只用 node: 内置模块与全局 WebSocket）。
 */

import { join } from 'node:path'
import { homedir } from 'node:os'

import { normalizeConfig } from './model/config.js'
import { createMappingStore } from './model/mapping.js'
import { acquireLock, createStateStore } from './model/state.js'
import { createChatLog } from './model/chat-log.js'
import { createOneBotClient } from './controller/onebot/client.js'
import { createOneBotApi } from './controller/onebot/api.js'
import { createRelay } from './controller/relay.js'

export const name = 'dsh-qq-relay'

export function apply(ctx, config) {
  let logger
  try { logger = ctx?.logger?.('dsh-qq-relay') } catch {}
  const log = (level, message) => {
    try { logger?.[level]?.(message) } catch {}
  }

  const normalized = normalizeConfig(config)
  if (!normalized.ok) {
    for (const problem of normalized.problems) log('warn', '[relay] 配置无效：' + problem)
    log('warn', '[relay] 配置不完整，插件未启动（见 profile 的 cordis.patch.yml）')
    return
  }
  const pluginConfig = normalized.config

  if (typeof ctx?.inject !== 'function' || typeof ctx?.effect !== 'function') {
    log('warn', '[relay] 宿主缺少 inject/effect，插件未启动')
    return
  }

  ctx.effect(() => {
    const child = ctx.inject(['sessionController', 'workspaceRegistry'], (svcCtx) => {
      const storageDir = join(homedir(), '.dsh', 'storages', 'dsh-qq-relay')
      const lock = acquireLock(join(storageDir, 'relay.lock'))
      if (!lock.ok) {
        const holder = lock.holder === null ? '未知进程' : 'pid ' + String(lock.holder.pid)
        log('warn', '[relay] 已有实例在运行（' + holder + '），本进程不启动')
        return () => {}
      }

      const mapping = createMappingStore(join(storageDir, 'mapping.json'))
      const state = createStateStore(join(storageDir, 'state.json'))
      const chatLog = createChatLog({ dir: join(storageDir, 'chat'), retentionDays: 7 })
      const client = createOneBotClient({
        wsUrl: pluginConfig.wsUrl,
        accessToken: pluginConfig.accessToken,
        selfId: pluginConfig.selfId,
        reconnect: pluginConfig.reconnect,
        logger: { info: (m) => log('info', m), warn: (m) => log('warn', m), error: (m) => log('error', m) },
      })
      const api = createOneBotApi(client)
      const relay = createRelay({
        ctx: svcCtx,
        config: pluginConfig,
        logger: { info: (m) => log('info', m), warn: (m) => log('warn', m), error: (m) => log('error', m) },
        client,
        api,
        mapping,
        state,
        chatLog,
      })

      relay.start()
      client.start()
      log('info', '[relay] 已启动：' + pluginConfig.wsUrl + '，selfId=' + String(pluginConfig.selfId)
        + '，群白名单=' + pluginConfig.groups.join(','))

      return () => {
        try { relay.stop() } catch {}
        try { client.stop() } catch {}
        try { lock.release() } catch {}
        log('info', '[relay] 已停止')
      }
    })

    return () => {
      try {
        if (typeof child === 'function') child()
        else if (typeof child?.dispose === 'function') child.dispose()
      } catch {}
    }
  }, 'dsh-qq-relay: relay')
}
