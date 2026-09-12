// 方块容器 API 的进程内验证（P0-2）：
//   `node tests/block-api.test.mjs`（需先 tsc 生成 dist/）
//
// 覆盖：
//   1. `createTileBlock` 走的实体路线：默认容器参数逐字段不变 + 按实例覆盖 + **不污染共享常量**
//   1b. `options.despawn_delay`：不传 = 产物不变；传了 = 只多 `delay.value`；校验 + 不污染共享常量
//   2. `setBlockEntity()` 的历史产物逐字节不变；`{ container }` 新参数与 [1,54] 校验
//   3. `setInventory()` 产物保持不变（已废弃）+ 构建期 warn
//   4. `BasicBlock.validate()` 的两条自检
//
// ⚠️ 不走 `dist/core/index.js` / `blockFactory.js`：那条链路会 import 到
//    `entityComponet.js` 里一处**既有的**错误导入（type-only 的 `RideableComponentDesc` 当值用，
//    doc/dev/known-pitfalls.md §7 已记档），Node 里 import 必然失败。这里直接测下层类。
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { TileBlock } = await import('../dist/core/block/tileBlock.js')
const { BasicBlock } = await import('../dist/core/block/basicBlock.js')
const { BlockComponent } = await import('../dist/core/block/blockComponent.js')

const TEX = ['t0', 't1', 't2', 't3', 't4', 't5']

/** 取实体行为数据里的 `minecraft:inventory` */
const invOf = (tile) => tile.entity.behavior.components.get('minecraft:inventory')

test('TileBlock 默认容器：与历史产物**逐字段、逐键序**一致（27 / minecart_chest / 可抽取）', () => {
    const tile = new TileBlock('test:chest', 'construction', [...TEX])
    assert.equal(
        JSON.stringify(invOf(tile)),
        '{"inventory_size":27,"can_be_siphoned_from":true,"container_type":"minecart_chest"}'
    )
})

test('TileBlock 按实例覆盖容器参数（56 槽 = FZ 机器所需），且**不污染**共享常量/其它实例', () => {
    const big = new TileBlock('test:big', 'construction', [...TEX], {
        inventory_size: 56, container_type: 'chest_boat', can_be_siphoned_from: false,
    })
    assert.deepEqual(invOf(big), { inventory_size: 56, can_be_siphoned_from: false, container_type: 'chest_boat' })

    // 之后构造的另一个实例必须仍是默认 27（共享常量被就地改写是最难查的静默 bug）
    const normal = new TileBlock('test:normal', 'construction', [...TEX])
    assert.deepEqual(invOf(normal), { inventory_size: 27, can_be_siphoned_from: true, container_type: 'minecart_chest' })
    // 再改一次 big，normal 不受影响
    assert.equal(invOf(big).inventory_size, 56)
    assert.equal(invOf(normal).inventory_size, 27)
})

test('TileBlock 容器参数校验：正整数 / 非空字符串 / 布尔', () => {
    for (const bad of [0, -1, 1.5, '27', null]) {
        assert.throws(() => new TileBlock('test:x', 'construction', [...TEX], { inventory_size: bad }), /inventory_size/)
    }
    assert.throws(() => new TileBlock('test:x', 'construction', [...TEX], { container_type: '' }), /container_type/)
    assert.throws(() => new TileBlock('test:x', 'construction', [...TEX], { can_be_siphoned_from: 'yes' }), /can_be_siphoned_from/)
})

// ── P1-2 `options.entity_texture` ────────────────────────────────────────────────
// 客户端实体的 `textures.<name>` 官方要求是**资源路径**
// （<https://learn.microsoft.com/en-us/minecraft/creator/reference/content/entityreference/examples/cliententitydocumentation/cliententitydocumentationintroduction>），
// 而 `textures_arr` 在方块侧是 terrain_texture.json 的**键** —— 两者不是一回事。

test('TileBlock 实体贴图默认 = textures_arr[0]（**历史行为，不传新参数产物不变**）', () => {
    assert.equal(new TileBlock('test:chest', 'construction', [...TEX]).entity.resource.textures.default, 't0')
    // 只给短名（terrain 键）时会原样照写出实体贴图 —— 这正是需要 entity_texture 的原因
    const shortName = new TileBlock('test:short', 'construction', ['machineblock_0', ...TEX.slice(1)])
    assert.equal(shortName.entity.resource.textures.default, 'machineblock_0')
})

