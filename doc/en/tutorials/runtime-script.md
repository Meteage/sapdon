# Runtime Scripts

> Full Chinese original: [`doc/user/tutorials/runtime-script.md`](../../user/tutorials/runtime-script.md)

The build entry (`main.ts`) generates JSON. The runtime entry (`scripts/`) makes things happen
in-game. This page covers where the script comes from and how it connects to what you declared
at build time.

---

## 1. Build time vs runtime

| | Build time (`main.ts`) | Runtime (`scripts/*.ts`) |
|---|---|---|
| Runs in | Node.js, during the build | Minecraft's script engine |
| May import | `@sapdon/core` | `@sapdon/runtime`, `@minecraft/server`, `@minecraft/server-ui` |
| Produces | JSON in `dev/<name>_BP` / `_RP` | `scripts/index.js` |
| Key call | `registry.submit()` | event subscriptions, component registration |

**Hard rule:** importing `@sapdon/core` from a runtime script leaves an unresolvable bare
package name in the bundle. The game fails to load the script. `@sapdon/core` is build-time
only.

## 2. Entry point and config

```json
{
  "formatVersion": 2,
  "buildOptions": {
    "buildEntry": "main.ts",
    "scriptEntry": "scripts/index.ts",
    "scriptOutput": "scripts/index.js",
    "dependencies": [
      { "module_name": "@minecraft/server", "version": "2.0.0" }
    ]
  }
}
```

- `scriptEntry` — everything reachable from this file is bundled into one script
- `scriptOutput` — path relative to `dev/<name>_BP/`
- `dependencies` — written into `manifest.json`. **Every `@minecraft/*` module you import must be
  listed.** Miss one and the whole bundle fails to load with only a line in the content log

Changing `dependencies` requires deleting `dev/<name>_BP/manifest.json`, because the manifest is
only generated when absent.

The TypeScript template ships this entry:

```typescript
import { MinecraftMain, MinecraftGameInstance, registerBuiltinComponents } from '@sapdon/runtime'
import './custom_components/index.js'

registerBuiltinComponents()

@MinecraftMain
export class Main extends MinecraftGameInstance {}
```

If you only need a few events, you can drop all of it and use style A below.

## 3. Style A — subscribe directly

The most common and easiest-to-debug approach: top-level subscriptions in `scripts/index.ts`.

```typescript
import { world, system } from '@minecraft/server'

world.afterEvents.itemUse.subscribe((event) => {
  const player = event.source
  if (player.typeId !== 'minecraft:player') return
  if (event.itemStack?.typeId !== 'my_mod:magic_wand') return

  player.sendMessage('§aWand activated')
  player.dimension.spawnParticle('minecraft:totem_particle', player.location)
})
```

- Subscribe at **module load** (top-level statements), never inside a timeout or a startup event
- `world.beforeEvents.*` handlers **must not mutate the world**; defer with `system.run()`
- Event sources are often `Entity`; check `typeId === 'minecraft:player'` before using player APIs

Split files freely — anything imported from `scripts/index.ts` is bundled:

```
scripts/
├── index.ts      # imports and subscriptions only
├── wand.ts
└── shop.ts
```

## 4. Style B — OC game instance

Use this when you want component lifecycles tied to entity spawn and driver loops.

```typescript
import { world } from '@minecraft/server'
import { MinecraftMain, MinecraftGameInstance } from '@sapdon/runtime'

@MinecraftMain
export class Main extends MinecraftGameInstance {
  afterStart(): void {
    world.afterEvents.itemUse.subscribe((e) => {
      world.sendMessage(`used ${e.itemStack?.typeId}`)
    })
  }
}
```

- Exactly **one** `@MinecraftMain` per addon
- Bind listeners in `afterStart()`, not `onStart()` — the latter runs before the world is ready
  for subscriptions

Beyond this are `PlayerSpawned` / `EntitySpawned` decorators and component base classes such as
`PlayerHudComponent`. See `examples/oc-launch/scripts/index.ts`. Most addons never need them.

