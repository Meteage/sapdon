import { Image, ItemAPI, ItemComponent, Label, Panel, UIElement } from "../../src/core/index.js";
import { StackPanel } from "../../src/core/ui/elements/StackPanel.js";
import { Layout } from "../../src/core/ui/Properties/Layout.js";
import { Sprite } from "../../src/core/ui/Properties/Sprite.js";
import { Text } from "../../src/core/ui/Properties/Text.js";
import { Guidebook } from "../../src/core/ui/systems/guidebook.js";

ItemAPI.createItem("sapdon:test_guidebook", "items", "masterball")
.addComponent(ItemComponent.setCustomComponents(["sapdon:custom_guidebook"]))


//通用指导手册
const guidebook = new Guidebook("sapdon:guidebook","ui/")
      //章节目录
      guidebook.addPage("page_index0",new Panel("none"),
        new StackPanel("directory")
        //标题
        .addStack(["100%","10%"],
            new UIElement("book_name",undefined,"how_to_play_common.header")
            .addVariable("text","通用手册")
        )
        .addStack(["100%","10%"],new Label("title_content").setText(new Text().setColor([0,0,0]).setText("目录")))
        .addStack(["100%","20%"],
            new StackPanel("item0").setLayout(new Layout().setSize(["100%","100%"]))
            .setOrientation("horizontal")
            .addStack(["20%","100%"],
                new Image("icon0").setSprite(new Sprite().setTexture("textures/items/diamond"))
            )
            .addStack(["80%","100%"],
                new Label("label0").setText(new Text().setColor([0,0,0]).setText("介绍"))
            )
        )
        .addStack(["100%","20%"],
            new StackPanel("item1").setLayout(new Layout().setSize(["100%","100%"]))
            .setOrientation("horizontal")
            .addStack(["20%","100%"],
                new Image("icon1").setSprite(new Sprite().setTexture("textures/items/apple"))
            )
            .addStack(["80%","100%"],
                new Label("label1").setText(new Text().setColor([0,0,0]).setText("使用方法"))
            )
        )
    )
      //第一页内容
      guidebook.addPage("page_index1",
        new Image("page_left_content1")
        .setSprite(
            new Sprite().setTexture("textures/items/diamond_sword")
        ),
        new Label("right_content1")
        .setText(new Text().setColor([0,0,0]).setText("这是第一页右边的内容"))
      )
      //第一页内容
      guidebook.addPage("page_index2",
        new Label("right_content2")
        .setLayout(
            new Layout().setSize([100,32])
        )
        .setText(
            new Text().setColor([0,0,0]).setText("这是第二页左边的内容")
        ),
        new Image("page_left_content2")
        .setSprite(
            new Sprite().setTexture("textures/items/diamond")
        )
      )

const apple = new Panel()