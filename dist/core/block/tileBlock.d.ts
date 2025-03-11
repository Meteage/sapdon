export class TileBlock {
    /**
     * 带实体的方块类
     * @param {*} identifier
     * @param {*} category
     * @param {*} textures_arr
     * @param {*} options
     */
    constructor(identifier: any, category: any, textures_arr: any, options?: any);
    block: BasicBlock;
    entity: Entity;
    setGeometry(geometry: any): void;
    addAnimation(name: any, animation: any): void;
    setScript(key: any, value: any): void;
}
import { BasicBlock } from "./basicBlock.js";
import { Entity } from "../entity/entity.js";
