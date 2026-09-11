import { Serializer, serialize } from "../../utils/index.js";
import { AddonBlock, AddonBlockDefinition, AddonBlockDescription } from "../addon/block/block.js";
import { AddonMenuCategory } from "../addon/menuCategory.js";
import { BlockComponent } from "./blockComponent.js";

export class BasicBlock {
    /**
     * 基础方块类
     * @param {string} identifier 方块唯一标识符
     * @param {string} category 菜单栏分类 可选："construction", "nature", "equipment", "items", and "none"
     * @param {Array} textures_arr 纹理数组 [上,下,东,西,南,北]
     * @param {Object} options 可选参数
     * @param {string} options.group 分组，默认为 "construction"
     * @param {boolean} options.hide_in_command 是否在命令中隐藏，默认为 false
     */
    constructor(identifier, category, textures_arr, options = {}) {
        // 参数校验
        if (!identifier || typeof identifier !== "string") {
            throw new Error("identifier is required and must be a string");
        }
        if (!category || typeof category !== "string") {
            throw new Error("category is required and must be a string");
        }
        if (!Array.isArray(textures_arr) ) {
            throw new Error("textures_arr must be an array ");
        }
        if (textures_arr.length !== 6) {
            for (let i = textures_arr.length; i < 6; i++) {
                textures_arr.push(textures_arr[0]);
            }
        }

        const { hide_in_command = false, format_version = "1.26.30" } = options;

        this.format_version = format_version;
        this.identifier = identifier;
        this.category = category;
        this.textures = textures_arr;
        this.group = options.group;
        this.hide_in_command = hide_in_command;
        this.traits = new Map();
        this.states = new Map();
        this.components = new Map();
        this.permutations = [];

        this.addComponent(
            BlockComponent.combineComponents(
                BlockComponent.setMaterialInstances({
                    "up": {
                        "texture": textures_arr[0]
                    },
                    "down": {
                        "texture": textures_arr[1]
                    },
                    "east": {
                        "texture": textures_arr[2]
                    },
                    "west": {
                        "texture": textures_arr[3]
                    },
                    "south": {
                        "texture": textures_arr[4]
                    },
                    "north": {
                        "texture": textures_arr[5]
                    }
                }),
                BlockComponent.setGeometry("minecraft:geometry.full_block")
            )
        )
    }
    
    getId() {
        return this.identifier;
    }

    registerTrait(key,value){
        this.traits.set(key,value);
        return this;
    }

    registerState(key, value) {
        if (value && typeof value === 'object' && !Array.isArray(value) && value.values) {
            if (Array.isArray(value.values)) {
                if (!value.values.length) throw new Error(`state "${key}" values array must not be empty`);
            } else if (value.values && typeof value.values.min !== 'number' || typeof value.values.max !== 'number') {
                throw new Error(`state "${key}" values range must have min and max as numbers`);
            }
        } else if (Array.isArray(value)) {
            // Legacy shorthand — wrap in { values }
            value = { values: value };
        } else {
            throw new Error(`state "${key}" value must be { values: [...] } or { values: { min, max } }`);
        }
        this.states.set(key, value);
        return this;
    }

    /**
     * 添加组件
     * @param {Map} componentMap 组件 Map
     */
    addComponent(componentMap) {
        if (!componentMap || !(componentMap instanceof Map)) {
            throw new Error("componentMap is required and must be a Map");
        }
        for (const [key, value] of componentMap.entries()) {
            this.components.set(key, value);
        }
        return this;
    }

    /**
     * 移除组件
     * @param {string} key 组件名称
     */
    removeComponent(key) {
        if (!key || typeof key !== "string") {
            throw new Error("key is required and must be a string");
        }
        this.components.delete(key);
        return this;
    }

    /**
     * 添加方块变体
     * @param {string} condition 变体条件
     * @param {Map|Object} component 组件 Map 或普通对象
     */
    addPermutation(condition, component) {
        if (!condition || typeof condition !== "string") {
            throw new Error("condition is required and must be a string");
        }
        if (!component) {
            throw new Error("component is required");
        }
        this.permutations.push({
            condition: condition,
            components: component instanceof Map ? Object.fromEntries(component) : component
        });
        return this;
    }

