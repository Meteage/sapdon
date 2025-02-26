import { BlockComponent } from "../../src/core/block/blockComponent.js";
import { ItemComponent } from "../../src/core/item/ItemComponents.js";
import { RecipeTags } from "../../src/core/addon/recipe/data.js";
import { BlockAPI } from "../../src/core/factory/BlockFactory.js";
import { ItemAPI } from "../../src/core/factory/ItemFactory.js";
import { RecipeAPI } from "../../src/core/factory/RecipeFactory.js";
import { EntityAPI } from "../../src/core/factory/EntityFactory.js";
import { BlockWire } from "./lib/wire.js";
import { NativeEntityData } from "../../src/core/entity/data/NativeEntityData.js";
import { EntityComponent } from "../../src/core/entity/componets/EntityComponet.js";
import { FollowMobBehavior } from "../../src/core/entity/behavior/follow_mod.js";
import { Navigation } from "../../src/core/entity/navigation/walk.js";
import { BiomeAPI } from "../../src/core/factory/BiomeFactory.js";
import { BiomeComponent } from "../../src/core/biome/biomeComponent.js";
import { FeatureAPI } from "../../src/core/factory/FeatureFactory.js";
import { BiomeFilter } from "../../src/core/feature_rule/condition/BiomeFilter.js";
import { CoordinateDistribution } from "../../src/core/feature_rule/distribution/CoordinateDistribution.js";
import { Guidebook } from "../../src/core/ui/systems/guidebook.js";
import { Image, Label, Panel } from "../../src/core/index.js";
import { StackPanel } from "../../src/core/ui/elements/StackPanel.js";
import { Text } from "../../src/core/ui/Properties/Text.js";
import { Sprite } from "../../src/core/ui/Properties/Sprite.js";
import { Layout } from "../../src/core/ui/Properties/Layout.js";



ItemAPI.createItem("sapdon:test_item", "items", "masterball").addComponent(
	ItemComponent.combineComponents(
		ItemComponent.setDisplayName("大师球"),
		ItemComponent.setProjectile(1,"sapdon:test_projectile"),
		ItemComponent.setMaxStackSize(16),
		ItemComponent.setThrowable(true, 1.,0,1.,0,false),
	)
)

EntityAPI.createProjectile("sapdon:test_projectile", "textures/items/masterball");

ItemAPI.createFood("sapdon:test_food", "items", "masterball");

BlockAPI.createCropBlock("sapdon:test_crop", "construction", [
	{ stateTag: 1, textures: ["garlic_stage_0"] },
	{ stateTag: 2, textures: ["garlic_stage_1"] },
	{ stateTag: 3, textures: ["garlic_stage_2"] },
	{ stateTag: 4, textures: ["garlic_stage_3"] }]
);


const block = BlockAPI.createBasicBlock("sapdon:test_block", "construction", [
	"compass_block_up",
	"compass_block_down",
	"compass_block_east",
	"compass_block_west",
	"compass_block_south",
	"compass_block_north"
]);

ItemAPI.createChestplateArmor("sapdon:chest", "custom_chestplate", "textures/models/armor/custom_main");

RecipeAPI.registerSimpleFurnace("sapdon:test_furnace","sapdon:test_item", "sapdon:test_food");

const wire = new BlockWire("sapdon:wire", "construction", [{ stateTag: 0, textures: ["wire"] }]);



/*  不可用
BiomeAPI.createBiome("test_biome").addComponent(
	BiomeComponent.combineComponents(
		BiomeComponent.setClimate(0.7,[0.6,0.9],15.0),
		BiomeComponent.setOverworldHeight([0.6, 0.9]),
		BiomeComponent.setSurfaceParameters({
			"sea_floor_depth": 7,
			"sea_floor_material": "minecraft:blue_ice",
			"foundation_material": "minecraft:cobblestone",
			"mid_material": "minecraft:minecraft:concrete",
			"top_material": "minecraft:glass",
			"sea_material": "minecraft:water"
		}),
		BiomeComponent.setOverworldGenerationRules(100,100,100)
	)
)
*/

FeatureAPI.createOreFeature(
	"wiki:titanite_ore_feature",
	8,
	[
		{
			// Replace all stone variants (andesite, granite, and diorite) with titanite ore
			"places_block": "sapdon:test_block",
			"may_replace": ["minecraft:stone"]
		},
		{
			// Replace deepslate with deepslate titanite ore
			"places_block": "sapdon:test_block",
			"may_replace": ["minecraft:deepslate"]
		}
	]
)

const feature_rules = FeatureAPI.createFeatureRules(
	"wiki:overworld_underground_titanite_ore_feature",
	"wiki:titanite_ore_feature",
)

feature_rules.condition.setPlacementPass("underground_pass").setBiomeFilter(
	new BiomeFilter().addLogicGroup("any_of",[
        { test: "has_biome_tag", operator: "==", value: "overworld" },
        { test: "has_biome_tag", operator: "==", value: "overworld_generation" }
    ])
)
feature_rules.distribution.setIterations(10)
.setAxisDistribution("x",new CoordinateDistribution("uniform",[0,16]))
.setAxisDistribution("y",new CoordinateDistribution("uniform",[0,64]))
.setAxisDistribution("z",new CoordinateDistribution("uniform",[0,16]))



BlockAPI.createOreBlock("sapdon:ore_cinnabar","construction",["ore_cinnabar"]);

ItemAPI.createItem("sapdon:test_book","items","masterball")
.addComponent(ItemComponent.setCustomComponents(["test:test_book"]))

//通用指导手册
const guidebook = new Guidebook("sapdon:guidebook","ui/")
	  //章节目录
	  guidebook.addPage("page_index0",new Panel("none"),
	  	new StackPanel("directory")
		//标题
		.addStack(["100",32],
			new Label("tiltle").setText(
				new Text().setText("通用手册").setColor([0,0,0])
			)
		)
	)
	  //第一页内容
	  guidebook.addPage("page_index1",
		new Image("page_left_content1")
		.setSprite(
			new Sprite().setTexture("textures/items/diamond_sword")
		),
		new Label("right_content1")
		.setText(new Text().setColor([0,0,0]).setText("这是第一页右边的内容"))
	  )
	  //第一页内容
	  guidebook.addPage("page_index2",
		new Label("right_content2")
		.setLayout(
			new Layout().setSize([100,32])
		)
		.setText(
			new Text().setColor([0,0,0]).setText("这是第二页左边的内容")
		),
		new Image("page_left_content2")
		.setSprite(
			new Sprite().setTexture("textures/items/diamond")
		)
	  )