import { system, world } from "@minecraft/server";
import {
    WIRE_TYPE,
    SWITCH_TYPE,
    isCircuit,
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
} from "./circuit.js";

const POWER_STATE = "sapdon:powered";
const FACES = ["North", "South", "East", "West", "Up", "Down"];

// 记录玩家本次“用物品点击方块”的目标面，用于判定导线放置时的连接面
const pendingPlace = new Map();

system.beforeEvents.startup.subscribe((init) => {
    init.itemComponentRegistry.registerCustomComponent("sapdon:debug_tool", {
        onUseOn(event) {
            const block = event.block;
            const loc = block.location;
            const face = event.blockFace;

            world.sendMessage(`[debug] ${block.typeId} @ (${loc.x}, ${loc.y}, ${loc.z}) face:${face}`);

            if (!isCircuit(block.typeId)) return;

            if (block.typeId === SWITCH_TYPE) {
                const current = block.permutation.getState(POWER_STATE) ?? 0;
                const next = current ? 0 : 1;
                block.setPermutation(block.permutation.withState(POWER_STATE, next));
                world.sendMessage(`[debug] ${POWER_STATE} -> ${next}`);
                const comp = registerComponent(block);
                comp.powered = next;
                propagate();
                saveCircuit();
                return;
            }

            let wire = null;
            let wireFace = null;

            if (block.typeId === WIRE_TYPE) {
                wire = block;
                wireFace = face.toLowerCase();
                const neighbor = getAdjacent(block, face);
                if (!isCircuit(neighbor.typeId)) {
                    world.sendMessage(`[debug] neighbor on ${wireFace} is not a circuit block, ignored`);
                    return;
                }
            } else {
                const neighbor = getAdjacent(block, face);
                if (neighbor.typeId !== WIRE_TYPE) {
                    world.sendMessage(`[debug] no wire on ${face}, ignored`);
                    return;
                }
                wire = neighbor;
                wireFace = oppositeFace(face);
            }

            const stateKey = `wire_connect:${wireFace}`;
            const current = wire.permutation.getState(stateKey) ?? 0;
            const next = current ? 0 : 1;
            setWireEdge(wire, wireFace, next);
            world.sendMessage(`[debug] ${stateKey} -> ${next}`);
            recomputeNetAround(wire);
            propagate();
            saveCircuit();
        }
    });

    // 前置事件：拿导线点击方块时记录其目标面
    world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
        if (event.itemStack && event.itemStack.typeId === WIRE_TYPE) {
            pendingPlace.set(event.player.id, { block: event.block, blockFace: event.blockFace });
        }
    });

    world.afterEvents.playerPlaceBlock.subscribe((event) => {
        const block = event.block;
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
    });

    world.afterEvents.playerBreakBlock.subscribe((event) => {
        if (!isCircuit(event.brokenBlockPermutation.type.id)) return;
        const block = event.block;
        unregisterComponent(block);
        disconnectNeighborWires(block);
        for (const face of FACES) {
            const nb = getAdjacent(block, face);
            if (isCircuit(nb.typeId)) rebuildAround(nb);
        }
        saveCircuit();
    });

    world.afterEvents.playerInteractWithBlock.subscribe((event) => {
        if (!isCircuit(event.block.typeId)) return;
        rebuildAround(event.block);
    });

    world.afterEvents.worldLoad.subscribe(() => {
        // 动态属性保存的是完整内存模型，加载时原样恢复即可，不依赖区块加载
        loadCircuit();
    });
});