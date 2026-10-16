/**
 * dsh-qq-relay — host 半身组合根（**空骨架**）
 *
 * 规划形态：连接 QQ 机器人协议端，把 QQ 消息投成 DSH 会话输入、把 agent 回复回发 QQ。
 * 协议端选型（OneBot v11 / v12 实现还是官方开放平台）、会话映射、准入与审批
 * **均未定案**——动手前先把设计落进本插件 `docs/`（见 README「用途」）。
 *
 * 本文件是**手写 host 源码**（纯 JS，不经构建），只做三件事：导出插件契约（`name`）、
 * 按服务就绪时机注册 / 摘除（当前不注册任何东西）、装配配置。协议适配、会话映射与消息
 * 编解码将来放 `lib/controller/` 与 `lib/model/`。
 *
 * 纪律：`apply(ctx)` 取不到服务时**静默返回**，永不 crash boot；运行时**零外部依赖**
 * （只用 node: 内置模块）；不自行 kill / 重启 DSH。
 */

/** 插件名 = 目录名 = 包名。 */
export const name = 'dsh-qq-relay'

/**
 * host 半身入口。
 *
 * v0.1.0 空骨架下唯一的可见副作用：加载时打一行日志，用于在宿主日志里确认
 * link + bundle 组合真的生效（日志器不可用时静默跳过，不影响 boot）。
 *
 * @param ctx - Cordis 根上下文。
 * @param config - profile 补丁中 id 为 `dsh-qq-relay` 的配置条目（当前未定义任何字段）。
 */
export function apply(ctx, config) {
  try {
    ctx?.logger?.('dsh-qq-relay')?.info?.('已加载（v0.1.0 空骨架：尚未连接任何 QQ 协议端）')
  } catch {
    /* 日志不可用时也不该影响 boot */
  }
}
