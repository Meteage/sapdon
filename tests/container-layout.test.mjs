// 容器版面纯函数单测（`node tests/container-layout.test.mjs`）
//
// 覆盖 `@sapdon/core` 的 `containerLayout` 模块：槽号 → grid_position、像素 pos → offset、
// 槽位声明校验、标定表换算。全部走**构建后的 prod core**（`prod/core/index.js`），
// 因此断言的是下游真正拿到的那份代码 —— 改完 `src/` 必须重建 `prod/` 本测试才有意义。
//
// ⚠️ 不要用 `node --test`（受限环境会 fork 子进程 → EPERM），直接 `node tests/container-layout.test.mjs`。
import { test } from 'node:test'
import assert from 'node:assert/strict'

const {
  SLOT_CALIBRATION,
  SLOT_KINDS,
  UI_NAME_PATTERN,
  anchorProps,
  cellBase,
  checkUIName,
  gridDimensionsFor,
  isGatedKind,
  isSafeUIName,
  normalizeBackground,
  normalizeCellSize,
  posToOffset,
  resolveCalibration,
  resolveSlot,
  slotToGridPosition,
  validateSlotSpec,
} = await import('../prod/core/index.js')

// ── 导出面 ────────────────────────────────────────────────────────────────────

test('prod core 真的导出了 containerLayout 的全部纯函数', () => {
  for (const fn of [
    slotToGridPosition, gridDimensionsFor, cellBase, posToOffset, anchorProps,
    normalizeCellSize, normalizeBackground, validateSlotSpec, resolveSlot,
    resolveCalibration, checkUIName, isSafeUIName, isGatedKind,
  ]) {
    assert.equal(typeof fn, 'function')
  }
  assert.ok(Array.isArray(SLOT_KINDS))
  assert.equal(UI_NAME_PATTERN instanceof RegExp, true)
})

test('标定表是冻结的常量，且是「单列 / 18×18 / top_left」的历史约定', () => {
  assert.equal(Object.isFrozen(SLOT_CALIBRATION), true)
  assert.deepEqual(SLOT_CALIBRATION.originPadding, [0, 0])
  assert.deepEqual(SLOT_CALIBRATION.cellSize, [18, 18])
  assert.equal(SLOT_CALIBRATION.columns, 1)
  assert.equal(SLOT_CALIBRATION.anchor, 'top_left')
})

// ── 槽号 → grid_position ─────────────────────────────────────────────────────

test('slotToGridPosition：单列（默认）下 slot → [0, slot]，slot 0 落到 [0,0]', () => {
  assert.deepEqual(slotToGridPosition(0), [0, 0])
  assert.deepEqual(slotToGridPosition(1), [0, 1])
  assert.deepEqual(slotToGridPosition(7), [0, 7])
})

test('slotToGridPosition：多列时行优先展开，且列数非法回落默认值', () => {
  assert.deepEqual(slotToGridPosition(0, 3), [0, 0])
  assert.deepEqual(slotToGridPosition(2, 3), [2, 0])
  assert.deepEqual(slotToGridPosition(3, 3), [0, 1])
  assert.deepEqual(slotToGridPosition(4, 3), [1, 1])
  assert.deepEqual(slotToGridPosition(5, 0), [0, 5])   // 列数 0 → 回落 1
  assert.deepEqual(slotToGridPosition(5, -2), [0, 5])  // 负列数 → 回落 1
  assert.deepEqual(slotToGridPosition(5, 1.5), [0, 5]) // 非整数 → 回落 1
})

test('slot → grid_position 是单射（不同槽号不撞同一格位）', () => {
  const seen = new Set()
  for (let slot = 0; slot < 64; slot++) {
    const key = slotToGridPosition(slot).join(',')
    assert.equal(seen.has(key), false, `槽 ${slot} 与前面的槽撞到同一格位 ${key}`)
    seen.add(key)
  }
  assert.equal(seen.size, 64)
})

test('gridDimensionsFor：空集合 → [1,1]；按最大行列推导；非法格位被跳过', () => {
  assert.deepEqual(gridDimensionsFor([]), [1, 1])
  assert.deepEqual(gridDimensionsFor([[0, 0]]), [1, 1])
  assert.deepEqual(gridDimensionsFor([[0, 0], [0, 5]]), [1, 6])
  assert.deepEqual(gridDimensionsFor([[2, 3]]), [3, 4])
  assert.deepEqual(gridDimensionsFor([[0, 0], [NaN, 0], [undefined, 1]]), [1, 1])
})

