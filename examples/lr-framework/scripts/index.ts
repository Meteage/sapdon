// ===== lr-framework :: scripts/index.ts（运行时入口）====
// 同时启动 电力引擎 + 流体引擎（都继承 BaseEngine），共用事件分发与交互。

import { world, system, ItemStack, CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus } from "@minecraft/server";
import { blockKey, getBlockByKey } from "./framework/engine/world.js";
import { makeLogger } from "./framework/engine/log.js";
import { PowerEngine } from "./systems/power/engine.js";
import { FluidEngine } from "./systems/fluid/engine.js";

const power = new PowerEngine(makeLogger("power"));
const fluid = new FluidEngine(makeLogger("fluid"));
const engines = [power, fluid];

const PLACE_ITEMS = ["lrf:wire_item", "lrf:pipe_item"];
const SMELT: Record<string, string> = {
    "minecraft:raw_iron": "minecraft:iron_ingot",
    "minecraft:raw_gold": "minecraft:gold_ingot",
    "minecraft:iron_ore": "minecraft:iron_ingot",
    "minecraft:gold_ore": "minecraft:gold_ingot",
    "minecraft:cobblestone": "minecraft:stone",
};

function which(typeId: string): PowerEngine | FluidEngine | null {
    if (power.isPart(typeId)) return power;
    if (fluid.isPart(typeId)) return fluid;
    return null;
}
function isPlacement(t: string | undefined) { return !!t && PLACE_ITEMS.includes(t); }

// 非受限上下文执行（改动世界/背包）
function defer(fn: () => void) { system.run(() => { try { fn(); } catch (e: any) { console.warn(`[lrf][err] defer: ${e?.message || e}`); } }); }
function consumeHand(player: any, wantType: string, slot: number): void {
    const inv = player.getComponent("minecraft:inventory");
    if (!inv) return;
    const stack = inv.container.getItem(slot);
    if (!stack || stack.typeId !== wantType) return;
    if (stack.amount > 1) inv.container.setItem(slot, new ItemStack(stack.typeId, stack.amount - 1));
    else inv.container.setItem(slot, undefined);
}

// 放置 / 破坏
world.afterEvents.playerPlaceBlock.subscribe((ev: any) => {
    const eng = which(ev.block.typeId); if (!eng) return;
    if (eng.isDeviceTypeId(ev.block.typeId)) eng.registerDevice(ev.block);
    eng.rebuildAround(ev.block);
    eng.ensureHeartbeat();
    eng.save();
});
world.afterEvents.playerBreakBlock.subscribe((ev: any) => {
    const id = ev.brokenBlockPermutation.type.id;
    const eng = which(id); if (!eng) return;
    if (eng.isDeviceTypeId(id)) eng.destroyDevice(blockKey(ev.block));
    eng.rebuildAround(ev.block);
    eng.ensureHeartbeat();
    eng.save();
});

// 交互（before 事件受限：只判定+cancel；实际改动走 system.run）
world.beforeEvents.playerInteractWithBlock.subscribe((event: any) => {
    const b = event.block; if (!b) return;
    const held = event.itemStack; if (!held) return;
    if (isPlacement(held.typeId)) return;
    const slot = event.player.selectedSlotIndex ?? 0;
    const player = event.player;

    // 电力：发电机喂煤 / 熔炉放料
    if (power.isPart(b.typeId)) {
        if (b.typeId === "lrf:coal_gen" && held.typeId === "minecraft:coal") {
            event.cancel = true; const key = blockKey(b);
            defer(() => { const fuel = power.feedCoal(key); consumeHand(player, "minecraft:coal", slot); power.ensureHeartbeat(); power.save(); world.sendMessage(`[电力] 已喂煤，存煤 ${fuel} 块`); });
            return;
        }
        if (b.typeId === "lrf:furnace" && SMELT[held.typeId]) {
            event.cancel = true; const key = blockKey(b); const t = held.typeId;
            defer(() => { const fb = getBlockByKey(key); if (fb && fb.typeId === "lrf:furnace") { power.setFurnaceInput(blockKey(fb), true); consumeHand(player, t, slot); power.ensureHeartbeat(); power.save(); world.sendMessage(`[电力] 电炉放入 ${t.split(":")[1]}，通电即熔炼`); } });
            return;
        }
        return;
    }
    // 流体：泵/阀门 右键切换
    if (fluid.isPart(b.typeId) && !held.typeId.startsWith("lrf:")) {
        event.cancel = true; const key = blockKey(b);
        if (b.typeId === "lrf:pump") { defer(() => { const on = fluid.togglePump(key); fluid.ensureHeartbeat(); fluid.save(); world.sendMessage(`[流体] 泵${on ? "启动" : "停止"}`); }); return; }
        if (b.typeId === "lrf:valve") { defer(() => { const open = fluid.toggleValve(key); fluid.ensureHeartbeat(); fluid.save(); world.sendMessage(`[流体] 阀门${open ? "打开" : "关断"}`); }); return; }
    }
});

// 世界加载：恢复两引擎小状态
world.afterEvents.worldLoad.subscribe(() => {
    for (const e of engines) { e.load(); e.ensureHeartbeat(); }
});

// 启动：先各跑一次并启动心跳（空闲自动停）
system.run(() => { for (const e of engines) e.ensureHeartbeat(); });

// 调试命令
system.beforeEvents.startup.subscribe((init: any) => {
    init.customCommandRegistry.registerCommand({
        name: "lrf:log",
        description: "on|off：运行期日志",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false,
        mandatoryParameters: [{ name: "on", type: CustomCommandParamType.String }],
    }, (_o: any, on: string) => {
        const en = on === "on";
        power.setRuntimeLog(en); fluid.setRuntimeLog(en);
        return { status: CustomCommandStatus.Success, message: `运行期日志已${en ? "开启" : "关闭"}` };
    });
});