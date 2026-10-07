# Sapdon 框架 — Agent 指令

## 项目概述
Minecraft Bedrock Addon 开发框架，提供类型安全的 TypeScript API，自动生成 JSON 包体。

## 关键路径
- **框架源码**: `src/`（CLI + core + OC + 模板）
- **构建产物**: `prod/`（由 `npm run build` 生成，**不要直接修改**）
- **全局 CLI**: `C:\nodejs\node_modules\sapdon` → junction 指向本仓库
- **开发工作流文档**: `doc/dev/workflow.md` — 框架贡献者必读
- **已知坑清单**: `doc/dev/known-pitfalls.md` — 改框架前先扫一遍
- **架构文档**: `doc/dev/architecture.md`
- **用户文档**: `doc/user/`

## 分层铁律：构建期用 `@sapdon/core`，运行期用 `@sapdon/runtime`
- `src/core` = `@sapdon/core`：**构建期**（`main.ts` 生成 JSON）。它在 `src/cli/build.js` 的 `rollupIgnores` 里是 external。
- `src/oc` = `@sapdon/runtime`：**运行期**（`scripts/*`）。**不在** external 列表里 → 会被打包进脚本包。
- ⚠️ 运行期脚本里 `import '@sapdon/core'` 会在产物里留下**无法解析**的裸包名（Bedrock 不是它的宿主）。新 API 请先想清楚属于哪一层。

## 框架开发原则
1. 只修改 `src/`，不要改 `prod/` 或 `node_modules/`
2. 修改后 `npm run build` 重建 `prod/`
3. 在示例项目中通过 `npm i`（触发 `postinstall` → `sapdon lib`）或手动 `sapdon lib` 同步新库
4. 然后用 `sapdon compile` / `npm run build` 验证

## ★ 文档分层：接口 JSDoc / 坑清单 / README 各写什么（2026-09-12 立，**强制**）

**一句话**：接口文档只写接口；踩坑与实测证据进坑清单；项目决策与验收进项目 README；代码注释最多 2–3 行并指路。

| 内容 | 写在哪 | 禁止 |
|---|---|---|
| 参数语义 / 默认值 / 抛错条件 / 返回值 / 调用时机 | 源码 JSDoc（框架 `src/core/**`、`src/oc/**`） | ❌ 日期化的「本次订正」叙事、❌ ContentLog 原文与计数、❌「某项目用 XX 上线后…」、❌ 参照工程对比表 |
| 引擎/框架的坑 + 实测证据 | ① 框架级 → `doc/dev/known-pitfalls.md`（对齐既有条目：症状 / 原因 / 规避 / 出处）② 项目级 → 该项目的 `README.md`（本项目的事实卡类内容放项目侧文档） | ❌ 写进 JSDoc 或框架 README 正文 |
| 示例/用法 | `doc/user/**` 或示例项目 | ❌ 用示例当踩坑记录 |

**为什么要立这条**：
1. JSDoc 会被 `tsc` 打进 `prod/core/index.d.ts` —— **下游所有项目都会读它**；把日记写在接口上，等于把「某一个项目的临时状态」当成框架能力说明卖给下游。
2. 接口签名会被大段注释淹没，读的人 3 行之内看不到「这个参数是什么、什么时候炸」。
3 . 坑的价值靠**能搜到**，不靠**贴在接口上**：`known-pitfalls.md` 是按症状检索的地方，带日期与出处的完整证据放那里最合适。

**自查判据**：
- 只读接口文档的人 → 应能在 **3 行内**看懂参数语义与失败行为；
- 想查「为什么这么改 / 踩过什么」的人 → 应能在 `doc/dev/known-pitfalls.md`（或对应项目 README）里搜到**带日期 + 出处**的完整记录。

**落地要求**：改框架后除了重建 `prod/`，**还要检查 `prod/core/index.d.ts` 里的文案**（JSDoc 会原样进去）—— 脏文案一旦同步进下游项目就很难收回。

## 示例项目
- `examples/block_demo/` — 参考示例

## 构建配置
- `build.config` 中 `buildOptions.keepServer` 控制构建后是否保持服务器常开（默认 false 自动退出）
- `buildOptions.useHMR` 控制热更新
- `buildOptions.buildMode`：`dev` | `prod` | `debug`

---

## 思考哲学与做事框架

1. **先理解，后动手**：改代码前先读清相关模块的结构、数据流、约定与历史提交。对不熟悉领域先做"只读侦查"，用 Grep/读文件画出关键路径，不投机猜 API。
2. **二分定位**：遇到"不符合预期"，先把问题拆成可独立验证的片段（例：真值表对？输入对？→ 锁定到输出层）。用日志证据区隔"事实"与"猜测"，不急着改代码。
3. **沿着事件流找真凶**：状态被覆盖、字段丢失类 bug，思考"谁在我的操作之后又碰了它"，检查事件触发顺序（onUse → afterEvents）与重建/重注册的覆盖行为。
4. **最小侵入修改**：优先改出问题的单一函数；新增器件/功能时同步维护**每一处**同类分支（对称完整），避免漏改造成静默错误。
5. **双向验证**：改代码后必须执行验证：语法检查、构建（npm run build）、必要时设计最小复现/单测；再看生成的产物文件，用事实确认生效。
6. **构建产物自检**：改完 JSON/配置类生成物，打开生成结果核对关键字段，别只信"构建成功"。
7. **文档同步**：行为发生变化就同步更新 DESIGN/README 文档；约定沉淀到 AGENTS.md 供后续会话使用。
8. **不擅自扩大范围**：只做被要求的事；涉及取舍（方案/步琐/提交范围）时用提问确认而不是替用户拍板。
9. **复盘沉淀**：遇到过、踩过的坑用简洁清单形式写回文档，让下次会话不再踩同一坑。

---

## 通用经验

