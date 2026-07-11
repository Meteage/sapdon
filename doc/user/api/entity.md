# 实体系统 API 参考

## EntityAPI

`EntityAPI` 是实体工厂对象，包含四个创建方法，均返回 `{ behavior: BasicEntity, resource: ClientEntity }`。

### `EntityAPI.createEntity(identifier, texture, options?, behData?, resData?)`

创建普通自定义实体。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| identifier | string | — | 唯一标识符，如 `my_addon:my_entity` |
| texture | string | — | 纹理路径，如 `textures/entity/my_entity` |
| options | Object | `{}` | 可选配置，含 `is_spawnable`, `is_summonable`, `runtime_identifier` |
| behData | Object | `{}` | 继承的行为包数据 |
| resData | Object | `{}` | 继承的资源包数据 |

```js
import { EntityAPI, registry } from '@sapdon/core'
const entity = EntityAPI.createEntity('my_addon:robot', 'textures/entity/robot', {
  is_spawnable: true,
  is_summonable: true
})
registry.submit()
```

### `EntityAPI.createNativeEntity(identifier, proto_id, options?)`

基于原版实体创建变种，自动复制原版行为包与资源包数据，设置 `runtime_identifier`。

| 参数 | 类型 | 说明 |
|------|------|------|
| identifier | string | 新实体标识符 |
| proto_id | string | 原版实体 ID，如 `minecraft:zombie` |
| options | Object | 额外配置 |

```js
const { behavior, resource } = EntityAPI.createNativeEntity(
  'my_addon:ice_zombie',
  'minecraft:zombie'
)
```

### `EntityAPI.createProjectile(identifier, texture, options?)`

创建抛射物实体，基于 `minecraft:snowball` 原型。

```js
const { behavior, resource } = EntityAPI.createProjectile(
  'my_addon:fire_ball',
  'textures/items/fire_ball'
)
```

### `EntityAPI.createDummyEntity(identifier, texture, options?, behData?, resData?)`

创建无物理的虚拟实体，适用于标记点、GUI 实体等。自动禁用物理、碰撞、推动和伤害。

```js
const { behavior, resource } = EntityAPI.createDummyEntity(
  'my_addon:waypoint',
  'textures/entity/none'
)
```

---

## Entity 类

实体容器类，包含 `behavior` 和 `resource` 两个属性。

```js
import { Entity } from '@sapdon/core'

const entity = new Entity('my_addon:entity', 'textures/entity/tex')
entity.behavior  // BasicEntity 实例
entity.resource  // ClientEntity 实例
```

### `entity.behavior` — BasicEntity 实例

行为包操作入口。

### `entity.resource` — ClientEntity 实例

资源包操作入口。

---

## EntityComponent

静态方法集合，每个方法返回 `Map` 对象。使用 `combineComponents` 可将多个 Map 合并。

### `EntityComponent.setHealth({ max, value })`

创建 `minecraft:health` 组件。`value` 可为数字或 `{ range_min, range_max }` 范围对象。

```js
EntityComponent.setHealth({ max: 40, value: 40 })
EntityComponent.setHealth({ max: 30, value: { range_min: 20, range_max: 30 } })
```

### `EntityComponent.setPhysics(has_collision?, has_gravity?, push_towards_closest_space?)`

创建 `minecraft:physics` 组件。默认 `true, true, false`。

```js
EntityComponent.setPhysics(true, true)        // 有碰撞，有重力
EntityComponent.setPhysics(false, false)      // 无碰撞，无重力（用于 DummyEntity）
```

### `EntityComponent.setCollisionBox(width, height)`

创建 `minecraft:collision_box` 组件。

```js
EntityComponent.setCollisionBox(0.6, 1.9)
```

### `EntityComponent.setScale(value)`

创建 `minecraft:scale` 组件。`value` 默认为 1.0。

```js
EntityComponent.setScale(2.0)
```

