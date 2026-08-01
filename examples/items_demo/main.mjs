import { ItemAPI, ItemCategory, ItemComponent, EntityAPI, EntityComponent, TerrainTextureManager, registry, RecipeAPI } from '@sapdon/core'

// 翻书物品的方块贴图注册（翻书条位于 items/flipbook_items/ 下，需登记到方块贴图表）
TerrainTextureManager.registerTexture("amulet_runic", "textures/items/flipbook_items/amulet_runic")

// ============ 1. 普通物品：一把下界合金剑 ============
ItemAPI.createItem("items_demo:obsidian_sword", ItemCategory.Equipment, "netherite_sword", { maxStackSize: 1 })
    .addComponent(
        ItemComponent.combineComponents(
            ItemComponent.setDamage(7),
            ItemComponent.setHandEquipped(true),
            ItemComponent.setDurability(1561, 20, 60),
            ItemComponent.setEnchantable("sword", 10),
            ItemComponent.setFireResistant(true),
            ItemComponent.setRarity("rare")
        )
    )

// ============ 2. 燃料物品 ============
ItemAPI.createItem("items_demo:coal_cube", ItemCategory.Items, "coal", { maxStackSize: 16 })
    .addComponent(ItemComponent.setFuel(3200))

// ============ 3. 可染色物品 ============
ItemAPI.createItem("items_demo:dyeable_cloth", ItemCategory.Items, "leather")
    .addComponent(
        ItemComponent.combineComponents(
            ItemComponent.setDyeable("#FFFFFF"),
            ItemComponent.setAllowOffHand(true)
        )
    )

// ============ 4. 容器物品（Bundle 风格，storage_item 要求最大堆叠为 1） ============
ItemAPI.createItem("items_demo:storage_sack", ItemCategory.Items, "bundle", { maxStackSize: 1 })
    .addComponent(
        ItemComponent.combineComponents(
            ItemComponent.setStorageItem({ maxSlots: 9, allowNestedStorageItems: false }),
            ItemComponent.setStorageWeightLimit(64),
            ItemComponent.setBundleInteraction(3)
        )
    )

// ============ 5. 镐：挖掘速度数据表 + 耐久传感器 ============
ItemAPI.createItem("items_demo:diamond_pickaxe", ItemCategory.Equipment, "diamond_pickaxe", { maxStackSize: 1 })
    .addComponent(
        ItemComponent.combineComponents(
            ItemComponent.setDigger({
                destroySpeeds: [
                    { block: "minecraft:stone", speed: 8 },
                    { block: "minecraft:obsidian", speed: 6 },
                    { block: { name: "minecraft:log" }, speed: 6 },
                ],
                useEfficiency: true,
            }),
            ItemComponent.setDurability(1000, 10, 40),
            ItemComponent.setDurabilitySensor({
                durabilityThresholds: [
                    { durability: 250, particleType: "smoke" },
                    { durability: 100, soundEvent: "break" },
                ],
            }),
            ItemComponent.setTags(["minecraft:is_pickaxe"])
        )
    )

// ============ 6. 投掷物 ============
ItemAPI.createItem("items_demo:throwable_snowball", ItemCategory.Items, "snowball", { maxStackSize: 16 })
    .addComponent(
        ItemComponent.combineComponents(
            ItemComponent.setThrowable(true, 2),
            ItemComponent.setProjectile(1, "minecraft:snowball")
        )
    )

// ============ 7. 大型 3D 物品（Item + Attachable） ============
ItemAPI.createLargeItem("items_demo:big_crystal", ItemCategory.Items, "amethyst_shard")

// ============ 8. 食物 ============
ItemAPI.createFood("items_demo:magic_apple", ItemCategory.Nature, "apple_golden", {
    nutrition: 6,
    saturationModifier: 1.2,
    canAlwaysEat: true,
    useDuration: 32,
    movement: 0.5,
})

