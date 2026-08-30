import { world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

// 与 main.ts 的 SapdonGuideBook 分类/词条配置对齐
const CATS = ["intro", "features", "recipe"];
const CAT_CHAPTERS = { intro: 2, features: 3, recipe: 1 };
const ENT_PAGES = { };
const TITLE = "sapdon_ui:neo_guidebook";

// 占位键：不匹配任何 setBinding，让对应导航按钮隐藏
const NO_PREV = "no_prev";
const NO_HOME = "no_home";
const NO_NEXT = "no_next";

function myLog(log) {
  // world.sendMessage(log);
}

function openIndex(player) {
  const form = new ActionFormData().title(TITLE).body("INDEX");
  form.button(NO_PREV);
  form.button(NO_HOME);
  form.button(NO_NEXT);
  for (let i = 0; i < CATS.length; i++) form.button(`idx${i}`);
  form.show(player).then((r) => {
    if (r.canceled) return;
    const s = r.selection;
    if (s >= 3 && s - 3 < CATS.length) openCat(player, CATS[s - 3], 0);
    else openIndex(player);
  });
}

function openCat(player, id, page) {
  const total = CAT_CHAPTERS[id] ?? 0;
  const start = page === 0 ? 0 : 8 + (page - 1) * 16;
  const end = Math.min(start + (page === 0 ? 8 : 16), total);
  const form = new ActionFormData().title(TITLE).body(`CAT:${id}|p${page}`);
  form.button(page > 0 ? "prev_button" : NO_PREV);
  form.button("home_button");
  form.button(end < total ? "next_button" : NO_NEXT);
  for (let i = start; i < end; i++) form.button(`${id}_e${i}`);
  form.show(player).then((r) => {
    if (r.canceled) return;
    const s = r.selection;
    myLog(`CAT:${id} p${page} click → sel=${s}`);
    if (s === 0 && page > 0) openCat(player, id, page - 1);
    else if (s === 1) openIndex(player);
    else if (s === 2 && end < total) openCat(player, id, page + 1);
    else if (s >= 3) {
      const gi = start + (s - 3);
      if (gi < total) openEnt(player, id, gi, page, 0);
      else openCat(player, id, page);
    } else openCat(player, id, page);
  });
}

function openEnt(player, id, gi, fromPage, ep) {
  const pc = ENT_PAGES[`${id}_e${gi}`] ?? 1;
  const form = new ActionFormData().title(TITLE).body(`ENT:${id}:${gi}|p${ep}`);
  form.button("prev_button");
  form.button("home_button");
  form.button(ep < pc - 1 ? "next_button" : NO_NEXT);
  form.show(player).then((r) => {
    if (r.canceled) return;
    const s = r.selection;
    myLog(`ENT:${id}:${gi} p${ep} click → sel=${s}`);
    if (s === 0) {
      if (ep > 0) openEnt(player, id, gi, fromPage, ep - 1);
      else openCat(player, id, fromPage);
    } else if (s === 1) openIndex(player);
    else if (s === 2 && ep < pc - 1) openEnt(player, id, gi, fromPage, ep + 1);
    else openEnt(player, id, gi, fromPage, ep);
  });
}

/** @type {import("@minecraft/server").ItemCustomComponent} */
export const GuiBookItemComponent = {
  onUse({ itemStack, source }) {
    myLog(itemStack.typeId);
    if (source.typeId != "minecraft:player") return;
    openIndex(source);
  }
};
