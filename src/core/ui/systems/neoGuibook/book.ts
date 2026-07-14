import { ButtonMapping } from "../../buttonMapping.js";
import { DataBindingObject } from "../../dataBindingObject.js";
import { Button } from "../../elements/button.js";
import { Image } from "../../elements/image.js";
import { Label } from "../../elements/label.js";
import { Panel } from "../../elements/panel.js";
import { StackPanel } from "../../elements/stackPanel.js";
import { UIElement } from "../../elements/uiElement.js";
import { Control } from "../../properties/control.js";
import { Input } from "../../properties/input.js";
import { Layout } from "../../properties/layout.js";
import { Sprite } from "../../properties/sprite.js";
import { Text } from "../../properties/text.js";
import { ServerFormButton, ServerUISystem } from "../serverForm.js";
import { UISystem } from "../system.js";

type BookPage = {
    id: string;
    content: Panel;
}

type CustomButtonConfig = {
    id: string;
    position: "bottom_left" | "bottom_right" | "bottom_middle" | "top_left" | "top_right";
    offset: [number, number];
    size: [number | string, number | string];
    defaultTexture: string;
    hoverTexture: string;
    pressedTexture: string;
    bindingButtonName: string;
}

type ButtonTextures = {
    prevDefault?: string;
    prevHover?: string;
    prevPressed?: string;
    nextDefault?: string;
    nextHover?: string;
    nextPressed?: string;
    homeDefault?: string;
    homeHover?: string;
    homePressed?: string;
    closeDefault?: string;
    closeHover?: string;
    closePressed?: string;
}

type NeoGuidebookOptions = {
    size?: [number, number];
    background?: string;
    debug?: boolean;
    buttons?: {
        prev?: { visible?: boolean };
        next?: { visible?: boolean };
        home?: { visible?: boolean };
        close?: { visible?: boolean };
    };
    textures?: ButtonTextures;
}

export class NeoGuidebook {
    private identifier: string;
    private book_pages: BookPage[] = [];
    private size: [number, number];
    private background_image: string;
    private debug_mode: boolean;
    private system: UISystem;
    private root_panel_id: string;
    private root_panel_name: string;
    private root_panel_elements: UIElement[] = [];
    private custom_buttons: CustomButtonConfig[] = [];
    private button_visibility: Record<string, boolean> = {};
    private textures: ButtonTextures = {};
    private dirty: boolean = false;

    constructor(identifier: string, path: string, size?: [number, number], options?: NeoGuidebookOptions){
        this.identifier = identifier;
        const [namespace, name] = identifier.split(":");

        this.root_panel_name = `${name}_root_panel`;
        this.root_panel_id = `${namespace}.${this.root_panel_name}`;
        this.size = size || options?.size || [320,207];
        this.background_image = options?.background || "textures/ui/book_back";
        this.debug_mode = options?.debug || false;
        this.textures = options?.textures || {};

        if (options?.buttons) {
            if (options.buttons.prev?.visible != null) this.button_visibility["prev"] = options.buttons.prev.visible;
            if (options.buttons.next?.visible != null) this.button_visibility["next"] = options.buttons.next.visible;
            if (options.buttons.home?.visible != null) this.button_visibility["home"] = options.buttons.home.visible;
            if (options.buttons.close?.visible != null) this.button_visibility["close"] = options.buttons.close.visible;
        }

        this.system = new UISystem(identifier, path);
        ServerUISystem.bindingTitlewithContent(
            this.system.name,
            this.root_panel_id
        );

        this.initUI();
    }

    public getPageIds(): string[] {
        return this.book_pages.map(p => p.id);
    }

    public getPageCount(): number {
        return this.book_pages.length;
    }

    public addCustomButton(config: CustomButtonConfig): this {
        this.custom_buttons.push(config);
        this.dirty = true;
        this.flush();
        return this;
    }

