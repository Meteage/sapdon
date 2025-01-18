import { pathToFileURL } from 'url';
import { ItemAPI } from '../core/factory/ItemFactory.js';
import { Item } from '../core/item/item.js';
import path from 'path';
import { saveFile } from './utils.js'; 
import { BlockAPI } from '../core/factory/BlockFactory.js';
import { BasicBlock } from '../core/block/BasicBlock.js';

/**
 * 加载并执行模组文件
 * @param {string} modPath 模组文件路径
 * @param {string} buildDirPath 构建目录路径
 */
export const loadAndExecuteMod = async (modPath, buildDirPath) => {
    try {
        // 将路径转换为 file:// URL
        const fileUrl = pathToFileURL(modPath).href;

        // 动态加载 JavaScript 文件
        await import(fileUrl);

        // 构建行为包和资源包目录路径
        const buildBehDirPath = path.join(buildDirPath, "behavior_packs/");
        const buildResDirPath = path.join(buildDirPath, "resource_packs/");

        // 处理物品
        await processItems(buildBehDirPath);

        // 处理方块
        await processBlocks(buildBehDirPath, buildResDirPath);

        console.log(`已加载并执行 ${modPath} 文件！`);
    } catch (err) {
        console.error(`加载或执行 ${modPath} 失败：${err.message}`);
    }
};

/**
 * 处理物品
 * @param {string} buildBehDirPath 行为包目录路径
 */
const processItems = async (buildBehDirPath) => {
    const itemsDirPath = path.join(buildBehDirPath, "items/");

    const ItemList = ItemAPI.getAllItems();
    console.log("itemList:", ItemList);

    for (const item of ItemList) {
        if (item instanceof Item) {
            const namespace = item.identifier.split(':')[0];
            const itemName = item.identifier.split(":")[1];
            const itemPath = path.join(itemsDirPath, `${namespace}_${itemName}.json`);
            console.log("保存物品文件:", itemPath);
            saveFile(itemPath, JSON.stringify(item.toJson(), null, 2));
        }
    }
};

/**
 * 处理方块
 * @param {string} buildBehDirPath 行为包目录路径
 * @param {string} buildResDirPath 资源包目录路径
 */
const processBlocks = async (buildBehDirPath, buildResDirPath) => {
    const blocksDirPath = path.join(buildBehDirPath, "blocks/");

    const blocksJsonPath = path.join(buildResDirPath, "blocks.json");
    const blocksJson = {
        "format_version": "1.20.20",
    };

    const blockList = BlockAPI.getAllBlocks();
    for (const block of blockList) {
        if (block instanceof BasicBlock) {
            const namespace = block.identifier.split(':')[0];
            const blockName = block.identifier.split(':')[1];
            const blockPath = path.join(blocksDirPath, `${namespace}_${blockName}.json`);
            console.log("保存方块文件:", blockPath);
            saveFile(blockPath, JSON.stringify(block.toJson(), null, 2));

            // 在 blocks.json 中注册纹理
            const textures_arr = block.textures;
            if(textures_arr.length!= 6){
                for(let i=0;i<6;i++) textures_arr.push(textures_arr[0]);
            } 
            blocksJson[block.identifier] = {
                textures: {
                    "up": textures_arr[0],
                    "down": textures_arr[1],
                    "east": textures_arr[2],
                    "west": textures_arr[3],
                    "south": textures_arr[4],
                    "north": textures_arr[5],
                }
            };
        }
    }

    // 保存 blocks.json
    console.log("保存 blocks.json 文件:", blocksJsonPath);
    saveFile(blocksJsonPath, JSON.stringify(blocksJson, null, 2));
};