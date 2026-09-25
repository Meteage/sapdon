import { Serializer, serialize } from "../../../utils/index.js"

/**
 * `minecraft:tree_feature` 的 JSON 形状（官方 feature schema 的逐字段映射）。
 *
 * 这一层只负责「长成什么 JSON」；参数校验与默认值在 `../../feature/treeFeature.js`。
 */
export class AddonTreeFeature {
    format_version: string
    definition: AddonTreeFeatureDefinition

    constructor(format_version: string, definition: AddonTreeFeatureDefinition) {
        this.format_version = format_version
        this.definition = definition
    }

    @Serializer
    toObject(): Record<string, any> {
        return {
            format_version: this.format_version,
            // 过一遍序列化器：把 definition 及其内部的类实例（如 description）摊成**纯数据**
            // —— `toObject()` 的返回值必须是能直接 JSON.stringify 的形状，不留类实例
            ["minecraft:tree_feature"]: serialize(this.definition)
        }
    }
}

/** `minecraft:tree_feature.description`：只放 `identifier` */
export class AddonTreeFeatureDescription {
    identifier: string

    constructor(identifier: string) {
        this.identifier = identifier
    }
}

/**
 * `minecraft:tree_feature` 的**主体**：`description` + 若干**组件**。
 *
 * 组件（`trunk` / `fancy_canopy` / `may_grow_on` / …）不逐个建模，由构造函数原样挂到实例上
 * —— 引擎的组件表比官方文档更宽（文档缺 `trunk.trunk_block`、`fancy_canopy.leaf_block` 等），
 * 逐个建模会把「文档没写但引擎支持」的字段堵死。
 */
export class AddonTreeFeatureDefinition {
    description: AddonTreeFeatureDescription
    [component: string]: unknown

    constructor(description: AddonTreeFeatureDescription, components: Readonly<Record<string, unknown>>) {
        this.description = description
        for (const [name, value] of Object.entries(components)) {
            if (name === "description") {
                throw new Error(
                    "[sapdon] tree_feature 的 description 由 createTreeFeature 的第一个参数（identifier）决定，" +
                    "不要写进 spec"
                )
            }
            this[name] = value
        }
    }
}
