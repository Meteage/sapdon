import path from "path";
import { pathToFileURL } from "url";
import { saveFile } from "./utils.js";
import { GRegistry } from "../core/registry.js";

/**
 * 处理 blocks.json 数据
 * @param {Object} data blocks.json 数据
 * @returns {Object} 处理后的 blocks 数据
 */
const processBlocksData = (data) => {
    const textures_arr = data.textures;

    // 检查 textures 数组长度
    if (textures_arr.length !== 6) {
        console.warn(`blocks.json 的 textures 数组长度不为 6，实际长度: ${textures_arr.length}`);
        return {};
    }

    // 构建 blocks 数据
    const blocks = {};
    blocks[data.identifier] = {
        textures: {
            up: textures_arr[0],
            down: textures_arr[1],
            east: textures_arr[2],
            west: textures_arr[3],
            south: textures_arr[4],
            north: textures_arr[5]
        }
    };

    return blocks;
};

/**
 * 加载并执行模组文件
 * @param {string} modPath 模组文件路径
 * @param {string} buildPath 构建目录路径
 */
export const loadAndExecuteMod = async (modPath, buildPath,projectName) => {
    try {
        // 将 modPath 解析为绝对路径
        const absoluteModPath = path.resolve(modPath);

        // 将路径转换为 file:// URL
        const fileUrl = pathToFileURL(absoluteModPath).href;

        // 动态加载 JavaScript 文件
        await import(fileUrl);

        // 初始化 blocks.json 数据
        const blocksJsonPath = path.join(buildPath, `${projectName}_RP`,"blocks.json");
        const blocks = {"format_version": "1.20.20"};

        // 从全局注册表中获取数据
        const dataList = GRegistry.getDataList();
        console.log("dataList:", dataList);

        // 遍历数据并保存到相应的目录
        dataList.forEach(({ name, root, path: dataPath, data }) => {
            // 处理 blocks.json 数据
            if (dataPath === "blocks/") {
                const processedBlocks = processBlocksData(data);
                Object.assign(blocks, processedBlocks);
            }

            // 根据数据类型确定根目录
            const rootPath = root === "behavior" ?  `${projectName}_BP`: `${projectName}_RP`;
            const buildRootPath = path.join(buildPath, rootPath);

            // 拼接文件路径
            const filePath = path.join(buildRootPath, dataPath, `${name}.json`);

            // 保存文件
            saveFile(filePath, JSON.stringify(data.toJson(), null, 2));
        });

        // 保存 blocks.json
        console.log("保存 blocks.json 文件:", blocksJsonPath);
        saveFile(blocksJsonPath, JSON.stringify(blocks, null, 2));

        console.log(`已加载并执行 ${modPath} 文件！`);
    } catch (err) {
        console.error(`加载或执行 ${modPath} 失败：${err.message}`);
        console.error(err.stack); // 打印堆栈跟踪以便调试
    }
};