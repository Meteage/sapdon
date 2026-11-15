# 多方块结构（`@sapdon/runtime`）

```typescript
import { Multiblocks, Is, Trigger } from '@sapdon/runtime'
```

三层：**图案**（纯逻辑，可在 Node 里单测）→ **触发器**（把基岩版事件的坑收在框架里）→ **行为**（回调 + 常用动作 + 成形结构生命周期）。
结构可以全部是原版方块：原版方块挂不了自定义组件，激活靠触发器订阅的世界事件。完整示例见 `examples/multiblock_showcase`（每种触发方式一个结构）。

## 定义结构 `Multiblocks.define(id, spec)`

```typescript
const reactor = Multiblocks.define('my_mod:nether_reactor', {
    aisles: [                       // 从下往上的各层；每层从北往南的各行；每行从西往东
        ['GCG', 'CCC', 'GCG'],
        ['C C', ' R ', 'C C'],      // 空格 = 不检查
        [' C ', 'CCC', ' C '],
    ],
    where: { G: Is.block('minecraft:gold_block'), C: Is.block('minecraft:cobblestone'), R: Is.block('minecraft:netherreactor') },
    anchor: 'R',                    // 必须恰好出现一次
})
```

| 字段 | 说明 |
|---|---|
| `aisles` | 各层必须同样大小，不齐直接抛错 |
| `where` | 字符 → 方块判断；图案里出现、却没定义的字符直接抛错 |
| `anchor` | 锚点字符；世界坐标、`check()` 都以它为准 |
| `rotate` | 默认 `true`：自动试 4 个水平朝向 |
| `mirror` | 默认 `false`：同时试镜像（手性结构才需要） |
| `formed` | 提供则为**成形结构**，见下文 |

在脚本顶层定义；同一个 id 定义两次抛 `重复定义 <id>`。

### 方块判断 `Is`

| 判断 | 说明 | 摆放示例（`build` 用） |
|---|---|---|
| `Is.block(...ids)` | 方块 id 是其中之一 | 第一个 id |
| `Is.states(id, states)` | id 相同且列出的状态都相等 | 该 id + 状态 |
| `Is.tag(tag, example?)` | 方块带该标签 | `example` |
| `Is.air()` | 空气（含洞穴空气） | 空气 |
| `Is.any()` | 任意已加载的方块 | 无 |
| `Is.or(...)` / `Is.and(...)` / `Is.not(p)` | 组合 | 第一个有示例的分支 |
| `Is.custom(fn, label?, example?)` | 自定义 | `example` |

未加载 / 世界外的格子不满足任何判断。

## 触发器 `Multiblocks.on(def, trigger, handler)`

| 触发器 | 订阅的事件 | 框架替你处理的事 |
|---|---|---|
| `Trigger.interact({ item?, cell?, cancelVanilla?, previewOnFail? })` | `world.beforeEvents.playerInteractWithBlock` | `isFirstEvent` 去重；`cancelVanilla` 同步取消原版行为；回调推迟到下一 tick；`previewOnFail` 点到锚点但不完整时投影缺的方块 |
| `Trigger.useItem({ component, cell? })` | 物品自定义组件 `onUseOn` | 自动注册组件 `component`；物品 JSON 挂上它即可 |
| `Trigger.place({ cell? })` | `world.afterEvents.playerPlaceBlock` | 刚放下的方块可能是任意一格 → 反推匹配 |
| `Trigger.redstone({ kinds?, cell? })` | 按钮 / 拉杆 / 压力板 / 标靶 / 绊线 | 只认上升沿（拉杆打开、压力板从 0 变为有信号）；`kinds` 过滤 |
| `Trigger.itemInside({ cell, item?, watchSeconds?, interval? })` | `world.afterEvents.entitySpawn` + 轮询 | 只跟踪通过 `item` 过滤的新掉落物 `watchSeconds` 秒（默认 15），每 `interval` tick（默认 10）检查 |
| `Trigger.explosion({ blocks?, cell?, sources?, protect? })` | `world.beforeEvents.explosion` | 同步把受保护方块移出受影响列表（`protect` 缺省 `'cell'`，可 `'structure'` / `false`），回调推迟到下一 tick；`sources` 过滤爆炸来源 |
| `Trigger.projectile({ cell?, projectiles? })` | `world.afterEvents.projectileHitBlock` | 按投掷物类型过滤 |
| `Trigger.lightning({ cell? })` | `entitySpawn`（`minecraft:lightning_bolt`） | 检查落点与其下方一格 |

- `cell`：只把触发方块当作该字符的格子（缺省：任何接受这个方块的字符）。
- 只有 `explosion` 可以不绑定结构：`Multiblocks.on(null, Trigger.explosion({ blocks: [...] }), …)`，按方块逐个触发，`ctx.convert(id)` 换掉被炸的那一格。
- 没有用到的事件不订阅；回调抛错只记日志，不影响其他结构。
- `useItem` 注册物品自定义组件，必须在 startup 之前（脚本顶层）调用。
- 一次触发只交给第一个匹配上的注册项。

