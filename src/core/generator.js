import path from "path";
import { saveFile } from "../cli/utils.js";

import { Item } from "./item/Item.js";
import { Attachable } from "./item/Attachable.js";
import { BasicBlock } from "./block/BasicBlock.js";
import { AddonRecipe } from "./addon/recipe/recipe.js";

export const GenerateTypes = {
	Recipes: { name: "配方", path: "recipes/", root: "behavior" },
	Blocks: { name: "方块", path: "blocks/", root: "behavior" },
	Items: { name: "物品", path: "items/", root: "behavior" },
	Attachables: { name: "物品附加组件", path: "attachables/", root: "resource" }
};

export class JsonGenerator {
	constructor(buildPath, type) {
		this._type = type;
		this._buildPath = buildPath;
		if (this._type.root == "behavior") {
			this._behaviorPath = path.join(this._buildPath, "behavior_packs/");
			this._rootPath = path.join(this._behaviorPath, this._type.path);
		}
		if (this._type.root == "resource") {
			this._resourcePath = path.join(this._buildPath, "resource_packs/");
			this._rootPath = path.join(this._resourcePath, this._type.path);
		}
		console.log(`[JSONG] 开始处理${this._type.name}文件`);
	}

	fileNameById(identifier) {
		return `${identifier.replace(":", "_")}.json`;
	}

	generateById(data, identifier) {
		const fileName = this.fileNameById(identifier);
		const filePath = path.join(this._rootPath, fileName);
		saveFile(filePath, JSON.stringify(data.toJson(), null, 2));
		console.log(`[JSONG] 处理完成 - ${fileName}`);
	}

	item(data) {
		if (data instanceof Item) this.generateById(data, data.getId());
	}

    attachable(data) {
		if (data instanceof Attachable) this.generateById(data, data.getId());
	}

    block(data) {
        if (data instanceof BasicBlock) this.generateById(data, data.getId());
    }

	recipe(data) {
		if (data instanceof AddonRecipe) this.generateById(data, data.getId());
	}
}