test('TileBlock `entity_texture` 只改**实体侧**贴图，方块侧 material_instances 仍用 textures_arr', () => {
    const tile = new TileBlock('test:typed', 'construction', ['machineblock_0', 'b', 'c', 'd', 'e', 'f'], {
        entity_texture: 'textures/blocks/entity/normal',
    })
    assert.equal(tile.entity.resource.textures.default, 'textures/blocks/entity/normal')
    assert.equal(
        tile.block.components.get('minecraft:material_instances').up.texture,
        'machineblock_0',
        '方块侧仍必须是 terrain 键'
    )
})

test('TileBlock `entity_texture` 校验：必须是**非空字符串**', () => {
    for (const bad of ['', null, 0, [], {}]) {
        assert.throws(
            () => new TileBlock('test:x', 'construction', [...TEX], { entity_texture: bad }),
            /entity_texture/
        )
    }
})

// ── `options.despawn_delay`：破坏时收窄「整容器倒出来」的时间窗 ─────────────────────
// 承载实体被破坏走 `minecraft:block_sensor` → `despawn_event` → `item_despawn` 组，而那一组的
// `minecraft:transformation` 带 `drop_inventory: true` —— 官方文档的语义是**整容器倒出来**
// （`metadata/doc_modules/entities.json`："Cause the entity to drop all items in inventory upon
// transformation"）。`delay.value` 则是 "Time in seconds before the entity transforms"
// ⇒ 项目靠它让「破坏事件里的脚本」先跑完（例如先清掉内部显示格，再让容器掉）。

/** 承载实体 `item_despawn` 组里的 `minecraft:transformation` */
const transformationOf = (tile) =>
    tile.entity.behavior.component_groups.get('item_despawn')['minecraft:transformation']
/** `item_despawn` 那一组本身（用于核对「共享常量 vs 实例拷贝」） */
const despawnGroupOf = (tile) => tile.entity.behavior.component_groups.get('item_despawn')

test('TileBlock 不传 despawn_delay ⇒ 产物**不含** delay 键（历史产物逐字节不变）', () => {
    const tile = new TileBlock('test:nodelay', 'construction', [...TEX])
    assert.equal(
        JSON.stringify(transformationOf(tile)),
        '{"drop_inventory":true,"into":"minecraft:air"}'
    )
})

test('TileBlock `despawn_delay` ⇒ 只多一个 delay.value，其余字段与键序不变', () => {
    const tile = new TileBlock('test:delay', 'construction', [...TEX], { despawn_delay: 0.1 })
    assert.equal(
        JSON.stringify(transformationOf(tile)),
        '{"drop_inventory":true,"into":"minecraft:air","delay":{"value":0.1}}'
    )
})

test('TileBlock `despawn_delay` 按实例拷贝：不传的实例仍与共享常量同一份（零拷贝）', () => {
    const plain1 = new TileBlock('test:p1', 'construction', [...TEX])
    const plain2 = new TileBlock('test:p2', 'construction', [...TEX])
    const delayed = new TileBlock('test:p3', 'construction', [...TEX], { despawn_delay: 0.25 })
    assert.equal(despawnGroupOf(plain1), despawnGroupOf(plain2), '都不传 ⇒ 应当共用同一份')
    assert.notEqual(despawnGroupOf(plain1), despawnGroupOf(delayed), '传了延迟的实例必须有自己的一份')
    assert.equal('delay' in transformationOf(plain1), false, '共享常量不许被就地改写')
    assert.deepEqual(transformationOf(delayed).delay, { value: 0.25 })
})

test('TileBlock `despawn_delay` 校验：必须是**大于 0 的有限数**', () => {
    for (const bad of [0, -0.1, '0.1', null, NaN, Infinity]) {
        assert.throws(
            () => new TileBlock('test:x', 'construction', [...TEX], { despawn_delay: bad }),
            /despawn_delay/
        )
    }
})

test('setBlockEntity 的历史产物逐字节不变', () => {
    const none = BlockComponent.setBlockEntity()
    assert.equal(JSON.stringify(Object.fromEntries(none)), '{"minecraft:block_entity":{"dynamic_properties":false}}')
    const on = BlockComponent.setBlockEntity(true)
    assert.equal(JSON.stringify(Object.fromEntries(on)), '{"minecraft:block_entity":{"dynamic_properties":true}}')
})

