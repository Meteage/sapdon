import { BlockAPI, BlockComponent, BlockCustomComponentBuilder, registry } from '@sapdon/core'

// ── 1. GlassBlock ── 原版玻璃纹理
// /give @s blockdemo:glass
const glass = BlockAPI.createGlassBlock('blockdemo:glass', 'construction', 'glass')
glass.addComponent(BlockComponent.setDisplayName('Glass Block'))

// ── 2. FenceBlock ── 原版橡木纹理
// /give @s blockdemo:fence
const fence = BlockAPI.createFenceBlock('blockdemo:fence', 'construction', [
  'planks_oak', 'planks_oak', 'planks_oak',
  'planks_oak', 'planks_oak', 'planks_oak'
], { leashable: true })
fence.addComponent(BlockComponent.setDisplayName('Oak Fence Block'))

// ── 3. StairBlock ── 原版橡木纹理
// /give @s blockdemo:stair
const stair = BlockAPI.createStairBlock('blockdemo:stair', 'construction', [
  'planks_oak', 'planks_oak', 'planks_oak',
  'planks_oak', 'planks_oak', 'planks_oak'
])
stair.addComponent(BlockComponent.setDisplayName('Oak Stair Block'))

// ── 4. TrapdoorBlock ── 原版橡木纹理
// /give @s blockdemo:trapdoor
const trapdoor = BlockAPI.createTrapdoorBlock('blockdemo:trapdoor', 'construction', 'planks_oak')
trapdoor.addComponent(BlockComponent.setDisplayName('Oak Trapdoor Block'))

// ── 5. 用户自定义组件 ── 声明事件类型，构建后自动生成脚本模板
const headComp = new BlockCustomComponentBuilder('blockdemo:head_rotate')
  .onPlayerInteract()
  .onTick()

// ── 6. HeadBlock ── 自定义头颅（使用用户自定义组件）
// /give @s blockdemo:head
const head = BlockAPI.createHeadBlock('blockdemo:head', 'construction', 'stone', {
  custom_components: [headComp.id()]
})
head.addComponent(BlockComponent.setDisplayName('Custom Head Block'))

// ── 7. CustomBlock ── 教程示例：基础方块（全六面同一纹理 + 常用组件）
// 对应 https://wiki.bedrock.dev/blocks/blocks-intro#adding-components
// /give @s blockdemo:custom_block
const customBlock = BlockAPI.createBasicBlock('blockdemo:custom_block', 'construction', [
  'stone', 'stone', 'stone', 'stone', 'stone', 'stone'
])
customBlock.addComponent(
  BlockComponent.combineComponents(
    BlockComponent.setDestructibleByMiningCustom(3),
    BlockComponent.setDestructibleByExplosionCustom(3),
    BlockComponent.setMapColor('#ffffff'),
    BlockComponent.setLightDampening(0),
    BlockComponent.setLightEmission(4),
    BlockComponent.setDisplayName('Custom Block')
  )
)

// ── 8. CompassBlock ── 教程示例：每面独立纹理（Compass Block）
// 对应 https://wiki.bedrock.dev/blocks/blocks-intro#per-face-textures
// textures 数组顺序与 BasicBlock.material_instances 映射一致：[下,上,北,东,南,西]
// /give @s blockdemo:compass_block
const compassBlock = BlockAPI.createBasicBlock('blockdemo:compass_block', 'construction', [
  'compass_block_down', 'compass_block_up', 'compass_block_north',
  'compass_block_east', 'compass_block_south', 'compass_block_west'
])
compassBlock.addComponent(BlockComponent.setDisplayName('Compass Block'))

// ═══════════════════════════════════════════════════════════════
// Block Components 教程示例
// 对应 https://wiki.bedrock.dev/blocks/block-components
// 全部组件都可通过 BlockComponent 使用，下面演示常用组件组合
// ═══════════════════════════════════════════════════════════════

