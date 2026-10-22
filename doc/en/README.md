# Sapdon Tutorials (English)

A condensed English edition of the Sapdon user tutorials: the same APIs, the same working
examples, and the same pitfalls, minus the long-form prose. Each page links to the full
Chinese original when you need more detail.

> **Scope.** These pages cover everyday addon authoring. The complete API reference
> (`doc/user/api/`) and the framework-internals docs (`doc/dev/`) are Chinese-only for now.

---

## Where to start

| Doc | What it covers |
|-----|----------------|
| [Quick start](./quick-start.md) | Install, `create`, `build`, inspect `dev/` |
| [Configuration](./configuration.md) | `build.config` and `mod.info` |
| [Items](./tutorials/item.md) | Basic items, food, armor, attachables, components |
| [Blocks](./tutorials/block.md) | Basic, variants, rotatable, crops, ores, `TileBlock` |
| [Entities](./tutorials/entity.md) | Behavior + resource packs, AI, projectiles, display entities |
| [Recipes](./tutorials/recipe.md) | Shaped / shapeless / furnace, two styles each |
| [Textures](./tutorials/texture.md) | `res/` layout, texture registration, missing-texture debugging |
| [Runtime scripts](./tutorials/runtime-script.md) | Event handlers, custom components, persistence |
| [UI](./tutorials/sapdon-ui.md) | Server Form page shells |
| [Build & publish](./tutorials/publish.md) | Build modes, `.mcaddon`, UUID checks |
| [FAQ](./faq.md) | The problems people actually hit |

---

## Recommended paths

### First addon

1. [Quick start](./quick-start.md) — get `dev/<name>_BP` and `_RP` generated
2. [Items](./tutorials/item.md) §1 and §5 — learn the core pattern:
   **build an object → add components → `registry.submit()`**
3. [Textures](./tutorials/texture.md) — so your icon isn't a purple-black square
4. [Blocks](./tutorials/block.md) §1–§2 — six-face textures and rotation
5. [Recipes](./tutorials/recipe.md) §1 — make the new content obtainable
6. [Entities](./tutorials/entity.md) §1–§3 — behavior pack and resource pack come in pairs

Then launch the game. A successful build does **not** mean the content works in-game.

### Addons with logic (machines, containers, custom components)

1. [Runtime scripts](./tutorials/runtime-script.md) §1–§2 — build-time vs runtime, first subscription
2. [Runtime scripts](./tutorials/runtime-script.md) §4 — declare the component id at build time,
   implement it at runtime
3. [Blocks](./tutorials/block.md) §6–§7 — block components and `TileBlock`
4. [FAQ](./faq.md) — stale output, missing JSON

### UI

1. [UI](./tutorials/sapdon-ui.md)
2. `doc/user/api/sapdon-ui.md` (Chinese) — `SapdonFormUI`, `FormButtonGrid` slot rules
3. `doc/guidebook.md` (Chinese) — the in-game book framework

### Shipping

[Build & publish](./tutorials/publish.md).

---

## The one rule that breaks everything

Every build-time script ends with `registry.submit()`. Miss it and nothing is generated —
no error, no warning, just an empty pack.
