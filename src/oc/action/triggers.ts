import { Vec3 } from "../math/index.js"
import { IActionTrigger } from "./interface.js"

function inputLength(val: any) {
    if (Array.isArray(val)) {
        const [ x, y, z ] = val
        return Vec3.m(Vec3.fromXYZ(x, y, z ?? 0))
    }

    return +val
}

export class ActionTriggers {
    static pressed(): IActionTrigger {
        let lastValue = 0
        return (_, v) =>
            // 有些设备比如手柄, 在摇杆居中时不一定会返回0, 而是返回接近0的数 (摇杆漂移)
            lastValue < Number.EPSILON && (lastValue = inputLength(v)) > Number.EPSILON
    }

    static released(): IActionTrigger {
        let lastValue = 0
        return (_, v) =>
            lastValue > Number.EPSILON && (lastValue = inputLength(v)) < Number.EPSILON
    }

    static hold(actuationThreshold = 2, holdThreshold = Infinity): IActionTrigger {
        let lastValue = 0
        let firstPressTick = 0
        let pressTrigger = ActionTriggers.pressed()

        return (_, v, t) => {
            if (!firstPressTick || !lastValue) {
                return false
            }

            if (pressTrigger(_, v, t)) {
                firstPressTick = t
                return false
            }

            const holdingTime = t - firstPressTick
            if (holdingTime > holdThreshold) {
                return false
            }

            return holdingTime > actuationThreshold
        }
    }

    static holdThenRelease(actuationThreshold = 2): IActionTrigger {
        let isHolding = false
        let releasedTrigger = ActionTriggers.released()
        let holdTrigger = ActionTriggers.hold(actuationThreshold)

        return (_, v, t) => {
            if (holdTrigger(_, v, t)) {
                isHolding = true
                return false
            }

            if (isHolding && releasedTrigger(_, v, t)) {
                isHolding = false
                return true
            }

            return false
        }
    }
}