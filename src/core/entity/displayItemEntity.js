import { GRegistry } from "../registry.js";
import { Entity } from "./entity.js";

/**
 * 展示实体（Display Item Entity）—— **无 AI 实体「叼」一件物品**做悬浮展示。
 *
 * ## 原理（[bedrock wiki · Holding Items](https://wiki.bedrock.dev/entities/holding-items)）
 *
 * 引擎会把实体的**主手物品**渲染在几何模型里那个叫 `rightItem` 的骨的挂点上。
 * 所以「展示实体」= 无 AI 实体 + 一个只有 `rightItem` 骨的模型 + 给它一件主手物品。
 *
 * | 件 | 内容 |
 * |---|---|
 * | 模型 | 框架内置（`body` + `rightItem`，**无 cube** ⇒ 实体本身不可见，只看得到叼着的物品） |
 * | 行为包 | 不动 / 无重力 / 零碰撞 / 不可推动 / `persistent`；`minecraft:equipment` 给主手（初始空） |
 * | 资源包 | 默认渲染控制器 + **姿态动画**（把 `rightItem` 骨绑到实体属性） |
 *
 * ## 姿态（rotation / position / scale）走**实体属性 + 客户端动画**
 *
 * 几何骨 `rightItem` 的 `rotation`/`position`/`scale` 由客户端动画绑到实体属性上：
 * `<命名空间>:rx` / `ry` / `rz`（度）、`px` / `py` / `pz`（**0.1 像素**为单位存 int，动画里 ÷10）、
 * `sc`（**百分比**，100 = 1.0×）。脚本改这些属性 ⇒ 客户端**实时**改变姿态（`client_sync: true`）。
 *
 * ⚠️ 属性是 **int**（不是 float）：`@sapdon/core` 生成 JSON 时整数会写成 `45`，
 *    而引擎要求 float 属性的 `default` 是 JSON 小数 ⇒ 会报
 *    `'default' value does not match the specified type 'float'` 并让**整个属性组件加载失败**。
 *
 * ## ⚠️ 命名空间跟随实体 identifier
 *
 * 姿态属性用**实体 identifier 的命名空间**（`fz:display_item` ⇒ `fz:rx`），
 * 每个命名空间有一份自己的动画文件（`<ns>_display_item.json`）—— 两份不同命名空间的展示实体互不干扰。
 *
 * ## 运行期
 *
 * 生成后，用 `@sapdon/runtime` 的 `spawnDisplayItem` / `setDisplayItem` / `setDisplayPose` 操作它。
 */
