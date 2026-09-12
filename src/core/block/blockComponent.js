/** @template T */

/**
 * 方块容器槽位的**官方约束**：`container.slot_count` 必须是 `[1, 54]` 的整数。
 * 出处（Microsoft Learn · Block Components · minecraft:block_entity）：
 * <https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blockcomponents/minecraftblock_block_entity>
 * 原文："Sets the number of slots in the container. Value must be >= 1. Value must be <= 54."
 *
 * ⚠️ 这是**方块**路线（`minecraft:block_entity.container`）的限制；
 *    **实体**路线（实体组件 `minecraft:inventory.inventory_size`）的文档**没有给上限**
 *    （<https://learn.microsoft.com/en-us/minecraft/creator/reference/content/entityreference/examples/entitycomponents/minecraftcomponent_inventory>），
 *    别把 54 套到实体容器上（`createTileBlock` 的 `inventory_size` 只校验正整数）。
 */
const BLOCK_CONTAINER_SLOT_COUNT_MIN = 1
const BLOCK_CONTAINER_SLOT_COUNT_MAX = 54

/**
 * 归一化方块容器参数 → `{ slot_count }`（官方文档里的字段名）。
 *
 * 同时接受 `inventory_size` 作为别名：框架其它容器 API（实体组件、`createTileBlock`）用的都是
 * `inventory_size`，用户几乎必然会写成那个名字；若两者同时给出且不一致，抛错而不是猜。
 *
 * @param {Object|number} container `{ slot_count }` / `{ inventory_size }`，或直接给槽位数
 * @param {string} caller 调用方名字（用于报错信息）
 * @returns {{slot_count: number}}
 */
function normalizeBlockContainer(container, caller) {
  if (Number.isInteger(container)) {
    container = { slot_count: container }
  }
  if (typeof container !== 'object' || container === null || Array.isArray(container)) {
    throw new Error(`${caller}: container 必须是 { slot_count } 对象（或直接给整数槽位数）`)
  }
  const { slot_count, inventory_size } = container
  if (slot_count !== undefined && inventory_size !== undefined && slot_count !== inventory_size) {
    throw new Error(`${caller}: container.slot_count 与 container.inventory_size 同时给出且不一致（${slot_count} ≠ ${inventory_size}）`)
  }
  const slots = slot_count ?? inventory_size
  if (!Number.isInteger(slots) || slots < BLOCK_CONTAINER_SLOT_COUNT_MIN || slots > BLOCK_CONTAINER_SLOT_COUNT_MAX) {
    throw new Error(
      `${caller}: container 槽位数必须是 ${BLOCK_CONTAINER_SLOT_COUNT_MIN}..${BLOCK_CONTAINER_SLOT_COUNT_MAX} 之间的整数` +
      `（Microsoft Learn: "Value must be >= 1. Value must be <= 54."）。` +
      `槽位数超过 54 的容器走**实体**路线，例如 BlockAPI.createTileBlock(id, category, textures, { inventory_size: N })`
    )
  }
  return { slot_count: slots }
}

/** 已打印过的 warn（按消息去重）—— 避免 N 个容器刷 N 条同样的提示 */
const warnedMessages = new Set()
function warnOnce(message) {
  if (warnedMessages.has(message)) return
  warnedMessages.add(message)
  console.warn(message)
}

export class BlockComponent {
  /**
   * @param {string} texture - 纹理短名
   * @param {Object|string} [options] - 可选参数对象，或旧版 tint_method 字符串
   * @param {number} [options.particle_count] - 粒子数量 (0-255，默认 100)
   * @param {string} [options.tint_method] - 染色方法（如 "grass"）
   * @returns {Map<string, any>}
   */
  static setDestructionParticles(texture, options = {}){
    if (typeof options === 'string') {
      options = { tint_method: options };
    }
    const obj = { texture };
    const { particle_count, tint_method } = options;
    if (particle_count !== undefined) {
      if (!Number.isInteger(particle_count) || particle_count < 0 || particle_count > 255) {
        throw new Error('particle_count must be an integer between 0 and 255');
      }
      obj.particle_count = particle_count;
    }
    if (tint_method) {
      obj.tint_method = tint_method;
    }
    return new Map([["minecraft:destruction_particles", obj]]);
  }
  /**
   * 自定义方块组件 
   * [warning] 需要 Scripting V2.0.0
   * @param {string} component_id 组件标识符
   * @param {object} params 自定义参数接口对象
   * @returns {Map<string, any>} 物品组件Map
   */
  static setCustomComponentV2(component_id,params){
    return new Map([[
      component_id,
      params
    ]]);
  }

