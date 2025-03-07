export namespace BlockAPI {
    function createBasicBlock(identifier: string, category: string, textures_arr: any[], options?: {
        group: string;
        hide_in_command: boolean;
    }): BasicBlock;
    function createBlock(identifier: string, category: string, variantDatas: any[], options?: {
        group: string;
        hide_in_command: boolean;
        ambient_occlusion: boolean;
        face_dimming: boolean;
        render_method: string;
    }): Block;
    function createRotatableBlock(identifier: string, category: string, textures_arr: any[], options?: {
        group: string;
        hide_in_command: boolean;
        rotationType: string;
        yRotationOffset: number;
    }): RotatableBlock;
    function createGeometryBlock(identifier: any, category: any, geometry: any, material_instances: any, options?: {}): GeometryBlock;
    function createOreBlock(identifier: any, category: any, textures_arr: any, options?: {}): OreBlock;
    function createCropBlock(identifier: string, category: string, variantDatas: any[], options?: {
        group: string;
        hide_in_command: boolean;
        ambient_occlusion: boolean;
        face_dimming: boolean;
        render_method: string;
    }): CropBlock;
}
import { BasicBlock } from "../block/BasicBlock.js";
import { Block } from "../block/block.js";
import { RotatableBlock } from "../block/RotatableBlock.js";
import { GeometryBlock } from "../block/GeometryBlock.js";
import { OreBlock } from "../block/OreBlock.js";
import { CropBlock } from "../block/cropBlock.js";
