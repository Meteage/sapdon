// 容器 UI 产物断言（`node tests/container-ui-output.test.mjs`）
//
// 在 Node 里**真跑一遍构建后的 prod core**（`prod/core/index.js`），构造一个含 4 个槽
// （2 input + 1 output + 1 display，带面板背景与每格变量覆盖）的 `ContainerUISystem`，
// 把 `UISystem.toObject()` 的结果当产物逐条断言：
//   1. 每个 slot 对应且仅对应一个 grid_position，映射一一对应且可预测；
//   2. output / display 槽内层控件**缺省**含 `"enabled": false`（显式 `enabled` 可覆盖），
//      且**全产物不存在 `enable` 这个键**；
//   3. input 槽**不含** `enabled` 键（文档口径：input 一律不写该键，继承原版默认 true）；
//   4. 面板背景控件存在，每格覆盖的变量真的出现在产物里；
//   5. `addControl(el, pos)` 真的挂进主面板并带定位（`addElementToMain` 的历史空挂已修）；
//   6. 连续两次 `ChestUISystem.registerContainerUI` 不产生重复元素、两条 gate 并存；
//   7. 产物确实来自**新**代码（用新代码独有的字符串字面量做存在性断言，防「rollup 9/9 成功但 prod 是旧的」）。
//   8. `addProgressSlot` 的产物形状：overlay 控件 + 三个注入变量 + **取反**的比例绑定（见 §4.12）。
//   9. ★ 显式 `enabled` 覆盖 `kind` 的**缺省**门控（产物格要能取出 ⇒ 见 §4.14；缺省行为不变）。
//
// ⚠️ 不要用 `node --test`（受限环境 fork 会 EPERM），直接 `node tests/container-ui-output.test.mjs`。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const { ContainerUISystem, ChestUISystem, Label, Text } = await import('../prod/core/index.js')

// ── 小工具 ────────────────────────────────────────────────────────────────────

/** 递归收集所有对象键名 */
function collectKeys(value, out = []) {
  if (Array.isArray(value)) {
    for (const v of value) collectKeys(v, out)
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      out.push(k)
      collectKeys(v, out)
    }
  }
  return out
}

/** 递归找目标键，返回所有命中的 JSON 路径（便于失败时定位） */
function findKeyPaths(value, target, path = '$', out = []) {
  if (Array.isArray(value)) {
    value.forEach((v, i) => findKeyPaths(v, target, `${path}[${i}]`, out))
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (k === target) out.push(`${path}.${k}`)
      findKeyPaths(v, target, `${path}.${k}`, out)
    }
  }
  return out
}

/** 取根面板下挂着的网格控件 */
function gridOf(root) {
  const holder = root.controls.find((c) => c.grids)
  assert.ok(holder, '根面板里应有 grids 控件')
  return holder.grids
}

/** 把网格的硬编码格位摊平成 [{ name, body, grid_position, innerName, inner }] */
function cellsOf(grid) {
  return grid.controls.map((entry) => {
    const [name, body] = Object.entries(entry)[0]
    const [innerName, inner] = Object.entries(body.controls[0])[0]
    return { name, body, grid_position: body.grid_position, innerName, inner }
  })
}

/** 构造探针界面：4 个槽 + 面板背景 + 每格覆盖 */
function buildProbe() {
  const ui = new ContainerUISystem('sapdon_probe:container_probe', 'ui/')
  ui.setPanel({ size: [256, 192], background: { texture: 'textures/ui/probe_panel', nineslice_size: 4 } })
  ui.setTitle('探针面板')
  ui.setGridOrigin([8, 8])
  ui.addSlot({ slot: 0, pos: [8, 8], kind: 'input', cellSize: 20 })
  ui.addSlot({ slot: 1, pos: [28, 26], kind: 'input', itemRenderer: { size: [16, 16], offset: [0, 2] } })
  ui.addSlot({ slot: 2, pos: [60, 44], kind: 'output', background: 'textures/ui/probe_slot' })
  ui.addSlot({ slot: 3, pos: [82, 98], kind: 'display', cellSize: 30, background: { texture: 'textures/ui/probe_bar', nineslice_size: 2 } })
  return ui
}