 /**
  * 
  * @param {Array} interval_range 
  * @param {boolean} looping 
   * @returns {Map<string, any>}
   */
 static setTick(interval_range,looping){
   return new Map().set("minecraft:tick",{
    interval_range:interval_range,
    looping:looping
   })
  }
 /**
  * 
   * @param {Array} custom_components 
   * @returns {Map<string, any>}
   */
  static setCustomComponents(custom_components){
    const map = new Map();
    for (const id of custom_components) {
      map.set(id, {});
    }
    return map;
  }
  /**
 * 创建一个用于 Minecraft 方块的变换对象，并返回一个 Map。
 * @param {number[]} [translation=[0, 0, 0]] - 平移向量 [x, y, z]。
 * @param {number[]} [scale=[1, 1, 1]] - 缩放向量 [x, y, z]。
 * @param {number[]} [scale_pivot=[0, 0, 0]] - 缩放的枢轴点 [x, y, z]。
 * @param {number[]} [rotation=[0, 0, 0]] - 旋转向量（角度）[x, y, z]。
 * @param {number[]} [rotation_pivot=[0, 0, 0]] - 旋转的枢轴点 [x, y, z]。
 * @returns {Map<string, any>} - 一个包含变换数据的 Map 对象。
 * @throws {Error} - 如果任何参数无效，则抛出错误。
 */
  static setTransformation(
    translation = [0, 0, 0],
    scale = [1, 1, 1],
    scale_pivot = [0, 0, 0],
    rotation = [0, 0, 0],
    rotation_pivot = [0, 0, 0]
  ) {
    // 验证输入参数是否为有效的 3D 向量
    const validateVector = (vector, name) => {
      if (
        !Array.isArray(vector) ||
        vector.length !== 3 ||
        !vector.every((value) => typeof value === "number" && !isNaN(value))
      ) {
        throw new Error(`${name} 必须是一个包含 3 个有效数字的数组`);
      }
    };

    // 验证所有输入参数
    validateVector(translation, "translation");
    validateVector(scale, "scale");
    validateVector(scale_pivot, "scale_pivot");
    validateVector(rotation, "rotation");
    validateVector(rotation_pivot, "rotation_pivot");

    // 创建变换对象
    const transformation = {
      translation,
      scale,
      scale_pivot,
      rotation,
      rotation_pivot,
    };

    // 将变换对象存入 Map
    const transformationMap = new Map();
    transformationMap.set("minecraft:transformation", transformation);

    return transformationMap;
  }
  /**
   * 设置方块的呼吸行为。
   * @param {String} value - 呼吸行为，可选值为 "solid" 或 "air"。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setBreathability(value) {
    if (value !== "solid" && value !== "air") {
      throw new Error('breathability must be either "solid" or "air"');
    }
    return new Map().set("minecraft:breathability", value);
  }

  /**
   * 启用或禁用方块的碰撞箱。
   * @param {Boolean} enabled - 是否启用碰撞箱。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setCollisionBoxEnabled(enabled) {
    if (typeof enabled !== "boolean") {
      throw new Error('enabled must be a boolean');
    }
    return new Map().set("minecraft:collision_box", enabled);
  }

  /**
   * 设置自定义的碰撞箱。
   * @param {Array} origin - 碰撞箱的起点坐标 [x, y, z]。
   * @param {Array} size - 碰撞箱的大小 [width, height, depth]。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setCollisionBoxCustom(origin, size) {
    if (!Array.isArray(origin) || origin.length !== 3) {
      throw new Error('origin must be an array of 3 numbers');
    }
    if (!Array.isArray(size) || size.length !== 3) {
      throw new Error('size must be an array of 3 numbers');
    }

    const [x, y, z] = origin;
    const [width, height, depth] = size;

    if (x < -8 || x > 8 || y < 0 || y > 16 || z < -8 || z > 8) {
      throw new Error('origin must be in the range (-8, 0, -8) to (8, 16, 8)');
    }
    if (x + width < -8 || x + width > 8 || y + height < 0 || y + height > 16 || z + depth < -8 || z + depth > 8) {
      throw new Error('origin + size must be in the range (-8, 0, -8) to (8, 16, 8)');
    }

    return new Map().set("minecraft:collision_box", { origin, size });
  }

  /**
   * 设置方块的合成台属性。
   * @param {Array} craftingTags - 合成标签。
   * @param {String} tableName - 合成台名称。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setCraftingTable(craftingTags, tableName) {
    if (!Array.isArray(craftingTags) || craftingTags.length > 64) {
      throw new Error('craftingTags must be an array with a maximum of 64 tags');
    }
    for (const tag of craftingTags) {
      if (typeof tag !== "string" || tag.length > 64) {
        throw new Error('each crafting tag must be a string with a maximum of 64 characters');
      }
    }

    if (tableName && typeof tableName !== "string") {
      throw new Error('tableName must be a string');
    }

    return new Map().set("minecraft:crafting_table", {
      crafting_tags: craftingTags,
      table_name: tableName,
    });
  }

  /**
   * 启用或禁用方块的爆炸抗性。
   * @param {Boolean} enabled - 是否启用爆炸抗性。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setDestructibleByExplosionEnabled(enabled) {
    if (typeof enabled !== "boolean") {
      throw new Error('enabled must be a boolean');
    }
    return new Map().set("minecraft:destructible_by_explosion", enabled);
  }

  /**
   * 设置自定义的爆炸抗性。
   * @param {Number} explosionResistance - 爆炸抗性值。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setDestructibleByExplosionCustom(explosionResistance) {
    if (typeof explosionResistance !== "number") {
      throw new Error('explosionResistance must be a number');
    }
    return new Map().set("minecraft:destructible_by_explosion", {
      explosion_resistance: explosionResistance,
    });
  }

  /**
   * 启用或禁用方块的挖掘抗性。
   * @param {Boolean} enabled - 是否启用挖掘抗性。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setDestructibleByMiningEnabled(enabled) {
    if (typeof enabled !== "boolean") {
      throw new Error('enabled must be a boolean');
    }
    return new Map().set("minecraft:destructible_by_mining", enabled);
  }

  /**
   * 设置自定义的挖掘抗性。
   * @param {Number} secondsToDestroy - 破坏所需时间（秒）。
   * @param {Array} itemSpecificSpeeds - 特定工具的挖掘速度。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setDestructibleByMiningCustom(secondsToDestroy, itemSpecificSpeeds) {
    if (typeof secondsToDestroy !== "number") {
      throw new Error('secondsToDestroy must be a number');
    }

    if (itemSpecificSpeeds && Array.isArray(itemSpecificSpeeds)) {
      for (const speed of itemSpecificSpeeds) {
        if (typeof speed.destroy_speed !== "number") {
          throw new Error('destroy_speed must be a number');
        }
        if (!speed.item) {
          throw new Error('item is required in item_specific_speeds');
        }
      }
    }

    return new Map().set("minecraft:destructible_by_mining", {
      seconds_to_destroy: secondsToDestroy,
      item_specific_speeds: itemSpecificSpeeds,
    });
  }

  /**
   * 设置方块的显示名称。
   * @param {String} displayName - 显示名称。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setDisplayName(displayName) {
    if (typeof displayName !== "string") {
      throw new Error('displayName must be a string');
    }
    return new Map().set("minecraft:display_name", displayName);
  }

  /**
   * 启用或禁用方块的易燃性。
   * @param {Boolean} enabled - 是否启用易燃性。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setFlammableEnabled(enabled) {
    if (typeof enabled !== "boolean") {
      throw new Error('enabled must be a boolean');
    }
    return new Map().set("minecraft:flammable", enabled);
  }

  /**
   * 设置自定义的易燃性。
   * @param {Number} catchChanceModifier - 着火概率。
   * @param {Number} destroyChanceModifier - 被火焰摧毁的概率。
   * @param {String} [lava_flammable] - 岩浆能否点燃该方块 ("always"|"never"，默认 "never")
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setFlammableCustom(catchChanceModifier, destroyChanceModifier, lava_flammable) {
    if (typeof catchChanceModifier !== "number" || catchChanceModifier < 0) {
      throw new Error('catchChanceModifier must be a number greater than or equal to 0');
    }
    if (typeof destroyChanceModifier !== "number" || destroyChanceModifier < 0) {
      throw new Error('destroyChanceModifier must be a number greater than or equal to 0');
    }

    const obj = {
      catch_chance_modifier: catchChanceModifier,
      destroy_chance_modifier: destroyChanceModifier,
    };
    if (lava_flammable !== undefined) {
      if (!["always", "never"].includes(lava_flammable)) {
        throw new Error('lava_flammable must be "always" or "never"');
      }
      obj.lava_flammable = lava_flammable;
    }
    return new Map().set("minecraft:flammable", obj);
  }

  /**
   * 设置方块的摩擦力。
   * @param {Number} value - 摩擦力值，范围为 0.0 到 0.9。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setFriction(value) {
    if (typeof value !== "number" || value < 0.0 || value > 0.9) {
      throw new Error('friction must be a number between 0.0 and 0.9');
    }
    return new Map().set("minecraft:friction", value);
  }

  /**
   * 设置方块的几何模型。
   * @param {String} identifier - 几何模型标识符。
   * @param {Object} [options] - 可选参数。
   * @param {Object} [options.bone_visibility] - 骨骼可见性配置。
   * @param {String} [options.culling] - 裁剪规则标识符（格式: <namespace>:culling.<name>）。
   * @param {String} [options.culling_layer] - 裁剪层标识符（如 "minecraft:culling_layer.leaves"）。
   * @param {String} [options.culling_shape] - 体素形状（仅支持 "minecraft:unit_cube"）。
   * @param {Boolean|String[]} [options.uv_lock] - 是否锁定 UV 旋转，或指定骨骼名称数组。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setGeometry(identifier, options = {}) {
    if (typeof identifier !== "string") {
      throw new Error('identifier must be a string');
    }
    const geometry = { identifier };
    if (options.bone_visibility) {
      geometry.bone_visibility = options.bone_visibility;
    }
    if (options.culling) {
      geometry.culling = options.culling;
    }
    if (options.culling_layer) {
      geometry.culling_layer = options.culling_layer;
    }
    if (options.culling_shape) {
      geometry.culling_shape = options.culling_shape;
    }
    if (options.uv_lock !== undefined) {
      geometry.uv_lock = options.uv_lock;
    }
    return new Map().set("minecraft:geometry", geometry);
  }

  /**
   * 设置方块的骨骼可见性。
   * @param {Object} bone_visibility - 骨骼可见性配置。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setBoneVisibility(bone_visibility) {
    if (!bone_visibility || typeof bone_visibility !== "object") {
      throw new Error('bone_visibility must be an object');
    }
    return new Map().set("minecraft:geometry", { bone_visibility });
  }

  /**
   * 设置方块的物品视觉属性。
   * @param {String} geometry - 几何模型标识符。
   * @param {Object} materialInstances - 材质实例配置。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setItemVisual(geometry, materialInstances) {
    if (typeof geometry !== "string") {
      throw new Error('geometry must be a string');
    }
    if (!materialInstances || typeof materialInstances !== "object") {
      throw new Error('materialInstances must be an object');
    }

    return new Map().set("minecraft:item_visual", {
      geometry,
      material_instances: materialInstances,
    });
  }

  /**
   * 设置方块的光衰减值。
   * @param {Number} value - 光的衰减值，范围为 0 到 15。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setLightDampening(value) {
    if (typeof value !== "number" || value < 0 || value > 15) {
      throw new Error('lightDampening must be a number between 0 and 15');
    }
    return new Map().set("minecraft:light_dampening", value);
  }

  /**
   * 设置方块的光照强度。
   * @param {Number} value - 光照强度，范围为 0 到 15。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setLightEmission(value) {
    if (typeof value !== "number" || value < 0 || value > 15) {
      throw new Error('lightEmission must be a number between 0 and 15');
    }
    return new Map().set("minecraft:light_emission", value);
  }

  /**
   * 设置方块的液体检测属性。
   * @param {Boolean|Object} canContainLiquid - 是否可容纳液体，或是完整选项对象
   * @param {String} [liquidType] - 液体类型
   * @param {String} [onLiquidTouches] - 对液体的反应方式
   * @param {Array} [stopsLiquidFlowingFromDirection] - 阻止液体流动的方向
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setLiquidDetection(canContainLiquid, liquidType, onLiquidTouches, stopsLiquidFlowingFromDirection) {
    const validReactions = ["blocking", "broken", "popped", "no_reaction"];
    const validDirections = ["up", "down", "north", "south", "east", "west"];

    if (typeof canContainLiquid === "object" && !Array.isArray(canContainLiquid)) {
      const opts = canContainLiquid;
      const obj = {};
      if (opts.detection_rules) {
        if (!Array.isArray(opts.detection_rules)) {
          throw new Error('detection_rules must be an array');
        }
        obj.detection_rules = opts.detection_rules;
      }
      if (opts.use_liquid_clipping !== undefined) {
        if (typeof opts.use_liquid_clipping !== "boolean") {
          throw new Error('use_liquid_clipping must be a boolean');
        }
        obj.use_liquid_clipping = opts.use_liquid_clipping;
      }
      return new Map().set("minecraft:liquid_detection", obj);
    }

    if (typeof canContainLiquid !== "boolean") {
      throw new Error('canContainLiquid must be a boolean');
    }

    if (liquidType && liquidType !== "water") {
      throw new Error('liquidType must be "water"');
    }

    if (onLiquidTouches && !validReactions.includes(onLiquidTouches)) {
      throw new Error('onLiquidTouches must be one of: "blocking", "broken", "popped", "no_reaction"');
    }

    if (stopsLiquidFlowingFromDirection && Array.isArray(stopsLiquidFlowingFromDirection)) {
      for (const direction of stopsLiquidFlowingFromDirection) {
        if (!validDirections.includes(direction)) {
          throw new Error('stopsLiquidFlowingFromDirection must be one of: "up", "down", "north", "south", "east", "west"');
        }
      }
    }

    return new Map().set("minecraft:liquid_detection", {
      can_contain_liquid: canContainLiquid,
      liquid_type: liquidType,
      on_liquid_touches: onLiquidTouches,
      stops_liquid_flowing_from_direction: stopsLiquidFlowingFromDirection,
    });
  }

  /**
   * 设置方块的战利品表路径。
   * @param {String} path - 战利品表路径。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setLoot(path) {
    if (typeof path !== "string" || path.length > 256) {
      throw new Error('path must be a string with a maximum length of 256 characters');
    }
    return new Map().set("minecraft:loot", path);
  }

  /**
   * 设置方块的地图颜色。
   * @param {String|Array|Object} value - 地图颜色，可以是十六进制字符串、RGB 数组或对象格式。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setMapColor(value) {
    if (typeof value === "object" && !Array.isArray(value)) {
      const { color, tint_method } = value;
      if (typeof color === "string") {
        if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
          throw new Error('mapColor color must be a valid hex string (e.g., "#FFFFFF")');
        }
      } else if (Array.isArray(color)) {
        if (color.length !== 3 || color.some((v) => typeof v !== "number" || v < 0 || v > 255)) {
          throw new Error('mapColor color must be a valid RGB array (e.g., [255, 255, 255])');
        }
      } else {
        throw new Error('mapColor must be a hex string, RGB array, or { color, tint_method } object');
      }
      const obj = { color };
      if (tint_method) obj.tint_method = tint_method;
      return new Map().set("minecraft:map_color", obj);
    }

    if (typeof value === "string") {
      if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
        throw new Error('mapColor must be a valid hex string (e.g., "#FFFFFF")');
      }
    } else if (Array.isArray(value)) {
      if (value.length !== 3 || value.some((v) => typeof v !== "number" || v < 0 || v > 255)) {
        throw new Error('mapColor must be a valid RGB array (e.g., [255, 255, 255])');
      }
    } else {
      throw new Error('mapColor must be a hex string or an RGB array');
    }

    return new Map().set("minecraft:map_color", value);
  }

  /**
   * 设置方块的材质实例。
   * @param {Object} instances - 材质实例配置。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setMaterialInstances(instances) {
    if (!instances || typeof instances !== "object") {
      throw new Error('instances must be an object');
    }
/*
    if (!instances["*"] ) {
      throw new Error('material_instances must include a "*" material instance');
    }
*/
    for (const [key, value] of Object.entries(instances)) {
      if (typeof value === "object") {
        if (!value.texture || typeof value.texture !== "string") {
          throw new Error(`material instance "${key}" must have a texture`);
        }
        if (value.ambient_occlusion !== undefined && typeof value.ambient_occlusion !== "boolean" && typeof value.ambient_occlusion !== "number") {
          throw new Error(`ambient_occlusion in material instance "${key}" must be a boolean or number`);
        }
        if (value.face_dimming !== undefined && typeof value.face_dimming !== "boolean") {
          throw new Error(`face_dimming in material instance "${key}" must be a boolean`);
        }
        if (value.render_method && !["opaque", "double_sided", "blend", "blend_to_opaque", "alpha_test", "alpha_test_to_opaque", "alpha_test_single_side", "alpha_test_single_side_to_opaque", "alpha_test_single_sided"].includes(value.render_method)) {
          throw new Error(`render_method in material instance "${key}" must be one of: opaque, double_sided, blend, blend_to_opaque, alpha_test, alpha_test_to_opaque, alpha_test_single_side, alpha_test_single_side_to_opaque`);
        }
        if (value.tint_method !== undefined && typeof value.tint_method !== "string") {
          throw new Error(`tint_method in material instance "${key}" must be a string`);
        }
        if (value.alpha_masked_tint !== undefined && typeof value.alpha_masked_tint !== "boolean") {
          throw new Error(`alpha_masked_tint in material instance "${key}" must be a boolean`);
        }
        if (value.isotropic !== undefined && typeof value.isotropic !== "boolean") {
          throw new Error(`isotropic in material instance "${key}" must be a boolean`);
        }
      } else if (typeof value !== "string") {
        throw new Error(`material instance "${key}" must be an object or a string`);
      }
    }

