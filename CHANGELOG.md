# 更新日志

本文件记录**下游项目可感的变化**：新增能力、行为变化、升级时要动的地方。

- 接口语义（参数 / 默认值 / 抛错条件 / 调用时机）看源码 JSDoc 与 `doc/user/**`；
- 引擎与框架的坑（症状 / 原因 / 规避 / 出处）看 `doc/dev/known-pitfalls.md`；
- 2024–2025 的逐条开发沿革看 [log.md](./log.md)（另一种更老的流水口径，**不再往下续写**）。

---

## 3.7.0

> ⚠️ **本次有破坏性变更**：UI 表单入口改名（`SapdonServerUI` → `ServerFormUI`、`SapdonPanel` → `SapdonFormUI`），
> 屏根面板元素名固定为 `root`，UI 文件与 namespace 统一成 `ns_nm`。
> **升级前请先读「破坏性变更」两节**：其中的产物改名会让手工写死的旧引用名失效。

### ⚠️ 破坏性变更一：`SapdonPanel` + `registerPage` 两段，合成一句 `new SapdonFormUI(...)`

| 符号 | 3.6.0 | 3.7.0 |
|---|---|---|
| 表单路由壳 | `SapdonServerUI` | **`ServerFormUI`**（改名，**不留别名**） |
| 单屏入口 | `SapdonPanel` | **`SapdonFormUI`**（`SapdonPanel` 整个类已删除） |
| 一屏多页面 | 无（自己写 `addVariable` + `addDataBinding`） | `PagePanelManage`（新增，构建期） |

迁移对照（旧写法两段 → 新写法一句）：

```ts
// 3.6.0：先建 UI 文件，再单独注册路由
new SapdonPanel('sapdon_ui_machine')
    .setContent(machineContent)
    .setButtons(machineButtons)
    .build()

SapdonServerUI.registerPage({
    panelId: 'sapdon_ui:machine',
    name: 'machine',
    contentPanel: 'sapdon_ui_machine.machine_content_panel',
    buttonsPanel: 'sapdon_ui_machine.machine_buttons_panel',
})
```

```ts
// 3.7.0：构造即建根面板 + 注册路由
new SapdonFormUI('sapdon_ui:machine', machineContent, machineButtons)
```

- 第一个参数必须是 `"ns:nm"`：`ns` 决定 UI 文件与 namespace（`ns_nm`），`nm` 决定路由 `panelId = sapdon_ui:<nm>`；
  两个面板都必填，传 `undefined` 或标识串不合法**构建期抛错**（以前 `.setContent(undefined)` 是静默的）。
- 想手工拼装（低层逃生门）：`UISystem` + `ServerFormUI.createPageRoot({ panelId, contentRef, buttonsRef })`
  + `ServerFormUI.registerPage({ ... })`。注意 **`createPageRoot()` 去掉了 `name` 参数**（根面板名固定 `root`），
  `registerPage()` 的签名与字段不变。
- 一屏多页面**不再靠多个根面板**（同一份 UI 文件里同名元素会互相覆盖）：在内容面板里放多块面板 + 每块一条门控，
  交给 `PagePanelManage`（`.addPage(panel, tag?)`，或构造时传 `{ container, pages, mode }`）。
  默认 `mode: 'prefix'`（与手册产物逐字一致），另有 `'eq'`。

### ⚠️ 破坏性变更二：屏根面板固定叫 `root`，UI 文件名与 namespace 都是 `ns_nm`

| 项 | 3.6.0 | 3.7.0 |
|---|---|---|
| 屏幕根面板的元素名 | 调用方给的名字（手册是 `handbook`） | **固定 `root`** |
| UI 文件 | `ui/<ns>.json`（手册是 `ui/handbook.json`） | `ui/<ns>_<nm>.json`（手册是 `ui/synth_handbook.json`） |
| 文件里的 `namespace` | `<ns>`（`synth`） | `<ns>_<nm>`（`synth_handbook`） |
| 文件内引用 | `content@synth.handbook_content_panel` | `content@synth_handbook.handbook_content_panel` |
| `server_form.json` 的 factory | `long_form: "@synth.handbook"` | `long_form: "@synth_handbook.root"`（factory **id 不变**） |
| `_ui_defs.json` 里的项 | `"ui/handbook.json"` | `"ui/synth_handbook.json"` |
| 运行期路由（表单标题） | `sapdon_ui:handbook` | **不变** |

⇒ **下游要看的是**：

- 框架生成的部分（UI 文件、`server_form.json`、`_ui_defs.json`）自己会对齐，源码里的调用点按上一节改完即可。
- **手工写死旧引用名的地方会失效**：`@synth.handbook`、`ui/handbook.json`、`namespace "synth"` 这类字符串
  如果出现在你自己的工具、自检脚本、文档或外部配置里，要跟着改。
- **旧产物文件会被自动清掉**：构建按 `dev/.sapdon_generated_<项目>.json` 与 `.sapdon_synced_<项目>.json`
  两份清单 prune「上次有、这次没有」的文件（游戏开发包目录里的旧副本同样会清）。
  ⚠️ **清单不在时一个文件都不删** —— 清单丢了就得手工删旧 UI 文件，否则自检类工具会报「磁盘上有、但没登记」。

### 新增

