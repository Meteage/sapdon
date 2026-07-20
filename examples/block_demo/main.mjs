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

// ── 提交所有注册到构建管线 ──
registry.submit()