// ── 格位尺寸归一化 ────────────────────────────────────────────────────────────

test('normalizeCellSize：单数字 = 正方形；二元组原样；非法回落 fallback', () => {
  assert.deepEqual(normalizeCellSize(20), [20, 20])
  assert.deepEqual(normalizeCellSize([30, 10]), [30, 10])
  assert.deepEqual(normalizeCellSize(undefined), [18, 18])
  assert.deepEqual(normalizeCellSize(undefined, [40, 8]), [40, 8])
  assert.deepEqual(normalizeCellSize('20', [7, 7]), [7, 7])
  assert.deepEqual(normalizeCellSize([1, 2, 3], [7, 7]), [7, 7])
  assert.deepEqual(normalizeCellSize(Infinity, [7, 7]), [7, 7])
})

test('resolveCalibration：缺省字段逐个回落，非法列数回落默认', () => {
  assert.deepEqual(resolveCalibration(), { anchor: 'top_left', originPadding: [0, 0], cellSize: [18, 18], columns: 1, defaultGridOrigin: [0, 24] })
  assert.deepEqual(resolveCalibration({ anchor: 'center' }).anchor, 'center')
  assert.deepEqual(resolveCalibration({ columns: 4 }).columns, 4)
  assert.equal(resolveCalibration({ columns: 0 }).columns, 1)
  assert.deepEqual(resolveCalibration({ defaultGridOrigin: [4, 6] }).defaultGridOrigin, [4, 6])
  assert.deepEqual(resolveCalibration({ defaultGridOrigin: ['x', 6] }).defaultGridOrigin, [0, 24])
  // 不得就地改写共享常量
  const custom = resolveCalibration({ originPadding: [5, 5] })
  custom.originPadding[0] = 99
  assert.deepEqual(SLOT_CALIBRATION.originPadding, [0, 0])
})

// ── 格位基座 / 偏移换算 ───────────────────────────────────────────────────────

test('cellBase：默认标定下基座 = 网格原点 + 序号 × 网格统一格位尺寸', () => {
  assert.deepEqual(cellBase(0), [0, 0])
  assert.deepEqual(cellBase(1), [0, 18])
  assert.deepEqual(cellBase(2), [0, 36])
  assert.deepEqual(cellBase(2, { gridOrigin: [8, 40] }), [8, 76])
  assert.deepEqual(cellBase(1, { gridOrigin: [8, 40], gridCellSize: [20, 30] }), [8, 70])
  assert.deepEqual(cellBase(2, { columns: 2, gridCellSize: [20, 20] }), [0, 20])
})

test('cellBase：逐槽视觉尺寸不参与基座（几何只认 gridCellSize）', () => {
  // 同一槽位、不同「本槽尺寸」不影响基座；只有 gridCellSize 才影响
  assert.deepEqual(cellBase(3, { gridOrigin: [0, 0], gridCellSize: [18, 18] }), [0, 54])
  assert.deepEqual(cellBase(3, { gridOrigin: [0, 0], gridCellSize: [30, 30] }), [0, 90])
  // 旧字段名 cellSize 已不再是几何入口 ⇒ 传了也回落标定表
  assert.deepEqual(cellBase(3, { gridOrigin: [0, 0], cellSize: [30, 30] }), [0, 54])
})

test('cellBase：锚点为 center 时基座整体加半个格位（校准只改 anchor 一处）', () => {
  assert.deepEqual(cellBase(0, { calibration: { anchor: 'center' }, gridCellSize: [18, 18] }), [9, 9])
  assert.deepEqual(cellBase(1, { calibration: { anchor: 'center' }, gridCellSize: [20, 30] }), [10, 45])
})

test('cellBase：originPadding 是版面整体微调项', () => {
  assert.deepEqual(cellBase(1, { calibration: { originPadding: [3, -4] } }), [3, 14])
})

