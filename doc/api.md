# 物品类 (Item) 和 ItemAPI 工厂函数 API 文档

## 类描述
`Item` 类用于创建一个物品对象，该对象可以包含多种组件，并且可以转换为 JSON 格式，用于在特定的游戏中定义物品。`ItemAPI` 是一个工厂函数集合，用于简化物品的创建过程，支持创建普通物品、食物、可附着物品以及胸甲护甲等。

## Item 类

### 构造函数
### `constructor(identifier, category, texture, options = {})`
创建一个新的物品实例。

#### 参数
- `identifier` (string): 物品的唯一标识符。
- `category` (string): 物品所属的菜单栏分类，可选值包括："construction", "nature", "equipment", "items", 和 "none"。
- `texture` (string): 物品的纹理。
- `options` (Object): 可选参数配置对象。默认为空对象。
  - `group` (string): 分组名称。
  - `hide_in_command` (boolean): 是否在命令中隐藏物品。默认为 `false`。
  - `max_stack_size` (number): 物品的最大堆叠数量。默认为 `64`。

#### 抛出异常
- 当 `identifier`, `category`, 或 `texture` 参数缺失或不是字符串时，抛出 `Error`。

### 方法

### `addComponent(componentMap)`
向物品添加新的组件。

##### 参数
- `componentMap` (Map): 组件的 Map 对象。

##### 抛出异常
- 当 `componentMap` 参数缺失或不是 Map 实例时，抛出 `Error`。

### `removeComponent(key)`
从物品中移除一个组件。

##### 参数
- `key` (string): 组件的名称。

##### 抛出异常
- 当 `key` 参数缺失或不是字符串时，抛出 `Error`。

### `toJson()`
将物品转换为 JSON 格式，以便在游戏中定义物品。

##### 返回值
- `Object`: JSON 格式的物品对象。

##### 内部实现
根据物品的属性和组件，创建一个 `AddonItem` 实例，并返回其 JSON 表示。这个 JSON 对象可以被游戏引擎解析，用于定义游戏中的物品。

---

## ItemAPI 工厂函数

`ItemAPI` 是一个用于创建和管理游戏物品的工厂函数集合，提供了多种方法来创建不同类型的物品。

### `createItem(identifier, category, texture, options = {})`
创建一个普通物品。

#### 参数
- `identifier` (string): 物品的唯一标识符。
- `category` (string): 物品在创造菜单中的分类，可选值包括："construction", "nature", "equipment", "items"。
- `texture` (string): 物品的纹理。
- `options` (Object): 额外选项配置对象。默认为空对象。
  - `group` (string): 物品的分组。
  - `hide_in_command` (boolean): 是否在命令中隐藏物品。默认为 `false`。

#### 抛出异常
- 当 `identifier`, `category`, 或 `texture` 参数缺失或为空时，抛出 `Error`。

#### 返回值
- `Item`: 创建的普通物品对象。

### `createFood(identifier, category, texture, options = {})`
创建一个食物物品。

#### 参数
- `identifier` (string): 食物的唯一标识符。
- `category` (string): 食物在创造菜单中的分类。
- `texture` (string): 食物的纹理。
- `options` (Object): 额外选项配置对象。默认为空对象。
  - `group` (string): 食物的分组。
  - `hide_in_command` (boolean): 是否在命令中隐藏食物。默认为 `false`。
  - `animation` (string): 食用时的动画。默认为 `"eat"`。
  - `canAlwaysEat` (boolean): 是否总是可以食用。默认为 `false`。
  - `nutrition` (number): 食物的营养价值。默认为 `0`。
  - `saturationModifier` (number): 饱和度修正值。默认为 `1`。

#### 抛出异常
- 当 `identifier`, `category`, 或 `texture` 参数缺失或为空时，抛出 `Error`。

#### 返回值
- `Food`: 创建的食物物品对象。

### `createAttachable(identifier, texture, material, options = {})`
创建一个可附着物品。

#### 参数
- `identifier` (string): 可附着物品的唯一标识符。
- `texture` (string): 可附着物品的纹理。
- `material` (string): 可附着物品的材质。
- `options` (Object): 额外选项配置对象。默认为空对象。

#### 抛出异常
- 当 `identifier`, `texture`, 或 `material` 参数缺失或为空时，抛出 `Error`。

#### 返回值
- `Attachable`: 创建的可附着物品对象。

### `createChestplateArmor(identifier, item_texture, texture_path, options = {})`
创建一个胸甲护甲物品。

#### 参数
- `identifier` (string): 胸甲的唯一标识符。
- `item_texture` (string): 胸甲的纹理。
- `texture_path` (string): 胸甲的纹理路径。
- `options` (Object): 额外选项配置对象。默认为空对象。

#### 返回值
- `Chestplate`: 创建的胸甲护甲物品对象。

---

## 内部实现
- `ItemAPI` 使用 `GRegistry` 来注册物品和可附着物品的行为和资源路径。
- 每个方法在创建物品后，会调用 `registerItem` 函数将物品注册到全局注册表中，以便游戏引擎能够识别和加载这些物品。