- **粒子**：原版 basic 粒子会引用 `variable.direction`，需用 `new MolangVariableMap().setVector3("variable.direction", v)` 作为 `spawnParticle` 第三参传入，否则报 `unknown variable '.z'`；偏移显示位置直接改传入的 `location`。
- **Molang 变量名统一小写**：粒子 JSON 里引用 `variable.xxx` 与脚本 `MolangVariableMap.setFloat(variable.xxx)` 必须**全小写**（运行时会小写化查询；`variable.A0`/`variable.colorMode`/`variable.fadeMode` 都会报 `unhandled request for unknown variable 'variable.a0/colormode/fademode'`）。
- **粒子 parametric 位置**：`particle_motion_parametric.relative_position` 要与 `variable.emitter_age`（发射器 loop 内年龄，秒）配合才能逐帧移动且 `math.sin` 正常工作；用 `variable.particle_age` 做 sin 相位常不振荡。sin/cos 按**角度制**（`sin(emitter_age*360)` 一周），弧度数值需 `×57.2958`。脚本 `spawnParticle`（手动发射）的 parametric 未必可靠，改用发射器驱动（`emitter_local_space.position:true` + `rate_steady/instant` + `emitter_shape.offset` 用 `emitter_age`）。
- **Molang 数学函数**：无 `math.log`，自然对数用 `math.ln`；`math.exp/math.abs/math.pow/sin/cos` 可用。

## SapdonGuideBook / FormButtonGrid（踩过的坑）

- **`FormButtonGrid.addButton(index, btn, pos)` 的 `index` 必须是该按钮在运行期 form 里的「槽位序号」，不是视觉序号**。
  - 机制：`index` 被编码成 `grid_position`（`col = index%c, row = index/c`），而 Bedrock 的集合格盘靠 `grid_position`（行优先序号）**把格子绑到对应的 form 按钮**；按钮画在哪一格由 `pos` 决定（`offset = -基准格 + pos`）。
  - 框架里 3 处调用**全部**传槽位序号：导航 `addButton(i)`（槽 0-2）、CAT 列表行 `addButton(3 + j)`（章条目从槽 3 起）、索引卡 `addButton(3 + i)`（卡从槽 3 起）。那个 `3 +` 不是历史遗留，删不得（框架侧现以常量 `IDX_SLOT_BASE = 3` 表达）。
  - **症状**：游戏内索引页「封面 + `类别` + 两条分割线都在，但一张卡都没有」。产物 JSON 结构完全正常，只差 `grid_position`/`offset` 数值 —— 纯结构断言查不出来，2026-09-10 就是这么翻车的（用户截图才暴露）。
  - **自检**：`examples/guidebook_demo`（4 分类）重建后 `dev/guidebook_demo_RP/ui/gateddemo_book.json` 应与基线**逐字节一致**（587885 字节，sha256 `C04672A23AE4FD4F68EF76646316B0DA82DFADA9C8AE80D81A2CEB88A9109988`）；不一致就去找槽位编码。★ 2026-09 两次重锁：① 屏幕根面板元素名从 `<屏幕名>` 改成**固定 `root`**；② UI 文件/namespace 改成 **`ns_nm`**（`gateddemo:book` → `gateddemo_book.json`，引用前缀跟着变，故 +15 字节）。见 §4.1 的 root 约定与 A 表的 `SapdonFormUI` 行。另一份可参照的已知可用旧产物：`examples/more-golem/dev/more-golem_RP/ui/neo_guidebook.json`（卡片为 `grid_item_003..` + `grid_position [3,0]/[0,1]/…` + 负偏移）。
  - 详述与故障速查：`doc/guidebook.md` §5（槽位硬约束 / 分页公式 / 卡片→槽位→格位对照 / 可调常量）、§6（可翻页 `openIndex`）、§8（索引页不显示的 4 类成因）。
- **改 UI 框架后不能只靠 JSON 断言"没坏"**：结构等价 ≠ 游戏内渲染等价。涉及集合/门控的改动，务必留一份"已知可用"的旧产物做逐字节对比，并请用户进游戏走一遍关键页（本环境无法启动 Minecraft）。
- **索引分页（每页 16 张，2026-09 新增）**：`p0` body = `INDEX`（历史协议，旧脚本不用改），`p1+` body = `IDX|p<k>` —— **不能**写 `INDEX|p<k>`（门控是包含匹配，会连 `p0` 的封面一起点亮）。容量与槽位的单一事实来源是 `sapdonGuideBook.ts:73-90` 的 `IDX_*` 常量；运行期必须镜像同一规则（FZ 侧见 `src/guide_data.ts` 的 `INDEX_*` / `indexBody()` / `indexRange()` / `indexPageCount()`）。

---

## digitCircuit 示例项目排障经验

### ContentLog 日志是唯一可靠的运行时诊断渠道
- 调试脚本时优先用 `console.warn(...)` 写日志：它稳定落到 `<APPDATA>\Minecraft Bedrock\logs\ContentLog*.txt`（此路径的文件**不可用 Grep 工具搜索**，Windows 环境需用 `Select-String -Path` 在 Shell 里抓）。
- `world.sendMessage()` 不会进 ContentLog，聊天里看不到的批量运行时信息要用 console.warn 等价物（`rLog`）留痕。
- 本地开发时用 `debug_tool` + 区块自带的 `dump`/`compile` 命令辅助定位（也会 print 到日志），加上 `setRuntimeLog(true)` 开启 `console.warn` 的 `[rt]` 行。