export class DisplayItemEntity extends Entity {
    /**
     * @param {string} identifier 形如 `命名空间:名字`（命名空间同时决定姿态属性的前缀）
     * @param {Object} [options]
     * @param {string} [options.texture] 客户端贴图（实体本身无 cube ⇒ 通常看不到，只影响不存在贴图的告警）
     * @param {Object} [options.pose] 姿态默认值（`rx/ry/rz/px/py/pz/sc`，缺项回落 `DISPLAY_ITEM_POSE_DEFAULTS`）
     * @param {boolean} [options.is_spawnable] 是否可自然生成（默认 false；脚本用 `spawnEntity` 仍可生成）
     */
    constructor(identifier, options = {}) {
        if (typeof identifier !== "string" || !identifier.includes(":")) {
            throw new Error("[sapdon-display] identifier 必须是 `命名空间:名字`");
        }

        const ns = identifier.split(":")[0];
        const pose = { ...DISPLAY_ITEM_POSE_DEFAULTS, ...(options.pose ?? {}) };

        super(identifier, undefined, {
            is_spawnable: options.is_spawnable ?? false,
            is_summonable: true,
            // ★ 实体属性要求数据版本 ≥ 1.20.30（默认 1.16.0 会让 properties 静默不加载）
            format_version: "1.21.0",
        }, {}, {});

        // —— 行为包：无 AI 实体 + 主手装备 ——
        this.behavior.addComponent(new Map([
            ["minecraft:collision_box", { width: 0, height: 0 }],
            ["minecraft:physics", { has_collision: false, has_gravity: false }],
            ["minecraft:movement", { value: 0, max: 0 }],
            ["minecraft:movement.basic", {}],
            ["minecraft:knockback_resistance", { value: 1 }],
            ["minecraft:pushable", { is_pushable: false, is_pushable_by_piston: false }],
            ["minecraft:damage_sensor", { triggers: [{ deals_damage: false, cause: "all" }] }],
            ["minecraft:persistent", {}],
            // 主手装备（空掉落表 = 出生没有物品，由脚本按需换）
            ["minecraft:equipment", { table: DISPLAY_ITEM_LOOT_PATH }],
            // 可装备槽（脚本用 `EntityEquippableComponent.setEquipment(Mainhand, …)` 换物）
            ["minecraft:equippable", { slots: [{ slot: 0, item: "minecraft:air" }] }],
        ]));
        for (const [key, def] of Object.entries(displayPoseProperties(ns, pose))) {
            this.behavior.addProperty(key, def);
        }

        // —— 资源包：默认渲染控制器 + 姿态动画 ——
        this.resource.addMaterial("default", "entity_alphatest");
        this.resource.addTexture("default", options.texture ?? "textures/entity/none");
        this.resource.addGeometry("default", DISPLAY_ITEM_GEOMETRY_ID);
        this.resource.addRenderController("controller.render.default");
        this.resource.addAnimation("pose", displayPoseAnimationId(ns));
        this.resource.setScript("animate", ["pose"]);

        // —— 落资产（几何/掉落表跨实体共享 ⇒ 同名同内容重复注册无副作用）——
        GRegistry.register(DISPLAY_ITEM_GEOMETRY_REGISTRY, "resource", "models/entity", DISPLAY_ITEM_GEOMETRY_JSON);
        GRegistry.register(displayPoseAnimationRegistry(ns), "resource", "animations", displayPoseAnimation(ns));
        GRegistry.register(DISPLAY_ITEM_LOOT_REGISTRY, "behavior", "loot_tables/sapdon", DISPLAY_ITEM_LOOT_JSON);

        /** 该实体的命名空间（= 姿态属性前缀） */
        this.namespace = ns;
        /** 实际生效的姿态默认值（`DISPLAY_ITEM_POSE_DEFAULTS` ⊕ `options.pose`） */
        this.pose = pose;
        /** 姿态动画 id */
        this.poseAnimationId = displayPoseAnimationId(ns);
    }
}

/* ───────────────────────── 常量（构建期 / 运行期共用的约定） ───────────────────────── */

/**
 * 姿态属性的**键名**（顺序 = 命令/角度参数的顺序）。
 *
 * ⚠️ 必须与 `@sapdon/runtime` 的 `src/oc/display/displayItem.ts` 里的同名列表一致
 *    （运行期不能 import `@sapdon/core`，两处各写一份）。
 */
export const DISPLAY_ITEM_POSE_KEYS = ["rx", "ry", "rz", "px", "py", "pz", "sc"];

/** 姿态默认值：`rx=45` 是历史默认（物品体面地立着）；位移 0、缩放 100%（1.0×） */
export const DISPLAY_ITEM_POSE_DEFAULTS = { rx: 45, ry: 0, rz: 0, px: 0, py: 0, pz: 0, sc: 100 };

/** 几何 id（框架共享：`body` + `rightItem`，无 cube） */
export const DISPLAY_ITEM_GEOMETRY_ID = "geometry.sapdon_display_item";

/** 几何的注册名（产物 `models/entity/<name>.json`） */
export const DISPLAY_ITEM_GEOMETRY_REGISTRY = "sapdon_display_item_geo";

/** 姿态动画所在的骨名（几何 / 动画 / 引擎必须逐字一致） */
export const DISPLAY_ITEM_BONE = "rightItem";

