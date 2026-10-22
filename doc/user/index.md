# 文档地图

`sapdon` 的文档分两摊：`doc/user/` 是给做包的，`doc/dev/` 是给改框架的。这一页只指路。

## 第一次用

[快速入门](./quick-start.md)：装 CLI、`create` 一个项目、构建，最后在 `dev/` 里看到行为包和资源包。跟着敲完，游戏里应该能加载一个只有物品的空包。

跑通之后再挑下面的教程。构建期的东西都遵循同一个节奏：在 `main.ts` 里建对象、加组件、最后 `registry.submit()`。漏掉 `submit()` 什么都不会生成。

## 想做什么

| 目标 | 去哪 |
|---|---|
| 一个能在创造菜单拿到的物品 | [物品教程](./tutorials/item.md) |
| 一个能放下、能换面的方块 | [方块教程](./tutorials/block.md) |
| 一个会走会攻击的生物 | [实体教程](./tutorials/entity.md) |
| 让物品或方块能合成 | [配方教程](./tutorials/recipe.md) |
| 一个服务器表单界面 | [UI 教程](./tutorials/sapdon-ui.md) |
| 游戏内带分类和翻页的手册 | [手册专题](../guidebook.md) |
| 让物品的图标显示出来 | [加贴图](./guides/textures.md) |
| 让方块响应交互或按 tick 工作 | [让脚本跑起来](./guides/scripts.md) |
| 打一个 `.mcaddon` 发给别人 | [打包与分发](./guides/packaging.md) |

## 怎么查

签名、参数、默认值、抛错条件在参考区：[物品](./api/item.md)、[方块](./api/block.md)、[实体](./api/entity.md)、[配方](./api/recipe.md)、[运行期](./api/runtime.md)、[UI](./api/sapdon-ui.md)、[纹理](./api/texture.md)、[生物群系](./api/biome.md)、[地物](./api/feature.md)、[扩展](./api/extra.md)，以及 [build.config](./config/build-config.md)、[mod.info](./config/mod-info.md)。

按症状查问题，看 [FAQ](./faq.md)。框架和引擎的坑，包括报错原文和出处，在 [已知坑清单](../dev/known-pitfalls.md)。那份文档是给框架贡献者写的，但做包的人遇到「版本对了还是不生效」这类问题，答案往往在里面。

## 文档怎么分

| 目录 | 是什么 | 读完应该 |
|---|---|---|
| `tutorials/` | 教程，从零做一个东西 | 跟着敲完，产物能跑 |
| `guides/` | 任务指南，解决一件具体的事 | 手上的问题解决了 |
| `api/`、`config/` | 参考，只描述事实 | 查到了参数和失败条件 |
| `../guidebook.md` | 手册框架专题 | 理解了分页与路由的规则 |
| `../dev/` | 框架原理与坑 | 知道为什么这样设计 |

一页只干一件事。看到教程里塞满参数表、或者参考文档开始讲「推荐这样做」，那就是该拆了。写法约定见 [文档写作规范](../dev/writing-guide.md)。

## 配套示例

`examples/` 下每个目录都是一个完整可构建的项目，比教程更接近真实用法。物品看 `items_demo`，方块看 `block_demo`，实体与 AI 看 `more-golem`、`gomoku`，UI 看 `test_ui`、`hello_ui`，手册看 `guidebook_demo`，运行期组件体系看 `oc-launch`，复杂运行期逻辑看 `digitCircuit`、`fluid_pipe`、`power_grid`。

有 README 的是 `digitCircuit`、`fluid_pipe`、`lr-framework`、`more-golem`、`power_grid`，其余直接读 `main.ts` 和 `build.config`。

## 还缺的

目前没有一篇从零做出「有方块、有物品、有配方、有交互」的完整包，教程都是单点主题。世界生成（[biome](./api/biome.md)、[feature](./api/feature.md)）只有参考文档，没有步骤。自定义命令和输入系统同理。这几块先照着 API 文档和示例改。
