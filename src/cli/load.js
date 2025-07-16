import path from "path"
import { saveFile } from "./utils.js"
import { generateBlockTextureJson, generateItemTextureJson } from "./tools/textureSet.js"
import { FlipbookTextures, ItemTextureManager, terrainTextureManager } from "../core/texture.js"
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


        //生成item_texture.json
        const item_texture_dir = resDir("textures/items")
        const item_texture_json_path = resDir("textures/item_texture.json")
        generateItemTextureJson(item_texture_dir, item_texture_json_path, projectName, ItemTextureManager.getItemTextures())

        //生成terrain_texture.json
        const terrain_texture_dir = resDir("textures/blocks")
        const terrain_texture_json_path = resDir("textures/terrain_texture.json")
        generateBlockTextureJson(terrain_texture_dir, terrain_texture_json_path, projectName, terrainTextureManager.getTerrainTextures())

        //生成flipbook_textures.json
        const flipbook_textures_path = resDir("textures/flipbook_textures.json")
        saveFile(flipbook_textures_path, JSON.stringify(FlipbookTextures.flipbook_textures, null, 2))


        // 从全局注册表中获取数据
        const dataList = GRegistryServer.getDataList()

        // 遍历数据并保存到相应的目录
        dataList.forEach(({ name, root, path: dataPath, data }) => {

            // 根据数据类型确定根目录
            const rootPath = root === "behavior" ? `${projectName}_BP` : `${projectName}_RP`
            const buildRootPath = path.join(buildPath, rootPath)

            // 拼接文件路径
            const filePath = path.join(buildRootPath, dataPath, `${name}.json`)

            // 保存文件
            saveFile(filePath, JSON.stringify(data, null, 2))
        })

        console.log(`已加载并执行 ${modPath} 文件！`)
    } catch (err) {
        console.error(`加载或执行 ${modPath} 失败：${err.message}`)
        console.error(err.stack) // 打印堆栈跟踪以便调试
    }
}