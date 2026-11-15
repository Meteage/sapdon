import { Modifications, UIElement } from '../elements/uiElement.js'
import { UISystem } from './system.js'

const small_chest_screen = new UIElement('small_chest_screen', undefined, 'common.inventory_screen_common')
small_chest_screen.addVariable('new_container_title|default', '$container_title')

// ── 数据驱动方块容器（`minecraft:block_entity.container`）用的屏 ──────────────
// 引擎给「自定义方块容器」开的屏是 `data_driven_container.screen`（原版 `ui/data_driven_container_screen.json`，
// 官方 samples v1.26.60.29 起才有），它同样用 `$container_title` 做标题 —— 所以自定界面的门控**也要挂这块屏**。
// ★ 覆盖/合并它的文件**必须与原版同名** `ui/data_driven_container_screen.json`（引擎按文件名覆盖），
//   而文件名 = `UISystem.name` ⇒ 这里 name 取 `data_driven_container_screen`、namespace 取 `data_driven_container`
//   （`system.ts` 里 namespace=冒号前半、name=冒号后半；`uiSystemRegistry.ts` 用 name 拼文件名）。
// 只看方块容器的话这块屏就够了；实体容器仍走 `chest.small_chest_screen`。
const data_driven_screen = new UIElement('screen', undefined, 'common.inventory_screen_common')
data_driven_screen.addVariable('new_container_title|default', '$container_title')

export class ChestUISystem {
  static chest_screen = new UISystem('chest:chest_screen', 'ui/')
  static data_driven_chest_screen = new UISystem('data_driven_container:data_driven_container_screen', 'ui/')

  static registerContainerUI(new_container_title: string, ui_system_root_panel: string): void {
    const gate = {
      requires: `($new_container_title = '${new_container_title}')`,
      $root_panel: ui_system_root_panel,
      $screen_content: ui_system_root_panel,
    }

    // 实体容器：挂原版箱子屏
    small_chest_screen.addModification({
      array_name: 'variables',
      operation: Modifications.OPERATION.INSERT_BACK,
      value: [gate],
    })
    this.chest_screen.addElement(small_chest_screen)

    // 方块容器（数据驱动屏）：同一把门控，附带背景，保证替换后仍有暗底
    data_driven_screen.addModification({
      array_name: 'variables',
      operation: Modifications.OPERATION.INSERT_BACK,
      value: [
        {
          ...gate,
          $screen_bg_content: 'common.screen_background',
          $screen_background_alpha: 0.4,
        },
      ],
    })
    this.data_driven_chest_screen.addElement(data_driven_screen)
  }
}
