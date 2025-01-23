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


export class GRegistry {
	 static dataList = [];
	 /**
	  * 生成注册器
	  * @param {string} name 文件名字
	  * @param {string} root 根目录，如 "behavior"、"resource" 等
	  * @param {string} path 数据的路径，如 "blocks/"、"items/"、"recipes/" 等
	  * @param {string} data data 数据 是由json序列化的数据
	  */
	 static register(name, root, path, data){
		GRegistry.dataList.push({name, root, path, data});
	 }
	 static getDataList(){
		return [...GRegistry.dataList];
	 }
}