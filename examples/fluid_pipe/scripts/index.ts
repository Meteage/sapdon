import { system, world, MolangVariableMap, CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus } from "@minecraft/server";
import {
    PIPE_TYPE,
    PUMP_TYPE,
    TANK_TYPE,
    VALVE_TYPE,
    VALVE3_TYPE,
    FLUID_STATE,
    PLACE_ITEMS,
    WRENCH_ITEM,
    isFluidType,
    blockKey,
    rebuildAround,
    registerPump,
    registerTank,
    unregisterDevice,
    togglePump,
    toggleValve,
    cycleValve3,
    tick,
    saveFluid,
    loadFluid,
    setRuntimeLog,
    describeSegmentAt,
    dumpFluid,
    fluidPersistDiag,
    tanks,
    pipeSeg,
    segments,
} from "./fluid.js";

// 手持的是"放置类"流体物品（此时点击 = 放置意图，不触发泵右键切换）
function isPlacementItem(typeId: string | undefined): boolean {
    return !!typeId && PLACE_ITEMS.includes(typeId);
}

// === 斜杠命令 ===
function registerFluidCommands(registry: any) {
    registry.registerCommand({
        name: "fluid_pipe:fluid_diag",
        description: "流体系统持久化/内存诊断",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false,
    }, () => {
        const d = fluidPersistDiag();
        console.warn("[diag] " + JSON.stringify(d));
        return {
            status: CustomCommandStatus.Success,
            message: `data=${d.size}ch chunked=${d.chunked} | segs=${d.segs} pipes=${d.pipes} tanks=${d.tanks} pumps=${d.pumps}`,
        };
    });

    registry.registerCommand({
        name: "fluid_pipe:fluid_log",
        description: "on|off：开关运行期诊断日志（写 ContentLog）",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false,
        mandatoryParameters: [{ name: "on", type: CustomCommandParamType.String }],
    }, (_origin: any, on: string) => {
        const enable = on === "on";
        setRuntimeLog(enable);
        return { status: CustomCommandStatus.Success, message: `运行期日志已${enable ? "开启" : "关闭"} (fluid_pipe:fluid_log on|off)` };
    });

    registry.registerCommand({
        name: "fluid_pipe:fluid_dump",
        description: "转储玩家附近流体系统状态（写 ContentLog + 聊天）",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false,
        optionalParameters: [{ name: "radius", type: CustomCommandParamType.Integer }],
    }, (origin: any, radius: number) => {
        const src = origin.sourceEntity;
        const loc = src && src.location ? { x: src.location.x, y: src.location.y, z: src.location.z } : null;
        system.run(() => dumpFluid(loc, radius));
        return { status: CustomCommandStatus.Success, message: `正在转储 radius ${radius || 20} ...` };
    });
}

