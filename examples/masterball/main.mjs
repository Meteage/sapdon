import { EntityAPI } from "../../src/core/factory/EntityFactory.js";
import { ItemAPI } from "../../src/core/factory/ItemFactory.js";
import { RecipeAPI } from "../../src/core/factory/RecipeFactory.js";
import { ItemComponent } from "../../src/core/item/ItemComponents.js";

 ItemAPI.createItem("sapdon:caught_masterball","none","masterball",{hide_in_command:true})
        .addComponent(
            ItemComponent.combineComponents(
                ItemComponent.setGlint(true),
                ItemComponent.setDisplayName("捕捉到的大师球"),
                ItemComponent.setMaxStackSize(1),
                ItemComponent.setProjectile(1,"sapdon:projectile_masterball"),
                ItemComponent.setThrowable(true,1.,0,1.,0,false)
            )
        )
ItemAPI.createItem("sapdon:uncaught_masterball","items","masterball")
.addComponent(
    ItemComponent.combineComponents(
        ItemComponent.setDisplayName("大师球"),
        ItemComponent.setMaxStackSize(64),
        ItemComponent.setProjectile(1,"sapdon:projectile_masterball"),
        ItemComponent.setThrowable(true,1.,0,1.,0,false)
    )
)

EntityAPI.createProjectile("sapdon:projectile_masterball","textures/items/masterball");

/*
RecipeAPI.registerShaped("sapdon:uncaught_masterball")
    .tags( ["crafting_table","altar"])
    .key({ 
        "I": "minecraft:iron_ingot",
        "A": "minecraft:amethyst_shard",
        "D": "minecraft:diamond"
    })
    .pattern([
      "IAI",
      "IDI",
      "III"
    ])
    .output("sapdon:uncaught_masterball")*/