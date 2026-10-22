# Server Form UI

> Full Chinese original: [`doc/user/tutorials/sapdon-ui.md`](../../user/tutorials/sapdon-ui.md)

Build a full-screen custom Server Form: a content panel with a button panel layered on top,
form buttons in the bottom corners, and an exit button top-right.

One `SapdonFormUI` instance = one route = one UI file.

---

## 1. Setup

```bash
npm init -y
npm install @minecraft/server@2.8.0 @minecraft/server-ui@2.1.0
# @sapdon/core is synced automatically by the postinstall hook (`sapdon lib`)
```

```
test_ui/
├── main.ts               # declarative UI (build time)
├── scripts/index.ts      # triggers the form (runtime)
├── build.config
├── mod.info
├── tsconfig.json
├── package.json
└── res/
```

`build.config` needs both modules in `dependencies`:

```json
{
  "formatVersion": 2,
  "buildOptions": {
    "buildMode": "dev",
    "buildEntry": "main.ts",
    "scriptEntry": "scripts/index.ts",
    "scriptOutput": "scripts/index.js",
    "useJs": false,
    "buildDir": "dev/",
    "dependencies": [
      { "module_name": "@minecraft/server-ui", "version": "2.1.0" },
      { "module_name": "@minecraft/server", "version": "2.8.0" }
    ]
  }
}
```

## 2. Imports

```typescript
import {
  Button, FormButton, FormButtonGrid, Label, Layout, Panel, SapdonFormUI,
  StackPanel, Text, registry
} from '@sapdon/core'
```

## 3. Content panel

The content panel is the page body; it is drawn **under** the button panel.

```typescript
const apple_content_panel = new Panel('apple_content_panel')
  .setLayout(new Layout().setSize(['40%', '40%']))
  .enableDebug()

apple_content_panel.addControl(
  new StackPanel('main', undefined)
    .addStack(['100%', '30%'],
      new Label('title', undefined).enableDebug().setText(new Text().setText('Apple screen')))
    .addStack(['100%', '70%'],
      new Label('body', undefined).enableDebug().setText(new Text().setText('Content panel')))
)
```

The panel id (`apple_content_panel`) becomes the reference prefix
`sapdon_ui_apple.apple_content_panel` in the generated file.

## 4. Button panel

Two form buttons in a 2×1 grid, anchored bottom-left and bottom-right, plus a plain exit button
top-right.

```typescript
const apple_buttons_panel = new Panel('apple_buttons_panel')
  .setLayout(new Layout().setSize(['40%', '40%']))
  .addControl(
    new FormButtonGrid('apple_buttons_grid', { dimensions: [2, 1], size: ['100%', '100%'] })
      .addButton(0, new FormButton('bt0').setAnchor('bottom_left'))
      .addButton(1, new FormButton('bt1').setAnchor('bottom_right'))
      .build()
  )
  .addControl(
    new Button('exit', 'common.button')
      .addVariable('pressed_button_name', 'button.menu_exit')
      .setLayout(new Layout().setSize([48, 24]).setAnchorFrom('top_right').setAnchorTo('top_right'))
      .addControl(new Label('exit_text', undefined).setText(new Text().setText('Exit')))
  )
```

- `FormButtonGrid(dimensions)` splits the panel into cells; `addButton(index, btn)` injects the
  collection/gating binding per cell. The visual position comes from the button's `setAnchor`.
- `FormButton` uses `@common.button` with no label, a texture set via `setTexture`, and a gating
  binding injected by the grid.
- The exit button uses `common.button` + `button.menu_exit`, which closes the form on click.

> `addButton(index, ...)`: `index` is the **runtime slot index**, not a visual position. Slots
> map to `grid_position` row-major, and the engine binds cells by that value.

## 5. Assemble and register

```typescript
new SapdonFormUI('sapdon_ui:apple', apple_content_panel, apple_buttons_panel)

registry.submit()
```

Rules:

- `ns:nm` → the UI file name and namespace are `ns_nm` (`sapdon_ui_apple`), so the file is
  `ui/sapdon_ui_apple.json` and references use `sapdon_ui_apple.xxx`
- `nm` (`apple`) also determines the route panel id `sapdon_ui:apple` — the string you pass to
  `.title(...)` at runtime
- **Both root panels are required.** A content-only page still passes an empty `Panel`; the shell
  always renders content + buttons, and a missing one is a dangling reference
- One instance per screen. Reusing the same `nm` overwrites the previous file and duplicates the
  `_ui_defs` entry

## 6. Runtime trigger

```typescript
// scripts/index.ts
import { world } from '@minecraft/server'
import { ActionFormData } from '@minecraft/server-ui'

world.afterEvents.itemUse.subscribe((event) => {
  if (event.itemStack?.typeId !== 'minecraft:apple') return

  new ActionFormData()
    .title('sapdon_ui:apple')      // prefix routes to the custom screen
    .body('Opening the apple page')
    .button('test1')               // feeds the form_buttons collection
    .button('test2')
    .show(event.source)
    .then((r) => world.sendMessage('selection: ' + r.selection))
})
```

A `title` containing `sapdon_ui:` renders the custom full-screen UI; anything else falls back to
the vanilla form. Button clicks return `response.selection`, which is the collection index —
slot 0 and slot 1 in the example above.

## 7. Build output

```bash
npm i          # postinstall runs `sapdon lib`
npm run build
```

```
dev/test_ui_RP/ui/
├── server_form.json        # routing shell + one gated factory per screen
├── sapdon_ui_apple.json    # this screen: content + buttons + root panel
└── _ui_defs.json           # auto-registered
```

In-game verification:

1. Content panel underneath, button panel on top
2. One form button bottom-left, one bottom-right (mapped to test1/test2)
3. The top-right Exit button closes the form

Structural checks on the JSON are not enough — `grid_position` and `offset` can be wrong while
every field looks valid. Run the page in-game.

## 8. Complete example

`examples/test_ui` contains two screens: one with content + buttons, one content-only. The API
reference is `doc/user/api/sapdon-ui.md` (Chinese).

How the form gets triggered from an event is covered in [Make a script run](../guides/scripts.md). The slot rules behind the buttons are in `doc/user/api/sapdon-ui.md` (Chinese).
