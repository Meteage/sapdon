import { world, EquipmentSlot, GameMode } from '@minecraft/server';
import '@minecraft/server-ui';

const BlockEntities = {
    "mob_chest:chest":"mob_chest:chest_entity",
};

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

               //设置名字
               block_entity.nameTag = "sapdon_furnace";
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
    world.beforeEvents.worldInitialize.subscribe(({ blockComponentRegistry }) => {
        blockComponentRegistry.registerCustomComponent(
            "sapdon:heavy_block",
            HeavyBlockComponent
        );
        blockComponentRegistry.registerCustomComponent(
            "sapdon:block_with_entity",
            BlockWithEntityComponent
        );
        blockComponentRegistry.registerCustomComponent(
            "sapdon:crop_growth",
            CustomCropGrowthBlockComponent
        );
    });
};

registerCustomBlockComponent();


world.afterEvents.projectileHitBlock.subscribe((event)=>{
    if(!event.projectile.typeId === "sapdon:falling_block_entity") return
    const targetblock = event.getBlockHit().block.above();
    targetblock.setType("sapdon:falling_block");
});
//# sourceMappingURL=index.js.map
