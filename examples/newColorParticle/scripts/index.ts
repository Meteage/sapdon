import { world, system, Dimension, Vector3, CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, CustomCommandSource } from "@minecraft/server";
import { ColorParticleManager, COLORS } from "./particles.js";
import {
    spawnEffect, spawnShape,
    PRESETS, PRESET_IDS, ALL_SHAPE_IDS, MOTION_IDS,
} from "./effects.js";

// ============================================================
// 物品 → 预设映射
// ============================================================
const ITEM_TO_PRESET: Record<string, string> = {
    "sapdon:demo_scale_sp": "scale_sp",
    "sapdon:demo_spin_sp":  "spin_sp",
    "sapdon:demo_ring":     "ring",
    "sapdon:demo_helix":    "helix",
    "sapdon:demo_sphere":   "sphere",
    "sapdon:demo_heart":    "heart",
    "sapdon:demo_galaxy":   "galaxy",
};

world.afterEvents.itemUse.subscribe((event) => {
    const presetId = ITEM_TO_PRESET[event.itemStack.typeId];
    if (!presetId) return;
    const player = event.source;
    const loc = player.location;
    const result = spawnEffect(player.dimension, loc, presetId);
    if (result.ok) {
        console.warn(`[colorparticle] itemUse: ${presetId} @(${loc.x.toFixed(1)},${loc.y.toFixed(1)},${loc.z.toFixed(1)})`);
        player.sendMessage(result.message);
    }
});

// ============================================================
// 指令来源解析：支持玩家/实体与命令方块（sourceType=Block）
// ============================================================
function resolveOrigin(origin: { sourceType: string; sourceEntity?: { dimension: Dimension; location: Vector3 } | null; sourceBlock?: { dimension: Dimension; location: Vector3 } | null }, pos?: Vector3 | null): { dimension: Dimension; loc: Vector3 } | null {
    if (origin.sourceType === CustomCommandSource.Block && origin.sourceBlock) {
        const b = origin.sourceBlock.location;
        return { dimension: origin.sourceBlock.dimension, loc: pos ?? { x: b.x + 0.5, y: b.y + 0.5, z: b.z + 0.5 } };
    }
    if (origin.sourceEntity) {
        return { dimension: origin.sourceEntity.dimension, loc: pos ?? origin.sourceEntity.location };
    }
    return null;
}