- **构建期方块模型 API**（`@sapdon/core`）：`BlockModel`（`bone` / `cube` / `autoUv` / `editCube` / `removeCube` /
  `setUv` / `toJson` / `register`，另有 `boneNames` / `cubesOf`）与形状助手
  `boxFromPixels` / `post` / `slab` / `pane` / `cross`（像素坐标），配套导出 `MODEL_FACES`、`UvRect` 等类型。
  `autoUv()` 实现 Bedrock 的盒式展开（`up`/`down` 用原版那套负 `uv_size`）；零厚度平板放行并跳过退化面；
  **没铺 UV 的 cube 在 `toJson()` 时构建期抛错**（以前会静默生成一个看不见的模型）。
- **`tree_feature` 接口**：`FeatureAPI.createTreeFeature(identifier, spec)` → `TreeFeature`，
  按引擎实际接受的字段建模（`trunk` / `trunk_height` / `trunk_block`、`fancy_canopy` / `leaf_block`，
  以 `*_trunk` / `*_canopy` 结尾的键一律放行）；缺树干、两个树冠、组件名拼错、方块引用形状不对都在**构建期抛错**。
  用法见 `doc/user/api/feature.md`。
- **地物分布**：`FeatureRule.setAxisMolang(axis, molang)` 与 `FeatureDistribution.setAxisMolang(...)`
  （地表地物的 `y` 要写 `query.heightmap(variable.worldx, variable.worldz)`）；`setScatterChance(numerator, denominator)`
  （每区块散植的整体触发几率，不调用 = 不写该字段）。
- **可视化 UI 编辑器**（框架仓库内，`tools/designer/`）：Qt Designer 范式（控件箱 / 画布 / 对象树 / 属性面板 /
  产物预览 / 编译期诊断），零依赖，产物是 **sapdon TS 代码**。起服务 `node tools/designer/serve.mjs`（默认 5178）。

### 修复

- **`@sapdon/core` 的公开类型面与 3.6.0 持平**：`EntityComponent.setRideable` 的签名与返回类型逐字一致
  （`controlling_seat: number`），`prod/core/index.d.ts` 里不再有悬空引用（下游 IDE 不会无端报红）。
  `RideableComponent` / `RideableComponentDesc` / `RideableSeat` 仍与 3.6.0 一样在公开面里，现在是有意的
  `export type`（以前只是碰巧泄漏出来）。
- **`sapdon lib` 不再整条命令失败**：源与目标同一处、或源目录不存在时，改为「跳过 + 打印说明」，见下面「升级须知」。

### 升级须知

**`sapdon lib` 的语义变了（失败 → 说明并跳过）**，但它**不是**一个更新入口：

| CLI 从哪来 | lib 的源根 | 结果 |
|---|---|---|
| 框架仓库自己的 `prod/cli/start.js` | 同目录的 `prod/` | 三个包（`core` / `cli` / `runtime`）全部同步 |
| 项目的 `node_modules/sapdon/prod/cli/start.js`（`npm i -D sapdon` 的正常布局，`postinstall` 就是这条路） | 该包自带的 `prod/` | 三个包全部同步；**内容与版本号 = 这个 sapdon 包自带的** |
| 项目的 `node_modules/@sapdon/cli/start.js`（直接依赖 scoped 包） | 就是项目自己的 `node_modules/@sapdon` | 三个包**全部跳过** + 说明，退出码 0 |

- 修的是什么：以前后两种布局必炸 —— 源就是目标时 `ERR_FS_CP_EINVAL: src and dest cannot be the same`；
  目标名是发布名 `runtime` 而框架侧源目录叫 `oc`，源不存在时 `ENOENT`。现在两者都只是「跳过该包 + 一行说明」，
  **整条命令 exit 0**；跳过的包不会被覆盖（已装好的 `package.json` 原样保留）。
- **别把它当自动更新**：它只搬「CLI 自己所在的那份框架产物」，没有联网能力。
  要让项目用上 3.7.0，请升级 `sapdon` 包本身（`npm i -D sapdon@3.7.0`，`postinstall` 会把该包自带的产物铺进
  `node_modules/@sapdon/*`），或者用本地框架仓库的 `prod/` 手工同步一次。
- ⚠️ 反过来说：任何 `npm i` / `npm ci` 都会重跑 `postinstall` → `sapdon lib`，
  把 `node_modules/@sapdon/*` **覆盖回那个 sapdon 包自带的版本** —— 手工同步的状态不持久。

**其它**：

- `@sapdon/runtime` 在本版本周期内**逐字节未变**（`index.js` 的 sha256 与 3.6.0 相同）⇒ 运行期脚本（`scripts/**`）不用动。
- 公开面里消失的名字**只有** `SapdonPanel` 与 `SapdonServerUI` 两个；其余导入符号的签名逐字不变。

### 内部（不影响下游用法）

- 新增 `prod/core/index.d.ts` 自洽性护栏 `tests/prod-dts-selfcheck.test.mjs`：用真正的 TS 编译器
  （`skipLibCheck: false`）给公开产物建 Program，落在该文件内的诊断只允许**变少**（棘轮基线 = npm 3.6.0 里就有的那几条）。
- `tests/ui-buttonpanel.test.mjs`（引用了已被删掉的旧模块）换成 `tests/form-button-grid.test.mjs`。
- `AGENTS.md` 里的 CLI 入口改成事实描述（本机没有全局 junction）。

---

## 3.6.0 及更早

未逐版补写。历史沿革见 [log.md](./log.md)；每个发布点的代码内容见对应 git tag（如 `v3.6.0`）。
