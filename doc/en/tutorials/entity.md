# Entities

> Full Chinese original: [`doc/user/tutorials/entity.md`](../../user/tutorials/entity.md)

An entity is always **two packs in one call**: `createEntity` returns `{ behavior, resource }`.
Forget the resource side and you get an invisible, untextured entity.

```typescript
import { EntityAPI, EntityComponent, registry } from '@sapdon/core'
```

---

## 1. Basic entity

```typescript
const { behavior, resource } = EntityAPI.createEntity(
  'my_mod:custom_entity',
  'textures/entity/custom'
)

behavior.addComponent(EntityComponent.setHealth({ max: 20, value: 20 }))
resource.addGeometry('default', 'geometry.custom')
resource.addTexture('default', 'textures/entity/custom')
resource.addMaterial('default', 'entity_alphatest')

registry.submit()
```

`behavior` writes to the behavior pack, `resource` to the resource pack. Both must be
configured before `registry.submit()`.

## 2. Behavior components

```typescript
behavior.addComponent(
  EntityComponent.combineComponents(
    EntityComponent.setHealth({ max: 40, value: 40 }),
    EntityComponent.setMovement(0.25),
    EntityComponent.setCollisionBox(0.9, 1.4),
    EntityComponent.setPhysics(true, true),
    EntityComponent.setPushable(true),
    EntityComponent.setTypeFamily(['monster']),
  )
)
```

Frequently used: `setHealth`, `setPhysics`, `setCollisionBox`, `setScale`, `setPushable`,
`setDamageSensor`, `setMovement`, `setTypeFamily`, `setRideable`, `setNavigationWalk`,
`setProjectile`, `setJumpStatic`, `setMovementBasic`, `setCustomHitTest`, `setMobEffect`,
`setItemControllable`, `setEquipment`, `setInventoryProperties`.

## 3. Properties

```typescript
behavior.addProperty('my_mod:level', { type: 'int', range: [1, 100], default: 1 })
behavior.addProperty('my_mod:variant', { type: 'int', range: [0, 3], default: 0 })
```

## 4. Events and component groups

```typescript
behavior.addComponentGroup('my_mod:angry', new Map([
  ...EntityComponent.combineComponents(
    EntityComponent.setMovement(0.4),
    new Map([['minecraft:attack', { damage: 10 }]])
  ),
]))

behavior.addEvent('my_mod:become_angry', new Map([
  ['add', { component_groups: ['my_mod:angry'] }],
]))
```

Component groups are inactive until an event adds them. This is the standard way to model
state (calm / angry, closed / open) without scripting.

## 5. Resource pack

```typescript
resource.addTexture('default', 'textures/entity/custom')
resource.addTexture('overlay', 'textures/entity/custom_overlay')
resource.addMaterial('default', 'entity_alphatest')
resource.addGeometry('default', 'geometry.custom')
resource.addAnimation('walk', 'animation.custom.walk')
resource.addAnimationController('controller', 'controller.animation.custom')
resource.addRenderController('controller.render.custom')
resource.setScript('pre_animation', ['variable.tcos = Math.cos(query.life_time * 45.8)'])
resource.setSpawnEgg('textures/entity/custom_spawn_egg', 0)
resource.addParticleEffect('flame', 'my_mod:flame_particle')
resource.addLocator('lead', [0.0, 1.0, 0.0])
```

Geometry, animations, and controllers are **not** generated — the JSON must exist under
`res/models/`, `res/animations/`, `res/render_controllers/`.

## 6. AI behaviours

Every behaviour takes `priority` first and returns a chainable builder; call `.toObject()`
before handing it to `combineComponents`.

```typescript
import {
  NearestAttackableTargetBehavor, TemptBehavior, RandomStrollBehavior,
  PickupItemsBehavior, FollowParentBehavior, FollowMobBehavior,
} from '@sapdon/core'

behavior.addComponent(
  EntityComponent.combineComponents(
    new NearestAttackableTargetBehavor(2, {
      filters: { test: 'is_family', subject: 'other', value: 'player' },
    }).setMustReach(true).setMustSee(false).toObject(),

    new RandomStrollBehavior(6).toObject(),
  )
)
```

Lower priority numbers run first.

## 7. DummyEntity

A marker/GUI entity with physics, collision, pushing, and damage disabled.

```typescript
const { behavior, resource } = EntityAPI.createDummyEntity('my_mod:dummy', 'textures/entity/none')
```

Preset: no physics, not pushable, collision box `0.001`, no damage sensor, empty hit test.

## 8. Projectile

Based on `minecraft:snowball`, inheriting all of its behaviour.

```typescript
const { behavior, resource } = EntityAPI.createProjectile(
  'my_mod:custom_projectile',
  'textures/items/custom_projectile'
)

behavior.addComponent(new Map([['minecraft:projectile', {
  gravity: 0.05,
  power: 1.5,
  inertia: 0.99,
  knockback: true,
  on_hit: { impact_damage: { damage: 8, knockback: true } },
}]]))
```

## 9. NativeEntity

Creates a variant of a vanilla entity, inheriting its behaviour and resources; override only
what differs.

```typescript
const { behavior, resource } = EntityAPI.createNativeEntity('my_mod:native_zombie', 'minecraft:zombie')

behavior.addComponent(EntityComponent.setHealth({ max: 100, value: 100 }))
behavior.addComponent(EntityComponent.setMovement(0.3))
resource.addTexture('default', 'textures/entity/native_zombie')
```

## 10. DisplayItemEntity

An AI-less entity that renders an item it holds — the engine draws the main-hand item on the
`rightItem` bone. Useful for in-transit pipe items, machine samples, and dropped-item
replacements.

```typescript
const { behavior, resource } = EntityAPI.createDisplayItem('my_mod:display_item', {
  texture: 'textures/entity/none',       // the entity has no cube; only affects missing-texture warnings
  pose: { rx: -20, ry: 45, sc: 50 },     // optional defaults
})
```

The framework generates: zero collision / no physics / not pushable / `persistent`,
`minecraft:equipment` (empty) + `minecraft:equippable` (mainhand), a default render
controller, a pose animation binding `rightItem`, the `geometry.sapdon_display_item` model,
and an empty loot table.

At runtime, spawning and posing go through `@sapdon/runtime`:

```typescript
import { spawnDisplayItem, setDisplayPose, getDisplayPose } from '@sapdon/runtime'

setDisplayPose(e, { ry: 0, sc: 200 })   // only the keys you pass are applied
getDisplayPose(e)                        // { rx, ry, rz, px, py, pz, sc }
```

`spawnDisplayItem` returns `undefined` on failure; the other functions never throw (they
`console.warn`).

Entity events, timers, and persistence are covered in [Make a script run](../guides/scripts.md). For drops that feed crafting, see [Recipes](./recipe.md).
