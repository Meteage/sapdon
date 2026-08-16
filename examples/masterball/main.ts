import { EntityAPI, ItemAPI, RecipeAPI, ItemComponent, ItemCategory, registry } from '@sapdon/core'

 ItemAPI.createItem("sapdon:caught_masterball", ItemCategory.None, "masterball",{hide_in_command:true, format_version:"1.21.90"})
        .addComponent(
            ItemComponent.combineComponents(
                ItemComponent.setGlint(true),
                ItemComponent.setDisplayName("捕捉到的大师球"),
                ItemComponent.setMaxStackSize(1),
        ItemComponent.setProjectile(1,"sapdon:projectile_masterball"),
        ItemComponent.setThrowable(true,1.,0,1.,0,false),
        ItemComponent.setFireResistant(true)
    )
)
ItemAPI.createItem("sapdon:uncaught_masterball", ItemCategory.Items, "masterball",{format_version:"1.21.90"})
.addComponent(
    ItemComponent.combineComponents(
        ItemComponent.setDisplayName("大师球"),
        ItemComponent.setMaxStackSize(64),
        ItemComponent.setProjectile(1,"sapdon:projectile_masterball"),
        ItemComponent.setThrowable(true,1.,0,1.,0,false),
        ItemComponent.setFireResistant(true)
    )
)

EntityAPI.createProjectile("sapdon:projectile_masterball","textures/items/masterball");

RecipeAPI.registerShaped("sapdon:masterball_recipe")
    .tags(["crafting_table", "altar"])
    .pattern(["IAI", "IDI", "III"])
    .key({
        I: "minecraft:iron_ingot",
        A: "minecraft:amethyst_shard",
        D: "minecraft:ender_pearl"
    })
    .output("sapdon:uncaught_masterball")

registry.submit()
