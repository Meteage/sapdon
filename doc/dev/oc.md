# OC 运行时模块文档

`src/oc/` 是 Sapdon 的 **OC (Object-Component) 运行时**，是一个轻量级 ECS 风格游戏框架，专门用于 Minecraft Bedrock 版 Script API 环境。作为 `@sapdon/runtime` 发布。

---

## 0. 分层铁律：构建期 `@sapdon/core` vs 运行期 `@sapdon/runtime`

**这一节是读懂 `src/core` 与 `src/oc` 分工的前提，写运行期代码前必看。**

| | `@sapdon/core`（`src/core`） | `@sapdon/runtime`（`src/oc`） |
|---|---|---|
| 运行时机 | **构建期**（`main.ts` 跑一遍生成 JSON） | **运行期**（游戏内 `scripts/*` 执行） |
| 在 `rollupIgnores` 里？ | ✅ 是 → 打包时被当作 **external** | ❌ 否 → **会被打包进脚本包** |
| 典型内容 | `ItemAPI` / `BlockAPI` / `registry.submit()` / DTO 类 | `ComponentManager` / `Level` / `Scheduler` / `persist` / `components` |
| 运行宿主 | Node.js（CLI 子进程） | Minecraft Bedrock Script API |

依据：`src/cli/build.js:38-44` 的 `rollupIgnores`：

```javascript
const rollupIgnores = [
    'rollup',
    'typescript',
    '@sapdon/core',   // ← 构建期库，external
    '@sapdon/cli',
    '@minecraft',     // ← 由游戏内置提供
]
```

⚠️ **红线**：**运行期脚本里不要 `import '@sapdon/core'`**。
因为 `@sapdon/core` 在 external 名单里，rollup 会**原样保留** `import ... from '@sapdon/core'` 这条裸包名语句，而 Bedrock **不是它的宿主**（游戏运行时只提供 `@minecraft/*`，没有 npm 解析）→ 产物里留下**游戏解析不了的裸包名**，导致**整包脚本挂掉**。需要"构建期和运行期共用"的逻辑，必须放在 `src/oc`（`@sapdon/runtime`）里，或各自实现一份。

**判断方法**：问「这段代码是在 `main.ts` 里生成 JSON，还是在游戏里每 tick 跑？」前者属于 `core`，后者属于 `oc`。新 API 落地前先想清楚属于哪一层。

---

## 1. 架构总览

OC 模块实现了一个简化的 **Entity-Component 架构**：

