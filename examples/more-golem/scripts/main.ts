import { GameMode, system, world } from "@minecraft/server";
import "./sapdon_lib/sapdon_system.js"
import { FarmerGolem } from "./golems/FarmerGolem.js";

let numberId = 0;

world.afterEvents.itemUse.subscribe((event) => {
    const { itemStack, source } = event;
    const itemTypeId = itemStack.typeId;

    switch (itemTypeId) {
        case 'golem_craft:farm_golem_summon': {
            const dim = source.dimension;
            const golem = new FarmerGolem(dim, numberId, source.location);
            numberId++;
            if (source.getGameMode() === GameMode.Survival) {
                itemStack.amount--;
            }
            break;
        }
    }
});

world.afterEvents.playerSpawn.subscribe((event) => {
    system.runTimeout(() => {
        const player = event.player;
        player.sendMessage("欢迎来到稻田傀儡模组示例！作者：Meteage");
        if (player?.hasTag("gaven_guidebook")) return;
        player.sendMessage("本模组仅供学习交流使用，请勿用于商业用途！");
        player.sendMessage("作者B站：俊俊君啊11111");
        player?.addTag("gaven_guidebook");
        player?.runCommand(`give @s sapdon:neo_guidebook 1`);
    }, 5 * 20);
});