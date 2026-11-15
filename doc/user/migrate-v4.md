# 从 3.x 迁移到 4.0

4.0 有两处会直接影响现有代码：**UI 从 `@sapdon/core` 拆到 `@sapdon/ui`**，以及**构建链路协议化**。
按下面两步改，业务代码不需要动。

---

## 1. 拆 import：UI 改从 `@sapdon/ui` 导入

`@sapdon/core` 不再导出任何 UI 类。把原来的一个 import 拆成两个：

```ts
// 3.x
import { ItemAPI, registry, SapdonFormUI, Panel, Label } from '@sapdon/core'

// 4.0
import { ItemAPI, registry } from '@sapdon/core'
import { SapdonFormUI, Panel, Label } from '@sapdon/ui'
```

**留在 `@sapdon/core` 的**：`ItemAPI` / `BlockAPI` / `EntityAPI` / `RecipeAPI` / `BiomeAPI` /
`FeatureAPI`、各种 `*Component`、`registry` / `GRegistry`、`TextureManager`、`AddonManifest*`（仍 re-export）。

**改到 `@sapdon/ui` 的**：

| 分类 | 符号 |
|---|---|
| 元素 | `UIElement` `Panel` `StackPanel` `Grid` `CollectionPanel` `ScrollingPanel` `Label` `Image` `Button` |
| 属性包 | `Control` `Layout` `Sprite` `Text` `Input` `ScrollView` `Sound` `GridProp` `DataBinding` `Factory` |
| 通用 | `ButtonMapping` `DataBindingObject` `UISystem` `UISystemRegistry` `UiAPI` |
| 落地系统 | `ChestUISystem` `ContainerUISystem` `HudUISystem` `HudStatePanel` `HudProgressBar` |
| 表单 / 手册 | `ServerFormUI` `SapdonFormUI` `SapdonGuideBook` `FormButton` `FormButtonGrid` `PagePanelManage` `SapdonButton` |
| 类型 | `GuideBookCategory` `GuideBookChapter` `GuideBookPageType` `ProgressSlotOptions` `ProgressClipDirection` 等 |

> 报错形态：`The requested module '@sapdon/core' does not provide an export named 'Label'` —— 就是这一条没改。

---

## 2. 确认 `@sapdon/ui` 已安装

- **新项目**：`npm i -D sapdon@^4.0.0` 会带上 `@sapdon/core` / `@sapdon/ui` / `@sapdon/runtime` / `@sapdon/utils`，
  不需要 `sapdon lib`，也不需要 `postinstall`。
- **3.x 创建的旧项目**：保留原来的 `postinstall: sapdon lib` 可以继续工作；也可以删掉它，改用
  `npm i -D sapdon@^4.0.0`。
- **框架仓库 / 示例**：仍然可以用 `npx sapdon lib` 把 `prod/` 拷进项目的 `node_modules/@sapdon/`。

---

## 3. 构建协议：CLI 与 core 必须同版本

`registry.submit()` 现在提交 `sapdon-build/1` 的 `BuildPacket`（图集、组件脚本、注册索引都在 core 侧解析，
CLI 只写盘）。**调用方式不变**，但：

- 项目里的 `@sapdon/core` 与 `sapdon` CLI 必须升到同一版本；
- 版本不一致时构建会直接报 `构建协议不匹配：CLI 期望 sapdon-build/1…`，不会猜着写；
- `GRegistry.submit()` 与 `registry.submit()` 现在是同一条管线，选哪个都行。

`AddonManifest*` 类移到了 `@sapdon/utils`，但 `@sapdon/core` 仍 re-export，`import { AddonManifest } from '@sapdon/core'` 不受影响。

---

## 4. 改动清单（照抄即可）

1. 全局搜 `from '@sapdon/core'`；
2. 把上表里的 UI 符号拆到 `import ... from '@sapdon/ui'`；
3. `npm i -D sapdon@^4.0.0`（新项目）或 `npx sapdon lib`（框架仓库 / 旧项目）；
4. `npx sapdon compile`，确认退出码为 0；
5. 进游戏检查 UI 页面（表单 / 手册 / 容器 / HUD）。