test('setBlockEntity 支持 container（官方 slot_count 字段），键序为 dynamic_properties → container', () => {
    const a = BlockComponent.setBlockEntity(true, { container: { slot_count: 27 } })
    assert.equal(
        JSON.stringify(Object.fromEntries(a)),
        '{"minecraft:block_entity":{"dynamic_properties":true,"container":{"slot_count":27}}}'
    )
    // 只给对象（省掉第一个参数）+ 直接给数字 + inventory_size 别名
    assert.equal(
        JSON.stringify(Object.fromEntries(BlockComponent.setBlockEntity({ container: 54 }))),
        '{"minecraft:block_entity":{"dynamic_properties":false,"container":{"slot_count":54}}}'
    )
    assert.equal(
        JSON.stringify(Object.fromEntries(BlockComponent.setBlockEntity(false, { container: { inventory_size: 1 } }))),
        '{"minecraft:block_entity":{"dynamic_properties":false,"container":{"slot_count":1}}}'
    )
})

test('setBlockEntity 的 container 校验：[1,54] 超限抛错、别名冲突抛错', () => {
    for (const bad of [0, 55, 1000, -1, 2.5, '27', {}, null]) {
        assert.throws(() => BlockComponent.setBlockEntity(true, { container: bad }), /setBlockEntity/)
    }
    assert.throws(
        () => BlockComponent.setBlockEntity(true, { container: { slot_count: 27, inventory_size: 28 } }),
        /不一致/
    )
    assert.throws(() => BlockComponent.setBlockEntity('yes'), /dynamic_properties/)
})

test('setInventory 产物保持不变（已废弃），但会打一条构建期 warn', () => {
    const warnings = []
    const original = console.warn
    console.warn = (...args) => { warnings.push(args.join(' ')) }
    let map
    try {
        map = BlockComponent.setInventory({ inventory_size: 56, container_type: 'minecart_chest' })
    } finally {
        console.warn = original
    }
    assert.equal(
        JSON.stringify(Object.fromEntries(map)),
        '{"minecraft:inventory":{"inventory_size":56,"container_type":"minecart_chest"}}'
    )
    assert.equal(warnings.length, 1, '应恰好打一条 warn')
    assert.match(warnings[0], /setInventory\(\) 已废弃/)
    assert.match(warnings[0], /createTileBlock/)

    // 去重：同样消息不再重复打印
    const again = []
    const orig2 = console.warn
    console.warn = (...args) => { again.push(args.join(' ')) }
    try { BlockComponent.setInventory({ inventory_size: 27 }) } finally { console.warn = orig2 }
    assert.equal(again.length, 0)
})

test('BasicBlock.validate：① 方块里出现 minecraft:inventory → warn ② container.slot_count 越界 → warn', () => {
    const capture = (fn) => {
        const out = []
        const orig = console.warn
        console.warn = (...args) => { out.push(args.join(' ')) }
        try { fn() } finally { console.warn = orig }
        return out
    }

    const clean = new BasicBlock('test:clean', 'construction', [...TEX])
    assert.deepEqual(capture(() => clean.validate()), [], '干净方块不该 warn')

    const withInv = new BasicBlock('test:inv', 'construction', [...TEX])
    withInv.addComponent(BlockComponent.setInventory({ inventory_size: 27 }))
    const w1 = capture(() => withInv.validate())
    assert.equal(w1.length, 1)
    assert.match(w1[0], /minecraft:inventory/)
    assert.match(w1[0], /createTileBlock/)

    // 手写（绕过工厂校验）的越界 container：必须被 validate 兜住
    const badContainer = new BasicBlock('test:bad', 'construction', [...TEX])
    badContainer.addComponent(new Map().set('minecraft:block_entity', { container: { slot_count: 56 } }))
    const w2 = capture(() => badContainer.validate())
    assert.equal(w2.length, 1)
    assert.match(w2[0], /slot_count/)

    // 合法的 container：不 warn
    const okContainer = new BasicBlock('test:ok', 'construction', [...TEX])
    okContainer.addComponent(BlockComponent.setBlockEntity(true, { container: { slot_count: 54 } }))
    assert.deepEqual(capture(() => okContainer.validate()), [])
})
