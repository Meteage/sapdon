
import path from 'path'
import { fileURLToPath } from 'url'
import { pathNotExist, copyFolder, saveFile } from './utils.js'
import fs from "fs"
import cp from "child_process"
import os from "os"

// 获取当前文件的路径
const __filename = fileURLToPath(import.meta.url)
// 获取当前文件的目录
const __dirname = path.dirname(__filename)

const templateMapping = {
    js: 'test_sapdon',
    ts: 'ts_sapdon'
}

export function initMojangPath(projectPath) {
    const mojangPath = path.join(os.homedir(), "AppData/Local/Packages/Microsoft.MinecraftUWP_8wekyb3d8bbwe/LocalState/games/com.mojang/")
    const betaPath = path.join(os.homedir(), "AppData/Local/Packages/Microsoft.MinecraftUWP_8wekyb3d8bbwe/LocalState/games/com.mojang/")
    const buildConfigPath = path.join(projectPath, './build.config')
    const buildConfig = JSON.parse(fs.readFileSync(buildConfigPath))
    buildConfig.mojangPath = mojangPath
    buildConfig.betaPath = betaPath
    saveFile(buildConfigPath, JSON.stringify(buildConfig, null, 2))
}

export const initProject = (projectPath, data) => {
    console.log(1, data)
    //检查项目目录是否存在
    //如果不存在则创建项目目录
    //从模板下载项目文件
    //根据用户输入的项目信息生成项目配置文件
    //根据用户选择是否生成脚本文件，生成脚本文件
    if(!pathNotExist(projectPath)) {
        console.log("项目名称已存在，创建项目目录失败")
        return
    }
    //模版目录
    const templateDir = path.join(__dirname, `../../src/templates/${templateMapping[data.language || 'js']}`)
    copyFolder(templateDir, projectPath)

    //生成模组介绍文件
    saveFile(path.join(projectPath, "mod.info"), JSON.stringify(data, null, 2))

    //执行npm i
    cp.execSync('npm i', { cwd: projectPath, stdio: 'inherit' })
}

export const initNPMProject = (projectPath, data) => {
    //检查项目文件是否存在
    //如果不存在则创建项目
    //从模板下载项目文件
    //根据用户输入的项目信息生成项目配置文件
    //根据用户选择是否生成脚本文件，生成脚本文件
    if(!pathNotExist(path.join(projectPath, "mod.info"))||!pathNotExist(path.join(projectPath, "main.mjs"))||!pathNotExist(path.join(projectPath, "scripts"))||!pathNotExist(path.join(projectPath, "build.config"))) {
        console.log("项目已存在...")
        return
    }
    //模版目录
    const templateDir = path.join(__dirname, "../templates/test_sapdon")
    copyFolder(templateDir, projectPath)

    //生成模组介绍文件
    saveFile(path.join(projectPath, "mod.info"), JSON.stringify(data, null, 2))
}

// 读取package.json文件并提取信息
export const readPackageJson = (dir) => {
    const packageJsonPath = path.join(dir, 'package.json')
    if (fs.existsSync(packageJsonPath)) {
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
            return {
                name: path.basename(dir),
                description: packageJson.description || "A new sapdon project",
                author: packageJson.author || "Sapdon",
                version: packageJson.version || "1.0.0"
            }
        } catch (error) {
            console.error("读取package.json文件时出错:", error)
            return null
        }
    } else {
        return null
    }
}

export const globalObject = {}