
import path from 'path';
import { fileURLToPath } from 'url';
import { checkPath, copyFolder, saveFile, readFile } from './utils.js';

// 获取当前文件的路径
const __filename = fileURLToPath(import.meta.url);
// 获取当前文件的目录
const __dirname = path.dirname(__filename);

console.log('当前文件目录:', __dirname);

export const initProject = (projectPath, data) => {
    //检查项目目录是否存在
    //如果不存在则创建项目目录
    //从模板下载项目文件
    //根据用户输入的项目信息生成项目配置文件
    //根据用户选择是否生成脚本文件，生成脚本文件
    if(!checkPath(projectPath)) {
        console.log("项目名称已存在，创建项目目录失败");
        return;
    }
    //模版目录
    const templateDir = path.join(__dirname, "../templates/test_sapdon");
    copyFolder(templateDir, projectPath);
    
    //生成模组介绍文件
    saveFile(path.join(projectPath, "mod.info"), JSON.stringify(data, null, 2));
}