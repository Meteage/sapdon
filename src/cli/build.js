import path from 'path'
import { pathNotExist, readFile, generateUUID, saveFile, copyFileSync, copyFolder } from "./utils.js"
import { generateAddon } from './load.js'

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
import terser from '@rollup/plugin-terser'

import { syncDevFilesServer } from './dev-server/syncFiles.js'
import cp from 'child_process'
import { server, startDevServer } from './dev-server/index.js'
import { GRegistryServer } from '../core/registry.js'
import { getBuildConfig } from './meta/buildConfig.js'
import { getBuildDirBp, getProjectPath } from './init.js'


// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

//读取配置文件
// const pathConfig = JSON.parse(readFile(path.join(__dirname, "./build.config")))

const rollupIgnores = [
    'rollup',
    'typescript',
    '@sapdon/core',
    '@sapdon/cli',
    '@minecraft',
]

//脚本打包器
export const scriptBundler = {
    js: async (source, target, sourcemap) => {
        const buildConfig = getBuildConfig()
        try {
            const bundle = await rollup({
                input: source,
                plugins: [
                    nodeResolve({
                        preferBuiltins: true
                    }),
                    //@ts-ignore
                    commonjs(),
                    //@ts-ignore
                    json(),
                    // visualizer({ open: true }),  //可视化分析, 打包出问题取消注释这一行
                    ...(buildConfig.buildOptions.buildMode === 'development' ? [] : [
                        terser(),
                    ]),
                ],
                external(name) {
                    for (const candidate of rollupIgnores) {
                        if (name.includes(candidate)) {
                            return true
                        }
                    }
                    return false
                }
            })
    
            await bundle.write({
                file: target,
                format: 'esm',
                sourcemap,
            })
    
            bundle.close()
        } catch (e) {
            console.error(e)
        }
    },

    //ts先通过rollup处理后再复制
    ts: async (source, target, sourcemap) => {
        const projectPath = getProjectPath()
        const buildConfig = getBuildConfig()
        const targetOpt = {
            file: target,
            format: 'esm',
            sourcemap,
        }

        try {
            const bundle = await rollup({
                input: source,
                plugins: [
                    paths(),
                    nodeResolve({
                        preferBuiltins: true
                    }),
                    //@ts-ignore
                    ts({
                        tsconfig: path.join(projectPath, 'tsconfig.json'),
                        compilerOptions: { outDir: path.dirname(targetOpt.file) },
                    }),
                    //@ts-ignore
                    commonjs(),
                    //@ts-ignore
                    json(),
                    // visualizer({ open: true }),  //可视化分析, 打包出问题取消注释这一行
                    ...(buildConfig.buildOptions.buildMode === 'development' ? [] : [
                        terser(),
                    ]),
                ],
                external(name) {
                    for (const candidate of rollupIgnores) {
                        if (name.includes(candidate)) {
                            return true
                        }
                    }
                    return false
                }
            })

            await bundle.write(targetOpt)
    
            bundle.close()
        } catch (e) {
            console.error(e)
        }
    },

    any: async (a, b) => {
        const buildConfig = getBuildConfig()
        buildConfig.buildOptions.useJs
            ? await scriptBundler.js(a, b)
            : await scriptBundler.ts(a, b)
    },
}

async function bundleScripts(useJs=false) {
    const elementType = useJs ? 'js' : 'ts'
    const projectPath = getProjectPath()
    const buildConfig = getBuildConfig()
    const { scriptEntry, scriptOutput, buildMode } = buildConfig.buildOptions
    scriptBundler[elementType](
        path.join(projectPath, scriptEntry),
        path.join(getBuildDirBp(), scriptOutput),
        buildMode === 'development' ? true : false
    )
}

async function runOnChild(targetFilePath) {
    const { promise, resolve } = Promise.withResolvers()
    cp.fork(targetFilePath, { stdio: 'inherit' }).on('exit', resolve)
    return promise
}

async function runScript(src) {
    const randomName = '.' + crypto.randomUUID() + '.js'
    const targetFilePath = path.join(path.dirname(src), '.tmp', randomName)

    await scriptBundler.any(src, targetFilePath)
    try {
        await runOnChild(targetFilePath)
    } catch (e) {
        console.error(e)
    } finally {
        fs.rmSync(targetFilePath, { force: true })
    }
    return
}

export function projectCanBuild(projectPath) {
    console.log("开始构建项目")
    console.log("项目路径：" + projectPath)
    //检查项目是否存在
    if (pathNotExist(projectPath)) {
        console.log("项目不存在")
        return false
    }
    //检查项目是否有build.config文件
    if (pathNotExist(path.join(projectPath, "build.config"))) {
        console.log("项目没有build.config文件")
        return false
    }

    return true
}

//构建项目
/**
 * `server`
 * 
 * 在使用前使用 `projectCanBuild` 确保项目可以构建
 * @param {string} projectPath 
 * @param {string} projectName 
 */
export const buildProject = async (projectPath, projectName) => {
    //读取build.config文件
    const buildConfig = getBuildConfig()
    //读取mod.info文件
    const modInfoPath = path.join(projectPath, "mod.info")
    const modInfo = JSON.parse(readFile(modInfoPath))
    const min_engine_version = versionStringToArray(modInfo.min_engine_version)

    const buildDirPath = path.join(projectPath, buildConfig.buildOptions.buildDir)
    const buildBehDirPath = path.join(buildDirPath, `${projectName}_BP/`)
    const buildResDirPath = path.join(buildDirPath, `${projectName}_RP/`)

    const absoluteModPath = path.join(projectPath, buildConfig.buildOptions.buildEntry)

    if (!server.isListening()) {
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
                buildConfig.buildOptions.dependencies,
                buildConfig.buildOptions.scriptOutput
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

        // 现在只有一个resource
        const resource = buildConfig.buildOptions.resource
        const sourcePath = path.join(projectPath, resource.path)
        copyFolder(sourcePath, buildResDirPath)

        // 在客户端启动前启动服务器
        startDevServer()
        GRegistryServer.startServer()
        server.handle('submit', () => {
            //只有当buildMode为development时才加载用户modjs文件
            if (buildConfig.buildOptions.buildMode === "development") {
                //动态加载用户modjs文件
                generateAddon(absoluteModPath, buildDirPath, projectName)
            }
        })
    }

    // buildEntry (有可能生成ts或js文件, 所以需要先编译)
    await runScript(absoluteModPath)
    // scriptEntry
    await bundleScripts(buildConfig.buildOptions.useJs)
    await syncDevFilesServer(projectPath, projectName)
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
