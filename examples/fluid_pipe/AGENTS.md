# fluid_pipe — Agent 指令

Minecraft 基岩版流体管道 Addon（sapdon 框架 TS 项目，`@minecraft/server` 2.6.0）。

## 关键路径
> **贴图工作链已抽为可复用模块 `D:\Projects\ai-vis`**（icon_ref 矢量参考 / view_texture 增强查看 -Edge/-Gray/-Diff / eval_icon 评估 / exam 考试 / draw_textures 通用库 / MC_PIXEL_GUIDE / AGENTS）。本项目的 tools/ 是其历史版本；画新贴图优先用 ai-vis，考试评分器本项目仍可用。
- **方块/物品声明**: `main.ts`（sapdon 声明式 API，构建时由 CLI dev server 执行生成 dev/ JSON）
- **纯逻辑核心（L 层）**: `scripts/core/` — 无 `@minecraft/server` 依赖（`graph.ts` 段/洪水分段、`potential.ts` 势传播场、`flow.ts` 流动结算与前沿），门面 `scripts/fluidCore.ts` re-export
- **MC 引擎（R 层）**: `scripts/engine/` — 方块读取（`world.ts`）、洪水分段图（`graph.ts`）、结构重建（`rebuild.ts`）、渲染（`render.ts`）、分块持久化（`persist.ts`）、主循环（`tick.ts`）、诊断（`diag.ts`）、内存模型与设备开关（`state.ts`）；门面 `scripts/fluid.ts` re-export
- **事件/工具/命令**: `scripts/index.ts`
- **资源**: `res/`（geo 在 `models/blocks/`，贴图在 `textures/`）
- **测试**: `test/fluid.test.mjs`