/** 掉落表注册名（产物 `loot_tables/sapdon/<name>.json`） */
export const DISPLAY_ITEM_LOOT_REGISTRY = "sapdon_display_item_loot";

/** 掉落表路径（`minecraft:equipment.table` 引用它；空池 = 出生不带物品） */
export const DISPLAY_ITEM_LOOT_PATH = `loot_tables/sapdon/${DISPLAY_ITEM_LOOT_REGISTRY}.json`;

/** 姿态属性的 id（`<命名空间>:<键>`） */
export function displayPosePropertyId(identifier, key) {
    return `${identifier.split(":")[0]}:${key}`;
}

/** 姿态属性的 id 列表（顺序同 `DISPLAY_ITEM_POSE_KEYS`） */
export function displayPosePropertyIds(identifier) {
    const ns = identifier.split(":")[0];
    return DISPLAY_ITEM_POSE_KEYS.map((k) => `${ns}:${k}`);
}

/** 某个命名空间的姿态动画 id */
export function displayPoseAnimationId(ns) {
    return `animation.${ns}_display_item.pose`;
}

/** 姿态动画的注册名（产物 `animations/<name>.json`） */
export function displayPoseAnimationRegistry(ns) {
    return `${ns}_display_item`;
}

/* ───────────────────────── 内部：属性定义 / 动画 / 模型 JSON ───────────────────────── */

/** `<ns>:rx..sc` 的 `minecraft:properties` 定义（**int**，见类注释） */
function displayPoseProperties(ns, pose) {
    const out = {};
    for (const key of DISPLAY_ITEM_POSE_KEYS) {
        const def = DISPLAY_ITEM_POSE_DEFAULTS[key];
        const value = pose[key] ?? def;
        if (!Number.isInteger(value)) {
            throw new Error(`[sapdon-display] 姿态 ${key} 必须是整数（int 属性），收到 ${value}`);
        }
        // 旋转：整度 [-180,180]；位移：0.1px 单位 [-160,160]（= ±16px）；缩放：百分比 [1,500]
        const [min, max] = key === "sc" ? [1, 500] : key.startsWith("p") ? [-160, 160] : [-180, 180];
        out[`${ns}:${key}`] = { type: "int", range: [min, max], default: value, client_sync: true };
    }
    return out;
}

/** 姿态动画：把 `rightItem` 骨的 rotation/position/scale 绑到该命名空间的姿态属性 */
function displayPoseAnimation(ns) {
    const p = (k) => `query.property('${ns}:${k}')`;
    return {
        format_version: "1.8.0",
        animations: {
            [displayPoseAnimationId(ns)]: {
                loop: true,
                bones: {
                    [DISPLAY_ITEM_BONE]: {
                        rotation: [p("rx"), p("ry"), p("rz")],
                        position: [`${p("px")} / 10.0`, `${p("py")} / 10.0`, `${p("pz")} / 10.0`],
                        scale: `${p("sc")} / 100.0`,
                    },
                },
            },
        },
    };
}

/** 框架内置模型：`body` + `rightItem`（无 cube ⇒ 实体不可见，只渲染主手物品） */
const DISPLAY_ITEM_GEOMETRY_JSON = {
    format_version: "1.12.0",
    "minecraft:geometry": [
        {
            description: {
                identifier: DISPLAY_ITEM_GEOMETRY_ID,
                texture_width: 16,
                texture_height: 16,
                visible_bounds_width: 2,
                visible_bounds_height: 2,
                visible_bounds_offset: [0, 0, 0],
            },
            bones: [
                { name: "body", pivot: [0, 0, 0] },
                { name: DISPLAY_ITEM_BONE, parent: "body", pivot: [0, 0, 0], rotation: [0, 0, 0] },
            ],
        },
    ],
};

/** 空掉落表（出生不带主手物品；脚本按需换） */
const DISPLAY_ITEM_LOOT_JSON = { pools: [] };