// ============================================================
// 指令注册
// ============================================================
system.beforeEvents.startup.subscribe((init) => {
    const reg = init.customCommandRegistry;

    // 注册枚举（指令输入自动补全）。注意：Enum 类型参数的 name 必须等于枚举名，
    // 否则游戏端报 EnumDependencyMissing，registerCommand 抛错中断全部注册。
    // shape 因支持 path:xxx 任意形状，用 String 类型（不依赖枚举）。
    const safe = (label: string, fn: () => void) => {
        try {
            fn();
        } catch (e) {
            console.warn(`[particle-cmd] ${label} 注册失败: ${e}`);
        }
    };
    safe("registerEnum(preset)", () => reg.registerEnum("sapdon:preset_enum", PRESET_IDS));
    safe("registerEnum(motion)", () => reg.registerEnum("sapdon:motion_enum", MOTION_IDS));
    safe("registerEnum(color)", () => reg.registerEnum("sapdon:color_enum", Object.keys(COLORS)));

    // ----------------------------------------------------------
    // /sapdon:particle <effect> [color] [duration] [trail] [spin] [radius] [pos]
    // ----------------------------------------------------------
    safe("registerCommand(particle)", () => reg.registerCommand({
        name: "sapdon:particle",
        description: "生成预设粒子效果",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
        mandatoryParameters: [
            { name: "sapdon:preset_enum", type: CustomCommandParamType.Enum },
        ],
        optionalParameters: [
            { name: "color",   type: CustomCommandParamType.String },
            { name: "duration", type: CustomCommandParamType.Float },
            { name: "trail",   type: CustomCommandParamType.Integer },
            { name: "spin",    type: CustomCommandParamType.Float },
            { name: "radius",  type: CustomCommandParamType.Float },
            { name: "pos",     type: CustomCommandParamType.Location },
        ],
    }, (origin, effectId, color?, duration?, trail?, spin?, radius?, pos?) => {
        const src = resolveOrigin(origin, pos);
        if (!src) return { status: CustomCommandStatus.Failure, message: "需要由实体或命令方块执行" };
        const result = spawnEffect(src.dimension, src.loc, effectId as string, {
            color1: color,
            duration,
            trail,
            spin,
            radius,
        });
        return { status: result.ok ? CustomCommandStatus.Success : CustomCommandStatus.Failure, message: result.message };
    }));

    // ----------------------------------------------------------
    // /sapdon:particle_shape <shape> <motion> [color] [color2] [duration] [trail] [spin] [radius] [turns] [p1] [p2] [pos]
    // p1/p2：形状高级参数（knot: p/q；rose: k；lissajous: ax/ay；superflower: m/n1）
    // shape 为 String：支持 path:lorenz 等任意形状 id
    // ----------------------------------------------------------
    safe("registerCommand(particle_shape)", () => reg.registerCommand({
        name: "sapdon:particle_shape",
        description: "自由组合形状×运动生成粒子",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
        mandatoryParameters: [
            { name: "shape",  type: CustomCommandParamType.String },
            { name: "sapdon:motion_enum", type: CustomCommandParamType.Enum },
        ],
        optionalParameters: [
            { name: "color",   type: CustomCommandParamType.String },
            { name: "color2",  type: CustomCommandParamType.String },
            { name: "duration", type: CustomCommandParamType.Float },
            { name: "trail",   type: CustomCommandParamType.Integer },
            { name: "spin",    type: CustomCommandParamType.Float },
            { name: "radius",  type: CustomCommandParamType.Float },
            { name: "turns",   type: CustomCommandParamType.Float },
            { name: "p1",      type: CustomCommandParamType.Float },
            { name: "p2",      type: CustomCommandParamType.Float },
            { name: "pos",     type: CustomCommandParamType.Location },
        ],
    }, (origin, shapeId, motionId, color?, color2?, duration?, trail?, spin?, radius?, turns?, p1?, p2?, pos?) => {
        const src = resolveOrigin(origin, pos);
        if (!src) return { status: CustomCommandStatus.Failure, message: "需要由实体或命令方块执行" };
        const result = spawnShape(src.dimension, src.loc, shapeId as string, motionId as string, {
            color1: color,
            color2,
            duration,
            trail,
            spin,
            radius,
            turns,
            p1,
            p2,
        });
        return { status: result.ok ? CustomCommandStatus.Success : CustomCommandStatus.Failure, message: result.message };
    }));

    // ----------------------------------------------------------
    // /sapdon:particle_list
    // ----------------------------------------------------------
    safe("registerCommand(particle_list)", () => reg.registerCommand({
        name: "sapdon:particle_list",
        description: "列出所有可用的预设/形状/运动/颜色",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
    }, () => {
        const shapeList = ALL_SHAPE_IDS.join(", ");
        const presetList = PRESET_IDS.map((id) => `${id}(${PRESETS[id].label})`).join(", ");
        const lines = [
            `[预设] ${presetList}`,
            `[形状] ${shapeList}`,
            `[运动] ${MOTION_IDS.join(", ")}`,
            `[颜色] ${Object.keys(COLORS).join(", ")}`,
        ];
        return { status: CustomCommandStatus.Success, message: lines.join("\n") };
    }));

    // ----------------------------------------------------------
    // /sapdon:particle_clear
    // ----------------------------------------------------------
    safe("registerCommand(particle_clear)", () => reg.registerCommand({
        name: "sapdon:particle_clear",
        description: "清除所有当前粒子",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
    }, () => {
        const before = ColorParticleManager.activeCount;
        ColorParticleManager.clearAll();
        return { status: CustomCommandStatus.Success, message: `已清除 ${before} 个粒子组` };
    }));

    console.warn(`[particle-cmd] 指令注册完成：preset=${PRESET_IDS.length} motion=${MOTION_IDS.length} shape=${ALL_SHAPE_IDS.length}`);
});
