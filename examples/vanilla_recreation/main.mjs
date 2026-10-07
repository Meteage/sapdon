import { BlockAPI, BlockComponent, ItemAPI, ItemComponent, ItemCategory, ContainerUISystem, registry } from '@sapdon/core'

// ─────────────────────────────────────────────────────────────────────────────
// 「原版复刻」示例：只用框架的 ContainerUISystem 复刻两个原版容器
//   ① 熔炉 —— 方块容器（minecraft:block_entity.container）+ 自定界面：
//        槽 0/1 = 原料/燃料（输入），槽 2 = 产物（输出），槽 3/4 = 箭头/火焰进度。
//   ② 箱子 —— 方块容器 + 自定界面：27 格（9×3），原版箱子模型（geometry.mob_chest）。
//
// 门控键 = ContainerUISystem 的 name（identifier 冒号后半段）；
//   方块的 minecraft:block_entity.container.title 必须等于该键。
//   ★ 引擎给「自定义方块容器」开的屏是 data_driven_container.screen —— 框架的
//     ChestUISystem.registerContainerUI 已自动向 ui/data_driven_container_screen.json
//     注册门控，所以这里 new 一个 ContainerUISystem 就自动生效（无需手写 UI 文件）。
// ─────────────────────────────────────────────────────────────────────────────
const NS = 'vanilla_recreation'
const FMT = '1.26.60'

// ── ① 熔炉 ───────────────────────────────────────────────────────────────────
const FURNACE_UI = 'furnace_ui'

const furnaceUI = new ContainerUISystem(`${NS}_furnace:${FURNACE_UI}`, 'ui/')
furnaceUI.setTitle('熔炉')
furnaceUI.setPanel({ size: [180, 166] })            // 与原版熔炉同高
furnaceUI.setGridOrigin([8, 22])                    // 让开顶部标题
furnaceUI.setSlotDefaults({ cellSize: [18, 18] })   // = 原版 container_item 尺寸
furnaceUI.addSlot({ slot: 0, pos: [50, 22], kind: 'input' })                                        // 原料
furnaceUI.addSlot({ slot: 1, pos: [50, 60], kind: 'input' })                                        // 燃料
// ★ 输出槽必须显式 enabled:true：kind:'output' 的缺省是 enabled:false（整体禁用该格，连取都取不出）
furnaceUI.addSlot({ slot: 2, pos: [108, 37], kind: 'output', enabled: true, cellSize: [26, 26] })   // 产物
// 进度指示：箭头 22×15、火焰 13×13（用原版贴图；比例取本格物品耐久，脚本每 tick 写入）
furnaceUI.addProgressSlot({ slot: 3, pos: [77, 42], size: [22, 15], base: 'textures/ui/arrow_inactive', fill: 'textures/ui/arrow_active', clipDirection: 'left' })
furnaceUI.addProgressSlot({ slot: 4, pos: [52, 43], size: [13, 13], base: 'textures/ui/flame_empty_image', fill: 'textures/ui/flame_full_image', clipDirection: 'down' })

// 进度物品（脚本把「剩余耐久 = 进度」写进槽 3/4；图标被格子藏掉，借用原版 stick 键免新增贴图）
ItemAPI.createItem(`${NS}:furnace_progress`, ItemCategory.None, 'stick', {})
  .addComponent(ItemComponent.setDurability(100))

// 熔炉方块：原版熔炉贴图（[上,下,东,西,南,北]）+ 方块容器（title = 界面门控键）
const furnace = BlockAPI.createBasicBlock(`${NS}:furnace`, 'construction', [
  'furnace_top', 'furnace_top', 'furnace_side', 'furnace_side', 'furnace_side', 'furnace_front_off',
], { format_version: FMT })
furnace.addComponent(BlockComponent.combineComponents(
  BlockComponent.setTick([0, 0], true),
  BlockComponent.setCustomComponents([`${NS}:furnace_tick`])
))
furnace.addComponent(new Map([
  ['minecraft:display_name', 'tile.vanilla_recreation:furnace.name'],
  ['minecraft:block_entity', { dynamic_properties: true, container: { slot_count: 5, title: FURNACE_UI } }],
]))

// ── ② 箱子 ───────────────────────────────────────────────────────────────────
const CHEST_UI = 'chest_ui'

const chestUI = new ContainerUISystem(`${NS}_chest:${CHEST_UI}`, 'ui/')
chestUI.setTitle('箱子')
chestUI.setPanel({ size: [180, 166] })
chestUI.setGridOrigin([8, 22])
chestUI.setSlotDefaults({ cellSize: [18, 18] })
// 27 格 = 9 列 × 3 行（原版箱子布局）；全部按「输入」声明（玩家自由存取）
for (let i = 0; i < 27; i++) {
  const col = i % 9
  const row = Math.floor(i / 9)
  chestUI.addSlot({ slot: i, pos: [8 + col * 18, 22 + row * 18], kind: 'input' })
}

// 箱子方块：原版箱子模型（geometry.mob_chest）+ 地形贴图 + 方块容器（title = 界面门控键）
const chest = BlockAPI.createGeometryBlock(
  `${NS}:chest`,
  'construction',
  'geometry.mob_chest',
  { '*': { texture: 'chest', render_method: 'alpha_test' } },
  { format_version: FMT }
)
chest.addComponent(new Map([
  ['minecraft:display_name', 'tile.vanilla_recreation:chest.name'],
  ['minecraft:block_entity', { dynamic_properties: true, container: { slot_count: 27, title: CHEST_UI } }],
]))

registry.submit()