const probe = buildProbe()
const json = probe.system.toObject()
const root = json.container_root_panel
const grid = gridOf(root)
const cells = cellsOf(grid)
const innerOf = (index) => cells[index].inner

// ── 0. 产物来自新代码 ─────────────────────────────────────────────────────────

test('prod/core/index.js 含新代码独有的字面量（防「prod 是旧的」）', async () => {
  const [prod, dts] = await Promise.all([
    readFile(new URL('../prod/core/index.js', import.meta.url), 'utf8'),
    readFile(new URL('../prod/core/index.d.ts', import.meta.url), 'utf8'),
  ])
  assert.ok(prod.includes('slot_background_'), 'prod/core/index.js 缺 slot_background_ 前缀')
  assert.ok(prod.includes('既没有 pos 也没有 offset'), 'prod/core/index.js 缺槽位校验文案')
  assert.ok(prod.includes('A-Z a-z 0-9 _ -'), 'prod/core/index.js 缺门控键护栏文案')
  assert.ok(prod.includes('addSlot'), 'prod/core/index.js 缺 addSlot')
  assert.ok(prod.includes('addProgressSlot'), 'prod/core/index.js 缺 addProgressSlot')
  for (const name of [
    'addSlot', 'setPanel', 'setGridOrigin', 'setSlotDefaults', 'addControl', 'addProgressSlot',
    'ProgressSlotOptions', 'ProgressClipDirection',
    'setOutputSlots', 'resolveSlot', 'slotToGridPosition', 'posToOffset', 'validateSlotSpec',
  ]) {
    assert.ok(dts.includes(name), `prod/core/index.d.ts 缺 ${name} 声明`)
  }
  assert.equal(dts.includes('setItemMatrix'), false, 'prod/core/index.d.ts 不该再有 setItemMatrix')
  // `enabled` 覆盖规则（2026-09-12）：文档文案只存在于新版 d.ts ⇒ 顺带当「prod 是新的」判据
  assert.ok(dts.includes('给了就以此为准'), 'prod/core/index.d.ts 缺 enabled 覆盖规则的文案（prod 可能是旧的）')
})

// ── 1. slot ↔ grid_position 一一对应 ──────────────────────────────────────────

test('4 个槽各生成 1 个格位，且 slot → grid_position 是一一对应的 [0, slot]', () => {
  assert.equal(cells.length, 4)
  const positions = cells.map((c) => c.grid_position)
  assert.deepEqual(positions, [[0, 0], [0, 1], [0, 2], [0, 3]])

  const declared = [0, 1, 2, 3]
  const seen = new Set()
  declared.forEach((slot, i) => {
    assert.deepEqual(positions[i], [0, slot], `槽 ${slot} 应落在 [0, ${slot}]`)
    const key = positions[i].join(',')
    assert.equal(seen.has(key), false, `格位 ${key} 被两个槽共用`)
    seen.add(key)
  })
  assert.equal(seen.size, declared.length)

  // 每个格位面板里**只**有一个内层控件，且都挂 `chest.chest_grid_item` 模板
  for (const cell of cells) {
    assert.deepEqual(Object.keys(cell.body.controls[0]), ['grid_item@chest.chest_grid_item'])
    assert.equal(cell.body.controls.length, 1)
  }
})

test('grid_dimensions 由已声明槽位自动推导为 [1, 4]（未显式 setGridDimension）', () => {
  assert.deepEqual(grid.grid_dimensions, [1, 4])
  assert.equal(grid.grid_item_template, 'chest.chest_grid_item')
  assert.equal(grid.collection_name, 'container_items')
})

test('网格按 setGridOrigin 绝对定位，尺寸取**统一格位**（不是逐槽最大值）', () => {
  assert.deepEqual(grid.offset, [8, 8])
  assert.equal(grid.anchor_from, 'top_left')
  assert.equal(grid.anchor_to, 'top_left')
  // 探针没调 setSlotDefaults ⇒ 统一格位 = 标定表 18×18：列数 1 × 18 = 18；行数 4 × 18 = 72
  // （逐槽 cellSize 20/30 只改视觉尺寸，不参与网格几何 —— 见 known-pitfalls §4.11）
  assert.deepEqual(grid.size, [18, 72])
})

