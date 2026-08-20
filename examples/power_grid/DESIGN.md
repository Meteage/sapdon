# power_grid 设计文档（v1）

Minecraft 基岩版电力电网 Addon（sapdon 框架 TS 项目）。
**逻辑层 L 与渲染层 R 分离**；电网基于"网格共享能量 + 电池缓冲"的稳压直觉：联网设备并成一个 Grid，供/需对账，富余充电、不足放电、仍缺断电。

---

## 1. 概述

电力系统是 sapdon 三个示例中第三个 L/R 分离项目，复用同一套范式骨架：

```
scripts/
├── core/                 # 逻辑层 L：纯逻辑，无 @minecraft/server 依赖
│   ├── graph.ts          #   段结构：电线沿正交相邻洪水连通，非电线邻居收为端点（floodSegment）
│   └── settle.ts         #   电网：共享设备的段并成 Grid（union-find）+ 供/需/电池结算
├── engine/               # 渲染层 R：MC 引擎（@minecraft/server）
│   ├── const.ts          #   方块/物品/状态名/持久化常量
│   ├── world.ts          #   key 编解码 / 邻块 / 类型判定
│   ├── state.ts          #   内存表：段/设备/失效集合 + 注册/喂煤/放料/继电器开关 + buildDeviceSegs
│   ├── graph.ts          #   FloodGraph 的 MC 实现（描述设备端点）
│   ├── rebuild.ts        #   结构重建 rebuildAround + 加载后渐进 rebuildPending + 失效 rebuildStale
│   ├── render.ts         #   线段带电/电量/燃烧/日照 写方块状态
│   ├── persist.ts        #   动态属性分块 save/load（只存小状态）
│   ├── tick.ts           #   主循环：每20tick 日照→结算→渲染→喂煤/熔炼→设备存活
│   └── diag.ts           #   段描述/全局转储
├── powerCore.ts / power.ts   # 门面 re-export（L / engine）
└── index.ts              # 事件/命令/万用表/喂煤/放料 入口
lib/wire.ts               # BlockWire：single cube + power_grid:powered 发光贴图 swap
test/power.test.mjs       # core/ 的 JS 镜像测试副本
```

## 2. 核心机制

### 2.1 段与电网（连接 C₁）
- **段**：电线沿正交相邻自动连通（如同流体管道），一次洪水得到一个段（`floodSegment`）。
- **电网 Grid**：共享同一设备的线段并成一个 Grid。union-find 归并：
  - 发电机/太阳能/电池/电炉：**无条件**把其相邻段并成一个 Grid（中间天然耦合，电气共享）；
  - 继电器（功能 F）：仅 `open` 时并，关断 = 屏障（分隔两侧）。
- 电网级结算，故"某处有电=同网全有电"。

### 2.2 能量结算（settle.ts，纯函数）
每 20t：
```
gen  = Σ 运行中发电机*40 + Σ 太阳能*10*sunlight
load = Σ 电炉*30
gen >= load  → 全 Grid 通电；电池充电 min(60, 盈余)（上限 1000）
gen <  load  → 电池放电补缺 min(缺口, 60, 余量)；仍缺 → 断电
```
- 发电机 `burnTicks` 由 L 层递减（>0 即发电）；R 层在耗尽后用存煤续燃（`COAL_BURN_SECONDS`/块）。
- 太阳能以 `sunlight` 因子缩放（白天 1 / 夜晚 0）。

### 2.3 设备（源 S / 消费 Cc / 储量 R / 功能 F）
| 设备 | 角色 | 交互 |
|---|---|---|
| 燃煤发电机 | 源（40/s） | 手持煤炭右键喂煤（`fuel` 计数） |
| 太阳能板 | 源（10/s 日间） | 无交互 |
| 电力熔炉 | 消费（30/s） | 手持可熔炼物右键放入原料（记忆槽）；通电 10s 熔炼 → 喷出产物 |
| 电池 | 储量（容量 1000） | 无交互；充/放由结算决定 |
| 继电器 | 功能（可控桥） | 万用表点按通/断 |

### 2.4 渲染（R 只读同步）
- 电线 `power_grid:powered` 1 → 发光贴图 `wire_on`。
- 电池 `power_grid:level` 0..15（`level==0` 显示空）。
- 发电机 `power_grid:burning` 1 → 发光贴图。
- 熔炉/继电器 `power_grid:powered` → 带电发光。
- 太阳能日照在运行时决定产出，无独立贴图状态。

### 2.5 持久化（只存小状态）
不存段图（图由事件重建 + 加载后 `rebuildPending` 渐进洪水重建，每 tick 64 个）。
只存：设备表（发电机 `burnTicks/fuel`、电池 `level`、电炉 `progress/input`）+ 电线位置。块状态（烧、发、on/off）由世界自动持久化。`loaded` 门闩防启动空表覆盖存档；写动态属性异常不吞。

## 3. 事件流
```
放置/破坏/继电器开关
    │ rebuildAround(重建段) + savePower()
    ▼
tick(每20t):
    rebuildPending → 日照 + 设备对账 → settle(并网+供/需/电池) → 写 seg.powered
    → 喂煤续燃 + 熔炼 → renderAll(写方块状态) → rebuildStale
```

## 4. 验证
- `test/power.test.mjs` 10 断言：发电机供能、盈余充电(封顶)、无源断电、电池补缺、电池不足断电、太阳能昼夜、两独立段互不干扰、继电器开合、发电机耗尽停机、多发电机累加。
- 构建后核对 `dev/power_grid_BP/blocks/*.json`（states/permutation）、`scripts/index.js`、`dev/power_grid_RP/textures/*`。

## 5. 调参位置
- 核心常量在 `scripts/core/settle.ts` 顶部（GEN/SOLAR/FURNACE_DRAW/BATTERY_MAX/CHARGE/DISCHARGE_RATE），**改后同步测试副本**。
- 熔炼时长/速率与电炉配方在 `scripts/engine/{const,tick}.ts`。
- 调后 `npm run build` 再跑 `node --test test/power.test.mjs`。