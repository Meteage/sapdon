/**
 * 门控表达式求值（Sapdon UI Designer）
 *
 * sapdon 的 UI **逻辑零 JS**：显隐全在 `view` 绑定表达式里（`ui-architecture.md` §3.4）。
 * 编辑器不可能跑 JSON UI 的 Molang，所以这里只做一件事：**把框架自己会生成的那几种判定式认出来**，
 * 让画布能"按门控模拟显隐"。认不出来的一律返回 `null`（= 未知 ⇒ 当成可见），**绝不猜**。
 *
 * 支持（前三种来自 SapdonGuideBook / 页壳，第四种来自 HUD）：
 *   (not( (#form_text - $gtag) = #form_text ))       → 页面门控：body **前缀包含** $gtag 才可见
 *   (not( (#title_text - 'sapdon_ui:book') = #title_text )) → 页壳前缀判定（字面量形式）
 *   ($X = #form_text) / ($X = #form_button_text)     → `.body()` / `.button()` emit 的等值门控
 *   ($X = #hud_title_text_string)                    → HUD 状态门控（编辑器不模拟，返回未知）
 *
 * 纯函数、零 import ⇒ 单测直接跑。
 */

const EQ_CHANNEL = /^\s*\(\s*\$([A-Za-z0-9_]+)\s*=\s*(#(?:form_text|form_button_text|title_text|hud_title_text_string))\s*\)\s*$/
/** 前缀包含：`not( (#chan - $var) = #chan )` —— 变量形式（手册 $gtag 用的就是这个） */
const PREFIX_VAR = /not\(\s*\(\s*(#(?:form_text|form_button_text|title_text))\s*-\s*\$([A-Za-z0-9_]+)\s*\)\s*=\s*\1\s*\)/
/** 前缀包含：字面量形式（页壳 createPageRoot 生成的就是这个） */
const PREFIX_LITERAL = /not\(\s*\(\s*#title_text\s*-\s*'([^']*)'\s*\)\s*=\s*#title_text\s*\)/

/**
 * 解析一条 `view` 绑定表达式。
 * @returns {{kind:string, varName?:string, channel?:string, literal?:string}|null}
 */
export function parseGate(expression) {
  const expr = String(expression || '')
  const eq = expr.match(EQ_CHANNEL)
  if (eq) return { kind: 'eq', varName: eq[1], channel: eq[2] }
  const prefixVar = expr.match(PREFIX_VAR)
  if (prefixVar) return { kind: 'prefix', channel: prefixVar[1], varName: prefixVar[2] }
  const prefix = expr.match(PREFIX_LITERAL)
  if (prefix) return { kind: 'title-prefix', literal: prefix[1] }
  return null
}

/**
 * 求一个节点在给定"模拟运行期状态"下是否可见。
 * @param {object} node 模型节点
 * @param {{title?:string, body?:string, buttons?:string[]|string, hud?:string}} sim
 * @returns {true|false|null} null = 认不出来/信息不足（按可见处理，画布会标"未判定"）
 */
export function evaluateVisibility(node, sim = {}) {
  const binds = (node.bindings || []).filter((b) => String(b.target || '') === '#visible' && b.source)
  if (!binds.length) return null
  let unknown = false
  for (const b of binds) {
    const gate = parseGate(b.source)
    if (!gate) {
      unknown = true
      continue
    }
    if (gate.kind === 'eq') {
      const value = (node.vars || {})[gate.varName]
      if (value === undefined) {
        unknown = true
        continue
      }
      if (gate.channel === '#form_text') {
        if (typeof sim.body !== 'string') unknown = true
        else if (String(value) !== sim.body) return false
      } else if (gate.channel === '#form_button_text') {
        const list = Array.isArray(sim.buttons)
          ? sim.buttons
          : typeof sim.buttons === 'string' && sim.buttons.trim() !== ''
            ? sim.buttons.split(/[,\s]+/).filter(Boolean)
            : null
        if (!list) unknown = true
        else if (!list.includes(String(value))) return false
      } else if (gate.channel === '#title_text') {
        if (typeof sim.title !== 'string') unknown = true
        else if (String(value) !== sim.title) return false
      } else {
        unknown = true // #hud_title_text_string 等：编辑器不模拟
      }
      continue
    }
    if (gate.kind === 'prefix') {
      const value = (node.vars || {})[gate.varName]
      const channel = gate.channel === '#form_text' ? sim.body : gate.channel === '#title_text' ? sim.title : null
      if (value === undefined || typeof channel !== 'string') {
        unknown = true
        continue
      }
      // 注意：门控是 `not((chan - tag) = chan)`，即"减得掉"= 包含该前缀 ⇒ 可见
      if (!channel.startsWith(String(value))) return false
      continue
    }
    if (gate.kind === 'title-prefix') {
      if (typeof sim.title !== 'string') unknown = true
      else if (!sim.title.startsWith(gate.literal)) return false
    }
  }
  return unknown ? null : true
}

/** 画布用：把 null 当可见，但给出是否"未判定" */
export function visibilityOf(node, sim, enabled) {
  if (!enabled) return { visible: true, unknown: false }
  const v = evaluateVisibility(node, sim)
  return { visible: v !== false, unknown: v === null && (node.bindings || []).some((b) => b.target === '#visible') }
}

/** 页面 → 模拟用的 `#form_text` 取值（页模型上的 `tag` 就是运行期 `.body()` 该 emit 的串） */
export function pageTag(page) {
  return String((page && (page.tag || page.name)) || '')
}
