import path from "path";

import { Registry } from "../registry.js";
import { AddonRecipe } from "../addon/recipe/recipe.js";
import { AddonRecipeFurnace_1_17 } from "../addon/recipe/recipeFurnace.js";
import { RecipeTags } from "../addon/recipe/data.js";

class RecipeRegistry extends Registry {
	/**
	 *
	 * @param {string} input
	 * @param {string} output
	 */
	registerSimpleFurnace(input, output) {
		this.registerFurnace(`sapdon:furnace_${output.split(":")[1]}_${input.split(":")[1]}`, [RecipeTags.Furnace], input, output);
	}

	registerFurnace(identifier, tags, input, output) {
		this.register(new AddonRecipeFurnace_1_17().identifier(identifier).tags(tags).input(input).output(output));
	}

	generate(behavior, resource) {
		const rootPath = path.join(behavior, "recipes/");

		console.log("开始处理配方文件");

		for (let recipe of this._list) {
			if (recipe instanceof AddonRecipe) {
				const recipePath = path.join(rootPath, `${recipe.getId().replace(":", "_")}.json`);
				saveFile(recipePath, JSON.stringify(item.toJson(), null, 2));
				console.log(`${recipePath} 处理完成`)
			}
		}
	}
}

export const RecipeAPI = new RecipeRegistry();
