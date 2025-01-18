import fs from "fs/promises";
import path from "path";


/**
 * 递归遍历目录，收集所有 PNG 文件的路径
 * @param {string} directory - 要遍历的目录
 * @param {string} basePath - 基础路径（用于计算相对路径）
 * @param {string} prefix - 路径前缀（如 "textures/items/"）
 * @returns {Promise<Object>} - 返回一个对象，键为文件名，值为相对路径（不带 .png 后缀）
 */
const traverseDirectory = async (directory, basePath, prefix = "") => {
  const texturesSet = {};

  const files = await fs.readdir(directory);

  for (const file of files) {
    const filePath = path.join(directory, file);
    const fileStats = await fs.stat(filePath);

    if (fileStats.isDirectory()) {
      // 如果是目录，递归遍历
      const subDirectoryTextures = await traverseDirectory(filePath, basePath, prefix);
      Object.assign(texturesSet, subDirectoryTextures);
    } else if (file.endsWith(".png")) {
      // 如果是 PNG 文件，提取文件名并生成 texture_data
      const fileName = path.basename(file, ".png"); // 去掉 .png 后缀
      const relativePath = path.relative(basePath, filePath).replace(/\.png$/, ""); // 去掉 .png 后缀
      const normalizedPath = `${prefix}${relativePath.replace(/\\/g, "/")}`; // 确保路径使用正斜杠

      texturesSet[fileName] = {
        textures: normalizedPath,
      };
    }
  }

  return texturesSet;
};

/**
 * 生成 JSON 文件
 * @param {string} outputPath - 输出的 JSON 文件路径
 * @param {Object} jsonData - 要写入的 JSON 数据
 * @param {string} successMessage - 成功时的日志消息
 */
const generateJsonFile = async (outputPath, jsonData, successMessage) => {
  try {
    const jsonString = JSON.stringify(jsonData, null, 2);
    await fs.writeFile(outputPath, jsonString);
    console.log(successMessage);
  } catch (err) {
    console.error("Error writing JSON file:", err);
  }
};

/**
 * 生成 block_texture.json 文件
 * @param {string} itemTexturesPath - 包含 PNG 文件的根目录
 * @param {string} outputPath - 输出的 JSON 文件路径
 * @param {string} projectName - 项目名称
 */
export async function generateBlockTextureJson(itemTexturesPath, outputPath, projectName) {
  try {
    // 递归遍历目录，获取所有 PNG 文件的路径
    const itemTexturesSet = await traverseDirectory(itemTexturesPath, itemTexturesPath,"textures/blocks/");

    // 生成 JSON 数据
    const jsonData = {
      texture_name: "atlas.terrain",
      resource_pack_name: projectName,
      padding: 8,
      num_mip_levels: 4,
      texture_data: itemTexturesSet,
    };

    // 写入文件
    await generateJsonFile(outputPath, jsonData, "Block texture JSON file generated successfully.");
  } catch (err) {
    console.error("Error generating block texture JSON:", err);
  }
}

/**
 * 生成 item_texture.json 文件
 * @param {string} itemTexturesPath - 包含 PNG 文件的根目录
 * @param {string} outputPath - 输出的 JSON 文件路径
 */
export async function generateItemTextureJson(itemTexturesPath, outputPath,projectName) {
  try {
    // 递归遍历目录，获取所有 PNG 文件的路径
    const itemTexturesSet = await traverseDirectory(itemTexturesPath, itemTexturesPath, "textures/items/");

    // 生成 JSON 数据
    const jsonData = {
      resource_pack_name: projectName,
      texture_name: "atlas.items",
      texture_data: itemTexturesSet,
    };

    // 写入文件
    await generateJsonFile(outputPath, jsonData, "Item texture JSON file generated successfully.");
  } catch (err) {
    console.error("Error generating item texture JSON:", err);
  }
}