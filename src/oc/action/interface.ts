export enum ActionValueType {
    BOOL,
    VEC,
    VEC2,
    VEC3,
}

export type ValueTypeMapping = {
    [ActionValueType.BOOL]: boolean
    [ActionValueType.VEC]: number
    [ActionValueType.VEC2]: [number, number]
    [ActionValueType.VEC3]: [number, number, number]
}

export interface IActionModifier<E extends ActionValueType, V = ValueTypeMapping[E]> {
    (type: E, value: V): V
}

export interface IActionTrigger {
    <T extends ActionValueType>(type: T, value: ValueTypeMapping[T], ticks: number): boolean
}

export interface IAction<E extends ActionValueType=ActionValueType.BOOL> {
    valueType: E
    modifiers: IActionModifier<E>[]
    triggers: IActionTrigger[]
}