// ── 2 / 3. enabled 标志位 ─────────────────────────────────────────────────────

test('output / display 槽的内层控件写 "enabled": false', () => {
  assert.equal(innerOf(2).enabled, false, 'output 槽应写 enabled:false')
  assert.equal(innerOf(3).enabled, false, 'display 槽应写 enabled:false')
  assert.equal('enabled' in innerOf(2), true)
  assert.equal('enabled' in innerOf(3), true)
})

test('input 槽**不含** enabled 键（继承原版默认 true）', () => {
  assert.equal('enabled' in innerOf(0), false)
  assert.equal('enabled' in innerOf(1), false)
})

test('整个产物里不存在 enable 这个键（框架曾经的拼写错误）', () => {
  const paths = findKeyPaths(json, 'enable')
  assert.deepEqual(paths, [], `产物里出现 enable 键：${paths.join(', ')}`)
  // 文本层再兜一道：`"enable":`（不是 `"enabled":`）一次都不该出现
  const text = JSON.stringify(json)
  assert.equal(/"enable"\s*:/.test(text), false)
  assert.ok(/"enabled"\s*:/.test(text), 'output / display 槽的 enabled 标志位应真的写进了产物')
})

// ── 2b. ★ 显式 `enabled` 覆盖 `kind` 的缺省门控（2026-09-12）──────────────────
//
// 来历：`enabled: false` 在真机上是**整体禁用这一格** —— 连「把产物取出来」都会被拦
// （fz-sapdon 回收机的输出槽就是这么被卡住的，见 known-pitfalls §4.14）。
// 所以 `output` / `display` 的 false 必须只是**缺省**，显式值一律优先。

let enabledProbeSeq = 0

/** 只声明一个槽，返回它内层控件的 `enabled`（`undefined` = 产物里根本没有这个键） */
function enabledOfOpenSlot(spec) {
  // 每次换一个 UI 名：同名重复注册会让门控条件逐条累加（见本文件后面那条测试）
  const ui = new ContainerUISystem(`sapdon_probe:enabled_probe_${enabledProbeSeq++}`, 'ui/')
  ui.addSlot(spec)
  const inner = cellsOf(gridOf(ui.system.toObject().container_root_panel))[0].inner
  return 'enabled' in inner ? inner.enabled : undefined
}

test('★ 显式 enabled 覆盖 kind 的缺省门控：产物格可写成「output + enabled:true」', () => {
  // 缺省行为一个字没变（既有项目产物不受影响）
  assert.equal(enabledOfOpenSlot({ slot: 0, pos: [0, 0], kind: 'output' }), false, 'output 缺省仍是 false')
  assert.equal(enabledOfOpenSlot({ slot: 0, pos: [0, 0], kind: 'display' }), false, 'display 缺省仍是 false')
  assert.equal(enabledOfOpenSlot({ slot: 0, pos: [0, 0], kind: 'input' }), undefined, 'input 缺省不写该键')
  assert.equal(enabledOfOpenSlot({ slot: 0, pos: [0, 0] }), undefined, 'kind 缺省 = input ⇒ 不写该键')

  // 显式值优先（三个 kind 都能被推翻）
  assert.equal(enabledOfOpenSlot({ slot: 0, pos: [0, 0], kind: 'output', enabled: true }), true)
  assert.equal(enabledOfOpenSlot({ slot: 0, pos: [0, 0], kind: 'display', enabled: true }), true)
  assert.equal(enabledOfOpenSlot({ slot: 0, pos: [0, 0], kind: 'input', enabled: false }), false)
})

// ── 4. 面板背景与每格覆盖 ─────────────────────────────────────────────────────

