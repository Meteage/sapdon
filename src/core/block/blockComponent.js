/** @template T */
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
        if (value.render_method && !["opaque", "double_sided", "blend", "alpha_test", "alpha_test_single_sided"].includes(value.render_method)) {
          throw new Error(`render_method in material instance "${key}" must be one of: opaque, double_sided, blend, alpha_test, alpha_test_single_sided`);
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
   * @param {Boolean} [dynamic_properties=false] - 是否启用动态属性存储。
   * @returns {Map<string, any>} - 新的组件集合。
   */
  static setBlockEntity(dynamic_properties = false) {
    return new Map().set("minecraft:block_entity", {
      dynamic_properties
    });
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