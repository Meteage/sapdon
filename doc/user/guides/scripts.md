# 让脚本在游戏里跑起来

目标：`scripts/` 下的代码能被打进行为包，进游戏执行，并且你能确认它真的执行了。

判断成了没有：进游戏后 `ContentLog` 里出现你写的那行 `[my_mod] ...`，或者做某个交互时游戏里确实有反应。

## 1. 先确认脚本入口接上了

`build.config` 里三个字段决定脚本怎么进包：

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

`scriptEntry` 是源码入口，它 import 到的文件会一起打成 `scripts/index.js`，输出到 `dev/<项目名>_BP/scripts/`。

`dependencies` 会写进行为包的 `manifest.json`。脚本里 import 的每个 `@minecraft/*` 模块都必须在这里出现，漏一个，游戏找不到模块，整份脚本不加载。表现是包装上了但什么都没发生，只有内容日志里有一行报错。

改完 `dependencies` 要删掉 `dev/<项目名>_BP/manifest.json` 再构建。这个文件只在不存在时生成，框架靠它保留 uuid，所以你不动它，它就不动。

## 2. 写一行能看见的日志

先别写业务逻辑，先在 `scripts/index.ts` 顶层打一行：

```typescript
// scripts/index.ts
import { world } from '@minecraft/server'

console.warn('[my_mod] script loaded')
```

用 `console.warn` 而不是 `world.sendMessage`：前者会写进内容日志，后者只出现在聊天栏，出问题时翻不到。

日志文件在 `%APPDATA%\Minecraft Bedrock\logs\ContentLog*.txt`，Beta 版在对应的 Package 目录下。构建、进世界，然后在文件末尾搜 `[my_mod]`。搜不到就别往下写了，先解决加载问题。

## 3. 订阅事件

```typescript
import { world } from '@minecraft/server'

world.afterEvents.itemUse.subscribe((event) => {
  const player = event.source
  if (player.typeId !== 'minecraft:player') return
  if (event.itemStack?.typeId !== 'my_mod:magic_wand') return

  player.sendMessage('§a魔杖生效')
  player.dimension.spawnParticle('minecraft:totem_particle', player.location)
})
```

订阅要写在模块加载期的顶层，不要塞进 `setTimeout` 或某个启动回调，早期事件会漏掉。

`world.beforeEvents.*` 的回调里不能改世界，放方块、给物品都会抛错。要改就转一手 `system.run()`。

事件里的 `source` 常常是 `Entity`，动手前先判 `typeId`，别直接当玩家用。

`scripts/` 下可以拆文件，入口只负责 import 和订阅：

```
scripts/
├── index.ts   # import 各模块，注册组件
├── wand.ts
└── shop.ts
```

## 4. 构建期声明的组件，运行期要注册实现

这是最容易断的一处。方块或物品 JSON 里写了一个自定义组件 id，脚本里就必须在启动前注册同名的实现。缺一半，引擎报 `this component was found in the input, but is not present in the Schema`。

构建期把 id 写进方块：

```typescript
// main.ts
import { BlockAPI, BlockComponent, registry } from '@sapdon/core'

const machine = BlockAPI.createBasicBlock('my_mod:machine', 'construction', sixFaces)
machine.addComponent(BlockComponent.setCustomComponents(['my_mod:machine_tick']))

registry.submit()
```

运行期注册同名实现，写在 `scripts/index.ts` 顶层：

```typescript
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

`registerBlockComponent`、`registerItemComponent` 内部会把注册排到 `system.beforeEvents.startup`。别自己写 `world.beforeEvents.worldInitialize`，那个时机组件已经校验完了。也别在事件回调或定时器里调用这两个函数，框架会直接抛「注册得太晚」。

物品要触发 `onUse`，物品上还得有交互按钮：

```typescript
ItemAPI.createItem('my_mod:guide', ItemCategory.Items, 'book')
  .addComponent(ItemComponent.setInteractButton('打开'))
```

另一种写法是构建期的 `BlockCustomComponentBuilder`，它的 handler 会被序列化成源码写进脚本，所以不能 import 共享模块。同一个 id 用两条路线各注册一次，会抛重复注册。要复用逻辑就用运行期这条。

## 5. 定时与状态

```typescript
import { system } from '@minecraft/server'

const handle = system.runInterval(() => {
  // 每 20 tick 一次，约 1 秒
}, 20)

system.clearRun(handle)
```

跨会话保存状态用动态属性：

```typescript
block.setDynamicProperty('my_mod:fuel', 120)
const fuel = block.getDynamicProperty('my_mod:fuel') as number | undefined
```

动态属性不能写在可堆叠物品上，运行时会报 `Cannot set dynamic properties on stackable items`。带电量、基因、纯度这类数据的物品，`max_stack_size` 必须是 1。

机器网络、电路这种跨区块的大块数据，用 `@sapdon/runtime` 的分块持久化，别硬塞进一个动态属性，单个属性有长度上限，超了会抛错，被 try-catch 吞掉就是静默丢档。细节见 [运行期 API](../api/runtime.md) §2。

## 6. 脚本没反应，按这个顺序查

| 现象 | 查什么 |
|---|---|
| 内容日志里连加载日志都没有 | `scriptEntry` 路径对不对，产物 `dev/<项目名>_BP/scripts/index.js` 存不存在 |
| 有产物但游戏里没任何反应 | `dependencies` 是否漏了 import 的模块；漏了就删掉 `dev/<项目名>_BP/manifest.json` 重建 |
| 报 `Cannot find package` | 运行期脚本 import 了 `@sapdon/core`。core 是构建期的东西，运行期只能用 `@sapdon/runtime` |
| 报 `not present in the Schema` | 组件注册太晚，或者 id 与 JSON 里的不一致 |
| 带 `container` 的方块点不出反应 | 容器方块会吃掉右键，`onPlayerInteract` 不触发，交互逻辑改用 tick 加距离判断 |

更多症状在 [已知坑清单](../../dev/known-pitfalls.md) 和 [FAQ](../faq.md)。

## 相关

组件事件全表、分块持久化的实现，见 [运行期 API](../api/runtime.md)。从零写第一个方块组件的过程，见 [方块教程](../tutorials/block.md) §7。
