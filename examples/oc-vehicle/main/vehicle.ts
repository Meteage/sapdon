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

interface RideableSeat {
    camera_relax_distance_smoothing: number
    lock_rider_rotation: number
    max_rider_count: number
    min_rider_count: number
    position: [ number, number, number]
    rotate_rider_by: string
    third_person_camera_radius: number
}

export interface VehicleOptions {
    id: string
    tex: string
    geo: string
    anim: string
    interactText?: string
    speed?: number
    seatHeight?: number
    autoStep?: number
    rotSensitivity?: number
    renderMethod?: string
    family?: string[]
    width?: number
    height?: number
    seats?: Partial<RideableSeat>[]
    familyCanRide?: string[]
}

const defaultSeats = (seatHeight: number): Partial<RideableSeat>[] => [
    {
        min_rider_count: 1,
        max_rider_count: 2,
        position: [0.45, seatHeight, 0],
    },
    {
        min_rider_count: 1,
        max_rider_count: 2,
        position: [-0.45, seatHeight, 0],
    }
]

export function createVehicle({
    id, tex, geo, anim, interactText = 'Interact', speed = 0.8, seatHeight = 0.3, autoStep = 1.1, rotSensitivity = 2, renderMethod = 'entity_nocull', family = [],
    width = 3, height = 2, seats = defaultSeats(seatHeight), familyCanRide = [],
}: VehicleOptions) {
    const vehicle = EntityAPI.createEntity(id, tex)

    vehicle.behavior.addComponent(
        EntityComponent.combineComponents(
            EntityComponent.setCollisionBox(width, height),
            EntityComponent.setPhysics(),
            EntityComponent.setRideable({
                interactText,
                seatCount: 2,
                seats,
                familyTypes: [ 'player', ...familyCanRide ],
                // onRiderEnterEvent: 'vehicle:enter',
                // onRiderExitEvent: 'vehicle:exit',
            }),
            EntityComponent.setTypeFamily([ 'vehicle', ...family ]),
            EntityComponent.setMovement(speed),
            EntityComponent.setMovementBasic(rotSensitivity),
            EntityComponent.setInputGroundControlled(),
            EntityComponent.setVariableMaxAutoStep(autoStep, autoStep, autoStep)
        )
    ).properties = null

    vehicle.resource
        .addGeometry('default', geo)
        .addMaterial('default', renderMethod)
        .addRenderController('controller.render.vehicle')
        .addAnimation('fix', anim)
        .setScript('animate', [ 'fix' ])
}