### 查找"事件顺序"类 bug 的套路
- 症状：某种一次操作后状态恒不变（如 chip 输出恒 0）。先把真值表/输入值/输出值三者分离——**先确认表是对的（`7→1`）、输入是对（`7`），锁定到"查表对象本身"**。
- 然后沿着事件流查"谁在事后覆盖了它"。典型：`onUseOn`（item custom component）绑定 → 随后 `afterEvents.playerInteractWithBlock` 触发 `rebuildAround` → `registerComponent` 用**全新组件对象**覆盖，丢掉刚写的字段。
- 修复模式：`registerComponent` 重建时从 `previous = components.get(key)` 继承需要持久化的字段（`logicUuid`、`store` 等），而不是无脑新建空对象。

### 数字电路引擎结构速览（examples/digitCircuit/scripts/circuit.js）
- 组件(`components`)存`powered`/`facing`/`netByFace`/`directByFace`；导线用连通块 `nets` 表达。
- 数值传播固定点：`recomputeNetValues()` / `recomputeNetWidths()` 各迭代 `nets.size+2` 轮；`netValue` 取网络上所有驱动组件的**最大值**（单驱动下即数值，兼容布尔视角 `>0` 视为通）。
- 三面映射统一见 `splitterFaces`/`mergeFaces`/`chipFaces`/`registerFaces`，基于 `facing` 旋转（模型朝北为基准）。新增器件必须同时维护：`isOutputFace`、`inputFacesOf`、`compValueFor`、`outputWidthOf`、`computePowered`、`fresh*` 编译副本（仅组合逻辑）这几处，漏一处处就会出静默错误。
- 持久化：`saveCircuit` → 动态属性完整内存模型；`loadCircuit` 原样还原，**不**重新推导、不碰方块、不 propagate。
- 时序器件（1bit 寄存器）：`comp.store` 电平锁存，`W=1 写 D，W=0 保持`；`registerComponent` 重建时保留 `store`，save/load 各自持久化（`st` 字段）。Minecraft 无自动 tick，时钟靠开关等交互触发 `propagate` 推进帧。

### 芯片两种编译模式（compileLogic）
- 输入端子数 `≤ MAX_LOGIC_INPUTS(8)`：真值表法（`mode=table`，记录 `inputs`/`outputs` 端口序号 + `table`）；端子 `>8`：**不启动 2^n 查表**，直接改存电路拓扑 `mode=topo`（`topo` 字段 = 相对坐标 comps+nets+端子映射，chip 运行时 `evalTopo` 逐 bit 驱动做固定点仿真，初始 store=0）。
- 端口方块为单一方块 `sapdon:input_port` / `sapdon:output_port`，端口号(0~9) 存方块状态 `sapdon:num` 控制数字贴图（仅编号，非逻辑位权），由 `debug_tool` 点击循环切换；真值表模式下编译时按 `freshPortDist`（端子距电路距离）排序——最远=bit0，同距再按端口数字升序。
- 端口贴图带透明像素须配 `render_method: alpha_test`；**不要**再加 `face_dimming: false`/`ambient_occlusion: 0`，否则端口自发光（用户要求端口不发光）。
- 摆放非导线电路方块时若点击的是导线，`playerPlaceBlock` 里必须 `setWireEdge(被点击导线, 点击面, 1)` 让导线手臂指向新器件，否则「先铺线再点线放器件」的场景导线不导通到器件。相关的 `beforeEvents.playerInteractWithBlock` 记录条件是「手持电路物品 **或** 被点击方块是电路方块」。
- 拓扑仿真求值（`evalTopo`/`topoCompute`）依赖 `@minecraft/server`，Node 无法直接 import；`test/topo.test.mjs` 复制了 engine 核心（AND/NOT/寄存器写&保持/固定点/expr 共 23 断言）。**改 engine 这些函数须同步该测试副本**，运行 `node test/topo.test.mjs`。
- **芯片逻辑三种存储模式**：`table`（≤8 输入，扁平真值表）；`expr`（>8 输入纯组合电路，按输出位反向提取 AND/OR/NOT 表达式树，`tryBuildExprModel`/`evalExprNodes`，体积比 topo 小约 20 倍，**推荐优先**）；`topo`（>8 输入含寄存器/芯片/环时回退，存物理拓扑 comps+nets）。改 expr 提取/求值须同步 runtime `chipLookup`、compile `compileLogic`、测试副本三处。
- **端口导电语义**：输出端口不贡献网络值（`recomputeNetValues`/`freshNetValue` 里 `isOutputPort` 被跳过），网络靠 `floodWireNet`/`freshFloodNet` 的 `wireThroughPort` 穿透端口连通——导线 arm 指向端口且对侧导线 arm 也指向端口时，两侧导线并入同一 net。改这三处（runtime floodWireNet、compile freshFloodNet、wireThroughPort）须三处同步 + stub 副本 + topo 测试副本。
- **动态属性持久化分块**：Bedrock 单个动态属性值长度受限（约 32KB 量级），大电路 JSON 超限时 `setDynamicProperty` 抛错——**若被 try-catch 吞掉会静默丢存档**（症状：重进世界后电路/chip 绑定消失，因为存档一直是早期小快照）。`saveCircuit` 已按 `CIRCUIT_CHUNK=24000` 分块（主 key 存 `{"_chunks":N}`，数据块 `sapdos:circuit_data#0..N-1`），`loadCircuit` 拼接还原。排查"重进丢数据"先看 `[diag] worldLoad` 日志（存档大小/组件数/chip 绑定数）。
- **ContentLog 诊断陷阱**：ContentLog 在游戏进程内可能停止追加（文件停在某个时间戳），且 `world.sendMessage` 不进日志。需要运行时证据时用 `console.warn` + 游戏内 `logic_diag` 命令（输出同时写 ContentLog 和聊天框）；日志冻结时让玩家完全退出进程重开。

### 创造菜单分组（Item Catalog）
- 方块/物品 `options.group` → `menu_category.group`；`ItemAPI.createItemCatalog().addGroup(category, items, {icon, name})` 生成 `BP/item_catalog/crafting_item_catalog.json`。
- `group_identifier.name` 是本地化键，必须在 `RP/texts/*.lang` 定义（zh_CN+en_US 双份），否则分组显示原名空白。

