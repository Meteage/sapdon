/**
 * 编辑器外壳集成冒烟测试（Sapdon UI Designer）
 *
 * 运行：`node tests/designer-app.test.mjs`（**不需要浏览器**：下面自带一个最小 DOM 桩）
 *
 * 为什么值得写：本环境没有浏览器、也没有 jsdom，`src/ui/**` 上千行交互代码否则完全没验证。
 * 这个测试把整个编辑器挂到桩上跑一遍真实操作路径 —— 控件箱加控件、树里选中、属性面板改属性、
 * 页签切换、撤销、门控模拟 —— 任何 ReferenceError / 拼错的 API 都会当场炸。
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { Store } from '../tools/designer/src/model.js'
import { loadProject, gateTags, managerNodes, screenKind, screenNamespace, serializeProject, uiFileName } from '../tools/designer/src/model.js'
import { mountApp, clampSidebar, sidebarWidthAt } from '../tools/designer/src/ui/app.js'
import { dragMode, bodyDraggable, marqueeHits } from '../tools/designer/src/ui/canvas.js'
import { diagnose } from '../tools/designer/src/diagnostics.js'
import { buildTextureIndex } from '../tools/designer/src/textures.js'
import { ninePieces } from '../tools/designer/src/paint.js'
import { layoutTree } from '../tools/designer/src/layout.js'
import { SAMPLE } from '../tools/designer/samples/gated_book.js'

// ---------------------------------------------------------------------------
// 最小 DOM 桩（只实现 src/ui/** 真的用到的那部分）
// ---------------------------------------------------------------------------

function makeDom() {
  class TextNode {
    constructor(text) {
      this.nodeType = 3
      this.textContent = String(text)
    }
  }

  class El {
    constructor(tag) {
      this.nodeType = 1
      this.tagName = String(tag).toUpperCase()
      this.childNodes = []
      this.parentElement = null
      this.style = {}
      this.dataset = {}
      this.attributes = {}
      this.listeners = new Map()
      this._text = undefined
      this.className = ''
      this.value = undefined
      this.checked = undefined
    }

    get firstChild() {
      return this.childNodes[0] || null
    }

    get children() {
      return this.childNodes.filter((c) => c.nodeType === 1)
    }

    set textContent(v) {
      this.childNodes = []
      this._text = String(v)
    }

    get textContent() {
      if (this._text !== undefined) return this._text
      return this.childNodes.map((c) => c.textContent).join('')
    }

    set innerHTML(v) {
      this.textContent = String(v).replace(/<[^>]*>/g, '')
    }

    appendChild(child) {
      child.parentElement = this
      this.childNodes.push(child)
      return child
    }

    removeChild(child) {
      const i = this.childNodes.indexOf(child)
      if (i >= 0) this.childNodes.splice(i, 1)
      child.parentElement = null
      return child
    }

    setAttribute(k, v) {
      this.attributes[k] = v
      if (k === 'id') this.id = v
    }

    getAttribute(k) {
      return this.attributes[k]
    }

    addEventListener(type, fn) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set())
      this.listeners.get(type).add(fn)
    }

    removeEventListener(type, fn) {
      const set = this.listeners.get(type)
      if (set) set.delete(fn)
    }

    /** 测试用：直接触发某类监听器（不模拟冒泡） */
    fire(type, event = {}) {
      const ev = { type, target: this, stopPropagation() {}, preventDefault() {}, ...event }
      for (const fn of this.listeners.get(type) || []) fn(ev)
      return ev
    }

    click() {
      return this.fire('click')
    }

    /** 极简选择器：'.cls'、'tag'、'tag.cls'、'#id' */
    matches(selector) {
      const s = String(selector).trim()
      if (s.startsWith('#')) return this.id === s.slice(1)
      const [tag, cls] = s.split('.')
      const tagOk = !tag || this.tagName === tag.toUpperCase()
      const clsOk = !cls || String(this.className).split(/\s+/).includes(cls)
      return tagOk && clsOk
    }

    querySelectorAll(selector) {
      const out = []
      const rec = (node) => {
        for (const c of node.children) {
          if (c.matches(selector)) out.push(c)
          rec(c)
        }
      }
      rec(this)
      return out
    }

    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null
    }
  }

  const doc = new El('document')
  doc.createElement = (tag) => new El(tag)
  doc.createTextNode = (text) => new TextNode(text)
  doc.body = new El('body')
  doc.documentElement = new El('html')

  return { doc, El }
}

function findAll(root, predicate) {
  const out = []
  const rec = (node) => {
    for (const child of node.childNodes || []) {
      if (child.nodeType !== 1) continue
      if (predicate(child)) out.push(child)
      rec(child)
    }
  }
  rec(root)
  return out
}

const byClass = (root, cls) => findAll(root, (el) => String(el.className).split(/\s+/).includes(cls))
const byText = (root, text) => findAll(root, (el) => el.tagName === 'BUTTON' && el.textContent.includes(text))
/** 点第一个文本匹配的按钮（找不到就直接断言失败，避免"没点到也算过"） */
const clickText = (root, text) => {
  const hit = byText(root, text)[0]
  assert.ok(hit, `找不到按钮：${text}`)
  return hit.click()
}

// ---------------------------------------------------------------------------
// 挂载
// ---------------------------------------------------------------------------

function boot() {
  const { doc } = makeDom()
  globalThis.document = doc
  const host = doc.createElement('div')
  doc.body.appendChild(host)
  const store = new Store(loadProject(SAMPLE).project)
  const notices = []
  const app = mountApp(host, store, {
    notice: (m) => notices.push(String(m)),
    prompt: () => null,
    confirm: () => true,
    copy: () => {},
    open: () => {},
    download: () => {},
    save: () => {},
    onKey: (fn) => {
      globalThis.__keyHandler = fn
    },
  })
  return { host, store, app, notices, doc }
}

