import { Direction, system } from "@minecraft/server";

const wireBlockType = "sapdon:wire";
const andGateType = "sapdon:and_gate";
const orGateType = "sapdon:or_gate";
const notGateType = "sapdon:not_gate";

const FACES = [Direction.North, Direction.South, Direction.East, Direction.West, Direction.Up, Direction.Down];

const LEFT = { [Direction.North]: Direction.West, [Direction.South]: Direction.East, [Direction.East]: Direction.North, [Direction.West]: Direction.South };
const RIGHT = { [Direction.North]: Direction.East, [Direction.South]: Direction.West, [Direction.East]: Direction.South, [Direction.West]: Direction.North };
const BACK = { [Direction.North]: Direction.South, [Direction.South]: Direction.North, [Direction.East]: Direction.West, [Direction.West]: Direction.East };

function getSignal(block) {
    if (!block) return 0;
    try {
        return block.permutation.getState("sapdon:signal_strength") ?? 0;
    } catch {
        return 0;
    }
}

function setSignal(block, strength) {
    if (!block) return;
    const value = Math.max(0, Math.min(15, strength));
    if (getSignal(block) === value) return;
    block.setPermutation(block.permutation.withState("sapdon:signal_strength", value));
}

function getFacing(block) {
    try {
        return block.permutation.getState("minecraft:cardinal_direction");
    } catch {
        return null;
    }
}

function getAdjacent(block, direction) {
    switch (direction) {
        case Direction.North: return block.north();
        case Direction.South: return block.south();
        case Direction.East: return block.east();
        case Direction.West: return block.west();
        case Direction.Up: return block.above();
        case Direction.Down: return block.below();
        default: return null;
    }
}

function propagateWire(wire) {
    const signal = getSignal(wire);
    if (signal <= 1) return;
    for (const face of FACES) {
        const adjacent = getAdjacent(wire, face);
        if (adjacent && adjacent.typeId === wireBlockType) {
            setSignal(adjacent, signal - 1);
        }
    }
}

function updateGate(gate) {
    const id = gate.typeId;
    const facing = getFacing(gate);
    if (!facing) return;

    let output = 0;
    if (id === andGateType) {
        const inputA = getSignal(getAdjacent(gate, LEFT[facing]));
        const inputB = getSignal(getAdjacent(gate, RIGHT[facing]));
        output = Math.min(inputA, inputB);
    } else if (id === orGateType) {
        const inputA = getSignal(getAdjacent(gate, LEFT[facing]));
        const inputB = getSignal(getAdjacent(gate, RIGHT[facing]));
        output = Math.max(inputA, inputB);
    } else if (id === notGateType) {
        const input = getSignal(getAdjacent(gate, facing));
        output = input > 0 ? 0 : 15;
    }

    const outputBlock = getAdjacent(gate, BACK[facing]);
    if (outputBlock && outputBlock.typeId === wireBlockType) {
        setSignal(outputBlock, output);
    }
}

system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("sapdon:wire_tick", {
        onPlayerInteract(event) {
            if (event.block.typeId === wireBlockType) {
                setSignal(event.block, 15);
            }
        },
        onTick(event) {
            propagateWire(event.block);
        }
    });

    init.blockComponentRegistry.registerCustomComponent("sapdon:gate_tick", {
        onTick(event) {
            updateGate(event.block);
        }
    });
});
