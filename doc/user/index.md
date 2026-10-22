# Sapdon 教程导读

一份「先读什么、后读什么」的地图。全部文档在 `doc/` 下，本页只负责指路，不重复正文。

- 想立刻跑通一个包 → [快速入门](./quick-start.md)
- English? → [condensed English edition](../en/README.md)
- 想查某个 API 的签名和参数 → `doc/user/api/`
- 想查踩坑记录 → [已知坑清单](../dev/known-pitfalls.md)（按症状检索）

---

## 1. 全景地图

| 层 | 文档 | 作用 |
|----|------|------|
| 入门 | [快速入门](./quick-start.md) | 装 CLI → `create` → `build` → 看到 `dev/` 里的双包 |
| 教程 | [物品](./tutorials/item.md) | 基础物品、食物、四种盔甲、可附着物、翻书、组件、`format_version` |
| 教程 | [方块](./tutorials/block.md) | 基础、多变体、可旋转、几何、作物、矿物、方块组件、`TileBlock` |
| 教程 | [实体](./tutorials/entity.md) | 行为包组件/属性/事件、资源包、AI、Dummy、抛射物、Native、展示实体 |
| 教程 | [配方](./tutorials/recipe.md) | 有序/无序/熔炉 ×「简写 / 链式」两套写法，配方标签 |
| 教程 | [纹理](./tutorials/texture.md) | `res/` 目录约定、物品/方块/翻书纹理注册、贴图不显示排查 |
| 教程 | [运行期脚本](./tutorials/runtime-script.md) | `scripts/` 入口、事件订阅、自定义组件、定时与持久化、调试 |
| 教程 | [构建与发布](./tutorials/publish.md) | 构建模式选择、`.mcaddon` 打包、发出去前的 UUID/版本检查 |
| 教程 | [UI 页面壳](./tutorials/sapdon-ui.md) | 内容面板 + 按键面板 + 表单按钮，含完整可运行示例 |
| 专题 | [手册 SapdonGuideBook](../guidebook.md) | 三层手册结构、页类型、路由协议、多语言、§7 从零教程 |
| 参考 | API 参考 | [item](./api/item.md) / [block](./api/block.md) / [entity](./api/entity.md) / [recipe](./api/recipe.md) / [runtime](./api/runtime.md) / [sapdon-ui](./api/sapdon-ui.md) / [biome](./api/biome.md) / [feature](./api/feature.md) / [texture](./api/texture.md) / [extra](./api/extra.md) |
| 参考 | [build.config](./config/build-config.md)、[mod.info](./config/mod-info.md) | 构建与元数据字段 |
| 排错 | [FAQ](./faq.md) | 11 条高频问题：产物不更新、依赖不生效、同步路径、HMR… |

`doc/dev/` 是**框架贡献者**文档（架构、CLI、core、OC、UI 生成、工作流），做模组不需要读；改框架前必读 `workflow.md` 与 `known-pitfalls.md`。

---

## 2. 推荐学习路径

### 路线 A：第一次做模组（半天）

1. [快速入门](./quick-start.md) —— 跑通 `npx sapdon create` + `sapdon build .`，确认 `dev/<name>_BP` 与 `_RP` 都生成了
2. [物品教程](./tutorials/item.md) —— 只读 §1 基础物品 + §6 组件，先建立「API 建对象 → `registry.submit()` → 生成 JSON」的直觉
3. [纹理教程](./tutorials/texture.md) —— 让你的图标不是紫黑格
4. [方块教程](./tutorials/block.md) §1–§3 —— 基础方块、六面贴图顺序、旋转
5. [配方教程](./tutorials/recipe.md) §1 —— 让新方块/物品能拿到
6. [实体教程](./tutorials/entity.md) §1–§5 —— 行为包与资源包必须成对，理解 `behavior` / `resource` 两个入口
7. [build.config](./config/build-config.md) —— 知道 `buildMode` 三档（`dev` / `prod` / `debug`）差在哪

跑通后进游戏验证。**构建成功 ≠ 游戏内可用**，`dev/` 里 JSON 对不对要用实际加载来确认。

### 路线 B：做有交互的模组（机器、容器、自定义组件）

1. [运行期脚本教程](./tutorials/runtime-script.md) §1–§3 —— 先分清构建期与运行期，再写第一个事件订阅
2. [运行期脚本教程](./tutorials/runtime-script.md) §5 —— 自定义组件的「构建期声明 id + 运行期注册实现」
3. [运行期 API](./api/runtime.md) §0、§2 —— `@sapdon/core` 与 `@sapdon/runtime` 的分层铁律、分块持久化
4. [方块教程](./tutorials/block.md) §7 方块组件 + §8 `TileBlock`
5. [FAQ](./faq.md) §4、§9 —— 产物不更新 / JSON 没生成时的判据

