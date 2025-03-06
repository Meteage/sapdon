# 方块工厂类 (BlockAPI) API 文档

## 类描述

`BlockAPI` 是一个工厂函数集合，用于创建和管理多种类型的游戏方块，并自动注册到游戏系统中。支持基础方块、旋转方块、几何方块、矿物方块和作物方块的创建。

---

## BlockAPI 工厂函数

### `createBasicBlock(identifier, category, textures_arr, options = {})`

创建基础方块。

#### 参数

- `identifier` (string): 方块的唯一标识符，格式为"命名空间:名称" (例："my_mod:stone_block")。
- `category` (string): 在创造模式物品栏的分类，可选值："construction", "nature", "equipment", "none"。
- `textures_arr` (string[]): 6面纹理数组，顺序为 [上, 下, 东, 西, 南, 北]
- `options` (Object): 可选参数，默认为空。
    - `group` (string): 分组名称，默认 "construction"。
    - `hide_in_command` (boolean): 是否在命令中隐藏，默认 `false`。

#### 返回值

- `BasicBlock`: 基础方块实例

---

### `createBlock(identifier, category, variantDatas, options = {})`

创建含变体状态的标准方块。

#### 参数

- `identifier` (string): 方块的唯一标识符。
- `category` (string): 在创造模式物品栏的分类，可选值："construction", "nature", "equipment", "none"
- `variantDatas` (Array): 变体数据数组，每个元素包含：
    - `stateTag` (string): 状态标签 (例："color=red")
    - `textures` (string[]): 对应状态的6面纹理
- `options` (Object): 可选参数，默认为空。
    - `options.group` (string): 分组，默认为 "construction"。
    - `options.hide_in_command` (boolean): 是否在命令中隐藏，默认为 false。
    - `ambient_occlusion` (boolean): 环境光遮蔽，默认 `false`
    - `face_dimming` (boolean): 面亮度衰减，默认 `false`
    - `render_method` (string): 渲染模式，可选 "opaque"/"blend"/"alpha_test"

#### 返回值

- `Block`: 标准方块实例

---

### `createRotatableBlock(identifier, category, textures_arr, options = {})`

创建支持多方向旋转的方块。

#### 参数

- `identifier` (string): 矿物方块的唯一标识符。
- `category` (string): 在创造模式物品栏的分类，可选值："construction", "nature", "equipment", "none"。
- `textures_arr` (string[]): 6面纹理数组，顺序为 [上, 下, 东, 西, 南, 北]。
- `options` (Object): 可选参数，默认为空。
    - `options.group` (string): 分组，默认为 "construction"。
    - `options.hide_in_command` (boolean): 是否在命令中隐藏，默认为 false。
    - `options.rotationType` (string): 旋转类型，默认为 "cardinal"。
    - `options.yRotationOffset` (number): 初始旋转偏移量，默认为 180。

#### 返回值

- `RotatableBlock`: 旋转方块实例

---

### `createGeometryBlock(identifier, category, geometry, material_instances, options = {})`

创建自定义几何模型方块。

#### 参数

- `identifier` (string): 方块的唯一标识符。
- `category` (string): 在创造模式物品栏的分类，可选值："construction", "nature", "equipment", "none"。
- `geometry` (string): 几何模型标识符 (例："geometry.custom_model")。
- `material_instances` (Object): 材质实例配置。
    - 撰写文档者不晓得具体内容应该填啥
- `options` (Object): 可选参数，默认为空。
    - `options.group` (string): 分组，默认为 "construction"。
    - `options.hide_in_command` (boolean): 是否在命令中隐藏，默认为 false。

#### 返回值

- `GeometryBlock`: 自定义几何模型方块实例

---

### `createOreBlock(identifier, category, textures_arr, options = {})`

创建矿物生成方块。

#### 参数

- `identifier` (string): 矿物方块的唯一标识符。
- `category` (string): 在创造模式物品栏的分类，可选值："construction", "nature", "equipment", "none"。
- `textures_arr` (string[]): 6面纹理数组，顺序为 [上, 下, 东, 西, 南, 北]。
- `options` (Object): 可选参数，默认为空。
    - `options.group` (string): 分组，默认为 "construction"。
    - `options.hide_in_command` (boolean): 是否在命令中隐藏，默认为 false。

#### 返回值

- `OreBlock`: 矿物方块实例

---

### `createCropBlock(identifier, category, variantDatas, options = {})`

创建农作物方块。

#### 参数

- `identifier` (string): 作物方块的唯一标识符。
- `category` (string): 在创造模式物品栏的分类，可选值："construction", "nature", "equipment", "none"。
- `variantDatas` (Array): 变体数据数组，每个元素包含：
  - `stateTag` (string): 状态标签 (例："color=red")
  - `textures` (string[]): 对应状态的6面纹理
- `options` (Object): 可选参数，默认为空。
    - `options.group` (string): 分组，默认为 "construction"。
    - `options.hide_in_command` (boolean): 是否在命令中隐藏，默认为 false。
    - `options.ambient_occlusion` (boolean): 是否应用环境光遮蔽，默认为 false。
    - `options.face_dimming` (boolean): 是否根据面的方向进行亮度调整，默认为 false。
    - `options.render_method` (string): 渲染方法，默认为 "alpha_test"。

#### 返回值

- `CropBlock`: 作物方块实例

---

## 版本兼容性

| 功能 | 最低版本 | 依赖组件 |
|------|---------|---------|
| 几何方块 | 1.16.20 | minecraft:geometry |
| 矿脉生成 | 1.18.30 | ore_feature |
| 动态碰撞箱 | 1.17.10 | permutation |