test('面板背景控件存在，且带纹理与九宫格', () => {
  const holder = root.controls.find((c) => c.panel_background)
  assert.ok(holder, '根面板里应有 panel_background 控件')
  const bg = holder.panel_background
  assert.equal(bg.type, 'image')
  assert.equal(bg.texture, 'textures/ui/probe_panel')
  assert.equal(bg.nineslice_size, 4)
  assert.deepEqual(bg.size, [256, 192])
  assert.deepEqual(bg.offset, [0, 0])
})

test('每格覆盖的变量真的出现在产物里', () => {
  // slot 0：cellSize 20 → 同时写 $cell_image_size|default 与 size
  assert.deepEqual(innerOf(0)['$cell_image_size|default'], [20, 20])
  assert.deepEqual(innerOf(0).size, [20, 20])
  // slot 1：itemRenderer 覆盖
  assert.deepEqual(innerOf(1)['$item_renderer_size|default'], [16, 16])
  assert.deepEqual(innerOf(1)['$item_renderer_offset|default'], [0, 2])
  assert.equal('$cell_image_size|default' in innerOf(1), false, '未声明 cellSize 的槽不该写 $cell_image_size')
  // slot 2 / 3：background → 指向生成的背景控件
  assert.equal(innerOf(2)['$background_images|default'], 'sapdon_probe.slot_background_0')
  assert.equal(innerOf(3)['$background_images|default'], 'sapdon_probe.slot_background_1')
  // slot 3：cellSize 30
  assert.deepEqual(innerOf(3)['$cell_image_size|default'], [30, 30])

  // 被引用的背景控件本体也在产物里
  assert.equal(json.slot_background_0.type, 'image')
  assert.equal(json.slot_background_0.texture, 'textures/ui/probe_slot')
  assert.equal(json.slot_background_1.texture, 'textures/ui/probe_bar')
  assert.equal(json.slot_background_1.nineslice_size, 2)
})

test('由 pos 换算出的 offset 与标定表一致，且同步写 top_left 锚点', () => {
  // 网格原点 [8,8]、未声明 cellSize 的槽用 18×18 ⇒ slot 1 基座 = [8, 26]、slot 2 基座 = [8, 44]
  assert.deepEqual(innerOf(1).offset, [20, 0])
  assert.deepEqual(innerOf(2).offset, [52, 0])
  assert.equal(innerOf(1).anchor_from, 'top_left')
  assert.equal(innerOf(1).anchor_to, 'top_left')
  // slot 0 基座 = [8,8]（视觉 cellSize 20 不参与基座换算），pos 也是 [8,8] ⇒ 零偏移
  assert.deepEqual(innerOf(0).offset, [0, 0])
  // slot 3 视觉 cellSize 30，但**几何统一取面板格位 18** ⇒ 基座 = [8, 8 + 3×18] = [8, 62]
  assert.deepEqual(innerOf(3).offset, [74, 36])
})

// ── 5. addControl / addElementToMain 真的生效 ─────────────────────────────────

test('addControl(el, pos) 真的挂进主面板并带定位', () => {
  const ui = buildProbe()
  const label = new Label('probe_label').setText(new Text().setText('hello'))
  ui.addControl(label, [12, 8])
  const out = ui.system.toObject()
  const mainPanel = out.container_root_panel.controls.find((c) => c.main_panel).main_panel
  assert.ok(mainPanel, '根面板里应真的挂着 main_panel')
  const holder = mainPanel.controls.find((c) => c.probe_label)
  assert.ok(holder, 'addControl 加的控件应出现在 main_panel.controls 里')
  assert.equal(holder.probe_label.type, 'label')
  assert.equal(holder.probe_label.text, 'hello')
  assert.deepEqual(holder.probe_label.offset, [12, 8])
  assert.equal(holder.probe_label.anchor_from, 'top_left')
  assert.equal(holder.probe_label.anchor_to, 'top_left')
})

test('addElementToMain 是 addControl 的别名，同样生效', () => {
  const ui = buildProbe()
  ui.addElementToMain(new Label('legacy_label').setText(new Text().setText('legacy')))
  const out = ui.system.toObject()
  const mainPanel = out.container_root_panel.controls.find((c) => c.main_panel).main_panel
  assert.ok(mainPanel.controls.find((c) => c.legacy_label), '旧入口也应真的挂上')
})

