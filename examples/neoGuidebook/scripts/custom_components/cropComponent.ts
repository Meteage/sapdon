import { EquipmentSlot, GameMode, world, BlockComponentRandomTickEvent, BlockComponentPlayerInteractEvent } from "@minecraft/server"

const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min

const maxGrowth: number = 3

function getVariant(perm: any): number {
    return perm.getState("sapdon:block_variant_tag") ?? 0
}

function setVariant(perm: any, value: number): any {
    return perm.withState("sapdon:block_variant_tag", value)
}

export const CustomCropGrowthBlockComponent = {
    onRandomTick(event: BlockComponentRandomTickEvent): void {
        const { block } = event
        const growthChance = 1 / 3
        if (Math.random() > growthChance) return

        const growth = getVariant(block.permutation)
        block.setPermutation(setVariant(block.permutation, growth + 1))
    },
    onPlayerInteract(event: BlockComponentPlayerInteractEvent): void {
        const { block, dimension, player } = event
        if (!player) return

        const equippable = player.getComponent("minecraft:equippable")
        if (!equippable) return

        const mainhand = equippable.getEquipmentSlot(EquipmentSlot.Mainhand)
        if (!mainhand.hasItem() || mainhand.typeId !== "minecraft:bone_meal") return

        if (player.getGameMode() === GameMode.Creative) {
            block.setPermutation(setVariant(block.permutation, maxGrowth))
        } else {
            let growth = getVariant(block.permutation)
            growth += randomInt(1, maxGrowth - growth)
            block.setPermutation(setVariant(block.permutation, growth))

            if (mainhand.amount > 1) mainhand.amount--
            else mainhand.setItem(undefined)
        }

        const effectLocation = block.center()
        dimension.playSound("item.bone_meal.use", effectLocation)
        dimension.spawnParticle("minecraft:crop_growth_emitter", effectLocation)
    },
}
