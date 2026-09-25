/**
 * 极简 DOM 助手（Sapdon UI Designer）
 *
 * 只包一层 `document.createElement`，不引入任何框架 —— 工具要求**零依赖**才能在受限环境里直接跑
 * （本仓库没有 vite/jsdom，浏览器里就是原生 ESM）。所有 UI 模块都通过这里建节点。
 */

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue
    if (k === 'class') el.className = String(v)
    else if (k === 'text') el.textContent = String(v)
    else if (k === 'html') el.innerHTML = String(v)
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v)
    else if (k === 'dataset' && typeof v === 'object') Object.assign(el.dataset, v)
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v)
    else if (k === 'value') el.value = v
    else if (k === 'checked') el.checked = !!v
    // <details open>：既写属性也写属性值（浏览器与测试桩行为一致）
    else if (k === 'open') {
      el.open = !!v
      if (v) el.setAttribute('open', '')
    }
    else el.setAttribute(k, v === true ? '' : String(v))
  }
  append(el, children)
  return el
}

export function append(el, children) {
  for (const c of (children || []).flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c)
  }
  return el
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild)
  return el
}

/** 只重建内容，保留容器本身（免得到处 replaceChild） */
export function render(el, children) {
  clear(el)
  append(el, children)
  return el
}

/** 数值输入：接受 数字 或 "50%"、'fill'、'default' */
export function parseSizeValue(text) {
  const s = String(text).trim()
  if (s === '') return null
  if (s === 'default' || s === 'fill') return s
  if (/^-?\d+(\.\d+)?%$/.test(s)) return s
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export function pairText(pair) {
  if (!Array.isArray(pair)) return ['', '']
  return [String(pair[0] ?? ''), String(pair[1] ?? '')]
}

/** 逗号/空格分隔的数字对 → [n, n]（数组类属性用） */
export function parseNumberPair(text) {
  const parts = String(text)
    .split(/[,\s]+/)
    .filter(Boolean)
    .map((x) => Number(x))
  if (!parts.length || parts.some((n) => !Number.isFinite(n))) return null
  return [parts[0], parts[1] ?? parts[0]]
}
