import { world, Player } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

// 与 main.ts 里每页 setBinding(buttonName) 对齐的按钮 emit 表
const PAGE_BUTTONS: Record<string, string[]> = {
    page1: ["next_button"],
    page2: ["prev_button", "next_button"],
    page3: ["prev_button", "home_button"],
};
const ORDER = ["page1", "page2", "page3"];

function open(player: Player, page: string): void {
    const form = new ActionFormData()
        .title("sapdon_ui:book")                       // #title_text 只做路由（Wiki 前缀标记）
        .body(page)                                    // → #form_text 切内容页 + 按钮组（binding_text 门控）
    for (const b of PAGE_BUTTONS[page]) form.button(b) // → 组内对应按钮可见（setBinding 门控）

    form.show(player).then((r) => {
        console.warn(`[gated] title=sapdon_ui:book body=${page} canceled=${r.canceled} selection=${r.selection}`);
        world.sendMessage(`[gated] body=${page} selection=${r.selection}`);
        if (r.canceled) return;
        const action = PAGE_BUTTONS[page][r.selection!];
        const cur = ORDER.indexOf(page);
        if (action === "next_button") open(player, ORDER[cur + 1]);
        else if (action === "prev_button") open(player, ORDER[cur - 1]);
        else if (action === "home_button") open(player, ORDER[0]);
    });
}

world.afterEvents.itemUse.subscribe((event) => {
    if (event.itemStack.typeId !== "minecraft:stick") return;
    if (event.source.typeId !== "minecraft:player") return;
    open(event.source as Player, "page1");
});