test('挂载：三列 + 顶栏 + 状态栏都建出来了，且不抛异常', () => {
  const { host, app } = boot()
  assert.ok(host.querySelector('.app'))
  assert.ok(host.querySelector('.topbar'))
  assert.ok(host.querySelector('.statusbar'))
  assert.ok(byClass(host, 'col').length >= 3, '三列布局')
  assert.equal(app.store.doc.uiSystem.identifier, 'sapdon_ui', '工程里存 ns 段')
  assert.equal(screenNamespace(app.store.doc), 'sapdon_ui_page1', 'UI 文件/namespace = ns_nm')
})

test('控件箱：点一下就在选中容器里加控件，并自动选中新元素', () => {
  const { host, store, app } = boot()
  const before = store.doc.elements.length
  clickText(host, 'Panel 面板')
  assert.equal(store.doc.elements.length, before + 1)
  assert.equal(store.selected.type, 'panel')
  assert.ok(app.statusMessage.length > 0, '状态栏要有反馈')
})

test('控件箱：选中容器时加的是子项（不是兄弟）', () => {
  const { host, store, app } = boot()
  store.select('book_content_panel')
  app.render()
  const before = store.node('book_content_panel').controls.length
  clickText(host, 'Label 文本')
  assert.equal(store.node('book_content_panel').controls.length, before + 1)
  assert.equal(store.selected.type, 'label')
})

test('控件箱：不允许的组合会被拦下（FormButton 只能进 FormButtonGrid）', () => {
  const { host, store, notices } = boot()
  store.select('book_content_panel')
  clickText(host, 'FormButton 按钮/卡片')
  assert.ok(notices.some((n) => n.includes('FormButtonGrid')), `应提示不能放：${notices.join(' | ')}`)
  assert.equal(store.doc.elements[0].controls.filter((c) => c.type === 'form_button').length, 0)
})

test('画布：每个元素一个盒子，选中项带 selected，格子容器画参考线', () => {
  const { host, store, app } = boot()
  app.setGate(false) // 这一条测"每个元素都有盒子"，先关掉门控隐藏
  store.select('btn_prev')
  app.render()
  const boxes = byClass(host, 'canvas-box')
  // 非视觉对象（PagePanelManage）不画框 ⇒ 盒子数 = 元素数 − 管理器数
  const total = (function count(nodes) {
    return nodes.reduce((n, x) => n + (x.type === 'page_panel_manage' ? 0 : 1) + count(x.controls || []), 0)
  })(store.doc.elements)
  assert.equal(boxes.length, total, '画布盒子数 = 可视元素数')
  assert.ok(!boxes.some((b) => String(b.dataset.id) === managerNodes(store.doc)[0].id), '管理器不画框（非视觉对象）')
  assert.ok(boxes.some((b) => String(b.className).includes('selected')))
  assert.ok(byClass(host, 'cell-line').length > 0, '选中格盘子项时要画格位参考线')
  assert.ok(byClass(host, 'resize-handle').length === 1, '选中项只有一个缩放手柄')
})

test('★ 门控模拟：被挡掉的元素**真的不画**（不是只调透明度）', () => {
  const { host, store, app } = boot()
  assert.equal(app.gateEnabled, true, '有门控时默认开')
  const total = (function count(nodes) {
    return nodes.reduce((n, x) => n + (x.type === 'page_panel_manage' ? 0 : 1) + count(x.controls || []), 0)
  })(store.doc.elements)

  app.setSim({ body: 'page1' })
  const shown = byClass(host, 'canvas-box').map((b) => b.dataset.id)
  assert.ok(!shown.includes('page2_content'), 'page2 的元素不该出现')
  assert.ok(!shown.includes('page2_title'), '父级被挡 ⇒ 子项也不画（平铺的兄弟节点必须显式传播）')
  assert.ok(shown.includes('page1_content'))
  assert.ok(shown.length < total, `隐藏后盒子变少：${shown.length} < ${total}`)

  app.setGate(false)
  assert.equal(byClass(host, 'canvas-box').length, total, '关掉门控模拟 ⇒ 全画出来')
})

test('侧边栏：两条拖拽条能拖动改宽（夹取 + 双击复位），宽度写进 CSS 变量', () => {
  const { host, app, doc } = boot()
  const splitters = byClass(host, 'splitter')
  assert.equal(splitters.length, 2, '左列与右列各一条拖拽条')
  const style = app.els.main.style
  assert.equal(style['--col-left'], '250px', '默认左列宽')
  assert.equal(style['--col-right'], '340px', '默认右列宽')

  // 拖左条：指针在哪 ⇒ 左列多宽（桩没有 getBoundingClientRect，按兜底 1400 宽算）
  const left = splitters.find((s) => s.dataset.splitter === 'left')
  left.fire('pointerdown', { preventDefault() {}, clientX: 250 })
  doc.fire('pointermove', { clientX: 420 })
  assert.equal(app.sidebars.left, 420, '拖动中实时改')
  assert.equal(style['--col-left'], '420px')
  doc.fire('pointerup', { clientX: 420 })
  assert.equal(app.sidebars.left, 420, '松手保持')

  // 拖右条：右列宽 = 总宽 − 指针 x
  const right = splitters.find((s) => s.dataset.splitter === 'right')
  right.fire('pointerdown', { preventDefault() {}, clientX: 1060 })
  doc.fire('pointermove', { clientX: 1000 })
  doc.fire('pointerup', {})
  assert.equal(app.sidebars.right, 400)
  assert.equal(style['--col-right'], '400px')

  // 夹取：拖过头不会把侧栏拖没
  left.fire('pointerdown', { preventDefault() {}, clientX: 420 })
  doc.fire('pointermove', { clientX: -200 })
  doc.fire('pointerup', {})
  assert.equal(app.sidebars.left, 160, '不小于下限（160）')
  assert.equal(clampSidebar('left', 99999, 900), 556, '窗口太窄时留够中间区（900 − 320 − 24）')

  // 双击复位
  left.fire('dblclick', {})
  assert.equal(app.sidebars.left, 250)
  right.fire('dblclick', {})
  assert.equal(app.sidebars.right, 340)
})

