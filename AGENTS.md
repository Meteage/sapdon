# Sapdon 框架 — Agent 指令

## 项目概述
Minecraft Bedrock Addon 开发框架，提供类型安全的 TypeScript API，自动生成 JSON 包体。

## 关键路径
- **框架源码**: `src/`（CLI + core + OC + 模板）
- **构建产物**: `prod/`（由 `npm run build` 生成，**不要直接修改**）
- **全局 CLI**: `C:\nodejs\node_modules\sapdon` → junction 指向本仓库
- **开发工作流文档**: `doc/dev/workflow.md` — 框架贡献者必读
- **架构文档**: `doc/dev/architecture.md`
- **用户文档**: `doc/user/`

## 框架开发原则
1. 只修改 `src/`，不要改 `prod/` 或 `node_modules/`
2. 修改后 `npm run build` 重建 `prod/`
3. 在示例项目中通过 `npm i`（触发 `postinstall` → `sapdon lib`）或手动 `sapdon lib` 同步新库
4. 然后用 `sapdon compile` / `npm run build` 验证

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
- 拓扑仿真求值（`evalTopo`/`topoCompute`）依赖 `@minecraft/server`，Node 无法直接 import；`test/topo.test.mjs` 复制了 engine 核心（AND/NOT/寄存器写&保持/固定点共 16 断言）。**改 engine 这些函数须同步该测试副本**，运行 `node test/topo.test.mjs`。
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