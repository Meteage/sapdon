# Make a script run in the game

Goal: the code under `scripts/` gets bundled into the behavior pack, runs in Minecraft, and you can prove it ran.

How to tell it worked: a `[my_mod] ...` line shows up in `ContentLog` after joining the world, or an interaction in game does something visible.

> Chinese original: [`doc/user/guides/scripts.md`](../../user/guides/scripts.md)

## 1. Check that the script entry is wired up

Three fields in `build.config` decide how the script gets into the pack:

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

`scriptEntry` is the source entry. Everything it imports is bundled into `scripts/index.js` under `dev/<project>_BP/scripts/`.

`dependencies` is written into the behavior pack's `manifest.json`. Every `@minecraft/*` module you import must be listed. Miss one and the game cannot resolve it, so the whole bundle fails to load. The pack looks installed and nothing happens; the only evidence is one line in the content log.

After changing `dependencies`, delete `dev/<project>_BP/manifest.json` and rebuild. That file is only generated when absent, because the framework uses it to keep the UUIDs stable.

## 2. Print one line first

Before any game logic, put this at the top of `scripts/index.ts`:

```typescript
// scripts/index.ts
import { world } from '@minecraft/server'

console.warn('[my_mod] script loaded')
```

Use `console.warn`, not `world.sendMessage`. The first one goes to the content log; the second only appears in chat, where you cannot find it later.

Logs land in `%APPDATA%\Minecraft Bedrock\logs\ContentLog*.txt`. Beta builds write under the corresponding Package directory. Build, join a world, then search the end of the file for `[my_mod]`. If it is not there, stop and fix loading first.

## 3. Subscribe to events

```typescript
import { world } from '@minecraft/server'

world.afterEvents.itemUse.subscribe((event) => {
  const player = event.source
  if (player.typeId !== 'minecraft:player') return
  if (event.itemStack?.typeId !== 'my_mod:magic_wand') return

  player.sendMessage('§aWand activated')
  player.dimension.spawnParticle('minecraft:totem_particle', player.location)
})
```

Subscribe at module load, at the top level. Do not wrap subscriptions in `setTimeout` or a startup callback, or early events are lost.

Handlers under `world.beforeEvents.*` cannot mutate the world. Placing blocks or giving items throws; defer with `system.run()`.

`event.source` is often an `Entity`. Check `typeId` before treating it as a player.

Files can be split freely. The entry only imports and subscribes:

```
scripts/
├── index.ts   # imports, component registration
├── wand.ts
└── shop.ts
```

## 4. A component declared at build time needs an implementation at runtime

This is where Sapdon packs break most often. A custom component id written into block or item JSON must have an implementation registered before startup. Without it the engine reports `this component was found in the input, but is not present in the Schema`.

At build time, write the id into the block:

```typescript
// main.ts
import { BlockAPI, BlockComponent, registry } from '@sapdon/core'

const machine = BlockAPI.createBasicBlock('my_mod:machine', 'construction', sixFaces)
machine.addComponent(BlockComponent.setCustomComponents(['my_mod:machine_tick']))

registry.submit()
```

At runtime, register handlers under the same id, at the top level of `scripts/index.ts`:

```typescript
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

`registerBlockComponent` and `registerItemComponent` queue the registration for `system.beforeEvents.startup`. Do not hand-roll `world.beforeEvents.worldInitialize`, which runs after the component schema has been validated. Do not call these helpers from an event handler or a timer either; the framework throws "registered too late" at runtime.

Items need one more piece before `onUse` fires:

```typescript
ItemAPI.createItem('my_mod:guide', ItemCategory.Items, 'book')
  .addComponent(ItemComponent.setInteractButton('Open'))
```

The other route is `BlockCustomComponentBuilder` at build time. Its handlers are serialized into source, so they cannot import shared modules. Registering the same id through both routes throws. Use the runtime route when you want to share code.

## 5. Timers and state

```typescript
import { system } from '@minecraft/server'

const handle = system.runInterval(() => {
  // every 20 ticks, about one second
}, 20)

system.clearRun(handle)
```

Persist state across sessions with dynamic properties:

```typescript
block.setDynamicProperty('my_mod:fuel', 120)
const fuel = block.getDynamicProperty('my_mod:fuel') as number | undefined
```

Dynamic properties cannot be set on stackable items. The game throws `Cannot set dynamic properties on stackable items`, so any item carrying charge, genes, or purity data must use `max_stack_size: 1`.

Large cross-chunk state such as machine networks or circuits belongs in `@sapdon/runtime`'s chunked persistence. A single dynamic property has a length limit; exceeding it throws, and a `try`/`catch` around it silently loses the save. See `doc/user/api/runtime.md` §2 (Chinese).

## 6. The script does nothing: check in this order

| Symptom | Check |
|---|---|
| No load line in the content log | Is `scriptEntry` correct, and does `dev/<project>_BP/scripts/index.js` exist? |
| Artifact exists, game silent | Is a module imported by the script missing from `dependencies`? Delete `dev/<project>_BP/manifest.json` and rebuild |
| `Cannot find package` | The runtime script imports `@sapdon/core`. Core is build-time only; runtime code uses `@sapdon/runtime` |
| `not present in the Schema` | Component registered too late, or the id differs from the one in JSON |
| Container block ignores clicks | Blocks with `minecraft:block_entity.container` swallow right-clicks and never fire `onPlayerInteract`. Drive interaction from `onTick` |

More symptoms are collected in `doc/dev/known-pitfalls.md` and the [FAQ](../faq.md), both Chinese.

## Related

The full component event list and chunked persistence are in `doc/user/api/runtime.md` (Chinese). For a walkthrough of building a block component from scratch, see [Blocks](../tutorials/block.md) §7.
