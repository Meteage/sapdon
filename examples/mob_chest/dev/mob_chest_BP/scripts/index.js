import { world, EquipmentSlot, GameMode, system, ItemStack } from '@minecraft/server';
import '@minecraft/server-ui';

const BlockEntities = {
    "mob_chest:chest":"mob_chest:chest_entity",
};

// 门控键 = 容器标题 = 实体 nametag；切这一行换面板：
//   "calib_test"     → 框架生成的坐标校准面板（3 行等距梯，20px 格位）
//   "slot_test"      → 手写对照件（enabled:true vs enabled:false 的机制 A/B）
//   "sapdon_furnace" → 框架生成的自定义熔炉面板（原版熔炉排布：2 输入叠放 + 1 产物 + 进度条）
const CONTAINER_UI_GATE = "sapdon_furnace";

/** @type {import("@minecraft/server").BlockCustomComponent} */
const BlockWithEntityComponent = {
    onPlace({block,dimension,previousBlock}) {
        const place_position = {
            x:block.center().x,
            y:block.center().y -0.5,
            z:block.center().z
        };
        const block_entity_typeId = BlockEntities[block.typeId];
        world.sendMessage("block_entity:"+block_entity_typeId);
        dimension.spawnEntity(block_entity_typeId,place_position);

        const block_typeId = block.typeId;
        switch(block_typeId){
            case "mob_chest:chest":
                block.setPermutation(block.permutation.withState("sapdon:block_or_entity",1));
                break;
        }
    },
    onPlayerInteract({block,dimension,player,face,faceLocation}) {
        world.sendMessage("interact");
       const block_typeId = block.typeId;
       switch(block_typeId){
           case "mob_chest:chest":
               const block_entity = dimension.getEntitiesAtBlockLocation(block.center())[0];

               //设置名字（= 容器门控键 $new_container_title：实体容器取 nametag）
               //   候选键见文件顶部的 CONTAINER_UI_GATE
               block_entity.nameTag = CONTAINER_UI_GATE;
               //获取属性
               const chest_state = block_entity.getProperty("mob_chest:chest_state");
               world.sendMessage("chest_state:"+chest_state);
               if(chest_state === "open"){
                   //设置属性
                   block_entity.setProperty("mob_chest:chest_state","close");
                }else {
                    //设置属性
                    block_entity.setProperty("mob_chest:chest_state","open");
                }
               break;
       }
    }
};

/**
 * @param {number} min The minimum integer
 * @param {number} max The maximum integer
 * @returns {number} A random integer between the `min` and `max` parameters (inclusive)
 */
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const maxGrowth = 3;

/** @type {import("@minecraft/server").BlockCustomComponent} */
const CustomCropGrowthBlockComponent = {
    onRandomTick({ block }) {
        const growthChance = 1 / 3;
        if (Math.random() > growthChance) return;

        const growth = block.permutation.getState("sapdon:block_variant_tag");
        block.setPermutation(block.permutation.withState("sapdon:block_variant_tag", growth + 1));
    },
    onPlayerInteract({ block, dimension, player }) {
        if (!player) return;

        const equippable = player.getComponent("minecraft:equippable");
        if (!equippable) return;

        const mainhand = equippable.getEquipmentSlot(EquipmentSlot.Mainhand);
        if (!mainhand.hasItem() || mainhand.typeId !== "minecraft:bone_meal") return;

        if (player.getGameMode() === GameMode.creative) {
            // Grow crop fully
            block.setPermutation(block.permutation.withState("sapdon:block_variant_tag", maxGrowth));
        } else {
            let growth = block.permutation.getState("sapdon:block_variant_tag");

            // Add random amount of growth
            growth += randomInt(1, maxGrowth - growth);
            block.setPermutation(block.permutation.withState("sapdon:block_variant_tag", growth));

            // Decrement stack
            if (mainhand.amount > 1) mainhand.amount--;
            else mainhand.setItem(undefined);
        }

        // Play effects
        const effectLocation = block.center();
        dimension.playSound("item.bone_meal.use", effectLocation);
        dimension.spawnParticle("minecraft:crop_growth_emitter", effectLocation);
    },
};

/** @type {import("@minecraft/server").BlockCustomComponent} */
const HeavyBlockComponent = {
    onTick({block,dimension}){
        if( ! block.below().isAir) return
        block.setType("minecraft:air");
        const location = block.center();
        location.y -= 0.5;
        dimension.spawnEntity("sapdon:falling_block_entity",location);
    }
};

const registerCustomBlockComponent = ()=>{
    system.beforeEvents.startup.subscribe((init) => {
        init.blockComponentRegistry.registerCustomComponent(
            "sapdon:heavy_block",
            HeavyBlockComponent
        );
        init.blockComponentRegistry.registerCustomComponent(
            "sapdon:block_with_entity",
            BlockWithEntityComponent
        );
        init.blockComponentRegistry.registerCustomComponent(
            "sapdon:crop_growth",
            CustomCropGrowthBlockComponent
        );
    });
};

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
function startProgressBar() {
  system.runInterval(tick, INTERVAL);
}

registerCustomBlockComponent();
startProgressBar();


world.afterEvents.projectileHitBlock.subscribe((event)=>{
    if(!event.projectile.typeId === "sapdon:falling_block_entity") return
    const targetblock = event.getBlockHit().block.above();
    targetblock.setType("sapdon:falling_block");
});
//# sourceMappingURL=index.js.map
