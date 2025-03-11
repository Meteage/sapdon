export namespace UiAPI {
    function createUISystem(identifier: any, path: any): any;
    function createUIElement(id: any, type: any, template: any): UIElement;
    function createPanel(id: any, template: any): Panel;
    function createImage(id: any, template: any): Image;
    function createLabel(id: any, template: any): Label;
}
import { UIElement } from "../ui/elements/uiElement.js";
import { Panel } from "../ui/elements/panel.js";
import { Image } from "../ui/elements/image.js";
import { Label } from "../ui/elements/label.js";
