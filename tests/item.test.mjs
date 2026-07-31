import { test } from 'node:test'
import assert from 'node:assert/strict'

import { Item, Food, Armor, ArmorType, Attachable, ItemComponent, ItemCategory } from '../dist/core/item/index.js'
import { ItemAPI } from '../dist/core/factory/itemFactory.js'

const itemGolden = {
  format_version: '1.21.40',
  'minecraft:item': {
    description: {
      identifier: 'test:item',
      menu_category: {
        category: 'items',
        is_hidden_in_commands: false,
      },
    },
    components: {
      'minecraft:icon': 'tex',
      'minecraft:max_stack_size': 64,
    },
  },
}

test('Item 序列化输出 golden', () => {
  const item = new Item('test:item', ItemCategory.Items, 'tex')
  assert.deepEqual(JSON.parse(JSON.stringify(item.toObject())), itemGolden)
})

test('Item 参数校验', () => {
  assert.throws(() => new Item('', ItemCategory.Items, 'tex'), /identifier/)
  assert.throws(() => new Item('test:item', '', 'tex'), /category/)
  assert.throws(() => new Item('test:item', ItemCategory.Items, ''), /texture/)
  assert.throws(() => new Item('test:item', ItemCategory.Items, 'tex').addComponent({}), /componentMap/)
  assert.throws(() => new Item('test:item', ItemCategory.Items, 'tex').removeComponent(''), /key/)
})

test('Item 未知分类抛错', () => {
  assert.throws(() => new Item('test:item', 'invalid_category', 'tex'), /未知的物品分类/)
})

test('Item 选项别名与覆盖', () => {
  const snake = new Item('a:a', ItemCategory.Items, 'tex', { hide_in_command: true, max_stack_size: 1, format_version: '1.21.90' })
  assert.equal(snake.hide_in_command, true)
  assert.equal(snake.format_version, '1.21.90')
  assert.deepEqual(snake.toObject()['minecraft:item'].components['minecraft:max_stack_size'], 1)

  const camel = new Item('b:b', ItemCategory.Items, 'tex', { hideInCommand: true, maxStackSize: 16, formatVersion: '1.20.0' })
  assert.equal(camel.hide_in_command, true)
  assert.equal(camel.format_version, '1.20.0')
  assert.deepEqual(camel.toObject()['minecraft:item'].components['minecraft:max_stack_size'], 16)
})

test('Item icon 覆盖与跳过', () => {
  const custom = new Item('c:c', ItemCategory.Items, 'tex', { icon: 'other_tex' })
  assert.deepEqual(custom.toObject()['minecraft:item'].components['minecraft:icon'], 'other_tex')

  const noIcon = new Item('d:d', ItemCategory.Items, 'tex', { icon: null })
  assert.equal('minecraft:icon' in noIcon.toObject()['minecraft:item'].components, false)
})

test('Item addComponent/removeComponent 链式调用', () => {
  const item = new Item('e:e', ItemCategory.Items, 'tex')
    .addComponent(ItemComponent.setFuel(1))
    .removeComponent('minecraft:icon')
  assert.equal(item instanceof Item, true)
  assert.equal(item.components.has('minecraft:fuel'), true)
  assert.equal(item.components.has('minecraft:icon'), false)
})

test('ItemComponent.combineComponents 合并覆盖', () => {
  const merged = ItemComponent.combineComponents(
    ItemComponent.setMaxStackSize(16),
    ItemComponent.setMaxStackSize(32),
    ItemComponent.setFuel(2),
  )
  assert.deepEqual(merged.get('minecraft:max_stack_size'), 32)
  assert.deepEqual(merged.get('minecraft:fuel'), { duration: 2 })
})

test('ItemComponent 参数校验', () => {
  assert.throws(() => ItemComponent.setFuel(0.01), /燃料持续时间/)
  assert.throws(() => ItemComponent.setMaxStackSize(1.5), /正整数/)
  assert.throws(() => ItemComponent.setMaxStackSize(0), /正整数/)
  assert.throws(() => ItemComponent.setGlint('yes'), /布尔/)
  assert.throws(() => ItemComponent.setHandEquipped(1), /布尔/)
  assert.throws(() => ItemComponent.setDisplayName(123), /字符串/)
  assert.throws(() => ItemComponent.setUseAnimation(null), /字符串/)
})

test('setFoodComponent 选项对象签名', () => {
  const full = ItemComponent.setFoodComponent({
    nutrition: 6,
    saturationModifier: 0.8,
    canAlwaysEat: true,
    usingConvertsTo: 'minecraft:bowl',
  })
  assert.deepEqual(full.get('minecraft:food'), {
    can_always_eat: true,
    nutrition: 6,
    saturation_modifier: 0.8,
    using_converts_to: 'minecraft:bowl',
  })

  const minimal = ItemComponent.setFoodComponent()
  const food = minimal.get('minecraft:food')
  assert.equal(food.can_always_eat, false)
  assert.equal(food.nutrition, 0)
  assert.equal(food.saturation_modifier, 0.6)
  assert.equal('using_converts_to' in food, false)
})

