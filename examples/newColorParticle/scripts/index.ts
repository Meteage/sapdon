import { system, Dimension, Vector3, CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, CustomCommandSource } from "@minecraft/server";
import { spawnMfx, MFX_PRESETS, MFX_PRESET_IDS } from "./mfx.js";

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

    safe("registerEnum(mfx_preset)", () => reg.registerEnum("sapdon:mfx_preset_enum", MFX_PRESET_IDS));

    // ----------------------------------------------------------
    // /sapdon:mfx <preset> [radius] [turns] [life] [count] [color] [pos]
    // ----------------------------------------------------------
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

    console.warn(`[mfx-cmd] 指令注册完成：配方=${MFX_PRESET_IDS.length}`);
});