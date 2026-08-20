# power_grid — Agent 指令

Minecraft 基岩版电力电网 Addon（sapdon 框架 TS 项目，`@minecraft/server` 2.6.0）。
本项目的**架构定位**是三个 L/R 分离示例之一（另两个：`digitCircuit` 数电、`fluid_pipe` 流体），统一范式见仓库 `doc/dev/lr-paradigm.md`——电力系统的五元组：**连接 C₁=电线、源 S=发电机+太阳能、功能 F=继电器、消费 Cc=电力熔炉、储量 R=电池**。

## 关键路径
- **方块/物品声明**: `main.ts`（sapdon 声明式 API，构建时由 CLI dev server 执行生成 dev/ JSON）
- **纯逻辑核心（L 层）**: `scripts/core/` — 无 `@minecraft/server` 依赖（`graph.ts` 段/洪水分段、`settle.ts` 电网归并+供/需/电池结算），门面 `scripts/powerCore.ts` re-export
- **MC 引擎（R 层）**: `scripts/engine/` — 方块读取（`world.ts`）、洪水分段图（`graph.ts`）、结构重建（`rebuild.ts`）、渲染（`render.ts`）、分块持久化（`persist.ts`）、主循环（`tick.ts`）、诊断（`diag.ts`）；门面 `scripts/power.ts` re-export
- **事件/工具/命令/喂煤/放料**: `scripts/index.ts`
- **资源**: `res/`（贴图在 `textures/`）
- **测试**: `test/power.test.mjs`

## 常用命令
- `npm run build` — 构建（输出 dev/ 并同步游戏开发包）
- `node --test test/power.test.mjs` — L 层核心结算测试（10 断言）
- `sapdon lib` — 重新写入 node_modules/@sapdon/*

## 开发原则
1. **只改 src 侧文件**（scripts/、main.ts、lib/、res/），不要手改 dev/ 产物。
2. **scripts/core/ 与 test/power.test.mjs 必须同步**：改核心逻辑先改 core/（graph/settle），再同步测试镜像副本并跑测试。
3. **写动态属性不可吞异常**：`savePower` 的 catch 必须 console.warn（吞掉 = 重进世界静默丢存档）。
4. 改方块状态/几何后构建，打开 dev/ 产物核对关键字段（states、permutation——后声明的 permutation 胜出）。

## 架构要点（L/R 分离）
- **L 层**（纯逻辑、可 Node 测试）：`graph.floodSegment` 建段；`settle.settle` 用 union-find 把共享设备的段并成 Grid，再网格级供/需/电池结算，写 `seg.powered`。
- **R 层**：事件重建段、按区块渐进重建连接图、把 L 层结果写进方块状态、只存小状态。
- **并网规则**：gen/solar/furnace/battery 无条件连通两侧线段；`relay` 仅 `open` 时连通（关断=分隔）。
- **设备交互**（记忆槽，不用块容器）：手持煤炭右键发电机=喂煤；手持可熔炼物右键熔炉=放料（产物喷出物品实体）。

## 经验与坑
- **ContentLog 是唯一可靠运行时诊断**：用 `console.warn` 写日志（`<APPDATA>\Minecraft Bedrock\logs\ContentLog*.txt`，此路径文件不可用 Grep 搜索，用 PowerShell Select-String 抓）；游戏内 `power_grid:power_log on` 开启 `[rt]` 行。
- **方块状态最多 16 个有效值**：整数范围状态 max-min ≤ 15（`power_grid:level` 用 0..15 共 16 值）。
- **全有/全无电网**：电网级结算 = 同网所有线段同带电；若要"传电消耗/距离损耗"参考 fluid_pipe 的势模型改造 `settle.ts`。
- **继电器是可控桥**：`power_grid:on`（用户通断）+ `power_grid:powered`（带电发光）两个状态共存，勿混。

## 贴图工作流（铁律：原创/复用，不外购）
- 当前设备贴图为**原创**：`tools/power_textures.ps1` 程序化绘制（16×16 MC 风格：`New-NoiseCanvas` 噪声机身 + 代码画形状），每设备独立配色。改块纹理后执行它，再 `npm run build`。
- 要手绘更精致的风格化贴图前，**必须先通过 `../fluid_pipe/tools/exam.ps1` 贴图考试（7 题全部 ≥90）**，再复制 `../fluid_pipe/tools/*` 绘制链（`draw_textures.ps1`/`make_noise_texture.ps1`）用 `view_texture.ps1` 校验，风格遵循 `../fluid_pipe/tools/MC_PIXEL_GUIDE.md`（方块面无描边噪声 / 图标描边左上光 / 原版色板）。