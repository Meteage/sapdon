# digitCircuit — 技术实现文档

Minecraft 基岩版逻辑电路 Addon（基于 sapdon 框架的示例项目）。
实现导线连接、布尔信号的瞬时传播、逻辑门（AND/OR/NOT）、信号源、开关、显示灯，以及可视化调试工具。

> 本文档描述的是**当前代码实现**（与旧版"节点/conn"设计方案不同，已改为"组件 + 导线网络"模型，且支持世界动态属性持久化）。

---

## 1. 项目概述

- 目标：搭建可即时响应的数字电路（信号瞬时传播、理想无损耗、可分支 —— 与红石的逐格中继不同）。
- 脚本 API：`@minecraft/server`（2.6.0 时代）。
- 实现语言：JS（`build.config` 里 `useJs`）。
- 入口脚本：`scripts/index.js`（事件绑定 + 调试工具），逻辑核心在 `scripts/circuit.js`。
- 方块注册：`main.mjs`（sapdon 声明式 API）；导线几何/状态由 `lib/wire.js` 生成。

## 2. 目录结构

```
examples/digitCircuit/
├── build.config            # 构建配置（dev 模式、useJs）
├── main.mjs                # 方块/物品声明与注册
├── lib/wire.js             # 导线方块（6 面 wire_connect 状态 + 几何 + 判定箱）
├── scripts/
│   ├── circuit.js          # 逻辑核心：组件/网络模型、传播、粒子、持久化
│   └── index.js            # 事件订阅 + sapdon:debug_tool 物品
├── digit/                  # 贴图源文件
├── res/textures/blocks/    # 构建所需的方块贴图
├── dev/                    # 构建产物（BP / RP），同步到游戏 dev 包
└── DESIGN.md               # 本文档
```

## 3. 方块与物品定义（main.mjs）

### 3.1 信号源
| 方块 | powered | 贴图 |
|---|---|---|
| `sapdon:on_signal` | 恒 1 | `on` |
| `sapdon:off_signal` | 恒 0 | `off` |

带 tag `signal_source`。`computePowered` 直接返回固定值，不参与依赖运算。

### 3.2 导线 `sapdon:wire`（lib/wire.js）
- 无 `sapdon:powered` 状态；信号由脚本里的网络模型承载，方块状态只负责渲染连接形态。
- 6 个布尔状态 `wire_connect:{north|south|east|west|up|down}` ∈ {0,1}，用 `registerState` 声明。
- 几何：`geometry.wire` + `bone_visibility`，状态为 1 的面显示对应连接臂，0 隐藏。
- 选择箱/碰撞箱：`setSelectionBoxCustom([-2,6,-2],[4,4,4])` 与 `setCollisionBoxCustom([-2,6,-2],[4,4,4])`（4×4 居中，便于点触）。

### 3.3 逻辑门
| 方块 | 类型 | 纹理数组（创建参数） |
|---|---|---|
| `sapdon:and_gate` | 与门 | `["and","default","output","input","input","input"]` |
| `sapdon:or_gate` | 或门 | `["or","default","output","input","input","input"]` |
| `sapdon:not_gate` | 非门 | `["not","display","output","input","default","default"]` |

- `createRotatableBlock` → 可旋转状态 `minecraft:cardinal_direction` ∈ {north,south,east,west}。
- 纹理数组顺序约定：`[上,下,东,西,南,北]`（yaw=0 时模型东面为输出）。

### 3.4 显示灯 `sapdon:display`
- 状态 `sapdon:powered` ∈ {0,1}；`0`→贴图 `t0`，`1`→`t1`（`addPermutation`）。
- 输入：任意相邻面上来自网络/直连的信号做 OR（任一为 1 即亮）。

### 3.5 开关 `sapdon:switch`
- 状态 `sapdon:powered` ∈ {0,1}；`0`→`s0`，`1`→`s1`。
- 由调试工具点击切换。

### 3.6 调试工具 `sapdon:debug_tool`
- 木棍物品，自定义组件 `sapdon:debug_tool`（`itemComponentRegistry`，在 `system.beforeEvents.startup` 注册）。

### 3.7 位宽器件
| 方块 | 类型 | 纹理数组（创建参数） |
|---|---|---|
| `sapdon:splitter` | 分线器 | `["splitter","default","output","input","default","output"]` |
| `sapdon:merger` | 合并器 | `["merger","default","default","default","default","default"]` |