// ── 6. 门控注册幂等 ───────────────────────────────────────────────────────────

test('连续两次 registerContainerUI：不产生重复元素，两条 gate 并存', () => {
  const key = 'small_chest_screen@common.inventory_screen_common'
  const before = ChestUISystem.chest_screen.toObject()[key].modifications.length

  ChestUISystem.registerContainerUI('probe_gate_a', 'sapdon_probe.container_root_panel')
  ChestUISystem.registerContainerUI('probe_gate_b', 'sapdon_probe.container_root_panel')
  const after = ChestUISystem.chest_screen.toObject()

  // 元素按 id 存 Map ⇒ 只有 namespace + 一个元素
  assert.deepEqual(Object.keys(after), ['namespace', key])
  const element = after[key]
  assert.equal(element.modifications.length, before + 2)

  const added = element.modifications.slice(before).map((m) => m.value[0].requires)
  assert.deepEqual(added, [
    "($new_container_title = 'probe_gate_a')",
    "($new_container_title = 'probe_gate_b')",
  ])
  assert.equal(element.modifications[before].value[0].$root_panel, 'sapdon_probe.container_root_panel')
  assert.equal(element.modifications[before].value[0].$screen_content, 'sapdon_probe.container_root_panel')
  assert.equal(element.modifications[before].operation, 'insert_back')
  assert.equal(element.modifications[before].array_name, 'variables')

  // 门控里没有 enable 拼写残留
  assert.deepEqual(findKeyPaths(after, 'enable'), [])
})

test('同一门控键重复注册：元素不重复，但 gate 条件会逐条追加（机制如实记录）', () => {
  const key = 'small_chest_screen@common.inventory_screen_common'
  const before = ChestUISystem.chest_screen.toObject()[key].modifications.length

  ChestUISystem.registerContainerUI('probe_gate_dup', 'x.panel')
  ChestUISystem.registerContainerUI('probe_gate_dup', 'x.panel')
  const after = ChestUISystem.chest_screen.toObject()

  assert.deepEqual(Object.keys(after), ['namespace', key], '重复注册不该产生第二个元素')
  assert.equal(after[key].modifications.length, before + 2)
  const dup = after[key].modifications.filter((m) => m.value[0].requires.includes("'probe_gate_dup'"))
  assert.equal(dup.length, 2, '同键两次调用 = 两条同条件 gate（追加式机制，本次未改）')
})

// ── 7. 护栏 warn（不抛错） ────────────────────────────────────────────────────

test('非法门控键只 warn 不抛错', () => {
  const warnings = []
  const origin = console.warn
  console.warn = (...args) => warnings.push(args.join(' '))
  try {
    assert.doesNotThrow(() => new ContainerUISystem('sapdon_probe:bad.name', 'ui/'))
  } finally {
    console.warn = origin
  }
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /只允许/)
})

test('槽位声明不合规（重复 slot）只 warn 不抛错，且就地覆盖', () => {
  const ui = buildProbe()
  const warnings = []
  const origin = console.warn
  console.warn = (...args) => warnings.push(args.join(' '))
  try {
    assert.doesNotThrow(() => ui.addSlot({ slot: 2, pos: [200, 40], kind: 'output' }))
  } finally {
    console.warn = origin
  }
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /重复声明/)
  const after = ui.system.toObject()
  assert.equal(cellsOf(gridOf(after.container_root_panel)).length, 4, '重复声明不应新增格位')
})

// ── 8. 旧接口薄封装 ───────────────────────────────────────────────────────────