### 生成资源包验证
- `npm run build` 后校验产物：`dev/<proj>_BP/blocks/*.json`（menu_category.group）、`item_catalog/crafting_item_catalog.json`、`dev/<proj>_RP/textures/terrain_texture.json`、`texts/*.lang`。
- 构建日志出现"处理数据: xxx behavior blocks/"即成功；用 `Test-Path` 确认新块 json 已生成（先最后输过一次 build 才能静置产物）。

### NeoGuidebook 手册（游戏内书）接入要点
- 构建时 `main.mjs` 用 `NeoGuidebook(identifier, "ui/", [320,207], {buttons,textures})` + `NeoGuidebookPage(...).addBookText/addCategoryTitle/addDoublePageStack`；自动生成 `dev/<proj>_RP/ui/<name>.json` 并写入 `server_form.json` 的 title 绑定；页面清单须写成 `scripts/guide_pages.js`（`export const PAGE_IDS = [...]`），因 dev server 是**模块拼接打包**，`import("./x.json")` 不会被处理，只能拼接 JS。
- 自定义控件：`NeoGuidebookPage` 有 `addControl(control)` / `addStack(size, control, debug?)` 透传内部 StackPanel，可放任意 `UIElement`（Label/Image/Button…）或原生 JSON 控件对象；底层控件类（`Label/Text/Control/Image/Sprite/StackPanel/Layout` 等）在 `@sapdon/core` 的 UI 导出里。
- 框架侧改完 `src/core/ui/systems/neoGuibook/*` 后：root `npm run build` 重建 prod，再进示例项目 `sapdon lib` 同步 node_modules；同步后验证 `node_modules/@sapdon/core/index.d.ts` 里有对应方法声明。
- 运行时 `scripts/index.js` 里物品自定义组件 `onUse` → `new ActionFormData().title(书名不带命名空间).body(pageId)`；书名 = identifier 的 name 部分（`sapdon:guidebook` → title `"guidebook"`）。按钮文字是 JSON UI 绑定键名（`prev_button`/`next_button`/`home_button`/`item_0_button`…），非显示文本。
- 多级目录/返回：子目录页用 `buildChapterList(prefix)` 指定不同前缀（如 `"sub"` → `sub_N_button`），避免 JSON UI 按钮 id 全局冲突；子分类页返回**用原生 prev**，不放自定义按钮，prev 目标由 `PAGE_PREV` 覆盖（`{ "page_source": pageIds.indexOf("page_index1"), ... }`，未列出的页走线性 `current-1`）。运行时跳转需数据驱动：`guide_pages.js` 同时导出 `PAGE_IDS`（index 顺序）、`PAGE_NAV`（每页 `[{key, target}]`，target 存 `pageIds.indexOf(page_id)` index）、`PAGE_PREV`；`openGuidebook` 按当前页查 `PAGE_NAV[page_id]` 渲染按钮。切勿直接存页 id 字符串作为 goto 目标。
- 手册文本排版：中文一行约 16 汉字，超长手动 `\n` 拆行；子分类页 list 每行「图标+名字+一句话」，用 `addStack` 把 `iconRow`（StackPanel+Image+Label）铺进左页，比重排按钮更简洁。
- 物品要能触发 `onUse` 必须加 `minecraft:interact_button`（如"打开"）——否则右键无反应。
- 加了新 `@minecraft/server-ui` 依赖后，**必须删掉 `dev/<proj>_BP/manifest.json` 再 build**，否则 manifest 只在首次构建生成、不会自动追加依赖（表现为 `Module [@minecraft/server-ui] is unrecognized` / version conflict，脚本 context 创建失败、整包脚本不运行）。
- `@minecraft/server` 2.6.0 需配 `@minecraft/server-ui` 2.x（1.x 会报 version conflict）。
- item `minecraft:icon` 引用原版纹理名须与 `resource_pack/textures/item_texture.json` 里的 `texture_data` 键一致，否则 `Missing referenced asset`。书请用 `book_writable`（`book` 不存在）。

- **脚本源码（.ts/.js/.mjs）一律用 edit/write 工具修改，绝不用 PowerShell 的 `Get-Content`/`Set-Content` 重写**：PS5.1 编码往返会损坏 UTF-8 中文（变 mojibake）并吃掉字符串里的引号/逗号，导致 Rollup 编译报 "Unterminated string constant"、产物 `index.js` 残留旧代码、看起来像"命令没生效"。需裁剪/追加脚本文件时用 Read + edit/write 工具，或 `git checkout`/`git show HEAD:...` 取基线再重写。JSON 粒子/配置类用 ConvertFrom-Json/ConvertTo-Json 生成新文件是安全的（ASCII 字符串为主）。
- **自定义命令参数总数上限 8**（mandatory+optional 合计），超出注册抛 `CustomCommandError: has 'N' parameters, limit '8'` 被 `safe()` 吞掉 → 运行时报"未知的命令"。多参数命令必须把可选参数收到 ≤8。
- **脚本侧手动采样形状点 + 叠加动画**：在"每个锚点 spawn 一个 `mfx_uni`"即可让整形状作为一个整体动（粒子默认出生位置即锚点，relative_position 是其相对位移），**无需新增 sculpt 类粒子 JSON**。
- **粒子 Molang 的 `math.sin/cos` 是角度制**：uni 表达式 `sin((B·t+C)*rad2deg)` 等价于对弧度数 `v=B·t+C` 取 `Math.sin(v)`（JS 侧别乘 rad2deg，会差一档）。

---

## 框架接口补齐（2026-09，FZ S0–S2 反馈）—— 新增约定

> 来历：FZ 重置项目在 sapdon 上做了一批「绕过框架」的手工活。凡是需要绕过的地方就是缺接口，这一轮把它们补成框架接口。
> 完整坑清单：`doc/dev/known-pitfalls.md`。