    public addSinglePageStack(page_id: string, page_content: Panel){
        page_content.addVariable("binding_text", page_id);
        page_content.dataBinding.addDataBinding(
            new DataBindingObject().setBindingType("view")
            .setSourcePropertyName("($binding_text = #form_text)")
            .setTargetPropertyName("#visible")
        );

        this.book_pages.push({ id: page_id, content: page_content });
        this.dirty = true;
        this.flush();
    }

    public addDoublePageStack(page_id: string, left_page: Panel, right_page: Panel, ratio?: [string, string]){
        const r = ratio || ["50%", "100%"];
        const page = new StackPanel(`${page_id}_page_panel`).setOrientation("horizontal")
              .setControl(new Control().setLayer(5))
              .addVariable("binding_text", page_id)
              .addStack(r, left_page)
              .addStack(r, right_page);
              page.dataBinding.addDataBinding(
                new DataBindingObject().setBindingType("view")
                .setSourcePropertyName("($binding_text = #form_text)")
                .setTargetPropertyName("#visible")
            );

        this.book_pages.push({ id: page_id, content: page });

        this.dirty = true;
        this.flush();
    }

    private flush(){
        if (!this.dirty) return;
        this.dirty = false;
        this.updateUI();
    }

    private createPagesPanel(){
        return new Panel("book_pages_panel")
            .setLayout(new Layout().setSize(["100%","100%"]))
            .setControl(new Control().setLayer(5))
            .addControls(this.book_pages.map(page => page.content));
    }

    private initUI() {
        const elements: UIElement[] = [
            new Image("book_background")
                .setSprite(new Sprite().setTexture(this.background_image)),
            this.createBookPage(),
        ];

        if (this.button_visibility["close"] !== false) elements.push(this.createCloseButton());
        if (this.button_visibility["prev"] !== false) elements.push(this.createPageButton("prev", [7, -9], "prev_button"));
        if (this.button_visibility["next"] !== false) elements.push(this.createPageButton("next", [-7, -9], "next_button"));
        if (this.button_visibility["home"] !== false) elements.push(this.createHomeButton([0, 0], ["8%", "8%"], "home_button"));

        this.addRootElements(elements);

        if(this.debug_mode) this.addRootElement(this.createDebugText());
        this.dirty = true;
        this.flush();
    }

    private createCustomButtons(): UIElement[] {
        return this.custom_buttons.map(cfg => {
            return new UIElement(cfg.id, undefined, "server_form.sapdon_form_button_factory")
                .addVariable("binding_button_text", cfg.bindingButtonName)
                .addVariable("default_texture", cfg.defaultTexture)
                .addVariable("hover_texture", cfg.hoverTexture)
                .addVariable("pressed_texture", cfg.pressedTexture)
                .addProp("offset", cfg.offset)
                .addProp("size", cfg.size)
                .addProp("layer", 5)
                .addProp("anchor_from", cfg.position)
                .addProp("anchor_to", cfg.position);
        });
    }

    private updateUI(){
        const root_panel = new Panel(this.root_panel_name);
        root_panel.setLayout(new Layout().setSize(this.size));
        root_panel.addControls(this.root_panel_elements);
        root_panel.addControls(this.createCustomButtons());
        root_panel.addControl(this.createPagesPanel());

        this.system.addElement(root_panel);
    }

    private tex(name: string, fallback: string): string {
        return (this.textures as any)[name] || fallback;
    }

    private createCloseButton() {
        return new Button("close_button")
            .setLayout(
                new Layout()
                    .setSize([14, 14])
                    .setAnchorFrom("top_right")
                    .setAnchorTo("top_right")
            )
            .setInput(
                new Input().setButtonMappings([
                    new ButtonMapping()
                        .setMappingType("pressed")
                        .setFromButtonId("button.menu_select")
                        .setToButtonId("button.menu_exit")
                ])
            )
            .addControls([
                new UIElement("default", undefined, "book.close_button_default"),
                new UIElement("hover", undefined, "book.close_button_hover"),
                new UIElement("pressed", undefined, "book.close_button_pressed"),
            ]);
    }

