/**
 * 语法高亮单测（Sapdon UI Designer）
 *
 * 运行：`node tests/designer-highlight.test.mjs`（纯函数，零依赖）
 *
 * ★ 核心不变量：**高亮不许改变原文** —— `stripTags(highlightX(text)) === text`。
 *   自己写的分词器最容易吃掉字符/多加字符（转义、续行、注释边界），这条会当场抓出来。
 *   其余断言盯"该着色的着上了"（关键字/字符串/注释/键/数字/字面量/函数/类型）。
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { highlightTS, highlightJSON, codeViewHtml, stripTags, escapeHtml } from '../tools/designer/src/ui/highlight.js'
import { loadProject } from '../tools/designer/src/model.js'
import { generate } from '../tools/designer/src/codegen.js'
import { previewAll, jsonNormalize } from '../tools/designer/src/preview.js'
import { SAMPLE } from '../tools/designer/samples/guidebook.js'

const DOC = loadProject(SAMPLE).project

// ---------------------------------------------------------------------------
// 不变量：不改变原文
// ---------------------------------------------------------------------------

test('★ 高亮不改变原文：生成出来的整份 TS 代码，剥掉标签后逐字相同', () => {
  const code = generate(DOC).code
  assert.ok(code.length > 1000)
  assert.equal(stripTags(highlightTS(code)), code)
})

test('★ 高亮不改变原文：JSON 产物（两份文件）逐字相同', () => {
  const all = previewAll(DOC)
  const ui = JSON.stringify(jsonNormalize(all.uiFile.system), null, 2)
  const sf = JSON.stringify(jsonNormalize(all.serverForm.system), null, 2)
  for (const text of [ui, sf]) {
    assert.equal(stripTags(highlightJSON(text)), text)
  }
})

test('★ 高亮不改变原文：刁钻片段（转义 / 中文 / 空行 / 未闭合）', () => {
  const cases = [
    'const s = "含 \\" 转义 和中文"\n',
    "const s = '\\n\\t单引号'\n",
    '// 行注释里有 "引号" 与 <标签>\n',
    '/* 块注释\n跨行 */ const x = 1\n',
    '<!-- TS 里的尖括号 <T> 与 & 符号 -->',
    'const 中文变量 = 1',
    'unterminated = "没闭合的字符串',
    '/* 没闭合的块注释',
    'a\n\n\nb',
    '',
  ]
  for (const text of cases) {
    assert.equal(stripTags(highlightTS(text)), text, JSON.stringify(text))
    assert.equal(stripTags(highlightJSON(text)), text, JSON.stringify(text))
  }
})

test('escapeHtml：& < > 都要转义（其余保持）', () => {
  assert.equal(escapeHtml('a & b < c > d "e"'), 'a &amp; b &lt; c &gt; d "e"')
  assert.equal(stripTags(escapeHtml('a & b < c > d')), 'a & b < c > d')
})

// ---------------------------------------------------------------------------
// TS 该着色的着上了
// ---------------------------------------------------------------------------

test('TS：注释 / 关键字 / 字符串 / 数字 / 类型 / 函数 / 属性各有 class', () => {
  const html = highlightTS(['// 注释', "import { Panel } from '@sapdon/core'", 'const p = new Panel("bg", "common.button").setLayer(3)', 'const n = 2.5'].join('\n'))
  assert.match(html, /<span class="tok-com">\/\/ 注释<\/span>/)
  assert.match(html, /<span class="tok-kw">import<\/span>/)
  assert.match(html, /<span class="tok-str">'@sapdon\/core'<\/span>/, '模块路径是字符串')
  assert.match(html, /<span class="tok-type">Panel<\/span>/, 'import 里的类名 + new 后面的类名都是类型色')
  assert.match(html, /<span class="tok-fn">setLayer<\/span>/, '方法调用 =.tok-fn')
  assert.match(html, /<span class="tok-num">3<\/span>/)
  assert.match(html, /<span class="tok-num">2.5<\/span>/)
})

