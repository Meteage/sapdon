export namespace UiAPI {
    function createUISystem(identifier: any, path: any): UISystem;
    function createUIElement(id: any, type: any, template: any): UIElement;
    function createPanel(id: any, template: any): Panel;
    function createImage(id: any, template: any): Image;
    function createLabel(id: any, template: any): Label;
}
import { UISystem } from "../ui/systems/UISystem.js";
import { UIElement } from "../ui/elements/UIElement.js";
import { Panel } from "../ui/elements/Panel.js";
import { Image } from "../ui/elements/Image.js";
import { Label } from "../ui/elements/Label.js";