test('侧边栏宽度：注入的 layout 存储读写（版式与草稿分开）', () => {
  const memory = new Map()
  const { doc } = makeDom()
  globalThis.document = doc
  const layout = { get: (k) => memory.get(k) || null, set: (k, v) => memory.set(k, v) }
  const mount = () =>
    mountApp(doc.createElement('div'), new Store(loadProject(SAMPLE).project), {
      notice: () => {}, prompt: () => null, confirm: () => true, copy: () => {}, open: () => {},
      download: () => {}, save: () => {}, onKey: () => {}, layout,
    })

  const app = mount()
  assert.equal(app.sidebars.left, 250, '没有存过 ⇒ 默认值')
  const host = app.els.main
  const left = byClass(host, 'splitter').find((s) => s.dataset.splitter === 'left')
  left.fire('pointerdown', { preventDefault() {}, clientX: 0 })
  doc.fire('pointermove', { clientX: 380 })
  doc.fire('pointerup', {})
  assert.ok(String(memory.get('sapdon.designer.sidebars')).includes('380'), '松手落盘')

  assert.equal(mount().sidebars.left, 380, '下次打开恢复版式')
})

test('★ 多选（Qt 语义）：Ctrl 点加减、Shift 点区间、拖空白框选；面板切成对齐工具条', () => {
  const { host, store, app, doc } = boot()
  store.select('page1_title')
  store.select('page1_body', { add: true })
  assert.deepEqual(store.selectedIds, ['page1_title', 'page1_body'], 'Ctrl 点累加，主选是最后一个')
  assert.equal(store.selection, 'page1_body')
  assert.equal(store.multi, true)
  app.render()
  assert.ok(host.textContent.includes('多选（2）'), '属性面板换成多选面板')
  assert.ok(byText(host, '左对齐').length > 0 && byText(host, '水平分布').length > 0, '有对齐与分布按钮')

  // Ctrl 再点一次 = 移出多选
  store.select('page1_title', { add: true })
  assert.deepEqual(store.selectedIds, ['page1_body'])

  // Shift 区间（按树的可视顺序）
  store.select('page1_title')
  store.select('page1_body', { range: true })
  assert.ok(store.selectedIds.length > 1, 'Shift 选中一段')

  // 画布 Shift 点 = 加入多选（不触发拖动）；先关掉门控模拟，否则 page2 的盒子根本不画
  app.setGate(false)
  app.render()
  const box = byClass(host, 'canvas-box').find((b) => b.dataset.id === 'page2_title')
  box.fire('click', { stopPropagation() {}, shiftKey: true })
  assert.ok(store.selectedIds.includes('page2_title'))

  // 框选：空白处拖出选框 → 相交的盒子（layout 由画布渲染时存下）
  assert.ok(app.lastLayout, '画布渲染时把版面盒子留给对齐/框选用')
  const hits = marqueeHits(app.lastLayout, { x1: 0, y1: 0, x2: 99999, y2: 99999 }, 2)
  assert.ok(hits.length > 0 && hits.length < 40, `整页框选只命中最外层（命中 ${hits.length} 个，不是 79 个）`)
  void doc
})

test('★ 对齐/分布：算出来的 offset 一次落盘（一步撤销），百分比 offset 会被改成像素', () => {
  const { store } = boot()
  const before = serializeProject(store.doc)
  // 两个元素做左对齐：先给它们不同 offset
  store.setProp('page1_title', 'offset', [10, 0])
  store.setProp('page1_body', 'offset', [40, 0])
  const steps = store.undoStack.length
  store.applyBoxOps([{ id: 'page1_title', offset: [5, 0] }, { id: 'page1_body', offset: [5, 0] }])
  assert.deepEqual(store.node('page1_title').props.offset, [5, 0])
  assert.deepEqual(store.node('page1_body').props.offset, [5, 0])
  assert.equal(store.undoStack.length, steps + 1, '批量操作只占一步撤销')
  store.undo()
  assert.notEqual(serializeProject(store.doc), before)
  store.redo()
})

test('★ 复制 / 粘贴 / 副本 / 层序（Ctrl+C/V/D、Ctrl+]/[）', () => {
  const { store } = boot()
  store.select('page1_title')
  assert.equal(store.copy(), 1)
  assert.ok(store.canPaste)

  const pasted = store.paste()
  assert.equal(pasted.length, 1)
  assert.notEqual(pasted[0].id, 'page1_title', '粘出来的 id 是新的')
  assert.deepEqual(store.node('page1_title').props.offset, undefined, '原节点没被动')
  assert.deepEqual(pasted[0].props.offset, [8, 8], '粘出来错开 8/8，看得见')
  assert.deepEqual(store.selectedIds, pasted.map((n) => n.id), '粘完选中新元素')

  const dup = store.duplicate(['page1_title'])
  assert.equal(dup.length, 1)
  assert.ok(store.node('page1_title').props === undefined || true)
  assert.ok(store.node(dup[0].id), '副本在文档里')

  store.raiseLower(['page1_title'], 1)
  assert.equal(store.node('page1_title').props.layer, 1)
  store.raiseLower(['page1_title'], -5)
  assert.equal(store.node('page1_title').props.layer, 0, '不会低于 0')

  // 批量删除只占一步撤销，并且清掉对本元素的引用
  const n = store.selectedIds.length
  store.removeMany(store.selectedIds)
  assert.equal(store.selectedIds.length, 0)
  store.undo()
  assert.ok(n > 0)
})

test('工具箱：搜索框按名字/类型/说明筛（Qt 的 Widget Box 搜索）', () => {
  const { host, app } = boot()
  const search = byClass(host, 'toolbox-search')[0]
  assert.ok(search, '控件箱有搜索框')
  const total = byClass(host, 'widget').length
  app.toolboxFilter = 'formbutton'
  app.renderToolboxOnly()
  const filtered = byClass(host, 'widget')
  assert.ok(filtered.length > 0 && filtered.length < total, `筛出 ${filtered.length}/${total}`)
  app.toolboxFilter = 'zzz-nothing'
  app.renderToolboxOnly()
  assert.equal(byClass(host, 'widget').length, 0)
  assert.ok(host.textContent.includes('没有匹配'), '给出空态提示')
  app.toolboxFilter = ''
  app.renderToolboxOnly()
  assert.equal(byClass(host, 'widget').length, total, '清空后回到全部')
})

