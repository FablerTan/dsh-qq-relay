/**
 * dsh-qq-relay — client 半身组合根（**空骨架**）
 *
 * 规划形态：QQ 机器人连接的**状态 / 配置面板**（连的是哪个协议端、QQ 会话 ↔ DSH 会话的映射、
 * 白名单与开关）。**v0.1.0 什么都不注册**——本文件当前只声明插件契约（name / apply），
 * 把「浏览器半身能被宿主加载」这条链路先跑通。
 *
 * 纪律（详见 AGENTS.md）：
 *  - 与宿主接触面全部走**运行时服务查找**（`ctx.get('slots')`…），**不 import 任何
 *    `@deepseek-ai/*` 的值**；`package.json` 里 `dsh.client.inject` 只决定模块图顺序；
 *  - 取不到 slots / 服务时**静默返回**，永不 crash boot；
 *  - 新增代码按 MVVM 三层落位（`src/model/` → `src/viewmodel/` → `src/view/`），
 *    本文件只做注册与装配。
 */

/** 插件名 = 目录名 = 包名 = client 注册 id，四者必须一致。 */
export const name = 'dsh-qq-relay'

/** 我们用到的最小客户端上下文面。 */
interface ClientContextLike {
  get?: (name: string) => unknown
}

/**
 * 浏览器半身入口。空骨架：只做服务就绪检查，不注册任何座位。
 * @param ctx - 客户端 Cordis 上下文。
 */
export function apply(ctx: unknown): void {
  const context = ctx as ClientContextLike
  const slots = context?.get?.('slots')
  if (slots === undefined) return
  // TODO(功能实现): 状态 / 配置面板注册进 settings.section 等座位。
}
