# digitCircuit — 设计文档

Minecraft 基岩版逻辑电路 Addon（示例项目，基于 sapdon 框架）。
实现导线连接、布尔信号瞬时传播、逻辑门（AND/OR/NOT）、信号源、开关、显示灯，以及可视化调试工具。

---

## 1. 项目概述

- 目标：在游戏中搭建可即时响应的数字逻辑电路（类似红石，但按"导线瞬时传播、理想无损耗"建模）。
- 脚本运行时：`@minecraft/server`（2.6.0 时代）。
- 实现语言：JS（`build.config` 中 `useJs`）。
- 入口脚本：`scripts/index.js`（事件绑定 + 调试工具），逻辑核心 `scripts/circuit.js`。
- 方块注册：`main.mjs`（sapdon 声明式 API），导线几何由 `lib/wire.js` 生成。

## 2. 目录结构

```
examples/digitCircuit/
├── build.config            # 构建配置（dev 模式、useJs）
├── main.mjs                # 方块/物品声明与注册
├── lib/wire.js             # 导线方块（6 面 wire_connect 状态 + 几何）
├── scripts/
│   ├── circuit.js          # 逻辑核心：节点表、连接、传播、调试快照
│   └── index.js            # 事件订阅 + sapdon:debug_tool 物品
├── digit/                  # 贴图源文件（含转换后的 t0/t1/s0/s1）
├── res/textures/blocks/    # 构建所需的方块贴图
├── dev/                    # 构建产物（BP / RP），会被同步到游戏 dev 包
└── DESIGN.md               # 本文档
```

## 3. 方块与物品定义

### 3.1 信号源

| 方块 | powered 值 | 贴图 |
|---|---|---|
| `sapdon:on_signal` | 恒 1 | `on` |
| `sapdon:off_signal` | 恒 0 | `off` |

`computePowered` 直接返回固定值，不参与依赖运算。

### 3.2 导线 `sapdon:wire`

- 无 `sapdon:powered` 状态，信号由脚本中的节点 `powered` 字段承载（方块本身仅负责渲染连接形态）。
- 6 个状态：`wire_connect:{north|south|east|west|up|down}` ∈ {0,1}，由 `lib/wire.js` 注册。
- 几何：`geometry.wire` + `bone_visibility`，状态为 1 的面显示对应连接臂，0 隐藏。
- 理想导线：瞬时传播、无损耗、可分叉。

### 3.3 逻辑门

| 方块 | 类型 | 纹理数组（创建参数） |
|---|---|---|
| `sapdon:and_gate` | 与门 | `["and","default","output","input","input","input"]` |
| `sapdon:or_gate` | 或门 | `["or","default","output","input","input","input"]` |
| `sapdon:not_gate` | 非门 | `["not","default","output","input","default","default"]` |

- 可旋转：`minecraft:cardinal_direction` ∈ {north, south, east, west}。
- 纹理数组顺序约定：`[上, 下, 东, 西, 南, 北]`（yaw=0 时，模型东面为输出）。

### 3.4 显示灯 `sapdon:display`

- 状态：`sapdon:powered` ∈ {0,1}。
- permutation：`powered==0` → 贴图 `t0`；`powered==1` → 贴图 `t1`。
- 输入：任意相邻面连接导线的信号做 OR（任一为 1 则亮）。

### 3.5 开关 `sapdon:switch`

- 状态：`sapdon:powered` ∈ {0,1}。
- permutation：`powered==0` → 贴图 `s0`；`powered==1` → 贴图 `s1`。
- 由调试工具切换（详见 §7）。

### 3.6 调试工具 `sapdon:debug_tool`

- 物品（木棍模型），`sapdon:debug_tool` 自定义组件（`itemComponentRegistry`，在 `system.beforeEvents.startup` 注册）。
- 功能：切换开关、切换导线连接、打印调试信息。

## 4. 节点表（虚拟电路模型）

脚本不依赖方块实体逐 tick 计算，而是在内存中维护一张电路节点表：

```
Map< "dimension:x,y,z" , Node >
```

`Node` 字段：

| 字段 | 含义 |
|---|---|
| `key` | 唯一键 `dim:x,y,z` |
| `dim` / `loc` | 维度与坐标 |
| `type` | 方块类型 id |
| `powered` | 当前布尔信号（0/1） |
| `conn` | 仅导线：`{ face: 邻居节点key }` 映射 |
| `facing` | 仅门：`minecraft:cardinal_direction` |

注册规则（`registerNode`）：
- 初始 `powered`：
  - `switch` / `display`：从方块状态 `sapdon:powered` 读取（保证与真实方块同步）。
  - 其余：0（传播阶段会重新计算）。
- 门：读朝向并存 `facing`。
- 导线：读 6 面 `wire_connect` 状态，经 `syncWireConn` 解析为邻居 key（仅当邻居是电路方块）。

## 5. 连接机制

### 5.1 放置

- `playerPlaceBlock` 事件：
  - 若放置的是导线 → `recomputeWire`：遍历 6 面，邻居为电路方块则置 `wire_connect:<面>=1`，否则 0。
  - 相邻导线 → `recomputeAdjacentWires`：6 面邻居若是导线则重算。
  - `rebuildAround`：BFS 重建节点表并传播。

### 5.2 破坏

- `playerBreakBlock` 事件（注意：`world.afterEvents.blockBreak` 在 2.6.0 不存在）：
  - 用 `event.brokenBlockPermutation.type.id` 判断原方块是否为电路方块（after 事件时方块已变空气）。
  - `unregisterNode` 删除节点，重算相邻导线，对其余电路邻居 `rebuildAround`。

