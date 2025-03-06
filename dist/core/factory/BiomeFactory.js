import { Biome } from "../biome/Biome.js";
import { GRegistry } from "../GRegistry.js";
const registerBiome = (biome) => {
    const biome_name = biome.identifier.split(":")[biome.identifier.split(":").length - 1];
    GRegistry.register(biome_name, "behavior", "biomes/", biome);
};
export const BiomeAPI = {
    createBiome: function (identifier) {
        const biome = new Biome(identifier);
        registerBiome(biome);
        return biome;
    }
};