test('posToOffset：offset = pos − 格位基座（slot 0 基座为原点）', () => {
  assert.deepEqual(posToOffset([10, 10], 0), [10, 10])
  assert.deepEqual(posToOffset([10, 58], 1, { gridOrigin: [8, 40] }), [2, 0])
  assert.deepEqual(posToOffset([8, 40], 0, { gridOrigin: [8, 40] }), [0, 0])
  // 负 pos 是合法像素坐标：换算照样成立，不做夹取
  assert.deepEqual(posToOffset([-6, -9], 0, { gridOrigin: [0, 0] }), [-6, -9])
})

test('anchorProps：锚点属性与标定表同步', () => {
  assert.deepEqual(anchorProps(), { anchor_from: 'top_left', anchor_to: 'top_left' })
  assert.deepEqual(anchorProps({ anchor: 'center' }), { anchor_from: 'center', anchor_to: 'center' })
})

// ── 背景归一化 ────────────────────────────────────────────────────────────────

test('normalizeBackground：字符串 / 对象 / 非法输入', () => {
  assert.deepEqual(normalizeBackground('textures/ui/panel'), { texture: 'textures/ui/panel' })
  assert.deepEqual(normalizeBackground({ texture: 'textures/ui/panel', nineslice_size: 4 }), { texture: 'textures/ui/panel', nineslice_size: 4 })
  assert.deepEqual(normalizeBackground({ texture: 'textures/ui/panel' }), { texture: 'textures/ui/panel' })
  assert.equal(normalizeBackground(''), undefined)
  assert.equal(normalizeBackground({}), undefined)
  assert.equal(normalizeBackground({ texture: '' }), undefined)
  assert.equal(normalizeBackground(undefined), undefined)
  assert.equal(normalizeBackground(42), undefined)
})

// ── 槽位声明校验（只 warn，不抛） ──────────────────────────────────────────────

test('validateSlotSpec：合规声明零警告（含 slot 0、缺省 kind、负 pos）', () => {
  assert.deepEqual(validateSlotSpec({ slot: 0, pos: [0, 0] }), [])
  assert.deepEqual(validateSlotSpec({ slot: 3, pos: [-6, -9], kind: 'display' }), [])
  assert.deepEqual(validateSlotSpec({ slot: 1, pos: [10, 10], cellSize: 20, background: 'textures/ui/slot' }), [])
  assert.deepEqual(validateSlotSpec({ slot: 1, pos: [10, 10], itemRenderer: { size: [16, 16] } }), [])
})

test('validateSlotSpec：缺 slot / 负 slot / 非整数 slot / 重复 slot', () => {
  assert.match(validateSlotSpec({ pos: [0, 0] })[0], /缺少 slot/)
  assert.match(validateSlotSpec({ slot: -1, pos: [0, 0] })[0], /不能为负/)
  assert.match(validateSlotSpec({ slot: 1.5, pos: [0, 0] })[0], /必须是整数/)
  assert.match(validateSlotSpec({ slot: '2', pos: [0, 0] })[0], /必须是整数/)
  const dup = validateSlotSpec({ slot: 2, pos: [0, 0] }, { existingSlots: [0, 2] })
  assert.equal(dup.length, 1)
  assert.match(dup[0], /重复声明/)
  assert.deepEqual(validateSlotSpec({ slot: 2, pos: [0, 0] }, { existingSlots: [0, 1] }), [])
})

test('validateSlotSpec：pos / offset / gridPosition 必须是两个有限数', () => {
  assert.match(validateSlotSpec({ slot: 0, pos: [1] })[0], /pos 必须是/)
  assert.match(validateSlotSpec({ slot: 0, pos: [1, NaN] })[0], /pos 必须是/)
  assert.match(validateSlotSpec({ slot: 0, pos: [1, '2'] })[0], /pos 必须是/)
  assert.match(validateSlotSpec({ slot: 0, offset: [1, 2, 3] })[0], /offset 必须是/)
  assert.match(validateSlotSpec({ slot: 0, gridPosition: 'x' })[0], /gridPosition 必须是/)
})

test('validateSlotSpec：kind / cellSize / size / background 的类型检查', () => {
  assert.match(validateSlotSpec({ slot: 0, pos: [0, 0], kind: 'slot' })[0], /kind 只能是/)
  assert.match(validateSlotSpec({ slot: 0, pos: [0, 0], cellSize: '20' })[0], /cellSize 必须是/)
  assert.match(validateSlotSpec({ slot: 0, pos: [0, 0], size: 14 })[0], /size 必须是/)
  assert.match(validateSlotSpec({ slot: 0, pos: [0, 0], background: {} })[0], /background 必须是/)
})