- 同为 `createRotatableBlock`（`minecraft:cardinal_direction`）。
- `splitterFaces(facing)`：西=输入(N)，东=直通输出(N-1)，北=分出输出(1)。
- `mergeFaces(facing)`：西=N 输入，南=+1 输入，东=N+1 输出。
- 功能：切换开关、逐面切换导线连接、打印 `[debug]` 信息。

### 3.8 可编程芯片 `sapdon:chip`
- `createRotatableBlock`；状态 `sapdon:loaded` ∈ {0,1}：未加载→`["chip-unload","default","default","default","input","output"]`；已加载→`["chip","default","default","default","input","output"]`（仅顶面在两种贴图间切换，其余面均 北=output、南=输入）。
- `chipFaces(facing)`：输出=`facing`，输入=`oppositeFace(facing)`。
- 「电路存储芯片」物品（`sapdon:logic_tool`，带 `uuid:` lore）对 chip 右键 → `bindChipLogic` 把该逻辑绑定到 chip、方块置 `sapdon:loaded=1` 并消耗物品一个。
- 潜行（shift）右键已加载 chip → `unbindChipLogic` 取回逻辑物品（`sapdon:logic_tool`×1，带原 uuid/name lore），方块恢复未加载贴图。
- 芯片运行时：南面输入数值 → 查逻辑真值表（`inputs` 数位）→ 北面输出 `outMask`；未绑定逻辑时输出全 0。

## 4. 虚拟电路模型（脚本内存）

脚本不依赖方块实体逐 tick 运算，而维护三张内存表（均在 `circuit.js`）：

- **components** ：`Map<key, Component>`，只存有状态的方块（信号源/开关/门/显示灯），**不含导线**。
  字段：`key`、`dim`、`loc`、`type`、`powered`、`facing`（仅门）、`netByFace`、`directByFace`。
- **nets** ：`Map<netId, { id, wires: Set<key>, terms: Set<{compKey,face}> }>`，导线以**连通块（Net）**表达连接。
  - `wires` ：按导通规则连成一片的导线位置集合。
  - `terms` ：该网络上挂接的「组件端子」，即导线某面朝向的组件及其所在面。
- **netLookup** ：`Map<wireKey, netId>` —— 导线 → 所属网络。

> 导线本身没有逻辑状态，只作为网络的成员参与连接与信号传输。组件才有 `powered`。

关键 key：`nodeKey(block)` 生成 `"dimension:x,y,z"`；`getBlockByKey(key)` 反查方块（可能返回 null）。

## 5. 导线连接与操作

### 5.1 共享边的语义
- 两相邻导线「导通」需**共享面两端都为 1**：`wiresConnected(a,face) = a.wire_connect:face && nb.wire_connect:oppositeFace(face)`。
- 因此一条连接由两端共同决定，切换必须**两端同步**（`setWireEdge` 同时改本导线与邻线反向手臂）。

### 5.2 放置（不自动连）
- 2.6.0 的 `playerPlaceBlock` **没有** `blockFace`，故用 `beforeEvents.playerInteractWithBlock`（拿 `block`+`blockFace`）在放置前记录进 `pendingPlace`。
- 放置导线时取 `rec.blockFace` 的反面作为连接面，仅当该面相邻确为被点击方块且可连（`isCircuit`）才连 → `connectWireOnPlacement`（内部走 `setWireEdge`）。**其余面默认不连。**

### 5.3 破坏
- `playerBreakBlock` 用 `event.brokenBlockPermutation.type.id` 取原类型；after 时方块已变空气。
- `unregisterComponent` 注销组件 → `disconnectNeighborWires` 收回邻线指向该位置的手臂（只断连，不自动延伸）→ 对其余电路邻居 `rebuildAround`。

### 5.4 调试工具逐面调整
- 点击导线某面：校验该面邻居是电路方块，`setWireEdge` 翻转共享边（两端一起）。
- 点击非导线电路方块：找到该面上导线，翻转导线朝向该面的手臂。

## 6. 网络维护（recomputeNetAround）

- `collectWireCluster`：从 anchor 向 6 邻 BFS 收集导线连通区（**不看导通状态）**，作为局部重分区范围。
- 把受影响网络从 `nets`/`netLookup` 摘除；对仍剩余导线的老网络重挂端子。
- 对集群中未挂网络的导线，用 `floodWireNet` 按导通规则洪水填充重建新 Net，并 `attachTermsForNet` 挂端子。
- 对受影响组件 `refreshComponentNetFaces`（重建 `netByFace`/`directByFace`）。