// ── 9. LampBlock ── 光源方块（Light Emission / Light Dampening / Map Color）
// 对应 wiki 的 "Applying Components" 示例
// /give @s blockdemo:lamp
const lamp = BlockAPI.createBasicBlock('blockdemo:lamp', 'items', [
  'stone', 'stone', 'stone', 'stone', 'stone', 'stone'
])
lamp.addComponent(
  BlockComponent.combineComponents(
    BlockComponent.setLightDampening(0),
    BlockComponent.setLightEmission(15),
    BlockComponent.setMapColor([210, 200, 190]),
    BlockComponent.setDisplayName('Lamp Block')
  )
)

// ── 10. HalfSlab ── 自定义碰撞箱/选择箱（Collision Box / Selection Box）
// 对应 https://wiki.bedrock.dev/blocks/block-components#collision-box
// /give @s blockdemo:half_slab
const halfSlab = BlockAPI.createBasicBlock('blockdemo:half_slab', 'construction', [
  'planks_oak', 'planks_oak', 'planks_oak', 'planks_oak', 'planks_oak', 'planks_oak'
])
halfSlab.addComponent(
  BlockComponent.combineComponents(
    BlockComponent.setCollisionBoxCustom([-8, 0, -8], [16, 8, 16]),
    BlockComponent.setSelectionBoxCustom([-8, 0, -8], [16, 8, 16]),
    BlockComponent.setDisplayName('Half Slab')
  )
)

// ── 11. Workbench ── 合成台（Crafting Table）
// 对应 https://wiki.bedrock.dev/blocks/block-components#crafting-table
// /give @s blockdemo:workbench
const workbench = BlockAPI.createBasicBlock('blockdemo:workbench', 'construction', [
  'planks_oak', 'planks_oak', 'planks_oak', 'planks_oak', 'planks_oak', 'planks_oak'
])
workbench.addComponent(
  BlockComponent.combineComponents(
    BlockComponent.setCraftingTable(['crafting_table', 'blockdemo:workbench'], 'Blockdemo Workbench'),
    BlockComponent.setDisplayName('Blockdemo Workbench')
  )
)

// ── 12. Waterlog ── 可含水方块（Liquid Detection）
// 对应 https://wiki.bedrock.dev/blocks/block-components#liquid-detection
// /give @s blockdemo:waterlog
const waterlog = BlockAPI.createBasicBlock('blockdemo:waterlog', 'construction', [
  'compass_block_up', 'compass_block_up', 'compass_block_up',
  'compass_block_up', 'compass_block_up', 'compass_block_up'
])
waterlog.addComponent(
  BlockComponent.combineComponents(
    BlockComponent.setLiquidDetection({
      detection_rules: [{
        liquid_type: 'water',
        can_contain_liquid: true,
        on_liquid_touches: 'no_reaction'
      }]
    }),
    BlockComponent.setDisplayName('Waterloggable Block')
  )
)

// ── 13. RedstoneLamp ── 红石信号源（Redstone Producer / Conductivity）
// 对应 https://wiki.bedrock.dev/blocks/block-components#redstone-producer
// /give @s blockdemo:redstone_lamp
const redstoneLamp = BlockAPI.createBasicBlock('blockdemo:redstone_lamp', 'items', [
  'stone', 'stone', 'stone', 'stone', 'stone', 'stone'
])
redstoneLamp.addComponent(
  BlockComponent.combineComponents(
    BlockComponent.setRedstoneConductivity(false, true),
    BlockComponent.setRedstoneProducer(15, 'north'),
    BlockComponent.setDisplayName('Redstone Lamp')
  )
)

// ── 14. Slippery ── 光滑方块（Friction）
// 对应 https://wiki.bedrock.dev/blocks/block-components#friction
// /give @s blockdemo:slippery
const slippery = BlockAPI.createBasicBlock('blockdemo:slippery', 'construction', [
  'glass', 'glass', 'glass', 'glass', 'glass', 'glass'
])
slippery.addComponent(
  BlockComponent.combineComponents(
    BlockComponent.setFriction(0.4),
    BlockComponent.setDisplayName('Slippery Block')
  )
)