### A. 新增 API 一览（位置 / 签名）

| 能力 | 位置 | 签名要点 |
|---|---|---|
| **自定义屏（推荐入口）** | `src/core/ui/systems/sapdon/sapdonFormUI.ts` | `new SapdonFormUI("ns:nm", 内容面板, 按键面板)` —— **一个 UI 文件 = 一条路由（SapdonCustomForm 屏）**，构造即挂两个面板 + 建**唯一根面板 `root`**（`$panel_id` + `#title_text` 前缀门控 + 两个 `content@`/`buttons@` 引用）+ 注册 gated factory。★ **UI 文件与 namespace 都是 `ns_nm`**（`sapdon_ui:apple` → `ui/sapdon_ui_apple.json`，引用前缀 `sapdon_ui_apple.xxx`）；`nm` 另决定 factory id 后缀与 `panelId = sapdon_ui:<nm>`；`getSystem()` 拿到的就是本文件。★ **一个文件只有一个 root**（同名会互相覆盖）⇒ 多页面**不靠多个根**，而是在内容面板里用门控做（**用 `PagePanelManage`**，手册即此例的等价物）；要多个屏就各 new 一个（`ns_nm` 相同 = 同名文件互相覆盖） |
| 表单路由壳 | `src/core/ui/systems/sapdon/serverFormUI.ts` | `ServerFormUI`（**旧名 `SapdonServerUI`，已改名，不留别名**）：`MARKER = 'sapdon_ui:'`、**`ROOT = 'root'`**、`createPageRoot()`、`registerPage()`、`getSystem()`；生成 `RP/ui/server_form.json` 的 4 个元素 + 每屏一个 gated factory（`long_form` 一律 `@<屏 ns>.root`）。与 HUD 的 `root_panel`、容器的 `container_root_panel` 是**同一套"根面板"约定** |
| **一屏多页面** | `src/core/ui/systems/sapdon/pagePanelManage.ts` | `PagePanelManage`（**构建期**）：一个文件只有一个 root ⇒ 多页面在**内容面板**里放多块面板 + 每块一条 `#form_text` 门控，运行期 `.body(tag)` 选页。两种写法都支持：`new PagePanelManage(contentPanel)` + 链式 `.addPage(panel, tag?, variable?)`（`add` 是别名），或 `new PagePanelManage({ container, pages: [{panel, tag}], mode })`。`mode` 缺省 `'prefix'`（`$gtag` + `(not( (#form_text - $gtag) = #form_text))`，**手册那套，与真产物逐字一致**）／`'eq'`（`$binding_text` + `($binding_text = #form_text)`）。`build()` 返回容器（幂等）、`list()` 给 `tag↔面板` 对照（运行期脚本据此对齐）。**只管构建期**；旧的自己写 `addVariable + addDataBinding` 的写法不受影响 |
| 手册标签 i18n | `src/core/ui/systems/sapdon/sapdonGuideBook.ts` | 构造第 4 参 `options.labels`，或链式 `setLabels(Partial<GuideBookLabels>)`；默认值 = 历史中文字面量 |
| 带实体方块 | `src/core/factory/blockFactory.js` | `BlockAPI.createTileBlock(identifier, category, textures_arr, options)` → 注册方块 + 实体（behavior/resource）；**★ 这是当前唯一可用的方块容器路线**，`options` 可带 `inventory_size` / `container_type` / `can_be_siphoned_from`（默认 27 / `minecart_chest` / true，不传 = 产物逐字节不变；每次构造按实例拷贝）+ `group` / `hide_in_command` / `format_version` / `entity_texture`（★ S3b 补：这四个以前 `.d.ts` 里漏声明，传对象字面量会踩 TS2353）。⚠️ **没有**「延迟 despawn」入口而且**不许加**：往 `item_despawn` 组的 `minecraft:transformation` 上加 `delay` 会让同组的 `instant_despawn` 先删掉实体 ⇒ **整容器一个都不掉、真物品一起消失**（2026-09-12 真机教训，见 `known-pitfalls.md` §4.15） |
| 方块容器（实体路线，★ 唯一可用） | `src/core/block/tileBlock.js` + `src/core/factory/blockFactory.js` | `createTileBlock(id, cat, textures, { inventory_size, container_type, can_be_siphoned_from })` → 实体行为里的**实体**组件 `minecraft:inventory` |
| 方块容器（方块路线，规范但当前引擎拒） | `src/core/block/blockComponent.js` | `BlockComponent.setBlockEntity(true, { container: { slot_count } })` → `minecraft:block_entity.container`；`slot_count` 官方文档 `[1,54]`，**超限抛错** |
| 方块容器（**已废弃**） | `src/core/block/blockComponent.js` | `BlockComponent.setInventory({inventory_size, …})` → 方块里的 `minecraft:inventory`（**实体**组件放错上下文，引擎必然拒）。产物保持不变 + 构建期一条 warn 指向上面两条路 |
| 分块持久化 | `src/oc/persist/chunked.ts`（`@sapdon/runtime`） | `saveChunked(target, key, value: string)`（**`value` 必填**）/ `loadChunked(target, key): string \| undefined` / `clearChunked(target, key)` + `CHUNK_SIZE = 24000`（另导出 `CHUNK_SUFFIX`/`MAX_CHUNK_SCAN` 与几个纯函数） |
| 组件注册（路线 B） | `src/oc/components/registry.ts`（`@sapdon/runtime`） | `registerBlockComponent(id, handlers)` / `registerItemComponent(id, handlers)`；诊断：`pendingComponentCount()` / `registeredComponents()` |
| 组件注册（**框架内置兜底**） | `src/oc/components/registry.ts`（`@sapdon/runtime`） | `registerFallbackBlockComponent(id, handlers)` / `registerFallbackItemComponent(id, handlers)`：**项目没注册该 id 才注册**；项目注册了 → 项目生效 + 一条 warn；重复登记同一内置 id 幂等。诊断：`skippedFallbackComponents()` |