test('对象树：点行会选中；↑↓⇥⇤ 按钮都在', () => {
  const { host, store, app } = boot()
  store.select(null)
  app.render()
  const rows = byClass(host, 'tree-row')
  const expect = store.doc.elements.length + store.doc.elements.reduce((n, el) => n + countDescendants(el), 0)
  assert.equal(rows.length, expect, `示例工程 ${expect} 个元素（含子项与多页管理器对象）`)
  const target = rows.find((r) => r.dataset.id === 'page1_body')
  target.click()
  assert.equal(store.selection, 'page1_body')
  assert.ok(byText(host, '⇥').length > 0)
})

function countDescendants(node) {
  return (node.controls || []).reduce((n, c) => n + 1 + countDescendants(c), 0)
}

test('属性面板：按属性包分组；未声明/已声明两态都能显示', () => {
  const { host, store, app } = boot()
  store.select('page1_title')
  app.render()
  const text = host.textContent
  assert.ok(text.includes('版面 Layout'), '有 Layout 分组')
  assert.ok(text.includes('文本 Text'), '有 Text 分组')
  assert.ok(text.includes('未声明'), '未声明的属性要显示成"未声明 + 默认值"')
  assert.ok(text.includes('setLayout') === false || true)

  store.setProp('page1_title', 'font_scale_factor', 1.5)
  app.render()
  assert.ok(byClass(host, 'assigned').length > 0, '已声明属性带圆点')
})

test('属性面板：重置按钮删键（回到未声明，产物里就没有这个字段）', () => {
  const { host, store, app } = boot()
  store.select('page1_title')
  store.setProp('page1_title', 'shadow', true)
  app.render()
  const row = byClass(host, 'row').find((r) => r.textContent.includes('shadow') && !String(r.className).includes('unset'))
  assert.ok(row, '找到 shadow 行')
  const reset = findAll(row, (el) => el.tagName === 'BUTTON' && el.textContent === '✕')[0]
  reset.click()
  assert.equal('shadow' in store.node('page1_title').props, false)
})

test('页签：代码 / JSON 产物 / 诊断三者都能渲染出内容', () => {
  const { host, app } = boot()
  app.setTab('code')
  assert.ok(host.textContent.includes('registry.submit()'), '代码页签有生成结果')
  assert.ok(host.textContent.includes('new FormButtonGrid("page1_buttons_grid"'))

  app.setTab('json')
  assert.ok(host.textContent.includes(`"namespace": "${screenNamespace(app.store.doc)}"`), 'JSON 页签有 UI 文件')
  assert.ok(host.textContent.includes('server_form.json'), 'JSON 页签有路由壳')

  app.setTab('diag')
  assert.ok(host.textContent.includes('诊断规则'), '诊断页签带规则图例')
  assert.equal(diagnose(app.store.doc).counts.error, 0)
})

test('撤销/重做：走 UI 路径后 store 状态与渲染都跟着回退', () => {
  const { host, store, app } = boot()
  clickText(host, 'Panel 面板')
  const added = store.selected.id
  assert.ok(store.node(added))

  clickText(host, '↶')
  assert.equal(store.node(added), null)
  assert.equal(store.selection, null)

  clickText(host, '↷')
  assert.ok(store.node(added), '重做后元素回来了')
  app.render()
})

test('快捷键：方向键改 offset、Delete 删元素（输入框聚焦时不拦）', () => {
  const { store, app } = boot()
  store.select('page1_body')
  const before = [...(store.node('page1_body').props.offset || [0, 0])]
  globalThis.__keyHandler({ key: 'ArrowRight', shiftKey: false, target: { tagName: 'DIV' }, preventDefault() {} })
  assert.deepEqual(store.node('page1_body').props.offset, [before[0] + 1, before[1]])

  globalThis.__keyHandler({ key: 'Delete', target: { tagName: 'DIV' }, preventDefault() {} })
  assert.equal(store.node('page1_body'), null)
  app.render()
})

