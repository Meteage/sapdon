import { GRegistry } from "./registry.js";

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
        GRegistry.register("item_texture","resource","textures/",this);
    }
    static registerTexture(texture_name,texture_path){
        this.registerTextureData(texture_name,{textures:texture_path});
    }
    static toObject(){
        return ItemTextureManager.getItemTextures();
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
        GRegistry.register("terrain_texture","resource","textures/",this);
    }
    static registerTexture(texture_name,texture_path){
        this.registerTextureData(texture_name,{textures:texture_path});
    }
    static toObject(){
        return TerrainTextureManager.getTerrainTextures();
    }
}

export const FlipbookTextures = {
    flipbook_textures: [],
    registerFlipbookTexture(atlas_tile,texture,ticks_per_frame,options = {}){
        const flipbook_texture = {"atlas_tile":atlas_tile,"flipbook_texture":texture,ticks_per_frame};
        Object.assign(flipbook_texture,options);
        this.flipbook_textures.push(flipbook_texture);
        GRegistry.register("flipbook_textures","resource","textures/",this);
    },
    toObject(){
        return this.flipbook_textures;
    }
}