## 5. Custom components: declare, then implement

The most common broken link in Sapdon: a component id written into the block/item JSON must be
implemented by a script **before startup**. Half of the pair gives:

```
this component was found in the input, but is not present in the Schema
```

### 5.1 Build time — write the id

```typescript
// main.ts
import { BlockAPI, BlockComponent, registry } from '@sapdon/core'

const machine = BlockAPI.createBasicBlock('my_mod:machine', 'nature', sixFaces)
machine.addComponent(BlockComponent.setCustomComponents(['my_mod:machine_tick']))

registry.submit()
```

### 5.2 Runtime — register the same id

```typescript
// scripts/index.ts — top-level, module load
import { registerBlockComponent } from '@sapdon/runtime'

registerBlockComponent('my_mod:machine_tick', {
  onTick: ({ block }) => {
    // every tick
  },
  onPlayerInteract: ({ block, player }) => {
    player?.sendMessage('interacted')
  },
})
```

`registerBlockComponent` / `registerItemComponent` guarantee registration inside
`system.beforeEvents.startup`. Do **not** hand-roll `world.beforeEvents.worldInitialize` — it is
too late; the schema has already been validated.

Items need one more thing: `minecraft:interact_button` before `onUse` can fire.

```typescript
ItemAPI.createItem('my_mod:guide', ItemCategory.Items, 'book')
  .addComponent(ItemComponent.setInteractButton('Open'))
```

### 5.3 Do not mix the two routes

| Route | Declared | Handler |
|-------|----------|---------|
| A `BlockCustomComponentBuilder` | build time | serialized to source — **cannot import shared modules** |
| B `registerBlockComponent` (recommended) | runtime | ordinary closure, imports allowed |

Registering the same id through both routes throws.

## 6. Timers and persistence

```typescript
import { system } from '@minecraft/server'

const handle = system.runInterval(() => {
  // every 20 ticks (~1 second)
}, 20)

system.clearRun(handle)   // stop it when done
```

Per-session state goes into dynamic properties:

```typescript
block.setDynamicProperty('my_mod:fuel', 120)
const fuel = block.getDynamicProperty('my_mod:fuel') as number | undefined
```

**Dynamic properties cannot be set on stackable items** (`Cannot set dynamic properties on
stackable items`, thrown at runtime). Any item carrying purity/gene/state data must use
`max_stack_size: 1`.

Large cross-chunk state (machines, circuits) belongs in `@sapdon/runtime`'s chunked persistence —
see `doc/user/api/runtime.md` §2.

## 7. Debugging

```typescript
console.warn(`[my_mod] fuel=${fuel}`)
```

- Logs land in `%APPDATA%\Minecraft Bedrock\logs\ContentLog*.txt` (Beta builds live under the
  Package directory)
- `world.sendMessage()` is **not** written to the content log; use `console.warn` for diagnostics
- When reported line numbers do not match your source, trust the pack name in the error tag
  instead — lines in a bundled script are not reliable

## 8. Pitfalls

1. **Container blocks swallow right-clicks.** A block with
   `minecraft:block_entity.container` never fires `onPlayerInteract`; drive interactions from
   `onTick` instead.
2. **Registering components too late.** `world.beforeEvents.worldInitialize` yields
   `not present in the Schema`. Use `system.beforeEvents.startup`, or the runtime helpers.
3. **Importing `@sapdon/core` at runtime.** The build succeeds; the game fails with
   `Cannot find package`.
4. **Changing `dependencies` without deleting the manifest.** It is never regenerated while it
   exists.
5. **Script not bundled at all.** Check `scriptEntry`, and make sure `main.ts` is not
   accidentally used as the runtime entry.

---

## Next

- `doc/user/api/runtime.md` (Chinese) — component registry internals, chunked persistence
- [Blocks](./block.md) — full block component list
- [Build & publish](./publish.md)
