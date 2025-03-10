export class GRegistry {
    static dataList: any[];
    /**
     * 生成注册器
     * @param {string} name 文件名字
     * @param {string} root 根目录，如 "behavior"、"resource" 等
     * @param {string} path 数据的路径，如 "blocks/"、"items/"、"recipes/" 等
     * @param {string} data 实例 必须包含 toJson 方法
     */
    static register(name: string, root: string, path: string, data: string): void;
    static getDataList(): any[];
}
