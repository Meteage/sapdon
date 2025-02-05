import { BasicBlock } from "../block/BasicBlock.js";
import { Block } from "../block/block.js";
import { GeometryBlock } from "../block/GeometryBlock.js";
import { OreBlock } from "../block/OreBlock.js";
import { RotatableBlock } from "../block/RotatableBlock.js";
import { GRegistry } from "../registry.js";


/**
 * 注册方块到注册表中。
 * @param {Block} block - 要注册的方块对象。
 */
const registerBlock = (block) => {
    if (!block || !block.identifier) {
        throw new Error("无效的方块对象或缺少 identifier。");
    }

    const block_name = block.identifier.replace(":", "_");
    GRegistry.register(block_name, "behavior", "blocks/", block);
};

const registerFeature = (feature)=>{
    const feature_name = feature.identifier.split(":")[feature.identifier.split(":").length - 1];
    GRegistry.register(feature_name,"behavior","features/",feature);
};

const registerFeatureRule = (feature_rule)=>{
    const feature_rule_name = feature_rule.identifier.split(":")[feature_rule.identifier.split(":").length - 1];
    GRegistry.register(feature_rule_name,"behavior","feature_rules/",feature_rule);
};

export const BlockAPI = {
    /**
     * 创建一个基础方块。
     * @param {string} identifier - 方块的唯一标识符。
     * @param {string} category - 方块的分类（如 "construction"）。
     * @param {Array} textures_arr - 纹理数组，顺序为 [上, 下, 东, 西, 南, 北]。
     * @param {Object} options - 可选参数。
     * @param {string} options.group - 分组，默认为 "construction"。
     * @param {boolean} options.hide_in_command - 是否在命令中隐藏，默认为 false。
     * @returns {BasicBlock} 创建的基础方块对象。
     */
    createBasicBlock: function (identifier, category, textures_arr, options = {}) {
        if (!identifier || !category || !textures_arr ) {
            throw new Error("必须提供 identifier、category 和长度为 6 的 textures_arr。");
        }

        const block = new BasicBlock(identifier, category, textures_arr, {
            group: "construction",
            hide_in_command: false,
            ...options, // 用传入的选项覆盖默认值
        });

        registerBlock(block); // 调用注册方法
        return block;
    },

    /**
     * 创建一个普通方块。
     * @param {string} identifier - 方块的唯一标识符。
     * @param {string} category - 方块的分类（如 "construction"）。
     * @param {Array} variantDatas - 方块的变体数据，包含每个变体的状态标签和纹理。
     * @param {Object} options - 可选参数。
     * @param {string} options.group - 分组，默认为 "construction"。
     * @param {boolean} options.hide_in_command - 是否在命令中隐藏，默认为 false。
     * @param {boolean} options.ambient_occlusion - 是否应用环境光遮蔽，默认为 false。
     * @param {boolean} options.face_dimming - 是否根据面的方向进行亮度调整，默认为 false。
     * @param {string} options.render_method - 渲染方法，默认为 "alpha_test"。
     * @returns {Block} 创建的方块对象。
     */
    createBlock: function (identifier, category, variantDatas, options = {}) {
        if (!identifier || !category || !variantDatas || variantDatas.length === 0) {
            throw new Error("必须提供 identifier、category 和 variantDatas。");
        }

        const block = new Block(identifier, category, variantDatas, {
            group: "construction",
            hide_in_command: false,
            ambient_occlusion: false,
            face_dimming: false,
            render_method: "alpha_test",
            ...options, // 用传入的选项覆盖默认值
        });

        registerBlock(block); // 调用注册方法
        return block;
    },

    /**
     * 创建一个可旋转方块。
     * @param {string} identifier - 方块的唯一标识符。
     * @param {string} category - 方块的分类（如 "construction"）。
     * @param {Array} textures_arr - 纹理数组，顺序为 [上, 下, 东, 西, 南, 北]。
     * @param {Object} options - 可选参数。
     * @param {string} options.group - 分组，默认为 "construction"。
     * @param {boolean} options.hide_in_command - 是否在命令中隐藏，默认为 false。
     * @param {string} options.rotationType - 旋转类型，默认为 "cardinal"。
     * @param {number} options.yRotationOffset - 初始旋转偏移量，默认为 180。
     * @returns {RotatableBlock} 创建的可旋转方块对象。
     */
    createRotatableBlock: function (identifier, category, textures_arr, options = {}) {
        if (!identifier || !category || !textures_arr ) {
            throw new Error("必须提供 identifier、category 和 textures_arr。");
        }

        const block = new RotatableBlock(identifier, category, textures_arr, {
            group: "construction",
            hide_in_command: false,
            rotationType: "cardinal",
            yRotationOffset: 180,
            ...options, // 用传入的选项覆盖默认值
        });

        registerBlock(block); // 调用注册方法
        return block;
    },
    createGeometryBlock: function (identifier, category, geometry, material_instances, options = {}) {
        if (!identifier || !category || !geometry || !material_instances ) {
            throw new Error("必须提供 identifier、category、geometry 和 material_instances。");
        }
        const block = new GeometryBlock(identifier, category, geometry, material_instances, options);
        registerBlock(block); // 调用注册方法
        return block;
    },
    createOreBlock(identifier, category, textures_arr, options = {}){
        const ore_block = new OreBlock(identifier, category, textures_arr, options)
        registerBlock(ore_block.block); // 调用注册方法
        registerFeature(ore_block.feature); // 调用注册方法
        registerFeatureRule(ore_block.feature_rules); // 调用注册方法
        return ore_block;
    }
};