### A2. 框架内置自定义组件清单（`registerBuiltinComponents()`）

| id | 实现 | 备注 |
|---|---|---|
| `sapdon:crop_growth` | `src/oc/builtin/blocks/crop.ts` | `CropBlock` 用 |
| `sapdon:fallingblock` | `src/oc/builtin/blocks/fallingBlock.ts` | |
| `sapdon:head_rotation` | `src/oc/builtin/blocks/headRotation.ts` | `HeadBlock` 用 |
| `sapdon:intercardinal_orientation` | `src/oc/builtin/blocks/intercardinalOrientation.ts` | `HeadBlock` 的 permutation 用 |
| `sapdon:guibook` | `src/oc/builtin/items/guiBook.ts` | **物品**组件注册表 |
| **`sapdon:block_with_entity`** | `src/oc/builtin/blocks/blockWithEntity.ts` | ★ S3b 新增，走**兜底**通道。`TileBlock` 给**每个** `createTileBlock` 的方块都挂它（`tileBlock.js:232`）—— 框架以前不注册 ⇒ 忘了手工注册的项目**整份方块被引擎丢**（`not present in the Schema`）。内置实现 = **模式 A**（`onPlace` 里 spawn `${block.typeId}_entity`，防重复、位置对齐），**刻意不切** `sapdon:block_or_entity` 状态（不替项目决定要不要「方块透明 + 实体接管外观」的模式 B）；项目自己注册同 id 时以项目实现为准 |

### B. UI i18n：默认值必须保持历史字面量
- `DEFAULT_GUIDE_BOOK_LABELS = { chapter: '章节', category: '类别' }` —— **改它会让所有既有项目产物变化**，不要动。
- `setLabels` 是**增量合并**（`labels.x ?? this.labels.x`）：早先写成「未传的键回落默认值」时，链式第二次调用会把第一次的设置冲掉（实测踩到）。
- 框架**不解析 lang 键**：字符串原样交给 `Text.setText`，JSON UI 自己解析；传键的项目必须在 `RP/texts/*.lang` 定义，否则显示裸键名。
- **回归判据**：`examples/guidebook_demo` 重建后 `dev/guidebook_demo_RP/ui/gateddemo_book.json` 必须**逐字节不变**（587885 字节 / sha256 `C04672A23AE4FD4F68EF76646316B0DA82DFADA9C8AE80D81A2CEB88A9109988`，2026-09 因 root 改名 + `ns_nm` 文件/命名空间重锁）。**删掉再重建**也要一致，才算真的走通了这条路径。

### C. 自定义组件：两条路线的分工（都要保留）
- **路线 B（推荐）**：运行期脚本里 `registerBlockComponent` / `registerItemComponent`。handler 是**普通闭包**，能 import 共享模块（S3 的机器基类必需）。框架内部保证 `system.beforeEvents.startup` 时机。
- **路线 A（保持兼容）**：`BlockCustomComponentBuilder`（构建期声明）+ CLI 生成的 `scripts/custom_components/*.js`（`build()` / `generateRuntimeCode()` 签名**不许改**，`examples/block_demo` 在用）。handler 会被 `toString()` 序列化 → 只能自包含。
- **时机红线**：只有上面两条。`world.beforeEvents.worldInitialize` 太晚，症状是 `not present in the Schema`。
- 守卫：startup 之后注册 → 抛错；同 id 重复注册（**同一张账**内）→ 抛错；事件名拼错 → 只 warn。
- ★ **框架内置组件不适用「同 id 就抛错」**：框架自己也要注册 `sapdon:block_with_entity`（`TileBlock` 挂的），而历史项目早就手工注册过它。所以内置组件走 `registerFallbackBlockComponent`：
  - 项目**没注册** → 内置实现生效；
  - 项目**注册了同 id** → **项目实现生效**、内置被跳过 + 一条 warn（**不是错误**），顺序无关（判定在 `system.beforeEvents.startup` 回调里，等所有模块都加载完）；
  - 兜底登记本身**幂等**（`registerBuiltinComponents()` 调两次不会重复注册）。
  - 单测：`node tests/component-registry.test.mjs`（7 条；用「编译产物 + `@minecraft/server` 桩」跑真代码，见该文件头注释）。

### D. 持久化：绝不吞异常 + 空值靠 `=== undefined`
- 超限（约 32KB）时 `setDynamicProperty` **抛错**；吞掉就是**静默丢存档**。框架 helper 不吞异常，分块损坏也抛。
- 主 key `{"_chunks":N}` + `key#0..N-1`，与 `lr-framework` 的 `BaseEngine`、`digitCircuit` 的 `CIRCUIT_CHUNK=24000` 互通；数据块先写、主 key 后写（提交点）。
- `loadChunked` → `undefined` = 没存过，`''` = 存过空串。**不要**用真值判断。

