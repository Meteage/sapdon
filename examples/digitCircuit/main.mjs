import { BlockComponent, BlockAPI, registry } from '@sapdon/core'
import { BlockWire } from "./lib/wire.js";

BlockAPI.createRotatableBlock("sapdon:and_gate","construction", ["and_gate"]);

BlockAPI.createRotatableBlock("sapdon:not_gate","construction", ["not_gate"]);

BlockAPI.createRotatableBlock("sapdon:or_gate","construction", ["or_gate"] );

const wire = new BlockWire("sapdon:wire","construction",[{stateTag:0,textures:["wire"]}]);

registry.submit()
