import { ItemStack, system, world } from "@minecraft/server";

// 伪进度驱动：脚本只负责往容器槽里写「可损耗物品」，进度指示本体由 UI 侧自己裁出来。
// 机制（详见 examples/mob_chest/main.mjs 与 doc/dev/known-pitfalls.md §4.12）：
//   每个进度格经 $cell_overlay_ref 注入了一个自定控件，它读**本格自己**的
//   #item_durability_current_amount / #item_durability_total_amount（collection 绑定），
//   在 view 绑定里做 Molang 除法取反 → #clip_ratio，把原版的箭头/火焰贴图裁开。
//   所以这里只要把「剩余耐久 = 进度」的可损耗物品写进对应槽位即可 —— 不需要任何进度贴图。
//
// 两个槽（构建期定义在 main.mjs）：
//   slot 3 = 箭头（原版 arrow_inactive / arrow_active，22×15）
//   slot 4 = 火焰（原版 flame_empty_image / flame_full_image，13×13）
// 两者速率不同（火焰更快），看起来像原版那样「燃烧」与「进度」各自独立。

const PROGRESS_ITEM = "mob_chest:furnace_progress"; // main.mjs 注册，耐久 100
const CHEST_ENTITY = "mob_chest:chest_entity";

/** 要驱动的槽位：槽号 + 每次推进比例（一个周期 = 1/step 次） */
const SLOTS = [
  { slot: 3, step: 1 / 100 }, // 箭头：约 200 tick（10 秒）一圈
  { slot: 4, step: 1 / 35 }, // 火焰：约 70 tick（3.5 秒）一圈
];

// 容器挂在**承载实体**上（不是方块上）：mob_chest 用 BlockAPI.createTileBlock，
// inventory 组件写在 mob_chest:chest_entity 里，所以必须走实体取容器；
// block.getComponent("minecraft:inventory") 在这里会是 undefined。
const DIMENSIONS = ["overworld", "nether", "the_end"];

const INTERVAL = 2; // 每 2 tick 推一次

/** "entityId#slot" → 当前进度 0..1 */
const progress = new Map();
/** "entityId#slot" → 上一次写进去的 damage（值没变就不重复写，避免无意义写入） */
const written = new Map();

/**
 * 把一个槽位的进度写成物品耐久。
 * @param {import("@minecraft/server").Container} container 容器
 * @param {string} key 进度键 "entityId#slot"
 * @param {number} slot 槽位号
 * @param {number} value 进度 0..1
 */
function writeSlot(container, key, slot, value) {
  // 数量恒为 1：>1 时原版格位会画数量角标，格子会被数字糊住。
  const stack = new ItemStack(PROGRESS_ITEM, 1);
  const durability = stack.getComponent("minecraft:durability");
  if (!durability) return;

  const max = durability.maxDurability;
  // 剩余耐久 = 进度。两头各留 1 点：damage 打满 = 物品损坏，damage 为 0 = 满耐久
  // （满耐久时与耐久相关的可见性绑定可能变 false，裁切会闪没）。
  const damage = Math.min(max - 1, Math.max(1, Math.round(max * (1 - value))));
  if (written.get(key) === damage) return;
  written.set(key, damage);

  durability.damage = damage;
  container.setItem(slot, stack);
}

function tick() {
  for (const dimensionId of DIMENSIONS) {
    let dimension;
    try {
      dimension = world.getDimension(dimensionId);
    } catch {
      continue; // 维度不存在（自定义维度世界）时跳过
    }
    for (const entity of dimension.getEntities({ type: CHEST_ENTITY })) {
      const container = entity.getComponent("minecraft:inventory")?.container;
      if (!container) continue;
      for (const { slot, step } of SLOTS) {
        const key = `${entity.id}#${slot}`;
        const next = (progress.get(key) ?? 0) + step;
        const value = next > 1 ? 0 : next;
        progress.set(key, value);
        writeSlot(container, key, slot, value);
      }
    }
  }
}

/** 启动进度驱动（由 scripts/index.js 调用一次）。 */
export function startProgressBar() {
  system.runInterval(tick, INTERVAL);
}