```
┌──────────────────────────────────────────────────┐
│                    Minecraft 世界                   │
│                                                     │
│  ┌──────────────┐   ┌──────────────┐               │
│  │  Entity A    │   │  Entity B    │               │
│  │              │   │              │               │
│  │ ComponentManager │ │ ComponentManager │          │
│  │  ├─ HealthComp  │ │  ├─ MoveComp   │           │
│  │  ├─ InputComp   │ │  ├─ RenderComp │           │
│  │  └─ HudComp     │ │  └─ HealthComp │           │
│  └──────────────┘   └──────────────┘               │
│                                                     │
│  ┌────────────────────────────────────────────────┐ │
│  │  Level (实体集合)                                │ │
│  │  └─ Scheduler (驱动 tick 循环)                  │ │
│  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

**核心概念：**

| 概念 | 说明 |
|------|------|
| **Component** | 附着在实体上的数据+行为单元，每个 Component 有自己的 `onTick()` |
| **ComponentManager** | 每个实体一个，管理其所有 Component 的生命周期 |
| **Level** | 实体集合，以 string ID 索引，每个 ID 对应一个 ComponentManager |
| **Scheduler** | 驱动游戏循环，每 tick 遍历 `Level.table` 里的每个 ID 调用 `onTick()`。⚠️ 它**只认实体**（内部写死 `world.getEntity(id)`），见 §4.2 |
| **Optional\<T\>** | Monadic 空值包装器 |
| **EventEmitter** | 自定义发布/订阅事件系统 |

> ⚠️ **调度器只遍历实体（重要架构约束）**：`Level.table` 的键会被当作**实体 ID** 去查 `world.getEntity(id)`。把**方块**的 ID 注册进这张表，`getEntity` 恒为 `undefined` → **方块永远不会 tick，而且不报任何错**。想做「机器每 tick 干活」必须**自建调度**（自己 `system.runInterval`）。详见 §4.2。

### 目录结构

```
src/oc/
├── index.ts               # 包入口，聚合导出
├── core.ts                # 核心 ECS：Component, ComponentManager, lazyGet, RequireComponents
├── arch.ts                # 引导启动：GameInstance, initialize/finalize
├── optional.ts            # Optional Monad
├── level.ts               # Level + Scheduler 接口
├── events/
│   └── index.ts           # EventEmitter (自定义事件系统)
├── input/
│   └── base.ts            # PlayerInputComponent (按键/轴输入)
├── math/
│   ├── index.ts           # 聚合导出
│   ├── array.ts           # ArrayEx (数组基类)
│   ├── spline.ts          # SplineInterpolator (样条插值)
│   ├── vec/vec3.ts        # Vec3 (3D 向量)
│   ├── vec/vec4.ts        # Vec4 (4D 向量)
│   └── mat/mat4.ts        # Matrix (4x4 矩阵)
├── action/
│   ├── interface.ts       # ActionValueType, IAction, IActionTrigger, IActionModifier
│   ├── triggers.ts        # ActionTriggers (pressed/released/hold 等)
│   └── modifiers.ts       # ActionModifiers (negate/scale)
├── ui/hud.ts              # HudComponent (基类)
├── components/            # 【新增】运行期自定义组件注册（路线 B）
│   └── registry.ts        # registerBlockComponent / registerItemComponent / pendingComponentCount / registeredComponents
├── persist/               # 【新增】分块持久化（绕开动态属性约 32KB 上限）
│   └── chunked.ts         # saveChunked / loadChunked / clearChunked / CHUNK_SIZE
├── builtin/               # 框架内建自定义组件（在 startup 时机注册）
│   ├── index.ts           # registerBuiltinComponents()
│   ├── blocks/            # crop / fallingBlock / headRotation / intercardinalOrientation
│   └── items/guiBook.ts   # sapdon:guibook
└── minecraft/             # Minecraft 集成层
    ├── index.ts           # 聚合导出
    ├── core.ts            # MinecraftTickingScheduler, MinecraftLevel, MinecraftGameInstance
    ├── decorator.ts       # @Minecraft, @MinecraftMain, @PlayerSpawned, @EntitySpawned, @SpawnFilter
    ├── utils.ts           # MinecraftMethod 装饰器, utils 单例
    ├── scriptEvent.ts     # @ScriptEvent 装饰器 + 事件桥接
    ├── input/
    │   └── inputComponent.ts  # MinecraftPlayerInputComponent
    ├── component/
    │   ├── kinematics.ts      # EasyKinematicsComponent (力驱动运动)
    │   └── vehicleComponent.ts # EasyVehicleComponent (载具物理)
    └── ui/
        └── actionbar.ts       # PlayerHudComponent (actionbar HUD)
```

> `components/` 与 `persist/` 的 **API 细节（签名、参数、示例）见[运行期 API 文档](../user/api/runtime.md)**；本节只说明它们的架构定位。

---

## 2. Component 系统 (`core.ts`)

### 2.1 接口层级

```
Component<Actor> (接口)
  ├── onTick(dt: number): void
  ├── detach(): void
  ├── getManager(): ComponentManager<Actor>
  └── getEntity(): Actor

BasicComponent<Actor> (接口，extends Component)
  ├── onAttach(manager: ComponentManager<Actor>): void
  └── onDetach(manager: ComponentManager<Actor>): void

RequiredComponent<Actor> (接口，extends BasicComponent)
  └── getComponent<T>(ctor): T
```

### 2.2 实现层级

```
CustomComponent<Actor> (抽象类，实现 Component)
  └── BaseComponent<Actor> (类，实现 BasicComponent)
```

**CustomComponent** 使用 `Symbol` 存储 manager 和 entity 引用：

```typescript
const REFLECT_MANAGER = Symbol('manager')
const REFLECT_ENTITY = Symbol('entity')

class CustomComponent<Actor> {
  onTick(dt: number) {}  // 默认空实现
  detach() { this.getManager()?.update() }
  getManager() { return this[REFLECT_MANAGER] }
  getEntity() { return this[REFLECT_ENTITY] }
}
```

**BaseComponent** 添加空的 `onAttach` / `onDetach` 钩子。

### 2.3 Component 生命周期

```
构造 (new Component())
  │
  ▼