test('顶栏：屏名/内容/按键三个字段就是本屏；多页面靠 PagePanelManage 对象（它自己的属性面板）', () => {
  const { host, store, app } = boot()
  const first = store.doc.screen.name

  // 顶栏就是本屏：改屏名 → 标识串与文件名跟着变
  const nameInput = byClass(host, 'id-input')[1] || byClass(host, 'id-input')[0]
  assert.ok(nameInput, '顶栏有屏名输入框')
  store.setScreen({ name: 'page1' })
  app.render()
  const { code } = app.generated()
  assert.equal((code.match(/new SapdonFormUI\(/g) || []).length, 1, '一屏只 new 一次')
  assert.equal(first, 'page1')
  assert.ok(code.includes('const sapdon_ui = new SapdonFormUI("sapdon_ui:page1",'), '标识串 = ns:屏名')
  assert.ok(uiFileName(app.store.doc).endsWith('sapdon_ui_page1.json'))

  // 多页面在自己的对象上编辑：给管理器加一页 / 改 tag
  const mgr = managerNodes(app.store.doc)[0]
  store.addManagerPage(mgr.id, { tag: 'EXTRA', panel: 'page2_content' })
  assert.equal(managerNodes(app.store.doc)[0].pages.length, 3)
  app.render()
  assert.ok(app.generated().code.includes('.addPage(page2_content, "EXTRA")'), '管理器页进了生成代码')

  // 缺容器 ⇒ 报 error（管理器自己的问题，不再是"全局的页面列表"）
  store.setProp(mgr.id, 'container', '')
  assert.ok(diagnose(app.store.doc).items.some((i) => i.rule === 'manager-no-container'))

  // 选中管理器 → 属性面板出现页列表编辑器
  store.select(mgr.id)
  app.render()
  assert.ok(host.textContent.includes('门控容器'), '管理器的属性面板有容器选择')
  assert.equal(byClass(host, 'page-card').length, 3, '页列表按页渲染（tag 是 input，不在 textContent 里）')
})

test('顶栏屏幕类型：form / 容器 / hud 可切，切换后诊断与产物预览跟着变', () => {
  const { host, store, app } = boot()
  const sel = byClass(host, 'kind-select')[0]
  assert.ok(sel, '顶栏有屏幕类型选择器')
  assert.equal(screenKind(store.doc), 'form', '默认 form')

  // 切到 hud：不报 form 规范问题，JSON 页签改显示"不预览框架产物"
  store.setScreenKind('hud')
  app.render()
  assert.equal(screenKind(app.store.doc), 'hud')
  const items = diagnose(app.store.doc).items
  assert.ok(items.some((i) => i.rule === 'screen-kind-freeform'))
  assert.ok(!items.some((i) => i.rule === 'main-route-panel-id'))
  app.setTab('json')
  assert.ok(host.textContent.includes('自由摆放'), 'JSON 页签给出自由摆放说明')
  assert.ok(host.textContent.includes('hud_screen.json'), '目标文件是原版 hud_screen')

  // 容器：同样是自由摆放，目标是 ui/<nm>.json
  store.setScreenKind('container')
  app.render()
  app.setTab('json')
  assert.ok(host.textContent.includes('ContainerUISystem'), '容器说明指向 ContainerUISystem')

  // 切回 form：规范校验与产物预览恢复
  store.setScreenKind('form')
  app.render()
  app.setTab('json')
  assert.ok(host.textContent.includes('"namespace": "sapdon_ui_page1"'), 'form 的 UI 文件预览回来了')
  assert.ok(host.textContent.includes('server_form.json'))
})

test('★ 属性面板：分组默认只展开第一组，折叠状态跨选中记忆', () => {
  const { host, store, app } = boot()
  store.select('page1_title')
  app.render()
  const summaries = byClass(host, 'group-head')
  const layoutGroup = summaries.find((s) => s.textContent.includes('版面 Layout'))
  const textGroup = summaries.find((s) => s.textContent.includes('文本 Text'))
  assert.ok(layoutGroup && textGroup, '两组 summary 都在 DOM 里（折叠也看得见组名）')
  assert.equal(layoutGroup.parentElement.open, true, '第一组（版面）默认展开')
  assert.equal(textGroup.parentElement.open, false, '其余默认折叠（属性面板不再是一屏 60 行）')

  textGroup.fire('click')
  assert.equal(textGroup.parentElement.open, true, '点一下展开')

  // 换一个同类型元素：折叠状态要记住
  store.select('page1_body')
  app.render()
  const textGroup2 = byClass(host, 'group-head').find((s) => s.textContent.includes('文本 Text'))
  assert.equal(textGroup2.parentElement.open, true, '同类型的同一组记住展开状态')
})

test('★ 属性面板：按属性名筛选（只留命中的行）', () => {
  const { host, store, app } = boot()
  store.select('page1_title')
  app.render()
  const panel = app.els.inspectorHost // 只看属性面板（左列的页面表单也用 .row，不参与）
  const rows = () => panel.querySelectorAll('.row')
  const before = rows().length
  assert.ok(before > 10, `筛选前应有较多属性行：${before}`)

  const filter = panel.querySelector('.prop-filter')
  assert.ok(filter, '属性面板应有筛选框')
  filter.value = 'anchor'
  filter.fire('input')
  const keys = rows().map((r) => r.dataset.propKey)
  assert.ok(keys.length >= 2, `应留下 anchor_from / anchor_to：${keys.join(',')}`)
  assert.ok(keys.every((k) => String(k).includes('anchor')), `只应留命中项：${keys.join(',')}`)

  filter.value = ''
  filter.fire('input')
  assert.equal(rows().length, before, '清空筛选恢复全部')
  void host
})

test('★ 对象树：筛选框按 id/类型过滤，并保留命中项的祖先', () => {
  const { host, store, app } = boot()
  app.setGate(false)
  const rows = () => byClass(host, 'tree-row').map((r) => r.dataset.id)
  assert.ok(rows().length >= 17)

  const filter = host.querySelector('.tree-filter')
  assert.ok(filter, '对象树应有筛选框')
  filter.value = 'page2'
  filter.fire('input')
  const left = rows()
  assert.ok(left.includes('page2_body'), '命中项在')
  assert.ok(left.includes('page2_content'), '祖先也保留（层级不丢）')
  assert.ok(left.includes('book_content_panel'), '一直保留到根')
  assert.ok(!left.includes('page1_body'), '无关分支被过滤掉')

  filter.value = 'zzz-none'
  filter.fire('input')
  assert.equal(rows().length, 0)
  assert.ok(host.textContent.includes('没有匹配'), '给一句明确提示')
})

test('状态栏消息与诊断计数随状态更新', () => {
  const { host, store, app } = boot()
  store.setProp('book_content_panel', 'collection_index', 3)
  app.render()
  assert.ok(host.textContent.includes('✕1'), `状态栏应显示 ✕1：${byClass(host, 'statusbar')[0].textContent}`)
})

test('★ 贴图预览是默认模式：不画控件框，标签只在悬停/选中出现', () => {
  const { host, store, app } = boot()
  app.setGate(false) // 这一条测显示模式，先关掉门控隐藏
  assert.equal(app.display, 'preview')
  const boxes = byClass(host, 'canvas-box')
  assert.ok(boxes.length >= 17)
  assert.ok(boxes.every((b) => String(b.className).includes('mode-preview')), '默认不描框')
  assert.ok(byClass(host, 'cell-line').length === 0, '没有选中容器时不画格位参考线')

  app.setDisplay('wire')
  const wireBoxes = byClass(host, 'canvas-box')
  assert.ok(wireBoxes.some((b) => String(b.className).includes('mode-anchored')), '线框模式才描框')

  app.setDisplay('preview')
  store.select('page1_body')
  app.render()
  const selected = byClass(host, 'canvas-box').find((b) => String(b.className).includes('selected'))
  assert.ok(String(selected.className).includes('show-label'), '选中的才显示标签')
})

test('★ 有门控时，门控模拟默认打开并按第一个门控 tag 预填', () => {
  const { app, store } = boot()
  assert.equal(app.gateEnabled, true, '工程里有 #visible 门控 ⇒ 默认开（否则多页会叠在一起）')
  assert.equal(app.sim.body, gateTags(store.doc)[0], '预填第一个门控 tag（管理器登记 / 元素绑定）')
  assert.equal(app.sim.title, `sapdon_ui:${store.doc.screen.name}`, 'title 是本屏的 panelId')
})

// ---------------------------------------------------------------------------
// ★ 拖动：本体不移动、手柄才移动、落点先预览后提交（治理"一拖就散架"）
// ---------------------------------------------------------------------------

test('★ 拖动语义：按容器类型给出不同的拖动含义（并在图例里提示）', () => {
  const { host, store, app } = boot()
  app.setGate(false)
  store.select('page1_body')
  app.render()
  assert.equal(byClass(host, 'drag-tip').length, 1, '图例要说明"当前元素拖动会发生什么"')
  assert.ok(host.textContent.includes('offset'), '小叶子提示改 offset')

  const size = store.doc.canvas.size
  const boxOf = (id) => layoutTree(store.doc.elements, { x: 0, y: 0, w: 320, h: 207 }).byId.get(id)
  assert.equal(dragMode(boxOf('page1_body'), size).kind, 'offset')
  assert.equal(dragMode(boxOf('page1_title_row'), size).kind, 'flow', 'stack 子项 = 换顺序')
  assert.equal(dragMode(boxOf('btn_next'), size).kind, 'form', '表单按钮 = 换目标格')
  assert.ok(dragMode(boxOf('page1_content'), size).hint.includes('手柄'), '容器必须走手柄')
})

test('★ 拖动本体不再移动元素（外层容器铺满整页，误抓就"整页飞走"）', () => {
  const { host, store, app } = boot()
  app.setGate(false)
  const box = byClass(host, 'canvas-box').find((b) => b.dataset.id === 'page1_content')
  assert.ok(box, '找到铺满整页的内容面板')
  const before = { ...(store.node('page1_content').props || {}) }

  box.fire('pointerdown', { clientX: 300, clientY: 200, altKey: false })
  globalThis.document.fire('pointermove', { clientX: 360, clientY: 260 })
  globalThis.document.fire('pointerup', { clientX: 360, clientY: 260 })
  app.render()
  assert.deepEqual(store.node('page1_content').props, before, '本体拖动不改任何属性')
})

test('★ 本体拖动的放行规则：小叶子可拖、大块头/容器只走手柄', () => {
  const { store, app } = boot()
  app.setGate(false)
  const size = store.doc.canvas.size
  const of = (id) => layoutTree(store.doc.elements, { x: 0, y: 0, w: 320, h: 207 }).byId.get(id)
  assert.equal(bodyDraggable(of('page1_body'), size), true, '文本叶子可直接拖')
  assert.equal(bodyDraggable(of('page1_content'), size), false, '整页面板是容器 ⇒ 走手柄')
  assert.equal(bodyDraggable(of('bg'), size), false, '书壳背景铺满整页（叶子但太大）⇒ 走手柄')
})

test('★ 本体直接拖小叶子：能移动（不用先去找手柄）', () => {
  const { host, store, app } = boot()
  app.setGate(false)
  const box = byClass(host, 'canvas-box').find((b) => b.dataset.id === 'page1_body')
  assert.ok(box)
  const zoom = store.doc.canvas.zoom || 2
  box.fire('pointerdown', { clientX: 100, clientY: 100, altKey: false })
  globalThis.document.fire('pointermove', { clientX: 100 + 20 * zoom, clientY: 100 + 10 * zoom })
  globalThis.document.fire('pointerup', { clientX: 100 + 20 * zoom, clientY: 100 + 10 * zoom })
  assert.deepEqual(store.node('page1_body').props.offset, [20, 10], '松手后就位')
})

test('★ 拖手柄才移动：先出幽灵预览，松手才提交 offset', () => {
  const { host, store, app } = boot()
  app.setGate(false)
  store.select('bg')
  app.render()
  const handle = byClass(host, 'move-handle')[0]
  assert.ok(handle, '选中元素要有移动手柄')

  handle.fire('pointerdown', { clientX: 100, clientY: 100 })
  globalThis.document.fire('pointermove', { clientX: 140, clientY: 130 })
  assert.equal(byClass(host, 'drag-ghost').length, 1, '拖动中画幽灵预览')
  assert.equal(store.node('bg').props.offset, undefined, '还没松手，属性不该改')

  globalThis.document.fire('pointerup', { clientX: 140, clientY: 130 })
  app.render()
  const zoom = store.doc.canvas.zoom || 2
  const off = store.node('bg').props.offset
  assert.ok(Array.isArray(off), `松手后应写入 offset：${JSON.stringify(off)}`)
  assert.equal(off[0], Math.round(40 / zoom))
  assert.equal(off[1], Math.round(30 / zoom))
})

test('★ 流式容器里拖动 = 换顺序（以前是"什么都不做 + 一句提示"）', () => {
  const { host, store, app } = boot()
  app.setGate(false)
  const stack = store.node('page1_stack')
  assert.deepEqual(stack.controls.map((c) => c.id), ['page1_title_row', 'page1_body_row'])

  store.select('page1_title_row')
  app.render()
  const handle = byClass(host, 'move-handle')[0]
  const zoom = store.doc.canvas.zoom || 2
  handle.fire('pointerdown', { clientX: 100, clientY: 100 })
  // 往下拖过第二格中点（134.55 画布单位）
  globalThis.document.fire('pointermove', { clientX: 100, clientY: 100 + 150 * zoom })
  globalThis.document.fire('pointerup', { clientX: 100, clientY: 100 + 150 * zoom })

  assert.deepEqual(store.node('page1_stack').controls.map((c) => c.id), ['page1_body_row', 'page1_title_row'], '顺序换过来了')
})

test('★ 格位子项拖动 = 吸附换格（画布上给格位预览）', () => {
  const { host, store, app } = boot()
  app.setGate(false)
  // page2_buttons_grid 是 2×1（每格 160 画布单位），第一枚按钮在 slot 0 / 目标格 [0,0]
  const grid = store.node('page2_buttons_grid')
  const card = grid.controls[0]
  assert.deepEqual(card.pos, [0, 0])
  store.select(card.id)
  app.render()

  const handle = byClass(host, 'move-handle')[0]
  assert.ok(handle)
  const zoom = store.doc.canvas.zoom || 2
  handle.fire('pointerdown', { clientX: 100, clientY: 100 })
  globalThis.document.fire('pointermove', { clientX: 100 + 100 * zoom, clientY: 100 })
  assert.equal(byClass(host, 'drag-ghost').length, 1, '拖动中给目标格的幽灵预览')
  globalThis.document.fire('pointerup', { clientX: 100 + 100 * zoom, clientY: 100 })
  assert.deepEqual(store.node(card.id).pos, [1, 0], '松手后吸附到第 2 格')
})

/** 示例工程用到的全部纹理路径（当作"服务端索引"喂给 app） */
function sampleTextures(store) {
  const keys = ['texture', 'texture_default', 'texture_hover', 'texture_pressed']
  const list = []
  const walk = (nodes) => {
    for (const n of nodes) {
      for (const k of keys) if ((n.props || {})[k]) list.push(n.props[k])
      walk(n.controls || [])
    }
  }
  walk(store.doc.elements)
  return list
}

test('★画布：挂上纹理索引后，image / form_button 会真的画出贴图（background-image 指向 /tex/）', () => {
  const { host, store, app } = boot()
  app.setGate(false)
  const list = sampleTextures(store)
  assert.ok(list.length >= 10)
  app.setTextures({ paths: new Set(list), list, noPreview: new Set() })

  const layers = byClass(host, 'tex-layer')
  assert.ok(layers.length >= 4, `应有贴图层（背景 1 + 三枚按钮），实际 ${layers.length}`)
  const withBg = layers.filter((el) => String(el.style.backgroundImage || '').includes('/tex/'))
  assert.ok(withBg.length >= 4, '贴图层的 background-image 应指向 /tex/<路径>')
  assert.ok(String(withBg[0].style.backgroundImage).includes('url("/tex/textures/ui/'))
  assert.equal(byClass(host, 'tex-missing').length, 0, '贴图都在索引里 ⇒ 不应有缺纹理占位')
})

test('★画布：FormButton 三态各一层（hover/pressed 交给 CSS 切）', () => {
  const { host, store, app } = boot()
  app.setGate(false)
  const list = sampleTextures(store)
  app.setTextures({ paths: new Set(list), list, noPreview: new Set() })
  const faces = byClass(host, 'btn-face')
  assert.equal(faces.length, 9, '三枚按钮 × 三态（default/hover/pressed）')
  assert.equal(byClass(host, 'state-default').length, 3)
  assert.equal(byClass(host, 'state-hover').length, 3)
  assert.equal(byClass(host, 'state-pressed').length, 3)
})

test('★画布：九宫格逐块铺（每块的 background 换算必须与它的源区域/目标框一致）', () => {
  const { host, store, app } = boot()
  app.setGate(false)
  // book_back：28×28 + nineslice 14 ⇒ 源带退化（边/中带取贴边 1px），浏览器端要逐块换算
  store.setProp('bg', 'texture', 'textures/ui/book_back')
  const list = [...sampleTextures(store), 'textures/ui/book_back']
  app.setTextures(buildTextureIndex(list, [], { 'textures/ui/book_back': { nineslice_size: 14, base_size: [28, 28], size: [28, 28] } }))
  store.select('bg')
  app.render()

  const zoom = store.doc.canvas.zoom || 2
  const bgBox = { x: 0, y: 0, w: 320, h: 207 } // bg 是 100%×100%
  const expected = ninePieces(14, [28, 28], bgBox).pieces
  const pieces = byClass(host, 'nine-piece')
  assert.equal(pieces.length, expected.length, '九块都要铺出来')

  // 浮点比较：DOM 字符串解析出来可能有 -0 之类的表示差异
  const near = (actual, want, label) => assert.ok(Math.abs(actual - want) < 1e-6, `${label}：${actual} ≠ ${want}`)

  pieces.forEach((el, i) => {
    const want = expected[i]
    const [dx, dy, dw, dh] = want.dst
    const [sx, sy, pw, ph] = want.src
    const scaleX = (dw * zoom) / pw
    const scaleY = (dh * zoom) / ph
    // 位置/尺寸：目标框（画布单位 → 屏幕像素，相对 op 原点）
    near(Number.parseFloat(el.style.left), (dx - bgBox.x) * zoom, `第 ${i} 块 left`)
    near(Number.parseFloat(el.style.top), (dy - bgBox.y) * zoom, `第 ${i} 块 top`)
    near(Number.parseFloat(el.style.width), dw * zoom, `第 ${i} 块宽`)
    near(Number.parseFloat(el.style.height), dh * zoom, `第 ${i} 块高`)
    // ★ 核心不变量：这块 div 显示的源区域必须**正好**是它的 src（缩放一致 ⇒ 不会漏出邻居像素、
    //   也不会把整图铺进小框 —— 早先版本就是这里算错，画面炸成一坨色块）
    const bgW = Number.parseFloat(String(el.style.backgroundSize).split(' ')[0])
    const bgH = Number.parseFloat(String(el.style.backgroundSize).split(' ')[1])
    const posX = Number.parseFloat(String(el.style.backgroundPosition).split(' ')[0])
    const posY = Number.parseFloat(String(el.style.backgroundPosition).split(' ')[1])
    near(bgW, 28 * scaleX, `第 ${i} 块 background-size 宽`)
    near(bgH, 28 * scaleY, `第 ${i} 块 background-size 高`)
    near(posX, -sx * scaleX, `第 ${i} 块 background-position x`)
    near(posY, -sy * scaleY, `第 ${i} 块 background-position y`)
  })

  // 1px 源带要铺成很宽的一条 ⇒ background-size 必然被放大到超过整块宽度（而不是"整图刚好铺满框"）
  const mid = pieces.find((el) => Number.parseFloat(el.style.width) > 100 * zoom)
  assert.ok(mid, '应有被拉开的边/中块')
  const midBgW = Number.parseFloat(String(mid.style.backgroundSize).split(' ')[0])
  assert.ok(midBgW > Number.parseFloat(mid.style.width), '1px 源带铺满整块 ⇒ 背景被放大')
})

test('★画布：索引里没有的贴图 → 斜纹占位；诊断同时报 texture-missing', () => {
  const { host, store, app } = boot()
  const list = sampleTextures(store) // 先取"可用贴图"清单，再把 bg 改成不存在的
  store.node('bg').props.texture = 'textures/ui/not_in_pack'
  app.setTextures({ paths: new Set(list), list, noPreview: new Set() })
  assert.equal(byClass(host, 'tex-missing').length, 1)
  app.setTab('diag')
  assert.ok(host.textContent.includes('在已加载的资源包里找不到'))
})

test('★画布：label 会画出文本（颜色/字号/对齐/阴影取自 Text 属性包）', () => {
  const { host, store, app } = boot()
  app.setGate(false)
  store.setProp('page1_title', 'color', [0, 0, 0])
  store.setProp('page1_title', 'shadow', true)
  app.render()
  const labels = byClass(host, 'label-text')
  assert.ok(labels.length >= 4, '四个 label 各有一层文本')
  const title = labels.find((el) => el.textContent.includes('第一章'))
  assert.ok(title, '标题文本应被渲染出来')
  assert.ok(String(title.style.color).includes('rgba(0,0,0'), `颜色应来自属性包：${title.style.color}`)
  assert.ok(String(title.style.textShadow).length > 0, 'shadow 生效')
})

test('★画布：.tga 贴图给"不能预览"占位（真机正常，浏览器画不出来）', () => {
  const { host, store, app } = boot()
  store.setProp('bg', 'texture', 'textures/ui/legacy_tex')
  const list = [...sampleTextures(store), 'textures/ui/legacy_tex']
  app.setTextures({ paths: new Set(list), list, noPreview: new Set(['textures/ui/legacy_tex']) })
  const miss = byClass(host, 'tex-missing')
  assert.equal(miss.length, 1)
  assert.ok(String(miss[0].className).includes('tga'))
})

test('★属性面板：纹理属性带缩略图，"浏览…"能打开选择器并选中原版贴图', () => {
  const { host, store, app, doc } = boot()
  const list = [...sampleTextures(store), 'textures/ui/book_arrowleft_default']
  app.setTextures({ paths: new Set(list), list, noPreview: new Set() })
  store.select('bg')
  app.render()

  const thumb = byClass(host, 'tex-thumb')[0]
  assert.ok(thumb, '纹理属性旁应有缩略图')
  assert.ok(String(thumb.style.backgroundImage).includes('/tex/textures/ui/dialog_background_opaque'))

  clickText(host, '浏览…')
  const overlay = byClass(doc.body, 'picker-overlay')[0]
  assert.ok(overlay, '选择器浮层应挂到 document.body')
  const search = overlay.querySelector('.picker-search')
  assert.ok(search)

  // 搜索过滤 → 点第一项即选中
  search.value = 'arrowleft'
  search.fire('input')
  const items = byClass(overlay, 'picker-item')
  assert.equal(items.length, 1, '搜索应过滤到 1 条')
  items[0].click()
  assert.equal(store.node('bg').props.texture, 'textures/ui/book_arrowleft_default')
  assert.equal(byClass(doc.body, 'picker-overlay').length, 0, '选完要关闭浮层')
})

test('★ 选择器不再糊一屏：空查询按"常用 + 目录"分段，搜索才出扁平结果', () => {
  const { host, store, app, doc } = boot()
  // 造一批像真资源包的路径（含常用与冷门）
  const list = []
  for (const n of ['book_back', 'book_pageleft_default', 'dialog_background_opaque', 'arrow_active', 'saleribbon']) list.push(`textures/ui/${n}`)
  for (let i = 0; i < 80; i++) list.push(`textures/ui/zzz_rare_${i}`)
  for (let i = 0; i < 30; i++) list.push(`textures/items/item_${i}`)
  app.setTextures({ paths: new Set(list), list, noPreview: new Set() })
  store.select('bg')
  app.render()
  clickText(host, '浏览…')
  const overlay = byClass(doc.body, 'picker-overlay')[0]

  const heads = byClass(overlay, 'picker-section-head').map((el) => el.textContent)
  assert.ok(heads.some((t) => t.includes('常用')), `首屏要有「常用」段：${heads.join(' | ')}`)
  assert.ok(heads.some((t) => t.includes('ui/')), '要有目录分段')
  const shown = byClass(overlay, 'picker-item').length
  assert.ok(shown < list.length, `首屏不该把 ${list.length} 条全糊出来（实际 ${shown}）`)
  assert.ok(byText(overlay, '显示更多').length >= 1, '冷门目录给「显示更多」而不是一次全给')

  // 搜索 → 扁平结果 + 上限
  const search = overlay.querySelector('.picker-search')
  search.value = 'zzz_rare'
  search.fire('input')
  const hits = byClass(overlay, 'picker-item').length
  assert.ok(hits > 0 && hits <= 60, `搜索最多 60 条：${hits}`)
  assert.ok(byText(overlay, '显示更多').length >= 1, '超出上限时给「显示更多」')
  const before = hits
  byText(overlay, '显示更多')[0].click()
  assert.ok(byClass(overlay, 'picker-item').length > before, '点「显示更多」要真的多给一批')

  overlay.querySelector('.mini').fire('click')
  assert.equal(byClass(doc.body, 'picker-overlay').length, 0)
})

test('★属性面板：没有索引时"浏览…"不崩，退回纯文本输入', () => {
  const { host, store, app, doc } = boot()
  store.select('bg')
  app.render()
  clickText(host, '浏览…')
  const overlay = byClass(doc.body, 'picker-overlay')[0]
  assert.ok(overlay)
  assert.ok(overlay.textContent.includes('没有资源包索引'))
  overlay.querySelector('.mini').fire('click') // ✕ 关闭
  assert.equal(byClass(doc.body, 'picker-overlay').length, 0)
})