// ── 15. Flammable ── 可燃方块（Flammable）
// 对应 https://wiki.bedrock.dev/blocks/block-components#flammable
// /give @s blockdemo:flammable
const flammable = BlockAPI.createBasicBlock('blockdemo:flammable', 'nature', [
  'planks_oak', 'planks_oak', 'planks_oak', 'planks_oak', 'planks_oak', 'planks_oak'
])
flammable.addComponent(
  BlockComponent.combineComponents(
    BlockComponent.setFlammableCustom(5, 20, 'always'),
    BlockComponent.setDisplayName('Flammable Block')
  )
)

// ── 16. TickingBlock ── 周期性刻方块（Tick + 自定义组件）
// 对应 https://wiki.bedrock.dev/blocks/block-components#tick
// 需配合自定义组件 onTick 事件钩子使用
// /give @s blockdemo:ticking
const tickComp = new BlockCustomComponentBuilder('blockdemo:tick_update')
  .onTick()

const ticking = BlockAPI.createBasicBlock('blockdemo:ticking', 'construction', [
  'compass_block_south', 'compass_block_south', 'compass_block_south',
  'compass_block_south', 'compass_block_south', 'compass_block_south'
])
ticking.addComponent(
  BlockComponent.combineComponents(
    BlockComponent.setTick([10, 20], true),
    BlockComponent.setCustomComponents([tickComp.id()]),
    BlockComponent.setDisplayName('Ticking Block')
  )
)

// ── 17. Leashable / 可替换 / 标签 / 支撑 ── 更多实用组件
// 对应 https://wiki.bedrock.dev/blocks/block-components#leashable
// /give @s blockdemo:post
const post = BlockAPI.createBasicBlock('blockdemo:post', 'construction', [
  'stone', 'stone', 'stone', 'stone', 'stone', 'stone'
])
post.addComponent(
  BlockComponent.combineComponents(
    BlockComponent.setLeashable([0, 12, 0]),
    BlockComponent.setSupport('fence'),
    BlockComponent.setTags(['blockdemo:post_tag']),
    BlockComponent.setDisplayName('Post Block')
  )
)

// ═══════════════════════════════════════════════════════════════
// Block Traits 教程示例
// 对应 https://wiki.bedrock.dev/blocks/block-traits
// Traits 让引擎按放置情形自动填写 block state，再配合 permutations 生效
// ═══════════════════════════════════════════════════════════════

// ── 18. CustomSlab ── 放置位置特质（Placement Position → vertical_half）
// 对应 https://wiki.bedrock.dev/blocks/block-traits#placement-position
// 放置时引擎自动设置 minecraft:vertical_half（top/bottom），permutations 据此调整碰撞箱
// /give @s blockdemo:custom_slab
const customSlab = BlockAPI.createBasicBlock('blockdemo:custom_slab', 'construction', [
  'compass_block_north', 'compass_block_north', 'compass_block_north',
  'compass_block_north', 'compass_block_north', 'compass_block_north'
])
customSlab.registerTrait('minecraft:placement_position', {
  enabled_states: ['minecraft:vertical_half']
})
customSlab
  .addPermutation("q.block_state('minecraft:vertical_half') == 'bottom'",
    BlockComponent.combineComponents(
      BlockComponent.setCollisionBoxCustom([-8, 0, -8], [16, 8, 16]),
      BlockComponent.setSelectionBoxCustom([-8, 0, -8], [16, 8, 16])
    )
  )
  .addPermutation("q.block_state('minecraft:vertical_half') == 'top'",
    BlockComponent.combineComponents(
      BlockComponent.setCollisionBoxCustom([-8, 8, -8], [16, 8, 16]),
      BlockComponent.setSelectionBoxCustom([-8, 8, -8], [16, 8, 16])
    )
  )
customSlab.addComponent(BlockComponent.setDisplayName('Custom Slab (Trait)'))

