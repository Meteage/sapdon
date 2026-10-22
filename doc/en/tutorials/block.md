# Blocks

> Full Chinese original: [`doc/user/tutorials/block.md`](../../user/tutorials/block.md)

```typescript
import { BlockAPI, BlockComponent, RotationTypes, registry } from '@sapdon/core'
```

**Face order is always `[down, up, north, south, west, east]`.** Passing them in another order
does not error — it silently textures the wrong faces.

---

## 1. Basic block

```typescript
const myBlock = BlockAPI.createBasicBlock(
  'my_mod:my_block',
  'nature',                                   // creative category / material group
  ['stone', 'stone', 'stone', 'stone', 'stone', 'stone'],
  { group: 'construction', hide_in_command: false }
)

registry.submit()
```

`createBasicBlock` turns the six names into a `minecraft:material_instances` component. To set
render options yourself:

```typescript
BlockComponent.setMaterialInstances({
  '*': {
    texture: 'my_texture',
    ambient_occlusion: true,
    face_dimming: true,
    render_method: 'opaque',   // opaque | blend | alpha_test | double_sided | alpha_test_single_sided
  }
})
```

## 2. Variants

Each variant maps to a value of the `sapdon:block_variant_tag` block state.

```typescript
const multi = BlockAPI.createBlock(
  'my_mod:multi_block',
  'nature',
  [
    { stateTag: 0, textures: ['stone', 'stone', 'stone', 'stone', 'stone', 'stone'] },
    { stateTag: 1, textures: ['cobblestone', 'cobblestone', 'cobblestone', 'cobblestone', 'cobblestone', 'cobblestone'] },
    { stateTag: 2, textures: ['mossy_cobblestone', 'mossy_cobblestone', 'mossy_cobblestone', 'mossy_cobblestone', 'mossy_cobblestone', 'mossy_cobblestone'] },
  ],
  { render_method: 'alpha_test' }
)

// Components can be scoped to one variant
multi.addVariantComponent(2, BlockComponent.setLightEmission(15))
```

Permutations are generated as `q.block_state('sapdon:block_variant_tag') == N`.

## 3. Rotatable blocks

```typescript
const pillar = BlockAPI.createRotatableBlock(
  'my_mod:pillar',
  'construction',
  ['oak_log_top', 'oak_log_top', 'oak_log', 'oak_log', 'oak_log', 'oak_log'],
  { rotationType: RotationTypes.CARDINAL, yRotationOffset: 0 }
)
```

| Type | Orientations | Typical use |
|------|--------------|-------------|
| `CARDINAL` | N/S/E/W | Pillars, directional decor |
| `FACING` | up/down/N/S/E/W | Furnaces, machines |
| `BLOCK_FACE` | up/down/N/S/E/W | Attached blocks |
| `LOG` | X/Y/Z axis | Logs, grain-aligned blocks |

## 4. Geometry blocks

```typescript
const chair = BlockAPI.createGeometryBlock(
  'my_mod:chair',
  'construction',
  'geometry.chair',
  { '*': { texture: 'oak_planks', render_method: 'opaque' } }
)
```

Multiple material instances, matched to bone names in the geometry:

```typescript
const table = BlockAPI.createGeometryBlock('my_mod:table', 'construction', 'geometry.table', {
  wood:  { texture: 'oak_planks', render_method: 'opaque' },
  metal: { texture: 'iron_block', render_method: 'opaque' },
})
```

The geometry JSON must already exist under `res/models/blocks/` — the framework generates JSON
documents, not models.

## 5. Crops

```typescript
const tomato = BlockAPI.createCropBlock(
  'my_mod:tomato',
  'nature',
  [
    { stateTag: 0, textures: ['wheat_stage_0', 'wheat_stage_0', 'wheat_stage_0', 'wheat_stage_0', 'wheat_stage_0', 'wheat_stage_0'] },
    { stateTag: 1, textures: ['wheat_stage_1', 'wheat_stage_1', 'wheat_stage_1', 'wheat_stage_1', 'wheat_stage_1', 'wheat_stage_1'] },
    { stateTag: 2, textures: ['wheat_stage_2', 'wheat_stage_2', 'wheat_stage_2', 'wheat_stage_2', 'wheat_stage_2', 'wheat_stage_2'] },
    { stateTag: 3, textures: ['wheat_stage_3', 'wheat_stage_3', 'wheat_stage_3', 'wheat_stage_3', 'wheat_stage_3', 'wheat_stage_3'] },
  ],
  { render_method: 'alpha_test' }
)
```

Crops automatically get: disabled collision box, `geometry.crop`, a farmland-only placement
filter, and a selection box that grows per stage.

Growth and bone meal need the built-in runtime component:

```typescript
// scripts/index.ts
import { registerBuiltinComponents } from '@sapdon/runtime'
registerBuiltinComponents()
```

## 6. Ores

```typescript
const rubyOre = BlockAPI.createOreBlock(
  'my_mod:ruby_ore',
  'nature',
  ['diamond_ore', 'diamond_ore', 'diamond_ore', 'diamond_ore', 'diamond_ore', 'diamond_ore']
)
```

One call generates three documents:

| Content | Identifier |
|---------|-----------|
| Block | `my_mod:ruby_ore` |
| Ore feature | `my_mod:ruby_ore_ore_feature` |
| Feature rule | `my_mod:ruby_ore_orefeatre_rule` |

The default rule spawns 10 veins per chunk between Y 0 and 64, replacing stone.

## 7. Block components

```typescript
block.addComponent(BlockComponent.combineComponents(
  BlockComponent.setDisplayName('Demo Block'),
  BlockComponent.setCollisionBoxEnabled(true),
  BlockComponent.setSelectionBoxCustom([-8, 0, -8], [16, 16, 16]),
  BlockComponent.setDestructibleByMiningCustom(2.0, [
    { item: 'minecraft:diamond_pickaxe', destroy_speed: 0.5 },
  ]),
  BlockComponent.setFriction(0.6),
  BlockComponent.setLightEmission(0),
  BlockComponent.setLightDampening(15),
  BlockComponent.setFlammableCustom(0.5, 0.3),
  BlockComponent.setLoot('loot_tables/demo.json'),
  BlockComponent.setMapColor('#888888'),
))
```

Most properties come in three flavours: `...Enabled(bool)`, `...Custom(value)`, and a
map-style setter. Scripted behaviour is declared separately:

```typescript
block.addComponent(BlockComponent.setCustomComponents(['my_mod:machine_tick']))
```

The id must be implemented at runtime — see [Runtime scripts](./runtime-script.md) §4.

## 8. TileBlock

`createTileBlock` creates a block that swaps between a static block and an entity-backed
container.

```typescript
const chest = BlockAPI.createTileBlock(
  'my_mod:chest',
  'construction',
  ['machineblock_0'],
  { entity_texture: 'textures/blocks/entity/normal' }
)
```

How it works: a `BasicBlock` carrying a `sapdon:block_or_entity` state plus an `Entity` with a
container, invulnerability, and no pushing. State 0 renders the block; state 1 hides it and
switches to the entity, which uses a `block_sensor` to detect being broken.

Two texture systems are involved:

- **Block side** (`material_instances`) wants a `terrain_texture.json` key (short name)
- **Entity side** (`client_entity.textures`) wants a resource **path**

Passing only short names makes the client entity report `Missing referenced asset`. Use
`options.entity_texture` to supply the path.

---

## Next

- [Textures](./texture.md) — `terrain_texture.json` and face order
- [Runtime scripts](./runtime-script.md) — tick and interaction logic