test('旧接口 addInputGrid / addOutputGrid / addGridItem 仍可用，且只订正 enable → enabled', () => {
  const ui = new ContainerUISystem('sapdon_probe:legacy_probe', 'ui/')
  ui.setGridDimension([1, 3])
  ui.addInputGrid([0, 0], [-18, 18])
  ui.addInputGrid([0, 1], [-18, 18])
  ui.addOutputGrid([0, 2], [18, -18])
  const out = ui.system.toObject()
  const legacyGrid = gridOf(out.container_root_panel)
  const legacyCells = cellsOf(legacyGrid)

  assert.deepEqual(legacyGrid.grid_dimensions, [1, 3], '显式 setGridDimension 优先')
  assert.deepEqual(legacyCells.map((c) => c.grid_position), [[0, 0], [0, 1], [0, 2]])
  assert.deepEqual(legacyCells.map((c) => c.inner.offset), [[-18, 18], [-18, 18], [18, -18]])
  assert.equal('enabled' in legacyCells[0].inner, false)
  assert.equal('enabled' in legacyCells[1].inner, false)
  assert.equal(legacyCells[2].inner.enabled, false, 'addOutputGrid 现在写 enabled:false')
  assert.equal('enable' in legacyCells[2].inner, false, '不该再写 enable')
  assert.deepEqual(findKeyPaths(out, 'enable'), [])
})

test('setItemMatrix 已删除；setInputGrid 仍在（@deprecated 别名）', () => {
  const ui = buildProbe()
  assert.equal(typeof ui.setItemMatrix, 'undefined')
  assert.equal(typeof ui.setInputGrid, 'function')
  assert.equal(typeof ui.setOutputSlots, 'function')
  assert.equal(typeof ui.addSlot, 'function')
  assert.equal(typeof ui.addControl, 'function')
  assert.equal(typeof ui.setPanel, 'function')
  assert.equal(typeof ui.setGridOrigin, 'function')
  assert.equal(typeof ui.setSlotDefaults, 'function')

  ui.setInputGrid([[0, 1]])
  assert.deepEqual(ui.outputSlots, [[0, 1]])
  ui.setOutputSlots([[0, 2]])
  assert.deepEqual(ui.outputSlots, [[0, 2]])
  assert.equal(ui.output_grids, undefined, '旧死字段 output_grids 已更名')
})

// ── 9. addProgressSlot（进度指示槽）──────────────────────────────────────────
//
// 这一组锁住「进度指示槽」的产物形状：overlay 控件、三个注入变量、以及
// **取反**的比例绑定（`#item_durability_current_amount` 是已损耗量，见 known-pitfalls §4.12）。

/** 构造进度槽探针：箭头（有底图、left）+ 火焰（无底图、down） */
function buildProgressProbe() {
  const ui = new ContainerUISystem('sapdon_progress_probe:progress_probe', 'ui/')
  ui.setGridOrigin([8, 8])
  ui.addProgressSlot({
    slot: 3,
    pos: [77, 42],
    size: [22, 15],
    base: 'textures/ui/arrow_inactive',
    fill: 'textures/ui/arrow_active',
    clipDirection: 'left',
  })
  ui.addProgressSlot({ slot: 4, pos: [52, 43], size: [13, 13], fill: 'textures/ui/flame_full_image', clipDirection: 'down' })
  return ui
}

const progressJson = buildProgressProbe().system.toObject()
const progressCells = cellsOf(gridOf(progressJson.container_root_panel))

/** 取面板里名为 name 的子控件（不存在则断言失败） */
function childOf(panel, name) {
  const holder = panel.controls.find((c) => c[name])
  assert.ok(holder, `控件 ${name} 不在产物里`)
  return holder[name]
}

