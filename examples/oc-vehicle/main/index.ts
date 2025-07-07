import {
    registry
} from '@sapdon/core'
import { createVehicle } from './vehicle.js'

createVehicle({
    id: 'vehicle:sedan',
    tex: 'textures/entity/sedan.png',
    geo: 'geometry.vehicle.sedan',
    anim: 'animation.vehicle.sedan',
    interactText: 'Enter Sedan',
    speed: 0.6,
    seatHeight: 0.3,
    autoStep: 1.1,
    rotSensitivity: 3,
    family: [ 'four_wheeled' ],
})

createVehicle({
    id: 'vehicle:mclaren_p1',
    tex: 'textures/entity/mclaren_p1.png',
    geo: 'geometry.vehicle.mclaren_p1',
    anim: 'animation.vehicle.mclaren_p1',
    interactText: 'Enter Mclaren P1',
    speed: 1.2,
    seatHeight: -0.1,
    autoStep: 0.6,
    rotSensitivity: 1.8,
    family: [ 'four_wheeled' ],
})

createVehicle({
    id: 'vehicle:porsche911_930',
    tex: 'textures/entity/porsche911_930.png',
    geo: 'geometry.vehicle.porsche911.930',
    anim: 'animation.vehicle.porsche911_930',
    interactText: 'Enter Porsche 911 Turbo (930)',
    speed: 1,
    seatHeight: 0.1,
    autoStep: 0.6,
    rotSensitivity: 2,
    family: [ 'four_wheeled' ],
})

createVehicle({
    id: 'vehicle:porsche918',
    tex: 'textures/entity/porsche918.png',
    geo: 'geometry.vehicle.porsche918',
    anim: 'animation.vehicle.porsche918',
    interactText: 'Enter Porsche 918 Spyder',
    speed: 1.1,
    seatHeight: 0.1,
    autoStep: 0.6,
    rotSensitivity: 2.2,
    renderMethod: 'entity_alphablend',
    family: [ 'four_wheeled' ],
})

createVehicle({
    id: 'vehicle:yadi',
    tex: 'textures/entity/yadi.png',
    geo: 'geometry.vehicle.bike_yadi',
    anim: 'animation.vehicle.yadi',
    interactText: 'Enter Yadi Bike',
    speed: 0.3,
    seatHeight: 0.3,
    autoStep: 1.1,
    rotSensitivity: 5,
    family: [ 'two_wheeled' ],
    width: 1,
    seats: [
        {
            max_rider_count: 1,
            position: [
                0, 0.5, -0.7
            ]
        }
    ]
})

// 提交所有注册
registry.submit()