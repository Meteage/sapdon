/**
 * 对象树（Sapdon UI Designer）—— Qt Designer 的 Object Inspector 对应物
 *
 * 层级 = `controls` 嵌套；格子子项额外显示 `grid_position`，表单按钮额外显示槽位/落点
 * （"槽位序号 ≠ 视觉序号"这条坑在树上直接可见，见 AGENTS.md 手册踩坑）。
 *
 * UX 取舍（2026-09 用户反馈"用起来不太舒服"后调整）：
 *   · 行内操作按钮（↑↓⇥⇤✕）**只在悬停/选中时出现**，平时整行只有「类型 + id」，79 个元素也能扫得动
 *   · 顶部带**筛选框**（按 id/type 过滤，保留命中项的祖先，层级不丢）；筛选时忽略折叠 —— 找到元素优先
 *   · 刚加入/刚定位到的元素会**高亮一下**（`reveal`），不用自己找
 *   · 容器行带 ▼/▶ 折叠开关（2026-10）：折叠状态记在 localStorage，换工程后失效的 id 自动忽略；
 *     reveal / 点选画布会把祖先链自动展开，否则"点了半天树上没动静"
 */

import { h, render } from './dom.js'
import { flatten } from '../model.js'
import { isContainer, widgetFor } from '../catalog.js'

const COLLAPSE_KEY = 'sapdon-designer:tree-collapsed'