### E. 构建行为（改动过的语义）
1. **失败必须非 0 退出**：`runOnChild` 检查退出码并抛；`scriptBundler` 打包失败抛；CLI 顶层 catch → `exit(1)`。⚠️ `cp.fork` 会建 IPC 命名管道（受限环境 `EPERM`），而框架传输层走 HTTP，**从不用 IPC** —— 所以用 `spawn(process.execPath, [file], {stdio:'inherit'})`。
2. **子目录名只允许大写 `_BP` / `_RP`**（`src/cli/init.js` 的 `getBuildDirBp/Rp` 之前是小写，Linux/macOS 会分叉目录）。
3. **`blocks.json` 写在 RP**（`GRegistry.register('blocks','resource','')`）。历史误写在 BP；首次带清单构建会自动清理 BP 侧残留。**★ 2026-09 起文件里只写 `{"format_version":"1.20.20"}`、不写任何方块条目** —— 写 `textures` 会让引擎对每个自定义方块报 `trying to override the Geometry component with blocks.json settings for a custom block`（官方文档：`blocks.json` 只当 sound 配置系统，视觉一律走 `minecraft:geometry` + `minecraft:material_instances`）。随之删掉了「键必须是 `ns:name`」的 `assertBlocksJsonKey` 护栏（不再写条目 → 永不触发，不留死护栏）。
4. **陈旧产物按清单清理**：`dev/.sapdon_generated_<proj>.json` 记录本次产物，下次只删「上次有、这次没有」的。**禁止**改成扫目录删（会误删用户 `res/` 拷进来的文件）。
   另外两段同步同样按清单 prune（2026-09 新增，见 `doc/dev/cli.md`）：`dev/.sapdon_synced_<proj>.json` 管**游戏开发包目录**里「上次部署过、这次 `dev/` 没有」的文件；`dev/.sapdon_res_<proj>.json` 管 `dev/<proj>_RP` 里「上次从 `res/` 拷过、这次 `res/` 没有」的文件。**没有清单时一个文件都不删**；空包目录视为构建中断、跳过 prune。单测 `node tests/sync-manifest.test.mjs`。
5. **注册索引合并**：`scripts/custom_components/index.js` 用标记块维护（`// >>> sapdon:custom-component-registry >>> … <<<`），标记块外内容一律保留；生成块用 `system as __sapdon_system` 避免重名 import。
6. **Dev Server 端口**读 `SAPDON_DEV_SERVER_PORT`（默认 49037），服务端与客户端必须用同一个变量；端口被占直接 `exit 1`。多 agent 并行构建各设各的端口。

### F. 验证套路（本环境受限，务必照做）
- 构建必须拆 4 步直跑：`tsc` → `tsc-alias` → `node scripts/buildTask.cjs` → 拷 templates + 删 dist。**漏掉 `tsc-alias` 会让 `prod/cli/start.js` 残留无法解析的 `@sapdon/utils` 裸包名。**
- **「rollup 9/9 成功」≠ prod 是新的**：改完要断言 `prod/` 内容（新导出在不在），别只看 `Failed: 0`。
- **`处理数据:` 行数**是「产物真的生成了」的唯一判据。
- 单测：`node --test` 会 fork（受限环境 EPERM）→ 直接 `node tests/persist.test.mjs`（先 `tsc` 生成 `dist/`）。
- 运行期代码（`src/oc`）的单测要靠**纯逻辑 + 内存 target**，不要依赖 `@minecraft/server`（该包只发 `index.d.ts`、Node 里导入不了）。

### G. 自定义容器界面（`ContainerUISystem`，2026-09-12 重构）
| 能力 | 位置 | 签名要点 |
|---|---|---|
| 纯函数换算 | `src/core/ui/systems/containerLayout.ts`（**零 import**） | `slotToGridPosition` / `cellBase` / `posToOffset` / `anchorProps` / `validateSlotSpec`（返回警告数组，**不抛**）/ `resolveSlot` / `checkUIName`；标定常量 `SLOT_CALIBRATION` |
| 槽位声明 | `containerUISystem.ts` | `addSlot({ slot, pos, kind?, enabled?, cellSize?, background?, itemRenderer?, vars? })`：`slot` = 容器槽位号、`pos` = 面板内像素坐标，框架换算 `grid_position` / `offset` |
| 版面 | 同上 | `setPanel({ size, background })` / `setGridOrigin([x,y])` / `setSlotDefaults({...})` / `addControl(el, pos?)`（`addElementToMain` 是它的别名，**已真的有挂载**） |
| 旧接口 | 同上 | `addGridItem` / `addInputGrid` / `addOutputGrid` / `setGridDimension` / `setSize` / `setTitle` 全部保留为薄封装（显式 `grid_position` + 显式 `offset`，不参与换算）；`setInputGrid` 是 `setOutputSlots` 的 `@deprecated` 别名；**`setItemMatrix` 已删**（三个独立缺陷） |
| **进度指示槽** | 同上 | `addProgressSlot({ slot, pos, fill, base?, size?, clipDirection?, collection?, vars? })`：`base` 垫底 + `fill` 按 `clipDirection` 裁开，比例取**本格物品的剩余耐久**（框架内部取反，因为 `#item_durability_current_amount` 是已损耗量）。自动关掉引擎自带耐久条、去掉格子灰底、把控件经 `$cell_overlay_ref` 注入格内 —— 脚本往该槽写可损耗物品即可，**不需要进度条贴图**。依据见 `known-pitfalls.md` §4.12 |

- **`kind` 语义**：`input` 不写标志位；`output` / `display` **缺省**写 **`"enabled": false`**（`display` = 不进不出、纯显示，供脚本每 tick 换物品做伪进度条）。
  ★ **显式 `enabled` 一律优先于 `kind` 的缺省门控**（`resolveSlot`）⇒ 产物格必须写成
  `addSlot({ kind: 'output', enabled: true })`：真机已确认 `enabled: false` 是**整体禁用这一格**
  （**连产物都取不出来**，"只拦放入"是错的），`output` 的 false 只适合「不需要玩家取走」的格。
  详细证据见 `known-pitfalls.md` §4.14。
