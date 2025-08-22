import { BaseComponent } from '../core.js'
import { MathExt } from '../math/index.js'

export type AxisValue = number | [number, number] | [number, number, number]

export interface IKeyState {
    pressing: boolean
    times: number
    consume(): void
}

class KeyState implements IKeyState {

    constructor(
        public pressing: boolean = false,
        public times: number = 0,
    ) {}

    consume(): void {
        this.times--
    }

}

export interface InputKeyMapping {
    Jump: boolean
    Sneak: boolean
    Attack: boolean
    Interact: boolean
    Sprint: boolean
}

export interface InputAxisMapping {
    Movement: [ number, number ]
}

export class PlayerInputComponent<Actor> extends BaseComponent<Actor> {
    readonly keyStateMapping = new Map<string, IKeyState>()
    readonly axisMapping = new Map<string, AxisValue>()

    inputKey(key: keyof InputKeyMapping, pressing: boolean) {
        let state = this.keyStateMapping.get(key) ?? new KeyState()

        if (pressing) {
            state.pressing = true
            state.times++
        } else {
            state.pressing = false
            state.times--
        }

        this.keyStateMapping.set(key, state)
    }
    
    inputAxis(key: keyof InputAxisMapping, value: AxisValue) {
        this.axisMapping.set(key, value)
    }

    getKeyState(key: keyof InputKeyMapping) {
        return this.keyStateMapping.get(key)
    }

    getAxis(key: keyof InputAxisMapping): AxisValue | undefined {
        return this.axisMapping.get(key)
    }

    getKeyPressing(key: keyof InputKeyMapping) {
        return this.getKeyState(key)?.pressing ?? false
    }

    getKeyPressTimes(key: keyof InputKeyMapping) {
        return this.getKeyState(key)?.times ?? 0
    }

    exhaust(key: keyof InputKeyMapping) {
        const state = this.getKeyState(key)
        if (state) {
            state.times = 0
        }
    }

    combineAxis(axis1: AxisValue, axis2: AxisValue) {
        if (!Array.isArray(axis1)) {
            axis1 = [ axis1 ] as any
        }

        if (!Array.isArray(axis2)) {
            axis2 = [ axis2 ] as any
        }

        return (axis1 as number[]).concat(axis2 as number[])
    }

    splitAxis(axis: Exclude<AxisValue, number>, nDim1: number, nDim2?: number) {
        nDim1 = MathExt.clamp(nDim1, 0, axis.length - 1)

        if (!nDim2) {
            nDim2 = axis.length - nDim1
        }

        return [
            axis.slice(0, nDim1),
            axis.slice(nDim1, nDim1 + nDim2)
        ]
    }
}