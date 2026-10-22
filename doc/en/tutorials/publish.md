# Build & Publish

> Full Chinese original: [`doc/user/tutorials/publish.md`](../../user/tutorials/publish.md)

From "it runs on my machine" to "someone else can install it".

---

## 1. Pick a build mode

| Mode | When | What it does |
|------|------|--------------|
| `dev` | Day to day | Run `main.ts`, generate JSON, bundle scripts with sourcemap, sync to Minecraft |
| `prod` | Before shipping | Same, but minified with terser and no sourcemap |
| `debug` | Testing hand-edited JSON | **Skips `main.ts`** and just syncs the existing `dev/` folder |

`debug` regenerates nothing. Edit `main.ts`, build with `debug`, and you will be looking at
stale output.

```bash
# One-shot build, no hot reload
sapdon compile
```

`sapdon build .` starts HMR and is meant for development. **Before packaging, run `compile` or
switch `buildMode` to `prod`**, otherwise you ship a development build with sourcemaps.

## 2. Package as .mcaddon

```bash
cd my_addon
sapdon compile     # build first
sapdon pack        # then package
```

Output: `dev/<project-name>.mcaddon`.

`pack` zips `dev/<project-name>_BP` and `dev/<project-name>_RP` preserving their structure.
Two consequences:

- **Run it from the project directory** — the project name is the current folder name
- Both pack folders must already exist; `pack` does not build

```
my_addon.mcaddon (zip)
├── my_addon_BP/
│   ├── manifest.json
│   ├── items/ blocks/ entities/ recipes/
│   └── scripts/index.js
└── my_addon_RP/
    ├── manifest.json
    ├── textures/
    └── entity/ models/ sounds/
```

Do not rename it to `.zip`, unzip, and install the halves separately — the two packs are bound
to each other through `dependencies` in their manifests.

## 3. Pre-flight checks

### 3.1 UUIDs belong to this pack

The first build writes `bp` and `rp` back into `mod.info`:

```json
{
  "name": "my_addon",
  "authors": ["YourName"],
  "version": "1.0.0",
  "min_engine_version": "1.19.50",
  "description": "My addon",
  "bp": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "rp": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
}
```

**Copying someone else's project, or duplicating your own, requires deleting these two fields.**
Minecraft identifies packs by `header.uuid`, not by folder name: two packs sharing a UUID are the
same pack to the engine. Scripts fight over custom component registration, blocks throw
`TypeError: not a function` on tick, and **nothing is reported**.

After changing `mod.info`, delete `dev/*/manifest.json` before rebuilding — an existing manifest
is reused as-is.

### 3.2 Version and engine version

- `version` must be `major.minor.patch`; it is copied into both manifests
- `min_engine_version` decides who can install. Set it too high and lower-version players never
  see the pack
- `versionType` (`release` / `beta`) selects which local Minecraft folder is synced. It does
  **not** affect who can install your pack

### 3.3 Dependencies

`build.config`'s `dependencies` are written into `manifest.json`, and the manifest is only
generated when absent. After changing dependencies, delete `dev/<name>_BP/manifest.json`.

Declaring a module version newer than the player's game makes the script bundle silently fail to
load — the pack installs, nothing happens.

### 3.4 Inspect the output

```bash
# 1. Both packs exist
ls dev/my_addon_BP dev/my_addon_RP

# 2. The script was bundled and minified
ls -lh dev/my_addon_BP/scripts/index.js

# 3. Open a generated JSON and check the fields
cat dev/my_addon_BP/items/my_ingot.json
```

A successful build is not a correct artifact. The two most common real incidents: `dev/`
contains only stale files from a previous build, and blocks silently disappear because a texture
is missing.

## 4. Distribution

| Channel | How |
|---------|-----|
| Send to a player | Ship the `.mcaddon`; they double-click to import |
| Marketplace | Requires Microsoft's partner process, unrelated to Sapdon |
| Your own machines | Copy `dev/<name>_BP` and `_RP` into the game's `development_behavior_packs` / `development_resource_packs` |

If nothing appears in the creative menu after import, confirm **both** packs are enabled, then
check the content log for script errors.

## 5. Troubleshooting

| Symptom | Cause |
|---------|-------|
| No `.mcaddon` in `dev/` | `compile` was not run, or you are not in the project root |
| Pack installs but does nothing | `buildMode` was still `debug`, so the artifact is stale |
| Player installs, nothing happens | Dependency version exceeds their game version; the script bundle never loads |
| Two different packs interfere | Duplicate UUIDs, see 3.1 |
| Package is unexpectedly large | Built in `dev` mode with sourcemaps; rebuild in `prod` |

---

## Next

- [Configuration](../configuration.md) — every field
- [FAQ](../faq.md)
