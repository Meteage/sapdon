import { 
    ItemCategory, 
    ItemAPI, 
    ItemComponent, 
    registry, 
    EntityAPI, 
    EntityComponent, 
    NearestAttackableTargetBehavor, 
    PickupItemsBehavior, 
    NeoGuidebook, 
    StackPanel, 
    Label, 
    Text, 
    Panel, 
    UIElement, 
    Image,
    Sprite,
    Control,
    Grid,
    GridProp,
    Layout,
    ServerFormButton
} from '@sapdon/core'

const neoGuidebook = ItemAPI.createItem("sapdon:neo_guidebook", "items", "apple");
      neoGuidebook.format_version = "1.21.90"
neoGuidebook.addComponent(ItemComponent.setCustomComponentV2("sapdon:guibook",{}));

const neo_guidebook = new NeoGuidebook("neo_guidebook:neo_guidebook","ui/",[320,207],"",16);
//1
//本书介绍页
const book_intro = new StackPanel("book_intro_panel",undefined);
const book_intro_text = "欢迎下载使用稻田傀儡模组 \n \n 本模组为MinecraftPE添加了一种\n新的实体:稻田傀儡 \n \n \n \n \n";
// 添加书名标题
book_intro.addStack(["100%","5%"],new Panel("emtry",undefined))

book_intro.addStack(["100%", "15%"],
    new Panel("book_title_bar",undefined).addControls([
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
                new Text().setText("稻田傀儡模组指南\n     by Meteage").setColor([0,0,0])
            ).setControl(new Control().setLayer(5))
        )
    ])
);
book_intro.addStack(["100%", "70%"],
    new Label("book_intro",undefined)
    .setText(new Text().setText(book_intro_text).setColor([0,0,0]).setTextAlignment("left"))
)

//类别页
const book_category = new StackPanel("book_category",undefined);

//类别标题
book_category.addStack(["100%","15%"],
    new Label("book_category_title",undefined)
    .setText(new Text().setText("类别").setColor([0,0,0]))
    .setControl(new Control().setLayer(5))
)
//空站位
book_category.addStack(["100%","5%"],new Label("emptry",undefined).setText(
    new Text().setText("--------------------\n").setColor([0,0,0])
))
//分类 4列2行 5个
book_category.addStack(["100%","30%"],
    new StackPanel("book_layout",undefined).setOrientation("horizontal")
    //空占位
    .addStack(["20%","100%"],new Panel("emptry",undefined))

    .addStack(["60%","100%"],
        new StackPanel("book_category_grid",undefined)
        .setControl(new Control().setLayer(6))
        .addStack(["100%","50%"],
            new StackPanel("r1",undefined).setOrientation("horizontal")
            .addStack(["25%","100%"],
                new ServerFormButton("chaper_1","chaper_1")
                .setDefaultTexture("textures/items/apple")
                .setHoverTexture("textures/items/apple")
            )
            .addStack(["25%","100%"],
                new ServerFormButton("chaper_2","chaper_2")
                .setDefaultTexture("textures/items/iron_ingot")
                .setHoverTexture("textures/items/iron_ingot")
            ).addStack(["25%","100%"],
               new ServerFormButton("chaper_3","chaper_3")
                .setDefaultTexture("textures/items/gold_ingot")
                .setHoverTexture("textures/items/gold_ingot")

            ).addStack(["25%","100%"],
                new ServerFormButton("chaper_4","chaper_4")
                .setDefaultTexture("textures/items/diamond")
                .setHoverTexture("textures/items/diamond")
            )
        )
        .addStack(["100%","50%"],
            new StackPanel("r1",undefined).setOrientation("horizontal")
            .addStack(["25%","100%"],
                new Image("image0",undefined)
                .setSprite(new Sprite().setTexture("textures/items/apple"))
            )
            .addStack(["25%","100%"],
                new Image("image0",undefined)
                .setSprite(new Sprite().setTexture("textures/items/apple"))
            ).addStack(["25%","100%"],
                new Image("image0",undefined)
                .setSprite(new Sprite().setTexture("textures/items/apple"))
            ).addStack(["25%","100%"],
                new Image("image0",undefined)
                .setSprite(new Sprite().setTexture("textures/items/apple"))
            )
        )
    )
)
//空站位
book_category.addStack(["100%","20%"],new Label("emptry",undefined).setText(
    new Text().setText("--------------------\n").setColor([0,0,0])
))

const BOOK_CHAPTER_LIST = [
    
];

for(let i = 0;i<6;i++){
    BOOK_CHAPTER_LIST.push(
    {
        chapter_name:`item_${i}`,
        chapter_texture:"textures/items/apple"
    })
}

//章节目录
const book_chapter = new StackPanel("book_chapter_panel",undefined);
//添加标题
book_chapter.addStack(["100%","15%"],new Label("book_chapter",undefined).setText(new Text().setText("Chaper").setColor([0,0,0])))

//空站位
book_chapter.addStack(["100%","5%"],new Label("emptry",undefined).setText(
    new Text().setText("--------------------\n").setColor([0,0,0])
))

//目录列表
BOOK_CHAPTER_LIST.forEach(({chapter_name,chapter_texture},i)=>{
    book_chapter.addStack(["100%","10%"],
        new Panel(`item_panel${i}`,undefined).addControls([
            new StackPanel(`item_${i}`,undefined).setOrientation("horizontal")
            .addStack(["15%","100%"],
                new Panel("emptry",undefined)
            )
            .addStack(["10%","100%"],
                new Image(`image_${i}`,undefined).setSprite(
                new Sprite().setTexture(chapter_texture)
                )
            )
            .addStack(["60%","100%"],
                new Label("text",undefined).setText(
                    new Text().setText(chapter_name).setColor([0,0,0])
                    .setTextAlignment("left")
                )
            )
            .addStack(["15%","60%"],
                new ServerFormButton(`item_${i}_warning`,`item_${i}_button`)
                .setDefaultTexture("textures/ui/ErrorGlyph")
                .setDefaultTexture("textures/ui/ErrorGlyph")
            ),
            new ServerFormButton(`item_${i}_button`,`item_${i}_button`)
            .setDefaultTexture("")
            .setHoverTexture("textures/ui/promotion_slot")

        ]
        )
        
    )

})

neo_guidebook.addPage("page_index0",book_intro,book_category);
neo_guidebook.addPage("page_index1",new Panel("conten1").addControls([new Label("t1",undefined).setText(new Text().setText("第一章节内容\n介绍\n1\n2").setColor([0,0,0]))]),book_chapter);
neo_guidebook.addPage("page_index2",new Panel("conten2").addControls([new Label("t1",undefined).setText(new Text().setText("第二章节内容\n介绍\n1\n2").setColor([0,0,0]))]),new Panel("none"));


// 提交所有注册
registry.submit()