onAttach(manager)  ← 被 ComponentManager.attachComponent() 调用
  │
  ▼
onTick(dt)         ← 每帧由 ComponentManager.handleTicks() 调用
  │  (可被多次调用)
  ▼
detach() / onDetach(manager)  ← 被 ComponentManager.detachComponent() 调用
```

### 2.4 ComponentManager

每个实体拥有一个 `ComponentManager`，管理 `Map<ComponentCtor, Component>`：

| 方法 | 说明 |
|------|------|
| `attachComponent(component)` | 附加组件，调用 `onAttach`，处理 `RequiredComponent` 依赖 |
| `detachComponent(ctor)` | 分离组件，调用 `onDetach` |
| `getComponent<T>(ctor)` | 获取组件，不存在则报错 |
| `getComponentUnsafe<T>(ctor)` | 安全获取，返回 `Optional<T>` |
| `getOrCreate<T>(ctor, ...args)` | 获取或创建 |
| `has(ctor)` | 检查组件是否存在 |
| `clear()` | 清除所有组件 |
| `handleTicks(en, dt)` | 遍历所有组件调用 `onTick`，支持 before/after 队列 |
| `update()` | 触发组件重附加（用于依赖变更后刷新） |

**全局单例**：`ComponentManager.global` 用于存放全局（非实体相关）组件。

**性能分析**：`ComponentManager.profilerEnable = true` 可启用 tick 耗时日志。

### 2.5 RequiredComponent (依赖注入)

`RequireComponents(...params)` 是一个 mixin 工厂，创建一个带依赖的 Component 类：

```typescript
// 用法示例
const MyComponent = RequireComponents(
  HealthComponent,
  [MovementComponent, 1.0],  // 带构造参数的依赖
  TransformComponent
)

class MyComponent extends BaseComponent<Entity> {
  // 通过 this.getComponent(HealthComponent) 访问依赖
}
```

每次 `attachComponent` 时，如果组件有 `REQUIRED_COMPONENTS` 符号属性，这些依赖会被自动构造并附加。

### 2.6 lazyGet

`lazyGet(component, ctor)` 返回一个 **Proxy**，在首次访问属性时才通过 manager 查找目标组件。用于组件间交叉引用，避免循环依赖问题。

---

## 3. Level 与 Scheduler (`level.ts`)

### 3.1 Level

```typescript
abstract class Level<T> {
  protected table: Map<string, ComponentManager<T>>
  
  addEntity(id: string): ComponentManager<T>
  removeEntity(id: string): void
  getManager(id: string): ComponentManager<T>
  
  abstract getScheduler(): Scheduler<T>
  
  start()  // → scheduler.start(table)
  stop()   // → scheduler.stop()
}
```

- 实体用 string ID 标识
- `getManager(id)` 在不存在时自动创建新 manager
- `start()` / `stop()` 委托给 scheduler

### 3.2 Scheduler

```typescript
interface Scheduler<Actor> {
  currentTick: number
  timeDilation: number
  
  start(table: Map<string, ComponentManager<Actor>>): void
  stop(): void
}
```

`timeDilation` 属性可加速/减速游戏时间（默认 1.0）。

---

## 4. Minecraft 集成

### 4.1 整体启动流程

```
Minecraft 启动
    │
    ▼
@MinecraftMain 装饰器
  → GameInstance(target) 注册游戏类
  → utils.start() 挂载生命周期钩子
    │
    ▼
system.beforeEvents.startup 触发
    │
    ▼
initialize(GameInstanceClass)
  → new GameInstanceClass()
  → instance.onStart()
    │
    ▼
MinecraftGameInstance.onStart()
  → 创建 MinecraftLevel
  → 创建 MinecraftTickingScheduler
  → level.start() → scheduler.start(table)
  → 安排 afterStart() 下一 tick 执行
    │
    ▼
每游戏 tick:
  scheduler.executeTick(table)
    → 遍历每个实体的 ComponentManager
    → manager.handleTicks(entity, dt)
    → 每个 Component.onTick(dt)
```

### 4.2 MinecraftTickingScheduler

源码：`src/oc/minecraft/core.ts:7-57`。

```typescript
@Minecraft
class MinecraftTickingScheduler implements Scheduler<string> {
  private _currentTick = 0
  private _timeStamp = 0
  timeDilation = 1