test('addProgressSlot 生成 overlay 控件，并注入 cell_overlay_ref / background_images / 关掉自带耐久条', () => {
  assert.equal(progressCells.length, 2)
  assert.ok(progressJson.progress_3, '产物应有 progress_3 控件')
  assert.ok(progressJson.progress_4, '产物应有 progress_4 控件')
  assert.ok(progressJson.progress_empty_background, '产物应有零尺寸底 progress_empty_background')

  const [arrow, flame] = progressCells
  assert.equal(arrow.inner['$cell_overlay_ref|default'], 'sapdon_progress_probe.progress_3')
  assert.equal(flame.inner['$cell_overlay_ref|default'], 'sapdon_progress_probe.progress_4')
  assert.equal(arrow.inner['$background_images|default'], 'sapdon_progress_probe.progress_empty_background')
  assert.equal(arrow.inner['$durability_bar_required|default'], false, '必须关掉引擎自带的耐久条')

  assert.deepEqual(arrow.inner.size, [22, 15], '视觉尺寸 = size')
  assert.deepEqual(arrow.inner['$item_renderer_size|default'], [0, 0], '物品图标尺寸归零')
  assert.equal(arrow.inner.enabled, false, 'kind 固定 display ⇒ enabled:false')
  assert.equal('enable' in arrow.inner, false, '不该写 enable')
  assert.deepEqual(progressJson.progress_empty_background.size, [0, 0], '零尺寸底')
})

test('addProgressSlot 的 fill 带裁切方向与「取反」的比例绑定；base 可选', () => {
  const arrowFill = childOf(progressJson.progress_3, 'fill')
  assert.equal(arrowFill.texture, 'textures/ui/arrow_active')
  assert.equal(arrowFill.clip_direction, 'left')
  assert.deepEqual(arrowFill.size, [22, 15])

  const arrowBase = childOf(progressJson.progress_3, 'base')
  assert.equal(arrowBase.texture, 'textures/ui/arrow_inactive')
  assert.equal('clip_direction' in arrowBase, false, '静止底图不参与裁切')

  // 三条绑定：两条 collection（本格数据）+ 一条 view（算比例 → #clip_ratio）
  assert.equal(arrowFill.bindings.length, 3)
  const [cur, total, ratio] = arrowFill.bindings
  assert.equal(cur.binding_name, '#item_durability_current_amount')
  assert.equal(cur.binding_type, 'collection')
  assert.equal(cur.binding_collection_name, 'container_items')
  assert.equal('binding_name_override' in cur, false, '不覆盖属性 ⇒ 名字进入该控件作用域供 Molang 读')
  assert.equal(total.binding_name, '#item_durability_total_amount')
  assert.equal(ratio.binding_type, 'view')
  assert.equal(ratio.target_property_name, '#clip_ratio')
  assert.ok(
    ratio.source_property_name.includes('#item_durability_total_amount - #item_durability_current_amount'),
    'current 是已损耗量 ⇒ 比例必须取反（total − current），否则方向反了',
  )

  // 没给 base ⇒ 只有 fill；裁切方向可换（火焰从下往上）
  assert.equal(progressJson.progress_4.controls.length, 1, '没给 base 就只生成 fill')
  const flameFill = childOf(progressJson.progress_4, 'fill')
  assert.equal(flameFill.clip_direction, 'down')
  assert.deepEqual(flameFill.size, [13, 13])
})

test('addProgressSlot 参数不合规只 warn 不抛，且不产生槽位', () => {
  const ui = new ContainerUISystem('sapdon_progress_bad:progress_bad', 'ui/')
  assert.doesNotThrow(() => ui.addProgressSlot({ slot: -1, pos: [0, 0], fill: 'textures/ui/x' }))
  assert.doesNotThrow(() => ui.addProgressSlot({ slot: 0, pos: 'bad', fill: 'textures/ui/x' }))
  assert.doesNotThrow(() => ui.addProgressSlot({ slot: 0, pos: [0, 0], fill: '' }))
  assert.doesNotThrow(() => ui.addProgressSlot({ slot: 0, pos: [0, 0], fill: 'textures/ui/x', size: [1] }))
  // 没有槽位 ⇒ 网格里不该出现格位控件（无槽位时 grids.controls 这个键根本不出现）
  const grid = gridOf(ui.system.toObject().container_root_panel)
  assert.equal(grid.controls, undefined, '不合规调用不该产生格位')
})

test('addProgressSlot 是链式可调的（返回 this）', () => {
  const ui = new ContainerUISystem('sapdon_progress_chain:progress_chain', 'ui/')
  assert.equal(ui.addProgressSlot({ slot: 0, pos: [0, 0], fill: 'textures/ui/x' }), ui)
})
