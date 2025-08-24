import { Control, Label, Layout, Panel, StackPanel, Text, UIElement, ServerFormButton, Image, Sprite } from "../../export.js";

// 空占位组件
export class EmptySpace extends Panel {
    constructor(id: string, size: [string, string] = ["100%", "100%"]) {
        super(id, undefined);
        this.setLayout(new Layout().setSize(size));
    }
}

// 标题组件
export class BookTitle extends Label {
    constructor(id: string, title: string, size: [string, string] = ["100%", "100%"]) {
        super(id, undefined);
        this.setText(new Text().setText(title).setColor([0, 0, 0]))
            .setControl(new Control().setLayer(5))
            .setLayout(new Layout().setAnchorTo("center"));
    }
}

export class BookTitleBar extends Panel{
    private size:[string,string];
    constructor(id:string,text:string,size?:[string,string]){
        super(id,undefined);
        this.size = size || ["100%","100%"];
        this.addControls([
            //背景图片
            new StackPanel("book_bg_bar",undefined).setOrientation("horizontal")
            .addStack(["80%","100%"], 
                new Image("part1",undefined).setSprite(
                    new Sprite().setTexture("textures/ui/saleribbon")
                )
            ),
            new StackPanel("book_text",undefined).setOrientation("horizontal")
            .addStack(["60%","100%"],
                new Label("book_title",undefined).setText(
                    new Text().setText(text).setColor([0,0,0])
                ).setControl(new Control().setLayer(5))
            )
        ])
    }
    public getSize(){
        return this.size;
    }
}

// 分割线组件
export class Divider extends StackPanel {
    constructor(id: string, size: [string, string] = ["100%", "100%"]) {
        super(id, undefined);
        this.setOrientation("horizontal")
            .setLayout(new Layout().setSize(size))
            .addStack(["10%", "100%"], new EmptySpace("divider_left"))
            .addStack(["80%", "100%"], new UIElement("p", undefined, "settings_common.option_group_section_divider"))
            .addStack(["10%", "100%"], new EmptySpace("divider_right"));
    }
}

// 书籍按钮组件
export class BookButton extends ServerFormButton {
    constructor(id: string, texture: string, size: [string, string] = ["100%", "100%"]) {
        super(id, id);
        this.setDefaultTexture(texture)
            .setHoverTexture(texture);
    }
}

// 图片组件
export class BookImage extends Image {
    constructor(id: string, texture: string, size: [string, string] = ["100%", "100%"]) {
        super(id, undefined);
        this.setSprite(new Sprite().setTexture(texture));
    }
}

// 书籍分类网格组件
export class BookCategoryGrid extends StackPanel {
    constructor(id: string, row: number, col: number, buttons: Array<{id: string, texture: string}>) {
        super(id, undefined);
        this.setControl(new Control().setLayer(6));
        
        // 计算每个按钮的宽度和高度百分比
        const buttonWidth = `${100 / col}%`;
        const buttonHeight = `${100 / row}%`;
        
        // 创建行
        for (let r = 0; r < row; r++) {
            const buttonRow = new StackPanel(`button_row_${r}`, undefined)
                .setOrientation("horizontal");
            
            // 为每行添加列
            for (let c = 0; c < col; c++) {
                const index = r * col + c;
                if (index < buttons.length) {
                    const button = buttons[index];
                    buttonRow.addStack(
                        [buttonWidth, "100%"], 
                        new BookButton(button.id, button.texture, ["100%", "100%"])
                    );
                } else {
                    // 添加空占位
                    buttonRow.addStack(
                        [buttonWidth, "100%"], 
                        new EmptySpace(`empty_${r}_${c}`)
                    );
                }
            }
            
            // 添加行到网格
            this.addStack(["100%", buttonHeight], buttonRow);
        }
    }
}

