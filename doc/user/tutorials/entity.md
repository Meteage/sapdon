# 实体创建教程

## 1. 创建基础实体

使用 `EntityAPI.createEntity()` 创建自定义实体。返回对象包含 `.behavior`（行为包）和 `.resource`（资源包）。

```js
import { EntityAPI, registry } from '@sapdon/core'

const { behavior, resource } = EntityAPI.createEntity(
  'my_addon:custom_entity',   // 标识符
  'textures/entity/custom'    // 纹理路径
)

registry.submit()
```

通过 `behavior` 访问行为包，`resource` 访问资源包：

```js
behavior.addComponent(...)   // 添加行为包组件
resource.addTexture(...)     // 添加资源包纹理
```

## 2. 行为包组件

使用 `EntityComponent` 的静态方法创建组件，通过 `behavior.addComponent()` 添加到实体。

```js
import { EntityAPI, registry, EntityComponent } from '@sapdon/core'
import { BasicMovementBundle } from '@sapdon/core'

const { behavior, resource } = EntityAPI.createEntity(
  'my_addon:zombie_custom',
  'textures/entity/zombie_custom'
)

behavior.addComponent(
  EntityComponent.combineComponents(
    // 生命值
    EntityComponent.setHealth({ max: 40, value: 40 }),

    // 移动速度
    EntityComponent.setMovement(0.25),

    // 碰撞箱（宽0.6，高1.9）
    EntityComponent.setCollisionBox(0.6, 1.9),

    // 物理属性（有碰撞，有重力）
    EntityComponent.setPhysics(true, true),

    // 可被推动（非活塞）
    EntityComponent.setPushable(true, false),

    // 实体家族
    EntityComponent.setTypeFamily(['zombie', 'monster', 'undead']),

    // 缩放大小
    EntityComponent.setScale(1.0),

    // 寻路（步行）
    EntityComponent.setNavigationWalk({
      canWalk: true,
      canSwim: true,
      canJump: true,
      avoidWater: false,
      canBreakDoors: true
    }),

    // 静态跳跃
    EntityComponent.setJumpStatic(0.5),

    // 可爬墙
    new Map([['minecraft:can_climb', {}]]),

    // 攻击伤害
    new Map([['minecraft:attack', {
      damage: 5
    }]]),

    // 伤害传感器
    EntityComponent.setDamageSensor(true),

    // 可拴绳
    new Map([['minecraft:leashable', {
      soft_distance: 4.0,
      hard_distance: 6.0
    }]]),

    // 持久化
    new Map([['minecraft:persistent', {}]]),

    // 追踪范围
    new Map([['minecraft:follow_range', {
      value: 32,
      max: 48
    }]]),

    // 可命名
    EntityComponent.setCustomNameable(true, false, {
      event: 'my_addon:on_named',
      target: 'self'
    }, [
      { name: 'Boss', on_named: { event: 'my_addon:boss_mode' } }
    ]),

    // 背包
    EntityComponent.setInventoryProperties({
      inventorySize: 18,
      containerType: 'minecart_chest',
      isPrivate: false
    })
  )
)

// 也可使用 BasicMovementBundle 快速添加移动组件
behavior.addComponent(BasicMovementBundle.serialize())

registry.submit()
```

## 3. 行为包属性

使用 `behavior.addProperty()` 定义实体属性（用于实体定义中的 `properties` 字段）。

```js
behavior.addProperty('my_addon:level', {
  type: 'int',
  range: [1, 100],
  default: 1
})

behavior.addProperty('my_addon:variant', {
  type: 'int',
  range: [0, 3],
  default: 0
})
```

## 4. 行为包事件与组件组

`addEvent()` 定义事件，`addComponentGroup()` 定义组件组。事件通过 `Map` 结构关联触发条件。

```js
// 创建组件组
behavior.addComponentGroup('my_addon:angry', new Map([
  ...EntityComponent.combineComponents(
    EntityComponent.setMovement(0.4),
    new Map([['minecraft:attack', { damage: 10 }]])
  )
]))

behavior.addComponentGroup('my_addon:calm', new Map([
  ...EntityComponent.combineComponents(
    EntityComponent.setMovement(0.2),
    new Map([['minecraft:attack', { damage: 5 }]])
  )
]))

// 添加事件
behavior.addEvent('my_addon:become_angry', new Map([
  ['add', { component_groups: ['my_addon:angry'] }]
]))

behavior.addEvent('my_addon:become_calm', new Map([
  ['remove', { component_groups: ['my_addon:angry'] }],
  ['add', { component_groups: ['my_addon:calm'] }]
]))
```

## 5. 资源包配置

通过 `resource` (ClientEntity) 配置模型、纹理、材质、动画、生成蛋等。

