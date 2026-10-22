# Configuration

Two files in the project root drive the build: `build.config` and `mod.info`.

> Full Chinese originals: [`build-config.md`](../user/config/build-config.md),
> [`mod-info.md`](../user/config/mod-info.md)

---

## build.config

JSON with comments (`//` and `/* */`) allowed.

```jsonc
{
  "formatVersion": 2,
  "buildOptions": {
    "useHMR": true,                       // hot reload
    "keepServer": false,                  // true = keep the dev server alive after building
    "buildMode": "dev",                   // "dev" | "prod" | "debug"
    "buildEntry": "main.ts",              // build-time entry
    "useJs": false,                       // true when the project is JavaScript
    "scriptEntry": "scripts/index.ts",    // runtime entry
    "scriptOutput": "scripts/index.js",   // relative to buildDir/<name>_BP/
    "buildDir": "dev/",
    "dependencies": [
      { "module_name": "@minecraft/server", "version": "2.0.0" }
    ],
    "resource": {
      "path": "res/",
      "resourceHints": true               // generate res.hint.ts
    }
  },
  "versionType": "release"
}
```

### Fields that matter most

**`buildMode`**

| Value | Effect |
|-------|--------|
| `dev` | Run `main.ts`, generate all JSON, bundle scripts with sourcemap, sync |
| `prod` | Same, but minified and no sourcemap |
| `debug` | Skip `main.ts` and JSON generation; sync the existing `dev/` folder only |

`debug` regenerates nothing. If you edited `main.ts` and built with `debug`, you are looking
at stale output.

**`dependencies`** — written into the behavior pack `manifest.json`. **Every `@minecraft/*`
module imported by your runtime scripts must be listed here.** Miss one (commonly
`@minecraft/server-ui`) and the game cannot resolve the module: the entire script bundle
silently fails to load.

`manifest.json` is only generated when the file does not exist, so after changing
`dependencies` delete `dev/<name>_BP/manifest.json` and rebuild.

**`scriptEntry` / `scriptOutput`** — `scriptEntry` is bundled into a single file written to
`scriptOutput`, relative to `dev/<name>_BP/`.

**`versionType`**

| Value | Minecraft folder |
|-------|------------------|
| `release` | `%USERPROFILE%/AppData/Roaming/Minecraft Bedrock/...` |
| `beta` | `%USERPROFILE%/AppData/Local/Packages/Microsoft.MinecraftWindowsBeta_.../...` |

Override with the `MC_PATH` / `MC_BETA_PATH` environment variables.

---

## mod.info

```json
{
  "name": "my_addon",
  "authors": ["YourName"],
  "version": "1.0.0",
  "min_engine_version": "1.19.50",
  "description": "My first Sapdon addon"
}
```

The first build appends two UUIDs and writes them back:

```json
{
  "bp": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "rp": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
}
```

| Field | Notes |
|-------|-------|
| `name` | Used for `header.name` (with `_BP` / `_RP`) and the output folder names |
| `authors` | Project metadata only; not written into the manifest |
| `version` | `major.minor.patch`. The string is split on `.` and cast to numbers without padding — `1.0` produces `[1, 0]` |
| `min_engine_version` | Players below this version cannot load the pack |
| `description` | `header.description` |
| `bp` / `rp` | Pack UUIDs, auto-generated on first build |

### UUID rules

**Copying a project? Delete `bp` and `rp` so they regenerate.**

Minecraft identifies packs by `header.uuid`, not by folder name. Two packs sharing a UUID are
the same pack to the engine: their scripts fight over custom component registration, blocks
throw `TypeError: not a function` on tick, and **nothing is reported**.

After changing UUIDs, delete `dev/*/manifest.json` before rebuilding — the CLI reuses an
existing manifest otherwise.

```bash
# Correct order when swapping UUIDs
# 1. remove the bp / rp lines from mod.info
# 2. drop stale output so the old manifest cannot be reused
rm -rf dev
# 3. rebuild; new UUIDs are generated and written back
sapdon build .
```
