export class ItemTextureManager {
    static item_texture_sets: Map<any, any>;
    static getItemTextureSet(): Map<any, any>;
    static getItemTextures(): any;
    static registerTextureData(texture_name: any, texture_data: any): void;
    static registerTexture(texture_name: any, texture_path: any): void;
}
export class terrainTextureManager {
    static terrain_texture_sets: Map<any, any>;
    static getTerrainTextureSet(): Map<any, any>;
    static getTerrainTextures(): any;
    static registerTextureData(texture_name: any, texture_data: any): void;
    static registerTexture(texture_name: any, texture_path: any): void;
}
export namespace FlipbookTextures {
    let flipbook_textures: never[];
    function registerFlipbookTexture(atlas_tile: any, texture: any, ticks_per_frame: any, options?: {}): void;
}
