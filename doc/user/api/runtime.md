# 运行期 API 参考（`@sapdon/runtime`）

`@sapdon/runtime` 是 Sapdon 的**运行期**库：它的代码会被**打包进脚本包**，在 Minecraft Script API 环境（`@minecraft/server`）里执行，用来做「游戏里真正跑」的事 —— 自定义组件注册、动态属性（存档）读写等。

```typescript
import {
  registerBlockComponent, registerItemComponent,
  pendingComponentCount, registeredComponents,
  saveChunked, loadChunked, clearChunked, CHUNK_SIZE,
} from '@sapdon/runtime'
```

> 本页覆盖本轮新增与常用的运行期 API。OC 的 ECS 部分（`ComponentManager` / `MinecraftMain` / `ScriptEvent` 等）属源码开发者文档，见 [doc/dev/oc.md](../../dev/oc.md)。

---

## 0. ★ 分层铁律：构建期用 `@sapdon/core`，运行期用 `@sapdon/runtime`

一句话判断法则：

> **写 `main.ts`（生成 JSON）→ `@sapdon/core`；写 `scripts/*`（游戏里跑）→ `@sapdon/runtime`。**

原因（框架侧，已核对源码）：

| 包 | 层 | 打包行为 | 依据 |
|---|---|---|---|
| `@sapdon/core` | **构建期**（`main.ts` 生成 JSON） | 打包时是 **external**，产物里保留 `import '@sapdon/core'` 原样语句 | `src/cli/build.js` 的 `rollupIgnores = ['rollup', 'typescript', '@sapdon/core', '@sapdon/cli', '@minecraft']` |
| `@sapdon/runtime` | **运行期**（`scripts/*`） | **不在**该列表里 ⇒ 被 rollup **打包进**脚本包，产物里没有这个包名 | 同上 |

⚠️ **后果**：运行期脚本里写 `import '@sapdon/core'`，会让产物 `BP/scripts/index.js` 里留下一个**游戏解析不了的裸包名**（`@sapdon/core`），
**整个脚本包挂掉** —— 不是"那一行功能失效"，而是脚本上下文创建失败、整包脚本不运行。

