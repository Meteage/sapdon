import { BasicBlock } from "../block/basicBlock.js";
import { Block } from "../block/block.js";
import { CropBlock } from "../block/cropBlock.js";
import { FenceBlock } from "../block/fenceBlock.js";
import { GeometryBlock } from "../block/geometryBlock.js";
import { GlassBlock } from "../block/glassBlock.js";
import { HeadBlock } from "../block/headBlock.js";
import { OreBlock } from "../block/oreBlock.js";
import { RotatableBlock } from "../block/rotatableBlock.js";
import { StairBlock } from "../block/stairBlock.js";
import { TileBlock } from "../block/tileBlock.js";
import { TrapdoorBlock } from "../block/trapdoorBlock.js";
import { registerEntity } from "./entityFactory.js";
import { GRegistry } from "../registry.js";

//blocks.json — cumulative, registered once by reference
const blocks_json = {"format_version": "1.20.20"}
let blocksJsonRegistered = false
/** 已经就「键不含命名空间」告警过的键（去重，避免每次注册都刷屏） */
const warnedBlockJsonKeys = new Set()

/**
 * 护栏：`blocks.json` 的键必须是**带命名空间的完整标识符**（`ns:name`）。
 * 键一旦退回「文件名安全名」（`ns_name`），Bedrock 认不出这个方块，整条条目静默失效。
 */
function assertBlocksJsonKey(key) {
    if (key.includes(":")) return
    if (warnedBlockJsonKeys.has(key)) return
    warnedBlockJsonKeys.add(key)
    console.warn(
        `[sapdon] blocks.json 的键 "${key}" 不含命名空间 —— 它必须是方块的完整标识符（"ns:name"），` +
        `否则 Bedrock 认不出该方块、该条贴图/音效条目会静默失效。`
    )
}

/**
 * 注册方块到注册表中。
 * @param {Block} block - 要注册的方块对象。
 */