    /**
     * 提交前的自检（由 `registry.submit()` → `runValidators()` 在序列化之前调用一次）。
     *
     * ⚠️ 不能在 `registerBlock` 里做这类检查：`BlockAPI.createXxx()` 是「先注册、后 addComponent」，
     *    注册那一刻用户还没挂组件，检查必然看不到容器组件。
     *    （历史上 `blockComponent.js` 的 JSDoc 把守卫指向 `blockFactory.registerBlock` —— **那是错的**，
     *    `blockFactory.js` 里 `block_entity` 命中数为 0；真守卫就是这里。已于 2026-09 订正。）
     *
     * 检查两件事，都**只 warn、不改产物**：
     *
     * 1. 方块 components 里出现 `minecraft:inventory` —— 它是**实体**组件，不是方块组件，
     *    引擎必然拒绝（`not present in the Schema`）。容器请走实体路线。
     * 2. `minecraft:block_entity.container.slot_count` 超出官方文档的 `[1, 54]`
     *    （`BlockComponent.setBlockEntity({container})` 已经抛错；这里兜住"手写组件对象 / 裸 Map"的写法）。
     */
    validate() {
        const has = (obj, key) => !!obj && Object.prototype.hasOwnProperty.call(obj, key)
        const components = Object.fromEntries(this.components);
        const permutationComponents = (this.permutations ?? []).map((p) => p?.components ?? {})
        // 组件既可能写在 components，也可能写在变体里（TileBlock 就用变体）
        const all = [components, ...permutationComponents]

        if (all.some((c) => has(c, "minecraft:inventory"))) {
            console.warn(
                `[sapdon] 方块 "${this.identifier}" 的 components 里写了 minecraft:inventory —— ` +
                `它是**实体**组件（官方文档列在 Entity Components 下），方块组件表里没有它，` +
                `引擎会报 "-> components -> minecraft:inventory: this component was found in the input, ` +
                `but is not present in the Schema"。` +
                `可用的容器请走实体路线：BlockAPI.createTileBlock(id, category, textures, ` +
                `{ inventory_size, container_type, can_be_siphoned_from }) ` +
                `（方块带承载实体、实体挂 minecraft:inventory）；` +
                `要方块侧的规范写法用 BlockComponent.setBlockEntity(true, { container: { slot_count } })` +
                `（当前引擎版本同样会拒该成员）。`
            )
        }

        for (const c of all) {
            const blockEntity = c["minecraft:block_entity"]
            if (!has(c, "minecraft:block_entity") || !blockEntity || typeof blockEntity !== 'object') continue
            if (!has(blockEntity, "container")) continue
            const container = blockEntity.container
            const slots = container && typeof container === 'object' ? container.slot_count : undefined
            if (!Number.isInteger(slots) || slots < 1 || slots > 54) {
                console.warn(
                    `[sapdon] 方块 "${this.identifier}" 的 minecraft:block_entity.container 槽位数非法` +
                    `（当前值：${JSON.stringify(container)}）。官方文档要求 slot_count 为 >= 1 且 <= 54 的整数，` +
                    `槽位数更大的容器请走实体路线（createTileBlock 的 inventory_size）。`
                )
            }
        }
    }

    /**
     * 将方块对象转换为 JSON 格式
     * @returns {Object} JSON 格式的方块对象
     */
    @Serializer
    toObject() {
        const components = Object.fromEntries(this.components);

        return serialize(new AddonBlock(
           this.format_version,
            new AddonBlockDefinition(
                new AddonBlockDescription(
                    this.identifier,
                    Object.fromEntries(this.traits),
                    Object.fromEntries(this.states),
                    new AddonMenuCategory(
                        this.category,
                        this.group,
                        this.hide_in_command
                    )
                ),
                components,
                this.permutations
            )
        ))
    }
}