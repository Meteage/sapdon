

export class Registry {
	constructor(path, instance) {
		this.path = path;
		this.instance = instance;
	}

	_list: [];

	getAll() {
		return [...this._list];
	}

	register(data) {
		this._list.push(data);
	}

	generate(behavior, resource) {}
}