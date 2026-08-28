import { world, Player } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

// 与 main.ts 的 ManualBook 分类对齐
const CATS = [
    { key: "layout", text: "手册用可复用内容块 + 纵向 StackPanel 逐格排布页面，不靠绝对坐标。" },
    { key: "routing", text: "每页一个独立 factory，页面根以 #title_text 前缀门控；#form_text 控布局。" },
    { key: "buttons", text: "FormButton 无文字贴图按钮，由 FormButtonGrid 注入集合/门控绑定。" },
];

const TITLE = "sapdon_ui:book";

function openIndex(player: Player): void {
    const form = new ActionFormData().title(TITLE).body("INDEX");
    for (let i = 0; i < 4; i++) form.button(`idx${i}`); // 右栏四个分类图标按钮
    form.show(player).then((r) => {
        if (r.canceled) return;
        world.sendMessage(`[manual] X index selection=${r.selection}`);
        openIndex(player); // 占位：点击暂不跳转，专注视觉
    });
}

function openText(player: Player, idx: number): void {
    const form = new ActionFormData().title(TITLE).body(`TXT|${CATS[idx].text}`);
    const hasPrev = idx > 0;
    const hasNext = idx < CATS.length - 1;
    // 顺序 = selection：prev / home / next
    const act: ("prev" | "home" | "next")[] = [];
    if (hasPrev) act.push("prev");
    act.push("home");
    if (hasNext) act.push("next");
    for (const a of act) form.button(a === "home" ? "home_button" : a === "prev" ? "prev_button" : "next_button");

    form.show(player).then((r) => {
        if (r.canceled) return;
        const a = act[r.selection!];
        if (a === "prev") openText(player, idx - 1);
        else if (a === "next") openText(player, idx + 1);
        else openIndex(player);
    });
}

world.afterEvents.itemUse.subscribe((event) => {
    if (event.itemStack.typeId !== "minecraft:stick") return;
    if (event.source.typeId !== "minecraft:player") return;
    openIndex(event.source as Player);
});