//创建配方网格组件
export class BookRecipeGrid extends StackPanel {
    constructor(id: string, row: number, col: number, items: string[]) {
        super(id, undefined);
        this.setControl(new Control().setLayer(6));
        
        // 计算每个按钮的宽度和高度百分比
        const buttonWidth = `${100 / col}%`;
        const buttonHeight = `${100 / row}%`;
        
        // 创建行
        for (let r = 0; r < row; r++) {
            const buttonRow = new StackPanel(`button_row_${r}`, undefined)
                .setOrientation("horizontal");
            
            // 为每行添加列
            for (let c = 0; c < col; c++) {
                const index = r * col + c;
                if (index < items.length) {
                    const button = items[index];
                    buttonRow.addStack(
                        [buttonWidth, "100%"], 
                        new BookImage(`item_${index}`, button, ["100%", "100%"])
                    );
                } else {
                    // 添加空占位
                    buttonRow.addStack(
                        [buttonWidth, "100%"], 
                        new EmptySpace(`empty_${r}_${c}`)
                    );
                }
            }
            
            // 添加行到网格
            this.addStack(["100%", buttonHeight], buttonRow);
        }
    }
}

// 章节项组件
export class ChapterItem extends Panel {
    constructor(index: number, chapterName: string, texture: string) {
        super(`item_panel${index}`, undefined);
        
        const contentStack = new StackPanel(`item_${index}`, undefined)
            .setOrientation("horizontal")
            .addStack(["15%", "100%"], new EmptySpace("left_space"))
            .addStack(["10%", "100%"], 
                new Image(`image_${index}`, undefined)
                    .setSprite(new Sprite().setTexture(texture))
            )
            .addStack(["60%", "100%"],
                new Label("text", undefined)
                    .setText(new Text()
                        .setText(chapterName)
                        .setColor([0, 0, 0])
                        .setTextAlignment("left")
                    )
            )
            .addStack(["15%", "60%"],
                new ServerFormButton(`item_${index}_warning`, `item_${index}_button`)
                    .setDefaultTexture("textures/ui/ErrorGlyph")
                    .setHoverTexture("textures/ui/ErrorGlyph")
            );
        
        const backgroundButton = new ServerFormButton(`item_${index}_button`, `item_${index}_button`)
            .setDefaultTexture("")
            .setHoverTexture("textures/ui/promotion_slot");
        
        this.addControls([contentStack, backgroundButton]);
        this.setLayout(new Layout().setSize(["100%", "100%"]));
    }
}

// 主页面类 - 整合书籍分类和章节目录
export class NeoGuidebookPage {
    private panel: StackPanel;
    private categories: Array<{title: string, buttons: Array<{id: string, texture: string}>}>;
    private chapters: Array<{chapter_name: string, chapter_texture: string}>;

    constructor(id: string, size: [string, string] = ["100%", "100%"]) {
        this.panel = new StackPanel(id, undefined);
        this.panel.setOrientation("vertical");
        this.panel.setLayout(new Layout().setSize(size));
        
        this.categories = [];
        this.chapters = [];
    }

    // 添加分类标题
    addCategoryTitle(title: string, size: [string, string] = ["100%", "10%"]): this {
        this.panel.addStack(size, new BookTitle("book_category_title", title));
        return this;
    }

    addBookTitleBar(text: string, size: [string, string] = ["100%", "15%"]){
        this.panel.addStack(size,new BookTitleBar("book_titile_bar",
            text
        ))
        return this;
    }

    addBookText(text:string,size: [string, string] = ["100%", "15%"],){
        this.panel.addStack(size,new BookTitle("text",text))
        return this;
    }

    // 添加空占位
    addEmptySpace(size: [string, string] = ["100%", "5%"]): this {
        this.panel.addStack(size, new EmptySpace("empty_space"));
        return this;
    }

    // 添加分割线
    addDivider(size: [string, string] = ["100%", "5%"]): this {
        this.panel.addStack(size, new Divider("divider"));
        return this;
    }

