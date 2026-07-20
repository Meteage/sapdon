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
                    "down": {
                        "texture": textures_arr[0] 
                    },
                    "up": {
                        "texture": textures_arr[1]
                    },
                    "north": {
                        "texture": textures_arr[2]
                    },
                    "east": {
                        "texture": textures_arr[3]
                    },
                    "south": {
                        "texture": textures_arr[4]
                    },
                    "west": {
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