```js
// 纹理
resource.addTexture('default', 'textures/entity/zombie_custom')
resource.addTexture('overlay', 'textures/entity/zombie_custom_overlay')

// 材质
resource.addMaterial('default', 'entity_alphatest')

// 几何体模型
resource.addGeometry('default', 'geometry.zombie.custom')

// 动画
resource.addAnimation('walk', 'animation.zombie.custom.walk')
resource.addAnimation('attack', 'animation.zombie.custom.attack')

// 动画控制器
resource.addAnimationController('controller', 'controller.animation.zombie.custom')

// 渲染控制器
resource.addRenderController('controller.render.zombie_custom')

// 设置脚本（如 pre_animation）
resource.setScript('pre_animation', [
  'variable.tcos = Math.cos(query.life_time * 45.8)'
])

// 生成蛋
resource.setSpawnEgg('textures/entity/zombie_spawn_egg', 0)

// 粒子效果
resource.addParticleEffect('flame', 'my_addon:flame_particle')

// 定位器
resource.addLocator('lead', [0.0, 1.0, 0.0])

registry.submit()
```

## 6. AI 行为

AI 行为类均接受 `priority` 作为第一参数，拥有链式 setter 方法。

```js
import {
  NearestAttackableTargetBehavor,
  TemptBehavior,
  RandomStrollBehavior,
  PickupItemsBehavior,
  FollowParentBehavior,
  FollowMobBehavior
} from '@sapdon/core'

const { behavior } = EntityAPI.createEntity('my_addon:animal', 'textures/entity/animal')

behavior.addComponent(
  EntityComponent.combineComponents(
    // 攻击目标
    new NearestAttackableTargetBehavor(2, {
      filters: { test: 'is_family', subject: 'other', value: 'player' }
    })
      .setMustReach(true)
      .setMustSee(false)
      .toObject(),

    // 诱惑行为
    new TemptBehavior(3)
      .setItems(['minecraft:wheat'])
      .setSpeedMultiplier(1.2)
      .canGetScared(true)
      .setWithinRadius(10)
      .toObject(),

    // 随机漫步
    new RandomStrollBehavior(4, 120, 1.0)
      .setXZDist(10)
      .setYDist(7)
      .toObject(),

    // 拾取物品（类似 Allay）
    new PickupItemsBehavior(5)
      .setMaxDist(32)
      .setSearchHeight(16)
      .setSpeedMultiplier(4.0)
      .setCanPickupAnyItem(true)
      .toObject(),

    // 跟随父母
    new FollowParentBehavior(6)
      .setSpeedMultiplier(1.1)
      .toObject(),

    // 跟随其他生物
    new FollowMobBehavior(1)
      .setSearchRange(10)
      .setSpeedMultiplier(1.5)
      .setStopDistance(2.0)
      .toObject()
  )
)

registry.submit()
```

## 7. DummyEntity — 无物理虚拟实体

`DummyEntity` 预先配置了禁用的物理、碰撞箱、推动和伤害，适合用作标记点或 GUI 实体。

```js
import { EntityAPI, registry } from '@sapdon/core'

const { behavior, resource } = EntityAPI.createDummyEntity(
  'my_addon:dummy',
  'textures/entity/none'
)

// DummyEntity 会自动设置：
// - 无物理 (Physics: false)
// - 不可推动
// - 极小的碰撞箱 (0.001)
// - 无伤害传感器
// - 自定义碰撞命中测试为空

registry.submit()
```

## 8. Projectile — 抛射物

`Projectile` 继承自 `NativeEntity`，基于 `minecraft:snowball`。自动继承雪球的全部行为属性，只需指定纹理。

```js
import { EntityAPI, registry } from '@sapdon/core'

const { behavior, resource } = EntityAPI.createProjectile(
  'my_addon:custom_projectile',
  'textures/items/custom_projectile'
)

// 可额外添加行为包组件
behavior.addComponent(
  new Map([['minecraft:projectile', {
    gravity: 0.05,
    power: 1.5,
    inertia: 0.99,
    knockback: true,
    on_hit: {
      impact_damage: {
        damage: 8,
        knockback: true
      }
    }
  }]])
)

registry.submit()
```

## 9. NativeEntity — 基于原版实体

`NativeEntity` 基于一个已有原版实体（如 `minecraft:zombie`）创建变种，自动继承其行为包和资源包数据。

```js
import { EntityAPI, registry } from '@sapdon/core'

const { behavior, resource } = EntityAPI.createNativeEntity(
  'my_addon:native_zombie',   // 新标识符
  'minecraft:zombie'           // 原版实体 ID
)

// 覆盖原版属性
behavior.addComponent(
  EntityComponent.setHealth({ max: 100, value: 100 })
)

behavior.addComponent(
  EntityComponent.setMovement(0.3)
)

// 修改纹理
resource.addTexture('default', 'textures/entity/native_zombie')

registry.submit()
```