  get currentTick() { return this._currentTick }

  start(table: Map<string, ComponentManager<any>>) {
    this._timeStamp = Date.now()
    this._run = system.runInterval(this.executeTick.bind(this, table))
  }
  stop() { system.clearRun(this._run) }

  executeTick(table) {
    if (!this.timeDilation) return
    const prev = this._currentTick
    const cur = this._currentTick += this.timeDilation
    if (cur - prev < 1) return                    // 时间膨胀不足 1 tick → 本帧跳过
    const lastTickTime = this._timeStamp
    const currentTime = (this._timeStamp = Date.now())
    const dt = (currentTime - lastTickTime) * this.timeDilation
    this._handleTick(table, dt)
  }

  _handleTick(table, dt) {
    for (const [ id, manager ] of table.entries()) {
      const entity = world.getEntity(id)          // ★ 键被当作实体 ID
      if (entity) manager.handleTicks(entity, dt) // ★ 查不到就静默跳过
    }
  }
}
```

> `currentTick` 是**累积的时间膨胀值**（不是帧数）：只有累积跨过 1 才真正执行一次 tick，`dt` 是「距上次执行的真实毫秒差 × timeDilation」。

#### ★ 固有开销：调度器的 `runInterval` **不传 `tickInterval`** ⇒ 每 tick 无条件回调（项目侧无法消除）

```js
// src/oc/minecraft/core.ts:46-49
start(table) {
  this._timeStamp = Date.now()
  this._run = system.runInterval(this.executeTick.bind(this, table))   // ← 只传了 callback
}
```

- `system.runInterval(callback, tickInterval?)` 的第二个参数是**可选**的，框架**没传** ⇒ 间隔由引擎缺省决定，
  框架**自己无法控制**它 ⇒ **每个 game tick 都会回调一次**（`executeTick` 里只可能在
  `timeDilation === 0` 时提前 `return`，但**回调本身照样发生**）。
  （⚠️ 官方文档页把 `tickInterval` 只写成 "An interval of every N ticks"、**没有显式写出缺省数字** ——
  缺省值是 **1** 这一点标**「未验证」**；但"不传 ⇒ 框架控制不了间隔、每 tick 被回调"这个结论
  与 FZ S3a 的真机观察一致。）
- **启动时机与项目无关**：`MinecraftGameInstance.onStart(ev)` → `setLevel(new MinecraftLevel())` →
  `Level.start()`（`src/oc/level.ts:32-34`）→ `this.getScheduler().start(this.table)` ⇒
  **世界一开始就常驻**，哪怕项目里一个机器/实体组件都没注册。
- 框架里**第二处** `system.runInterval` 是 `src/oc/builtin/blocks/fallingBlock.ts:18`（间隔 **10** tick）——
  但它是**条件触发**的：只有下落方块 `onTick` 里 spawn 出实体后才起，实体落地/失效时 `clearRun` 自清，
  **不是常驻开销**。（全仓 grep 判据：`Select-String -Path src\oc -Recurse -Pattern 'runInterval'` → 恰好 2 处命中。）

⇒ **结论**：项目侧能做到「**零机器 tick**」（活跃数 0 时 `clearRun` 掉自己那个 interval），
但**做不到「零脚本回调」** —— 框架这处每 tick 的固定开销无法被项目消除。
若将来要真正的「空闲零回调」，需要给调度器加「**无订阅者就停**」的能力；
⚠️ 但它还兼管**实体**组件的 tick（`_handleTick` 遍历 `Level.table` 里的实体），
停掉会连带停掉实体组件 —— 有副作用，**不能简单停**。本轮**未改代码**（改调度语义影响面大，仅记档）。

#### ⚠️ 调度器只遍历实体 —— 「方块每 tick 干活」必须自建调度

`_handleTick` 里**硬编码**了 `world.getEntity(id)`（`src/oc/minecraft/core.ts:20`）。而 `Level.table` 的键就是任意 string ID（`src/oc/level.ts:11-17`），**框架不校验它是不是实体**。于是：

```
Level.addEntity("my_addon:my_machine")   // 键是方块标识符
  → 进 table
  → 每 tick: world.getEntity("my_addon:my_machine") → undefined
  → if (entity) 不成立 → 什么都不做