- **`addProgressSlot` 的 `keepRatio`**：默认 `false` = 按 `size` 拉伸铺满（引擎默认会保纵横比，贴图与 `size` 比例不同时会被缩窄 ⇒ 要拉伸必须显式传 `false`）；`true` = 保比例缩放（会留边、实际宽度不再是 `size`）。
- **网格几何只认一处**：统一格位尺寸取 `setSlotDefaults({ cellSize })`（缺省 = 标定表），网格尺寸与基座换算都用它；**逐槽 `cellSize` 只当视觉尺寸**（可溢出格位）。混着用会把基座算歪，见 `known-pitfalls.md` §4.11。
- **★ 待真机校准**：格位基座假设「网格原点 + 序号 × 统一格位尺寸、锚点左上角」全部集中在 `containerLayout.ts` 的 `SLOT_CALIBRATION`（含 `defaultGridOrigin`，默认 `[0,24]` 给标题让位），校准只改这一处（`anchor` 会同时翻转换算与产物的 `anchor_from`/`anchor_to`）。
- **门控键 = `UISystem.name`**，且**同时是 `ui/<name>.json` 的文件名** ⇒ 只允许 `A-Z a-z 0-9 _ -`（`checkUIName()` 会 warn）。
- 判据：`node tests/container-layout.test.mjs`（纯函数）、`node tests/container-ui-output.test.mjs`（跑 prod core 断言产物）。坑的全文见 `doc/dev/known-pitfalls.md` §4.5–§4.11。

---

## 可视化 UI 编辑器（`tools/designer/`，2026-09 新增）

**一句话**：Qt Designer 范式（控件箱 / 画布 / 对象树 / 属性面板 / `uic` 式产物预览 / 编译期诊断）的 sapdon UI 可视化编辑器；**零依赖**（原生 ESM + 原生 DOM，不引 vite —— 本仓库没有 vite 且受限环境装不了），产物是 **sapdon TS 代码**（不是 JSON UI）。

- 设计文档 `doc/dev/ui-designer.md`（Qt 对照映射、工程格式、版面模型、代码生成边界、诊断规则、路线图）；使用说明 `tools/designer/README.md`
- 起服务：`node tools/designer/serve.mjs`（默认 **5178**，别占构建用的 `SAPDON_DEV_SERVER_PORT` 49037）
  - **贴图直接来自资源包**（画布画真图 + 属性面板「浏览…」出缩略图）：启动时自动找工作区里的 `bedrock-samples*`，也可 `--vanilla "<RP 目录>"` / `--project "<工程 RP>"` 指定；找不到也不影响编辑器可用（只是不画图、不判定纹理存在性）
  - ★ **纹理引用区分大小写**：原版是 `textures/ui/white`，`White` 不存在（Windows `Test-Path` 会返回 True 骗你 —— 见 `ui-designer.md` §12.3）
  - ★ **没有浏览器也要"亲眼看"**：`node tools/designer/tools/rasterize.mjs` 把画布渲染成 `.tmp/designer-render.png`（与浏览器画布同一份 `paint.js` 规则，PIL 出图）。改版面/贴图规则后**先跑它再改代码**，并与真机截图对照
- **范围**：只服务 **SapdonUI 自己的界面**（页面壳 / 手册 / 容器 / HUD），不复刻原版任意界面，不解析原版模板内部
- ★ **三类屏幕（`doc.screenKind`，2026-09 用户口径）**：`form`（SapdonCustomForm，按规范校验 + 生成一句话 `new SapdonFormUI(...)`）/ `容器` / `hud`。**后两类是自由摆放**：编辑器只做元素级校验（id/属性目录/纹理/结构），跳过 root、内容/按钮面板、`panelId`、门控视图这些 form 专属规则，产物只给元素 + 一句挂载提示（`ContainerUISystem.addControl` / `HudUISystem.mountRootElement`），**不预览框架产物**；文件名按各自系统的真实规则（form `ui/<ns_nm>.json`、容器 `ui/<nm>.json`、hud 原版 `ui/hud_screen.json`）。规则 `screen-kind-freeform` / `screen-kind-form-empty`
- **判据（改完必跑，五条都要绿）**：
  ```bash
  node tests/designer-layout.test.mjs     # 版面引擎：锚点(缺省 center)/缺省 size 铺满/流式/格位/form 槽位/拖动反解
  node tests/designer-paint.test.mjs      # 绘制模型：纹理侧车/九宫格退化取 1px/空纹理/模板占位/$gtag 门控
  node tests/designer-textures.test.mjs   # 纹理路径 + ★实测：示例与目录建议里的贴图必须真在原版包里
  node tests/designer-app.test.mjs        # 编辑器外壳：自带 DOM 桩，无浏览器也能跑真实操作路径
  npx tsc && npx tsc-alias && node tests/designer-codegen.test.mjs   # 代码生成 + ★与真实框架类交叉验证
  ```
- ★ **镜像不许漂移**：`tools/designer/src/preview.js` 是框架序列化语义的**镜像实现**，靠 `designer-codegen` 的交叉验证兜底（真实 `dist/core/ui` 类 vs 镜像逐字段相等；并把生成的 TS **换 import、剥 submit 后真的执行一遍**再对产物）。**不要**为了让测试变绿放宽这条断言。
- 三条硬约定：① **一个工程 = 一个 UI 文件 = 一条路由**（文件与 namespace 都是 `ns_nm`：`new SapdonFormUI("sapdon_ui:apple", …)` → `ui/sapdon_ui_apple.json`；同 `ns_nm` 重复 `new` 会互相覆盖 + `_ui_defs` 重复，见 `ui-designer.md` §6.1/§12.2）② 属性只有"**已声明**"才进产物，所以编辑器属性面板是三态的（赋默认值 ≠ 未声明）③ 代码生成**单向**，手写代码不回读。
- 属性面只有一处事实来源：`tools/designer/src/catalog.js`（属性面板 / 代码生成 / 产物预览都只读它）；版面语义只有一处：`src/layout.js`。
- 本轮从产物取证的两条引擎级事实（**设计决策的依据，不是笔记**）：`FormButtonGrid` 的 `pos` = 目标格、`offset` = 补偿量（`ui-lessons.md` §4.2 补注）；同 namespace 重复 `new UISystem` 会覆盖（`ui-designer.md` §12.2）。