### `EntityComponent.setPushable(isPushable?, isPushableByPiston?)`

创建 `minecraft:pushable` 组件。默认 `true, true`。

```js
EntityComponent.setPushable(false, false)
```

### `EntityComponent.setDamageSensor(deals_damage)`

创建 `minecraft:damage_sensor` 组件。

```js
EntityComponent.setDamageSensor(true)
EntityComponent.setDamageSensor(false)
```

### `EntityComponent.setMovement(speed)`

创建 `minecraft:movement` 组件，设置移动速度。

```js
EntityComponent.setMovement(0.25)
```

### `EntityComponent.setTypeFamily(family_arr)`

创建 `minecraft:type_family` 组件，定义实体家族类型。

```js
EntityComponent.setTypeFamily(['zombie', 'monster', 'undead'])
```

### `EntityComponent.setRideable(config)`

创建 `minecraft:rideable` 组件，使实体可骑乘。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| controllingSeat | number | 1 | 控制座位编号 |
| crouchingSkipInteract | boolean | true | 潜行跳过交互 |
| familyTypes | string[] | `['player']` | 可骑乘的实体家族 |
| interactText | string | 'drive' | 交互文本 |
| seatCount | number | — | 座位数量 |
| seats | Array | — | 座位配置 |
| passengerMaxWidth | number | — | 乘客最大宽度 |
| pullInEntities | boolean | — | 是否拉入实体 |

```js
EntityComponent.setRideable({
  seatCount: 2,
  seats: [
    { position: [0, 0.5, 0] },
    { position: [0, 0.5, -0.5] }
  ]
})
```

### `EntityComponent.setNavigationWalk(options)`

创建 `minecraft:navigation.walk` 组件，配置步行寻路。

```js
EntityComponent.setNavigationWalk({
  canWalk: true,
  canSwim: true,
  canJump: true,
  canBreakDoors: false,
  avoidWater: false,
  canFloat: true
})
```

### `EntityComponent.setProjectile(options)`

创建 `minecraft:projectile` 组件，配置抛射物属性。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| gravity | number | 0.05 | 重力 |
| power | number | 1.3 | 初速度 |
| inertia | number | 0.99 | 空气惯性 |
| knockback | boolean | true | 是否击退 |
| homing | boolean | false | 是否追踪 |
| lightning | boolean | false | 是否召唤闪电 |
| shouldBounce | boolean | false | 是否反弹 |
| hitSound | string | — | 命中音效 |
| particle | string | 'ironcrack' | 碰撞粒子 |

```js
EntityComponent.setProjectile({
  gravity: 0.05,
  power: 2.0,
  knockback: true,
  on_hit: { impact_damage: { damage: 10 } }
})
```

### `EntityComponent.setJumpStatic(jumpPower?)`

创建 `minecraft:jump.static` 组件，默认跳跃力 0.42。

```js
EntityComponent.setJumpStatic(0.5)
```

### `EntityComponent.setMovementBasic(maxTurn?)`

创建 `minecraft:movement.basic` 组件，默认最大转向角 30.0。

```js
EntityComponent.setMovementBasic(30.0)
```

### `EntityComponent.setCustomHitTest(hitboxes)`

创建 `minecraft:custom_hit_test` 组件，用于自定义命中框。

```js
EntityComponent.setCustomHitTest([
  { pivot: [0, 100, 0], width: 0, height: 0 }
])
```

### `EntityComponent.setMobEffect({ effect, range?, duration?, cooldown?, filter? })`

创建 `minecraft:mob_effect` 组件。

```js
EntityComponent.setMobEffect({
  effect: 'minecraft:poison',
  range: 0.2,
  duration: 10
})
```

### `EntityComponent.setItemControllable(controlItems)`

创建 `minecraft:item_controllable` 组件。

```js
EntityComponent.setItemControllable('carrotOnAStick')
EntityComponent.setItemControllable(['carrotOnAStick', 'warped_fungus_on_a_stick'])
```