为什么 Bedrock 解析不了：脚本侧能 import 的模块由游戏提供，且必须在包清单 `dependencies` 里按官方模块名声明；
Bedrock Wiki 的模块表列出的全部是 `@minecraft/*`（`@minecraft/server`、`@minecraft/server-ui`、`@minecraft/common` …），
见 [Bedrock Wiki: API Modules](https://wiki.bedrock.dev/scripting/api-modules)。`@sapdon/core` 不是其中之一。

### 包是怎么落到项目里的

框架仓库的 `prod/` 就是这三个包的源，`sapdon lib`（或 `npm i` 触发的 `postinstall`）把它们拷进项目的 `node_modules/@sapdon/`：

| 框架仓库目录 | 项目里的包名 |
|---|---|
| `prod/core/` | `@sapdon/core` |
| `prod/cli/` | `@sapdon/cli` |
| `prod/oc/` | **`@sapdon/runtime`** |

依据：`src/cli/dev-server/syncFiles.js` 的 `writeLib()`（`fs.cpSync(rootDir/oc → node_modules/@sapdon/runtime)`，
并写入 `{ "name": "@sapdon/runtime", "main": "index.js", "types": "index.d.ts" }`）。

---

## 1. 自定义组件注册

### 1.1 `registerBlockComponent` / `registerItemComponent`

```typescript
import type { BlockCustomComponent, ItemCustomComponent } from '@minecraft/server'

function registerBlockComponent(id: string, handlers: BlockCustomComponent): void
function registerItemComponent(id: string, handlers: ItemCustomComponent): void
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 组件标识符，格式 `命名空间:组件名`（如 `fz:machine`）。**必须是脚本与方块/物品 JSON 里同名的那一个** |
| `handlers` | `BlockCustomComponent` / `ItemCustomComponent` | 事件名 → 处理函数的对象。**handler 就是普通闭包**，可自由 import 共享模块 |

**它替你解决的问题是「时机」**：手写样板很容易把注册时机写错，而框架保证在
`system.beforeEvents.startup` 里替你调用 `init.blockComponentRegistry.registerCustomComponent()` /
`init.itemComponentRegistry.registerCustomComponent()`。你只管在运行期脚本里声明 id + handler。

> ⚠️ **必须在脚本模块加载期调用**（顶层语句，或顶层 `import` 的某个模块的顶层）。不要在事件回调、定时器、`worldLoad` 里调用。

**方块侧还要在方块 JSON 里声明同名组件**，否则脚本注册了也没人绑：

```typescript
// main.ts（构建期）
block.addComponent(BlockComponent.setCustomComponents(['fz:machine']))
```

**物品侧**：物品要能触发 `onUse`，还必须在物品上声明 `minecraft:interact_button`（见 [known-pitfalls §2.3](../../dev/known-pitfalls.md)）。

**已知事件名**（`@minecraft/server` 2.x；名字写错**只 warn，不阻断**）

| 组件 | 事件名 |
|---|---|
| 方块 | `onBlockStateChange`、`onBreak`、`onEntity`、`onEntityFallOn`、`onPlace`、`onPlayerBreak`、`onPlayerInteract`、`onRandomTick`、`onRedstoneUpdate`、`onStepOff`、`onStepOn`、`onTick`（另保留旧名 `beforeOnPlayerPlace` 以免误报） |
| 物品 | `onBeforeDurabilityDamage`、`onCompleteUse`、`onConsume`、`onHitEntity`、`onMineBlock`、`onUse`、`onUseOn` |

### 1.2 最小示例：handler 直接 import 共享模块

这正是运行期注册（路线 B）相对构建期声明（路线 A）的价值所在 —— 详见
[方块 API](./block.md) 的「两条路线的分工（路线 A vs 路线 B）」一节。

```typescript
// scripts/machine/base.ts —— 共享模块：与 handler 同处一个 bundle
import type { BlockCustomComponent } from '@minecraft/server'

export const machineHandlers: BlockCustomComponent = {
  onPlayerInteract: (e) => {
    // e.block / e.player 由 @minecraft/server 的类型提供
    // withState → 新 permutation，再用 setPermutation 应用到方块（见 Bedrock Wiki: Block States）
    e.block.setPermutation(e.block.permutation.withState('fz:running', true))
  },
  onTick: (e) => {
    // ...20 台机器共用这一份实现，不需要各自复制
    void e.block
  },
}
```

> 上面用到的 `BlockPermutation.withState()` + `Block.setPermutation()` 是脚本侧读写方块状态的官方手段，
> 见 [Bedrock Wiki: Block States](https://wiki.bedrock.dev/blocks/block-states)。
> 注意状态本身必须在方块 JSON 里**声明过**（`registerState` / `states`），且**单个状态最多 16 个取值** ——
> 见 [Bedrock Wiki: Block States](https://wiki.bedrock.dev/blocks/block-states) 与
> [Block Permutations](https://wiki.bedrock.dev/blocks/block-permutations)（单方块最多 65,536 个 permutation）。

```typescript
// scripts/index.ts —— 脚本入口
import { registerBlockComponent, registerItemComponent } from '@sapdon/runtime'
import { machineHandlers } from './machine/base.js'   // ← 路线 A 做不到这一点

registerBlockComponent('fz:machine', machineHandlers)

registerItemComponent('fz:guide_book', {
  onUse: (e) => {
    // e.source: Player、e.itemStack?: ItemStack
    e.source.sendMessage('打开了手册')
  },
})
```

> 用 `BlockCustomComponent` / `ItemCustomComponent` 这两个类型给共享 handler 标注，
> 既能让 `tsc` 检查事件名与参数，也避免了 handler 写在别的模块时因为丢失上下文推断而报 `any`。

### 1.3 诊断：`pendingComponentCount()` / `registeredComponents()`

```typescript
function pendingComponentCount(): number      // 已排队但**尚未注册**的组件数
function registeredComponents(): string[]     // 已成功注册的组件列表，形如 "block:fz:machine"
```

用途是自检「排了几个 / 注册了几个」：

- **启动前**（脚本加载期）`pendingComponentCount()` > 0 属正常 —— 说明声明已经排上队。
- **启动后**（`system.beforeEvents.startup` 已触发）`pendingComponentCount()` 应回到 `0`，
  且 `registeredComponents()` 应包含你声明的每一个 id（`"block:fz:machine"` / `"item:fz:guide_book"`）。

```typescript
import { system } from '@minecraft/server'
import { pendingComponentCount, registeredComponents } from '@sapdon/runtime'

system.afterEvents.scriptEventReceive.subscribe((e) => {
  if (e.id !== 'fz:components') return
  console.warn(`[diag] 未注册=${pendingComponentCount()} 已注册=${registeredComponents().join(', ')}`)
})
```

> 运行期诊断请用 `console.warn`：它稳定落到 `ContentLog*.txt`，而 `world.sendMessage()` **不会**进日志。

### 1.4 错误与守卫（读源码得出的三类行为）

| 情况 | 行为 |
|---|---|
| `system.beforeEvents.startup` **已经触发过**之后才调用 | ❌ **抛错** —— `自定义组件 "x" 注册得太晚：system.beforeEvents.startup 已经触发过了`（宁可炸也不静默） |
| 同一个 id 用同一类注册表**重复注册** | ❌ **抛错** —— `自定义组件 "x" 被重复注册（同一个 id 只能用一条路线注册一次）` |
| 事件名**拼错**（不在已知列表里） | ⚠️ 只 `console.warn`，不阻断 —— 引擎以后新增事件名时不该被框架挡住 |
| `id` 不是非空字符串 / `handlers` 不是对象 / `handlers` 是空对象 / 某个 handler 不是函数 | ❌ **抛错** |
| 当前的 `@minecraft/server` 没有 `system.beforeEvents.startup`（1.x） | ❌ 首次调用时**抛错**，提示升级到 2.x 或改用路线 A |

> ⚠️ **同一个组件 id 不要同时用两条路线注册**（路线 A：`BlockCustomComponentBuilder`；
> 路线 B：本模块）。重复注册会抛错，这是刻意设计。

> ⚠️ **游戏内行为未验证**：本轮只在桩环境里验证了注册时机与注册表（本环境无法启动 Minecraft）。
> 真实触发效果请进游戏确认，并把结论回写到 [doc/dev/known-pitfalls.md](../../dev/known-pitfalls.md) 的待确认清单。

---

## 2. 分块持久化

### 2.1 为什么需要

动态属性（dynamic property）是脚本侧最常用的存档手段（`world.setDynamicProperty` / `getDynamicProperty`，
见 [Bedrock Wiki: Script Core Features](https://wiki.bedrock.dev/scripting/script-server) 的 *Saving and Loading data* 一节）。
但**单个动态属性值有长度上限**：框架侧记录为**约 32KB 量级**，超限时 `setDynamicProperty` **抛错**。

> ⚠️ **「约 32KB」这个具体数字「未验证」**：我在 Bedrock Wiki 上没有核对到这个上限（没有可引用的 wiki 依据），
> 该数字来自本项目自己的源码注释 / 踩坑记录（`digitCircuit` 事故、`lr-framework` 的 `BaseEngine`）。
> **真正要记住的不是数字，而是"超限会抛错"这件事**：具体阈值请在真机确认。

一旦项目侧把这段包进 `try { ... } catch {}`，就变成**静默丢存档**：写入失败被吞掉、内存里数据是新的、磁盘上一直是早期小快照。
**症状是「重进世界后数据回到早期状态」**（`digitCircuit` 的电路/chip 绑定消失就是这个原因）。

所以框架把「分块 + 清理残留 + **不吞异常**」固化成接口。

### 2.2 API

```typescript
import {
  CHUNK_SIZE, MAX_CHUNK_SCAN, CHUNK_SUFFIX,
  saveChunked, loadChunked, clearChunked,
  chunkKey, chunkMetaJson, parseChunkCount, looksLikeChunkMeta, splitValue,
} from '@sapdon/runtime'
import type { DynamicPropertyTarget, DynamicPropertyValue } from '@sapdon/runtime'

const CHUNK_SIZE = 24000        // 单个数据块的字符数上限
const CHUNK_SUFFIX = '#'        // 分块键后缀：`<key>#<index>`
const MAX_CHUNK_SCAN = 256      // 无 getDynamicPropertyIds() 时的兜底扫描上界

function saveChunked(target: DynamicPropertyTarget, key: string, value: string): void
function loadChunked(target: DynamicPropertyTarget, key: string): string | undefined
function clearChunked(target: DynamicPropertyTarget, key: string): void
```

| API | 说明 |
|---|---|
| `saveChunked(target, key, value)` | 写入字符串。`value` **必须是字符串**（不是字符串会抛错，请自己 `JSON.stringify` 后传入）。幂等：同一份数据连存两次结果一致 |
| `loadChunked(target, key)` | 读回字符串。**空值语义见 2.4** |
| `clearChunked(target, key)` | 彻底清除：主 key **加所有**数据块（含旧存档残留的更高序号块）。清完 `loadChunked` 返回 `undefined` |
| `CHUNK_SIZE` | `24000`。单值不超过它时**直接存原文**，不切块 |

其余导出（`chunkKey` / `chunkMetaJson` / `parseChunkCount` / `looksLikeChunkMeta` / `splitValue`）
是底层纯函数，给单测与「要和别的实现手工对齐」的场景用；日常只需用上面三个。

### 2.3 存储格式（与既有实现互通）

- **小数据**（`value.length <= CHUNK_SIZE`）：主 key 直接存**原字符串**。
- **大数据**：数据块 `"<key>#0" … "<key>#N-1"`，主 key 存分块元数据 JSON `{"_chunks":N}`。
- **提交点**：**数据块先写、主 key 后写**。中途失败时主 key 仍指向上一份完整数据，不会留下"半新半旧"的可读结果。
- **残留清理**：新数据块数变少时，会删掉 `index >= N` 的旧块（有 `getDynamicPropertyIds()` 时精确删，否则从 `N` 扫到 `MAX_CHUNK_SCAN`）。
- **元数据歧义规避**：内容**恰好是** `{"_chunks":N}` 形态的原文会被**强制分块**，否则读回时会被误判成元数据。

**与既有实现互通**：这套格式与 `examples/lr-framework` 的 `BaseEngine.save/load`、
`examples/digitCircuit` 的 `CIRCUIT_CHUNK = 24000` 方案**完全一致**，可以互相读取。

> ⚠️ 与 `BaseEngine` 的差别：那个实现的 `load` 有"用真值判断空值"的坑（把空串当没存过），本模块没有（见下）。

### 2.4 ★ 空值语义

```typescript
const v = loadChunked(world, 'fz:data')

if (v === undefined) { /* 从没存过 —— 首次运行，走初始化 */ }
else                 { /* 存过（可能是 ''） */ }
```

| 返回值 | 含义 |
|---|---|
| `undefined` | **从没存过** |
| `''` | **存过空串** |
| 其它字符串 | 存过的内容 |

⚠️ **判断必须用 `=== undefined`，不要用真值判断**：`if (!v)` 会把 `''` 当成"没存过"，
于是每次启动都跑一遍初始化 —— 这正是 `BaseEngine.load` 踩过的坑。

### 2.5 异常约定：本模块**不吞任何异常**

| 情况 | 行为 |
|---|---|
| `value` 不是字符串 / `key` 为空 | **抛错** |
| 底层 `setDynamicProperty` 抛错（例如超限） | **原样抛出** |
| 主 key 声明 N 块但某块缺失 / 不是字符串 | **抛错**（`分块存档损坏 —— 主 key "x" 声明 N 块，但 "x#i" 是 缺失`），**不返回半截数据** |
| 主 key 被非字符串值占用 | **抛错**（本接口只读写字符串） |

调用方若确实要容错，**自己 catch 并至少打日志**：

```typescript
try {
  saveChunked(world, 'fz:data', JSON.stringify(model))
} catch (err) {
  console.warn(`[fz] 存档写入失败：${err}`)   // ← 至少留痕，绝不静默
}
```

### 2.6 `target` 参数

只要是满足下面这个最小接口的对象即可 —— **`world` / `Entity` / `ItemStack` 都满足**（已在 `@minecraft/server` 2.8.0 的
`index.d.ts` 里逐个核对：三者都有 `getDynamicProperty` / `setDynamicProperty` / `getDynamicPropertyIds`）：

```typescript
type DynamicPropertyValue = boolean | number | string | Vector3

interface DynamicPropertyTarget {
  getDynamicProperty(identifier: string): DynamicPropertyValue | undefined
  setDynamicProperty(identifier: string, value?: DynamicPropertyValue): void
  getDynamicPropertyIds?(): string[]     // 可选：有它就能精确清理残留分块
}
```

因为签名是结构化的，**单测里可以用内存对象顶替**，不需要 `@minecraft/server`。

### 2.7 完整示例

```typescript
// scripts/store.ts —— 运行期脚本
import { world } from '@minecraft/server'
import { saveChunked, loadChunked, clearChunked } from '@sapdon/runtime'

const KEY = 'fz:machines'
let machines: Record<string, unknown> = {}

export function loadMachines(): void {
  const raw = loadChunked(world, KEY)
  if (raw === undefined) {          // ★ 用 === undefined，不要用 if (!raw)
    machines = {}                   // 从没存过 → 首次运行
    return
  }
  machines = JSON.parse(raw) as Record<string, unknown>
}

export function saveMachines(): void {
  saveChunked(world, KEY, JSON.stringify(machines))   // 超限会抛错，别吞
}

export function resetMachines(): void {
  clearChunked(world, KEY)          // 主 key + 所有数据块一起清
  machines = {}
}

// 实体 / 物品上的动态属性同样可用：
// saveChunked(entity, 'fz:state', JSON.stringify(state))
// saveChunked(itemStack, 'fz:charge', String(charge))
```

---

## 相关文档

- [doc/dev/oc.md](../../dev/oc.md) —— OC 运行时（ECS）整体结构，源码开发者
- [doc/dev/known-pitfalls.md](../../dev/known-pitfalls.md) —— 已知坑清单：§2 自定义组件、§3 持久化、§4 方块容器
- [方块 API](./block.md) —— `BlockComponent`（含 `setBlockEntity` / `setInventory`）
- [扩展模块 API](./extra.md) —— `ClientEntityApperance` / `BaseVehicle`
