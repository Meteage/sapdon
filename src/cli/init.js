
import path from 'path';
import { fileURLToPath } from 'url';
import { checkPath, copyFolder, saveFile, readFile } from './utils.js';
import fs from "fs";

// 获取当前文件的路径
const __filename = fileURLToPath(import.meta.url);
// 获取当前文件的目录
const __dirname = path.dirname(__filename);



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

export const initNPMProject = (projectPath, data) => {
    //检查项目文件是否存在
    //如果不存在则创建项目
    //从模板下载项目文件
    //根据用户输入的项目信息生成项目配置文件
    //根据用户选择是否生成脚本文件，生成脚本文件
    if(!checkPath(path.join(projectPath, "mod.info"))||!checkPath(path.join(projectPath, "main.mjs"))||!checkPath(path.join(projectPath, "scripts"))||!checkPath(path.join(projectPath, "build.config"))) {
        console.log("项目已存在...");
        return;
    }
    //模版目录
    const templateDir = path.join(__dirname, "../templates/test_sapdon");
    copyFolder(templateDir, projectPath);

    //生成模组介绍文件
    saveFile(path.join(projectPath, "mod.info"), JSON.stringify(data, null, 2));
}

// 读取package.json文件并提取信息
export const readPackageJson = (dir) => {
    const packageJsonPath = path.join(dir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            return {
                name: path.basename(dir),
                description: packageJson.description || "A new sapdon project",
                author: packageJson.author || "Sapdon",
                version: packageJson.version || "1.0.0"
            };
        } catch (error) {
            console.error("读取package.json文件时出错:", error);
            return null;
        }
    } else {
        return null;
    }
}