### `EntityComponent.setEquipment({ table?, slotDropChance? })`

创建 `minecraft:equipment` 组件，配置装备掉落。

```js
EntityComponent.setEquipment({
  table: 'loot_tables/entities/skeleton_gear.json'
})

EntityComponent.setEquipment({
  slotDropChance: [
    { slot: 'slot.weapon.mainhand', dropChance: 1 }
  ]
})
```

### `EntityComponent.setInventoryProperties(options)`

创建 `minecraft:inventory` 组件。

| 参数 | 类型 | 说明 |
|------|------|------|
| additionalSlotsPerStrength | number | 每力量值增加的额外槽位 |
| canBeSiphonedFrom | boolean | 是否允许漏斗抽取 |
| containerType | string | 容器类型 |
| inventorySize | number | 库存槽位数 |
| isPrivate | boolean | 死亡是否掉落 |
| restrictToOwner | boolean | 仅所有者可访问 |

```js
EntityComponent.setInventoryProperties({
  inventorySize: 18,
  containerType: 'minecart_chest'
})
```

### `EntityComponent.combineComponents(...componentMaps)`

合并多个 `Map` 组件为一个 `Map`，方便一次添加。

```js
EntityComponent.combineComponents(
  EntityComponent.setHealth({ max: 20, value: 20 }),
  EntityComponent.setMovement(0.25)
)
```

### 其他辅助方法

| 方法 | 说明 |
|------|------|
| `setIsStackable()` | 实体可堆叠 |
| `setGroupSize(radius?, filter?)` | 群体大小检测 |
| `setEquipItem(options?)` | 装备物品行为 |
| `setFireImmune(value?)` | 火焰免疫 |
| `setGrowsCrop({ chance?, charges? })` | 促进作物生长 |
| `setInstantDespawn({ removeChildEntities? })` | 立即消失 |
| `setInsideBlockNotifier(blockList)` | 方块内部通知器 |
| `setDefaultNameable()` | 可命名（默认配置） |
| `setCustomNameable(allowNameTagRenaming?, alwaysShow?, defaultTrigger?, nameActions?)` | 可命名（自定义） |
| `setInputGroundControlled()` | 地面输入控制 |
| `setVariableMaxAutoStep(base?, controlled?, jumpPrevented?)` | 可变自动踏步 |

---

## AI Behavior 类

所有行为类实现 `toObject()` 方法，返回 `Map`，可直接传入 `addComponent()`。

### NearestAttackableTargetBehavor

选择最近的可攻击目标。

```js
new NearestAttackableTargetBehavor(priority, entity_types)
  .setMustReach(true)       // 需要到达目标位置
  .setMustSee(true)         // 需要看见目标
  .toObject()
```

**参数**
- `priority` (number) — 优先级
- `entity_types` (Object) — 实体过滤器，如 `{ filters: { test: 'is_family', value: 'player' } }`

### TemptBehavior

使用物品吸引实体跟随。

```js
new TemptBehavior(priority)
  .setItems(['minecraft:wheat'])   // 吸引物品列表
  .setSpeedMultiplier(1.2)         // 移动速度倍率
  .canGetScared(true)              // 是否会被吓跑
  .canTemptVertically(false)       // 是否考虑垂直距离
  .canTemptWhileRidden(false)      // 骑乘时是否受影响
  .setWithinRadius(10)             // 吸引半径
  .setTemptSound('mob.sheep.say') // 吸引音效
  .setSoundInterval(2, 5)          // 音效随机间隔
  .toObject()
```

### RandomStrollBehavior

随机漫步行为。

```js
new RandomStrollBehavior(priority, interval, speed_multiplier)
  .setXZDist(10)    // 水平移动范围
  .setYDist(7)      // 垂直移动范围
  .toObject()
```

