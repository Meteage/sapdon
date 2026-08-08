import { system, world, ItemStack, CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus } from "@minecraft/server";
import {
    WIRE_TYPE,
    SWITCH_TYPE,
    isCircuit,
    isInputPort,
    isOutputPort,
    getAdjacent,
    oppositeFace,
    connectWireOnPlacement,
    setWireEdge,
    disconnectNeighborWires,
    registerComponent,
    unregisterComponent,
    recomputeNetAround,
    rebuildAround,
    propagate,
    saveCircuit,
    loadCircuit,
    compileLogic,
    setCompileLog,
    setRuntimeLog,
    debugComponent,
    dumpCircuit,
    describeWireNet,
    bindChipLogic,
    unbindChipLogic,
} from "./circuit.js";
import {
    saveLogic,
    getLogicByUuid,
    getLogicByName,
    listLogic,
} from "./logicStore.js";

const POWER_STATE = "sapdon:powered";
const FACES = ["North", "South", "East", "West", "Up", "Down"];

// 总调试开关：false 时关闭所有 [debug]/[evt]/[err] sendMessage
const DBG = false;
function dbg(msg) {
    if (DBG) world.sendMessage(msg);
}

// 记录玩家本次“用物品点击方块”的目标面，用于判定导线放置时的连接面
const pendingPlace = new Map();

// 按 uuid 或（规范化的）物品名称查找已保存逻辑
function resolveLogic(ref) {
    if (!ref) return null;
    return getLogicByUuid(ref) || getLogicByName(ref);
}

function logicRefName(ref) {
    const rec = resolveLogic(ref);
    return rec;
}

// 消耗当前手持物品一个（事件 itemStack 是快照，需按选中槽位写回容器）
function consumeOne(item, event) {
    if (!item) return;
    const source = event.source;
    const inventory = source.getComponent("minecraft:inventory");
    if (!inventory) return;
    const container = inventory.container;
    const slot = source.selectedSlotIndex ?? 0;
    const stack = container.getItem(slot);
    if (!stack || stack.typeId !== item.typeId) return;
    if (stack.amount > 1) {
        stack.amount -= 1;
        container.setItem(slot, stack);
    } else {
        container.setItem(slot, undefined);
    }
}

// 官方自定义命令（斜杠命令）注册
function registerLogicCommands(registry) {
    registry.registerCommand({
        name: "sapdon:logic_list",
        description: "列出已保存的电路逻辑",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
    }, () => {
        const all = listLogic();
        if (!all.length) return { status: CustomCommandStatus.Failure, message: "暂无已保存逻辑" };
        const lines = all.map((r) => `uuid=${r.uuid} name=${r.name || "-"} in=[${r.inputs.join(",")}] out=[${r.outputs.join(",")}]`);
        return { status: CustomCommandStatus.Success, message: lines.join(" | ") };
    });

    registry.registerCommand({
        name: "sapdon:logic_info",
        description: "查看某个 uuid/名称的电路逻辑真值表",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
        mandatoryParameters: [{ name: "ref", type: CustomCommandParamType.String }],
    }, (_origin, ref) => {
        const rec = resolveLogic(ref);
        if (!rec) return { status: CustomCommandStatus.Failure, message: "未找到该 uuid/名称" };
        const lines = [`uuid=${rec.uuid} name=${rec.name || "-"} in=[${rec.inputs.join(",")}] out=[${rec.outputs.join(",")}]`];
        for (const [inMask, outMask] of rec.table) lines.push(`  in=${inMask} out=${outMask}`);
        return { status: CustomCommandStatus.Success, message: lines.join("\n") };
    });

    registry.registerCommand({
        name: "sapdon:logic_test",
        description: "手动测试逻辑：给定输入掩码，返回输出",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
        mandatoryParameters: [
            { name: "ref", type: CustomCommandParamType.String },
            { name: "mask", type: CustomCommandParamType.Integer },
        ],
    }, (_origin, ref, mask) => {
        const rec = resolveLogic(ref);
        if (!rec) return { status: CustomCommandStatus.Failure, message: "未找到该 uuid/名称" };
        if (mask < 0 || mask >= Math.pow(2, rec.inputs.length)) {
            return { status: CustomCommandStatus.Failure, message: `mask 需在 0..${Math.pow(2, rec.inputs.length) - 1}` };
        }
        const row = rec.table.find(([m]) => m === mask);
        return { status: CustomCommandStatus.Success, message: `in=${mask} -> out=${row ? row[1] : "?"}` };
    });

    registry.registerCommand({
        name: "sapdon:logic_dump",
        description: "转储玩家附近电路状态（诊断日志）",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false,
        optionalParameters: [{ name: "radius", type: CustomCommandParamType.Integer }],
    }, (origin, radius) => {
        const src = origin.sourceEntity;
        const r = (radius && radius > 0) ? radius : 20;
        const loc = src && src.location ? { x: src.location.x, y: src.location.y, z: src.location.z } : null;
        system.run(() => {
            if (loc) dumpCircuit(loc, r);
            else dumpCircuit(null, null);
        });
        return { status: CustomCommandStatus.Success, message: `正在转储 radis ${r} ...` };
    });

    registry.registerCommand({
        name: "sapdon:logic_log",
        description: "on|off：开关运行期位宽/分线/合线诊断日志（写入 ContentLog）",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false,
        mandatoryParameters: [{ name: "on", type: CustomCommandParamType.String }],
    }, (_origin, on) => {
        const enable = on === "on";
        setRuntimeLog(enable);
        return { status: CustomCommandStatus.Success, message: `运行期日志已${enable ? "开启" : "关闭"} (sapdon:logic_log on|off)` };
    });
}