⚠️ 带 `container` 组件的方块会吃掉右键，`onPlayerInteract` 不触发；这类机器逻辑要走 tick。详见 `doc/dev/known-pitfalls.md`。

### 路线 C：做界面

1. [UI 页面壳教程](./tutorials/sapdon-ui.md) —— 声明式定义 + `registry.submit()` 生成 UI JSON
2. [UI API 参考](./api/sapdon-ui.md) —— `ServerFormUI` / `SapdonFormUI` / `FormButtonGrid` 的槽位规则
3. [手册专题](../guidebook.md) §5–§7 —— 路由协议、分页、完整手册示例
4. 对照 `examples/test_ui`、`examples/hello_ui`、`examples/guidebook_demo`

`FormButtonGrid.addButton(index, ...)` 的 `index` 是**运行期槽位序号**，不是视觉位置；索引卡从槽 3 起。这条看 `doc/guidebook.md` §5。

### 路线 D：世界生成

[生物群系与特征 API](./api/biome.md) → [地物 API](./api/feature.md)。这两块目前**只有参考文档，没有 step-by-step 教程**，直接照 §完整示例 改。

### 路线 E：出包

[构建与发布](./tutorials/publish.md) —— 模式选择、UUID 检查、`.mcaddon` 打包。

---

## 3. 每篇教程的前置与产出

| 教程 | 前置 | 读完能做出 |
|------|------|-----------|
| 物品 | 快速入门 | 带贴图/食物值/耐久/自定义组件的物品 |
| 纹理 | 快速入门 | 自定义图标与方块贴图，能查出紫黑格的原因 |
| 方块 | 快速入门、纹理（建议） | 六面贴图方块、多变体、可旋转、作物、矿物、容器方块 |
| 实体 | 快速入门 | 自定义生物（行为+资源成对）、抛射物、展示实体 |
| 配方 | 物品/方块 | 工作台与熔炉配方，带标签控制 |
| 运行期脚本 | 快速入门 + 方块/物品任一篇 | 能响应事件的脚本、自定义组件、tick 逻辑 |
| UI | 快速入门 + 运行期脚本 | 自定义 Server Form 页面壳、按钮网格、可翻页列表 |
| 手册 | UI（建议） | 带分类/词条/分页的游戏内手册 |
| 构建与发布 | 能构建出可用包 | 可分发 `.mcaddon`，UUID 不撞车 |

构建期教程都遵循同一模式：**在 `main.ts` 里建对象 → 加组件 → 最后 `registry.submit()`**。漏掉 `submit()` 就什么都不会生成。

---

## 4. 配套示例

| 主题 | 示例目录 |
|------|---------|
| 物品全家桶（自定义武器、投掷物） | `examples/items_demo` |
| 方块 | `examples/block_demo` |
| 实体 / AI | `examples/more-golem`、`examples/gomoku` |
| UI | `examples/test_ui`、`examples/hello_ui` |
| 手册 | `examples/guidebook_demo` |
| 运行期脚本（OC 组件体系） | `examples/oc-launch`、`examples/oc-vehicle` |
| 运行期逻辑（电路、管道、电网） | `examples/digitCircuit`、`examples/fluid_pipe`、`examples/power_grid` |
| 原版复刻 | `examples/vanilla_recreation` |

有 README 的示例：`digitCircuit`、`fluid_pipe`、`lr-framework`、`more-golem`、`power_grid`，其余直接看 `main.ts` 与 `build.config`。

---

## 5. 文档现状与约定

### 5.1 环境要求

Node.js **18+**（`README.md`、`quick-start.md`、`package.json` 的 `engines` 三处已统一）。

### 5.2 已归档

`doc/archive/hello_sapdon/hello_sapdon.md` 是 v1 时代的老教程，已归档并加弃用说明，**不要照做**。
它用的 `main.mjs`、`import "../src/core"`、`defaultConfig` 配置格式都已废弃。

### 5.3 仍缺的部分

- **端到端完整模组**：现有教程都是单点主题，没有一篇从零做一个「有方块、有物品、有配方、有交互」的完整包
- **世界生成的教程**：`biome.md` / `feature.md` 只有参考文档
- **自定义命令、输入系统**：只有 API 层面的说明

### 5.4 写文档时的约定

| 内容 | 写在哪 |
|------|--------|
| 参数语义、默认值、抛错条件 | 源码 JSDoc 与 `doc/user/api/**` |
| 引擎/框架的坑 + 实测证据 | `doc/dev/known-pitfalls.md`（按症状检索） |
| 上手步骤、完整可运行示例 | `doc/user/tutorials/**` |
