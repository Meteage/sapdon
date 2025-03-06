import path from 'path'
import { pathNotExist, readFile, generateUUID, saveFile, copyFileSync, copyFolder } from "./utils.js"
import { generateAddonClient } from './load.js'

import {
    AddonManifestHeader,
    AddonManifestModule,
    AddonManifest,
    AddonManifestMetadata
} from '../core/addon/manifest.js'

import { fileURLToPath } from 'url'
import fs from 'fs'
import { rollup } from 'rollup'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import ts from '@rollup/plugin-typescript'
import { typescriptPaths as paths } from 'rollup-plugin-typescript-paths'
import json from '@rollup/plugin-json'
import { visualizer } from 'rollup-plugin-visualizer'


// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

//读取配置文件
const pathConfig = JSON.parse(readFile(path.join(__dirname, "./build.config")))

//脚本打包器
export const scriptBundler = {
    __projectPath: path.join(__dirname, '../../'),

    js: (source, target) => {
        copyFolder(source, target)
    },

    //ts先通过rollup处理后再复制
    ts: async (source, target, tname='index.js', sname='index.ts') => {
        // console.log(source, target, tname)
        const tmpFile = path.join(scriptBundler.__projectPath, '.tmp', `sapdon-${crypto.randomUUID()}.js`)
        try {
            const bundle = await rollup({
                input: path.join(source, sname),
                plugins: [
                    paths(),
                    nodeResolve({
                        preferBuiltins: true
                    }),
                    ts({
                        tsconfig: path.join(scriptBundler.__projectPath, 'tsconfig.json'),
                    }),
                    commonjs(),
                    json(),
                    // visualizer({ open: true }),  //可视化分析, 打包出问题取消注释这一行
                ],
                external(id) {
                    return id.endsWith('GRegistry.js') || id.endsWith('UISystemRegistry.js')
                }
            })
    
            await bundle.write({
                file: tmpFile,
                format: 'esm',
            })
    
            bundle.close()
            fs.cpSync(tmpFile, path.join(target, tname))
        } catch (e) {
            console.error(e)
        } finally {
            fs.rmSync(tmpFile, {
                recursive: true,
                force: true
            })
        }
    }
}

async function bundleScripts(projectPath, scriptPath, element) {
    const sourcePath = path.join(projectPath, element.path)
    const elementType = element.type || 'js'

    scriptBundler.__projectPath = projectPath
    scriptBundler[elementType](sourcePath, scriptPath)
}

async function runScript(src) {
    if (src.endsWith('.ts')) {
        const randomName = crypto.randomUUID() + '.js'
        const sourceDir = path.dirname(src)
        const sourceFileName = src.replace(sourceDir, '')
        const targetFilePath = path.join(sourceDir, randomName)

        await scriptBundler.ts(sourceDir, sourceDir, randomName, sourceFileName)
        await import('file://' + targetFilePath)
        fs.rmSync(targetFilePath, { force: true })
        return
    }

    await import(src)
}