**参数**
- `priority` (number) — 优先级
- `interval` (number) — 移动间隔（游戏刻）
- `speed_multiplier` (number) — 速度倍率

### PickupItemsBehavior

拾取物品行为（类似 Allay / Drowned）。

```js
new PickupItemsBehavior(priority)
  .setCanPickupAnyItem(true)                       // 是否拾取任意物品
  .setCanPickupToHandOrEquipment(true)             // 是否拾取到手中/装备栏
  .setCooldownAfterBeingAttacked(100)              // 被攻击后冷却
  .setExcludedItems(['minecraft:glow_ink_sac'])    // 排除的物品
  .setGoalRadius(0.5)                              // 判定半径
  .setMaxDist(32)                                  // 最大搜索距离
  .setPickupBasedOnChance(false)                   // 随机拾取
  .setPickupSameItemsAsInHand(true)                // 仅拾取相同物品
  .setSearchHeight(16)                             // 垂直搜索范围
  .setSpeedMultiplier(4.0)                         // 速度倍率
  .setTrackTarget(true)                            // 追踪目标
  .toObject()
```

### FollowParentBehavior

幼年实体跟随成年实体。

```js
new FollowParentBehavior(priority)
  .setSpeedMultiplier(1.1)
  .toObject()
```

### FollowMobBehavior

跟随其他生物。

```js
new FollowMobBehavior(priority)
  .setSearchRange(10)           // 搜索范围
  .setSpeedMultiplier(1.5)      // 速度倍率
  .setStopDistance(2.0)         // 停止距离
  .toObject()
```

---

## BasicEntity

行为包实体操作类，通过 `EntityAPI` 返回的 `.behavior` 访问。

### `basicEntity.addProperty(id, { type, range, default })`

添加实体属性（定义在实体 description 的 properties 中）。

```js
behavior.addProperty('my_addon:level', {
  type: 'int',
  range: [1, 100],
  default: 1
})
```

### `basicEntity.addEvent(name, eventMap)`

添加事件。`eventMap` 必须是 `Map` 实例，键为 `'add'` / `'remove'`，值为 `{ component_groups: [...] }`。

```js
behavior.addEvent('my_addon:transform', new Map([
  ['add', { component_groups: ['group_a'] }],
  ['remove', { component_groups: ['group_b'] }]
]))
```

### `basicEntity.addComponentGroup(name, componentMap)`

添加组件组。`componentMap` 必须是 `Map` 实例。

```js
behavior.addComponentGroup('my_addon:enraged', new Map([
  ...EntityComponent.combineComponents(
    EntityComponent.setMovement(0.5),
    new Map([['minecraft:attack', { damage: 15 }]])
  )
]))
```

### `basicEntity.addComponent(componentMap)`

添加组件。`componentMap` 必须是 `Map` 或行为类的 `toObject()` 返回值。

```js
behavior.addComponent(EntityComponent.setHealth({ max: 20, value: 20 }))
behavior.addComponent(new TemptBehavior(3).setItems(['minecraft:wheat']).toObject())
```

### `basicEntity.removeComponent(key)`

删除组件。

```js
behavior.removeComponent('minecraft:health')
```

### 其他方法

| 方法 | 说明 |
|------|------|
| `removeProperty(name)` | 删除属性 |
| `clearProperties()` | 清除所有属性 |
| `removeEvent(name)` | 删除事件 |
| `clearEvents()` | 清除所有事件 |
| `removeComponentGroup(name)` | 删除组件组 |
| `clearComponentGroups()` | 清除所有组件组 |
| `clearComponents()` | 清除所有组件 |
| `clearAll()` | 清除全部数据 |

---

## ClientEntity

客户端实体类（继承自 `AddonClientEntityDescription`），通过 `EntityAPI` 返回的 `.resource` 访问。

### `clientEntity.addTexture(name, path)`

添加纹理映射。

```js
resource.addTexture('default', 'textures/entity/my_entity')
```

