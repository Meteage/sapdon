export class Registry {
	constructor() {
		this._list = [];
	}

	getAll() {
		return [...this._list];
	}

	register(data) {
		this._list.push(data);
		return data;
	}

	generate(JsonGenerator) {}
}