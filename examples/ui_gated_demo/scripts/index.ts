import { world, Player } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

// 与 main.ts 的分类 id 对齐（英文 id）
const CATS = ["intro", "routing", "controls", "undecided"];
const TITLE = "sapdon_ui:book";

function openIndex(player: Player): void {
    const form = new ActionFormData().title(TITLE).body("INDEX");
    for (let i = 0; i < 4; i++) form.button(`idx${i}`); // 分类图标按钮
    form.show(player).then((r) => {
        if (r.canceled) { console.warn(`[manual] INDEX canceled`); return; }
        const sel = r.selection!;
        console.warn(`[manual] INDEX click → idx${sel}`);
        if (sel < CATS.length) openCat(player, CATS[sel]);
        else openIndex(player);
    });
}

function openCat(player: Player, id: string): void {
    const form = new ActionFormData().title(TITLE).body(`CAT:${id}`);
    for (let i = 0; i < 4; i++) form.button(`${id}_e${i}`); // 右页 4 条目（暂不跳转）
    form.button("home_button");                             // 回索引
    form.show(player).then((r) => {
        if (r.canceled) { console.warn(`[manual] CAT:${id} canceled`); return; }
        const sel = r.selection!;
        console.warn(`[manual] CAT:${id} click → ${sel === 4 ? "home_button" : `${id}_e${sel}`}`);
        if (sel === 4) openIndex(player);   // home
        else openCat(player, id);           // 条目暂不跳转，重开同页
    });
}

world.afterEvents.itemUse.subscribe((event) => {
    if (event.itemStack.typeId !== "minecraft:stick") return;
    if (event.source.typeId !== "minecraft:player") return;
    openIndex(event.source as Player);
});