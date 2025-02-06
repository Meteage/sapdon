#!/usr/bin/env node
import {program} from 'commander';
import inquirer from 'inquirer';
import path from 'path';

import {initProject} from './init.js';
import {buildProject} from './build.js';
import {readFile} from "./utils.js";
import fs from "fs";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.removeAllListeners('warning');

// 读取package.json文件并提取信息
function readPackageJson(dir) {
    const packageJsonPath = path.join(dir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            return {
                name: packageJson.name || path.basename(dir),
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

// 额外添加的init方法
program.command("init").description("Initialize a project base NodeJS project").action(() => {
    const currentDir = process.cwd();
    const packageJsonData = readPackageJson(currentDir);

    if (!packageJsonData) {
        console.error("当前目录没有package.json文件，无法初始化项目。请使用create命令创建项目。");
        return;
    }

    // 添加或更新scripts字段
    packageJsonData.scripts = {
        ...packageJsonData.scripts,
        init: "sapdon init",
        pack: "sapdon pack",
        config: "sapdon config"
    };

    try {
        fs.writeFileSync(path.join(currentDir, 'package.json'), JSON.stringify(packageJsonData, null, 2), 'utf-8');
        console.log("package.json文件已更新。");
    } catch (error) {
        console.error("写入package.json文件时出错:", error);
        return;
    }

    // 更新package-lock.json文件
    const packageLockJsonPath = path.join(currentDir, 'package-lock.json');
    if (fs.existsSync(packageLockJsonPath)) {
        try {
            const packageLockJsonData = JSON.parse(fs.readFileSync(packageLockJsonPath, 'utf-8'));
            packageLockJsonData.scripts = packageJsonData.scripts;
            fs.writeFileSync(packageLockJsonPath, JSON.stringify(packageLockJsonData, null, 2), 'utf-8');
            console.log("package-lock.json文件已更新。");
        } catch (error) {
            console.error("写入package-lock.json文件时出错:", error);
        }
    } else {
        console.log("未找到package-lock.json文件，跳过更新。");
    }
    inquirer.prompt([
        {
            type: "input",
            name: "min_engine_version",
            message: "Minimum Engine Version:",
            default: "1.19.50"
        }
    ]).then((answers) => {
        const projectPath = currentDir;
        console.log('项目路径:', projectPath);
        initProject(projectPath, {...packageJsonData, ...answers});
        // 其他初始化操作
        console.log("项目初始化完成。");
        console.log("请使用命令sapdon config配置框架build.config文件。");
    });
});
program.command("create <project-name>").description("Create a new project").action((projectName) => {
    inquirer.prompt([
        {
            type: "input",
            name: "name",
            message: "Project Name:",
            default: path.basename(projectName)
        },
        {
            type: "input",
            name: "description",
            message: "Project Description:",
            default: "A new sapdon project"
        },
        {
            type: "input",
            name: "author",
            message: "Author Name:",
            default: "Sapdon"
        },
        {
            type: "input",
            name: "version",
            message: "Project Version:",
            default: "1.0.0"
        },
        {
            type: "input",
            name: "min_engine_version",
            message: "Minimum Engine Version:",
            default: "1.19.50",
        }
    ]).then((answers) => {
        const projectPath = path.join(process.cwd(), projectName);
        console.log('项目路径:', projectPath);
        initProject(projectPath, answers);
    });
});

program.command("build <project-name>").description("Build the project").action((projectName) => {
    console.log("Building the project...");
    const projectPath = path.join(process.cwd(), projectName);
    buildProject(projectPath, path.basename(projectName));
});

// pack 命令
program.command("pack").description("Pack the current project").action(() => {
    console.log("Packing the current project...");
    const projectPath = process.cwd();
    buildProject(projectPath, path.basename(projectPath));
});

// 配置build.config文件的命令
program.command("config").description("Configure build.config file").action(() => {
    const buildConfigData = JSON.parse(readFile(path.join(__dirname, "./build.config")));

    inquirer.prompt([
        {
            type: "input",
            name: "mojangPath",
            message: "Mojang Path (must end with LocalState/games/com.mojang/):",
            default: "./"
        },
        {
            type: "input",
            name: "mojangBetaPath",
            message: "Mojang Beta Path (must end with LocalState/games/com.mojang/):",
            default: "./"
        }
    ]).then((answers) => {
        const buildConfigPath = path.join(__dirname, "./build.config");
        try {
            fs.writeFileSync(buildConfigPath, JSON.stringify({...buildConfigData, ...answers}, null, 2), 'utf-8');
            console.log("build.config文件已更新。");
        } catch (error) {
            console.error("写入build.config文件时出错:", error);
        }
    });
});
program.parse(program.argv);
