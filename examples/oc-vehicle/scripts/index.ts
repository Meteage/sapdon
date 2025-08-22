import {
    Entity,
    EntityRideableComponent,
    EntityTypeFamilyComponent,
    InputPermissionCategory,
    Player,
    system,
    world
} from '@minecraft/server'

import {
    MinecraftMain,
    MinecraftGameInstance,
    CustomComponent,
} from '@sapdon/runtime'

@MinecraftMain
export class Main extends MinecraftGameInstance {
    readonly riding = new Map<string, EntityRideableComponent>()

    afterStart(): void {
        world.afterEvents.playerInteractWithEntity.subscribe(ev => {
            if (!ev.target?.typeId.startsWith('vehicle')) {
                return
            }

            // console.log(`Player interacted with ${ev.target.typeId}`)
            const { player, target } = ev
            const rideable = target.getComponent(EntityRideableComponent.componentId)
            if (!rideable) {
                return
            }
            this.riding.set(player.id, rideable)
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
            for (const [ riderId, rideable ] of this.riding) {
                if (!rideable) {
                    this.riding.delete(riderId)
                    continue
                }

                const rider = world.getEntity(riderId) as Player

                if (!rideable.getRiders().some(en => en.id === rider.id)) {
                    rider.playAnimation('animation.driving.hidden', { stopExpression: '1' })
                    rider.inputPermissions.setPermissionCategory(InputPermissionCategory.MoveLeft, true)
                    rider.inputPermissions.setPermissionCategory(InputPermissionCategory.MoveRight, true)
                    this.riding.delete(rider.id)
                }
            }
        })
        
    }
}

class Vehicle extends CustomComponent<Entity> {
    
}