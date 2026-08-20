import { system, world, ItemStack, MolangVariableMap, CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus } from "@minecraft/server";
import {
    WIRE_TYPE, COAL_GEN_TYPE, SOLAR_TYPE, FURNACE_TYPE, BATTERY_TYPE, RELAY_TYPE,
    MULTIMETER_ITEM, PLACE_ITEMS, POWER_STATE,
    isPowerType,
    blockKey, getBlockByKey,
    rebuildAround,
    registerGenerator, registerSolar, registerFurnace, registerBattery, registerRelay,
    unregisterDevice, toggleRelay, feedGenerator, setFurnaceInput,
    ensureHeartbeat, savePower, loadPower, setRuntimeLog, describeSegmentAt, dumpGrid, powerPersistDiag,
    generators, batteries, furnaces, SMELT_TIME, SMELT_RECIPES,
} from "./power.js";

// 手持的是"放置类"电力物品（此时点击=放置意图，不触发其它行为）
function isPlacementItem(typeId: string | undefined): boolean {
    return !!typeId && PLACE_ITEMS.includes(typeId);
}

// 从玩家手持槽消耗 1 个指定物品（在非受限上下文调用，如 system.run 回调）
// 用 slot 快照，避免延迟执行时玩家已切换选中槽。
function consumeFromHand(player: { getComponent: (id: string) => { container: { getItem: (i: number) => { typeId: string; amount: number } | undefined; setItem: (i: number, v: ItemStack | undefined) => void } } | null; selectedSlotIndex?: number }, wantType: string, slot?: number): boolean {
    const inv = player.getComponent("minecraft:inventory");
    if (!inv) return false;
    const s = slot ?? player.selectedSlotIndex ?? 0;
    const stack = inv.container.getItem(s);
    if (!stack || stack.typeId !== wantType) return false;
    if (stack.amount > 1) inv.container.setItem(s, new ItemStack(stack.typeId, stack.amount - 1));
    else inv.container.setItem(s, undefined);
    return true;
}

// === 斜杠命令 ===
function registerPowerCommands(registry: any) {
    registry.registerCommand({
        name: "power_grid:power_diag",
        description: "电网持久化/内存诊断",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false,
    }, () => {
        const d = powerPersistDiag();
        console.warn("[diag] " + JSON.stringify(d));
        return {
            status: CustomCommandStatus.Success,
            message: `data=${d.size}ch chunked=${d.chunked} | segs=${d.segs} wires=${d.wires} gens=${d.gens} bats=${d.bats} fur=${d.fur}`,
        };
    });

    registry.registerCommand({
        name: "power_grid:power_log",
        description: "on|off：开关运行期诊断日志（写 ContentLog）",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false,
        mandatoryParameters: [{ name: "on", type: CustomCommandParamType.String }],
    }, (_origin: any, on: string) => {
        const enable = on === "on";
        setRuntimeLog(enable);
        return { status: CustomCommandStatus.Success, message: `运行期日志已${enable ? "开启" : "关闭"} (power_grid:power_log on|off)` };
    });

    registry.registerCommand({
        name: "power_grid:power_dump",
        description: "转储玩家附近电网状态（写 ContentLog + 聊天）",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false,
        optionalParameters: [{ name: "radius", type: CustomCommandParamType.Integer }],
    }, (origin: any, radius: number) => {
        const src = origin.sourceEntity;
        const loc = src && src.location ? { x: src.location.x, y: src.location.y, z: src.location.z } : null;
        system.run(() => dumpGrid(loc, radius));
        return { status: CustomCommandStatus.Success, message: `正在转储 radius ${radius || 20} ...` };
    });
}

