import { world, system, Dimension, Vector3, CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, CustomCommandSource } from "@minecraft/server";
import { ColorParticleManager, COLORS } from "./particles.js";
import {
    spawnEffect,
    PRESETS, PRESET_IDS, ALL_SHAPE_IDS, MOTION_IDS,
} from "./effects.js";
import { buildMathSpawn, MATH_MODE_IDS } from "./mathexpress.js";
import { spawnMfx, MFX_PRESETS, MFX_PRESET_IDS } from "./mfx.js";

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
    // duration：游戏刻（默认 60）；trail：残影刻数（默认 1）
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
            { name: "duration", type: CustomCommandParamType.Integer },
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
    // /sapdon:particle_math <expr> [mode] [count] [duration] [trail] [dt] [radius] [color]
    // expr：按 ';' 分隔的赋值式数学表达式（参考 Java 模组 AnotherColorBlock）。
    //   自变量：t(0..1) i(序号) n(总数)；常量 PI/E/TAU；半径常量 r。
    //   输出：位置 x,y,z；可选逐粒子色 red,green,blue。
    //   mode：param(缺省，沿 t 铺曲线) | surface(用 i/n 铺曲面)
    //   duration：游戏刻（默认 60）；trail：残影刻数（默认 1）
    // ----------------------------------------------------------
    safe("registerEnum(math_mode)", () => reg.registerEnum("sapdon:math_mode_enum", MATH_MODE_IDS));

    safe("registerCommand(particle_math)", () => reg.registerCommand({
        name: "sapdon:particle_math",
        description: "用数学表达式生成粒子",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
        mandatoryParameters: [
            { name: "expr", type: CustomCommandParamType.String },
        ],
        optionalParameters: [
            { name: "sapdon:math_mode_enum", type: CustomCommandParamType.Enum },
            { name: "count",    type: CustomCommandParamType.Integer },
            { name: "duration", type: CustomCommandParamType.Integer },
            { name: "trail",    type: CustomCommandParamType.Integer },
            { name: "dt",       type: CustomCommandParamType.Float },
            { name: "radius",   type: CustomCommandParamType.Float },
            { name: "color",    type: CustomCommandParamType.String },
        ],
    }, (origin, expr, mode?, count?, duration?, trail?, dt?, radius?, color?) => {
        const src = resolveOrigin(origin);
        if (!src) return { status: CustomCommandStatus.Failure, message: "需要由实体或命令方块执行" };
        const res = buildMathSpawn(expr as string, {
            mode: mode as any,
            count,
            duration,
            trail,
            dt,
            radius,
            color,
        });
        if (!res.ok) return { status: CustomCommandStatus.Failure, message: res.message };
        const basePoints = res.points.map((p) => p.pos);
        const hasPerPointColor = res.points.some((p) => p.color);
        ColorParticleManager.spawn(src.dimension, src.loc, basePoints, res.groupColor, {
            durationTicks: duration ?? 60,
            trail: trail ?? 1,
            tick: 1,
            perPointColor: hasPerPointColor ? (i) => res.points[i]?.color : undefined,
            movementFn: (c, b) => ({ x: c.x + b[0], y: c.y + b[1], z: c.z + b[2] }),
        });
        return { status: CustomCommandStatus.Success, message: res.message };
    }));

    // ----------------------------------------------------------
    // /sapdon:mfx <preset> [radius] [turns] [life] [count] [color] [pos]
    // Molang 全能粒子：脚本只算初始位置并传参，数学由粒子 Molang 演化。
    // ----------------------------------------------------------
    safe("registerEnum(mfx_preset)", () => reg.registerEnum("sapdon:mfx_preset_enum", MFX_PRESET_IDS));

    safe("registerCommand(mfx)", () => reg.registerCommand({
        name: "sapdon:mfx",
        description: "用 Molang 全能粒子生成效果",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
        mandatoryParameters: [
            { name: "sapdon:mfx_preset_enum", type: CustomCommandParamType.Enum },
        ],
        optionalParameters: [
            { name: "radius", type: CustomCommandParamType.Float },
            { name: "turns",  type: CustomCommandParamType.Float },
            { name: "life",   type: CustomCommandParamType.Integer },
            { name: "count",  type: CustomCommandParamType.Integer },
            { name: "color",  type: CustomCommandParamType.String },
            { name: "pos",    type: CustomCommandParamType.Location },
        ],
    }, (origin, presetId, radius?, turns?, life?, count?, color?, pos?) => {
        const src = resolveOrigin(origin, pos);
        if (!src) return { status: CustomCommandStatus.Failure, message: "需要由实体或命令方块执行" };
        if (!(presetId in MFX_PRESETS)) return { status: CustomCommandStatus.Failure, message: `未知配方 "${presetId}"，可用：${MFX_PRESET_IDS.join(", ")}` };
        // 自定义命令回调处于 restricted execution，无法直接 spawnParticle；
        // 用 system.run 延后到普通 tick 执行，避免 Unrestricted API 被拒。
        system.run(() => {
            const result = spawnMfx(src.dimension, src.loc, presetId as string, {
                radius,
                turns,
                lifeTicks: life,
                count,
                color,
            });
            if (!result.ok) console.warn(`[mfx] fail=${result.message}`);
        });
        return { status: CustomCommandStatus.Success, message: `[mfx] 已调度 ${MFX_PRESETS[presetId as string].label}` };
    }));

    // ----------------------------------------------------------
    // /sapdon:mfx_list
    // ----------------------------------------------------------
    safe("registerCommand(mfx_list)", () => reg.registerCommand({
        name: "sapdon:mfx_list",
        description: "列出所有 Molang 全能粒子配方",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
    }, () => {
        const list = MFX_PRESET_IDS.map((id) => `${id}(${MFX_PRESETS[id].label})`).join(", ");
        return { status: CustomCommandStatus.Success, message: `[mfx 配方] ${list}` };
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
            `[数学模式] ${MATH_MODE_IDS.join(", ")}`,
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
