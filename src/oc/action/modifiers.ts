import { ActionValueType, ValueTypeMapping } from "./interface.js"

export class ActionModifiers {

    static readonly MASK_X = 1
    static readonly MASK_Y = 2
    static readonly MASK_Z = 4
    static readonly MASK_ALL = 7

    /**
     * 若 IAction 的 `valueType` 为 `ActionValueType.BOOL`，则 mask 无效
     * 
     * @param {number} mask `ActionModifiers.MASK_X` | `ActionModifiers.MASK_Y` | `ActionModifiers.MASK_Z`
     * @default ActionModifiers.MASK_ALL
     * @example
     * ```
     * negate(ActionModifiers.MASK_X | ActionModifiers.MASK_Y) // x轴和y轴取反
     * negate(ActionModifiers.MASK_X | ActionModifiers.MASK_Z) // x轴和z轴取反
     * negate(ActionModifiers.MASK_ALL) // x轴、y轴和z轴取反
     * negate(7) // x轴、y轴和z轴取反
     * ```
     */
    static negate = (mask: number = ActionModifiers.MASK_ALL) => <E extends ActionValueType>(type: E, value: ValueTypeMapping[E]) => {
        const sX = mask & this.MASK_X ? -1 : 1
        const sY = mask & this.MASK_Y ? -1 : 1
        const sZ = mask & this.MASK_Z ? -1 : 1

        switch (type) {
            case ActionValueType.BOOL:
                return !value
            case ActionValueType.VEC:
                return -value * sX as number
            case ActionValueType.VEC2:
                return [ (value as [number, number])[0] * sX, (value as [number, number])[1] * sY ]
            case ActionValueType.VEC3:
                return [ (value as [number, number, number])[0] * sX, (value as [number, number, number])[1] * sY, (value as [number, number, number])[2] * sZ ]
            default:
                throw new Error('Invalid action type')
        }
    }

    static scale = (scalar: number | number[]) => (type: ActionValueType, value: any) => {
        switch (type) {
            case ActionValueType.BOOL:
                return value
            case ActionValueType.VEC:
                return value * (scalar as number) as number
            case ActionValueType.VEC2:
                //@ts-ignore
                return [ value[0] * scalar[0], value[1] * scalar[1] ] as [ number, number ]
            case ActionValueType.VEC3:
                //@ts-ignore
                return [ value[0] * scalar[0], value[1] * scalar[1], value[2] * scalar[2] ] as [ number, number, number ]
            default:
                throw new Error('Invalid action type')
        }
    }
}