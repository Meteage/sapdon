/**
 * 物品菜单栏分类枚举
 * 用于 Item / Food / FlipbookItem 及 ItemAPI 的 category 参数
 */
export enum ItemCategory {
    Commands = 'commands',
    Construction = 'construction',
    Equipment = 'equipment',
    Nature = 'nature',
    Items = 'items',
    None = 'none',
}

/**
 * 物品组件 Map：以 Minecraft 组件名为 key
 */
export type ItemComponentMap = Map<string, unknown>

/**
 * 物品选项
 * snake_case（对应 Minecraft JSON 字段）与 camelCase 互为别名，camelCase 优先
 */
export interface ItemOptions {
    group?: string
    hide_in_command?: boolean
    hideInCommand?: boolean
    max_stack_size?: number
    maxStackSize?: number
    format_version?: string
    formatVersion?: string
    /**
     * 图标纹理名称；传 null 表示不添加 minecraft:icon 组件
     */
    icon?: string | null
    displayName?: string
}

/**
 * 食物选项
 */
export interface FoodOptions extends ItemOptions {
    animation?: string
    movement?: number
    useDuration?: number
    canAlwaysEat?: boolean
    nutrition?: number
    saturationModifier?: number
}

/**
 * 可投掷组件选项
 */
export interface ThrowableOptions {
    doSwingAnimation?: boolean
    launchPowerScale?: number
    maxDrawDuration?: number
    maxLaunchPower?: number
    minDrawDuration?: number
    scalePowerByDrawDuration?: boolean
}

/**
 * 食物组件选项
 */
export interface FoodComponentOptions {
    nutrition?: number
    saturationModifier?: number
    canAlwaysEat?: boolean
    usingConvertsTo?: string
}
