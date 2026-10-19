/**
 * dsh-qq-relay — client 半身组合根（P1.5：基础配置页）。
 *
 * 本文件只做注册与装配：取 `slots` 服务，把设置页「QQ 机器人」注册进
 * `settings.section` 座位。业务在 `src/model/`（HTTP 信封、表单纯逻辑），
 * 渲染在 `src/view/`。
 *
 * 纪律（详见 AGENTS.md）：
 *  - 与宿主接触面全部走**运行时服务查找**（`ctx.get('slots')`…），**不 import 任何
 *    `@deepseek-ai/*` 的值**；`package.json` 里 `dsh.client.inject` 只决定模块图顺序；
 *  - 取不到 slots / 服务时**静默返回**，永不 crash boot；
 *  - 新增代码按 MVVM 三层落位（`src/model/` → `src/viewmodel/` → `src/view/`），
 *    本文件只做注册与装配。
 */

import { RelaySettingsSection } from './view/SettingsSection.js'

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

/** 设置页 section 的稳定 id（也是列表槽里的唯一键）。 */
const SECTION_ID = 'dsh-qq-relay'

/**
 * 浏览器半身入口：注册设置页「QQ 机器人」。缺 slots 时静默返回。
 * @param ctx - 客户端 Cordis 上下文。
 */
export function apply(ctx: unknown): void {
  const context = ctx as ClientContextLike
  const slots = context?.get?.('slots') as SlotsLike | undefined
  if (slots === undefined || typeof slots.inject !== 'function' || typeof slots.register !== 'function') return
  try {
    slots.inject('settings.section', () => slots.register(
      {
        name: 'settings.section',
        id: SECTION_ID,
        order: 90,
        label: () => 'QQ 机器人',
      },
      RelaySettingsSection,
    ))
  } catch {
    // 座位契约变了就静默降级：设置页少一块，不能拖垮宿主 boot。
  }
}
