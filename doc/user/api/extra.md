# 扩展模块 API 参考

本文档涵盖 Sapdon 框架的扩展模块 API，包括客户端实体外观（ClientEntityApperance）和基础载具（BaseVehicle）。

---

## ClientEntityApperance

客户端实体外观管理器，用于为客户端实体添加纹理、材质和渲染控制器。通过 `decorate()` 方法将配置应用到指定实体。

### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `textures` | `Record<string, string>` | 纹理映射表 |
| `materials` | `Record<string, string>` | 材质映射表，默认 `{ '*': 'material.default' }` |
| `renderControllers` | `string[]` | 渲染控制器名称列表 |

### 方法

#### `addTexture(name, source)`

添加一个纹理。

| 参数 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 纹理名称 |
| `source` | `string` | 纹理路径 |

```javascript
import { ClientEntityApperance } from "@sapdon/core";

const apperance = new ClientEntityApperance();
apperance.addTexture("layer0", "textures/entity/ruby_golem");
```

#### `removeTexture(name)`

移除一个纹理。

| 参数 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 要移除的纹理名称 |

```javascript
apperance.removeTexture("layer0");
```

#### `addMaterial(name, source)`

添加一个材质。

| 参数 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 材质名称 |
| `source` | `string` | 材质资源路径 |

```javascript
apperance.addMaterial("*", "material.default");
apperance.addMaterial("overlay", "material.entity_overlay");
```

#### `removeMaterial(name)`

移除一个材质。

| 参数 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 要移除的材质名称 |

```javascript
apperance.removeMaterial("overlay");
```

#### `addRenderController(controller)`

添加一个渲染控制器。控制器会自动注册到全局渲染控制器组。

| 参数 | 类型 | 说明 |
|------|------|------|
| `controller` | `AddonRenderController` | 渲染控制器实例 |

```javascript
import { AddonRenderController } from "@sapdon/core";

const controller = new AddonRenderController("ruby_golem_controller", "geometry.ruby_golem", "textures/entity/ruby_golem");
apperance.addRenderController(controller);
```

#### `removeRenderController(controllerId)`

移除一个渲染控制器。

| 参数 | 类型 | 说明 |
|------|------|------|
| `controllerId` | `string` | 渲染控制器的名称/ID |

```javascript
apperance.removeRenderController("ruby_golem_controller");
```

#### `decorate(entityId)`

将当前外观配置应用到指定的客户端实体上。

| 参数 | 类型 | 说明 |
|------|------|------|
| `entityId` | `string` | 目标实体 ID |

如果指定实体不存在，会抛出 `Error`。

```javascript
apperance.decorate("sapdon:ruby_golem");
```

### 完整示例

```javascript
import { ClientEntityApperance, AddonRenderController } from "@sapdon/core";

const apperance = new ClientEntityApperance();

apperance.addTexture("layer0", "textures/entity/ruby_golem");
apperance.addMaterial("*", "material.default");

const controller = new AddonRenderController(
  "ruby_golem_controller",
  "geometry.ruby_golem",
  "textures/entity/ruby_golem"
);
apperance.addRenderController(controller);

apperance.decorate("sapdon:ruby_golem");
```

---

## BaseVehicle

基础载具类，用于定义可骑乘实体（载具）的座位、碰撞箱和驾驶行为。

### 构造函数

#### `new BaseVehicle(id)`

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 载具实体标识符 |

### 属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `seats` | `RideableSeat[]` | `[]` | 座位数组 |
| `collisionBox` | `{ width: number, height: number }` | `{ width: 1, height: 1 }` | 碰撞箱尺寸 |
| `riderControlled` | `boolean` | `true` | 是否由骑手控制移动 |
| `autoStep` | `number` | `1.1` | 自动跨步高度 |

### 方法

#### `addSeat(seat)`

添加一个座位。

| 参数 | 类型 | 说明 |
|------|------|------|
| `seat` | `RideableSeat` | 座位配置对象 |

返回 `this` 以支持链式调用。

```javascript
import { BaseVehicle } from "@sapdon/core";

const vehicle = new BaseVehicle("sapdon:ruby_jeep");

vehicle.addSeat({
  position: [0, 0, 0],
  lock_rider_rotation: 0
});
```

#### `removeSeat(index)`

移除指定索引的座位。

| 参数 | 类型 | 说明 |
|------|------|------|
| `index` | `number` | 座位索引 |

返回 `this` 以支持链式调用。

```javascript
vehicle.removeSeat(0);
```

#### `getSeat(index)`

获取指定索引的座位配置。

| 参数 | 类型 | 说明 |
|------|------|------|
| `index` | `number` | 座位索引 |

返回 `RideableSeat | undefined`。

```javascript
const seat = vehicle.getSeat(0);
```

### 完整示例

```javascript
import { BaseVehicle } from "@sapdon/core";

const vehicle = new BaseVehicle("sapdon:ruby_jeep");

vehicle.collisionBox = { width: 1.5, height: 1.2 };
vehicle.riderControlled = true;
vehicle.autoStep = 1.1;

vehicle.addSeat({
  position: [0, 0.5, 0],
  lock_rider_rotation: 0
});

// 第二个座位（乘客）
vehicle.addSeat({
  position: [0, 0.5, -0.8],
  lock_rider_rotation: 0
});
```
