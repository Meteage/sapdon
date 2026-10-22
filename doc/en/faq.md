# FAQ

> Full Chinese original: [`doc/user/faq.md`](../user/faq.md)

---

## 1. How do I update the framework?

`sapdon` is a local devDependency:

```bash
npm update sapdon
```

**`npm update` only replaces the framework — it never rewrites files already in your project.**
Projects created from an older template are worth a one-time comparison:

- `scripts/custom_components/registry.js`: older templates registered custom components inside
  `world.beforeEvents.worldInitialize`, which is too late and produces
  `this component was found in the input, but is not present in the Schema`. Move it to
  `system.beforeEvents.startup` + `init.blockComponentRegistry.registerCustomComponent(...)`.
- `build.config` `dependencies`: older templates pinned `@minecraft/server` to 1.17 / 1.18,
  which cannot serve 2.x script APIs. Use `2.0.0` or newer, and add
  `@minecraft/server-ui` if your scripts import it.

The current templates are at `node_modules/sapdon/prod/templates/{js,ts}_sapdon/` — copy the
relevant file across.

---

## 2. How do I add a dependency?

Edit `dependencies` in `build.config`:

```json
{
  "dependencies": [
    { "module_name": "@minecraft/server", "version": "2.0.0" },
    { "module_name": "@minecraft/server-ui", "version": "2.1.0" }
  ]
}
```

These are injected into the behavior pack `manifest.json` at build time.

Two rules:

- **Every `@minecraft/*` module imported by your scripts must be listed.** A missing module makes
  the entire bundle fail to load, usually with one line in the content log.
- `manifest.json` is only generated when it does not exist (to preserve UUIDs). After editing
  dependencies, delete `dev/<name>_BP/manifest.json` and rebuild.

---

## 3. Where is the build output?

`sapdon build <project>` and `sapdon compile` write to `dev/` in the project root:

```
dev/
├── <project>_BP/          # behavior pack
│   ├── manifest.json
│   ├── blocks/ entities/ items/ recipes/
│   └── scripts/index.js
├── <project>_RP/          # resource pack
│   ├── manifest.json
│   ├── blocks.json        # block definitions (resource pack, not behavior pack)
│   ├── entity/
│   └── textures/
```

> `_BP` / `_RP` must be uppercase. On Windows the difference is invisible; on Linux/macOS
> lowercase variants split into separate directories, so the build writes one and packaging reads
> the other — you get an empty addon.

The `.sapdon_*` manifest files in `dev/` are the framework's bookkeeping. They only delete files
the framework itself wrote on the previous run; they never scan and delete unknown files.

---

## 4. The build says it succeeded, but the output is stale

**Trust the exit code and the log, not the word "success".**

| Signal | Meaning |
|--------|---------|
| Exit code `0` | No subprocess failed and script bundling completed |
| A `处理数据: <name> <root> <path>` line | A registration was actually written — this is the only proof output was generated (the CLI logs this label in Chinese) |

Historically, build-script failures were swallowed while the CLI printed "build complete" and
exited `0`, leaving the previous run's output in `dev/`. Failures now exit non-zero.

`compile` does not regenerate everything:

- `manifest.json` is reused if present (see item 2)
- `res.hint.ts` is only produced by `sapdon build` and `sapdon res` — `sapdon compile` does not
  refresh it

---

## 5. How do I sync to Minecraft?

Builds copy the packs into the Minecraft development pack folders automatically. If that fails,
copy `dev/<name>_BP` and `dev/<name>_RP` into `development_behavior_packs` and
`development_resource_packs` by hand.

---

## 6. release vs beta

```json
{ "versionType": "release" }
```

| Value | Target |
|-------|--------|
| `release` | Retail Minecraft |
| `beta` | Preview / beta |

This only changes the **sync destination**. It does not change `header.name`,
`min_engine_version`, or dependency versions — those come from `mod.info` and `build.config`.

---

## 7. How do I override the Minecraft path?

| Variable | Purpose |
|----------|---------|
| `MC_PATH` | Retail development pack folder |
| `MC_BETA_PATH` | Beta development pack folder |

```powershell
$env:MC_PATH = "C:\Users\<you>\AppData\Local\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang"
```

---

## 8. `tsc-alias not found`

First identify which build is failing.

`tsc-alias` is a devDependency of the **framework repository**, used only by its own
`scripts/build.cjs`. User projects do not need it — `sapdon compile` / `sapdon build` use
rollup + the TypeScript plugin.

| Where it appears | Fix |
|------------------|-----|
| `npm run build` inside the sapdon framework repo | `npm install` in that repo (`node_modules` incomplete) |
| Inside your own addon project | Your project configured `tsc-alias` itself; install your own devDependencies |

---

## 9. No entity/item JSON was generated

1. **`registry.submit()` was not called.** Every registration is queued; nothing is written until
   the submit call runs, and it must be the last statement
2. The registration calls never ran — check that `buildEntry` actually imports the file that
   declares the content
3. `registry.submit()` runs before the declarations (module load order)

---

## 10. Hot reload does nothing

```json
{ "useHMR": true }
```

Also check:

- `keepServer: true` — by default the process exits after building, and a dead process watches
  nothing
- You ran `sapdon build`, not `sapdon compile` (compile is one-shot, no watcher)
- HMR is a local `fs.watch` rebuild loop: no socket, no port. It rebuilds and copies; whether the
  game reloads the pack is game behaviour
- The file you edited is watched: `.js`, `.ts`, `build.config`, `mod.info` — dotfiles, `dev/`, and
  `.tmp` are excluded

---

## 11. Running `sapdon lib` manually

```bash
sapdon lib
```

Re-syncs the `@sapdon/core` / `@sapdon/runtime` type libraries into the project. Normally runs
automatically via `postinstall`; run it by hand after reinstalling dependencies or if editor
types are missing.

---

> Community: QQ group `810904181`.
