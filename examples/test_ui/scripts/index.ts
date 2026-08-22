import { world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

world.afterEvents.itemUse.subscribe((event) => {
    const typeId = event.itemStack.typeId;
    const player = event.source;
    if (player.typeId != "minecraft:player") return;

    if (typeId == "minecraft:apple") {
        new ActionFormData()
            .title("sapdon_ui:apple")
            .body("触发苹果页")
            .button("test1")
            .button("test2")
            .show(player)
            .then((r) => world.sendMessage("apple selection: " + r.selection));
    }
    else if (typeId == "minecraft:diamond") {
        new ActionFormData()
            .title("sapdon_ui:test")
            .body("触发纯内容页")
            .button("ok")
            .show(player)
            .then((r) => world.sendMessage("test selection: " + r.selection));
    }
});