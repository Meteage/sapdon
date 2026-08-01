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
 * 3D 手持物品骨骼变换（动画中的 position/rotation/scale）
 */
export interface ModelBoneTransform {
    position?: [number, number, number]
    rotation?: [number, number, number]
    scale?: number | [number, number, number]
}

/**
 * 3D 手持物品选项（Method 2：model binding）
 */
export interface CreateModelItemOptions extends ItemOptions {
    /**
     * 几何根骨骼名，内置动画将作用于该骨骼；必须与用户 geometry 中带
     * binding（q.item_slot_to_bone_name）的骨骼名一致。默认 "rightitem"。
     */
    boneName?: string
    /**
     * 默认材质。默认 "entity"（不透明，同官方示例）；
     * 模型含透明像素时可用 "entity_alphatest"。
     */
    material?: string
    /**
     * 覆盖内置第一人称握持姿态（默认参照官方示例）
     */
    holdFirstPerson?: ModelBoneTransform
    /**
     * 覆盖内置第三人称握持姿态（默认参照官方示例）
     */
    holdThirdPerson?: ModelBoneTransform
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
    /**
     * 是否为肉类（自动追加 minecraft:is_meat 标签）
     */
    isMeat?: boolean
    /**
     * 是否为鱼类（自动追加 minecraft:is_fish 标签）
     */
    isFish?: boolean
    /**
     * 是否为熟食（自动追加 minecraft:is_cooked 标签）
     */
    isCooked?: boolean
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

/**
 * 方块描述符：字符串、带状态的名称对象或标签 Molang 查询对象
 */
export type BlockDescriptor =
    | string
    | { name: string; states?: Record<string, unknown> }
    | { tags: string }

/**
 * 数值范围
 */
export interface Range {
    min: number
    max: number
}

/**
 * 物品稀有度
 */
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic'

/**
 * 放置方块组件选项
 */
export interface BlockPlacerOptions {
    replaceBlockItem?: boolean
    alignedPlacement?: boolean
    useOn?: BlockDescriptor[]
}

/**
 * 使用修饰组件选项
 */
export interface UseModifiersOptions {
    movementModifier?: number
    useDuration?: number
    emitVibrations?: boolean
    startSound?: string
    startUsing?: 'always' | 'if_first'
}

/**
 * 图标纹理（对象格式）
 */
export interface IconTextures {
    default: string
    dyed?: string
    iconTrim?: string
    bundleOpenBack?: string
    bundleOpenFront?: string
}

/**
 * 冷却组件选项
 */
export interface CooldownOptions {
    category: string
    duration: number
    type?: 'use' | 'attack'
}

/**
 * 挖掘组件选项
 */
export interface DiggerOptions {
    destroySpeeds: { block: BlockDescriptor; speed: number }[]
    useEfficiency?: boolean
}

/**
 * 耐久传感器阈值
 */
export interface DurabilityThreshold {
    durability: number
    particleType?: string
    soundEvent?: string
}

/**
 * 耐久传感器组件选项
 */
export interface DurabilitySensorOptions {
    durabilityThresholds: DurabilityThreshold[]
}

/**
 * 放置实体组件选项
 */
export interface EntityPlacerOptions {
    dispenseOn?: BlockDescriptor[]
    useOn?: BlockDescriptor[]
}

/**
 * 动能武器组件选项
 */
export interface KineticWeaponOptions {
    delay: number
    hitboxMargin?: number
    reach?: Range
    creativeReach?: Range
    damageMultiplier?: number
    damageModifier?: number
    damageConditions?: Record<string, unknown>
    dismountConditions?: Record<string, unknown>
    knockbackConditions?: Record<string, unknown>
}

/**
 * 穿刺武器组件选项
 */
export interface PiercingWeaponOptions {
    hitboxMargin?: number
    reach?: Range
    creativeReach?: Range
}

/**
 * 唱片组件选项
 */
export interface RecordOptions {
    comparatorSignal: number
    duration: number
    soundEvent: string
}

/**
 * 修复条目
 */
export interface RepairItem {
    items: (string | { tags: string })[]
    repairAmount?: number | string
}

/**
 * 射击组件弹药
 */
export interface ShooterAmmunition {
    item: string
    searchInventory?: boolean
    useInCreative?: boolean
    useOffhand?: boolean
}

/**
 * 射击组件选项
 */
export interface ShooterOptions {
    ammunition: ShooterAmmunition[]
    chargeOnDraw?: boolean
    maxDrawDuration?: number
    scalePowerByDrawDuration?: boolean
}

/**
 * 容器物品组件选项
 */
export interface StorageItemOptions {
    maxSlots: number
    allowNestedStorageItems: boolean
    allowedItems?: string[]
    bannedItems?: string[]
}

/**
 * 挥砍音效组件选项
 */
export interface SwingSoundsOptions {
    attackMiss?: string
    attackHit?: string
    attackCriticalHit?: string
}
