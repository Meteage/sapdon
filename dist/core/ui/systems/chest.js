import { Modifications, UIElement } from "../elements/uiElement.js";
import { UISystem } from "./system.js";
const small_chest_screen = new UIElement("small_chest_screen", undefined, "common.inventory_screen_common");
small_chest_screen.addVariable("new_container_title|default", "$container_title");
export class ChestUISystem {
    static chest_screen = new UISystem("chest:chest_screen", "ui/");
    static registerContainerUI(new_container_title, ui_system_root_panel) {
        small_chest_screen.addModification({
            array_name: "variables",
            operation: Modifications.OPERATION.INSERT_BACK,
            value: [
                {
                    requires: `($new_container_title = '${new_container_title}')`,
                    $root_panel: ui_system_root_panel,
                    $screen_content: ui_system_root_panel
                }
            ]
        });
        this.chest_screen.addElement(small_chest_screen);
    }
}
