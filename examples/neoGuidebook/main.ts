import fs from "fs"
import path from "path"
import {
    ItemAPI, ItemComponent, registry,
    NeoGuidebook, NeoGuidebookPage
} from '@sapdon/core'

const neoGuidebook = ItemAPI.createItem("sapdon:neo_guidebook", "items", "masterball")
neoGuidebook.format_version = "1.21.90"
neoGuidebook.addComponent(ItemComponent.setCustomComponentV2("sapdon:neo_guibook", {}))
neoGuidebook.addComponent(ItemComponent.setMaxStackSize(1))
neoGuidebook.addComponent(ItemComponent.setDisplayName("NeoGuidebook 技术手册"))
neoGuidebook.addComponent(ItemComponent.setInteractButton("打开手册"))

const neo_guidebook = new NeoGuidebook("neo_guidebook:neo_guidebook", "ui/", [320, 207], {
    debug: true,
    buttons: { close: { visible: false } },
    textures: {
        homeDefault: "textures/ui/book_shiftleft_default",
        homeHover: "textures/ui/book_shiftleft_hover",
        homePressed: "textures/ui/book_shiftleft_pressed",
    }
})

const cover = new NeoGuidebookPage("cover")
    .addEmptySpace(["100%", "5%"])
    .addBookTitleBar("NeoGuidebook TEST技术手册\n     by Meteage", ["100%", "15%"])
    .addEmptySpace(["100%", "3%"])
    .addCategoryTitle(
        "NeoGuidebook 是基于 Minecraft Bedrock JSON UI 体系的\n" +
        "构建时代码生成框架。它通过链式 API 生成结构化指南手册，\n" +
        "利用 Server Form 的 #title_text / #form_text 数据绑定\n" +
        "实现自定义 UI 注入与页面切换。\n",
        ["100%", "60%"]
    )

const BOOK_CHAPTERS = [
    { chapter_name: "架构概述",      chapter_texture: "textures/items/map" },
    { chapter_name: "核心类",        chapter_texture: "textures/items/iron_ingot" },
    { chapter_name: "页面布局 API",  chapter_texture: "textures/items/book_writable" },
    { chapter_name: "数据绑定机制",  chapter_texture: "textures/items/paper" },
    { chapter_name: "Server Form 集成", chapter_texture: "textures/items/comparator" },
    { chapter_name: "按钮交互系统",  chapter_texture: "textures/items/redstone" },
    { chapter_name: "构建与注册",    chapter_texture: "textures/items/command_block_minecart" },
]

const chapter_list = new NeoGuidebookPage("chapter_list")
    .addChapters(BOOK_CHAPTERS)
    .buildChapterList()

