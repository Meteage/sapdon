import {
    AddonRenderController,
    AddonRenderControllerGroup,
    EntityAPI,
    EntityComponent
} from '@sapdon/core'

const renderControllers = new AddonRenderControllerGroup('1.19.50')

renderControllers.addRenderController(
    new AddonRenderController('vehicle')
        .addMaterial({
            '*': 'material.default',
        })
        .addTexture('texture.default')
        .setGeometry('geometry.default')
)

export function createVehicle(id: string, tex: string, geo: string, fixAnim: string, interactText: string = 'Interact', speed = 0.8, seatHeight = 0.3, autoStep = 1.1) {
    const vehicle = EntityAPI.createEntity(id, tex)

    vehicle.behavior.addComponent(
        EntityComponent.combineComponents(
            EntityComponent.setCollisionBox(3, 2),
            EntityComponent.setPhysics(),
            EntityComponent.setRideable({
                interactText,
                seatCount: 2,
                seats: [
                    {
                        max_rider_count: 1,
                        position: [0.45, seatHeight, 0],
                    },
                    {
                        max_rider_count: 1,
                        position: [-0.45, seatHeight, 0],
                    }
                ]
            }),
            EntityComponent.setMovement(speed),
            EntityComponent.setMovementBasic(2.5),
            EntityComponent.setInputGroundControlled(),
            EntityComponent.setVariableMaxAutoStep(autoStep, autoStep, autoStep)
        )
    ).properties = null

    vehicle.resource
        .addGeometry('default', geo)
        .addMaterial('default', 'entity_nocull')
        .addRenderController('controller.render.vehicle')
        .addAnimation('fix', fixAnim)
        .setScript('animate', [ 'fix' ])
}