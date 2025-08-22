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
    ServerFormButton,
  
    EmptySpace,
    BookTitleBar,
    BookTitle,
    Divider,
    BookCategoryGrid,
    ChapterItem,
    NeoGuidebookPage
} from '@sapdon/core'

const neoGuidebook = ItemAPI.createItem("sapdon:neo_guidebook", "items", "apple");
      neoGuidebook.format_version = "1.21.90"
      neoGuidebook.addComponent(ItemComponent.setCustomComponentV2("sapdon:guibook",{}));

const neo_guidebook = new NeoGuidebook("neo_guidebook:neo_guidebook","ui/",[320,207]);

const book_intro_text = "欢迎下载使用稻田傀儡模组 \n \n 本模组为MinecraftPE添加了一种\n新的实体:稻田傀儡 \n \n \n \n \n";
const book_title_bar_text = "稻田傀儡模组指南\n     by Meteage";


//1
//本书介绍页
const book_intro = new NeoGuidebookPage("book_intro_panel")
      .addEmptySpace(["100%","5%"])
      .addBookTitleBar(book_title_bar_text,["100%","15%"])
      .addCategoryTitle(book_intro_text,["100%","70%"])



//类别页
const book_category = new NeoGuidebookPage("book_category")// 添加书籍分类
      .addEmptySpace(["100%","5%"])
      .addBookCategory("分类",1,4,[
        { id: "chatper_1", texture: "textures/items/apple" },
        { id: "chatper_2", texture: "textures/items/iron_ingot" },
        { id: "chatper_3", texture: "textures/items/gold_ingot" },
        { id: "chatper_4", texture: "textures/items/diamond" }
    ])


const BOOK_CHAPTER_LIST = [
    {
        chapter_name:`傀儡功能介绍`,
        chapter_texture:"textures/items/apple"
    },
    {
        chapter_name:`傀儡生成方式`,
        chapter_texture:"textures/items/apple"
    },
    {
        chapter_name:`傀儡行为介绍`,
        chapter_texture:"textures/items/apple"
    }
];

//章节目录
const book_chapter = new NeoGuidebookPage("book_chapter_panel")
      .addChapters(BOOK_CHAPTER_LIST)
      .buildChapterList()

neo_guidebook.addDoublePageStack("page_index0",book_intro.getPanel(),book_chapter.getPanel())
neo_guidebook.addSinglePageStack("page_index1",book_category.getPanel())



// 提交所有注册
registry.submit()