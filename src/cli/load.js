import path from "path"
import { saveFile } from "./utils.js"
import { generateBlockTextureJson, generateItemTextureJson } from "./tools/textureSet.js"
//import { FlipbookTextures, ItemTextureManager, TerrainTextureManager } from "../core/texture.js"
import { GRegistryServer } from "../core/registry.js"


/**
 * Server
 * 加载并执行模组文件
 * @param {string} modPath 模组文件路径
 * @param {string} buildPath 构建目录路径
 * @param {string} projectName 项目名
 */
export const generateAddon = async (modPath, buildPath, projectName) => {
    try {
        const buildBehDirPath = path.join(buildPath, `${projectName}_BP`)
        const buildResDirPath = path.join(buildPath, `${projectName}_RP`)
        const resDir = (...name) => path.join(buildResDirPath, ...name)

        // 从全局注册表中获取数据
        const dataList = GRegistryServer.getDataList()

        // 初始化用户自定义纹理数据
        const textureData = {
            item: null,
            block: null,
            flipbook: []
        }

        // 遍历数据并分类处理
        for (const { name, root, path: dataPath, data } of dataList) {
            console.log('处理数据:', name, root, dataPath);
            
            // 处理纹理数据
            switch (name) {
                case "item_texture":
                    textureData.item = data;
                    console.log('用户物品贴图数据:', textureData.item);
                    continue;
                    
                case "terrain_texture":
                    textureData.block = data;
                    console.log('用户方块贴图数据:', textureData.block);
                    continue;
                    
                case "flipbook_textures":
                    textureData.flipbook = data;
                    console.log('用户翻书贴图数据:', textureData.flipbook);
                    continue;
            }
            
            // 处理其他类型的数据文件
            const rootPath = root === "behavior" ? `${projectName}_BP` : `${projectName}_RP`;
            const buildRootPath = path.join(buildPath, rootPath);
            const filePath = path.join(buildRootPath, dataPath, `${name}.json`);
            
            // 保存文件
            saveFile(filePath, JSON.stringify(data, null, 2));
        }

        // 生成纹理 JSON 文件
        await generateTextureFiles(resDir, projectName, textureData);

        console.log(`已加载并执行 ${modPath} 文件！`);
    } catch (err) {
        console.error(`加载或执行 ${modPath} 失败：${err.message}`);
        console.error(err.stack);
    }
};

/**
 * 生成纹理相关的 JSON 文件
 */
async function generateTextureFiles(resDir, projectName, textureData) {
    // 生成 item_texture.json
    const itemTextureDir = resDir("textures/items");
    const itemTextureJsonPath = resDir("textures/item_texture.json");
    await generateItemTextureJson(itemTextureDir, itemTextureJsonPath, projectName, textureData.item);
    
    // 生成 terrain_texture.json
    const terrainTextureDir = resDir("textures/blocks");
    const terrainTextureJsonPath = resDir("textures/terrain_texture.json");
    await generateBlockTextureJson(terrainTextureDir, terrainTextureJsonPath, projectName, textureData.block);
    
    // 生成 flipbook_textures.json
    const flipbookTexturesPath = resDir("textures/flipbook_textures.json");
    saveFile(flipbookTexturesPath, JSON.stringify(textureData.flipbook, null, 2));
    //console.log('翻书贴图 JSON 文件生成成功。');
}