### `clientEntity.addMaterial(name, material)`

添加材质。

```js
resource.addMaterial('default', 'entity_alphatest')
```

### `clientEntity.addGeometry(name, geometry)`

添加几何体模型。

```js
resource.addGeometry('default', 'geometry.my_entity')
```

### `clientEntity.addAnimation(name, animation)`

添加动画。

```js
resource.addAnimation('walk', 'animation.my_entity.walk')
resource.addAnimation('attack', 'animation.my_entity.attack')
```

### `clientEntity.addAnimationController(name, controller)`

添加动画控制器。

```js
resource.addAnimationController('controller', 'controller.animation.my_entity')
```

### `clientEntity.addRenderController(controller)`

添加渲染控制器。

```js
resource.addRenderController('controller.render.my_entity')
```

### `clientEntity.addParticleEffect(name, particle)`

添加粒子效果。

```js
resource.addParticleEffect('flame', 'my_addon:flame_particle')
```

### `clientEntity.addLocator(name, position)`

添加定位器（用于附着点）。

```js
resource.addLocator('lead', [0.0, 1.0, 0.0])
```

### `clientEntity.setSpawnEgg(texture, texture_index)`

设置生成蛋。

```js
resource.setSpawnEgg('textures/entity/spawn_egg', 0)
```

### `clientEntity.setScript(key, value)`

设置脚本（如 `pre_animation`、`animate`、`scale` 等）。

```js
resource.setScript('pre_animation', [
  'variable.tcos = Math.cos(query.life_time * 45.8)'
])
resource.setScript('animate', ['walk', 'attack'])
```

---

## DummyEntity

无物理虚拟实体。继承自 `Entity`，预设以下配置：

- `minecraft:physics` — `has_collision: false`, `has_gravity: false`
- `minecraft:pushable` — `is_pushable: false`, `is_pushable_by_piston: false`
- `minecraft:collision_box` — `width: 0.001, height: 0.001`
- `minecraft:damage_sensor` — `deals_damage: false`
- `minecraft:custom_hit_test` — 空命中框

```js
import { DummyEntity } from '@sapdon/core'

const dummy = new DummyEntity('my_addon:dummy', 'textures/entity/none')
```

---

## Projectile

抛射物实体。继承自 `NativeEntity`，基于 `minecraft:snowball`。

```js
import { Projectile } from '@sapdon/core'

const proj = new Projectile('my_addon:fireball', 'textures/items/fireball')
```

---

## NativeEntity

原生实体。基于原版实体创建变种，自动从内置数据源加载原版行为包与资源包数据。

```js
import { NativeEntity } from '@sapdon/core'

const native = new NativeEntity(
  'my_addon:cold_zombie',
  'minecraft:zombie',
  {}
)
// native.behavior — 基本实体，包含原版所有组件
// native.resource — 客户端实体，包含原版纹理、模型等
```

---

## Component Bundles

### BasicMovementBundle

预配置的移动组件捆绑包，包含 `minecraft:movement`（速度 0.2）和 `minecraft:movement.basic`。

```js
import { BasicMovementBundle } from '@sapdon/core'

behavior.addComponent(BasicMovementBundle.serialize())
```

### BasicBundle

自定义组件捆绑包容器。

```js
import { BasicBundle, EntityComponent } from '@sapdon/core'

const myBundle = new BasicBundle()
myBundle.addComponent(EntityComponent.setHealth({ max: 50, value: 50 }))
myBundle.addComponent(
  EntityComponent.combineComponents(
    EntityComponent.setMovement(0.3),
    EntityComponent.setJumpStatic(0.5)
  )
)

behavior.addComponent(myBundle.serialize())
```

```js
// 批量添加
myBundle.addComponents([
  EntityComponent.setCollisionBox(0.6, 1.9),
  EntityComponent.setScale(1.2)
])

// 删除组件
myBundle.removeComponent('minecraft:scale')
```
