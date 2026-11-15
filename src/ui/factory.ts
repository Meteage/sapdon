import { GRegistry } from '../utils/registry.js'
import { Image } from './elements/image.js'
import { Label } from './elements/label.js'
import { Panel } from './elements/panel.js'
import { UIElement } from './elements/uiElement.js'
import { UISystem } from './systems/system.js'

const registerUISystem = (ui_system: UISystem) => {
    GRegistry.register(ui_system.name, "behavior", ui_system.path, ui_system)
}

/**
 * UI 工厂入口（`@sapdon/ui`）。
 * 与 `BlockAPI` / `ItemAPI` 同风格，创建实例并登记进注册表。
 */
export const UiAPI = {
    createUISystem(identifier: string, path: string) {
        const ui_system = new UISystem(identifier, path)
        registerUISystem(ui_system)
        return ui_system
    },
    createUIElement(id: string, type?: string, template?: string) {
        return new UIElement(id, type, template)
    },
    createPanel(id: string, template?: string) {
        return new Panel(id, template)
    },
    createImage(id: string, template?: string) {
        return new Image(id, template)
    },
    createLabel(id: string, template?: string) {
        return new Label(id, template)
    }
}
