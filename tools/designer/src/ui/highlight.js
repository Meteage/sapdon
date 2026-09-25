/**
 * 语法高亮（Sapdon UI Designer）
 *
 * 纯函数、零依赖 —— 工具不能引 highlight.js / prism（本仓库没有依赖安装条件），
 * 所以自己写两个小分词器，只认这两种语言、只做够用的事。
 *
 * ★ 硬约束：**高亮不许改变原文**。`stripTags(highlightX(text)) === text` 是单测里的不变量，
 *   任何吃字符/加字符的实现都会当场红（见 tests/designer-highlight.test.mjs）。
 *
 * 输出是 HTML 片段：token 用 `<span class="tok-*">` 包起来，CSS 在 styles.css 里。
 */

export function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const span = (cls, text) => (text ? `<span class="${cls}">${escapeHtml(text)}</span>` : '')

const TS_KEYWORDS = new Set([
  'import', 'from', 'export', 'default', 'const', 'let', 'var', 'function', 'return', 'new', 'class', 'extends',
  'if', 'else', 'for', 'of', 'in', 'while', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally',
  'throw', 'typeof', 'instanceof', 'void', 'delete', 'this', 'super', 'as', 'async', 'await', 'interface', 'type',
  'enum', 'implements', 'readonly', 'public', 'private', 'protected', 'static', 'declare', 'satisfies',
])
const TS_LITERALS = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity'])

/**
 * TypeScript / JavaScript 高亮（够用版：注释 / 字符串 / 数字 / 关键字 / 类名 / 方法名 / 属性 / 标点）
 * @param {string} text
 * @returns {string} HTML
 */
export function highlightTS(text) {
  const src = String(text)
  let out = ''
  let i = 0
  let prev = '' // 上一个"有效"字符（用于判断 `.prop`）
  let prevWord = '' // 上一个标识符（用于判断 `new X` 里的类型）

  while (i < src.length) {
    const c = src[i]

    // 行注释
    if (c === '/' && src[i + 1] === '/') {
      let j = src.indexOf('\n', i)
      if (j < 0) j = src.length
      out += span('tok-com', src.slice(i, j))
      i = j
      continue
    }
    // 块注释
    if (c === '/' && src[i + 1] === '*') {
      let j = src.indexOf('*/', i + 2)
      j = j < 0 ? src.length : j + 2
      out += span('tok-com', src.slice(i, j))
      i = j
      prev = ''
      continue
    }
    // 字符串 / 模板串（含转义）
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1
      while (j < src.length) {
        if (src[j] === '\\') {
          j += 2
          continue
        }
        if (src[j] === c) {
          j++
          break
        }
        // 模板串里的 ${...} 不单独处理，整体当字符串（够用）
        j++
      }
      out += span('tok-str', src.slice(i, Math.min(j, src.length)))
      i = Math.min(j, src.length)
      prev = c
      continue
    }
    // 数字
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      let j = i
      while (j < src.length && /[0-9a-fA-FxX._eE+-]/.test(src[j])) {
        // 别把 `1-2` 这种连起来
        if ((src[j] === '+' || src[j] === '-') && !/[eE]/.test(src[j - 1] || '')) break
        j++
      }
      out += span('tok-num', src.slice(i, j))
      i = j
      prev = '0'
      continue
    }
    // 标识符
    if (/[A-Za-z_$]/.test(c)) {
      let j = i
      while (j < src.length && /[A-Za-z0-9_$]/.test(src[j])) j++
      const word = src.slice(i, j)
      const isCall = /^\s*\(/.test(src.slice(j)) // 后面跟 ( ⇒ 调用
      const afterDot = prev === '.'
      const afterNew = prevWord === 'new'
      if (TS_KEYWORDS.has(word)) out += span('tok-kw', word)
      else if (TS_LITERALS.has(word)) out += span('tok-lit', word)
      else if (afterNew) out += span('tok-type', word) // `new Panel(` → 类名优先于"调用"
      else if (isCall) out += span('tok-fn', word)
      else if (afterDot) out += span('tok-prop', word)
      else if (/^[A-Z]/.test(word)) out += span('tok-type', word)
      else out += escapeHtml(word)
      i = j
      prev = word.slice(-1)
      prevWord = word
      continue
    }
    // 标点/空白/其它
    if (/[\s]/.test(c)) {
      out += escapeHtml(c)
      i++
      continue
    }
    if ('{}()[];,.'.includes(c)) {
      out += span('tok-punct', c)
      prev = c
      prevWord = ''
      i++
      continue
    }
    out += escapeHtml(c)
    if (!/\s/.test(c)) {
      prev = c
      prevWord = ''
    }
    i++
  }
  return out
}

/**
 * JSON 高亮：键 / 字符串 / 数字 / 字面量 / 标点。
 * @param {string} text
 * @returns {string} HTML
 */
export function highlightJSON(text) {
  const src = String(text)
  let out = ''
  let i = 0

  while (i < src.length) {
    const c = src[i]

    if (c === '"') {
      let j = i + 1
      while (j < src.length) {
        if (src[j] === '\\') {
          j += 2
          continue
        }
        if (src[j] === '"') {
          j++
          break
        }
        j++
      }
      const raw = src.slice(i, Math.min(j, src.length))
      // 后面跟冒号 ⇒ 是键
      const isKey = /^\s*:/.test(src.slice(j))
      out += span(isKey ? 'tok-key' : 'tok-str', raw)
      i = Math.min(j, src.length)
      continue
    }

    if (/[0-9-]/.test(c) && /[0-9-]/.test(c)) {
      const m = src.slice(i).match(/^-?\d+(\.\d+)?([eE][+-]?\d+)?/)
      if (m) {
        out += span('tok-num', m[0])
        i += m[0].length
        continue
      }
    }

    if (src.startsWith('true', i) || src.startsWith('false', i) || src.startsWith('null', i)) {
      const word = src.startsWith('false', i) ? 'false' : src.startsWith('null', i) ? 'null' : 'true'
      out += span('tok-lit', word)
      i += word.length
      continue
    }

    if ('{}[],:'.includes(c)) {
      out += span('tok-punct', c)
      i++
      continue
    }

    out += escapeHtml(c)
    i++
  }
  return out
}

/** 高亮结果 → 带行号的代码视图（HTML 片段，交给 h(..., {html}) 挂上去） */
export function codeViewHtml(text, lang) {
  const src = String(text)
  const body = lang === 'json' ? highlightJSON(src) : highlightTS(src)
  const lines = body.split('\n')
  const gutter = lines.map((_, i) => `<span>${i + 1}</span>`).join('')
  return `<div class="code-wrap"><div class="code-gutter">${gutter}</div><pre class="code">${lines.join('\n')}</pre></div>`
}

/** 测试用：把高亮 HTML 还原成纯文本（必须与原文逐字相同） */
export function stripTags(html) {
  return String(html)
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}