### 回调上下文 `ctx`

| 成员 | 说明 |
|---|---|
| `trigger` / `definition` / `dimension` / `match` | 触发方式、结构定义、维度、匹配结果（`anchor`、`facing`、`mirrored`、`cells`） |
| `block` / `player` / `itemStack` / `itemEntity` / `entity` / `redstone` | 触发方块、玩家、物品、掉落物实体、投掷物 / 闪电 / 爆炸来源、红石元件类型 |
| `positions(char)` / `blocks(char)` / `center()` | 某字符的所有格子 / 方块、结构中心 |
| `replace(char, block)` / `setBlock(pos, block)` / `convert(block)` | 换方块（id 或 `BlockPermutation`） |
| `drop(item, at?, count?)` / `particle(id, at?)` / `sound(id, at?)` / `spawn(entityId, at?)` | `at` 可以是坐标或字符（该字符的每一格），缺省为结构中心 |
| `placeStructure(name, offset?)` | `world.structureManager.place`，位置为锚点 + offset |
| `consumeItem(count?)` | interact / useItem 消耗手持物品（创造模式不消耗）；itemInside 消耗掉落物（多出的放回原处） |
| `form(data?)` | 登记为已成形（定义必须带 `formed`）；已成形时返回现有实例 |

## 成形结构

```typescript
const reactor = Multiblocks.define<{ t: number }>('my_mod:reactor', {
    aisles, where, anchor: 'R',
    formed: {
        interval: 20,                         // onTick 间隔，默认 20
        revalidateInterval: 100,              // 定期重新校验，默认 100；0 = 只靠事件
        onTick(inst) { inst.data.t++; inst.save() },
        onBreak(inst, reason) { },            // 'broken' | 'unformed'
        onLoad(inst) { },                     // 从存档恢复时
        intact: (inst) => inst.validate({ G: Is.block('minecraft:gold_block', 'minecraft:crying_obsidian') }),
    },
})
Multiblocks.on(reactor, Trigger.interact({ item: 'minecraft:golden_sword' }), (ctx) => ctx.form({ t: 0 }))
```

- 已成形的实例存在世界动态属性 `sapdon:multiblock:<id>`；进入世界的第一个 tick 恢复，并在第一次 tick 前重新校验。
- 只在锚点所在区块已加载时 tick。
- 玩家破坏、爆炸、活塞推动结构的任意一格 → 下一 tick 校验，不完整就解体（`onBreak(inst, 'broken')`）；另外每 `revalidateInterval` tick 定期校验，捕捉命令、火、末影人等改动。
- ⚠️ **成形后会改动自身方块**（例如把金块换成别的方块）时必须提供 `intact`，否则下一次校验会按原图案判定「结构被破坏」。`inst.validate(overrides)` 可以按字符覆盖判断条件。
- 实例也有 `ctx` 的全部动作，外加 `data`、`save()`、`unform()`、`isLoaded()`、`validate(overrides?)`。

## 其他 API

| API | 说明 |
|---|---|
| `Multiblocks.check(def, dimension, anchor)` | 以锚点匹配（手动触发） |
| `Multiblocks.find(def, dimension, pos)` / `findAll(dimension, pos)` | `pos` 可以是结构任意一格 |
| `Multiblocks.context(def, dimension, match, extra?)` | 构造手动触发的上下文（复用动作与 `form()`） |
| `Multiblocks.preview(def, dimension, anchor, { orientation?, particle?, durationTicks? })` | 在缺少 / 不对的格子上放粒子；不给朝向时选符合格子最多的朝向（并列取靠前的） |
| `Multiblocks.build(def, dimension, anchor, orientation?)` | 按每个判断的示例方块自下而上摆出结构，返回放置格数 |
| `Multiblocks.formed(def)` / `formedAt(dimension, pos)` | 已成形实例 / 某一格属于哪个实例 |
| `def.pattern.describe()` / `bill()` / `anchorCell` | 逐层说明、材料清单、锚点在图案网格里的位置 |
| `Multiblocks.stats()` | 定义数、各触发器注册数、成形实例数、正在跟踪的掉落物数 |

## 已知限制

- 区块卸载后不 tick；成形结构的状态按存档保留，重新加载后继续。
- 掉落物进入结构只跟踪有限时间（`watchSeconds`），不是持续监视世界。
- 绊线需要钩子与线的朝向，展示包里没有示例，触发器本身支持（`kinds: ['tripwire']`）。
- 爆炸的回调在下一 tick 执行：此时未受保护的方块已经被炸掉。
