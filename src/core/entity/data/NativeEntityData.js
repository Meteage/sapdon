import { readFileSync } from "fs"

export class NativeEntityData{
    static behData  = JSON.parse(readFileSync('./src/core/entity/data/data_bp.json','utf8'));
    static resData  = JSON.parse(readFileSync('./src/core/entity/data/data_rp.json','utf8'));
    static cloneData(data){
        return JSON.parse(JSON.stringify(data));
    }
    static getDataById(type,id){
        if(type == 'beh'){
            return this.cloneData(this.behData[id]);
        }
        return this.cloneData(this.resData[id]);
    }
}