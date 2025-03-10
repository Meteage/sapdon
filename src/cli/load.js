import path from "path"
import { saveFile } from "./utils.js"
import { generateBlockTextureJson, generateItemTextureJson } from "./tools/textureSet.js"
import { FlipbookTextures, ItemTextureManager, terrainTextureManager } from "../core/texture.js"
import { writeAddon } from './dev-server/client.js'

/**
 * 处理 blocks.json 数据
 * @param {Object} data blocks.json 数据
 * @returns {Object} 处理后的 blocks 数据
 */
export const processBlocksData = (data) => {
    const textures_arr = data.textures

    // 检查 textures 数组长度
    if (textures_arr.length !== 6) {
        console.warn(`blocks.json 的 textures 数组长度不为 6，实际长度: ${textures_arr.length}`)
        return {}
    }

    // 构建 blocks 数据
    const blocks = {}
    blocks[data.identifier] = {
        textures: {
            up: textures_arr[0],
            down: textures_arr[1],
            east: textures_arr[2],
            west: textures_arr[3],
            south: textures_arr[4],
            north: textures_arr[5]
        }
    }

    return blocks
}

export const generateAddonClient = async (modPath, buildPath, projectName) => {
    writeAddon(modPath, buildPath, projectName)
}

/**
 * Server
 * 加载并执行模组文件
 * @param {string} modPath 模组文件路径
 * @param {string} buildPath 构建目录路径
 * @param {string} projectName 项目名
 */
export const generateAddon = (GRegistry, UISystemRegistry) => async (modPath, buildPath, projectName) => {
    try {
        const buildBehDirPath = path.join(buildPath, `${projectName}_BP`)
        const buildResDirPath = path.join(buildPath, `${projectName}_RP`)
        const resDir = name => path.join(buildResDirPath, name)

        // 初始化 blocks.json 数据
        const blocksJsonPath = path.join(buildBehDirPath, "blocks.json")
        const blocks = { "format_version": "1.20.20" }

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

        //_ui_defs.json
        const ui_def = UISystemRegistry.getUIdefList()
        saveFile(resDir("ui/_ui_defs.json"), JSON.stringify({ "ui_defs": ui_def }, null, 2))

        UISystemRegistry.getUISystemList().forEach((ui_system) => {
            saveFile(resDir(ui_system.path, `${ui_system.name}.json`), JSON.stringify(ui_system.toJson(), null, 2))
        })

        // 从全局注册表中获取数据
        const dataList = GRegistry.getDataList()
        // console.log("dataList:", dataList)
        // 遍历数据并保存到相应的目录
        dataList.forEach(({ name, root, path: dataPath, data }) => {
            // 处理 blocks.json 数据
            if (dataPath === "blocks/") {
                const processedBlocks = processBlocksData(data)
                Object.assign(blocks, processedBlocks)
            }

            // 根据数据类型确定根目录
            const rootPath = root === "behavior" ? `${projectName}_BP` : `${projectName}_RP`
            const buildRootPath = path.join(buildPath, rootPath)

            // 拼接文件路径
            const filePath = path.join(buildRootPath, dataPath, `${name}.json`)

            // 保存文件
            saveFile(filePath, JSON.stringify(data.toJson(), null, 2))
        })

        // 保存 blocks.json
        console.log("保存 blocks.json 文件:", blocksJsonPath)
        saveFile(blocksJsonPath, JSON.stringify(blocks, null, 2))

        console.log(`已加载并执行 ${modPath} 文件！`)
    } catch (err) {
        console.error(`加载或执行 ${modPath} 失败：${err.message}`)
        console.error(err.stack) // 打印堆栈跟踪以便调试
    }
}