#!/usr/bin/env node
import {program} from 'commander'
import inquirer from 'inquirer'
import path from 'path'
import os from 'os'

import {initMojangPath, initNPMProject, initProject,readPackageJson} from './init.js'
import {buildProject, projectCanBuild} from './build.js'
import {readFile} from "./utils.js"
import fs from "fs"
import {fileURLToPath} from "url"
import { writeLib } from './dev-server/syncFiles.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

process.removeAllListeners('warning')

function start() {
    
    // 额外添加的init方法
    program.command("init").description("初始化一个基于NodeJS的项目").action(() => {
        const currentDir = process.cwd()
        const packageJsonPath = path.join(currentDir, 'package.json')
        let packageJsonData
        if (!fs.existsSync(packageJsonPath)) {
            console.error("没有找到package.json文件，请使改用create命令进行创建。")
            return
        }

        try {
            packageJsonData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
        } catch (error) {
            console.error("读取package.json文件时出错:", error)
            console.log("请使改用create命令进行创建。")
            return
        }

        // 添加或更新scripts字段
        packageJsonData.scripts = {
            ...packageJsonData.scripts,
            init: "sapdon init",
            pack: "sapdon pack",
            config: "sapdon config"
        }

        try {
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJsonData, null, 2), 'utf-8')
        } catch (error) {
            console.error("写入package.json文件时出错:", error)
            return
        }

        inquirer.prompt([
            {
                type: "input",
                name: "min_engine_version",
                message: "最低引擎版本:",
                default: "1.19.50"
            }
        ]).then((answers) => {
            initNPMProject(currentDir, {...readPackageJson(currentDir), ...answers})
            console.log("请使用命令sapdon config配置框架的build.config文件。")
        })
    })

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
            },
            {
                type: "input",
                name: "language",
                message: "Language:(js/ts)",
                default: "ts",
            },
        ]).then((answers) => {
            const projectPath = path.join(process.cwd(), projectName)
            console.log('项目路径:', projectPath)
            initProject(projectPath, answers)
            initMojangPath(projectPath)
            writeLib(projectPath)
        })
    })

    program.command("build <project-name>").description("Build the project").action((projectName) => {
        console.log("Building the project...")
        const projectPath = path.join(process.cwd(), projectName)
        if (projectCanBuild(projectPath, projectName)) {
            buildProject(projectPath, path.basename(projectName))
        }
    })

    // pack 命令
    program.command("pack").description("Pack the current project").action(() => {
        console.log("Packing the current project...")
        const projectPath = process.cwd()
        const projectName = path.basename(projectPath)
        if (projectCanBuild(projectPath, projectName)) {
            buildProject(projectPath, path.basename(projectName))
        }
    })

    // 配置build.config文件的命令
    program.command("config").description("Configure build.config file").action(() => {
        const buildConfigPath = path.join(__dirname, "./build.config")
        let buildConfigData

        try {
            buildConfigData = JSON.parse(readFile(buildConfigPath))
        } catch (error) {
            console.error("读取build.config文件时出错:", error)
            return
        }

        inquirer.prompt([
            {
                type: "input",
                name: "mojangPath",
                message: "Mojang Path (must end with LocalState/games/com.mojang/):",
                default: path.join(os.homedir(), "AppData/Local/Packages/Microsoft.MinecraftUWP_8wekyb3d8bbwe/LocalState/games/com.mojang/")
            },
            {
                type: "input",
                name: "mojangBetaPath",
                message: "Mojang Beta Path (must end with LocalState/games/com.mojang/):",
                default: path.join(os.homedir(), "AppData/Local/Packages/Microsoft.MinecraftUWP_8wekyb3d8bbwe/LocalState/games/com.mojang/")
            }
        ]).then((answers) => {
            try {
                fs.writeFileSync(buildConfigPath, JSON.stringify({...buildConfigData, ...answers}, null, 2), 'utf-8')
                console.log("build.config文件已更新。")
            } catch (error) {
                console.error("写入build.config文件时出错:", error)
            }
        })
    })

    program.parse(program.argv)
}

start()