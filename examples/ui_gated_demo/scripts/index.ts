import { world, Player } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

// 与 main.ts 的分类/词条配置对齐（英文 id；每分类词条总数）
const CATS = ["intro", "routing", "controls", "undecided"];
const CAT_CHAPTERS: Record<string, number> = { intro: 4, routing: 8, controls: 12, undecided: 5 };
const PER_ROW = 8;   // 每列最多 8 行
const PER_PAGE = 16; // p1+ 容量：左 8 + 右 8
const TITLE = "sapdon_ui:book";

// 占位键：不匹配任何 setBinding，让对应导航按钮隐藏
const NO_PREV = "no_prev";
const NO_HOME = "no_home";
const NO_NEXT = "no_next";

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
        if (sel >= 3 && sel - 3 < CATS.length) openCat(player, CATS[sel - 3], 0);
        else openIndex(player);
    });
}

function openCat(player: Player, id: string, page: number): void {
    const total = CAT_CHAPTERS[id] ?? 0;
    // 分页容量：p0=8（右列）；p1+=16（左8+右8，先填左列再右列）
    const start = page === 0 ? 0 : PER_ROW + (page - 1) * PER_PAGE;
    const end = Math.min(start + (page === 0 ? PER_ROW : PER_PAGE), total);
    const hasPrev = page > 0;
    const hasNext = end < total;
    const form = new ActionFormData().title(TITLE).body(`CAT:${id}|p${page}`);
    // 槽位：[prev?, home, next?, 当前页条目键]
    form.button(hasPrev ? "prev_button" : NO_PREV);
    form.button("home_button");
    form.button(hasNext ? "next_button" : NO_NEXT);
    for (let i = start; i < end; i++) form.button(`${id}_e${i}`);
    form.show(player).then((r) => {
        if (r.canceled) { console.warn(`[manual] CAT:${id} p${page} canceled`); return; }
        const sel = r.selection!;
        console.warn(`[manual] CAT:${id} p${page} click → sel=${sel}`);
        if (sel === 0 && hasPrev) openCat(player, id, page - 1); // prev（词条分页）
        else if (sel === 1) openIndex(player);                   // home → 回 INDEX（A：切分类走 INDEX）
        else if (sel === 2 && hasNext) openCat(player, id, page + 1); // next（词条分页）
        else openCat(player, id, page);                          // 条目/边界：暂不跳，重开同页
    });
}

world.afterEvents.itemUse.subscribe((event) => {
    if (event.itemStack.typeId !== "minecraft:stick") return;
    if (event.source.typeId !== "minecraft:player") return;
    openIndex(event.source as Player);
});