export namespace UiAPI {
    function createUISystem(identifier: any, path: any): UISystem;
    function createUIElement(id: any, type: any, template: any): UIElement;
    function createPanel(id: any, template: any): Panel;
    function createImage(id: any, template: any): Image;
    function createLabel(id: any, template: any): Label;
}
import { UISystem } from "../ui/systems/system.js";
import { UIElement } from "../ui/elements/uiElement.js";
import { Panel } from "../ui/elements/panel.js";
import { Image } from "../ui/elements/image.js";
import { Label } from "../ui/elements/label.js";
