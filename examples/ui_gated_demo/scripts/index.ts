import { world, Player } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

// 与 main.ts 的分类 id 对齐（英文 id）
const CATS = ["intro", "routing", "controls", "undecided"];
const TITLE = "sapdon_ui:book";

// 占位键：不匹配任何 setBinding，用于让对应导航按钮隐藏
const NO_PREV = "no_prev";
const NO_HOME = "no_home";
const NO_NEXT = "no_next";
const PREV = "prev_button";
const HOME = "home_button";
const NEXT = "next_button";

function openIndex(player: Player): void {
    const form = new ActionFormData().title(TITLE).body("INDEX");
    // 槽位：[no_prev, no_home, no_next, idx0..3] —— INDEX 三导航全部隐藏
    form.button(NO_PREV);
    form.button(NO_HOME);
    form.button(NO_NEXT);
    for (let i = 0; i < 4; i++) form.button(`idx${i}`);
    form.show(player).then((r) => {
        if (r.canceled) { console.warn(`[manual] INDEX canceled`); return; }
        const sel = r.selection!;
        console.warn(`[manual] INDEX click → sel=${sel}`);
        if (sel >= 3 && sel - 3 < CATS.length) openCat(player, CATS[sel - 3]);
        else openIndex(player);
    });
}

function openCat(player: Player, id: string): void {
    const idx = CATS.indexOf(id);
    const hasPrev = idx > 0;
    const hasNext = idx < CATS.length - 1;
    const form = new ActionFormData().title(TITLE).body(`CAT:${id}`);
    // 槽位：[prev?, home, next?, <id>_e0..3]
    form.button(hasPrev ? "prev_button" : NO_PREV);
    form.button("home_button");
    form.button(hasNext ? "next_button" : NO_NEXT);
    for (let i = 0; i < 4; i++) form.button(`${id}_e${i}`);
    form.show(player).then((r) => {
        if (r.canceled) { console.warn(`[manual] CAT:${id} canceled`); return; }
        const sel = r.selection!;
        console.warn(`[manual] CAT:${id} click → sel=${sel}`);
        if (sel === 0 && hasPrev) openCat(player, CATS[idx - 1]); // prev
        else if (sel === 1) openIndex(player);                    // home
        else if (sel === 2 && hasNext) openCat(player, CATS[idx + 1]); // next
        else openCat(player, id);                                  // 条目/边界：暂不跳，重开同页
    });
}

world.afterEvents.itemUse.subscribe((event) => {
    if (event.itemStack.typeId !== "minecraft:stick") return;
    if (event.source.typeId !== "minecraft:player") return;
    openIndex(event.source as Player);
});