export function renderTree(host, app) {
  const { store } = app
  const rows = flatten(store.doc)
  const filter = String(app.treeFilter || '').trim().toLowerCase()
  const byId = new Map(rows.map((r) => [r.node.id, r]))

  // 折叠状态：懒加载（首帧从 localStorage 恢复；恢复出来的 id 若已不存在，查询时自然落空）
  if (!app.treeCollapsed) app.treeCollapsed = loadCollapsed(app)

  // reveal / 选中项**变化时**展开祖先链；选中没变就不重复展开 ——
  // 否则用户刚收起的分支会被下一次渲染又撑开（「全收」也会被当前选中项顶回来）
  expandAncestorsOf(app, byId, app.revealId)
  if (store.selection !== app.treeExpandedFor) {
    expandAncestorsOf(app, byId, store.selection)
    app.treeExpandedFor = store.selection
  }

  const isUnderCollapsed = (r) => {
    let p = r.parentId
    while (p) {
      if (app.treeCollapsed.has(p)) return true
      p = byId.get(p) ? byId.get(p).parentId : null
    }
    return false
  }

  // 筛选：命中的行 + 它们的祖先都要留下（否则看不出层级）；此时忽略折叠
  let visible = rows
  if (filter) {
    const keep = new Set()
    for (const r of rows) {
      const hit = r.node.id.toLowerCase().includes(filter) || r.node.type.toLowerCase().includes(filter)
      if (!hit) continue
      keep.add(r.node.id)
      let p = r.parentId
      while (p) {
        keep.add(p)
        p = byId.get(p) ? byId.get(p).parentId : null
      }
    }
    visible = rows.filter((r) => keep.has(r.node.id))
  } else {
    visible = rows.filter((r) => !isUnderCollapsed(r))
  }

  const body = h('div', { class: 'tree-body' })

  for (const { node, depth, parentId } of visible) {
    const parent = parentId ? store.node(parentId) : null
    const w = widgetFor(node.type)
    const isSel = store.selection === node.id
    const coSel = !isSel && Array.isArray(store.selectedIds) && store.selectedIds.includes(node.id)
    const kids = (node.controls || []).length
    const collapsed = app.treeCollapsed.has(node.id)
    const extras = []
    if (parent && parent.type === 'grid' && Array.isArray(node.gridPosition)) extras.push(`gp[${node.gridPosition.join(',')}]`)
    if (parent && parent.type === 'form_button_grid') extras.push(`slot ${node.slot ?? 0}${node.pos && (node.pos[0] || node.pos[1]) ? ` pos[${node.pos.join(',')}]` : ''}`)
    if (node.template) extras.push(`@${node.template}`)
    if (node.props && node.props.layer) extras.push(`L${node.props.layer}`)
    // 非视觉对象：多页管理器把「页数 + 容器」摆在行上，一眼看得出它管着什么
    if (node.type === 'page_panel_manage') {
      extras.push(`${(node.pages || []).length} 页`)
      if (node.props && node.props.container) extras.push(`→ ${node.props.container}`)
    }

    const row = h(
      'div',
      {
        class: `tree-row${isSel ? ' selected' : ''}${coSel ? ' co-selected' : ''}${isContainer(node.type) ? ' container' : ''}${app.revealId === node.id ? ' flash' : ''}`,
        style: { paddingLeft: `${6 + depth * 13}px` },
        dataset: { id: node.id },
        title: `${node.type}${w && w.hint ? ` — ${w.hint}` : ''}\n双击 id 改名`,
        onclick: (e) => store.select(node.id, { add: !!(e && (e.ctrlKey || e.metaKey)), range: !!(e && e.shiftKey) }),
        ondblclick: () => app.renameNode(node.id),
      },
      // 折叠开关：只有容器行有；点它不选行（stopPropagation）
      h('span', {
        class: `tree-arrow${kids ? '' : ' leaf'}${collapsed ? ' closed' : ''}`,
        text: kids ? (collapsed ? '▶' : '▼') : '',
        title: kids ? (collapsed ? `展开（${kids} 个子项）` : '收起') : '',
        onclick: kids
          ? (e) => {
              e.stopPropagation()
              if (collapsed) app.treeCollapsed.delete(node.id)
              else app.treeCollapsed.add(node.id)
              saveCollapsed(app)
              renderTree(host, app)
            }
          : null,
      }),
      h('span', { class: 'tree-type', text: node.type }),
      h('span', { class: 'tree-id', text: node.id, ondblclick: (e) => { e.stopPropagation(); app.renameNode(node.id) } }),
      extras.length ? h('span', { class: 'tree-extra', text: extras.join(' ') }) : null,
      h(
        'span',
        { class: 'tree-actions' },
        btn('↑', '上移', () => store.nudge(node.id, -1)),
        btn('↓', '下移', () => store.nudge(node.id, 1)),
        btn('⇥', '缩进（成为前一个兄弟的子项）', () => store.indent(node.id)),
        btn('⇤', '反缩进', () => store.outdent(node.id)),
        btn('✕', '删除', () => app.removeNode(node.id)),
      ),
    )
    if (app.revealId === node.id && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' })
    body.appendChild(row)
  }

  if (!visible.length) body.appendChild(h('div', { class: 'muted pad', text: filter ? `没有匹配「${app.treeFilter}」的元素` : '工程里还没有元素：点左侧控件箱加一个' }))

  const rerender = () => renderTree(host, app)
  const filterInput = h('input', {
    type: 'text',
    class: 'tree-filter',
    placeholder: '筛选 id / 类型…',
    value: app.treeFilter || '',
    oninput: (e) => {
      app.treeFilter = e.target.value
      const top = body.scrollTop
      renderTree(host, app)
      const el = host.querySelector ? host.querySelector('.tree-body') : null
      if (el) el.scrollTop = top
      const inp = host.querySelector ? host.querySelector('.tree-filter') : null
      if (inp && inp.focus) {
        inp.focus()
        inp.setSelectionRange && inp.setSelectionRange(inp.value.length, inp.value.length)
      }
    },
  })

  render(host, [
    h(
      'div',
      { class: 'pane-head' },
      h('span', { text: `对象树（${visible.length}${filter || app.treeCollapsed.size ? ` / ${rows.length}` : ''}）` }),
      h('span', { class: 'spacer' }),
      h('button', {
        class: 'mini ghost',
        text: '全展',
        title: '展开全部',
        onclick: () => {
          app.treeCollapsed.clear()
          saveCollapsed(app)
          rerender()
        },
      }),
      h('button', {
        class: 'mini ghost',
        text: '全收',
        title: '收起所有容器（只留根层）',
        onclick: () => {
          for (const r of rows) if ((r.node.controls || []).length) app.treeCollapsed.add(r.node.id)
          saveCollapsed(app)
          rerender()
        },
      }),
    ),
    h('div', { class: 'pane-toolbar tight' }, filterInput),
    body,
    h('div', { class: 'pane-foot muted', text: '双击 id 改名 · ▼/▶ 折叠 · ⇥/⇤ 改层级 · ↑/↓ 改顺序（操作按钮悬停时出现）' }),
  ])
}

/** 把 id 的祖先链上所有折叠状态展开（没有这个 id 就什么都不做） */
function expandAncestorsOf(app, byId, id) {
  if (!id) return
  let r = byId.get(id)
  let p = r ? r.parentId : null
  while (p) {
    if (app.treeCollapsed.delete(p)) saveCollapsed(app)
    p = byId.get(p) ? byId.get(p).parentId : null
  }
}

function loadCollapsed(app) {
  try {
    const raw = app.layout && app.layout.get ? app.layout.get(COLLAPSE_KEY) : null
    const parsed = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

function saveCollapsed(app) {
  try {
    if (app.layout && app.layout.set) app.layout.set(COLLAPSE_KEY, JSON.stringify([...app.treeCollapsed]))
  } catch {
    /* 存不了就算了：折叠不是关键数据 */
  }
}

function btn(text, title, onclick) {
  return h('button', { class: 'mini ghost', text, title, onclick: (e) => { e.stopPropagation(); onclick() } })
}
