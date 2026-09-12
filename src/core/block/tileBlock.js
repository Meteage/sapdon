import { Entity } from "../entity/entity.js";
import { BasicBlock } from "./basicBlock.js";
import { BlockComponent } from "./blockComponent.js";

/**
 * 实体容器的**默认**参数（也是 `TileBehData` 里那一份的唯一取值来源）。
 *
 * 这三个值与历史产物一致 —— **不传 `options` 时产物逐字节不变**。
 *
 * ⚠️ 这里只是"默认值的来源"，不是"直接写进产物的共享对象"：每次构造都会把这份数据
 *    **按实例拷贝**一份（见 `buildTileBehData`），所以给 A 方块传 `inventory_size: 56`
 *    绝不会改到 B 方块 —— 共享常量被就地改写正是历史上最难查的一类静默 bug。
 */
const TileContainerDefaults = {
    inventory_size: 27,
    can_be_siphoned_from: true,
    container_type: "minecart_chest",
}

const TileBehData = {
    component_groups:{
        "item_despawn":{
            "minecraft:despawn": {},
                "minecraft:instant_despawn": {
                    "remove_child_entities": false
                },
                "minecraft:transformation": {
                    "drop_inventory": true,
                    "into": "minecraft:air"
                }
        }
    },
    components:{
        // 取值顺序与历史产物一致（inventory_size → can_be_siphoned_from → container_type）
        "minecraft:inventory": {
                "inventory_size": TileContainerDefaults.inventory_size,
                "can_be_siphoned_from": TileContainerDefaults.can_be_siphoned_from,
                "container_type": TileContainerDefaults.container_type
        },
        "minecraft:nameable": {
                "allow_name_tag_renaming": false
        },
        // Knockback resistance is needed to make it not be Knocked off by an entity.
        "minecraft:knockback_resistance": {
            "value": 1
        },
        // Tells if the entity can be pushed or not.
        "minecraft:pushable": {
            "is_pushable": false,
            "is_pushable_by_piston": true
        },
        // Sets the distance through which the entity can push through.
        "minecraft:push_through": {
            "value": 1
        },
        "minecraft:custom_hit_test": {
            "hitboxes": [
                {
                "width": 0.81,
                "height": 0.92,
                "pivot": [
                    0,
                    0.5,
                    0
                ]
                }
            ]
        },
        
        //可以被活塞推动，但是不会被实体推动
        "minecraft:pushable": {
            "is_pushable": false,
            "is_pushable_by_piston": true
        },
        // Makes it invincible.
        "minecraft:damage_sensor": {
            "triggers": [
                {
                    "deals_damage": false,
                    "cause": "all"
                }
            ]
        },
        "minecraft:persistent": {}
    },
    events:{
        "despawn_event":{
            "add": {
                    "component_groups": [
                        "item_despawn"
                    ]
                }
        }
    }
};


/** `createTileBlock` 的 `options` 里可覆盖实体容器的键（Flat，与实体组件字段同名） */
const TILE_CONTAINER_OPTION_KEYS = ["inventory_size", "container_type", "can_be_siphoned_from"]

/**
 * ★ **不要给 `item_despawn` 组里的 `minecraft:transformation` 加 `delay`**（2026-09-12 真机教训）。
 *
 * 那一组里还有 `minecraft:instant_despawn`（**立即**移除实体）。加 `delay` 之后实测的结果是
 * **什么都不掉**：实体被立即移除，而推迟的 transformation 再也没机会执行 ⇒
 * 容器里的**真物品一起没了**（用户报告）。完整记录见 `doc/dev/known-pitfalls.md` §4.15。
 *
 * 因此本模块**不提供**任何「延迟 despawn」的入口 —— 想让破坏时的脚本先跑完，
 * 要在**不影响这条掉落链**的前提下另找机制。
 */

/**
 * 解析客户端实体要用的贴图。
 *
 * ## 为什么需要 `entity_texture`
 *
 * `textures_arr` 对**方块**来说是 **terrain_texture.json 的键**（如 `machineblock_0`），
 * 而 `client_entity` 的 `textures.<name>` 官方文档要求的是**资源路径**
 * （原文示例：`"default": "textures/entity/pig/pig"`，扩展名省略 ——
 * <https://learn.microsoft.com/en-us/minecraft/creator/reference/content/entityreference/examples/cliententitydocumentation/cliententitydocumentationintroduction>）
 * ⇒ 把 terrain 短名原样写进去，客户端实体会指向不存在的资源（`Missing referenced asset`）。
 *
 * 历史行为（本函数之前）就是**原样照写** `textures_arr[0]`，
 * 所以默认值**必须**保持它 —— 不传 `options.entity_texture` 时产物逐字节不变
 * （`examples/mob_chest` 传的本来就是完整路径 `textures/blocks/entity/normal`）。
 *
 * @param {Array} textures_arr 纹理数组（方块侧是 terrain 键）
 * @param {Object} options 实例 options
 * @returns {*} 客户端实体 `textures.default` 的取值
 */
