

export class Registry {
	#List = [];
	constructor(path, instance) {
		this.path = path;
		this.instance = instance;
	}
	getAll() {
		return [...this.#List];
	}

	register(data) {
		this.#List.push(data);
	}

	generate(behavior, resource) {}
}