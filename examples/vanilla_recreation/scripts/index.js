import { world, system, ItemStack } from "@minecraft/server";
import { registerBuiltinComponents, registerBlockComponent } from "@sapdon/runtime";

// ─────────────────────────────────────────────────────────────────────────────
// 运行期脚本：熔炉的「伪进度」驱动
//   界面侧（ContainerUISystem.addProgressSlot）靠**本格物品的剩余耐久**裁切箭头/火焰；
//   脚本只要把「剩余耐久 = 进度」的可损耗物品写进对应槽即可（火焰比箭头快）。
// ─────────────────────────────────────────────────────────────────────────────
registerBuiltinComponents();

const PROGRESS_ITEM = "vanilla_recreation:furnace_progress";
const SLOTS = [
  { slot: 3, step: 1 / 100 }, // 箭头：约 200 tick（10 秒）一圈
  { slot: 4, step: 1 / 35 }, // 火焰：约 70 tick（3.5 秒）一圈
];

const progress = new Map();
const written = new Map();

function writeSlot(container, key, slot, value) {
  const stack = new ItemStack(PROGRESS_ITEM, 1);
  const dur = stack.getComponent("minecraft:durability");
  if (!dur) return;
  const max = dur.maxDurability;
  // 剩余耐久 = 进度；两头各留 1 点（满耐久时裁切会闪没）
  const damage = Math.min(max - 1, Math.max(1, Math.round(max * (1 - value))));
  if (written.get(key) === damage) return;
  written.set(key, damage);
  dur.damage = damage;
  container.setItem(slot, stack);
}

registerBlockComponent("vanilla_recreation:furnace_tick", {
  onTick({ block }) {
    let container;
    try {
      const inv = block.getComponent("minecraft:inventory");
      container = inv && inv.container;
    } catch (e) {
      return;
    }
    if (!container) return;
    for (const { slot, step } of SLOTS) {
      const key = `${block.location.x},${block.location.y},${block.location.z}#${slot}`;
      const next = (progress.get(key) ?? 0) + step;
      const value = next > 1 ? 0 : next;
      progress.set(key, value);
      writeSlot(container, key, slot, value);
    }
  },
});