```

**症状是本项目排查最久的一类坑**：

- 方块**永远不会 tick**；
- **不报任何错、不打印任何警告**（`if (entity)` 把 `undefined` 静默吞掉了）；
- 你在 Component 里写的 `onTick(dt)` 代码看起来完全正常，只是**从来没被调用过**。

⇒ 结论：**`Component.onTick()` 这条路只对实体成立**。
想做「机器 / 方块每 tick 干活」，必须**自建调度**，例如：

```js
// 运行期脚本：自己驱动，不依赖 Level/Scheduler
import { system, world } from '@minecraft/server'
system.runInterval(() => {
    // 自己遍历方块（例如按 dimension.getBlock 查询已知坐标，
    // 或维护一份「已放置机器」的坐标表）
}, 1)
```

或走方块**自定义组件**的 `onTick` —— 那条路属于**游戏自身的调度**（Bedrock Wiki 的方块组件列表里包含 [Tick 组件](https://wiki.bedrock.dev/blocks/block-components#tick)），**不经过本框架的 `Scheduler`**。⚠️ 其具体的驱动关系（`onTick` 与 `minecraft:tick` 如何配合）**未验证** —— 本项目无法启动 Minecraft。

### 4.3 MinecraftGameInstance

```typescript
// src/oc/minecraft/core.ts:68-100
abstract class MinecraftGameInstance implements GameInstance {
  onStart(ev: StartupEvent) {
    this.setLevel(new MinecraftLevel())          // setLevel 内部会调 lvl.start()
    system.runTimeout(() => this.afterStart(), 1) // 下一 tick 执行 afterStart
  }
  shutdown() { this.level?.stop?.() }
  afterStart() {}   // 子类覆写
}
```

用户自定义游戏类 extends `MinecraftGameInstance`，实现 `onStart()` 和可选的 `afterStart()`。

### 4.4 装饰器

#### 类装饰器

| 装饰器 | 说明 |
|--------|------|
| `@Minecraft` | 代理构造，确保在 Minecraft 环境中运行 |
| `@MinecraftMain` | 标记为主游戏类，注册 GameInstance + 挂载生命周期 + 设置生成监听 |
| `@PlayerSpawned(...deps)` | 标记在玩家生成时自动附加的 Component |
| `@EntitySpawned(...deps)` | 标记在实体生成时自动附加的 Component |
| `@ActorSpawned(...deps)` | 同时监听玩家和实体生成 |
| `@SpawnFilter(filter)` | 条件过滤：`(entity) => boolean`，返回 false 则不附加 |

#### 方法装饰器

| 装饰器 | 说明 |
|--------|------|
| `@MinecraftMethod` | 包装方法，执行前断言 Minecraft 环境 |
| `@ScriptEvent(eventId)` | 绑定方法到 Minecraft script event |

### 4.5 生成时自动附加

`@MinecraftMain` 内部逻辑：

```
world.afterEvents.playerSpawn
  → 查找所有 @PlayerSpawned 装饰的类
  → 构造实例 + attachComponent(playerManager)
  → @SpawnFilter 可过滤

world.afterEvents.entitySpawn (排除 player)
  → 查找所有 @EntitySpawned 装饰的类
  → 构造实例 + attachComponent(entityManager)
```

### 4.6 ScriptEvent 桥接

```typescript
// 方法装饰器用法
class MySystem {
  @ScriptEvent('myAddon:event')
  handleEvent(ev: ScriptEventCommandMessageAfterEvent) {
    console.log('event received', ev)
  }
}

// 编程式用法
ScriptEvent.on('myAddon:event', handler)
ScriptEvent.off('myAddon:event', handler)
```

内部通过 `EventEmitter` + `system.afterEvents.scriptEventReceive` 实现。

---

## 5. 输入系统 (`input/`)

### 5.1 PlayerInputComponent

```typescript
class PlayerInputComponent<Actor> extends BaseComponent<Actor> {
  // 按键状态管理
  inputKey(key: string, pressing: boolean): void
  getKeyState(key: string): IKeyState
  getKeyPressing(key: string): boolean
  getKeyPressTimes(key: string): number
  exhaust(key: string): void  // 重置按键次数

  // 轴输入
  inputAxis(key: string, value: AxisValue): void
  getAxis(key: string): AxisValue

