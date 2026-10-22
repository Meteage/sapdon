# Package an addon as .mcaddon

Goal: a `.mcaddon` someone else can double-click, install, and play, without colliding with your other packs.

How to tell it worked: `dev/<folder-name>.mcaddon` exists, unzipping it shows both `_BP` and `_RP`, and the imported pack has all its content.

> Chinese original: [`doc/user/guides/packaging.md`](../../user/guides/packaging.md)

## 1. Pick a build mode

`sapdon build` and `sapdon compile` differ in one thing: `build` starts HMR after building and keeps watching files, `compile` builds once and exits.

During development:

```bash
cd my_addon
sapdon build .
```

Before shipping, use `compile` with `buildOptions.buildMode` set to `prod`:

```json
{
  "formatVersion": 2,
  "buildOptions": {
    "buildMode": "prod"
  }
}
```

What the three modes do:

| Value | Behaviour |
|---|---|
| `dev` | Runs `main.ts`, generates JSON, bundles scripts with a sourcemap, no minification |
| `prod` | Same, but scripts are minified with terser and have no sourcemap |
| `debug` | Skips `main.ts` and syncs the existing `dev/` folder as-is |

`debug` regenerates nothing. Edit `main.ts`, build with `debug`, and you are looking at the previous build.

```bash
cd my_addon
sapdon compile
```

## 2. Package

```bash
sapdon pack
```

The output is `dev/<current-folder-name>.mcaddon`. The command zips `dev/<current-folder-name>_BP` and `dev/<current-folder-name>_RP` with their structure intact. Two consequences: run it from the project root, and both pack folders must already exist. `pack` never builds for you.

The name comes from the current folder, not from `name` in `mod.info`. Rename the folder and the artifact name changes.

## 3. Four checks before sending it out

### The UUIDs belong to this pack

The first build writes `bp` and `rp` back into `mod.info`:

```json
{
  "name": "my_addon",
  "version": "1.0.0",
  "min_engine_version": "1.19.50",
  "bp": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "rp": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
}
```

Delete those two fields when you copy someone else's project or duplicate your own. Minecraft identifies packs by `header.uuid`, not by folder name, so two packs with the same UUID are one pack to the engine. Scripts replace each other's component registrations, blocks throw `TypeError: not a function` on tick, and nothing is reported.

After editing `mod.info`, delete `dev/*/manifest.json` before rebuilding. The framework reuses an existing manifest.

### Version and engine version

`version` must be three numbers, `major.minor.patch`, and is copied into the manifest. `min_engine_version` decides who can install the pack; set it too high and players on older builds never see it.

`versionType` (`release` or `beta`) only selects which local Minecraft folder receives the build. It does not affect who can install the pack.

### Dependencies

`buildOptions.dependencies` is written into `manifest.json`, and that file is only generated when absent. Delete `dev/<project>_BP/manifest.json` after changing dependencies.

A dependency version higher than the player's game makes the whole script bundle fail to load. In game the pack looks installed and nothing happens.

### The artifact itself

A successful build does not mean a correct artifact. Check three things after packing:

```bash
ls dev/my_addon_BP dev/my_addon_RP        # both packs exist
ls -lh dev/my_addon_BP/scripts/index.js   # the script is bundled, noticeably smaller in prod mode
cat dev/my_addon_BP/items/my_ingot.json   # open one generated file and read the fields
```

The two most common real incidents are `dev/` holding stale files from an earlier build, and a block disappearing because a texture is missing.

## 4. Distribution

Send the `.mcaddon`; the other person double-clicks to import. Do not rename it to `.zip`, unpack it, and install the halves separately. The two packs are bound through `dependencies` in their manifests.

For your own machines you can also copy `dev/<project>_BP` and `dev/<project>_RP` into `development_behavior_packs` and `development_resource_packs`.

If the creative menu stays empty after importing, confirm both packs are enabled, then check the content log for script errors.

## 5. When it goes wrong

| Symptom | Cause |
|---|---|
| No `.mcaddon` in `dev/` | `compile` was not run, or you are not in the project root |
| Pack installs but nothing changes | `buildMode` is still `debug`, so the artifact is stale |
| Someone else installs it and nothing happens | Dependency version is newer than their game, so the script bundle never loads |
| Two different packs interfere | Duplicate UUIDs, see above |
| The package is unexpectedly large | Built in `dev` mode with sourcemaps; rebuild in `prod` |

## Related

Every field is documented in `doc/user/config/build-config.md` and `doc/user/config/mod-info.md` (Chinese). For a build that reports success but leaves old output, see the [FAQ](../faq.md) §4.