function resolveEntityTexture(textures_arr, options) {
    const texture = options.entity_texture
    if (texture === undefined) return textures_arr[0]
    if (typeof texture !== "string" || texture.length === 0) {
        throw new Error("createTileBlock: options.entity_texture 必须是非空字符串（客户端实体的资源路径，如 \"textures/blocks/entity/normal\"）")
    }
    return texture
}

/**
 * 生成**实例专属**的实体行为数据。
 *
 * `BasicEntity` 的构造里是 `new Map(Object.entries(data.components))` —— 只拷贝了**表**，
 * 表里的**值对象**（例如 `minecraft:inventory` 那个对象）仍与共享常量同一引用。
 * 因此要支持按实例改容器，必须在这里把该值对象换成一个新对象。
 *
 * 用 `{...原对象}` / `Object.assign({}, 原对象, 覆盖)` 而不是重建对象字面量：
 * **已有键保持原有插入顺序**，新键才追加 —— 产物 JSON 的键序因此与历史产物完全一致
 * （键序不同会让"逐字节不变"的回归断言失败）。
 *
 * @param {(key: string) => any} readOption 读取实例 options 的函数（未传该键时返回 undefined）
 * @returns {{component_groups: Object, components: Object, events: Object}}
 */
function buildTileBehData(readOption) {
    const overrides = {}
    for (const key of TILE_CONTAINER_OPTION_KEYS) {
        const value = readOption(key)
        if (value === undefined) continue
        if (key === "inventory_size" && (!Number.isInteger(value) || value < 1)) {
            throw new Error("createTileBlock: options.inventory_size 必须是大于 0 的整数（槽位数）")
        }
        if (key === "container_type" && (typeof value !== "string" || value.length === 0)) {
            throw new Error("createTileBlock: options.container_type 必须是非空字符串")
        }
        if (key === "can_be_siphoned_from" && typeof value !== "boolean") {
            throw new Error("createTileBlock: options.can_be_siphoned_from 必须是布尔类型")
        }
        overrides[key] = value
    }

    // ★ 这里**刻意不重建** `component_groups`：`item_despawn` 组是**已验证能正确掉落**的那一份，
    //   任何改动（尤其往 transformation 上加 `delay`）都会让它失效 —— 见本文件顶部那条警告。
    return {
        component_groups: TileBehData.component_groups,
        components: {
            ...TileBehData.components,
            "minecraft:inventory": Object.assign(
                {},
                TileBehData.components["minecraft:inventory"],
                overrides
            ),
        },
        events: TileBehData.events,
    }
}


