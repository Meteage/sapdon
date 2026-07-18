import { EntityAPI, ItemAPI, RecipeAPI, ItemComponent, registry } from '@sapdon/core'

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

RecipeAPI.registerSimpleShaped(
    "sapdon:uncaught_masterball_recipe",
    "sapdon:uncaught_masterball",
    ["###", "#C#", "###"],
    { "#": "minecraft:iron_ingot", "C": "minecraft:chest" }
)

registry.submit()