  // 轴工具
  combineAxis(axis1, axis2): AxisValue
  splitAxis(axis, nDim1, nDim2?): [AxisValue, AxisValue]
}
```

**IKeyState**：`{ pressing: boolean, times: number, consume(): void }`

**AxisValue**：`number | [number, number] | [number, number, number]`

### 5.2 MinecraftPlayerInputComponent

extends `PlayerInputComponent<Entity>`。集成 Minecraft 玩家的按钮输入和摇杆轴：

- 通过 `world.afterEvents.playerButtonInput` 监听按钮事件
- 每 tick 通过 `player.inputInfo.getMovementVector()` 获取移动轴

---

## 6. 动作系统 (`action/`)

| 导出 | 说明 |
|------|------|
| `ActionValueType` | 枚举：`BOOL(0)`, `VEC(1)`, `VEC2(2)`, `VEC3(3)` |
| `IActionModifier<E, V>` | 变换函数：`(type: E, value: V) => V` |
| `IActionTrigger` | 触发判定：`(type, value, ticks) => boolean` |
| `IAction<E>` | 组合：`valueType + modifiers[] + triggers[]` |
| `ActionTriggers` | 工厂：`pressed()`, `released()`, `hold(act, hold)`, `holdThenRelease(act)` |
| `ActionModifiers` | 工厂：`negate(mask)`, `scale(scalar)` |

---

## 7. 事件系统 (`events/`)

### EventEmitter

自定义实现，使用**双向链表**实现 O(1) 的添加/移除：

| 方法 | 说明 |
|------|------|
| `on(type, handler)` | 订阅事件 |
| `once(type, handler)` | 一次性订阅 |
| `prependListener(type, handler)` | 插到监听器列表头部 |
| `prependOnceListener(type, handler)` | 一次性插到头部 |
| `off(type, handler)` / `removeListener(type, handler)` | 取消订阅 |
| `removeAllListeners(type)` | 移除所有 |
| `emit(type, ...args)` | 触发事件（使用 bind thisArg） |
| `emitNone(type, ...args)` | 触发事件（不使用 thisArg） |
| `listenerCount(type)` | 监听器数量 |
| `listeners(type)` / `rawListeners(type)` | 获取监听器列表 |
| `eventNames()` | 获取所有事件名 |
| `setMaxListeners(n)` | 设置最大监听器数 |

特点：
- 双向链表实现，O(1) add/remove
- 支持 `captureRejections`（捕获 Promise 返回的 handler 的 rejection）
- emit 过程中的错误会被捕获并重定向到 `'error'` 事件

---

## 8. 数学库 (`math/`)

### Vec3 / Vec4 / Matrix

向量和矩阵继承自 `ArrayEx`（extends `Array`）：

**Vec3**：`fromXYZ()`、`normalize()`、`dot()`、`cross()`、`add()`、`sub()`、`mul()`、`div()`

**Vec4**：同上 + `multiply(Matrix)`（矩阵乘法）

**Matrix**（4x4）：
- 静态：`identity()`、`translate()`、`perspective()`、`orthographic()`、`lookAt()`
- 实例：`setIdentity()`、`setTranslation()`、`setRotation()`、`setRotationX/Y/Z()`、`setScale()`、`transpose()`、`multiply()`

### SplineInterpolator

五点平滑样条插值（quincunx 算法）：

```typescript
const spline = SplineInterpolator.fromPoints(points, lambda)
spline.interpolate(x)       // 插值
spline.max(step)            // 找最大值
spline.min(step)            // 找最小值
spline.curve(nInterval)     // 获取曲线点集
```

---

## 9. HUD 系统 (`ui/`)

### HudComponent

```typescript
abstract class HudComponent<Actor, Hud> extends CustomComponent<Actor> {
  hud: Hud
  actor: Optional<Actor>

  abstract render(): Hud
  abstract draw(): void