    private createPageButton(type: string, offset: [number, number], bindingButtonName: string) {
        const prefix = type === "prev" ? "book_pageleft" : "book_pageright";
        const buttonId = `${type}_button`;
        const button_anchor = type === "prev" ? "left" : "right";
        return new Panel(`${buttonId}_panel`)
            .setControl(new Control().setLayer(5))
            .setLayout(
                new Layout()
                    .setSize([24, 24])
                    .setOffset(offset)
                    .setAnchorFrom(`bottom_${button_anchor}`)
                    .setAnchorTo(`bottom_${button_anchor}`)
            )
            .addControl(
                new UIElement(buttonId, undefined, "server_form.sapdon_form_button_factory")
                    .addVariable("binding_button_text", bindingButtonName)
                    .addVariable("default_texture", this.tex(type + "Default", `textures/ui/${prefix}_default`))
                    .addVariable("hover_texture", this.tex(type + "Hover", `textures/ui/${prefix}_hover`))
                    .addVariable("pressed_texture", this.tex(type + "Pressed", `textures/ui/${prefix}_pressed`))
            );
    }

    private createHomeButton(offset: [number, number], size: [number|string, number|string], bindingButtonName: string) {
        return new UIElement("home_button", undefined, "server_form.sapdon_form_button_factory")
            .addVariable("binding_button_text", bindingButtonName)
            .addVariable("default_texture", this.tex("homeDefault", "textures/ui/book_shiftleft_default"))
            .addVariable("hover_texture", this.tex("homeHover", "textures/ui/book_shiftleft_hover"))
            .addVariable("pressed_texture", this.tex("homePressed", "textures/ui/book_shiftleft_pressed"))
            .addProp("offset", offset)
            .addProp("size", size)
            .addProp("layer", 5)
            .addProp("anchor_from","bottom_middle")
            .addProp("anchor_to","bottom_middle")
    }

    private createBookPage() {
        return new StackPanel("book_page_stack_panel").setOrientation("horizontal")
        .setLayout(new Layout().setSize(this.size))
        .addVariable("page_size",[this.size[0]/2,this.size[1]])
        .addStack("$page_size",
            new Panel("book_left_panel").addControls([
                {
                    "page_crease_image@book.page_crease_left_image": {
                        "size": [ "100% - 40px", "100% - 14px" ],
                        "offset": [ 0, -2 ]
                    }
                },
                {
                    "page_edge_image@book.page_edge_left_image": {
                        "size": [ "100% - 7px", "100% - 16px" ],
                        "offset": [7,-1]
                    }
                }
            ])
        )
        .addStack("$page_size",
            new Panel("book_right_panel").addControls([
                {
                    "page_crease_image@book.page_crease_right_image": {
                        "size": [ "100% - 40px", "100% - 14px" ],
                        "offset": [ 0, -2 ]
                    }
                },
                {
                    "page_edge_image@book.page_edge_right_image": {
                        "size": [ "100% - 7px", "100% - 16px" ],
                        "offset": [-7,-1]
                    }
                }
            ])
        );
    }

    private createDebugText() {
        return new Panel("data_text_panel")
            .setLayout(new Layout().setSize([64, 8*8]).setAnchorFrom("top_middle").setAnchorTo("top_middle"))
            .setControl(new Control().setLayer(5))
            .addControl(new Label("data_content").setText(
                new Text().setText("#form_text").setColor([0,0,0])
            ));
    }

    public registerElement(element: UIElement){
        this.system.addElement(element);
        return this;
    }

    public addRootElement(element: UIElement){
        this.root_panel_elements.push(element);
        return this;
    }

    public addRootElements(elements: UIElement[]){
        for(let i in elements){
            this.addRootElement(elements[i]);
        }
        return this;
    }
}
