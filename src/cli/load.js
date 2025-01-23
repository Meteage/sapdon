import path from "path";
import { pathToFileURL } from "url";
import { saveFile } from "./utils.js";
import { GRegistry } from "../core/registry.js";

/**
 * 加载并执行模组文件
 * @param {string} modPath 模组文件路径
 * @param {string} buildPath 构建目录路径
 */
export const loadAndExecuteMod = async (modPath, buildPath) => {
    try {
        // 将 modPath 解析为绝对路径
        const absoluteModPath = path.resolve(modPath);

        // 将路径转换为 file:// URL
        const fileUrl = pathToFileURL(absoluteModPath).href;

        // 动态加载 JavaScript 文件
        await import(fileUrl);

        // 从全局注册表中获取数据
        const dataList = GRegistry.getDataList();
        console.log("dataList:", dataList);

        // 遍历数据并保存到相应的目录
        dataList.forEach(({ name, root, path: dataPath, data },index) => {
            // 根据数据类型确定根目录
            const rootPath = root === "behavior" ? "behavior_packs" : "resource_packs";
            const buildRootPath = path.join(buildPath, rootPath);

            // 拼接文件路径
            const filePath = path.join(buildRootPath, dataPath, `${name}.json`);
			
            // 保存文件
            saveFile(filePath, JSON.stringify(data.toJson(), null, 2));
        });

        console.log(`已加载并执行 ${modPath} 文件！`);
    } catch (err) {
        console.error(`加载或执行 ${modPath} 失败：${err.message}`);
        console.error(err.stack); // 打印堆栈跟踪以便调试
    }
};

/*

const processItems = async (buildBehDirPath,buildResDirPath) => {
	const itemsDirPath = path.join(buildBehDirPath, "items/");
	const attachableDirPath = path.join(buildResDirPath,"attachables/")

	const ItemList = ItemAPI.getAllItems();
	console.log("itemList:", ItemList);

	for (const item of ItemList) {
		if (item instanceof Item) {
			const itemPath = path.join(itemsDirPath, `${item.identifier.replace(":", "_")}.json`);
			console.log("保存物品文件:", itemPath);
			saveFile(itemPath, JSON.stringify(item.toJson(), null, 2));
		}
		else if (item instanceof Attachable) {
            const itemPath = path.join(attachableDirPath, `${item.identifier.replace(":", "_")}.json`);
            console.log("保存物品文件:", itemPath);
            saveFile(itemPath, JSON.stringify(item.toJson(), null, 2));
        }
	}
};


const processBlocks = async (buildBehDirPath, buildResDirPath) => {
	const blocksDirPath = path.join(buildBehDirPath, "blocks/");

	const blocksJsonPath = path.join(buildResDirPath, "blocks.json");
	const blocksJson = {
		format_version: "1.20.20"
	};

	const blockList = BlockAPI.getAllBlocks();
	for (const block of blockList) {
		if (block instanceof BasicBlock) {
			const blockPath = path.join(blocksDirPath, `${block.identifier.replace(":", "_")}.json`);
			console.log("保存方块文件:", blockPath);
			saveFile(blockPath, JSON.stringify(block.toJson(), null, 2));

			// 在 blocks.json 中注册纹理
			const textures_arr = block.textures;
			if (textures_arr.length != 6) {
				for (let i = 0; i < 6; i++) textures_arr.push(textures_arr[0]);
			}
			blocksJson[block.identifier] = {
				textures: {
					up: textures_arr[0],
					down: textures_arr[1],
					east: textures_arr[2],
					west: textures_arr[3],
					south: textures_arr[4],
					north: textures_arr[5]
				}
			};
		}
	}

	// 保存 blocks.json
	console.log("保存 blocks.json 文件:", blocksJsonPath);
	saveFile(blocksJsonPath, JSON.stringify(blocksJson, null, 2));
};

const processRecipe = async (buildPath) => {
	RecipeAPI.generate(new JsonGenerator(buildPath, GenerateTypes.Recipes));
}

*/