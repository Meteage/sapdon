import { test } from 'node:test'
import assert from 'node:assert/strict'

import { Item, Food, Armor, ArmorType, Attachable, ItemComponent, ItemCategory, ItemCatalog } from '../dist/core/item/index.js'
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
  assert.deepEqual(components['minecraft:tags'], { tags: ['minecraft:is_food'] })
})

test('Food 自定义标签（肉/鱼/熟食）', () => {
  const food = new Food('test:food', ItemCategory.Items, 'food_tex', { isMeat: true, isCooked: true })
  const json = food.toObject()
  assert.deepEqual(
    json['minecraft:item'].components['minecraft:tags'],
    { tags: ['minecraft:is_food', 'minecraft:is_meat', 'minecraft:is_cooked'] }
  )
})

test('Food 参数校验', () => {
  assert.throws(() => new Food('f:f', ItemCategory.Items, 'tex', { nutrition: -1 }), /非负数/)
  assert.throws(() => new Food('f:f', ItemCategory.Items, 'tex', { saturationModifier: 0 }), /正数/)
})

const ARMOR_EXPECTATIONS = {
  [ArmorType.Chestplate]: { protection: 8, slot: 'slot.armor.chest', enchantSlot: 'armor_torso', maxDurability: 528, geometry: 'geometry.player.armor.chestplate', group: 'minecraft:itemGroup.name.chestplate' },
  [ArmorType.Helmet]: { protection: 3, slot: 'slot.armor.head', enchantSlot: 'armor_head', maxDurability: 363, geometry: 'geometry.player.armor.helmet', group: 'minecraft:itemGroup.name.helmet' },
  [ArmorType.Boots]: { protection: 3, slot: 'slot.armor.feet', enchantSlot: 'armor_feet', maxDurability: 429, geometry: 'geometry.player.armor.boots', group: 'minecraft:itemGroup.name.boots' },
  [ArmorType.Leggings]: { protection: 6, slot: 'slot.armor.legs', enchantSlot: 'armor_legs', maxDurability: 495, geometry: 'geometry.player.armor.leggings', group: 'minecraft:itemGroup.name.leggings' },
}