// ── 19. CustomRotator ── 放置方向特质（Placement Direction → cardinal_direction）
// 对应 https://wiki.bedrock.dev/blocks/block-traits#placement-direction
// 按玩家朝向自动设置 minecraft:cardinal_direction，permutations 旋转方块
// 使用 compass 六面纹理便于观察旋转效果
// /give @s blockdemo:custom_rotator
const customRotator = BlockAPI.createBasicBlock('blockdemo:custom_rotator', 'construction', [
  'compass_block_down', 'compass_block_up', 'compass_block_north',
  'compass_block_east', 'compass_block_south', 'compass_block_west'
])
customRotator.registerTrait('minecraft:placement_direction', {
  enabled_states: ['minecraft:cardinal_direction'],
  y_rotation_offset: 180
})
customRotator
  .addPermutation("q.block_state('minecraft:cardinal_direction') == 'north'",
    BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, 0, 0], [0, 0, 0])
  )
  .addPermutation("q.block_state('minecraft:cardinal_direction') == 'south'",
    BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, 0, 0], [0, 90, 0])
  )
  .addPermutation("q.block_state('minecraft:cardinal_direction') == 'east'",
    BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, 0, 0], [0, 180, 0])
  )
  .addPermutation("q.block_state('minecraft:cardinal_direction') == 'west'",
    BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, 0, 0], [0, -90, 0])
  )
customRotator.addComponent(BlockComponent.setDisplayName('Custom Rotator (Trait)'))

// ── 20. CustomConnector ── 连接特质（Connection → cardinal_connections）
// 对应 https://wiki.bedrock.dev/blocks/block-traits#connection
// 引擎自动设置 connection_north/south/east/west 状态，permutations 模拟"栅栏"连接效果
// /give @s blockdemo:custom_connector
const customConnector = BlockAPI.createBasicBlock('blockdemo:custom_connector', 'construction', [
  'planks_oak', 'planks_oak', 'planks_oak', 'planks_oak', 'planks_oak', 'planks_oak'
])
customConnector.registerTrait('minecraft:connection', {
  enabled_states: ['minecraft:cardinal_connections']
})
customConnector
  .addPermutation(
    "!q.block_state('minecraft:connection_north') && !q.block_state('minecraft:connection_south') && !q.block_state('minecraft:connection_east') && !q.block_state('minecraft:connection_west')",
    BlockComponent.combineComponents(
      BlockComponent.setCollisionBoxCustom([-3, 0, -3], [6, 16, 6]),
      BlockComponent.setSelectionBoxCustom([-3, 0, -3], [6, 16, 6])
    )
  )
  .addPermutation(
    "q.block_state('minecraft:connection_north') && !q.block_state('minecraft:connection_south') && !q.block_state('minecraft:connection_east') && !q.block_state('minecraft:connection_west')",
    BlockComponent.combineComponents(
      BlockComponent.setCollisionBoxCustom([-3, 0, -8], [6, 16, 11]),
      BlockComponent.setSelectionBoxCustom([-3, 0, -8], [6, 16, 11])
    )
  )
  .addPermutation(
    "q.block_state('minecraft:connection_south') && !q.block_state('minecraft:connection_north') && !q.block_state('minecraft:connection_east') && !q.block_state('minecraft:connection_west')",
    BlockComponent.combineComponents(
      BlockComponent.setCollisionBoxCustom([-3, 0, -3], [6, 16, 11]),
      BlockComponent.setSelectionBoxCustom([-3, 0, -3], [6, 16, 11])
    )
  )
  .addPermutation(
    "q.block_state('minecraft:connection_east') && !q.block_state('minecraft:connection_west') && !q.block_state('minecraft:connection_north') && !q.block_state('minecraft:connection_south')",
    BlockComponent.combineComponents(
      BlockComponent.setCollisionBoxCustom([-3, 0, -3], [11, 16, 6]),
      BlockComponent.setSelectionBoxCustom([-3, 0, -3], [11, 16, 6])
    )
  )
  .addPermutation(
    "q.block_state('minecraft:connection_west') && !q.block_state('minecraft:connection_east') && !q.block_state('minecraft:connection_north') && !q.block_state('minecraft:connection_south')",
    BlockComponent.combineComponents(
      BlockComponent.setCollisionBoxCustom([-8, 0, -3], [11, 16, 6]),
      BlockComponent.setSelectionBoxCustom([-8, 0, -3], [11, 16, 6])
    )
  )
customConnector.addComponent(BlockComponent.setDisplayName('Custom Connector (Trait)'))

// ── 提交所有注册到构建管线 ──
registry.submit()