// ============ 9. 盔甲（Wiki Custom Armor 规范：Item + Attachable） ============
// 每件包含：enchantable、durability、repairable、tags（is_armor/trimmable_armors）
ItemAPI.createHelmetArmor("items_demo:ruby_helmet", "diamond_helmet", "textures/models/armor/diamond_1", { displayName: "Ruby Helmet" })
ItemAPI.createChestplateArmor("items_demo:ruby_chestplate", "diamond_chestplate", "textures/models/armor/diamond_1", { displayName: "Ruby Chestplate" })
ItemAPI.createLeggingsArmor("items_demo:ruby_leggings", "diamond_leggings", "textures/models/armor/diamond_2", { displayName: "Ruby Leggings" })
ItemAPI.createBootArmor("items_demo:ruby_boots", "diamond_boots", "textures/models/armor/diamond_1", { displayName: "Ruby Boots" })

// ============ 10. 翻书物品（动态纹理方块） ============
ItemAPI.createFlipbookItem("items_demo:flipbook_cube", ItemCategory.Items, "amulet_runic", { ticks_per_frame: 6, texture_path: "textures/items/flipbook_items/amulet_runic" })

// ============ 11. 可附着物（手持模型） ============
ItemAPI.createAttachable("items_demo:masterball_attach", "textures/items/diamond", "entity_alphatest")
    .addGeometry("default", "geometry.large_item")

// ============ 12. 投掷物品 + 投射物实体（Wiki Throwable Items 教程） ============
ItemAPI.createItem("items_demo:throwable_item", ItemCategory.Items, "ender_pearl", { maxStackSize: 16 })
    .addComponent(
        ItemComponent.combineComponents(
            ItemComponent.setThrowable(true),
            ItemComponent.setProjectile(undefined, "items_demo:throwable_item_entity")
        )
    )

// 投射物实体（基于原版雪球 runtime_identifier，命中时掉落经验并造成 16 点伤害）
const { behavior } = EntityAPI.createProjectile("items_demo:throwable_item_entity", "textures/items/ender_pearl", {
    is_spawnable: false,
    is_summonable: true,
})
behavior.addComponent(
    EntityComponent.setProjectile({
        onHit: {
            grant_xp: { minXP: 3, maxXP: 5 },
            impact_damage: { damage: 16 },
            remove_on_hit: {},
        },
        power: 0.7,
        gravity: 0.03,
        angleOffset: -20,
        hitSound: "glass",
    })
)

// ============ 13. 自定义武器（Wiki Custom Weapons 规范） ============
ItemAPI.createItem("items_demo:my_sword", ItemCategory.Equipment, "my_sword", {
    maxStackSize: 1,
    group: "minecraft:itemGroup.name.sword",
})
    .addComponent(
        ItemComponent.combineComponents(
            ItemComponent.setDisplayName("My Custom Sword"),
            ItemComponent.setHandEquipped(true),
            ItemComponent.setDurability(600),
            ItemComponent.setDamage(10),
            ItemComponent.setCanDestroyInCreative(false),
            ItemComponent.setEnchantable("sword", 10),
            ItemComponent.setRepairable([
                {
                    items: ["minecraft:stick"],
                    repairAmount: "context.other->q.remaining_durability + 0.05 * context.other->q.max_durability",
                },
            ]),
            ItemComponent.setDigger({
                destroySpeeds: [
                    { block: "minecraft:web", speed: 15 },
                    { block: "minecraft:bamboo", speed: 10 },
                ],
                useEfficiency: true,
            })
        )
    )

// 合成配方（末影珍珠 + 末影之眼 + 木棍）
RecipeAPI.registerSimpleShaped(
    "items_demo:my_sword",
    { item: "items_demo:my_sword" },
    ["e", "E", "#"],
    {
        "#": { item: "minecraft:stick" },
        "E": { item: "minecraft:ender_eye" },
        "e": { item: "minecraft:ender_pearl" },
    }
)

// ============ 14. 物品目录（创造菜单分组） ============
ItemAPI.createItemCatalog("1.26.30")
    .addGroup("equipment", ["items_demo:obsidian_sword", "items_demo:diamond_pickaxe"], {
        icon: "items_demo:obsidian_sword",
        name: "items_demo:itemGroup.name.equipment",
    })
    .addGroup("items", ["items_demo:coal_cube", "items_demo:magic_apple", "items_demo:big_crystal"])
    .addItem("nature", "items_demo:dyeable_cloth")

// 提交所有注册
registry.submit()