test('validateSlotSpec：既无 pos 也无 offset 时提醒会落在格位基座', () => {
  const warnings = validateSlotSpec({ slot: 5 })
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /既没有 pos 也没有 offset/)

  // 只给 gridPosition、不给 offset 同样提醒（旧接口漏传 offset 的典型写法）
  const byGrid = validateSlotSpec({ gridPosition: [0, 3] })
  assert.equal(byGrid.length, 1)
  assert.match(byGrid[0], /网格位置 \[0,3\]/)
})

test('validateSlotSpec：任何畸形输入都不抛错', () => {
  const weird = [undefined, null, 0, 'x', [], {}, { slot: {} }, { slot: 0, pos: {} }, { pos: null }]
  for (const spec of weird) {
    let out
    assert.doesNotThrow(() => { out = validateSlotSpec(spec) })
    assert.ok(Array.isArray(out))
  }
})

// ── resolveSlot：默认值合并 + 换算 ────────────────────────────────────────────

test('resolveSlot：kind 缺省为 input，且不写 enabled', () => {
  const slot = resolveSlot({ slot: 0, pos: [4, 4] })
  assert.equal(slot.kind, 'input')
  assert.equal(slot.enabled, undefined)
  assert.equal('enabled' in slot, true) // 字段存在但值为 undefined ⇒ 产物里不出现该键
})

test('resolveSlot：output / display 的 enabled **缺省**为 false，显式值一律优先', () => {
  // 缺省（既有项目产物不变）
  assert.equal(resolveSlot({ slot: 1, pos: [0, 0], kind: 'output' }).enabled, false)
  assert.equal(resolveSlot({ slot: 1, pos: [0, 0], kind: 'display' }).enabled, false)
  assert.equal(resolveSlot({ slot: 1, pos: [0, 0], kind: 'input' }).enabled, undefined)
  // 显式值：input 两侧都生效
  assert.equal(resolveSlot({ slot: 1, pos: [0, 0], kind: 'input', enabled: false }).enabled, false)
  assert.equal(resolveSlot({ slot: 1, pos: [0, 0], kind: 'input', enabled: true }).enabled, true)
  // ★ output / display 上的显式 enabled:true **不被语义覆盖**（2026-09-12：`enabled:false` 是整体
  //   禁用这一格，连产物都取不出来 ⇒ 产物格必须能把 false 翻成 true，见 known-pitfalls §4.14）
  assert.equal(resolveSlot({ slot: 1, pos: [0, 0], kind: 'output', enabled: true }).enabled, true)
  assert.equal(resolveSlot({ slot: 1, pos: [0, 0], kind: 'display', enabled: true }).enabled, true)
  assert.equal(isGatedKind('output'), true)
  assert.equal(isGatedKind('display'), true)
  assert.equal(isGatedKind('input'), false)
})

test('resolveSlot：由 pos 换算 → derived=true、offset 可预测、across 多槽一一对应', () => {
  const options = { gridOrigin: [8, 40] }
  const a = resolveSlot({ slot: 0, pos: [8, 40] }, options)
  const b = resolveSlot({ slot: 1, pos: [28, 58] }, options)
  const c = resolveSlot({ slot: 3, pos: [8, 94] }, options)
  assert.deepEqual(a.offset, [0, 0])
  assert.deepEqual(b.offset, [20, 0])
  assert.deepEqual(c.offset, [0, 0])
  assert.deepEqual([a.gridPosition, b.gridPosition, c.gridPosition], [[0, 0], [0, 1], [0, 3]])
  assert.equal(a.derived && b.derived && c.derived, true)
  // 同一个面板坐标在不同槽上得到不同 offset（证明基座参与了换算）
  assert.deepEqual(resolveSlot({ slot: 0, pos: [28, 58] }, options).offset, [20, 18])
  assert.notDeepEqual(resolveSlot({ slot: 0, pos: [28, 58] }, options).offset, b.offset)
})

