import {
    EntityAPI,
    registry,
    EntityComponent,
    AddonRenderController,
    AddonRenderControllerGroup
} from '@sapdon/core'

const porsche = EntityAPI.createEntity('vehicle:porsche', 'textures/entity/porsche.png')
const renderControllers = new AddonRenderControllerGroup('1.19.50')

renderControllers.addRenderController(
    new AddonRenderController('vehicle.porsche')
        .addMaterial({
            '*': 'material.default',
        })
        .addTexture('texture.default')
        .setGeometry('geometry.default')
)

porsche.behavior.addComponent(
    EntityComponent.combineComponents(
        EntityComponent.setPhysics(),
        EntityComponent.setRideable({
            interactText: 'Enter Porsche 911 Carrera 4 GTS',
            seatCount: 2,
            seats: [
                {
                    max_rider_count: 1,
                    position: [0.45, 0, 0],
                },
                {
                    max_rider_count: 1,
                    position: [-0.45, 0, 0],
                }
            ]
        })
    )
)

porsche.resource
    .addGeometry('default', 'geometry.vehicle.porsche')
    .addMaterial('default', 'entity_nocull')
    .addRenderController('controller.render.vehicle.porsche')
    .addAnimation('fix', 'animation.vehicle.porsche')
    .setScript('animate', [ 'fix' ])

// 提交所有注册
registry.submit()