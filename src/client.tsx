/**
 * dsh-qq-relay — client 半身组合根。
 *
 * 注册落点：**插件面板**（左栏「插件」图标）里 dsh-qq-relay 组合包自己的页面——
 * 通过 `plugins.bundle.config`（key = 包名）把配置表单画在启停开关下面，和
 * 「这个插件在哪启动」放在一起，不再单独占一个设置分区。
 *
 * 业务在 `src/viewmodel/`（呈现态与动作）与 `src/model/`（HTTP、表单纯逻辑），
 * 渲染在 `src/view/`；本文件只做注册与装配。
 *
 * 纪律（详见 AGENTS.md）：
 *  - 与宿主接触面全部走**运行时服务查找**（`ctx.get('slots')`…），**不 import 任何
 *    `@deepseek-ai/*` 的值**；`package.json` 里 `dsh.client.inject` 只决定模块图顺序；
 *  - 取不到 slots / 服务时**静默返回**，永不 crash boot；
 *  - 新增代码按 MVVM 三层落位（`src/model/` → `src/viewmodel/` → `src/view/`）。
 */

import { RelaySettingsPage } from './view/SettingsPage.js'

/** 插件名 = 目录名 = 包名 = client 注册 id，四者必须一致。 */
export const name = 'dsh-qq-relay'

/** fiber 服务依赖：槽注册表就绪后再 apply（与 package.json 的 dsh.client.inject 不是同一件事）。 */
export const inject = ['slots']

/** 我们用到的最小槽注册面。 */
interface SlotsLike {
  inject(name: string, register: () => unknown): unknown
  register(options: Record<string, unknown>, component: unknown): () => void
}

/** 我们用到的最小客户端上下文面。 */
interface ClientContextLike {
  get?: (name: string) => unknown
}

/** 组合包的 npm 包名：也是 `plugins.bundle.config` 的 key。 */
const BUNDLE_NAME = 'dsh-qq-relay'

/**
 * 浏览器半身入口：把配置页注册到插件面板的组合包页面。缺 slots 时静默返回。
 * @param ctx - 客户端 Cordis 上下文。
 */
export function apply(ctx: unknown): void {
  const context = ctx as ClientContextLike
  const slots = context?.get?.('slots') as SlotsLike | undefined
  if (slots === undefined || typeof slots.inject !== 'function' || typeof slots.register !== 'function') return
  try {
    slots.inject('plugins.bundle.config', () => slots.register(
      { name: 'plugins.bundle.config', key: BUNDLE_NAME },
      RelaySettingsPage,
    ))
  } catch {
    // 座位契约变了就静默降级：插件页少一块配置，不能拖垮宿主 boot。
  }
}
