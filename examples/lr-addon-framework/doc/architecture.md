# lr-addon-framework 架构

本框架把 sapdon 三个生态示例（`digitCircuit` 数电 / `fluid_pipe` 流体 / `power_grid` 电力）里
**重复出现的"连接块系统"骨架**收敛成一个可继承基类 `BaseEngine`。你写一个新的"连接-源-功能-消费-储量"
系统（管网、电网、传力带、信号总线…）时，只需：

1. 写一个纯逻辑结算函数（L 层）；
2. 继承 `BaseEngine` 实现约 10 个成员（R 层）；
3. 声明方块/物品；
4. 写结算的镜像测试。

---

## 1. 两层划分

```
┌─────────────────────────────────────────────────────────────────┐
│  L 层（src/core/*，纯逻辑，禁止 import @minecraft/server）          │
│    graph.ts        段/端点/洪水填充 floodSegment                   │
│    network.ts      并查集 buildGrids：共享设备 → Grid 归并          │
│    power-settle.ts 电力结算（纯函数）                             │
│    fluid-settle.ts 流体结算（纯函数）                             │
│    → 只读写 Segment 与设备状态，返回 seg.powered 等			      │
├─────────────────────────────────────────────────────────────────┤
│  R 层（src/engine/*，可继承基类 + 世界工具）                        │
│    BaseEngine.ts  ★ 生命周期：建段/重建/持久化/心跳/加载恢复          │
│    world.ts / log.ts  方块 key 工具 + 日志                        │
│  concrete：systems/*/engine.ts  继承 BaseEngine 实现契约           │
└─────────────────────────────────────────────────────────────────┘
```

**铁律**：L 只算，R 只读世界/改写方块状态；L 零 MC 依赖 → 可在 Node 镜像测试。

## 2. BaseEngine 契约（继承点）

| 成员 | 类型 | 说明 |
|---|---|---|
| `connectorTypeId` | getter | 连接块（电线/管道）typeId |
| `graph` | getter: FloodGraph | 读取世界的洪水图：`isConnector/neighborKey/describeEnd` |
| `isDeviceTypeId(typeId)` | 方法 | typeId 是否本系统设备 |
| `connectState(face)` | 方法 | 连接块"手臂"方块状态 id |
| `registerDevice(block)` | 方法 | 设备放进本系统内存表 |
| `destroyDevice(key)` | 方法 | 从内存表移除设备 |
| `tickSettle(deviceSegs)` | 方法 | ★结算(L)→写 `seg.powered` + 渲染(R) |
| `isActiveIn()` | 方法 | 心跳是否继续（有活才跑，空闲停） |
| `encode() / decode(data)` | 方法 | 小状态序列化/还原 |

基类已替你实现（无需管）：段表 `segments`、连接块索引 `connectorSeg`、`pending`(加载待重建)、
`stale`(失效重建)、`rebuildAround/Pending/Stale`、`writeConnectors`(手臂写回)、
`buildDeviceSegs`(device→相邻段)、`ensureHeartbeat`(按需心跳)、`save/load`(分块持久化)、
`bindWorldLifecycle`(worldLoad 恢复)。

### tickSettle 的标准模板
```ts
tickSettle(deviceSegs) {
  const myValue = this.computeMyValue();                 // 系统自身输入（如日照/时间）
  settleMyCore({                                         // 系统自己的纯结算
    ...deviceStateMaps, deviceSegs, dt,                  // dt = tickInterval/20
    segPowered: (sid, p) => { const s = this.segments.get(sid); if (s) s.powered = p; },
  });
  this.renderMyBlocks(deviceSegs);                       // R：写方块状态
}
```

## 3. 结算与并网（L 层两个工具）

- **floodSegment(anchor, graph, segId)**：从连接块正交相邻洪水成一个段，非连接邻居收为端点 `SegEnd{kind, deviceKey}`。
- **buildGrids({deviceSegs, shouldCouple})**：把"共享同一设备且 shouldCouple(device)"的段并成一个网格。
  电力用它（继电器可控），流体用它（开启阀门连通）——同一套并查集。

## 4. 持久化策略

- **连接块位置**：存进 `pending`（小），加载后 `rebuildPending` 按区块渐进重建连接图（每 tick 一批）。
- **设备小状态**：各系统 `encode/decode`（电力存 发电机燃烧/电池电量/熔炉有无料/太阳能位置；流体存 泵开/罐液位/阀门）。
- 手臂/朝向 = 方块状态，世界自动持久化，不入库。
- 写动态属性**不吞异常**；无档也置 `loaded=true`，否则新档永远不落盘（sapdon 踩过的坑，这里已规避）。

## 5. 心跳（事件驱动）

`ensureHeartbeat()` 只在没人跑时 `system.runInterval`。每拍 `tick()` 后 if `!isActiveIn()` → 停。
所以**全静止世界零 tick**；一有活动（放置/破坏/喂料/开关）就唤醒。空闲定义在 `isActiveIn()` 说白了。

## 6. 目录
```
src/core/      L 层纯逻辑 + 两个系统的结算
src/engine/    BaseEngine + 世界工具
systems/{power,fluid}/  两个继承 BaseEngine 的引擎
scripts/index.ts        双引擎启动 + 事件/交互分发
main.ts                 声明式方块/物品（构建时）
test/*.test.mjs         两个系统 L 结算镜像测试
doc/                    本目录（教程）
```