export class TileBlock {
    /**
     * 带实体的方块类
     *
     * 容器走**实体**路线：`minecraft:inventory` 是**实体**组件，挂在 `${identifier}_entity` 的
     * 行为文件上。这是当前引擎版本下**唯一可用**的方块容器方案（方块侧的
     * `minecraft:block_entity.container` 成员会被引擎拒：
     * `-> minecraft:block_entity -> container: … is not present in the Schema`）。
     *
     * @param {*} identifier
     * @param {*} category
     * @param {*} textures_arr
     * @param {*} options
     * @param {boolean} [options.hide_in_command=false] 是否在命令中隐藏（透传给 `BasicBlock`）。
     * @param {string} [options.group] 创造菜单分组（透传给 `BasicBlock` → `menu_category.group`）。
     *   ⚠️ 与 `createBasicBlock` 取值一致：**不传 = undefined**（产物里 `menu_category` 只有
     *   `category` 与 `is_hidden_in_commands`）。分组名是**本地化键**，项目须在
     *   `RP/texts/*.lang` 里定义，否则显示裸键名。
     * @param {string} [options.format_version] 方块 JSON 的 `format_version`（默认 `1.26.30`）。
     * @param {string} [options.entity_texture] 客户端实体的贴图**资源路径**
     *   （如 `"textures/blocks/entity/normal"`，省略扩展名）。
     *   默认 = `textures_arr[0]`（**历史行为，逐字节不变**）。
     *   ⚠️ `textures_arr[0]` 在**方块**侧是 terrain_texture.json 的**键**、在**实体**侧却必须是
     *   资源路径 —— 两者不是一回事。只给短名的项目（如 `"machineblock_0"`）必须传本参数，
     *   否则客户端实体会报 `Missing referenced asset`。
     * @param {number} [options.inventory_size=27] 实体容器槽位数（正整数）。
     *   ⚠️ 官方文档（<https://learn.microsoft.com/en-us/minecraft/creator/reference/content/entityreference/examples/entitycomponents/minecraftcomponent_inventory>）
     *   只写 "Number of slots the container has"、**未给上限** —— 别照搬方块路线 `[1,54]` 的限制。
     * @param {string} [options.container_type="minecart_chest"] 容器音效/行为类型。官方文档列出的取值：
     *   `horse` / `minecart_chest` / `chest_boat` / `minecart_hopper` / `inventory` / `container` / `hopper`
     *   （此处不做白名单，避免把未文档化但可用的值写死掉）。
     * @param {boolean} [options.can_be_siphoned_from=true] 能否用漏斗抽取。
     *   ⚠️ **没有**「延迟 despawn」这类入口，而且**不要**去加：
     *   往 `item_despawn` 组的 `minecraft:transformation` 上加 `delay` 会让同组的
     *   `minecraft:instant_despawn` 先把实体删掉 ⇒ **整容器一个都不掉**（真机教训，
     *   见 `doc/dev/known-pitfalls.md` §4.15）。
     */
    constructor(identifier, category, textures_arr, options = {}){

        this.block =  new BasicBlock(identifier, category, textures_arr, options);
        // ⚠️ Entity 的签名是 (identifier, texture, options, behData, resData) ——
        //    `options` 只被读 is_spawnable / is_summonable / runtime_identifier；
        //    而 TileBehData 装的是 components / component_groups / events，属于 **behData（第 4 参）**。
        //    历史版本 Entity 的签名是 (identifier, texture, behData, resData, options)，那时写在第 3 参是对的；
        //    签名改成 options 在前之后这里没跟着改 → TileBehData 被整份丢弃（实体产物只剩 block_sensor、
        //    component_groups/events 全空，容器方块实体没有 inventory，游戏里打不开且是静默的）。
        //    判据见 AGENTS.md：与 examples/mob_chest 的历史产物（含 minecraft:inventory 27）逐字段对齐。
        //    `options` 里的 inventory_size / container_type / can_be_siphoned_from 会被
        //    buildTileBehData 合并进**本实例**的 minecraft:inventory（不传 = 与历史产物逐字节一致）。
        //    第 2 参（客户端实体贴图）由 resolveEntityTexture 解析：不传 `options.entity_texture`
        //    时**原样**取 textures_arr[0]（历史行为）。
        this.entity = new Entity(`${identifier}_entity`, resolveEntityTexture(textures_arr, options), {}, buildTileBehData((key) => options[key]));

        // 注册方块状态 0:方块 1:实体
        this.block.registerState("sapdon:block_or_entity",[0,1]);
        // ★ 这个自定义组件**由框架内置兜底注册**（`@sapdon/runtime` 的 `registerBuiltinComponents()`
        //   → `registerFallbackBlockComponent`，实现见 `src/oc/builtin/blocks/blockWithEntity.ts`）。
        //   项目若自己注册了同 id（例如 `examples/mob_chest` 那种要切透明状态/自定义交互的），
        //   **项目实现生效**、内置实现被跳过。
        //   ⚠️ 字面量不能抽成共享常量：本文件在 `@sapdon/core`（构建期，external），
        //      而常量在 `@sapdon/runtime`（运行期，会被打进脚本包）—— core 不许 import runtime。
        this.block.addComponent(BlockComponent.setCustomComponents(["sapdon:block_with_entity"]))

        this.block.addPermutation(
            "q.block_state('sapdon:block_or_entity') == 1",
            BlockComponent.combineComponents(
                BlockComponent.setTick([0,0],true),//提供tick
                BlockComponent.setGeometry("geometry.cube"),
                BlockComponent.setMaterialInstances({"*":{
                    "texture":"none",
                    "render_method": "alpha_test"
                  }})
            )
        );

        //设置生物
        // ⚠️ 是 `this.entity.behavior`：064a292 把 `Entity.entity` 改名为 `Entity.behavior`
        //    （同时 `client_entity` → `resource`），本文件只改了 `client_entity` 那几处、
        //    漏了这一行 —— 于是 TileBlock 一构造就 `Cannot read properties of undefined (reading 'addComponent')`。
        this.entity.behavior.addComponent(new Map().set("minecraft:block_sensor",{
            "sensor_radius": 1,
            "on_break": [
                {
                    "block_list": [
                        identifier
                    ],
                    "on_block_broken": "despawn_event"
                }
            ]
        }))
        this.entity.resource.addMaterial("default","entity_alphatest")
        .addGeometry("default","geometry.cube")
        .addRenderController("controller.render.cow")
    }
    setGeometry(geometry){
        //设置方块模型
        this.block.addComponent(BlockComponent.setGeometry(geometry));
        //设置实体模型
        this.entity.resource.addGeometry("default",geometry);
    }
    addAnimation(name,animation){
        this.entity.resource.addAnimation(name,animation);
    }
    setScript(key,value){
        this.entity.resource.setScript(key,value);
    }
}