import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
 
// 获取当前文件的目录路径 
const __dirname = path.dirname(fileURLToPath(import.meta.url));
 
export class NativeEntityData {
    // 使用 __dirname 获取当前文件所在目录
    static behDataPath = path.join(__dirname, 'data_bp.json');
    static resDataPath = path.join(__dirname, 'data_rp.json');
 
    static behData = null;
    static resData = null;
 
    static loadDataSync(filePath) {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Failed to load data from $$${filePath}:`, error);
            return {};
        }
    }
 
    static reloadDataSync() {
        this.behData = this.loadDataSync(this.behDataPath);
        this.resData = this.loadDataSync(this.resDataPath);
    }
 
    static getDataById(type, id) {
        if (typeof type !== 'string' || typeof id !== 'string') {
            throw new Error("type and id must be strings");
        }
 
        if (!this.behData || !this.resData) {
            this.reloadDataSync();
        }
 
        if (type === 'beh') {
            return this.behData[id] || null;
        }
        return this.resData[id] || null;
    }
}

