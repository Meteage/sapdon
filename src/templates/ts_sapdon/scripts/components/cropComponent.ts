import { BlockCustomComponent, EntityEquippableComponent, EquipmentSlot, GameMode } from "@minecraft/server"

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

const maxGrowth = 3

export const CustomCropGrowthBlockComponent: BlockCustomComponent = {
    onRandomTick({ block }) {
        const growthChance = 1 / 3
        if (Math.random() > growthChance) return

        const growth = block.permutation.getState("sapdon:block_variant_tag") as number
        block.setPermutation(block.permutation.withState("sapdon:block_variant_tag", growth + 1))
    },
    onPlayerInteract({ block, dimension, player }) {
        if (!player) return

        const equippable = player.getComponent("minecraft:equippable")
        if (!equippable) return

        const mainhand = (equippable as EntityEquippableComponent).getEquipmentSlot(EquipmentSlot.Mainhand)
        if (!mainhand.hasItem() || mainhand.typeId !== "minecraft:bone_meal") return

        if (player.getGameMode() === GameMode.creative) {
            // Grow crop fully
            block.setPermutation(block.permutation.withState("sapdon:block_variant_tag", maxGrowth))
        } else {
            let growth = block.permutation.getState("sapdon:block_variant_tag") as number

            // Add random amount of growth
            growth += randomInt(1, maxGrowth - growth)
            block.setPermutation(block.permutation.withState("sapdon:block_variant_tag", growth))

            // Decrement stack
            if (mainhand.amount > 1) mainhand.amount--
            else mainhand.setItem(undefined)
        }

        // Play effects
        const effectLocation = block.center()
        dimension.playSound("item.bone_meal.use", effectLocation)
        dimension.spawnParticle("minecraft:crop_growth_emitter", effectLocation)
    },
}