### 5.3 手动干预

- 右键任意电路方块触发 `playerInteractWithBlock` → `rebuildAround`。
- 这是对「脚本没有 `blockLoad` 事件」的替代刷新手段；进入世界后虚拟表会被 `worldLoad` 清空，需右键任一电路方块重建。

## 6. 逻辑传播（propagate）

`rebuildAround` / 开关切换 / 放置破坏后都会调用 `propagate()`。

### 6.1 不动点迭代

- 循环遍历全部节点，用 `computePowered` 重算，若与 `node.powered` 不同则更新并标记。
- 直至一轮无变化或达到上限 **20 轮**（上限用于防环/容错，正常电路远小于此）。
- 所有节点同步更新（同轮内都基于上一轮的值），避免依赖顺序导致的不稳定。

### 6.2 取值规则（computePowered）

- `on_signal` → 1；`off_signal` → 0；`switch` → `node.powered`（已由切换写入）。
- `display` → 遍历 6 面，取「相邻导线且导线反向连接该节点」的信号 OR。
- `wire` → 遍历 `conn`，若邻居是导线/信号源取其值；若邻居是门且该面等于门的输出面（`gateOutputFace`），取门值。全部 OR。
- `and_gate` → 三个输入面全 1 → 1。
- `or_gate` → 任一输入面为 1 → 1。
- `not_gate` → 输入面取反（无输入视为 0 → 输出 1）。

### 6.3 门朝向与输入输出面

门可旋转，其输出/输入面由 `facing`（`minecraft:cardinal_direction`）换算：

| facing | 输出面 `gateOutputFace` | NOT 输入面 `notInputFace` | AND/OR 输入面 |
|---|---|---|---|
| north | east | west | 西/南/北（除东） |
| west  | north | south | 北/东/南（除北） |
| south | west  | east  | 西/北/东（除西） |
| east  | south | north | 南/西/北（除南） |

> 该映射已对照贴图纹理验证：`facing=west` 时输出朝北，与模型一致。

### 6.4 写回方块（applyChanges）

分两阶段：

1. **changed 集合**：仅对传播中值发生变化的节点写回方块状态，并对导线/门播粒子
   （1→火焰 `minecraft:basic_flame_particle`，0→气泡 `minecraft:basic_bubble_particle`）。
2. **全量对账**：遍历所有节点，凡方块存在 `sapdon:powered` 状态且方块值 ≠ 节点值，一律 `setPermutation` 写回。

> 全量对账用于自愈失同步：例如节点已被重置为 0 但方块仍残留 1（display 卡亮）的场景，可强制纠正。
> 未加载区块 `getBlock` 返回 null 时跳过；方块类型不匹配（已被替换）时跳过。

### 6.5 粒子刷新

`system.runInterval(10)`：每 10 tick 对 `powered==1` 的导线/门重新刷一次火焰，避免粒子消失后无指示。

## 7. 调试系统

- `DEBUG = true`（`scripts/circuit.js`），开启后每次 `propagate` 在聊天输出 `[circuit]` 快照：

```
[circuit] ========== propagate (N nodes) ==========
[circuit] or_gate@(x,y,z) facing=west out=north in[South:wire=1 ...] => 1
[circuit] display@(x,y,z) <- [North:1] => 1
[circuit] wire@(x,y,z) conn[North:key East:key] = 1
[circuit] switch@(x,y,z) = 1
```

- 门行的每个输入显示 `面:类型=信号(unconn)`，`(unconn)` 表示未与节点正确互连。
- `debug_tool` 打印 `[debug]` 信息：
  - 对开关：切换 `sapdon:powered` 0/1，并显式写节点 `node.powered`（不依赖 `block.permutation` 读回时序）。
  - 对导线：切换 `wire_connect:<面>`，目标必须是电路方块。

## 8. 构建与部署

- 构建：在 `examples/digitCircuit` 下 `npm run build`（sapdon dev 模式，输出到 `dev/`）。
- 部署：删除旧包后拷贝到游戏 dev 包：

```
development_behavior_packs/digitCircuit_BP
development_resource_packs/digitCircuit_RP
```

位于 `%LOCALAPPDATA%\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\`。

## 9. API 约束与注意事项

- 2.6.0 **没有** `blockLoad` 事件：进入世界后表被清空，需右键电路方块触发重建。
- 2.6.0 **没有** `world.afterEvents.blockBreak`：用 `playerBreakBlock`，且用 `brokenBlockPermutation` 取原方块类型。
- `block.permutation` 读取时面名称需为小写：`oppositeFace`/`getAdjacent` 已做小写归一化（历史 bug：只认大写导致恒返 `up`）。
- 写方块状态用 `block.permutation.withState(...)` 再 `setPermutation`。
- 自定义组件注册须放在 `system.beforeEvents.startup`。
- 贴图文件必须是真实 PNG（曾有 `.png.jpg` 伪 PNG 导致加载失败，已转 16×16 真 PNG）。

## 10. 已知问题与后续计划

- [ ] 粒子对已通电节点持续刷新，但关闭瞬间的气泡仅在变化时播一次，缺少持续熄灭指示。
- [ ] 跨区块加载依赖手动刷新（无 blockLoad），后续可考虑监听区块加载或改为 tick 轮询。
- [ ] 门输入目前只认「直接相邻的导线」；不支持的中间方块（如直接对门）会被忽略。
- [ ] 可选扩展：更多门类型（XOR/X/延迟）、线缆粗细区分、开关实装为可点击方块。
