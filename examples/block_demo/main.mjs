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
    BlockComponent.setSound('grass'),
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

// ── 提交所有注册到构建管线 ──
registry.submit()
