import { Entity, EntityRideableComponent, EntityTypeFamilyComponent, InputPermissionCategory, Player, system, world } from '@minecraft/server'
import {
    MinecraftMain,
    MinecraftGameInstance,
} from '@sapdon/runtime'

const riding = new Map<Player, Entity>()

@MinecraftMain
export class Main extends MinecraftGameInstance {
    afterStart(): void {
        world.afterEvents.playerInteractWithEntity.subscribe(ev => {
            if (!ev.target.typeId.startsWith('vehicle')) {
                return
            }

            // console.log(`Player interacted with ${ev.target.typeId}`)
            const { player, target } = ev
            riding.set(player, target)
            const typeFamily = ev.target.getComponent(EntityTypeFamilyComponent.componentId) as EntityTypeFamilyComponent
            player.inputPermissions.setPermissionCategory(InputPermissionCategory.MoveLeft, false)
            player.inputPermissions.setPermissionCategory(InputPermissionCategory.MoveRight, false)

            player.playAnimation(
                typeFamily.hasTypeFamily('sports_car')
                    ? 'animation.driving.sports_car'
                    : 'animation.driving.sedan',
                {
                    stopExpression: '0',
                    nextState: 'anim'
                }
            )

            if (typeFamily.hasTypeFamily('simple')) {
                player.playAnimation('animation.driving.hidden',{
                    stopExpression: '0',
                })
            }
        })

        system.runInterval(() => {
            for (const [ rider, vehicle ] of riding) {
                if (!vehicle || !rider) {
                    return
                }

                const rideable = vehicle.getComponent(EntityRideableComponent.componentId)
                if (!rideable) {
                    continue
                }

                if (!rideable.getRiders().some(en => en.id === rider.id)) {
                    rider.playAnimation('animation.driving.hidden', { stopExpression: '1' })
                    rider.inputPermissions.setPermissionCategory(InputPermissionCategory.MoveLeft, true)
                    rider.inputPermissions.setPermissionCategory(InputPermissionCategory.MoveRight, true)
                    riding.delete(rider)
                }
            }
        })
    }
}