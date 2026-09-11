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

// blocks.json —— **只保留 `format_version`，一个方块条目都不写**（见下方 registerBlock 的注释）
const blocks_json = {"format_version": "1.20.20"}
let blocksJsonRegistered = false

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
    
    // ⚠️ **不往 blocks.json 写任何方块条目**（历史上这里累积 `textures: {up,down,east,west,south,north}`）。
    //
    // 为什么删掉（2026-09，真机日志 + 官方文档双向确认）：
    //   键修成完整标识符（3715e74）之后，引擎**真的匹配上了**这些方块，于是**每个自定义方块**开始报：
    //     [Blocks][warning]-fz:<block>: trying to override the Geometry component with blocks.json settings
    //       for a custom block. This isn't supported.
    //       Please remove any legacy texture definition or block shape specification for this block.
    //   （真机计数：探针轮 3 条 → FZ 全量 77 条 = 项目方块总数。）
    //   官方依据（Microsoft Learn · blocks.json File Reference，原文）：
    //     "components in Behavior Packs, specifying `minecraft:geometry` and `minecraft:material_instances`,
    //      will override configurations here. Components are more powerful, and they're the recommended way
    //      to specify visual properties for blocks, leaving **blocks.json** as just a sound configuration system."
    //     <https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blocksjsonfilestructure>
    //   ⇒ `textures` 是**被 material_instances 全面覆盖**的 legacy 机制，写了只会招警告。
    //   自定义方块的贴图由 `minecraft:material_instances`（BP 方块 JSON）+ `terrain_texture.json`
    //   （`src/core/texture.js` / `cli/tools/textureSet.js` 扫描 RP/textures/blocks/**.png 生成）提供，
    //   **不经过** blocks.json。
    //
    // 文件本身仍然生成（只有 `format_version`）：内容对所有项目一致 → 不再有任何"覆写"可言；
    // 保留它 = 保留将来支持官方唯一认可的字段 `sound` 的位置，也不改变"RP 根目录有这个文件"的既有契约。
    // ⚠️ 若将来要写 `sound`：**只写 sound，绝不写 textures**（`BlockComponent.setSound` 走的是
    //    `minecraft:sound` 方块组件，与这里的 legacy 音效表是两套机制）。
    //
    // 文件名的安全名仍然只用于 `blocks/<name>.json` 的**路径**（`:` 在 Windows 文件名里非法），
    // 与 blocks.json 再无关系 —— 所以"键必须是 ns:name"那条护栏（assertBlocksJsonKey）
    // 在不再写条目后就没有触发场景了，已随之删除（不留死护栏）。

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
     * @param {string} [options.format_version] - 方块 JSON 的 `format_version`（默认 `1.26.30`）。
     *   ⚠️ 以前 `.d.ts` 里漏声明 ⇒ 传它会踩 TS2353（`BasicBlock` 确实读它，`basicBlock.js:33`）。
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
     * @param {string} [options.format_version] - 方块 JSON 的 `format_version`（默认 `1.26.30`）。见 `createBasicBlock`。
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
     * @param {string} [options.format_version] - 方块 JSON 的 `format_version`（默认 `1.26.30`）。见 `createBasicBlock`。
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
     * ★ **这是当前引擎版本下唯一可用的「方块容器」路线**：`minecraft:inventory` 是**实体**组件，
     *   容器挂在 `${identifier}_entity` 的行为文件上；方块侧的 `minecraft:block_entity.container`
     *   在当前引擎版本会被拒（`-> minecraft:block_entity -> container: … is not present in the Schema`）。
     *   想直接要槽位的项目，用 `options.inventory_size`（不必再自己造裸 Map 覆盖实体组件）。
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
     * @param {string} [options.group] - 创造菜单分组（透传给 `BasicBlock` → `menu_category.group`）。
     *   ⚠️ **`.d.ts` 里以前漏声明了它**（`createBasicBlock` 声明了、本工厂没有）⇒ 项目传
     *   `{ group }` 会踩 TS2353（对象字面量多出未知属性），而运行期 `BasicBlock` 确实会读
     *   `options.group`（`src/core/block/basicBlock.js:39`）—— 类型与运行期不一致。已补齐。
     *   不传 = `undefined`（产物里 `menu_category` 只有 `category` / `is_hidden_in_commands`）。
     * @param {boolean} [options.hide_in_command] - 是否在命令中隐藏（默认 false）。同上，已补齐声明。
     * @param {string} [options.format_version] - 方块 JSON 的 `format_version`（默认 `1.26.30`）。
     * @param {number} [options.inventory_size=27] - **实体容器**槽位数（正整数）。
     *   ⚠️ 官方文档只写 "Number of slots the container has"、**未给上限**
     *   （实体组件 `minecraft:inventory`），**不要**照搬方块路线 `minecraft:block_entity.container.slot_count`
     *   的 `[1,54]`；本参数只校验正整数。
     * @param {string} [options.container_type="minecart_chest"] - 容器音效/行为类型。官方文档列出的取值：
     *   `horse` / `minecart_chest` / `chest_boat` / `minecart_hopper` / `inventory` / `container` / `hopper`。
     * @param {boolean} [options.can_be_siphoned_from=true] - 能否用漏斗抽取。
     *   （不传上面三个键 = 产物与历史版本**逐字节一致**；每次构造都按实例拷贝，改一个方块不会污染别的方块。）
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
     * 创建一个「头颅/朝向」方块（`HeadBlock`：4 向旋转 + 32 档 `sapdon:head_rotation` 状态）。
     *
     * ⚠️ 下面这几条 `options` 的 JSDoc 曾经是从 `createCropBlock` 复制过来的**错误文档**
     *    （`ambient_occlusion` / `face_dimming` / `render_method` 根本不是 `HeadBlock` 读的键）
     *    且**漏了真正会被读的 `tick_interval` / `custom_components`**
     *    （`src/core/block/headBlock.js:14,19`）。历史 tag 保留（删掉会让传了它们的项目从
     *    "被忽略" 变成 TS2353 编译错误），但标注为**对本工厂无效**；真正生效的三个键补在下面。
     *
     * @param {string} identifier - 方块的唯一标识符。
     * @param {string} category - 方块的分类（如 "construction"）。
     * @param {string} texture - 纹理名（单张，会铺满 6 面）。
     * @param {Object} options - 可选参数。
     * @param {string} options.group - 分组，默认为 "construction"。（**历史 tag**，`HeadBlock` 会经 `BasicBlock` 读它）
     * @param {boolean} options.hide_in_command - 是否在命令中隐藏，默认为 false。
     * @param {boolean} options.ambient_occlusion - ⚠️ **本工厂不读**（历史误抄自 `createCropBlock`）。
     * @param {boolean} options.face_dimming - ⚠️ **本工厂不读**（历史误抄）。
     * @param {string} options.render_method - ⚠️ **本工厂不读**（历史误抄）。
     * @param {Array} [options.tick_interval=[20,20]] - `minecraft:tick` 的 `interval_range`（`headBlock.js:14`）。
     * @param {Array} [options.custom_components=[]] - 追加的自定义组件 id（框架已固定带上 `sapdon:head_rotation`，`headBlock.js:16-20`）。
     * @param {string} [options.format_version] - 方块 JSON 的 `format_version`（默认 `1.26.30`）。见 `createBasicBlock`。
     * @returns {HeadBlock} 创建的头颅方块对象。
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