import { system, Dimension, Vector3, CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, CustomCommandSource } from "@minecraft/server";
import { spawnMfx, MFX_PRESETS, MFX_PRESET_IDS, spawnUniCustom, parseCurve, uniHelpText, spawnShapeSculpt, sculptHelpText } from "./mfx.js";
import { SHAPE_IDS } from "./effects.js";

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
// 指令注册（仅 mfx 家族：脚本只生成初始形状，粒子由 Molang/发射器自移动）
// ============================================================
system.beforeEvents.startup.subscribe((init) => {
    const reg = init.customCommandRegistry;

    // 注意：Enum 类型参数的 name 必须等于枚举名，否则报 EnumDependencyMissing。
    const safe = (label: string, fn: () => void) => {
        try {
            fn();
        } catch (e) {
            console.warn(`[mfx-cmd] ${label} 注册失败: ${e}`);
        }
    };

    safe("registerEnum(mfx_preset)", () => reg.registerEnum("colorparticle:mfx_preset_enum", MFX_PRESET_IDS));

    // ----------------------------------------------------------
    // /colorparticle:mfx <preset> [radius] [turns] [life] [count] [color] [pos]
    // ----------------------------------------------------------
    safe("registerCommand(mfx)", () => reg.registerCommand({
        name: "colorparticle:mfx",
        description: "用 Molang 全能粒子生成效果",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
        mandatoryParameters: [
            { name: "colorparticle:mfx_preset_enum", type: CustomCommandParamType.Enum },
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
    // /colorparticle:mfx_list
    // ----------------------------------------------------------
    safe("registerCommand(mfx_list)", () => reg.registerCommand({
        name: "colorparticle:mfx_list",
        description: "列出所有 Molang 全能粒子配方",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
    }, () => {
        const list = MFX_PRESET_IDS.map((id) => `${id}(${MFX_PRESETS[id].label})`).join(", ");
        return { status: CustomCommandStatus.Success, message: `[mfx 配方] ${list}` };
    }));

    console.warn(`[mfx-cmd] 指令注册完成：配方=${MFX_PRESET_IDS.length}`);

    // ----------------------------------------------------------
    // /colorparticle:uni <curve> [life] [color] [size] [sizemode] [fademode] [pos]
    // ----------------------------------------------------------
    safe("registerCommand(uni)", () => reg.registerCommand({
        name: "colorparticle:uni",
        description: "自定义单 uni 粒子（关键字式 DSL 驱动三轴运动）",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
        mandatoryParameters: [
            { name: "curve", type: CustomCommandParamType.String },
        ],
        optionalParameters: [
            { name: "life",     type: CustomCommandParamType.Integer },
            { name: "color",    type: CustomCommandParamType.String },
            { name: "size",     type: CustomCommandParamType.Float },
            { name: "sizemode", type: CustomCommandParamType.Integer },
            { name: "fademode", type: CustomCommandParamType.Integer },
            { name: "colormode",type: CustomCommandParamType.Integer },
            { name: "pos",      type: CustomCommandParamType.Location },
        ],
    }, (origin, curve?: string, life?: number, color?: string, size?: number, sizemode?: number, fademode?: number, colormode?: number, pos?: any) => {
        const src = resolveOrigin(origin, pos);
        if (!src) return { status: CustomCommandStatus.Failure, message: "需要由实体或命令方块执行" };
        if (!curve) return { status: CustomCommandStatus.Failure, message: "缺少 curve 参数" };
        const chk = parseCurve(curve);
        if (!chk.ok) return { status: CustomCommandStatus.Failure, message: `DSL 错误：${chk.message}` };
        system.run(() => {
            const result = spawnUniCustom(src.dimension, src.loc, curve, {
                lifeTicks: life,
                color,
                size,
                sizemode,
                fademode,
                colormode,
            });
            if (!result.ok) console.warn(`[uni] ${result.message}`);
        });
        return { status: CustomCommandStatus.Success, message: uniHelpText() };
    }));

    // ----------------------------------------------------------
    // /colorparticle:uni_help
    // ----------------------------------------------------------
    safe("registerCommand(uni_help)", () => reg.registerCommand({
        name: "colorparticle:uni_help",
        description: "显示自定义 uni 粒子 DSL 语法",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
    }, () => {
        return { status: CustomCommandStatus.Success, message: uniHelpText() };
    }));

    // ----------------------------------------------------------
    // /colorparticle:sculpt <shape> "<animDsl>" [mode move|scale] [radius] [count] [color] [size] [life]
    // ----------------------------------------------------------
    safe("registerEnum(sculpt_shape)", () => reg.registerEnum("colorparticle:sculpt_shape_enum", SHAPE_IDS));
    safe("registerEnum(sculpt_mode)", () => reg.registerEnum("colorparticle:sculpt_mode_enum", ["move", "scale"]));

    safe("registerCommand(sculpt)", () => reg.registerCommand({
        name: "colorparticle:sculpt",
        description: "已有形状枚举铺锚点 + uni 粒子运动 DSL；move=叠加平移/旋转, scale=整体径向缩放",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
        mandatoryParameters: [
            { name: "colorparticle:sculpt_shape_enum", type: CustomCommandParamType.Enum },
            { name: "animDsl", type: CustomCommandParamType.String },
        ],
        optionalParameters: [
            { name: "colorparticle:sculpt_mode_enum", type: CustomCommandParamType.Enum },
            { name: "radius",   type: CustomCommandParamType.Float },
            { name: "count",    type: CustomCommandParamType.Integer },
            { name: "color",    type: CustomCommandParamType.String },
            { name: "size",     type: CustomCommandParamType.Float },
            { name: "life",     type: CustomCommandParamType.Integer },
        ],
    }, (origin, shape?: string, animDsl?: string, mode?: string, radius?: number, count?: number, color?: string, size?: number, life?: number) => {
        const src = resolveOrigin(origin, null);
        if (!src) return { status: CustomCommandStatus.Failure, message: "需要由实体或命令方块执行" };
        if (!shape || !animDsl) return { status: CustomCommandStatus.Failure, message: "缺少 shape / animDsl 参数" };
        const chk = parseCurve(animDsl);
        if (!chk.ok) return { status: CustomCommandStatus.Failure, message: `动画DSL错误：${chk.message}` };
        const m = mode === "scale" ? "scale" : "move";
        system.run(() => {
            const result = spawnShapeSculpt(src.dimension, src.loc, shape, animDsl, {
                mode: m, radius, count, color, size, lifeTicks: life,
            });
            if (!result.ok) console.warn(`[sculpt] ${result.message}`);
        });
        return { status: CustomCommandStatus.Success, message: `[sculpt] ${shape}×${m} × ${animDsl}` };
    }));

    // ----------------------------------------------------------
    // /colorparticle:sculpt_help
    // ----------------------------------------------------------
    safe("registerCommand(sculpt_help)", () => reg.registerCommand({
        name: "colorparticle:sculpt_help",
        description: "显示 sculpt 形状枚举 + uni 动画 DSL 语法",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
    }, () => {
        return { status: CustomCommandStatus.Success, message: sculptHelpText() };
    }));

    console.warn(`[mfx-cmd] 指令注册完成：配方=${MFX_PRESET_IDS.length}`);
});