## 常用命令
- `npm run build` — 构建（输出 dev/ 并同步游戏开发包）
- `node --test test/fluid.test.mjs` — 引擎核心逻辑测试（20 断言）
- `powershell -ExecutionPolicy Bypass -File tools/make_water_texture.ps1` — 重新合成翻书贴图（改 glass/water 源图后执行）
- `powershell -ExecutionPolicy Bypass -File tools/view_texture.ps1 <png> [-Palette]` — 贴图 ASCII 查看器
- `powershell -ExecutionPolicy Bypass -File tools/draw_textures.ps1` — 重画设备像素贴图（泵/罐/阀门/扳手）
- `node tools/icon_ref.mjs <emoji|hex> [-s size] [-o out.png]` — 下载 emoji 矢量 SVG 并光栅化成 PNG（Twemoji 源，无依赖），再 `view_texture.ps1` 查看——**想知道物品长什么样就先用它取图标矢量参考**（例：`node tools/icon_ref.mjs 1f527 -s 64 -o E:/Temp/x.png` 看 🔧 剪影），用法见 MC_PIXEL_GUIDE.md §4b
- `powershell -ExecutionPolicy Bypass -File tools/make_noise_texture.ps1 -Out <png> -BaseColor "#966C4A" -Contrast 0.45 -Roughness 0.55 -Seed 3` — 按配方程序化生成原版质感噪声贴图（配方见 tools/MC_PIXEL_GUIDE.md）
- **画 MC 风格贴图前必读 `tools/MC_PIXEL_GUIDE.md`**：两套风格（方块面无描边噪声 / 图标带描边左上光）、原版实测色板、生成器参数配方、检查清单、PS 陷阱（含 [Math]::Min/Max int/double 截断坑）
- **用画图工具前必须先考试（exam/README.md，铁律）**：`tools/exam.ps1 -List/-Show <id>` 看题 → 作答到 `exam/answers/<id>.png` → `-Grade <id>` 六维评分（色相/饱和/对比/粗糙/台阶/形态），**7 题全部 ≥90 后才允许动项目贴图**；未合格对照评分明细与标准答案补考
- `sapdon lib` — 重新写入 node_modules/@sapdon/*

## 贴图查看与绘制工作流（Agent 无图像能力时的"眼睛"）

> **铁律：用任何画图工具（draw_textures / make_noise_texture）画新贴图之前，必须先通过贴图考试（≥90 分）。**
> 流程：读 `tools/MC_PIXEL_GUIDE.md` → `tools/exam.ps1 -List` 看题 → `-Show <id>` 读题 → 作答到 `exam/answers/<id>.png` → `-Grade <id>` 评分，**全部 7 题 ≥90 才算合格**，之后才允许动项目里的真实贴图。不合格就对照评分明细（色相/饱和/对比/粗糙/台阶/形态）和标准答案（`exam/answers/`）调整重考，不许跳过。补考重答前先 `view_texture.ps1 exam/answers/<id>.png -Palette` 分析标准答案的色板。

**查看器** `tools/view_texture.ps1`：把 PNG 渲染成 ASCII 网格，每个像素 2 字符 = 色相字母 + 亮度数字：
- 色相字母：`R`红 `O`橙 `Y`黄 `G`绿 `C`青 `B`蓝 `M`品红 `S`灰/银；半透明用小写字母；透明显示 `..`
- 亮度数字：`0-9`（V×9，0≈黑 9≈最亮）
- `-Palette` 参数：输出唯一色板（#RRGGBB + alpha + 像素数），分析用色时先跑它
- 例：`powershell -ExecutionPolicy Bypass -File tools/view_texture.ps1 res\textures\blocks\on.png`（16x16 贴图 16 行正好一屏；32x1024 翻书贴图太大，可先截帧或只看调色板）

**绘制器** `tools/draw_textures.ps1`：用"调色板 + 16 行 x 16 字符 ASCII 地图"生成像素贴图（`. `= 透明，其余字母查调色板）。脚本自带校验（行数/行长/未知键），错误会指明第几行。改贴图流程：
1. **（考试合格后）** `view_texture.ps1 <旧图> -Palette` 了解现状 → 2. 改地图/调色板 → 3. 跑 draw_textures.ps1 → 4. `view_texture.ps1` 查看结果迭代 → 5. `npm run build` 同步 dev。

**像素画要点**（画设备图标时参考）：
- 先定剪影（轮廓），再上色：深色描边（`a`）+ 中灰主体（`b`）+ 左上一列高光（`c`）+ 右下阴影（`d`）→ 金属质感三阶明暗
- 扳手/阀门类工具图标：C 形开口环头（缺口朝侧面，不是中间竖槽）+ 手柄渐细 + 明暗分列
- 物品图标与方块贴图共用：pumpitem/tankitem/valveitem/valve3item 是方块面的拷贝（draw_textures.ps1 自动同步），改方块贴图后物品图标自动一致

**PS 5.1 脚本铁律**：`.ps1` 无 BOM 时按 ANSI 解析 —— 注释必须纯 ASCII（中文注释会错乱导致 New-Object/位图操作静默失败）；`param()` 必须是脚本第一条语句（Add-Type 等要放它后面）；命令必须带 `workdir`（相对路径依赖 cwd）；字符串插值里 `$var:` 会被当驱动器引用，用 `${var}:` 或 `-f` 格式化。

## 开发原则
1. **只改 src 侧文件**（scripts/、main.ts、lib/、res/），不要手改 dev/ 产物。
2. **scripts/core/ 与 test/fluid.test.mjs 必须同步**：改核心逻辑先改 scripts/core/（graph/potential/flow），再同步测试镜像副本并跑测试。
3. **写动态属性不可吞异常**：`saveFluid` 的 catch 必须 console.warn（吞掉 = 重进世界静默丢存档）。
4. 改方块状态/几何后构建，打开 dev/ 产物核对关键字段（states、bone_visibility、permutation 顺序——后声明的 permutation 胜出）。

## 经验与坑
- **npm i 会剪掉手工写入的 @sapdon/* lib**：装完依赖必须重跑 `sapdon lib`。
- **manifest 只在首次构建生成**：改 build.config 依赖（如 server-ui 版本）后，先删 `dev/<proj>_BP/manifest.json` 再 build。
- **PS 5.1 脚本坑合集见上文"贴图查看与绘制工作流"**（ANSI 解析/param 首句/workdir/`$var:` 插值）。
- **ContentLog 是唯一可靠的运行时诊断渠道**：用 `console.warn` 写日志（`<APPDATA>\Minecraft Bedrock\logs\ContentLog*.txt`，此路径文件不可用 Grep 搜索，用 PowerShell Select-String 抓）；游戏内 `fluid_pipe:fluid_log on` 开启 `[rt]` 行。
- **worldLoad 早期 getBlock 可能取不到**：加载只恢复设备小状态 + 管道位置（pendingPipes），不写方块；连接图由 `rebuildPending` 按区块渐进洪水重建（每 tick 批 64 个，`restoreFrontMode` 从方块 `fluid_pipe:core` 状态恢复前沿）；`pumpEnds` 靠 tick 周期刷新补偿；`loaded` 门闩防空表覆盖存档。
- **持久化 v2 只存小状态**：设备表（泵/罐）+ 管道位置 ≈ 24KB（769 管道），**绝不存段图**（旧版存 ends/adj/front/pass 单次 488KB、每 2 tick 一次 → 103MB/分钟 爆 10MB 阈值）。阀开/关与三通方向均为方块状态（世界存档自动持久化，不入库）。保存触发：结构事件走 `saveFluid()`（立即、小载荷）；**无周期保存**，液位流动等运行态只存内存（方块状态自带视觉持久化），常态运行不写盘。写动态属性异常不可吞（吞掉 = 重进静默丢存档）。
- **连接图重建靠事件 + 加载扫描**：放置/破坏/扳手/阀门切换 → `rebuildAround`（事件响应重建）；区块边界洪水停在边界，对侧区块加载后由该侧 pending 重建并自动合并（洪水会卷入已入段区域重分）。
- **管道渲染为双命名材质方案**：`fluid_pipe.geo.json` 每个 cube 面 UV 带 `material_instance`（外层骨=`pipe`、内层骨=`fluid`）；方块用 `createGeometryBlock`（无 variant permutation，否则 permutation 的材质实例会覆盖命名材质）定义 `pipe`→`pipe_glass`、`fluid`→`fluid_water32`（翻书只动画水）。几何 UV 按 32x32 空间设计，材质贴图必须 32x32（`tools/make_water_texture.ps1` 把 16x16 源图放大 2 倍）。
- **v2 势模型**：水=1 / 空气=-1 / 向上每格-1 / 泵Δ=4（顶出底入）/ 罐 0~32 格（未满-1吸、满0停、弱源 level/32）—— 常量在 `scripts/core/potential.ts` 顶部，调参记得同步测试副本。
- **v3 方块语义**：泵顶=输出底=输入（侧面不参与）；单方向阀自身参考系西入东出，开/关=`fluid_pipe:open` 状态（扳手只切换顶面箭头 →开/↑关，**方块朝向不动**，放置时可旋转）；三通阀自身参考系西入三出（dir: east/south/west/north 顺时针循环，west=指向输入=全关，顶面单箭头指示）。**阀顶面箭头统一用 v3t_* 单箭头贴图**（单阀开= v3t_east、关= v3t_north）。**阀开/关与三通 dir 均为方块状态，引擎 describeEnd 必须读旋转（`minecraft:cardinal_direction`）做局部→世界面映射（ROT_FACE），不入持久化表**。
- **有效管道（渲染前提）**：段必须同时有输入端点（泵输出/阀门输出）与输出端点（罐/阀门输入/泵输入）才渲染水（`segValid`）；孤立段、仅泡水段（`END_SOURCE` 不算输入）无效；**泵泡水**（`pump.soaked`，泵自身含水或相邻 6 面任一为水块，每 5 tick 刷新）→ 泵直接吐水给输出段；`potCovered` 只含势 > -1 的管道，且经**叶剥除**只留连接所有输入/输出端点的最小子树——**死胡同支路不渲染水**。**水覆盖是逻辑层状态**：`tickFlow` 每 20 tick 把路径/顺序/前沿算进 `seg.front` 与 `seg.covered`（含水管道集合），引擎 `renderAll` 只读 `seg.covered` 同步写方块（存在才写，不存在记失效）。
- 势传播场每 20 tick 全量重算（computePotential + tickFlow），L/R 分离：R=段管道坐标列表按组批量更新。

- **方块状态最多 16 个有效值**：整数范围状态 max 最多比 min 大 15（0..16 共 17 值会报 expected an array）；数组形式同样限 16。多档状态（如罐 16 层水位）用 0..15 + 末档合并显隐。