test('TS：`new Panel(` 里的类名按类型着色（不是函数色）', () => {
  const html = highlightTS('const p = new Panel("bg")')
  assert.match(html, /<span class="tok-type">Panel<\/span>/)
  assert.ok(!/<span class="tok-fn">Panel<\/span>/.test(html))
})

test('TS：字面量 true/false/null 单独一色', () => {
  const html = highlightTS('const a = true, b = false, c = null, d = undefined')
  assert.equal((html.match(/tok-lit/g) || []).length, 4)
})

test('TS：`.prop` 与 `Fn()` 区分开', () => {
  const html = highlightTS('el.layout.setSize(3)\nregistry.submit()')
  assert.match(html, /<span class="tok-prop">layout<\/span>/)
  assert.match(html, /<span class="tok-fn">setSize<\/span>/)
  assert.match(html, /<span class="tok-fn">submit<\/span>/)
})

test('TS：块注释跨行不被截断、且不吞掉后面的代码', () => {
  const html = highlightTS('/**\n * 说明\n */\nconst x = 1')
  assert.equal((html.match(/tok-com/g) || []).length, 1)
  assert.match(html, /<span class="tok-kw">const<\/span>/)
})

// ---------------------------------------------------------------------------
// JSON 该着色的着上了
// ---------------------------------------------------------------------------

test('JSON：键与字符串区分、数字与字面量单独一色、标点变暗', () => {
  const html = highlightJSON('{\n  "type": "panel",\n  "size": ["100%", 24],\n  "visible": true,\n  "n": null\n}')
  assert.match(html, /<span class="tok-key">"type"<\/span>/, '后跟冒号的字符串 = 键')
  assert.match(html, /<span class="tok-str">"panel"<\/span>/, '值是字符串')
  assert.match(html, /<span class="tok-str">"100%"<\/span>/)
  assert.match(html, /<span class="tok-num">24<\/span>/)
  assert.match(html, /<span class="tok-lit">true<\/span>/)
  assert.match(html, /<span class="tok-lit">null<\/span>/)
  assert.match(html, /<span class="tok-punct">\{<\/span>/)
})

test('JSON：负数与小数', () => {
  const html = highlightJSON('{"a": -2, "b": 0.5, "c": 1e3}')
  assert.match(html, /<span class="tok-num">-2<\/span>/)
  assert.match(html, /<span class="tok-num">0.5<\/span>/)
  assert.match(html, /<span class="tok-num">1e3<\/span>/)
})

test('JSON：数组/字符串里出现 true 这种词不该被错认成字面量', () => {
  const html = highlightJSON('["true", "null"]')
  assert.equal((html.match(/tok-lit/g) || []).length, 0, '引号里的是字符串')
  assert.equal((html.match(/tok-str/g) || []).length, 2)
})

// ---------------------------------------------------------------------------
// 代码视图（行号）
// ---------------------------------------------------------------------------

test('codeViewHtml：带行号，行数与原文一致，且正文逐字不丢', () => {
  const text = 'a\nb\nc'
  const html = codeViewHtml(text, 'ts')
  assert.match(html, /class="code-gutter"/)
  assert.equal((html.match(/<span>\d+<\/span>/g) || []).length, 3, '三行三个行号')
  const body = html.slice(html.indexOf('<pre'))
  assert.equal(stripTags(body), text)
})

test('codeViewHtml：真实产物（JSON）也能出行号且不丢字符', () => {
  const ui = JSON.stringify(jsonNormalize(previewAll(DOC).uiFile.system), null, 2)
  const html = codeViewHtml(ui, 'json')
  const body = html.slice(html.indexOf('<pre'))
  assert.equal(stripTags(body), ui)
  const lines = ui.split('\n').length
  assert.equal((html.match(/<span>\d+<\/span>/g) || []).length, lines)
})