## 7. 信号求解

### 7.1 端的解（每个组件面）
- `directByFace[face]`：该面直接相邻的非导线电路方块 key，若无为 null。
- `netByFace[face]`：该面相邻导线（且导线反向手臂为 1）所属网络 id，若无为 null。
- `faceNetSignal(comp,face)`：直连邻件（且其输出朝该面）时用其 `powered`，否则用 `netSignal(netByFace)`。

### 7.2 导线网络信号（netSignal）
一个网络的信号 = 挂在其上所有**输出端子**的组件 `powered` 做 **OR**（任一输出为 1 则该网为 1）。

### 7.2b 导线网络数值（netValue）
每个 net 还携带数值 `net.value`（默认 0），由 `recomputeNetValues()` 固定点迭代求取：取挂在网络上所有输出端子的组件输出数值 `compValueFor(comp, face)` 的**最大值**（单驱动网络即该驱动值）。
- 门/信号源/开关/端口输出数值 = 1bit（`powered` 0/1）。
- 分线器：直通=`输入值 >> 1`（N-1 位）、分出=`输入值 & 1`（1 位）。
- 合并器：输出=`(西值 << 1) | 南值`（把 N 位与 +1 位拼接为 N+1 位新值）。
- `netSignal(netId)` 现在返回 `netValue`（>0 视为通电），布尔视角与旧逻辑兼容。

### 7.3 计算规则（computePowered）
- `on_signal`=1，`off_signal`=0，`switch`→`powered`（由切换写入）。
- `display`→遍历 6 面 `faceNetSignal` OR。
- `splitter`→读取输入面（`splitterFaces.input`）数值，有值（>0）则通电（直通/分出输出值由 `compValueFor` 计算）。
- `merger`→输出 = `(西值 << 1) | 南值`（连同位宽一起由 N 变 N+1）。
- `chip`→南面输入值查真值表得输出值，输出>0 则通电（输出数值由 `compValueFor` 计算）。
- `and_gate`→输入面（水平除输出面）全真 → 1。
- `or_gate`→输入面任一真 → 1。
- `not_gate`→输入面取反（无输入按 0 → 输出 1）。
- 任一基础门（and/or/not）的输入面**位宽 >1**（来自分线器直通 N-1 或合并器输出 N+1 等）时：输入按 0 处理，并把错误面记入 `errorFaces`，`propagate` 结束前在其所在导线播放心形粒子（`minecraft:heart_particle`）提示。

### 7.3b 位宽（N-bit 总线）模型
- 一根导线网络携带位宽数据 `net.width`（默认 1）；`faceNetWidth(comp,face)` 返回某面上的位宽（读 net / 直接相邻组件输出位宽）。
- 位宽来源：`on/off/switch/门/端口` 输出 1 位；分线器北分出=1、东直通=`max(0, 输入位宽-1)`；合并器东输出=西输入位宽+1；芯片北输出=其逻辑记录输出位数。
- `recomputeNetWidths()` 每帧固定点迭代求各 net 位宽（上限 nets+2 轮）。
- 分线器（`splitterFaces`）：西=输入(N)，东=直通(N-1)，北=分出(1)；合并器（`mergeFaces`）：西=N 输入，南=+1 输入，东=N+1 输出。

### 7.4 门朝向换算
| facing | 输出面 | NOT 输入面 | AND/OR 输入面 |
|---|---|---|---|
| north | east | west | 南/东/西（除北） |
| west  | north | south | 北/南/东（除西） |
| south | west  | east  | 北/东/西（除南） |
| east  | south | north | 北/南/西（除东） |

### 7.5 传播（propagate）
- 固定点迭代：每轮遍历全部组件用 `computePowered` 重算，值有变则记录到 `changed` 并继续；上限 **20 轮**（防环）。
- 迭代收敛后 `applyChanges(changed)`：
  1. 对变化组件：写回方块 `sapdon:powered`，并在**门**变化时播粒子（1→火焰，0→气泡）。
  2. 全量对账：遍历所有组件，凡方块有 `sapdon:powered` 状态且与模型值不一致，一律 `setPermutation` 写回（自愈失同步）。
