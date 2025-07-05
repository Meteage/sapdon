import {
    registry
} from '@sapdon/core'
import { createVehicle } from './vehicle.js'

createVehicle(
    'vehicle:sedan',
    'textures/entity/sedan.png',
    'geometry.vehicle.sedan',
    'animation.vehicle.sedan',
    'Enter Sedan',
    0.6,
    0.3,
    1.1,
    3,
)

createVehicle(
    'vehicle:mclaren_p1',
    'textures/entity/mclaren_p1.png',
    'geometry.vehicle.mclaren_p1',
    'animation.vehicle.mclaren_p1',
    'Enter Mclaren P1',
    1.2,
    -0.1,
    0.6,
    1.8
)

createVehicle(
    'vehicle:porsche918',
    'textures/entity/porsche918.png',
    'geometry.vehicle.porsche918',
    'animation.vehicle.porsche918',
    'Enter Porsche 918 Spyder',
    1.1,
    0.1,
    0.6,
    2.2,
    'entity_alphablend'
)

// 提交所有注册
registry.submit()