# 运行期脚本教程

构建期（`main.ts`）负责**生成 JSON**，运行期（`scripts/`）负责**让东西在游戏里动起来**。
本教程讲清楚两件事：脚本从哪进、怎么和构建期声明的方块/物品对上。

> 前置：[快速入门](../quick-start.md)、[方块教程](./block.md) §1。

---

## 目录

1. [构建期与运行期的分工](#1-构建期与运行期的分工)
2. [脚本入口与构建配置](#2-脚本入口与构建配置)
3. [写法 A：直接订阅 Script API 事件](#3-写法-a直接订阅-script-api-事件)
4. [写法 B：OC 游戏实例](#4-写法-boc-游戏实例)
5. [自定义组件：构建期声明 + 运行期实现](#5-自定义组件构建期声明--运行期实现)
6. [定时与持久化](#6-定时与持久化)
7. [调试](#7-调试)
8. [常见坑](#8-常见坑)

---

## 1. 构建期与运行期的分工

| | 构建期 `main.ts` | 运行期 `scripts/*.ts` |
|---|---|---|
| 运行在哪 | Node.js（构建时） | Minecraft 脚本引擎 |
| 能 import | `@sapdon/core` | `@sapdon/runtime`、`@minecraft/server`、`@minecraft/server-ui` |
| 产出 | `dev/<name>_BP`、`_RP` 里的 JSON | 打包成 `scripts/index.js` |
| 关键调用 | `registry.submit()` | 事件订阅、组件注册 |

**铁律**：运行期脚本里 `import '@sapdon/core'` 会在产物中留下无法解析的裸包名，游戏加载直接报错。
`@sapdon/core` 只属于构建期。

---

## 2. 脚本入口与构建配置

`build.config` 里两个字段决定入口与产物：

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

- `scriptEntry` — 脚本源码入口，会把 `scripts/` 下所有被 import 到的文件打成一个 bundle
- `scriptOutput` — 输出路径（相对 `dev/<name>_BP/`）
- `dependencies` — 会写进行为包 `manifest.json`；**新加模块要删掉旧的 `dev/<name>_BP/manifest.json` 才会重新生成**
- **脚本里 import 的每个 `@minecraft/*` 模块都必须在这里声明**。漏一个（典型是 `@minecraft/server-ui`），
  游戏找不到模块，整份脚本不加载 —— 表现是「装了包但什么都没发生」，内容日志里才有一行报错

模板生成的项目里，`scripts/index.ts` 长这样：

```typescript
import { MinecraftMain, MinecraftGameInstance, registerBuiltinComponents } from '@sapdon/runtime'
import './custom_components/index.js'

registerBuiltinComponents()

@MinecraftMain
export class Main extends MinecraftGameInstance {}
```

如果只是订几个事件，可以整份简化掉（见写法 A）；要保留 OC 的组件体系就留着（见写法 B）。

---

## 3. 写法 A：直接订阅 Script API 事件

最常见、也最容易排错的写法。`scripts/index.ts` 里直接写顶层订阅：

```typescript
import { world, system } from '@minecraft/server'

world.afterEvents.itemUse.subscribe((event) => {
  const player = event.source
  if (player.typeId !== 'minecraft:player') return
  if (event.itemStack?.typeId !== 'my_mod:magic_wand') return

  player.sendMessage('§a魔杖生效')
  player.dimension.spawnParticle('minecraft:totem_particle', player.location)
})
```

要点：

- **必须在模块加载期订阅**（顶层语句），不要塞进 `setTimeout` 或某个启动事件里 —— 会漏掉早期事件
- `world.beforeEvents.*` 里**不能改世界**（放置方块、给物品都会抛错），需要改就转 `system.run()`
- 玩家相关的事件对象常常是 `Entity`，动手前先判 `typeId === 'minecraft:player'`

`script/index.ts` 里 import 的每个模块都会进 bundle，可以正常拆文件：

```
scripts/
├── index.ts          # 入口：只负责 import 和订阅
├── wand.ts           # 魔杖逻辑
└── shop.ts           # 商店逻辑
```

---

## 4. 写法 B：OC 游戏实例

需要「随实体创建自动挂组件、按 tick 驱动」时用 OC 层。它把 SAPI 的事件包装成 ECS 风格：

```typescript
import { world } from '@minecraft/server'
import { MinecraftMain, MinecraftGameInstance } from '@sapdon/runtime'

@MinecraftMain
export class Main extends MinecraftGameInstance {
  afterStart(): void {
    // 这里才能安全地订阅需要世界已就绪的监听器
    world.afterEvents.itemUse.subscribe((e) => {
      world.sendMessage(`used ${e.itemStack?.typeId}`)
    })
  }
}
```

两个约定：

- `@MinecraftMain` 一个包**只能有一个**，它负责初始化单例与组件系统
- 监听器写在 `afterStart()` 里，不写在 `onStart()` —— 后者执行时还没有权限绑定

再往上走是 `PlayerSpawned` / `EntitySpawned` 装饰器 + `PlayerHudComponent` 之类的组件基类，
参考 `examples/oc-launch/scripts/index.ts`。**新手先别碰**，写法 A 能覆盖八成需求。

---

## 5. 自定义组件：构建期声明 + 运行期实现

这是 sapdon 里最容易断链的一处：**JSON 里声明的组件 id，必须由脚本在启动前注册实现**，缺一半就报
`this component was found in the input, but is not present in the Schema`。

### 5.1 构建期：把 id 写进方块/物品

```typescript
// main.ts
import { BlockAPI, BlockComponent, registry } from '@sapdon/core'

const machine = BlockAPI.createBasicBlock('my_mod:machine', 'metal', [...sixFaces])
machine.addComponent(BlockComponent.setCustomComponents(['my_mod:machine_tick']))

registry.submit()
```

### 5.2 运行期：注册同名 id 的实现

```typescript
// scripts/index.ts —— 必须是顶层调用
import { registerBlockComponent } from '@sapdon/runtime'

registerBlockComponent('my_mod:machine_tick', {
  onTick: ({ block }) => {
    // 每 tick 触发
  },
  onPlayerInteract: ({ block, player }) => {
    player?.sendMessage('交互到了')
  },
})
```

`registerBlockComponent` / `registerItemComponent` 由框架保证在 `system.beforeEvents.startup` 注册，
**不要**自己写 `world.beforeEvents.worldInitialize` —— 那个时机太晚，组件已经校验完了。

物品侧还有一个额外条件：要触发 `onUse`，物品上必须有 `minecraft:interact_button`：

```typescript
ItemAPI.createItem('my_mod:guide', ItemCategory.Items, 'book')
  .addComponent(ItemComponent.setInteractButton('打开'))
```

### 5.3 两条路线别混用

| 路线 | 声明位置 | handler |
|------|---------|---------|
| A `BlockCustomComponentBuilder` | 构建期 `main.ts` | 被序列化成源码，**不能 import 共享模块** |
| B `registerBlockComponent`（推荐） | 运行期 `scripts/` | 普通闭包，可以 import |

同一个 id 用两条路线各注册一次会抛「重复注册」。

---

## 6. 定时与持久化

```typescript
import { system } from '@minecraft/server'

const handle = system.runInterval(() => {
  // 每 20 tick（约 1 秒）执行
}, 20)

// 需要时停掉，否则区块卸载后仍在跑
system.clearRun(handle)
```

跨会话保存状态用动态属性：

```typescript
block.setDynamicProperty('my_mod:fuel', 120)
const fuel = block.getDynamicProperty('my_mod:fuel') as number | undefined
```

⚠️ **动态属性不能写在可堆叠物品上**（运行期报 `Cannot set dynamic properties on stackable items`）。
凡是带纯度/基因/环境这类数据的物品，必须 `max_stack_size: 1`。

跨区块的大块数据（机器网络、电路）用 `@sapdon/runtime` 的分块持久化，见
[运行期 API](../api/runtime.md) §2。

---

## 7. 调试

```typescript
console.warn(`[my_mod] fuel=${fuel}`)   // 会落到 ContentLog
```

- 日志文件：`%APPDATA%\Minecraft Bedrock\logs\ContentLog*.txt`（Beta 版在对应 Package 目录下）
- 玩家聊天用 `world.sendMessage()`，但它**不进 ContentLog**；要留痕就用 `console.warn`
- 报错行号对不上时先看报错里的包名/标签，打包后的行号不可信

---

## 8. 常见坑

1. **`container` 方块吃右键** — 带 `minecraft:block_entity.container` 的方块，脚本的 `onPlayerInteract` 永远不触发。交互逻辑改用 tick + 距离检测。
2. **组件注册太晚** — 用 `world.beforeEvents.worldInitialize` 会报 `not present in the Schema`；用 `system.beforeEvents.startup`，或直接调 `registerBlockComponent`。
3. **运行期 import 了 `@sapdon/core`** — 构建能过，游戏加载报 `Cannot find package`。
4. **改了 `dependencies` 却没生效** — `manifest.json` 只在不存在时生成，先删再构建。
5. **脚本没被打包** — 检查 `scriptEntry` 路径，以及入口文件是否被 `main.ts` 误当成构建入口。

---

## 下一步

- [运行期 API 参考](../api/runtime.md) — 组件注册细节、分块持久化、展示实体
- [方块教程](./block.md) §7 — 方块组件全表
- [已知坑清单](../../dev/known-pitfalls.md) — 按症状检索