    // 添加配方网格
    addRecipeGrid(row: number, col: number, items: string[], size: [string, string] = ["100%", "30%"]): this {
        this.panel.addStack(size, new BookRecipeGrid("recipe_grid", row, col, items));
        return this;    
    }


    // 添加书籍分类
    addBookCategory(title: string,row: number, col: number, buttons: Array<{id: string, texture: string}>): this {
        this.categories.push({ title, buttons});
        
        // 添加标题
        this.addCategoryTitle(title);
        this.addEmptySpace();
        this.addDivider();
        
        // 添加分类网格
        const container = new StackPanel("book_layout", undefined)
            .setOrientation("horizontal")
            .addStack(["20%", "100%"], new EmptySpace("left_space"))
            .addStack(["60%", "100%"], new BookCategoryGrid("book_category_grid",row,col,buttons))
            .addStack(["20%", "100%"], new EmptySpace("right_space"));
        
        this.panel.addStack(["100%", "30%"], container);
        this.addEmptySpace();
        
        return this;
    }

    // 添加章节
    addChapter(chapterName: string, texture: string): this {
        this.chapters.push({ chapter_name: chapterName, chapter_texture: texture });
        return this;
    }

    // 添加多个章节
    addChapters(chapters: Array<{chapter_name: string, chapter_texture: string}>): this {
        this.chapters.push(...chapters);
        return this;
    }

    // 构建章节目录部分
    buildChapterList(): this {
        if (this.chapters.length === 0) return this;

        // 添加空占位
        this.addEmptySpace();
        
        // 添加标题
        this.panel.addStack(["100%", "10%"], 
            new BookTitle("book_chapter", "Chapters")
        );

        // 添加分割线
        this.addDivider();

        // 添加章节列表
        this.chapters.forEach(({chapter_name, chapter_texture}, index) => {
            this.panel.addStack(["100%", "10%"], 
                new ChapterItem(index, chapter_name, chapter_texture)
            );
        });

        return this;
    }

    // 获取最终面板
    getPanel(): StackPanel {
        return this.panel;
    }

    // 清空内容
    clear(): this {
        this.panel = new StackPanel(this.panel.id, undefined);
        this.panel.setOrientation("horizontal");
        this.categories = [];
        this.chapters = [];
        return this;
    }
}
/*
// 使用示例
export function createExampleGuidebook(): NeoGuidebookPage {
    const guidebook = new NeoGuidebookPage("main_guidebook");
    
    // 添加书籍分类
    const categoryButtons = [
        { id: "chapter_1", texture: "textures/items/apple" },
        { id: "chapter_2", texture: "textures/items/iron_ingot" },
        { id: "chapter_3", texture: "textures/items/gold_ingot" },
        { id: "chapter_4", texture: "textures/items/diamond" }
    ];

    const categoryImages = [
        { id: "image1", texture: "textures/items/apple" },
        { id: "image2", texture: "textures/items/apple" },
        { id: "image3", texture: "textures/items/apple" },
        { id: "image4", texture: "textures/items/apple" }
    ];

    guidebook.addBookCategory("书籍分类",4,4, categoryButtons, categoryImages);
    
    // 添加章节目录
    for(let i = 0; i < 6; i++) {
        guidebook.addChapter(`item_${i}`, "textures/items/apple");
    }
    
    guidebook.buildChapterList();
    
    return guidebook;
}

// 链式调用示例
export function createChainExample(): NeoGuidebookPage {
    return new NeoGuidebookPage("chain_example")
        .addBookCategory(
            "冒险指南", 4,4,
            [
                { id: "adv1", texture: "textures/items/map" },
                { id: "adv2", texture: "textures/items/compass" }
        ,
            
                { id: "adv_img1", texture: "textures/items/map" },
                { id: "adv_img2", texture: "textures/items/compass" }
            ],[]
        )
        .addEmptySpace()
        .addChapter("开始冒险", "textures/items/map")
        .addChapter("生存技巧", "textures/items/apple")
        .addChapter("战斗指南", "textures/items/sword")
        .buildChapterList();
}
*/