test('resolveSlot：显式 gridPosition / offset 走旧路径，不参与换算', () => {
  const legacy = resolveSlot({ gridPosition: [0, 3], offset: [-18, 18] })
  assert.deepEqual(legacy.gridPosition, [0, 3])
  assert.deepEqual(legacy.offset, [-18, 18])
  assert.equal(legacy.derived, false)
  assert.equal(legacy.slot, 3) // 单列网格下由格位反推槽号
  assert.deepEqual(legacy.pos, [-18, 72]) // 显式 offset 下 pos 只是基座 + offset 的回读值

  const both = resolveSlot({ slot: 9, gridPosition: [0, 2], offset: [1, 1] })
  assert.deepEqual(both.gridPosition, [0, 2])
  assert.equal(both.slot, 9)
  assert.equal(both.derived, false)
})

test('resolveSlot：默认值合并不覆盖显式声明', () => {
  const defaults = { kind: 'output', cellSize: 24, background: 'textures/ui/def' }
  const slot = resolveSlot({ slot: 2, pos: [0, 0] }, { defaults })
  assert.equal(slot.kind, 'output')
  assert.equal(slot.enabled, false)
  assert.deepEqual(slot.cellSize, [24, 24])
  assert.deepEqual(slot.background, { texture: 'textures/ui/def' })

  const overridden = resolveSlot({ slot: 2, pos: [0, 0], kind: 'input', cellSize: 30, background: 'textures/ui/own' }, { defaults })
  assert.equal(overridden.kind, 'input')
  assert.deepEqual(overridden.cellSize, [30, 30])
  assert.deepEqual(overridden.background, { texture: 'textures/ui/own' })
})

test('resolveSlot：cellSizeDeclared 只在调用方显式声明时为 true', () => {
  assert.equal(resolveSlot({ slot: 0, pos: [0, 0] }).cellSizeDeclared, false)
  assert.equal(resolveSlot({ slot: 0, pos: [0, 0], cellSize: 20 }).cellSizeDeclared, true)
  assert.equal(resolveSlot({ slot: 0, pos: [0, 0] }, { defaults: { cellSize: 20 } }).cellSizeDeclared, true)
  assert.deepEqual(resolveSlot({ slot: 0, pos: [0, 0] }).cellSize, [18, 18])
})

test('resolveSlot：基座用 gridCellSize（几何），逐槽 cellSize 只留作视觉尺寸', () => {
  const opts = { gridOrigin: [0, 0], gridCellSize: [18, 18], defaults: { cellSize: 30 } }
  const slot = resolveSlot({ slot: 3, pos: [0, 0] }, opts)
  assert.deepEqual(slot.cellSize, [30, 30], '视觉尺寸仍是默认值 30')
  assert.deepEqual(slot.offset, [0, -54], '基座用统一几何 18 ⇒ 3×18 = 54')
  assert.deepEqual(slot.pos, [0, 0], 'pos 是调用方给的像素坐标，保持不变')
})

test('resolveSlot：pos / offset 都缺省时 offset 归零、落在格位基座（不是负的基座坐标）', () => {
  const none = resolveSlot({ slot: 2 })
  assert.deepEqual(none.offset, [0, 0])
  assert.deepEqual(none.pos, [0, 36])
  assert.equal(none.derived, false)

  const byGrid = resolveSlot({ gridPosition: [0, 3] }, { gridOrigin: [8, 40] })
  assert.deepEqual(byGrid.offset, [0, 0])
  assert.deepEqual(byGrid.pos, [8, 94])
})

test('resolveSlot：vars 透传且不丢失', () => {
  const vars = { stack_count_required: false }
  const slot = resolveSlot({ slot: 0, pos: [0, 0], vars })
  assert.deepEqual(slot.vars, vars)
  assert.deepEqual(resolveSlot({ slot: 0, pos: [0, 0] }).vars, {})
  assert.deepEqual(SLOT_KINDS, ['input', 'output', 'display'])
})

// ── 门控键（同时是 ui 文件名）────────────────────────────────────────────────

test('checkUIName / isSafeUIName：只放行 A-Z a-z 0-9 _ -', () => {
  assert.equal(isSafeUIName('sapdon_furnace'), true)
  assert.equal(isSafeUIName('my-panel_2'), true)
  assert.equal(checkUIName('sapdon_furnace'), undefined)

  for (const bad of ['sapdon.furnace', 'a b', 'a/b', '', '面板', 'a:b', null, undefined, 7, {}]) {
    assert.equal(isSafeUIName(bad), false, `${JSON.stringify(bad)} 不该通过`)
    assert.match(checkUIName(bad), /只允许/)
  }
})
