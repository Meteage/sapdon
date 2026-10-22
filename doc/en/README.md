# Sapdon documentation (English)

A condensed English edition of the Sapdon user docs: same APIs, same working examples, same pitfalls, less prose. The Chinese pages are the source of truth; each page here links to its original.

> **Scope.** These pages cover everyday addon authoring. The API reference (`doc/user/api/`), the config reference (`doc/user/config/`), and the framework-internals docs (`doc/dev/`) are Chinese-only for now.

## First addon

[Quick start](./quick-start.md): install the CLI, `create` a project, build it, and find the behavior pack and resource pack under `dev/`.

Every build-time script follows one pattern: create an object, add components, then call `registry.submit()`. Leave out `submit()` and nothing is generated, with no error.

## What do you want to build

| Goal | Doc |
|---|---|
| An item you can pull from the creative menu | [Items](./tutorials/item.md) |
| A block you can place and rotate | [Blocks](./tutorials/block.md) |
| A mob that walks and attacks | [Entities](./tutorials/entity.md) |
| Recipes that produce or consume your content | [Recipes](./tutorials/recipe.md) |
| A server form screen | [UI](./tutorials/sapdon-ui.md) |
| An icon that is not a purple-black square | [Add textures](./guides/textures.md) |
| A block that reacts to players or ticks | [Make a script run](./guides/scripts.md) |
| A `.mcaddon` you can hand to someone | [Package an addon](./guides/packaging.md) |

## How to look things up

Signatures, defaults, and failure conditions live in `doc/user/api/` and `doc/user/config/` (Chinese). Symptoms are collected in the [FAQ](./faq.md); engine and framework bugs, with original error text and sources, are in `doc/dev/known-pitfalls.md` (Chinese). That last one is written for framework contributors, but it is often where "the version is right and it still does not work" gets answered.

## How these docs are split

| Folder | What it is | After reading you should |
|---|---|---|
| `tutorials/` | Step-by-step, build one thing from zero | Have a working artifact |
| `guides/` | One concrete task per page | Have your problem solved |
| `../user/api/`, `../user/config/` | Reference, facts only (Chinese) | Know the parameters and the failure mode |
| `../dev/` | Framework internals and pitfalls (Chinese) | Understand why it works this way |

One page, one job. A tutorial filling up with parameter tables, or a reference page starting to recommend things, means it is time to split. The writing rules are in `doc/dev/writing-guide.md` (Chinese).
