# 快速上手（电力 + 流体 双系统 Demo）

示例自带两个系统，都是继承框架 `BaseEngine` 做出来的，可直接进游戏试。

## 0. 准备
```
cd examples/lr-addon-framework
npm install        # 装 @minecraft/server + sapdon lib
npm run build      # 构建到 dev/ 并同步游戏开发包
```
> 若改了框架核心后再 `npm i`，需重跑 `sapdon lib`（会把 @sapdon/* 重写掉手写拷贝的坑）。

## 1. 电力系统
### 方块
| 方块 | 作用 |
|---|---|
| `lrf:wire`（电线） | 连接单元；带电发光、断电暗灰、配合 `lrf:wire_item` 放置 |
| `lrf:coal_gen`（燃煤发电机） | 手持**煤炭右键**喂煤即发电 40/s；煤烧完自动停 |
| `lrf:solar`（太阳能板） | 白天日照发电 10/s，夜晚 0 |
| `lrf:furnace`（电力熔炉） | 持**可熔炼物右键**放料即成为 30/s 负荷；空炉不耗电 |
| `lrf:battery`（电池） | 储电 1000；发电富余充电、不足放电，断电时导线变暗 |

### 玩法
1. 放电线把设备串成一个**电网**。
2. 放发电机喂煤（或白天放太阳能）→ 通电：电线发光。
3. 放熔炉、右键放矿石 → 开始耗电（`fertility`），电池会补偿缺口，线路变暗表示欠电。
4. 断开某段（拆线/用 `lrf:valve`…不，电力用继电器可选）→ 无源半边导线立即变暗。

## 2. 流体系统
### 方块
| 方块 | 作用 |
|---|---|
| `lrf:pipe`（管道） | 连接单元，`lrf:pipe_item` 放置 |
| `lrf:pump`（泵） | **右键启/停**；开着就驱动水流 |
| `lrf:tank`（储水罐） | 存储液体（满 32 停止） |
| `lrf:valve`（阀门） | **右键开/合**；开=连通两侧管网，关=分隔 |

### 玩法
1. 放管道连成管网。
2. 放泵接通 → 有流向（管道被水填满的样式）。
3. 接罐吸水（每 20 tick 涨 1 格）；阀门可控制哪半管网被供水。

## 3. 调试命令
```
/lrf:log on      # 开启运行期日志（写 ContentLog，控制台可看）
/lrf:log off
```
ContentLog 路径：`<APPDATA>\Minecraft Bedrock\logs\ContentLog*.txt`（不可用项目 Grep，用 PowerShell Select-String 抓）。

## 4. 测试
```
npm test          # 电力+流体 L 层结算镜像，12 断言
```
测试镜像的是 `scripts/framework/core/{power,fluid}-settle.ts` 的纯逻辑，**改结算必须先同步测试副本**再跑绿。

## 5. 下一步
想加第三个系统？看 `doc/tutorial-third-system.md` 的逐步教程。