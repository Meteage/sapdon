export class NativeEntityData {
    static behDataPath: string;
    static resDataPath: string;
    static behData: null;
    static resData: null;
    static loadDataSync(filePath: any): any;
    static reloadDataSync(): void;
    static getDataById(type: any, id: any): any;
}
