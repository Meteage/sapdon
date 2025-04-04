/**
 * 生成 block_texture.json 文件
 * @param {string} itemTexturesPath - 包含 PNG 文件的根目录
 * @param {string} outputPath - 输出的 JSON 文件路径
 * @param {string} projectName - 项目名称
 */
export function generateBlockTextureJson(itemTexturesPath: string, outputPath: string, projectName: string, userTerrainTextures: any): Promise<void>;
/**
 * 生成 item_texture.json 文件
 * @param {string} itemTexturesPath - 包含 PNG 文件的根目录
 * @param {string} outputPath - 输出的 JSON 文件路径
 */
export function generateItemTextureJson(itemTexturesPath: string, outputPath: string, projectName: any, userItemTextures: any): Promise<void>;