  onTick(dt: number) {
    this.hud = this.render()
    this.draw()
  }
}
```

每 tick 调用 `render()` 生成 HUD 数据，然后调用 `draw()` 渲染。

### PlayerHudComponent

extends `HudComponent<Player, string>`。使用 `/title @s actionbar` 命令将字符串渲染到玩家动作栏。

---

## 10. 物理组件

### EasyKinematicsComponent

```typescript
class EasyKinematicsComponent extends CustomComponent<Entity> {
  mass = 1
  allowRotation = false
  simulated = false  // false=applyImpulse, true=tryTeleport
  force: Vec3
  angularVelocity: Vec3
}
```

每 tick 应用力和角速度。`simulated = false` 时使用 `applyImpulse`，`true` 时使用 `tryTeleport` + 牛顿运动学公式。

### EasyVehicleComponent

载具物理数据：

```typescript
class EasyVehicleComponent extends CustomComponent<Entity> {
  width = 2, height = 1.5, length = 4.5
  mass = 1500
  inertia: Vec3  // 由 _calcInertia() 自动计算（矩形棱柱公式）
}
```

---

## 11. Optional Monad (`optional.ts`)

```typescript
class Optional<T> {
  static none<T>(): Optional<T>           // 空值
  static some<T>(value?: T): Optional<T>  // 包装值

  unwrap(): T             // 取值，空则抛错
  isEmpty(): boolean      // 是否为 null/undefined
  orElse(other: T): T     // 空则返回默认值
  use<R>(fn, self?): R | Optional<R>  // monadic bind (flatMap)
}
```

`use()` 是 flatMap 操作：非空时调用 `fn(value)`，如果返回值是 Optional 则直接返回，否则用 `Optional.some()` 包装；空时返回 `Optional.none()`。

---

## 12. 类继承关系总图

```
Array (原生)
  └── ArrayEx
        ├── Vec3
        ├── Vec4
        └── Matrix

CustomComponent<Actor> (抽象)
  ├── BaseComponent<Actor>
  │     ├── PlayerInputComponent<Actor>
  │     │     └── MinecraftPlayerInputComponent
  │     ├── HudComponent<Actor, Hud> (抽象)
  │     │     └── PlayerHudComponent (抽象)
  │     └── RequireComponents() 生成的类
  ├── EasyKinematicsComponent
  └── EasyVehicleComponent

Level<T> (抽象)
  └── MinecraftLevel

Scheduler<Actor> (接口)
  └── MinecraftTickingScheduler

GameInstance<A> (接口)
  └── MinecraftGameInstance (抽象)

EventEmitter (独立)
Optional<T> (独立)
SplineInterpolator (独立)
KeyState (独立)
```

---

## 13. 包入口 (`index.ts`)

```typescript
// src/oc/index.ts  （共 10 条导出，与源码逐行对应）
export * from './core.js'            // Component 体系 + ComponentManager + lazyGet + RequireComponents
export * from './optional.js'        // Optional<T>
export * from './components/index.js'// 【新增】运行期自定义组件注册（路线 B）
export * from './input/base.js'      // PlayerInputComponent
export * from './arch.js'            // GameInstance, initialize
export * from './math/index.js'      // Vec3, Vec4, Matrix, Spline, MathExt
export * from './minecraft/index.js' // Minecraft 集成全部
export * from './persist/index.js'   // 【新增】分块持久化
export * from './ui/hud.js'          // HudComponent
export * from './builtin/index.js'   // 【新增】框架内建自定义组件（registerBuiltinComponents）
```

### 本轮新增的两个运行期模块（架构定位）

| 模块 | 目录 | 定位 | 一行用途 |
|------|------|------|---------|
| **分块持久化** | `src/oc/persist/` | 运行期（`@sapdon/runtime`），**会被打包进脚本包** | 把超过动态属性上限（约 32KB）的大 JSON **分块存取**，避免 `setDynamicProperty` 抛错被吞掉导致**静默丢存档** |
| **自定义组件注册** | `src/oc/components/` | 运行期（`@sapdon/runtime`），**会被打包进脚本包** | 在**运行期脚本**里声明自定义组件 id + handler，由框架保证在 `system.beforeEvents.startup` 时机注册（路线 B；handler 是普通闭包，可以 `import` 共享模块） |

> 📖 **这两个模块的 API 签名、参数与示例见[运行期 API 文档](../user/api/runtime.md)** —— 本节只说明「模块存在 + 属于哪一层 + 干什么」，API 细节不在此重复。

⚠️ 注意与**路线 A** 的分工：`BlockCustomComponentBuilder`（构建期声明，CLI 生成 `scripts/custom_components/*.js`，handler 靠 `toString()` 序列化）仍然兼容，但**同一个组件 id 不要同时用两条路线注册**（`src/oc/components/registry.ts:14-25`）。运行期注册必须在**脚本模块加载期**调用（顶层语句），启动完成后再注册会**抛错**（宁可炸也不静默）。
