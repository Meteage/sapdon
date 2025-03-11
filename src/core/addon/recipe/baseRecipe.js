export class AddonRecipe {
	constructor(format_version, recipe_type, definitions = {}) {
		this.format_version = format_version;
		this.recipe_type = recipe_type;
		this.definitions = definitions;
	}
	
	getId() {
		return this.definitions.description.identifier;
	}

	identifier(identifier) {
		this.definitions.description = { identifier };
		return this;
	}

	tags(tags) {
		this.definitions.tags = tags;
		return this;
	}

	toJson() {
		var json = { format_version: this.format_version };
		json[this.recipe_type] = this.definitions;
		return json;
	}
}