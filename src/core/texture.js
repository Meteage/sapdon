
export class ItemTextureManager {
    static item_texture_sets = new Map();
    static getItemTextureSet(){
        return this.item_texture_sets;
    }
    static getItemTextures(){
        return Object.fromEntries(this.item_texture_sets);
    }
    static registerTextureData(texture_name,texture_data){
        this.item_texture_sets.set(texture_name,texture_data);
    }
    static registerTexture(texture_name,texture_path){
        this.registerTextureData(texture_name,{textures:texture_path});
    }
}

export class TerrainTextureManager {
    static terrain_texture_sets = new Map();
    static getTerrainTextureSet(){
        return this.terrain_texture_sets;
    }
    static getTerrainTextures(){
        return Object.fromEntries(this.terrain_texture_sets);
    }
    static registerTextureData(texture_name,texture_data){
        this.terrain_texture_sets.set(texture_name,texture_data);
    }
    static registerTexture(texture_name,texture_path){
        this.registerTextureData(texture_name,{textures:texture_path});
    }
}

export const FlipbookTextures = {
    flipbook_textures: [],
    registerFlipbookTexture(atlas_tile,texture,ticks_per_frame,options = {}){
        const flipbook_texture = {"atlas_tile":atlas_tile,"flipbook_texture":texture,ticks_per_frame};
        Object.assign(flipbook_texture,options);
        this.flipbook_textures.push(flipbook_texture);
    }
}