# lr-addon-framework — L/R 连接块系统框架

> 本项目位于 **`examples/lr-addon-framework`**（sapdon 仓库内），是 `digitCircuit`/`fluid_pipe`/`power_grid`
> 三个示例抽取出的可继承框架。范式背景见仓库根 `doc/dev/lr-paradigm.md`。

## 📚 文档索引
| 文档 | 内容 |
|---|---|
| `doc/architecture.md` | BaseEngine 契约、L/R 分层、持久化/心跳设计 |
| `doc/quickstart.md` | 电力 + 流体双系统 Demo 玩法与命令 |
| `doc/tutorial-third-system.md` | ★ 教程：继承 BaseEngine 做第三个系统（机械传动带，全代码） |

从 sapdon 的 `digitCircuit`(数电) / `fluid_pipe`(流体) / `power_grid`(电力) 三个示例中
**提取的通用骨架**：继承一个 `BaseEngine` 基类，即可快速实现"连接-源-功能-消费-储量"类系统。
本仓库本身就用它实现了 **电力系统** 与 **流体管道系统** 两个 Demo（`scripts/systems/power`、`scripts/systems/fluid`）。

> 范式说明见 sapdon 的 `doc/dev/lr-paradigm.md`。本框架是这条范式的可运行实现。

---

## 1. 目录

```
lr-addon-framework/
├── scripts/
│   ├── framework/                # 运行时框架（L/R 分离）
│   │   ├── core/                 #   L 层（纯逻辑，无 @minecraft/server）
│   │   │   ├── graph.ts          #     段(Segment)/端点(SegEnd)/洪水填充 floodSegment
│   │   │   ├── network.ts        #     并查集 buildGrids（共享设备把段并成网格）
│   │   │   ├── power-settle.ts   #     电力：供/需/电池 结算（纯函数）
│   │   │   └── fluid-settle.ts   #     流体：泵→罐 势/流动 结算（纯函数）
│   │   └── engine/
│   │       ├── world.ts          #     方块 key/邻块 工具
│   │       ├── log.ts            #     运行期日志
│   │       └── BaseEngine.ts     #     ★ 可继承基类（建段/重建/持久化/心跳/加载恢复）
│   ├── systems/
│   │   ├── power/engine.ts       #   电力系统引擎（继承 BaseEngine）
│   │   └── fluid/engine.ts       #   流体系统引擎（继承 BaseEngine）
│   └── index.ts                  #   双引擎启动 + 事件/交互分发
├── main.ts                       #   声明式方块/物品（构建时）
├── test/{power,fluid}.test.mjs  #   两系统 L 层结算镜像测试
└── (res/ 贴图复用自 sapdon 示例)
```

## 2. 核心思路：基类做生命周期，子系统做结算/渲染

`BaseEngine` 替你管好所有系统共有的部分：

| 能力 | 责任 |
|---|---|
| 段表 `segments` / 连接块索引 | 洪水填充、端点收集 |
| `rebuildAround/Pending/Stale` | 放置/破坏/加载 重建连接图 |
| `writeConnectors` | 把"6 邻是连接块或设备则该面臂=1"写回连接块状态 |
| `buildDeviceSegs` | deviceKey -> 相邻段[] |
| 按需心跳 `ensureHeartbeat` | 事件驱动、空闲自动停 tick |
| 小状态分块持久化 `save/load` | `encode/decode` 抽象、worldLoad 恢复 |

子系统只需实现（约 10 个成员）：

```ts
abstract class YourSystem extends BaseEngine {
  get connectorTypeId(): string      // 连接块（电线/管道）typeId
  get graph(): FloodGraph            // 读取世界的洪水图
  isDeviceTypeId(t): boolean
  connectState(face): string         // 连接臂方块状态
  registerDevice(block): void        // 设备入表
  destroyDevice(key): void
  tickSettle(deviceSegs): void       // ★ 结算(L)→写 seg.powered + 渲染(R)
  isActiveIn(): boolean              // 心跳是否继续
  encode()/decode()                  // 小状态序列化
}
```

### tickSettle 的标准写法（电力系统的例子）
```ts
tickSettle(deviceSegs) {
  this.sunlight = sunlight();                       // 系统自己的值
  settlePower({                                     // 系统自己的 L 结算（纯函数）
    gens, bats, relays, furnaceHasInput, solarKeys,
    deviceSegs, sunlight, dt,
    segPowered: (sid, p) => { const s=this.segments.get(sid); if(s) s.powered=p; },
  });
  this.render(deviceSegs);                          // 系统自己的 R 渲染（写方块状态）
}
```
结算逻辑是纯函数（`scripts/framework/core/*-settle.ts`），可被 Node 直接用镜像测试——这就是"L/R 分离可测"的来源。

## 3. 新增第三个系统的步骤（举"水车传动/机械网络"等例子）

1. `scripts/framework/core/<sys>-settle.ts`：写纯逻辑结算（源/功能/消费/储量）。
2. `scripts/systems/<sys>/engine.ts`：`class XEngine extends BaseEngine`，实现上面 10 个成员，
   `tickSettle` = `settleX(...)` + 你的渲染。
3. `main.ts`：声明该系统的连接块与设备块（可抄电力/流体的 `connectorBlock`/`deviceBlock` 助手）。
4. `scripts/index.ts`：`const x = new XEngine(logger)`，把 `x` 加进 `engines`，
   并在 `which()` 里分发给它。
5. `test/<sys>.test.mjs`：镜像 `settleX` 写断言。
6. `npm test` + `npm run build`。

## 4. 命令 & 测试

```
npm install          # 安装 @minecraft/server 并 sapdon lib
npm test             # 电力 + 流体 L 层结算镜像（12 断言）
npm run build        # 构建到 dev/ 并同步游戏开发包
```

游戏内：
- 造电线/管道并用 `lrf:wire_item`/`lrf:pipe_item` 放置；
- 电力：放 `lrf:coal_gen` 后持煤炭右键喂煤；熔炉放料；电池储电；切断电源线段变暗。
- 流体：放 `lrf:pump` 右键启停、`lrf:tank` 储水、`lrf:valve` 右键开合。
- `/lrf:log on` 开运行期日志（写 ContentLog）。

## 5. 说明与限制

- 本框架为**架构抽取演示**：块外观复用/简化贴图，熔炉熔炼、逐格势场、逐面碰撞箱等细节按需在子系统中扩展。
- 设备位置由放置事件注册并持久化（`encode`）；连接块位置由 `pending` 渐进重建。
- 遵循 sapdon 示例铁律：**不整删 `dev/`**、写动态属性不吞异常、ContentLog 诊断。
- 纯 L 层零 `@minecraft/server` 依赖，保证可 Node 镜像测试。