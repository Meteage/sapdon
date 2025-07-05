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
)

createVehicle(
    'vehicle:mclaren_p1',
    'textures/entity/mclaren_p1.png',
    'geometry.vehicle.mclaren_p1',
    'animation.vehicle.mclaren_p1',
    'Enter Mclaren P1',
    1,
    -0.1,
    0.6
)

// 提交所有注册
registry.submit()