export const registerBlock = (block) => {
    if (!block || !block.identifier) {
        throw new Error("无效的方块对象或缺少 identifier。");
    }

    // ⚠️ 这个 `block_name` 只作**文件名安全名**（`:` 在 Windows 文件名里非法），
    //    用于 `blocks/<name>.json` 的路径；**不能**兼任 blocks.json 的键（见下）。
    const block_name = block.identifier.replace(":", "_");
    GRegistry.register(block_name, "behavior", "blocks/", block);
    
    //blocks.json — accumulate textures
    // ⚠️ 键用**完整标识符**（`ns:name`），不是文件名安全名：
    //    - 基岩版权威源：https://wiki.bedrock.dev/blocks/block-sounds 的 RP/blocks.json 示例键即 `"wiki:chestnut_log"`
    //    - 历史产物（预言机）：`git show e1199cc:examples/mob_chest/dev/mob_chest_RP/blocks.json`
    //      的键是 `"mob_chest:chest"` / `"sapdon:falling_block"`，正与 main.mjs 里的 identifier 一致
    //    - `_` 形态的来历：05bd104 把这块逻辑挪进 blockFactory.js 时复用了 `block_name`，而当时
    //      根目录还被误标成 "behavior"（文件落在 BP、被 Bedrock 完全忽略）→ 从没有项目依赖过 `_` 形态
    const textures_arr = block.textures;
    blocks_json[block.identifier] = {
        textures: {
            up: textures_arr[0],
            down: textures_arr[1],
            east: textures_arr[2],
            west: textures_arr[3],
            south: textures_arr[4],
            north: textures_arr[5]
        }
    }
    assertBlocksJsonKey(block.identifier)

    // Register once by reference; mutations reflect at submit time
    // ⚠️ 根目录必须是 resource：`blocks.json` 是**资源包**文件（RP 根目录）。
    //    历史证据：commit e1199cc 的 `src/cli/load.js:60` 写的正是 `${projectName}_RP/blocks.json`；
    //    05bd104 把这段逻辑挪进 blockFactory.js 时误标成 "behavior"，文件从此落在 BP 里、
    //    被 Bedrock 完全忽略（BP 没有 blocks.json 这个概念）。此处是**回归修复**。
    if (!blocksJsonRegistered) {
        GRegistry.register("blocks","resource","",blocks_json);
        blocksJsonRegistered = true
    }
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
     * @param {number} options.yRotationOffset - 初始旋转偏移量，默认为 0。
     * @returns {RotatableBlock} 创建的可旋转方块对象。
     */
    createRotatableBlock: function (identifier, category, textures_arr, options = {}) {
        if (!identifier || !category || !textures_arr ) {
            throw new Error("必须提供 identifier、category 和 textures_arr。");
        }

        const block = new RotatableBlock(identifier, category, textures_arr, {
            hide_in_command: false,
            rotationType: "cardinal",
            yRotationOffset: 0,
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
    /**
     * 创建一个「带实体的方块」（方块 + 承载它的实体，用于可动模型 / 容器类方块）。
     *
     * 注册三份数据：
     *   1. 方块本体 → `behavior` + `blocks/`（含 `blocks.json` 贴图累积）
     *   2. 方块实体行为 → `behavior` + `entities/`
     *   3. 方块实体资源 → `resource` + `entity/`
     * ⚠️ `TileBlock` 本身只是**包装器**（`{ block, entity }`，没有 identifier/textures），
     *    所以不能直接把它交给 `registerBlock` —— 必须注册它内部的 `block` 与 `entity`。
     *
     * @param {string} identifier - 方块的唯一标识符（实体会自动用 `${identifier}_entity`）。
     * @param {string} category - 方块的分类（如 "construction"）。
     * @param {Array} textures_arr - 纹理数组，顺序为 [上, 下, 东, 西, 南, 北]。
     * @param {Object} options - 可选参数（透传给内部 BasicBlock）。
     * @returns {TileBlock} 创建的带实体方块对象（`.block` / `.entity` 可直接继续配置）。
     */
    createTileBlock: function (identifier, category, textures_arr, options = {}) {
        if (!identifier || !category || !textures_arr) {
            throw new Error("必须提供 identifier、category 和 textures_arr。");
        }

        const tile = new TileBlock(identifier, category, textures_arr, options);
        registerBlock(tile.block);                                    // 方块本体
        registerEntity(tile.entity.behavior, tile.entity.resource);    // 方块实体（behavior + resource）
        return tile;
    },
    createOreBlock(identifier, category, textures_arr, options = {}){
        const ore_block = new OreBlock(identifier, category, textures_arr, options)
        registerBlock(ore_block); // 调用注册方法（OreBlock extends BasicBlock）
        registerFeature(ore_block.feature); // 调用注册方法
        registerFeatureRule(ore_block.feature_rules); // 调用注册方法
        return ore_block;
    },
    /**
     * 创建一个作物方块。
     * @param {string} identifier - 方块的唯一标识符。
     * @param {string} category - 方块的分类（如 "construction"）。
     * @param {Array} variantDatas - 方块的变体数据，包含每个变体的状态标签和纹理。
     * @param {Object} options - 可选参数。
     * @param {string} options.group - 分组，默认为 "construction"。
     * @param {boolean} options.hide_in_command - 是否在命令中隐藏，默认为 false。
     * @param {boolean} options.ambient_occlusion - 是否应用环境光遮蔽，默认为 false。
     * @param {boolean} options.face_dimming - 是否根据面的方向进行亮度调整，默认为 false。
     * @param {string} options.render_method - 渲染方法，默认为 "alpha_test"。
     * @returns {CropBlock} 创建的方块对象。
     */
    createHeadBlock: function (identifier, category, texture, options = {}) {
        if (!identifier || !category || !texture) {
            throw new Error("必须提供 identifier、category 和 texture。");
        }
        const block = new HeadBlock(identifier, category, texture, {
            hide_in_command: false,
            ...options
        });
        registerBlock(block);
        return block;
    },
    createGlassBlock: function (identifier, category, texture, options = {}) {
        if (!identifier || !category || !texture) {
            throw new Error("必须提供 identifier、category 和 texture。");
        }
        const block = new GlassBlock(identifier, category, texture, {
            hide_in_command: false,
            ...options
        });
        registerBlock(block);
        return block;
    },
    createFenceBlock: function (identifier, category, textures_arr, options = {}) {
        if (!identifier || !category || !textures_arr) {
            throw new Error("必须提供 identifier、category 和 textures_arr。");
        }
        const block = new FenceBlock(identifier, category, textures_arr, {
            hide_in_command: false,
            ...options
        });
        registerBlock(block);
        return block;
    },
    createStairBlock: function (identifier, category, textures_arr, options = {}) {
        if (!identifier || !category || !textures_arr) {
            throw new Error("必须提供 identifier、category 和 textures_arr。");
        }
        const block = new StairBlock(identifier, category, textures_arr, {
            hide_in_command: false,
            ...options
        });
        registerBlock(block);
        return block;
    },
    createTrapdoorBlock: function (identifier, category, texture, options = {}) {
        if (!identifier || !category || !texture) {
            throw new Error("必须提供 identifier、category 和 texture。");
        }
        const block = new TrapdoorBlock(identifier, category, texture, {
            hide_in_command: false,
            ...options
        });
        registerBlock(block);
        return block;
    },
    createCropBlock: function (identifier, category, variantDatas, options = {}) {
        if (!identifier || !category || !variantDatas || variantDatas.length === 0) {
            throw new Error("必须提供 identifier、category 和 variantDatas。");
        }

        const block = new CropBlock(identifier, category, variantDatas, {
            hide_in_command: false,
            ambient_occlusion: true,
            face_dimming: true,
            render_method: "alpha_test",
            ...options, // 用传入的选项覆盖默认值
        });

        registerBlock(block); // 调用注册方法
        return block;
    },
};