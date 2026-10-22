# Quick Start

> Full Chinese original: [`doc/user/quick-start.md`](../user/quick-start.md)

---

## Requirements

- Node.js 18+
- npm (bundled with Node.js)
- VS Code (recommended)

## Install the CLI

Install `sapdon` as a local dev dependency. There is no global install and nothing is added to PATH.

```bash
npm install -D sapdon
```

## Create a project

Invoke the locally installed CLI through `npx`:

```bash
npx sapdon create hello_sapdon
```

Answer the prompts:

```
Project Name: hello_sapdon
Project Description: my first addon
Author Name: YourName
Project Version: 1.0.0
Minimum Engine Version: 1.19.50
Language:(js/ts) ts
```

## Project layout

```
hello_sapdon/
├── main.ts              # build entry — declare items, blocks, entities
├── build.config         # build settings
├── mod.info             # addon metadata (and pack UUIDs)
├── tsconfig.json
├── pack_icon.png
├── res/                 # textures, models, sounds
└── scripts/
    ├── index.ts         # runtime entry — event handlers, components
    └── custom_components/
```

## Write some content

`main.ts` is executed at build time. It declares content and ends with a single submit call.

```typescript
import { ItemAPI, ItemCategory, ItemComponent, registry } from '@sapdon/core'

const item = ItemAPI.createItem(
  'hello_sapdon:my_item',
  ItemCategory.Items,
  'masterball'
)
item.addComponent(ItemComponent.setDisplayName('My Item'))

// Commit every registration. Without this, nothing is generated.
registry.submit()
```

## Build

```bash
cd hello_sapdon
sapdon build .
```

### Build modes

| Mode | Behaviour |
|------|-----------|
| `dev` (default) | Run `main.ts` → generate JSON → bundle scripts (sourcemap, no minify) → sync to Minecraft |
| `prod` | Same, but scripts are minified with terser |
| `debug` | **Skip `main.ts`** and skip minification; just sync the existing `dev/` folder |

```bash
# One-shot production build, no hot reload
sapdon compile
```

### Package as .mcaddon

```bash
sapdon pack
```

Output: `dev/<project-name>.mcaddon`. `pack` does not build — run `compile` first.

## Build output

```
dev/
├── hello_sapdon_BP/          # behavior pack
│   ├── manifest.json
│   ├── items/my_item.json
│   └── scripts/index.js
└── hello_sapdon_RP/          # resource pack
    ├── manifest.json
    └── textures/item_texture.json
```

The packs are also synced to the Minecraft development pack folders, so launching the game
shows your content immediately.

> `_BP` / `_RP` must stay uppercase. Lowercase variants split into two directories on
> case-sensitive filesystems: the build writes one, packaging reads the other, and you ship
> an empty addon.

Next, [Items](./tutorials/item.md) takes this skeleton and fills it with actual content. If your icon is a purple-black square, [Add textures](./guides/textures.md) covers where the PNG goes and how the short name is registered. Every `build.config` and `mod.info` field is listed in [Configuration](./configuration.md).
