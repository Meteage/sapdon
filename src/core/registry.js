

export class Registry {
	_list = [];
	constructor(path, instance) {
		this.path = path;
		this.instance = instance;
	}

	getAll() {
		return [...this._list];
	}

	register(data) {
		this._list.push(data);
	}

	generate(behavior, resource) {}
}