test('Food 序列化输出', () => {
  const food = new Food('test:food', ItemCategory.Items, 'food_tex', { nutrition: 4, saturationModifier: 0.6 })
  const json = food.toObject()
  const components = json['minecraft:item'].components
  assert.deepEqual(components['minecraft:use_modifiers'], { movement_modifier: 1, use_duration: 1 })
  assert.deepEqual(components['minecraft:food'], {
    can_always_eat: false,
    nutrition: 4,
    saturation_modifier: 0.6,
  })
  assert.deepEqual(components['minecraft:use_animation'], 'eat')
})

test('Food 参数校验', () => {
  assert.throws(() => new Food('f:f', ItemCategory.Items, 'tex', { nutrition: -1 }), /非负数/)
  assert.throws(() => new Food('f:f', ItemCategory.Items, 'tex', { saturationModifier: 0 }), /正数/)
})

const ARMOR_EXPECTATIONS = {
  [ArmorType.Chestplate]: { protection: 5, slot: 'slot.armor.chest', geometry: 'geometry.player.armor.chestplate', group: 'minecraft:itemGroup.name.chestplate' },
  [ArmorType.Helmet]: { protection: 3, slot: 'slot.armor.head', geometry: 'geometry.player.armor.helmet', group: 'minecraft:itemGroup.name.helmet' },
  [ArmorType.Boots]: { protection: 4, slot: 'slot.armor.feet', geometry: 'geometry.player.armor.boots', group: 'minecraft:itemGroup.name.boots' },
  [ArmorType.Leggings]: { protection: 6, slot: 'slot.armor.legs', geometry: 'geometry.player.armor.leggings', group: 'minecraft:itemGroup.name.leggings' },
}

test('Armor 各类型规格正确', () => {
  for (const [type, spec] of Object.entries(ARMOR_EXPECTATIONS)) {
    const armor = new Armor(`test:${type}`, 'tex', 'textures/models/armor/diamond', type)
    const { behavior, resource } = armor.toObject()

    assert.equal(behavior['minecraft:item'].description.menu_category.category, ItemCategory.Equipment)
    assert.equal(behavior['minecraft:item'].description.menu_category.group, spec.group)
    assert.deepEqual(behavior['minecraft:item'].components['minecraft:wearable'], { protection: spec.protection, slot: spec.slot })
    assert.equal(resource['minecraft:attachable'].description.geometry.default, spec.geometry)
    assert.equal(resource['minecraft:attachable'].description.render_controllers[0], 'controller.render.armor')
  }
})

test('Armor 不污染调用方 options', () => {
  const options = { hide_in_command: true }
  new Armor('test:a', 'tex', 'textures/models/armor/diamond', ArmorType.Helmet, options)
  assert.deepEqual(Object.keys(options), ['hide_in_command'])
  assert.equal(options.group, undefined)
})

test('Armor 自定义显示名称与几何模型', () => {
  const armor = new Armor('test:b', 'tex', 'textures/models/armor/diamond', ArmorType.Helmet, { displayName: '龙鳞头盔' })
    .setAttachableGeometry('custom', 'geometry.custom.helmet')
  const { behavior, resource } = armor.toObject()
  assert.equal(behavior['minecraft:item'].components['minecraft:display_name'].value, '龙鳞头盔')
  assert.equal(resource['minecraft:attachable'].description.geometry.custom, 'geometry.custom.helmet')
})

test('Armor 未知类型抛错', () => {
  assert.throws(() => new Armor('test:c', 'tex', 'tex', 'unknown_type'), /未知的盔甲类型/)
})

test('Attachable 序列化输出', () => {
  const attachable = new Attachable('test:att')
    .addTexture('default', 'textures/items/tex')
    .addMaterial('default', 'armor')
    .addRenderController('controller.render.armor')
  const json = attachable.toObject()
  assert.equal(json['minecraft:attachable'].description.identifier, 'test:att')
  assert.deepEqual(json['minecraft:attachable'].description.textures.default, 'textures/items/tex')
  assert.deepEqual(json['minecraft:attachable'].description.materials.default, 'armor')
})

test('ItemAPI.createItem 返回 Item 并可序列化', () => {
  const item = ItemAPI.createItem('test:api', ItemCategory.Items, 'tex')
  assert.equal(item instanceof Item, true)
  assert.equal(item.toObject()['minecraft:item'].description.identifier, 'test:api')
})

test('ItemAPI.createLargeItem 生成大型物品', () => {
  const item = ItemAPI.createLargeItem('test:large', ItemCategory.Items, 'tex')
  assert.equal(item instanceof Item, true)
  assert.equal(item.toObject()['minecraft:item'].components['minecraft:icon'], 'tex')
})

test('ItemAPI 创建各盔甲', () => {
  const helmet = ItemAPI.createHelmetArmor('test:h', 'h_tex', 'textures/models/armor/diamond')
  assert.equal(helmet instanceof Armor, true)
  assert.equal(helmet.type, ArmorType.Helmet)
  const boots = ItemAPI.createBootArmor('test:b', 'b_tex', 'textures/models/armor/diamond')
  assert.equal(boots.type, ArmorType.Boots)
})

test('ItemAPI.createFood 返回 Food', () => {
  const food = ItemAPI.createFood('test:f', ItemCategory.Items, 'f_tex', { nutrition: 8 })
  assert.equal(food instanceof Food, true)
  assert.deepEqual(food.toObject()['minecraft:item'].components['minecraft:food'].nutrition, 8)
})
