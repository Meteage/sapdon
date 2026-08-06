import { system, world } from "@minecraft/server";
import {
    WIRE_TYPE,
    SWITCH_TYPE,
    isCircuit,
    getAdjacent,
    oppositeFace,
    recomputeWire,
    recomputeAdjacentWires,
    registerNode,
    unregisterNode,
    rebuildAround,
    propagate,
    clearNodes,
} from "./circuit.js";

const POWER_STATE = "sapdon:powered";
const FACES = ["North", "South", "East", "West", "Up", "Down"];

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
                const node = registerNode(block);
                node.powered = next;
                propagate();
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
            wire.setPermutation(wire.permutation.withState(stateKey, current ? 0 : 1));
            world.sendMessage(`[debug] ${stateKey} -> ${current ? 0 : 1}`);
            registerNode(wire);
            propagate();
        }
    });

    world.afterEvents.playerPlaceBlock.subscribe((event) => {
        const block = event.block;
        if (!isCircuit(block.typeId)) return;
        if (block.typeId === WIRE_TYPE) recomputeWire(block);
        recomputeAdjacentWires(block);
        rebuildAround(block);
    });

    world.afterEvents.playerBreakBlock.subscribe((event) => {
        if (!isCircuit(event.brokenBlockPermutation.type.id)) return;
        const block = event.block;
        unregisterNode(block);
        recomputeAdjacentWires(block);
        for (const face of FACES) {
            const nb = getAdjacent(block, face);
            if (isCircuit(nb.typeId)) rebuildAround(nb);
        }
    });

    world.afterEvents.playerInteractWithBlock.subscribe((event) => {
        if (!isCircuit(event.block.typeId)) return;
        rebuildAround(event.block);
    });

    world.afterEvents.worldLoad.subscribe(() => {
        clearNodes();
    });
});