    return new Map().set("minecraft:material_instances", instances);
  }

  /**
   * 设置方块的放置过滤条件。
   * @param {Array} conditions - 放置条件列表。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setPlacementFilter(conditions) {
    if (!Array.isArray(conditions) || conditions.length === 0 || conditions.length > 64) {
      throw new Error('conditions must be an array with 1 to 64 elements');
    }

    for (const condition of conditions) {
      if (condition.allowed_faces && Array.isArray(condition.allowed_faces)) {
        const validFaces = ["up", "down", "north", "south", "east", "west", "side", "all"];
        for (const face of condition.allowed_faces) {
          if (!validFaces.includes(face)) {
            throw new Error(`allowed_faces must be one of: ${validFaces.join(", ")}`);
          }
        }
      }

      if (condition.block_filter && Array.isArray(condition.block_filter)) {
        for (const block of condition.block_filter) {
          if (typeof block === "string") {
            continue;
          } else if (typeof block === "object" && block !== null) {
            if (block.tags && typeof block.tags !== "string") {
              throw new Error('tags in block_filter must be a string');
            }
            if (block.name && typeof block.name !== "string") {
              throw new Error('name in block_filter must be a string');
            }
            if (block.states && typeof block.states !== "object") {
              throw new Error('states in block_filter must be an object');
            }
          } else {
            throw new Error('block_filter must be a string or a BlockDescriptor object');
          }
        }
      }

      if (!condition.allowed_faces && !condition.block_filter) {
        throw new Error('each condition must have at least one of allowed_faces or block_filter');
      }
    }

    return new Map().set("minecraft:placement_filter", { conditions });
  }

  /**
   * 设置方块的红石导电性。
   * @param {Boolean} allowsWireToStepDown - 是否允许红石线向下阶梯连接。
   * @param {Boolean} redstoneConductor - 方块是否可以被红石信号激活。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setRedstoneConductivity(allowsWireToStepDown, redstoneConductor) {
    if (typeof allowsWireToStepDown !== "boolean") {
      throw new Error('allowsWireToStepDown must be a boolean');
    }
    if (typeof redstoneConductor !== "boolean") {
      throw new Error('redstoneConductor must be a boolean');
    }

    return new Map().set("minecraft:redstone_conductivity", {
      allows_wire_to_step_down: allowsWireToStepDown,
      redstone_conductor: redstoneConductor,
    });
  }

  /**
   * 启用或禁用方块的选择框。
   * @param {Boolean} enabled - 是否启用选择框。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setSelectionBoxEnabled(enabled) {
    if (typeof enabled !== "boolean") {
      throw new Error('enabled must be a boolean');
    }
    return new Map().set("minecraft:selection_box", enabled);
  }

  /**
   * 设置自定义的选择框。
   * @param {Array} origin - 选择框的起点坐标 [x, y, z]。
   * @param {Array} size - 选择框的大小 [width, height, depth]。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setSelectionBoxCustom(origin, size) {
    if (!Array.isArray(origin) || origin.length !== 3) {
      throw new Error('origin must be an array of 3 numbers');
    }
    if (!Array.isArray(size) || size.length !== 3) {
      throw new Error('size must be an array of 3 numbers');
    }

    const [x, y, z] = origin;
    const [width, height, depth] = size;

    if (x < -8 || x > 8 || y < 0 || y > 16 || z < -8 || z > 8) {
      throw new Error('origin must be in the range (-8, 0, -8) to (8, 16, 8)');
    }
    if (x + width < -8 || x + width > 8 || y + height < 0 || y + height > 16 || z + depth < -8 || z + depth > 8) {
      throw new Error('origin + size must be in the range (-8, 0, -8) to (8, 16, 8)');
    }

    return new Map().set("minecraft:selection_box", { origin, size });
  }

  /**
   * 设置方块实体（Block Entity，实验性功能，需开启 Upcoming Creator Features）。
   *
   * 两种调用方式（都支持，互不干扰）：
   * ```js
   * BlockComponent.setBlockEntity()                    // → { dynamic_properties: false }（历史产物，逐字节不变）
   * BlockComponent.setBlockEntity(true)                // → { dynamic_properties: true }（历史产物，逐字节不变）
   * BlockComponent.setBlockEntity(true, { container: { slot_count: 27 } })
   * BlockComponent.setBlockEntity({ container: 54 })   // 只给容器时也可以省掉第一个参数
   * ```
   *
   * ⚠️ **`container` 是「方块容器」的规范写法**（官方文档
   * <https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blockcomponents/minecraftblock_block_entity>
   * ：`container.slot_count`，`>= 1` 且 `<= 54`，超限**抛错**），
   * 但**当前引擎版本仍会拒绝该成员**。**要现在就能用的容器，请走实体路线**：
   * `BlockAPI.createTileBlock(identifier, category, textures_arr, { inventory_size })`。
   * 引擎拒绝的原文与版本见 `doc/dev/known-pitfalls.md`。
   *
   * ⚠️ `combineComponents` 是「**后者覆盖前者**」：要同时给 `dynamic_properties` 与 `container`，
   *    请像上面那样**一次调用写完**；把两个 `setBlockEntity(...)` 合并会让先出现的那个被整份丢掉
   *    （框架不在 `combineComponents` 里做隐式深合并 —— 那会把"覆盖"这条既有语义改掉）。
   *
   * @param {Boolean|Object} [dynamic_properties=false] 是否启用动态属性存储；也可以直接传 `options` 对象
   *   （此时读 `options.dynamic_properties`，缺省 false）。
   * @param {Object} [options] 可选参数。
   * @param {Object|number} [options.container] 方块容器：`{ slot_count }`（`inventory_size` 亦可作别名），
   *   或直接给槽位数。必须是 `[1, 54]` 的整数，超限抛错。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setBlockEntity(dynamic_properties = false, options = {}) {
    let dynamicProperties = dynamic_properties
    let opts = options

    // 只传一个对象时（`setBlockEntity({ container: … })`）把它当成 options
    if (dynamic_properties !== null && typeof dynamic_properties === 'object') {
      if (Array.isArray(dynamic_properties)) {
        throw new Error('setBlockEntity: 第一个参数必须是布尔值或 options 对象')
      }
      opts = dynamic_properties
      dynamicProperties = opts.dynamic_properties ?? false
    }
    if (typeof dynamicProperties !== 'boolean') {
      throw new Error('setBlockEntity: dynamic_properties 必须是布尔类型')
    }
    if (typeof opts !== 'object' || opts === null || Array.isArray(opts)) {
      throw new Error('setBlockEntity: options 必须是对象')
    }

    // ⚠️ 无 container 时必须产出一模一样的 { dynamic_properties }（键序也不要变）
    const obj = { dynamic_properties: dynamicProperties }
    if (opts.container !== undefined) {
      obj.container = normalizeBlockContainer(opts.container, 'setBlockEntity')
    }

    return new Map().set("minecraft:block_entity", obj);
  }

  /**
   * 设置方块容器 —— ⚠️ **已废弃（deprecated），且当前引擎版本拒绝该组件**。
   *
   * ## 为什么废弃
   * 本方法产出的是**方块** `components` 里的 `minecraft:inventory`。但 `minecraft:inventory`
   * 是**实体**组件（官方文档在 Entity Components 下：
   * <https://learn.microsoft.com/en-us/minecraft/creator/reference/content/entityreference/examples/entitycomponents/minecraftcomponent_inventory>），
   * **不是**方块组件（Block Components 列表里没有它）。于是真机引擎直接拒绝：
   * ```
   * -> components -> minecraft:inventory: this component was found in the input,
   *    but is not present in the Schema
   * ```
   * ⇒ 把实体组件写在方块里，**在任何版本上都不成立**（不是"版本太旧"的问题）。
   * 也就是说：**框架此前产不出任何可用的方块容器**，这条 API 是误导性的。
   *
   * ## 现在该怎么做
   * - **要能用的容器 → 实体路线**（当前引擎版本下**唯一可用**）：
   *   `BlockAPI.createTileBlock(identifier, category, textures_arr, { inventory_size, container_type, can_be_siphoned_from })`
   *   —— 方块带承载实体、实体的行为文件里挂 `minecraft:inventory`。
   *   已在用的 `TileBlock` 也可以直接改 `tile.entity.behavior.addComponent(EntityComponent.setInventoryProperties({...}))`。
   * - **要规范的方块容器 JSON → `BlockComponent.setBlockEntity(true, { container: { slot_count } })`**
   *   （`slot_count` 官方文档限制 `[1,54]`）。它会生成正确的 `minecraft:block_entity.container`，
   *   但**当前引擎版本同样会拒** —— 等引擎支持后即可直接用。
   *
   * ## 为什么保留签名（而不是删掉 / 改成别的产物）
   * 1. 已有项目调用它时，产物里的键、字段**一个字节都不变** —— 不会出现"升个框架版本构建就报错"，
   *    也不会因为改成 `block_entity.container` 而与用户自己写的 `setBlockEntity(...)` 抢同一个 JSON 键
   *    （`combineComponents` 是后者覆盖前者，改键会让容器信息在某些写法下**被静默吞掉**）。
   * 2. 真正的错误（把实体组件当方块组件用）由**构建期 warn** 明确指出，并给出两条新路线。
   * 3. `inventory_size` 超过 54 的写法在这里仍可表达（实体组件文档**没有**上限）。
   *
   * @deprecated 改用实体路线（`createTileBlock` 的 `inventory_size`），或
   *   `BlockComponent.setBlockEntity(true, { container: { slot_count } })` 产出规范写法。
   * @param {Object} options - 容器参数。
   * @param {number} options.inventory_size - 槽位数（正整数，必填；实体组件文档未给上限）。
   * @param {boolean} [options.private] - 是否仅所有者可访问。
   * @param {string} [options.container_type] - 容器音效/行为类型。官方文档列出的取值：
   *   `horse` / `minecart_chest` / `chest_boat` / `minecart_hopper` / `inventory` / `container` / `hopper`
   *   （此处不做白名单，避免把未文档化但可用的值写死掉）。
   * @param {boolean} [options.can_be_siphoned_from] - 能否用漏斗抽取。
   * @param {number} [options.additional_slots_per_strength] - 每级强度的额外槽位（非负整数）。
   * @param {boolean} [options.restrict_to_owner] - 是否限制为所有者可打开。
   * @returns {Map<string, any>} - 组件集合（仅 `minecraft:inventory`）。
   */
  static setInventory(options = {}) {
    if (typeof options !== 'object' || options === null) {
      throw new Error('setInventory: options 必须是对象');
    }
    const {
      inventory_size,
      private: isPrivate,
      container_type,
      can_be_siphoned_from,
      additional_slots_per_strength,
      restrict_to_owner
    } = options;

    if (!Number.isInteger(inventory_size) || inventory_size < 1) {
      throw new Error('setInventory: inventory_size 必须是大于 0 的整数（槽位数）');
    }
    if (container_type !== undefined && (typeof container_type !== 'string' || container_type.length === 0)) {
      throw new Error('setInventory: container_type 必须是非空字符串');
    }
    for (const [name, value] of [
      ['private', isPrivate],
      ['can_be_siphoned_from', can_be_siphoned_from],
      ['restrict_to_owner', restrict_to_owner]
    ]) {
      if (value !== undefined && typeof value !== 'boolean') {
        throw new Error(`setInventory: ${name} 必须是布尔类型`);
      }
    }
    if (additional_slots_per_strength !== undefined &&
        (!Number.isInteger(additional_slots_per_strength) || additional_slots_per_strength < 0)) {
      throw new Error('setInventory: additional_slots_per_strength 必须是非负整数');
    }

    warnOnce(
      '[sapdon] BlockComponent.setInventory() 已废弃：它产出的 minecraft:inventory 是**实体**组件，' +
      '写在方块 components 里会被引擎拒绝（-> components -> minecraft:inventory: this component was found ' +
      'in the input, but is not present in the Schema）。当前可用的容器请走实体路线：' +
      'BlockAPI.createTileBlock(id, category, textures, { inventory_size, container_type, can_be_siphoned_from })；' +
      '要规范写法可用 BlockComponent.setBlockEntity(true, { container: { slot_count } })（当前引擎版本同样会拒，' +
      '但 JSON 与官方文档一致）。详见 doc/user/api/block.md 的 setInventory 小节。'
    )

    // 只写入被显式赋值的字段 —— 未赋值不泄漏进产物 JSON
    const obj = { inventory_size };
    if (isPrivate !== undefined) obj.private = isPrivate;
    if (container_type !== undefined) obj.container_type = container_type;
    if (can_be_siphoned_from !== undefined) obj.can_be_siphoned_from = can_be_siphoned_from;
    if (additional_slots_per_strength !== undefined) obj.additional_slots_per_strength = additional_slots_per_strength;
    if (restrict_to_owner !== undefined) obj.restrict_to_owner = restrict_to_owner;

    return new Map().set("minecraft:inventory", obj);
  }

  /**
   * 设置方块的活塞移动行为。
   * @param {String} movement_type - 移动类型: "immovable" | "popped" | "push" | "push_pull"。
   * @param {String} [sticky] - 黏性行为: "same" 可复制黏液块/蜂蜜块功能。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setMovable(movement_type, sticky) {
    const valid = ["immovable", "popped", "push", "push_pull"];
    if (!valid.includes(movement_type)) {
      throw new Error(`movement_type must be one of: ${valid.join(", ")}`);
    }
    const obj = { movement_type };
    if (sticky) obj.sticky = sticky;
    return new Map().set("minecraft:movable", obj);
  }

  /**
   * 设置方块的监听红石信号行为（配合自定义组件 onRedstoneUpdate 使用）。
   * @param {Number} min_power - 最小触发红石信号强度 (0-15)。
   * @param {Boolean} [propagates_power] - 是否传导红石信号。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setRedstoneConsumer(min_power, propagates_power) {
    return new Map().set("minecraft:redstone_consumer", {
      min_power,
      propagates_power
    });
  }

  /**
   * 设置方块产生红石信号。
   * @param {Number} power - 信号强度 (0-15)。
   * @param {String} strongly_powered_face - 强充能方向: "up" | "down" | "north" | "south" | "east" | "west"。
   * @param {String[]} [connected_faces] - 连接的方向数组。
   * @param {Boolean} [transform_relative] - 面方向是否相对于变换组件的旋转。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setRedstoneProducer(power, strongly_powered_face, connected_faces, transform_relative) {
    return new Map().set("minecraft:redstone_producer", {
      power,
      strongly_powered_face,
      connected_faces,
      transform_relative
    });
  }

  /**
   * 设置方块可被替换（放置其他方块时替换此方块）。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setReplaceable() {
    return new Map().set("minecraft:replaceable", {});
  }

  /**
   * 设置方块的支撑形状。
   * @param {String} shape - 支撑形状: "fence" | "stair"。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setSupport(shape) {
    if (!["fence", "stair"].includes(shape)) {
      throw new Error('shape must be "fence" or "stair"');
    }
    return new Map().set("minecraft:support", { shape });
  }

  /**
   * 设置方块标签。
   * @param {String[]} tags - 标签数组。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setTags(tags) {
    if (!Array.isArray(tags)) {
      throw new Error('tags must be an array');
    }
    return new Map().set("minecraft:tags", tags);
  }

  /**
   * 设置方块可被拴绳拴住（类似栅栏）。
   * @param {Number[]} [offset=[0, 12, 0]] - 拴绳结位置偏移 [x, y, z]。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setLeashable(offset = [0, 12, 0]) {
    return new Map().set("minecraft:leashable", { offset });
  }

  /**
   * 设置方块对实体坠落事件的触发。
   * @param {Number} min_fall_distance - 最小坠落距离（方块数）。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setEntityFallOn(min_fall_distance) {
    return new Map().set("minecraft:entity_fall_on", { min_fall_distance });
  }

  /**
   * 设置方块可放入花盆（配合 setEmbeddedVisual 使用）。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setFlowerPottable() {
    return new Map().set("minecraft:flower_pottable", {});
  }

  /**
   * 设置方块与降水（雨/雪）的交互行为。
   * @param {String} behavior - 降水行为: "obstruct_rain_accumulate_snow" | "obstruct_rain" | "snowlogging" | "none"。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setPrecipitationInteractions(behavior) {
    const valid = ["obstruct_rain_accumulate_snow", "obstruct_rain", "snowlogging", "none"];
    if (!valid.includes(behavior)) {
      throw new Error(`behavior must be one of: ${valid.join(", ")}`);
    }
    return new Map().set("minecraft:precipitation_interactions", {
      precipitation_behavior: behavior
    });
  }

  /**
   * 设置方块的随机偏移（碰撞箱/选择框/几何）。
   * @param {Object} axis_config - 每个轴的偏移配置。
   * @param {Object} [axis_config.x] - X 轴配置。
   * @param {Object} [axis_config.y] - Y 轴配置。
   * @param {Object} [axis_config.z] - Z 轴配置。
   * @param {Object} axis_config.x.range - 范围 {min, max}。
   * @param {Number} [axis_config.x.steps=0] - 步数（0=任意值）。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setRandomOffset(axis_config) {
    return new Map().set("minecraft:random_offset", axis_config);
  }

  /**
   * 设置方块对箱子开启的遮挡行为。
   * @param {String} rule - 遮挡规则: "always" | "never" | "shape"。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setChestObstruction(rule) {
    if (!["always", "never", "shape"].includes(rule)) {
      throw new Error('rule must be "always", "never", or "shape"');
    }
    return new Map().set("minecraft:chest_obstruction", {
      obstruction_rule: rule
    });
  }

  /**
   * 设置方块在花盆中的显示外观。
   * @param {String|Object} geometry - 几何标识符或几何对象。
   * @param {Object} material_instances - 材质实例。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setEmbeddedVisual(geometry, material_instances) {
    return new Map().set("minecraft:embedded_visual", {
      geometry,
      material_instances
    });
  }

  /**
   * 设置方块与栅栏/墙等方块的连接规则。
   * @param {String} [accepts_from="all"] - 连接来源: "all" | "only_fences" | "none"。
   * @param {String[]} [enabled_directions] - 允许连接的方向数组。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setConnectionRule(accepts_from = "all", enabled_directions) {
    const valid = ["all", "only_fences", "none"];
    if (!valid.includes(accepts_from)) {
      throw new Error(`accepts_from must be one of: ${valid.join(", ")}`);
    }
    return new Map().set("minecraft:connection_rule", {
      accepts_connections_from: accepts_from,
      enabled_directions
    });
  }

  /**
   * 设置方块的声音。
   * @param {String} sound - 声音名称。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setSound(sound) {
    return new Map().set("minecraft:sound", sound);
  }

  /**
   * 将多个组件集合合并为一个。
   * @param {...Map} componentMaps - 多个组件集合。
   * @returns {Map<string, any>} - 合并后的组件集合。
   */
  static combineComponents(...componentMaps) {
    return new Map(componentMaps.flatMap(map => [...map]));
  }

  /**
   * 获取当前组件的 JSON 表示。
   * @param {Map} components - 组件集合。
   * @returns {Object} - 组件的 JSON 对象。
   */
  static toJSON(components) {
    return Object.fromEntries(components);
  }
}