const ch1_left = new NeoGuidebookPage("ch1_left")
    .addEmptySpace(["100%", "5%"])
    .addCategoryTitle("架构概述", ["100%", "15%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "NeoGuidebook 采用 构建时生成 + 运行时注入 的分层架构：\n\n" +
        "▸ 构建时：链式 API → UISystem → 序列化为 JSON UI\n" +
        "▸ 输出：neo_guidebook.json + server_form.json modifications\n" +
        "▸ 运行时：ActionFormData → #title_text → 匹配自定义 UI",
        ["100%", "60%"]
    )
    .addEmptySpace(["100%", "12%"])

const ch1_right = new NeoGuidebookPage("ch1_right")
    .addEmptySpace(["100%", "5%"])
    .addCategoryTitle("依赖关系", ["100%", "15%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "NeoGuidebook       → UISystem\n" +
        "  ├─ NeoGuidebookPage → StackPanel\n" +
        "  ├─ ServerUISystem    → server_form.json\n" +
        "  └─ UISystemRegistry  → _ui_defs.json\n\n" +
        "运行时：\n" +
        "  gui_book.ts → NeoGuidebookBridge\n" +
        "  → ActionFormData → Minecraft 渲染引擎 → 数据绑定求值",
        ["100%", "65%"]
    )
    .addEmptySpace(["100%", "7%"])

const ch2_left = new NeoGuidebookPage("ch2_left")
    .addEmptySpace(["100%", "5%"])
    .addCategoryTitle("NeoGuidebook", ["100%", "15%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "构造函数：\n" +
        "  new NeoGuidebook(\"ns:name\", \"ui/\", [320,207], options)\n\n" +
        "选项：\n" +
        "  debug, background, size\n" +
        "  buttons.{prev,next,home,close}.visible\n" +
        "  textures.{prevDefault,nextDefault,...}\n\n" +
        "新方法：\n" +
        "  getPageIds() → string[]\n" +
        "  getPageCount() → number\n" +
        "  addCustomButton(config) → this",
        ["100%", "72%"]
    )

const ch2_right = new NeoGuidebookPage("ch2_right")
    .addEmptySpace(["100%", "5%"])
    .addCategoryTitle("NeoGuidebookPage", ["100%", "15%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "构造函数：\n" +
        "  new NeoGuidebookPage(id, [\"100%\",\"100%\"])\n\n" +
        "链式方法：\n" +
        "  .addBookText(text, size)\n" +
        "  .addDivider(size)\n" +
        "  .getPanel()",
        ["100%", "72%"]
    )

const ch3_left = new NeoGuidebookPage("ch3_left")
    .addEmptySpace(["100%", "5%"])
    .addCategoryTitle("布局方法", ["100%", "15%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "▸ addBookText(text, size) → BookText（左对齐）\n" +
        "▸ addCategoryTitle(title, size) → BookTitle（居中）\n" +
        "▸ addBookTitleBar(text, size) → 背景绸缎+标题\n" +
        "▸ addEmptySpace(size) → 透明占位面板\n" +
        "▸ addDivider(size) → 水平分割线",
        ["100%", "72%"]
    )

const ch3_right = new NeoGuidebookPage("ch3_right")
    .addEmptySpace(["100%", "5%"])
    .addCategoryTitle("高级组件", ["100%", "15%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "▸ addRecipeGrid(row, col, items)\n" +
        "   → 合成表图片网格\n\n" +
        "▸ addBookCategory(title, row, col, buttons)\n" +
        "   → 分类导航网格\n\n" +
        "▸ addChapter / addChapters / buildChapterList\n" +
        "   → 章节目录(图标+名称+按钮)",
        ["100%", "72%"]
    )

const ch4_left = new NeoGuidebookPage("ch4_left")
    .addEmptySpace(["100%", "5%"])
    .addCategoryTitle("#form_text 绑定", ["100%", "15%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "每个页面通过 view 绑定控制可见性：\n\n" +
        "$binding_text = #form_text → #visible\n\n" +
        "当 ActionForm.body(\"page_id\")\n" +
        "设置 #form_text = \"page_id\" 时，\n" +
        "只有 binding_text 匹配的页面可见。\n\n" +
        "这是页面切换的核心机制。",
        ["100%", "68%"]
    )

const ch4_right = new NeoGuidebookPage("ch4_right")
    .addEmptySpace(["100%", "5%"])
    .addCategoryTitle("#title_text 绑定", ["100%", "15%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "ActionForm.title(\"neo_guidebook\")\n" +
        "→ #title_text = \"neo_guidebook\"\n\n" +
        "ServerUISystem 注册标题→根面板映射：\n" +
        "bindingTitlewithContent(name, rootPanelId)\n\n" +
        "Minecraft 检测 #title_text → 匹配\n" +
        "→ 渲染自定义 UI（隐藏原版表单）",
        ["100%", "68%"]
    )

const ch5_left = new NeoGuidebookPage("ch5_left")
    .addEmptySpace(["100%", "5%"])
    .addCategoryTitle("注入原理", ["100%", "15%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "ServerUISystem 通过 modifications 方式\n" +
        "向 server_form.json 插入自定义 factory：\n\n" +
        "custom_server_form_factory:\n" +
        "  factory.control_ids.long_form =\n" +
        "    @server_form.custom_root_panel",
        ["100%", "72%"]
    )

const ch5_right = new NeoGuidebookPage("ch5_right")
    .addEmptySpace(["100%", "5%"])
    .addCategoryTitle("渲染流程", ["100%", "15%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "① Script: form.title(\"name\") + form.body(\"p0\")\n" +
        "② Engine: 检查 #title_text 匹配\n" +
        "③ 匹配 → 加载 custom_root_panel\n" +
        "④ #form_text 切换子页面可见性\n" +
        "⑤ 按钮点击 → ActionForm response → 切换 page",
        ["100%", "72%"]
    )

const ch6_left = new NeoGuidebookPage("ch6_left")
    .addEmptySpace(["100%", "5%"])
    .addCategoryTitle("按钮架构", ["100%", "15%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "按钮类型：\n\n" +
        "▸ 内置：上一页 / 下一页 / 首页 / 关闭\n" +
        "▸ 自定义：addCustomButton(config)\n" +
        "  位置：bottom_left/right/middle\n" +
        "  纹理：defaultTexture / hover / pressed\n\n" +
        "纹理配置可全局设置：\n" +
        "  textures: { prevDefault: \"...\" }",
        ["100%", "72%"]
    )

const ch6_right = new NeoGuidebookPage("ch6_right")
    .addEmptySpace(["100%", "5%"])
    .addCategoryTitle("运行时 Bridge", ["100%", "15%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "NeoGuidebookBridge 封装运行时导航：\n\n" +
        "  new Bridge(uiName, pageIds)\n" +
        "  .onPage(\"id\", { onEnter, onLeave })\n" +
        "  .show(player, startIndex)\n\n" +
        "自动管理：\n" +
        "  ▸ 上一页/下一页/首页按钮\n" +
        "  ▸ 边界检查 (不溢出)\n" +
        "  ▸ 生命周期回调 (onEnter / onLeave)\n" +
        "  ▸ 页面 ID 来源：getPageIds()",
        ["100%", "72%"]
    )

const ch7_single = new NeoGuidebookPage("ch7_single")
    .addEmptySpace(["100%", "5%"])
    .addCategoryTitle("构建流程", ["100%", "15%"])
    .addDivider(["100%", "3%"])
    .addBookText(
        "构建入口：main.ts\n\n" +
        "① ItemAPI.createItem → 自定义物品\n" +
        "② new NeoGuidebook(..., {debug:true, textures:{...}})\n" +
        "③ new NeoGuidebookPage → 创建页面\n" +
        "④ addDoublePageStack(id, left, right)\n" +
        "⑤ addCustomButton(config) → 自定义按钮\n" +
        "⑥ getPageIds() → 生成 page_ids.json\n" +
        "⑦ registry.submit() → 输出 JSON",
        ["100%", "72%"]
    )
    .addEmptySpace(["100%", "5%"])

neo_guidebook.addDoublePageStack("page_index0", cover.getPanel(), chapter_list.getPanel())
neo_guidebook.addDoublePageStack("page_index1", ch1_left.getPanel(), ch1_right.getPanel())
neo_guidebook.addDoublePageStack("page_index2", ch2_left.getPanel(), ch2_right.getPanel())
neo_guidebook.addDoublePageStack("page_index3", ch3_left.getPanel(), ch3_right.getPanel())
neo_guidebook.addDoublePageStack("page_index4", ch4_left.getPanel(), ch4_right.getPanel())
neo_guidebook.addDoublePageStack("page_index5", ch5_left.getPanel(), ch5_right.getPanel(), ["40%", "60%"])
neo_guidebook.addDoublePageStack("page_index6", ch6_left.getPanel(), ch6_right.getPanel())
neo_guidebook.addSinglePageStack("page_index7", ch7_single.getPanel())

const pageIds: string[] = neo_guidebook.getPageIds()
console.log(`页面总数: ${neo_guidebook.getPageCount()}, ID列表: ${pageIds}`)
fs.writeFileSync(
    path.join(process.cwd(), "scripts", "page_ids.json"),
    JSON.stringify(pageIds, null, 2)
)

registry.submit()