system.beforeEvents.startup.subscribe((init) => {
    init.itemComponentRegistry.registerCustomComponent("sapdon:debug_tool", {
        onUseOn(event) {
            const block = event.block;
            const loc = block.location;
            const face = event.blockFace;

            dbg(`[debug] ${block.typeId} @ (${loc.x}, ${loc.y}, ${loc.z}) face:${face}`);

            if (!isCircuit(block.typeId)) return;

            // 导线：打印所属网络的位宽/信号/端子，再执行连接状态切换
            if (block.typeId === WIRE_TYPE) {
                const info = describeWireNet(block);
                if (info) {
                    const terms = info.terms.join(" ");
                    world.sendMessage(`[wire] net=${info.netId} width=${info.width}bit signal=${info.signal} wires=${info.wires} terms=[${terms}]`);
                    console.warn(`[rt] wire=(${loc.x},${loc.y},${loc.z}) net=${info.netId} width=${info.width}bit signal=${info.signal} wires=${info.wires} terms=[${terms}]`);
                }
            }

            if (block.typeId === SWITCH_TYPE) {
                const current = block.permutation.getState(POWER_STATE) ?? 0;
                const next = current ? 0 : 1;
                block.setPermutation(block.permutation.withState(POWER_STATE, next));
                dbg(`[debug] ${POWER_STATE} -> ${next}`);
                const comp = registerComponent(block);
                comp.powered = next;
                propagate();
                saveCircuit();
                return;
            }

            // 分线器/合并器/门：打印各面信号与位宽
            if (isInputPort(block.typeId) || isOutputPort(block.typeId)) return;
            if (block.typeId === "sapdon:splitter" || block.typeId === "sapdon:merger" || block.typeId === "sapdon:and_gate" || block.typeId === "sapdon:or_gate" || block.typeId === "sapdon:not_gate") {
                const info = debugComponent(`${block.dimension.id}:${loc.x},${loc.y},${loc.z}`);
                if (info) world.sendMessage(`[comp] ${info.type} facing=${info.facing} out=${info.powered} :: ${info.faces}`);
                return;
            }

            let wire = null;
            let wireFace = null;

            if (block.typeId === WIRE_TYPE) {
                wire = block;
                wireFace = face.toLowerCase();
                const neighbor = getAdjacent(block, face);
                if (!isCircuit(neighbor.typeId)) {
                    dbg(`[debug] neighbor on ${wireFace} is not a circuit block, ignored`);
                    return;
                }
            } else {
                const neighbor = getAdjacent(block, face);
                if (neighbor.typeId !== WIRE_TYPE) {
                    dbg(`[debug] no wire on ${face}, ignored`);
                    return;
                }
                wire = neighbor;
                wireFace = oppositeFace(face);
            }

            const stateKey = `wire_connect:${wireFace}`;
            const current = wire.permutation.getState(stateKey) ?? 0;
            const next = current ? 0 : 1;
            setWireEdge(wire, wireFace, next);
            dbg(`[debug] ${stateKey} -> ${next}`);
            recomputeNetAround(wire);
            propagate();
            saveCircuit();
        }
    });

    init.itemComponentRegistry.registerCustomComponent("sapdon:logic_tool", {
        onUseOn(event) {
            const block = event.block;
            const item = event.itemStack;

            // 用已保存逻辑的物品点击 chip 芯片：绑定逻辑并消耗一个物品
            if (block && block.typeId === "sapdon:chip") {
                // 潜行点击=取回，不在此处绑定（交给 afterEvents 处理）
                if (event.source && event.source.isSneaking) return;
                const lore = item ? item.getLore() : [];
                const uuidLine = lore.find((l) => l.startsWith("uuid: "));
                const uuid = uuidLine ? uuidLine.slice("uuid: ".length) : "";
                if (!uuid) {
                    world.sendMessage(`[circuit] 该物品未绑定任何已保存逻辑`);
                    return;
                }
                const comp = bindChipLogic(block, uuid);
                if (!comp) {
                    world.sendMessage(`[circuit] 逻辑不存在或绑定失败（uuid=${uuid}）`);
                    return;
                }
                consumeOne(item, event);
                propagate();
                saveCircuit();
                world.sendMessage(`[电路] 芯片已按逻辑 uuid=${uuid} 工作（北=输出，南=输入）`);
                return;
            }

            if (!isCircuit(block.typeId) || !isInputPort(block.typeId)) {
                world.sendMessage(`[circuit] 请在"输入端口"或"芯片"方块上使用`);
                return;
            }
            setCompileLog(true);
            const result = compileLogic(block);
            setCompileLog(false);
            if (result.error) {
                world.sendMessage(`[circuit] 保存失败: ${result.error}`);
                return;
            }
            const source = event.source;
            const inventory = source.getComponent("minecraft:inventory");
            if (!inventory) {
                world.sendMessage(`[circuit] 无法访问物品栏`);
                return;
            }
            const container = inventory.container;
            const name = event.itemStack.nameTag ? event.itemStack.nameTag : undefined;
            const record = saveLogic({ ...result, name });
            consumeOne(event.itemStack, event);
            const bound = new ItemStack("sapdon:logic_tool", 1);
            bound.setLore(["sapdos:logic", "uuid: " + record.uuid, "name: " + (name || "-")]);
            if (name) bound.nameTag = name;
            container.addItem(bound);

            world.sendMessage(`[电路] 已保存逻辑 uuid=${record.uuid} in=[${record.inputs.join(",")}] out=[${record.outputs.join(",")}]`);
        }
    });

    // 手动测试/管理命令：官方自定义命令（斜杠命令，无需 chatSend）
    registerLogicCommands(init.customCommandRegistry);

    // 前置事件：拿导线点击方块时记录其目标面
    world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
        if (event.itemStack && event.itemStack.typeId === WIRE_TYPE) {
            pendingPlace.set(event.player.id, { block: event.block, blockFace: event.blockFace });
        }
    });

    world.afterEvents.playerPlaceBlock.subscribe((event) => {
        try {
            const block = event.block;
            dbg(`[evt] place ${block.typeId.split(":")[1]}@(${block.location.x},${block.location.y},${block.location.z})`);
            if (!isCircuit(block.typeId)) return;
            if (block.typeId === WIRE_TYPE) {
                const rec = pendingPlace.get(event.player.id);
                if (rec) {
                    // 新导线贴着被点击方块放置，连接面 = 被点击面的反面；仅当该面相邻确为该方块才连
                    const wireFace = oppositeFace(rec.blockFace);
                    const nb = getAdjacent(block, wireFace[0].toUpperCase() + wireFace.slice(1));
                    if (nb.location.x === rec.block.location.x &&
                        nb.location.y === rec.block.location.y &&
                        nb.location.z === rec.block.location.z) {
                        connectWireOnPlacement(block, wireFace);
                    } else {
                        pendingPlace.delete(event.player.id);
                    }
                }
                pendingPlace.delete(event.player.id);
            }
            rebuildAround(block);
            saveCircuit();
        } catch (e) {
            dbg(`[err] playerPlaceBlock: ${e.message || e}`);
        }
    });

    world.afterEvents.playerBreakBlock.subscribe((event) => {
        try {
            if (!isCircuit(event.brokenBlockPermutation.type.id)) return;
            const block = event.block;
            dbg(`[evt] break ${event.brokenBlockPermutation.type.id.split(":")[1]}@(${block.location.x},${block.location.y},${block.location.z})`);
            unregisterComponent(block);
            disconnectNeighborWires(block);
            for (const face of FACES) {
                const nb = getAdjacent(block, face);
                if (isCircuit(nb.typeId)) rebuildAround(nb);
            }
            saveCircuit();
        } catch (e) {
            dbg(`[err] playerBreakBlock: ${e.message || e}`);
        }
    });

    world.afterEvents.playerInteractWithBlock.subscribe((event) => {
        try {
            const b = event.block;
            if (!isCircuit(b.typeId)) return;

            // 潜行点击已加载芯片：取回绑定逻辑物品，芯片恢复未加载
            if (b.typeId === "sapdon:chip" && event.player && event.player.isSneaking) {
                const uuid = unbindChipLogic(b);
                if (uuid) {
                    const rec = getLogicByUuid(uuid);
                    const returned = new ItemStack("sapdon:logic_tool", 1);
                    returned.setLore(["sapdos:logic", "uuid: " + uuid, "name: " + ((rec && rec.name) || "-")]);
                    if (rec && rec.name) returned.nameTag = rec.name;
                    event.player.dimension.spawnItem(returned, { x: b.location.x + 0.5, y: b.location.y + 1.2, z: b.location.z + 0.5 });
                    propagate();
                    saveCircuit();
                    world.sendMessage(`[电路] 已从芯片取回逻辑 uuid=${uuid}`);
                    return;
                }
                return;
            }

            dbg(`[evt] interact ${b.typeId.split(":")[1]}@(${b.location.x},${b.location.y},${b.location.z})`);
            rebuildAround(b);
        } catch (e) {
            dbg(`[err] playerInteract: ${e.message || e}`);
        }
    });

    world.afterEvents.worldLoad.subscribe(() => {
        dbg(`[evt] worldLoad -> loadCircuit`);
        // 动态属性保存的是完整内存模型，加载时原样恢复即可，不依赖区块加载
        loadCircuit();
        dbg(`[evt] worldLoad loadCircuit done`);
    });
});