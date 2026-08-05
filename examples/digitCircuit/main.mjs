import { BlockComponent, BlockAPI, registry } from '@sapdon/core'
import { BlockWire } from "./lib/wire.js";

const wire = new BlockWire("sapdon:wire","construction",[{stateTag:0,textures:["wire"]}]);

const andGate = BlockAPI.createRotatableBlock("sapdon:and_gate","construction",["and_gate"]);
andGate.registerState("sapdon:signal_strength", { values: { min: 0, max: 15 } });
andGate.addComponent(BlockComponent.setRedstoneConsumer(0, false));
andGate.addComponent(BlockComponent.setRedstoneConductivity(false, false));
andGate.addComponent(BlockComponent.setTick([5, 10], true));
andGate.addComponent(BlockComponent.setCustomComponents(["sapdon:gate_tick"]));

const orGate = BlockAPI.createRotatableBlock("sapdon:or_gate","construction",["or_gate"]);
orGate.registerState("sapdon:signal_strength", { values: { min: 0, max: 15 } });
orGate.addComponent(BlockComponent.setRedstoneConsumer(0, false));
orGate.addComponent(BlockComponent.setRedstoneConductivity(false, false));
orGate.addComponent(BlockComponent.setTick([5, 10], true));
orGate.addComponent(BlockComponent.setCustomComponents(["sapdon:gate_tick"]));

const notGate = BlockAPI.createRotatableBlock("sapdon:not_gate","construction",["not_gate"]);
notGate.registerState("sapdon:signal_strength", { values: { min: 0, max: 15 } });
notGate.addComponent(BlockComponent.setRedstoneConsumer(0, false));
notGate.addComponent(BlockComponent.setRedstoneConductivity(false, false));
notGate.addComponent(BlockComponent.setTick([5, 10], true));
notGate.addComponent(BlockComponent.setCustomComponents(["sapdon:gate_tick"]));

registry.submit()