system.beforeEvents.startup.subscribe((init) => {
    // === 管道扳手：点阀门切换开/关、点泵切换运行/停止、点管道/罐查看诊断 ===
    init.itemComponentRegistry.registerCustomComponent("fluid_pipe:wrench", {
        onUseOn(event: any) {
            const block = event.block;
            if (!block || !isFluidType(block.typeId)) return;
            try {
                if (block.typeId === VALVE_TYPE) {
                    const open = toggleValve(block);
                    rebuildAround(block);
                    saveFluid();
                    world.sendMessage(`[阀门] 已${open ? "打开" : "关闭"} @(${block.location.x},${block.location.y},${block.location.z})`);
                    return;
                }
                if (block.typeId === VALVE3_TYPE) {
                    const dir = cycleValve3(block);
                    rebuildAround(block);
                    saveFluid();
                    world.sendMessage(`[三通阀] ${dir === "west" ? "已关闭（指向输入）" : `输出方向 -> ${dir}`} @(${block.location.x},${block.location.y},${block.location.z})`);
                    return;
                }
                if (block.typeId === PUMP_TYPE) {
                    const on = togglePump(block);
                    saveFluid();
                    world.sendMessage(`[泵] 已${on ? "启动" : "停止"} @(${block.location.x},${block.location.y},${block.location.z})`);
                    return;
                }
                if (block.typeId === PIPE_TYPE) {
                    const info = describeSegmentAt(block);
                    world.sendMessage(`[管道] ${info ?? "未接入任何段"}`);
                    console.warn(`[rt] pipe @(${block.location.x},${block.location.y},${block.location.z}) ${info ?? "no seg"}`);
                    return;
                }
                if (block.typeId === TANK_TYPE) {
                    const t = tanks.get(blockKey(block));
                    world.sendMessage(`[储液罐] level=${t ? `${t.level}/32` : "-"}`);
                    return;
                }
            } catch (e: any) {
                console.warn(`[fluid][err] wrench: ${e && e.message || e}`);
            }
        },
    });

    registerFluidCommands(init.customCommandRegistry);

    // === 放置：注册设备 + 重建段（管道/阀门全自动连臂；阀状态=方块状态，无需注册）===
    world.afterEvents.playerPlaceBlock.subscribe((event) => {
        try {
            const block = event.block;
            if (!isFluidType(block.typeId)) return;
            if (block.typeId === PUMP_TYPE) registerPump(block);
            else if (block.typeId === TANK_TYPE) registerTank(block);
            rebuildAround(block);
            saveFluid();
        } catch (e: any) {
            console.warn(`[fluid][err] playerPlaceBlock: ${e && e.message || e}`);
        }
    });

    // === 破坏：注销设备 + 断段重建；含水的管道破裂时播放水溅射粒子 ===
    world.afterEvents.playerBreakBlock.subscribe((event) => {
        try {
            const brokenId = event.brokenBlockPermutation.type.id;
            if (!isFluidType(brokenId)) return;
            const block = event.block;
            // 用破坏前的 permutation 判断是否含水（破坏后 event.block 已是空气，读不到状态）；
            // 兜底：段内存 front>0 说明该段有水流过（覆盖"仅浸水未流动"场景）
            const key = blockKey(block);
            const sid = pipeSeg.get(key);
            const seg = sid ? segments.get(sid) : null;
            const hadWater = (event.brokenBlockPermutation.getState(FLUID_STATE as any) as number ?? 0) === 1
                || (!!seg && seg.front > 0);
            if (brokenId === PIPE_TYPE && hadWater) {
                // 管道里有水 → 破裂水溅射（随机偏移 + 朝上方向变量，basic 粒子引用 variable.direction）
                const vars = new MolangVariableMap();
                vars.setVector3("variable.direction", { x: 0, y: 1, z: 0 });
                for (let i = 0; i < 10; i++) {
                    block.dimension.spawnParticle("minecraft:water_splash_particle", {
                        x: block.location.x + 0.5 + (Math.random() - 0.5) * 0.8,
                        y: block.location.y + 0.5 + (Math.random() - 0.5) * 0.5,
                        z: block.location.z + 0.5 + (Math.random() - 0.5) * 0.8,
                    }, vars);
                }
            }
            unregisterDevice(blockKey(block));
            rebuildAround(block);
            saveFluid();
        } catch (e: any) {
            console.warn(`[fluid][err] playerBreakBlock: ${e && e.message || e}`);
        }
    });

    // === 泵右键切换开/关 + 管道注水/舀水后重建（手持放置类物品/扳手时跳过）===
    world.afterEvents.playerInteractWithBlock.subscribe((event) => {
        try {
            const b = event.block;
            if (!b || !isFluidType(b.typeId)) return;
            const held = event.itemStack;
            if (isPlacementItem(held?.typeId) || held?.typeId === WRENCH_ITEM) return;
            if (b.typeId === PUMP_TYPE) {
                const on = togglePump(b);
                saveFluid();
                world.sendMessage(`[泵] 已${on ? "启动" : "停止"} @(${b.location.x},${b.location.y},${b.location.z})`);
            } else if (b.typeId === PIPE_TYPE) {
                // 用水桶向管道注水/舀水后，重新判定浸润源
                rebuildAround(b);
                saveFluid();
            }
        } catch (e: any) {
            console.warn(`[fluid][err] playerInteract: ${e && e.message || e}`);
        }
    });

    // === 世界加载：原样恢复内存模型（不写方块，tick 渲染自动对账）===
    world.afterEvents.worldLoad.subscribe(() => {
        try {
            console.warn(`[diag] worldLoad pre: data=${typeof world.getDynamicProperty("fluid_pipe:data")}`);
        } catch (e: any) {
            console.warn(`[diag] worldLoad pre read error: ${e && e.message || e}`);
        }
        loadFluid();
        try {
            const d = fluidPersistDiag();
            console.warn(`[diag] worldLoad post: ${JSON.stringify(d)}`);
        } catch (e: any) {
            console.warn(`[diag] worldLoad post error: ${e && e.message || e}`);
        }
    });

    // === 主循环：每 20 tick（1 秒）势求解 + 流动 + 渲染 ===
    system.run(() => { try { tick(); } catch (e: any) { console.warn(`[fluid][err] tick: ${e && e.message || e}`); } });
    system.runInterval(() => {
        try { tick(); } catch (e: any) { console.warn(`[fluid][err] tick: ${e && e.message || e}`); }
    }, 20);
});
