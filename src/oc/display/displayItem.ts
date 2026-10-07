import { EquipmentSlot, ItemStack, world, type Entity, type Vector3 } from '@minecraft/server'

/**
 * 展示实体的**运行期 API**（`@sapdon/runtime`）—— 与构建期的
 * `EntityAPI.createDisplayItem()`（`@sapdon/core`）配对使用。
 *
 * 构建期注册一个无 AI 实体（几何里只有 `rightItem` 骨），引擎把它的**主手物品**渲染在那个骨上。
 * 本模块负责：生成 / 换物 / 清空 / 删除，以及**姿态**（旋转 / 位移 / 缩放）。
 *
 * ## 姿态属性（跟随实体 identifier 的命名空间）
 *
 * 姿态存在实体属性里，id = `<实体命名空间>:<键>`（`fz:display_item` ⇒ `fz:rx`）。
 * 所以这些函数都从 `entity.typeId` 里取命名空间 —— 传入的实体必须是展示实体。
 *
 * | 键 | 含义 | 值域 |
 * |---|---|---|
 * | `rx` `ry` `rz` | 骨旋转（度） | -180..180 |
 * | `px` `py` `pz` | 相对挂点位移（**0.1 像素**为单位，即 `10` = 1px） | -160..160 |
 * | `sc` | 缩放（**百分比**，`100` = 1.0×） | 1..500 |
 *
 * ⚠️ 属性是 **int**（float 属性的默认值在 `@sapdon/core` 生成 JSON 时会被写成整数而被引擎拒绝）。
 *
 * ## 纪律
 *
 * 绝不抛：任何一步失败只记 `console.warn`（`spawnDisplayItem` 失败返回 `undefined`）。
 */

/**
 * 姿态键（顺序 = 习惯的参数顺序）。
 *
 * ⚠️ 必须与 `@sapdon/core` 的 `DISPLAY_ITEM_POSE_KEYS` 一致（运行期不能 import `@sapdon/core`）。
 */
export const DISPLAY_ITEM_POSE_KEYS = ['rx', 'ry', 'rz', 'px', 'py', 'pz', 'sc'] as const

/** 姿态键 */
export type DisplayPoseKey = (typeof DISPLAY_ITEM_POSE_KEYS)[number]

/** 姿态（只写要改的项；其余保持实体上的当前值） */
export type DisplayPose = Partial<Record<DisplayPoseKey, number>>

/** 从实体 id 取命名空间（姿态属性的前缀） */
function namespaceOf(entityId: string): string {
    const i = entityId.indexOf(':')
    return i > 0 ? entityId.slice(0, i) : entityId
}

/**
 * 在指定位置生成一个展示实体，并让它叼 `itemId`。
 *
 * @param entityId 展示实体的 identifier（构建期 `createDisplayItem` 用的那个）
 * @param dimensionId 维度（如 `minecraft:overworld`）
 * @param location 生成点
 * @param itemId 初始主手物品（省略 = 空手，之后再 `setDisplayItem`）
 * @returns 实体；失败 ⇒ `undefined`（已打 warn）
 */
export function spawnDisplayItem(
    entityId: string,
    dimensionId: string,
    location: Vector3,
    itemId?: string,
): Entity | undefined {
    try {
        const entity = world.getDimension(dimensionId).spawnEntity(entityId, location)
        if (itemId !== undefined) setDisplayItem(entity, itemId)
        return entity
    } catch (e) {
        console.warn(`[sapdon-display] spawn 失败（${entityId} @${dimensionId}）: ${String(e)}`)
        return undefined
    }
}

/**
 * 换展示实体**叼着的物品**（= 设主手）。
 *
 * 优先走 `minecraft:equippable` 的 `setEquipment(Mainhand, …)`（保留 NBT 语义）；
 * 组件不可用时退回 `replaceitem` 命令。
 */
export function setDisplayItem(entity: Entity, itemId: string): boolean {
    try {
        const eq = entity.getComponent('minecraft:equippable') as
            | { setEquipment?: (slot: EquipmentSlot, item: ItemStack | undefined) => void }
            | undefined
        if (eq?.setEquipment) {
            eq.setEquipment(EquipmentSlot.Mainhand, new ItemStack(itemId, 1))
            return true
        }
    } catch {
        /* 落到 replaceitem */
    }
    try {
        entity.runCommand(`replaceitem entity @s slot.weapon.mainhand 0 ${itemId} 1 0`)
        return true
    } catch (e) {
        console.warn(`[sapdon-display] 设置主手物品失败（${itemId}）: ${String(e)}`)
        return false
    }
}

/** 把实体**清空**（不再叼任何东西；实体留着） */
export function clearDisplayItem(entity: Entity): void {
    try {
        const eq = entity.getComponent('minecraft:equippable') as
            | { setEquipment?: (slot: EquipmentSlot, item: ItemStack | undefined) => void }
            | undefined
        if (eq?.setEquipment) {
            eq.setEquipment(EquipmentSlot.Mainhand, undefined)
            return
        }
        entity.runCommand('replaceitem entity @s slot.weapon.mainhand 0 air 0 0')
    } catch (e) {
        console.warn(`[sapdon-display] 清空主手失败: ${String(e)}`)
    }
}

/** 删除展示实体 */
export function removeDisplayItem(entity: Entity): void {
    try {
        entity.remove()
    } catch (e) {
        console.warn(`[sapdon-display] 删除失败: ${String(e)}`)
    }
}

/**
 * 设置展示实体的**姿态**（只写传入的键；其余保持）。
 *
 * @param entity 展示实体（`typeId` 的命名空间 = 属性前缀）
 * @param pose 要改的姿态项（值会被取整，因为是 int 属性）
 */
export function setDisplayPose(entity: Entity, pose: DisplayPose): void {
    const ns = namespaceOf(entity.typeId)
    for (const key of DISPLAY_ITEM_POSE_KEYS) {
        const value = pose[key]
        if (value === undefined) continue
        try {
            entity.setProperty(`${ns}:${key}`, Math.round(value))
        } catch (e) {
            console.warn(`[sapdon-display] 写姿态 ${key} 失败: ${String(e)}`)
        }
    }
}

/** 读展示实体的**姿态**（读不到的键不出现在结果里） */
export function getDisplayPose(entity: Entity): DisplayPose {
    const ns = namespaceOf(entity.typeId)
    const out: DisplayPose = {}
    for (const key of DISPLAY_ITEM_POSE_KEYS) {
        try {
            const v = entity.getProperty(`${ns}:${key}`)
            if (typeof v === 'number') out[key] = v
        } catch {
            /* 该实体没有这个属性 */
        }
    }
    return out
}