- `DEBUG=true` 时每次传播在聊天打印 `[circuit]` 快照（组件值 + 各网络 wires/terms/信号）。

## 8. 粒子

- `particleLoc(x,y,z)`：方块中心 `+0.5`，并**整体上调 0.2**（`y+0.7`）。
- 原版 basic 粒子引用 `variable.direction`，调用 `spawnParticle` 时第三参传 `MolangVariableMap`，用 `setVector3("variable.direction",{0,1,0})` 注入，否则报 `unknown variable '.z'`。
- `applyChanges` 中：门状态变化播放火焰/气泡一次；持续通电的导线/门由 `system.runInterval(10)` 每 10 tick 重刷火焰，`getBlock` 拿不到（未加载）就跳过。

## 9. 持久化（世界动态属性）

方块 block_state 虽随存档保存，但脚本内存的 `components/nets/netLookup` 不会。为在重进世界后还原状态，直接把**已求解的内存模型**写进动态属性：

- `saveCircuit()`：把全部组件（含 `powered`/`facing`/`netByFace`/`directByFace`）与全部网络（`wires`/`terms`）以及 `netSeq` 序列化为 JSON，写入世界动态属性 `sapdos:circuit_data`（版本 `CIRCUIT_VER=2`）。
- `loadCircuit()`：读取并**原样重建**三张表 + 保留 `netSeq`。**不做任何重新推导、不 `getBlock`、不写方块状态、不调用 `propagate`** —— 纯逻辑不进，方块只是渲染载体。
- `index.js` 在 `worldLoad` 直接 `loadCircuit()`（不依赖区块加载，无需重试）。
- 每次放置/破坏/工具操作后都会 `saveCircuit()`。
- 注意：单个动态属性 key 的 JSON 长度有限，超大电路可考虑按方块拆分 key。

## 10. 事件接入点（scripts/index.js）

| 事件 | 动作 |
|---|---|
| `beforeEvents.playerInteractWithBlock` | 拿导线点击时记录目标面（供放置连接） |
| `afterEvents.playerPlaceBlock` | 按点击面连导线 + `rebuildAround` + `saveCircuit` |
| `afterEvents.playerBreakBlock` | 注销 + 断邻线 + 邻居 `rebuildAround` + `saveCircuit` |
| `afterEvents.playerInteractWithBlock` | 对电路方块 `rebuildAround`（作为无 blockLoad 的手动刷新） |
| `afterEvents.worldLoad` | `loadCircuit()` 还原内存模型 |
| 工具 `sapdon:debug_tool.onUseOn` | 切换开关/导线，然后 `propagate` + `saveCircuit` |

## 11. 构建与部署

- 构建：在 `examples/digitCircuit` 下 `npm run build`（sapdon dev 模式，输出到 `dev/`）。
- 部署：删除旧包后拷贝到游戏 dev 包：

```
development_behavior_packs/digitCircuit_BP
development_resource_packs/digitCircuit_RP
```

位于 `%LOCALAPPDATA%\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\`。

## 12. API 约束与注意事项

- 2.6.0 **没有** `blockLoad` 事件：首次进入用 `worldLoad` + 右键电路方块刷新。
- 2.6.0 **没有** `afterEvents.blockBreak`：用 `playerBreakBlock` + `brokenBlockPermutation`。
- 2.6.0 **没有** `PlayerPlaceBlockBeforeEvent`、after 放置事件**没有** `blockFace`：用 `beforeEvents.playerInteractWithBlock` 拿面。
- `block.permutation` / `getState` 的 state 名指定要一致；`Direction` 枚举首字母大写（`getAdjacent` 按大写，`oppositeFace` 返回小写，使用时注意归一化）。
- 自定义组件注册放在 `system.beforeEvents.startup`。
- 用"已求解模型 + 动态属性原样恢复"，不要把基于方块/`getBlock` 的推导放进加载重建（加载早期会取不到 → 逻辑错乱）。

## 13. 已知问题与后续计划

- [ ] 粒子对已通电节点持续刷新，但关闭瞬间的气泡只在变化时播一次，缺少持续熄灭指示。
- [ ] 跨区块/重载后的渲染依赖世界已载区块（`runInterval` 对未加载方块跳过）。
- [ ] 动态属性大电路受单 key 长度限制，超大场景需拆 key。
- [ ] 可选扩展：更多门类型（XOR/延迟）、线缆粗细区分、开关实装为可点击方块、真纯虚线连接可视化。