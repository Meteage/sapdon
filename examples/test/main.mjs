import { BlockComponent } from "../../src/core/block/blockComponent.js";
import { ItemComponent } from "../../src/core/item/ItemComponents.js";
import { RecipeTags } from "../../src/core/addon/recipe/data.js";
import { BlockAPI } from "../../src/core/factory/BlockFactory.js";
import { ItemAPI } from "../../src/core/factory/ItemFactory.js";
import { RecipeAPI } from "../../src/core/factory/RecipeFactory.js";
import { EntityAPI } from "../../src/core/factory/EntityFactory.js";

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

BlockAPI.createBlock(
	"sapdon:block",
	"construction",
	[
		{ stateTag: 1, textures: ["garlic_stage_0"] },
		{ stateTag: 2, textures: ["garlic_stage_1"] },
		{ stateTag: 3, textures: ["garlic_stage_2"] },
		{ stateTag: 4, textures: ["garlic_stage_3"] }
	],
	{
		ambient_occlusion: true,
		face_dimming: true,
		render_method: "alpha_test"
	}
).addComponent(BlockComponent.setGeometry("geometry.crop"));

const block = BlockAPI.createBasicBlock("sapdon:test_block", "construction", [
	"compass_block_up",
	"compass_block_down",
	"compass_block_east",
	"compass_block_west",
	"compass_block_south",
	"compass_block_north"
]);

ItemAPI.createItem("sapdon:chest", "equipment", "custom_chestplate", { group: "itemGroup.name.chestplate" }).addComponent(
	ItemComponent.combineComponents(
		ItemComponent.setDisplayName("My Custom Armor"),
		ItemComponent.setMaxStackSize(1),
		ItemComponent.setWearable(5, "slot.armor.chest")
	)
);


ItemAPI.createAttachable("sapdon:chest", "textures/models/armor/custom_main", "armor")
	.addMaterial("enchanted", "armor_enchanted")
	.addTexture("enchanted", "textures/misc/enchanted_actor_glint")
	.addGeometry("default", "geometry.player.armor.chestplate")
	.addRenderController("controller.render.armor")
	.setScript("parent_setup", "v.chest_layer_visible = 0.0;");

RecipeAPI.registerSimpleFurnace("sapdon:test_furnace","sapdon:test_item", "sapdon:test_food");