//构建项目
export const buildProject = async (projectPath, projectName) => {
    console.log("开始构建项目")
    console.log("项目路径：" + projectPath)
    //检查项目是否存在
    if (pathNotExist(projectPath)) {
        console.log("项目不存在")
        return
    }
    //检查项目是否有build.config文件
    if (pathNotExist(path.join(projectPath, "build.config"))) {
        console.log("项目没有build.config文件")
        return
    }

    //读取build.config文件
    const buildConfigPath = path.join(projectPath, "build.config")
    const buildConfig = JSON.parse(readFile(buildConfigPath))
    //console.log(buildConfig)

    //读取mod.info文件
    const modInfoPath = path.join(projectPath, "mod.info")
    const modInfo = JSON.parse(readFile(modInfoPath))
    const min_engine_version = versionStringToArray(modInfo.min_engine_version)

    const buildDirPath = path.join(projectPath, buildConfig.defaultConfig.buildDir)

    const buildBehDirPath = path.join(buildDirPath, `${projectName}_BP/`)
    const buildResDirPath = path.join(buildDirPath, `${projectName}_RP/`)
    //生成manifest.json文件
    //判断manifest.json是否已经生成过了，生成过了就不用生成
    const manifestPath = path.join(buildBehDirPath, "manifest.json")
    if (pathNotExist(manifestPath)) {
        const behManifest = generateBehManifest(
            modInfo.name,
            modInfo.description,
            modInfo.version,
            {
                min_engine_version: min_engine_version,
            },
            buildConfig.defaultConfig.dependencies,
            buildConfig.defaultConfig.scriptEntry
        )

        const resManifest = generateResManifest(
            modInfo.name,
            modInfo.description,
            modInfo.version,
            {
                min_engine_version: min_engine_version,
            },
            []
        )

        //BP
        saveFile(path.join(buildBehDirPath, "manifest.json"), behManifest)
        //RP
        saveFile(path.join(buildResDirPath, "manifest.json"), resManifest)
    }

    //复制pack_icon.png
    const packIconPath = path.join(projectPath, "pack_icon.png")

    copyFileSync(packIconPath, path.join(buildBehDirPath, "pack_icon.png"))
    copyFileSync(packIconPath, path.join(buildResDirPath, "pack_icon.png"))

    //复制文件夹
    const resources = buildConfig.resources
    resources.forEach(element => {
        const sourcePath = path.join(projectPath, element.path)
        copyFolder(sourcePath, buildResDirPath)
    })

    //复制scripts文件夹
    const scripts = buildConfig.scripts
    const scriptPath = path.join(buildBehDirPath, "scripts/")
    // scripts.forEach(element => {
    //     const sourcePath = path.join(projectPath, element.path)
    //     copyFolder(sourcePath, scriptPath)
    // })
    for (const element of scripts) {
        await bundleScripts(projectPath, scriptPath, element)
    }

    // 将 modPath 解析为绝对路径
    const absoluteModPath = path.join(projectPath, buildConfig.defaultConfig.buildEntry)

    // 将路径转换为 file:// URL
    // const fileUrl = pathToFileURL(absoluteModPath).href

    // 动态加载 JavaScript 文件
    // await import(fileUrl)
    await runScript(absoluteModPath)


    //只有当buildMode为development时才加载用户modjs文件
    if (buildConfig.defaultConfig.buildMode === "development") {
        //动态加载用户modjs文件
        await generateAddonClient(absoluteModPath, buildDirPath, projectName)
    }

    //延迟1s
    setTimeout(() => {
        //将编译好的文件夹拷贝至mc
        //console.log(path.join(pathConfig.mojangPath,`development_behavior_packs/${projectName}_BP/`))
        copyFolder(buildBehDirPath, path.join(pathConfig.mojangPath, "development_behavior_packs/", `${projectName}_BP/`))
        copyFolder(buildResDirPath, path.join(pathConfig.mojangPath, "development_resource_packs/", `${projectName}_RP/`))
    }, 1000)

}

function versionStringToArray(versionString) {
    // 使用 split 方法将字符串按 '.' 分割成数组
    const parts = versionString.split('.')

    // 使用 map 方法将每个部分转换为数字
    const versionArray = parts.map(part => Number(part))

    return versionArray
}

const generateBehManifest = (name, description, version, options = {}, dependencies = [], entry) => {
    console.log("开始生成behavior_packs/manifest.json")
    console.log("Entry:", entry)
    const header = new AddonManifestHeader(
        (name + "_BP"),
        description,
        versionStringToArray(version),
        generateUUID(),
        options
    )
    const module = new AddonManifestModule(
        "行为模块",
        "data",
        generateUUID(),
        versionStringToArray(version)
    )
    const script_module = new AddonManifestModule(
        "脚本模块",
        "script",
        generateUUID(),
        versionStringToArray(version)
    )
    if (entry) { script_module.entry = entry }

    const metadata = new AddonManifestMetadata(
        ["@sapdon"],
        "MIT",
        {
            "sapdon": ["1.0.0"]
        },
        "addon",
        "https://github.com/junjun260/sapdon"
    )

    const manifest = new AddonManifest(
        2,//格式版本
        header,
        [module, script_module],
        dependencies,
        null,
        metadata
    )

    return JSON.stringify(manifest, null, 2)
}

const generateResManifest = (name, description, version, options = {}, dependencies = []) => {
    const header = new AddonManifestHeader(
        (name + "_RP"),
        description,
        versionStringToArray(version),
        generateUUID(),
        options
    )
    const module = new AddonManifestModule(
        "资源模块",
        "resources",
        generateUUID(),
        versionStringToArray(version)
    )

    const metadata = new AddonManifestMetadata(
        ["@sapdon"],
        "MIT",
        {
            "sapdon": ["1.0.0"]
        },
        "addon",
        "https://github.com/junjun260/sapdon"
    )

    const manifest = new AddonManifest(
        2,//格式版本
        header,
        [module],
        [],
        null,
        metadata
    )

    return JSON.stringify(manifest, null, 2)
}