system.beforeEvents.startup.subscribe((init) => {
    // === 万用表：点继电器通断 / 点电线看段 / 点设备看明细 ===
    init.itemComponentRegistry.registerCustomComponent("power_grid:multimeter", {
        onUseOn(event: any) {
            const b = event.block;
            if (!b || !isPowerType(b.typeId)) return;
            try {
                if (b.typeId === RELAY_TYPE) {
                    const open = toggleRelay(b);
                    rebuildAround(b);
                    ensureHeartbeat();
                    savePower();
                    console.warn(`[power][evt] relay -> ${open ? "on" : "off"} @(${b.location.x},${b.location.y},${b.location.z})`);
                    world.sendMessage(`[继电器] 已${open ? "导通" : "关断"}（两侧电网${open ? "合并" : "分隔"}）`);
                    return;
                }
                if (b.typeId === WIRE_TYPE) {
                    const info = describeSegmentAt(b);
                    world.sendMessage(`[电线] ${info ?? "未接入任何段"}`);
                    console.warn(`[power][rt] wire @(${b.location.x},${b.location.y},${b.location.z}) ${info ?? "no seg"}`);
                    return;
                }
                if (b.typeId === COAL_GEN_TYPE) {
                    const g = generators.get(blockKey(b));
                    world.sendMessage(`[发电机] 燃烧 ${g ? g.burnTicks.toFixed(1) : "-"}s · 存煤 ${g ? g.fuel : 0} 块`);
                    return;
                }
                if (b.typeId === BATTERY_TYPE) {
                    const lv = batteries.get(blockKey(b));
                    world.sendMessage(`[电池] 电量 ${lv ? lv.level.toFixed(0) : "-"}`);
                    return;
                }
                if (b.typeId === SOLAR_TYPE) {
                    world.sendMessage(`[太阳能] 日照供电（白天 10/s，夜晚 0）`);
                    return;
                }
                if (b.typeId === FURNACE_TYPE) {
                    const f = furnaces.get(blockKey(b));
                    world.sendMessage(`[电炉] 原料=${f && f.input ? f.input.split(":")[1] : "-"} 进度 ${f ? f.progress.toFixed(1) : "-"}/${SMELT_TIME}`);
                }
            } catch (e: any) {
                console.warn(`[power][err] multimeter: ${e && e.message || e}`);
            }
        },
    });

    registerPowerCommands(init.customCommandRegistry);

    // === 点击交互：手持煤炭喂发电机 / 手持可熔原料放熔炉 ===
    // before 事件为“受限上下文”：只能读 itemStack、设 cancel，禁止 itemStack.amount / container.setItem。
    // 因此这里只判定意图 + cancel（阻止把可放置矿石贴到熔炉上），
    // 实际的喂料/放料/扣物品放到 system.run 的延迟回调执行（非受限上下文可改世界）。
    world.beforeEvents.playerInteractWithBlock.subscribe((event: any) => {
        try {
            const b = event.block;
            if (!b) return;
            const held = event.itemStack;
            if (!held) return;
            if (isPlacementItem(held.typeId) || held.typeId === MULTIMETER_ITEM) return;

            if (b.typeId === COAL_GEN_TYPE && held.typeId === "minecraft:coal") {
                event.cancel = true; // 阻止默认（不放置煤炭）
                const key = blockKey(b);
                const player = event.player;
                const slot = player.selectedSlotIndex ?? 0;
                system.run(() => {
                    try {
                        const fb = getBlockByKey(key);
                        if (!fb) return;
                        const fuel = feedGenerator(fb);
                        consumeFromHand(player, "minecraft:coal", slot);
                        ensureHeartbeat();
                        savePower();
                        world.sendMessage(`[发电机] 已喂煤，存煤 ${fuel} 块`);
                    } catch (e: any) {
                        console.warn(`[power][err] feed: ${e && e.message || e}`);
                    }
                });
                return;
            }
            if (b.typeId === FURNACE_TYPE && SMELT_RECIPES[held.typeId]) {
                event.cancel = true; // 阻止把可放置矿石贴到熔炉上
                const key = blockKey(b);
                const player = event.player;
                const slot = player.selectedSlotIndex ?? 0;
                const t = held.typeId;
                system.run(() => {
                    try {
                        const fb = getBlockByKey(key);
                        if (!fb) return;
                        if (setFurnaceInput(fb, t)) {
                            consumeFromHand(player, t, slot);
                            ensureHeartbeat();
                            savePower();
                            world.sendMessage(`[电炉] 已放入 ${t.split(":")[1]}，通电即可熔炼`);
                        } else {
                            world.sendMessage(`[电炉] 炉内已有原料在熔`);
                        }
                    } catch (e: any) {
                        console.warn(`[power][err] insert: ${e && e.message || e}`);
                    }
                });
                return;
            }
        } catch (e: any) {
            console.warn(`[power][err] interact: ${e && e.message || e}`);
        }
    });

    // === 放置：注册设备 + 重建段 + 保存 ===
    world.afterEvents.playerPlaceBlock.subscribe((event) => {
        try {
            const block = event.block;
            if (!isPowerType(block.typeId)) return;
            console.warn(`[power][evt] place ${block.typeId} @(${block.location.x},${block.location.y},${block.location.z})`);
            if (block.typeId === COAL_GEN_TYPE) registerGenerator(block);
            else if (block.typeId === SOLAR_TYPE) registerSolar(block);
            else if (block.typeId === FURNACE_TYPE) registerFurnace(block);
            else if (block.typeId === BATTERY_TYPE) registerBattery(block);
            else if (block.typeId === RELAY_TYPE) registerRelay(block);
            rebuildAround(block);
            ensureHeartbeat();
            savePower();
        } catch (e: any) {
            console.warn(`[power][err] playerPlaceBlock: ${e && e.message || e}`);
        }
    });

    // === 破坏：注销设备 + 断段重建；带电电线和熔炉/电池产生粒子反馈 ===
    world.afterEvents.playerBreakBlock.subscribe((event) => {
        try {
            const brokenId = event.brokenBlockPermutation.type.id;
            if (!isPowerType(brokenId)) return;
            const block = event.block;
            console.warn(`[power][evt] break ${brokenId} @(${block.location.x},${block.location.y},${block.location.z})`);
            const key = blockKey(block);
            const poweredBefore = (event.brokenBlockPermutation.getState(POWER_STATE as any) as number ?? 0) === 1;
            if ((brokenId === WIRE_TYPE && poweredBefore) || brokenId === FURNACE_TYPE || brokenId === BATTERY_TYPE) {
                const vars = new MolangVariableMap();
                vars.setVector3("variable.direction", { x: 0, y: 1, z: 0 });
                for (let i = 0; i < 8; i++) {
                    block.dimension.spawnParticle(brokenId === BATTERY_TYPE ? "minecraft:electric_spark_particle" : "minecraft:water_splash_particle", {
                        x: block.location.x + 0.5 + (Math.random() - 0.5) * 0.8,
                        y: block.location.y + 0.5 + (Math.random() - 0.5) * 0.5,
                        z: block.location.z + 0.5 + (Math.random() - 0.5) * 0.8,
                    }, vars);
                }
            }
            unregisterDevice(key);
            rebuildAround(block);
            ensureHeartbeat();
            savePower();
        } catch (e: any) {
            console.warn(`[power][err] playerBreakBlock: ${e && e.message || e}`);
        }
    });

    // === 世界加载：恢复小状态 + 重新注册继电器开/关（方块状态）===
    world.afterEvents.worldLoad.subscribe(() => {
        try {
            console.warn(`[diag] worldLoad pre: data=${typeof world.getDynamicProperty("power_grid:data")}`);
        } catch (e: any) {
            console.warn(`[diag] worldLoad pre read error: ${e && e.message || e}`);
        }
        loadPower();
        ensureHeartbeat();
        try {
            const d = powerPersistDiag();
            console.warn(`[diag] worldLoad post: ${JSON.stringify(d)}`);
        } catch (e: any) {
            console.warn(`[diag] worldLoad post error: ${e && e.message || e}`);
        }
    });

    // === 主循环：按需心跳（有活动才跑，空闲自动停）===
    // 任何世界事件（下方各订阅）都会调用 ensureHeartbeat() 唤醒。
    ensureHeartbeat();
});