test('Armor 各类型规格正确（Wiki Custom Armor 规范）', () => {
  for (const [type, spec] of Object.entries(ARMOR_EXPECTATIONS)) {
    const armor = new Armor(`test:${type}`, 'tex', 'textures/models/armor/diamond', type)
    const { behavior, resource } = armor.toObject()
    const components = behavior['minecraft:item'].components

    assert.equal(behavior['minecraft:item'].description.menu_category.category, ItemCategory.Equipment)
    assert.equal(behavior['minecraft:item'].description.menu_category.group, spec.group)
    assert.deepEqual(components['minecraft:wearable'], { protection: spec.protection, slot: spec.slot })
    assert.deepEqual(components['minecraft:enchantable'], { slot: spec.enchantSlot, value: 10 })
    assert.deepEqual(components['minecraft:durability'], { damage_chance: { min: 60, max: 100 }, max_durability: spec.maxDurability })
    assert.deepEqual(components['minecraft:repairable'].repair_items, [{ items: ['minecraft:stick'], repair_amount: 'q.max_durability * 0.25' }])
    assert.deepEqual(components['minecraft:tags'], { tags: ['minecraft:is_armor', 'minecraft:trimmable_armors'] })
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

test('ItemComponent.setBlockPlacer 选项对象签名', () => {
  const component = ItemComponent.setBlockPlacer('wiki:custom_block', {
    replaceBlockItem: true,
    alignedPlacement: true,
    useOn: ['minecraft:dirt', { name: 'wiki:other', states: { 'wiki:state': 5 } }, { tags: "q.any_tag('wiki:tag')" }],
  })
  assert.deepEqual(component.get('minecraft:block_placer'), {
    block: 'wiki:custom_block',
    replace_block_item: true,
    aligned_placement: true,
    use_on: ['minecraft:dirt', { name: 'wiki:other', states: { 'wiki:state': 5 } }, { tags: "q.any_tag('wiki:tag')" }],
  })
  assert.throws(() => ItemComponent.setBlockPlacer(''), /block/)
})

test('ItemComponent.setIcon 对象格式', () => {
  const component = ItemComponent.setIcon({ default: 'wiki:item', dyed: 'wiki:item_dyed' })
  assert.deepEqual(component.get('minecraft:icon'), { textures: { default: 'wiki:item', dyed: 'wiki:item_dyed' } })
  assert.throws(() => ItemComponent.setIcon({ dyed: 'x' }), /default/)
})

test('ItemComponent.setUseModifiers 选项对象签名', () => {
  const component = ItemComponent.setUseModifiers({
    movementModifier: 0.5,
    useDuration: 1,
    emitVibrations: true,
    startSound: 'item.bow.pull',
    startUsing: 'always',
  })
  assert.deepEqual(component.get('minecraft:use_modifiers'), {
    movement_modifier: 0.5,
    use_duration: 1,
    emit_vibrations: true,
    start_sound: 'item.bow.pull',
    start_using: 'always',
  })
  assert.throws(() => ItemComponent.setUseModifiers({ startUsing: 'bogus' }), /startUsing/)
})

test('ItemComponent.setWearable hidesPlayerLocation', () => {
  const component = ItemComponent.setWearable(5, 'slot.armor.chest', true)
  assert.deepEqual(component.get('minecraft:wearable'), {
    protection: 5,
    slot: 'slot.armor.chest',
    hides_player_location: true,
  })
})

test('ItemComponent 新组件输出', () => {
  assert.deepEqual(ItemComponent.setAllowOffHand(true).get('minecraft:allow_off_hand'), true)
  assert.deepEqual(ItemComponent.setBundleInteraction(12).get('minecraft:bundle_interaction'), { num_viewable_slots: 12 })
  assert.deepEqual(ItemComponent.setCanDestroyInCreative(false).get('minecraft:can_destroy_in_creative'), false)
  assert.deepEqual(ItemComponent.setCompostable(50).get('minecraft:compostable'), { composting_chance: 50 })
  assert.deepEqual(ItemComponent.setDamage(10).get('minecraft:damage'), 10)
  assert.deepEqual(ItemComponent.setDamageAbsorption(['all']).get('minecraft:damage_absorption'), { absorbable_causes: ['all'] })
  assert.deepEqual(ItemComponent.setDyeable('#ffffff').get('minecraft:dyeable'), { default_color: '#ffffff' })
  assert.deepEqual(ItemComponent.setEnchantable('sword', 10).get('minecraft:enchantable'), { slot: 'sword', value: 10 })
  assert.deepEqual(ItemComponent.setEntityPlacer('minecraft:spider', { useOn: ['minecraft:dirt'] }).get('minecraft:entity_placer'), {
    entity: 'minecraft:spider',
    use_on: ['minecraft:dirt'],
  })
  assert.deepEqual(ItemComponent.setFireResistant(true).get('minecraft:fire_resistant'), { value: true })
  assert.deepEqual(ItemComponent.setHoverTextColor('minecoin_gold').get('minecraft:hover_text_color'), 'minecoin_gold')
  assert.deepEqual(ItemComponent.setLiquidClipped(true).get('minecraft:liquid_clipped'), true)
  assert.deepEqual(ItemComponent.setRarity('rare').get('minecraft:rarity'), 'rare')
  assert.deepEqual(ItemComponent.setShouldDespawn(false).get('minecraft:should_despawn'), false)
  assert.deepEqual(ItemComponent.setStackedByData(true).get('minecraft:stacked_by_data'), true)
  assert.deepEqual(ItemComponent.setStorageWeightLimit(64).get('minecraft:storage_weight_limit'), { max_weight_limit: 64 })
  assert.deepEqual(ItemComponent.setStorageWeightModifier(4).get('minecraft:storage_weight_modifier'), { weight_in_storage_item: 4 })
  assert.deepEqual(ItemComponent.setSwingDuration(1).get('minecraft:swing_duration'), { value: 1 })
  assert.deepEqual(ItemComponent.setTags(['wiki:tag']).get('minecraft:tags'), { tags: ['wiki:tag'] })
})

test('ItemComponent 复杂对象组件输出', () => {
  assert.deepEqual(ItemComponent.setCooldown({ category: 'wiki:cd', duration: 0.2, type: 'use' }).get('minecraft:cooldown'), {
    category: 'wiki:cd',
    duration: 0.2,
    type: 'use',
  })

  assert.deepEqual(ItemComponent.setDigger({
    destroySpeeds: [{ block: 'minecraft:gravel', speed: 0 }, { block: { tags: "q.any_tag('x')" }, speed: 6 }],
    useEfficiency: true,
  }).get('minecraft:digger'), {
    destroy_speeds: [{ block: 'minecraft:gravel', speed: 0 }, { block: { tags: "q.any_tag('x')" }, speed: 6 }],
    use_efficiency: true,
  })

  assert.deepEqual(ItemComponent.setDurabilitySensor({
    durabilityThresholds: [{ durability: 100, particleType: 'minecraft:explosion_manual', soundEvent: 'blast' }, { durability: 5, soundEvent: 'raid.horn' }],
  }).get('minecraft:durability_sensor'), {
    durability_thresholds: [
      { durability: 100, particle_type: 'minecraft:explosion_manual', sound_event: 'blast' },
      { durability: 5, sound_event: 'raid.horn' },
    ],
  })

  assert.deepEqual(ItemComponent.setKineticWeapon({
    delay: 15,
    hitboxMargin: 0.25,
    reach: { min: 2, max: 4.5 },
    creativeReach: { min: 2, max: 7.5 },
    damageMultiplier: 0.7,
    damageConditions: { max_duration: 300 },
    knockbackConditions: { min_speed: 5.1 },
  }).get('minecraft:kinetic_weapon'), {
    delay: 15,
    hitbox_margin: 0.25,
    reach: { min: 2, max: 4.5 },
    creative_reach: { min: 2, max: 7.5 },
    damage_multiplier: 0.7,
    damage_conditions: { max_duration: 300 },
    knockback_conditions: { min_speed: 5.1 },
  })

  assert.deepEqual(ItemComponent.setPiercingWeapon({ reach: { min: 2, max: 4.5 } }).get('minecraft:piercing_weapon'), {
    reach: { min: 2, max: 4.5 },
  })

  assert.deepEqual(ItemComponent.setRecord({ comparatorSignal: 1, duration: 5, soundEvent: 'bucket.empty.powder_snow' }).get('minecraft:record'), {
    comparator_signal: 1,
    duration: 5,
    sound_event: 'bucket.empty.powder_snow',
  })

  assert.deepEqual(ItemComponent.setRepairable([
    { items: ['minecraft:diamond'], repairAmount: 10 },
    { items: [{ tags: "q.any_tag('minecraft:planks')" }], repairAmount: 'q.max_durability * 0.25' },
  ]).get('minecraft:repairable'), {
    repair_items: [
      { items: ['minecraft:diamond'], repair_amount: 10 },
      { items: [{ tags: "q.any_tag('minecraft:planks')" }], repair_amount: 'q.max_durability * 0.25' },
    ],
  })

  assert.deepEqual(ItemComponent.setShooter({
    ammunition: [{ item: 'minecraft:arrow', searchInventory: true, useInCreative: true, useOffhand: true }],
    scalePowerByDrawDuration: true,
  }).get('minecraft:shooter'), {
    ammunition: [{ item: 'minecraft:arrow', search_inventory: true, use_in_creative: true, use_offhand: true }],
    scale_power_by_draw_duration: true,
  })

  assert.deepEqual(ItemComponent.setStorageItem({
    maxSlots: 64,
    allowNestedStorageItems: true,
    bannedItems: ['minecraft:shulker_box'],
  }).get('minecraft:storage_item'), {
    max_slots: 64,
    allow_nested_storage_items: true,
    banned_items: ['minecraft:shulker_box'],
  })

  assert.deepEqual(ItemComponent.setSwingSounds({ attackMiss: 'item.wooden_spear.attack_miss', attackHit: 'item.wooden_spear.attack_hit' }).get('minecraft:swing_sounds'), {
    attack_miss: 'item.wooden_spear.attack_miss',
    attack_hit: 'item.wooden_spear.attack_hit',
  })
})

test('ItemComponent 新组件参数校验', () => {
  assert.throws(() => ItemComponent.setBundleInteraction(0), /1-64/)
  assert.throws(() => ItemComponent.setBundleInteraction(65), /1-64/)
  assert.throws(() => ItemComponent.setCompostable(101), /0-100/)
  assert.throws(() => ItemComponent.setDamage(40000), /0-32767/)
  assert.throws(() => ItemComponent.setRarity('legendary'), /rarity/)
  assert.throws(() => ItemComponent.setRecord({ comparatorSignal: 16, duration: 1, soundEvent: 'x' }), /0-15/)
  assert.throws(() => ItemComponent.setStorageItem({ maxSlots: 0, allowNestedStorageItems: true }), /1-64/)
  assert.throws(() => ItemComponent.setStorageWeightModifier(70), /0-64/)
  assert.throws(() => ItemComponent.setCooldown({ category: '', duration: 1 }), /category/)
  assert.throws(() => ItemComponent.setShooter({ ammunition: [] }), /ammunition/)
})

const CATALOG_GOLDEN = {
  format_version: '1.26.30',
  'minecraft:crafting_items_catalog': {
    categories: [
      {
        category_name: 'nature',
        groups: [
          {
            group_identifier: { icon: 'wiki:silver_ore', name: 'wiki:itemGroup.name.ore' },
            items: ['wiki:silver_ore', 'wiki:steel_ore'],
          },
        ],
      },
      {
        category_name: 'items',
        groups: [
          { items: ['wiki:custom_item'] },
        ],
      },
    ],
  },
}

test('ItemCatalog 序列化输出 golden', () => {
  const catalog = new ItemCatalog()
    .addGroup('nature', ['wiki:silver_ore', 'wiki:steel_ore'], { icon: 'wiki:silver_ore', name: 'wiki:itemGroup.name.ore' })
    .addItem('items', 'wiki:custom_item')
  assert.deepEqual(JSON.parse(JSON.stringify(catalog.toObject())), CATALOG_GOLDEN)
})

test('ItemCatalog 参数校验', () => {
  assert.throws(() => new ItemCatalog('').addGroup('nature', ['a:a']), /format_version/)
  assert.throws(() => new ItemCatalog().addGroup('commands', ['a:a']), /未知的物品目录分类/)
  assert.throws(() => new ItemCatalog().addGroup('nature', []), /非空字符串数组/)
  assert.throws(() => new ItemCatalog().addGroup('nature', ['a:a'], { icon: 'x' }), /icon 与 name/)
  assert.throws(() => new ItemCatalog().addItem('nature', 123), /非空字符串数组/)
})

test('ItemCatalog 链式注册返回自身', () => {
  const catalog = new ItemCatalog().addGroup('equipment', ['a:a']).addItem('nature', 'b:b')
  assert.equal(catalog instanceof ItemCatalog, true)
})
