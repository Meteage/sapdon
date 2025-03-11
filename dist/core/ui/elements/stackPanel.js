import { Layout } from "../properties/layout.js";
import { Panel } from "./panel.js";
export class StackPanel extends Panel {
    constructor(id, template) {
        super(id, template);
        this.type = "stack_panel";
        this.orientation = "vertical";
        this.stackNum = 0;
        //init
        this.setLayout(new Layout().setSize(["100%", "100%"]));
    }
    addStack(size, content, debug = false) {
        const stack = new Panel(`stack${this.stackNum}`)
            .setLayout(new Layout().setSize(size))
            .addControl(content);
        if (debug)
            stack.enableDebug();
        this.addControl(stack);
        this.stackNum++;
        return this;
    }
    /**
     * Possible values:
        vertical
        horizontal
     * @param {*} orientation
     */
    setOrientation(orientation) {
        this.orientation = orientation;
        return this;
    }
    serialize() {
        this.properties.set("type", "stack_panel");
        this.properties.set("orientation", this.orientation);
        return super.serialize();
    }
}
