import path from "path"
import { getProjectPath } from "../init.js"
import fs from "fs"
import { cacheSync } from "@sapdon/utils/cache.js"
import { parseJsonWithComments } from "../utils.js"

interface BuildDependency {
    module_name: string
    version: string
}

export interface BuildConfig {
    formatVersion: number
    buildOptions: {
        useHMR: boolean
        buildMode: 'development' | 'production'
        buildEntry: string
        scriptEntry: string
        scriptOutput: string
        useJs: boolean
        buildDir: string
        dependencies: BuildDependency[]
        resource: {
            path: string
            resourceHints: boolean
        }
    }
    versionType: 'release' | 'beta'
}

export function getBuildConfig(): BuildConfig {
    const pwd = getProjectPath()
    const configFile = path.join(pwd, 'build.config')

    if (!fs.existsSync(configFile)) {
        throw new Error('未找到项目配置文件，请先初始化项目')
    }

    return cacheSync<BuildConfig>(
        configFile,
        file => parseBuildConfig(file)
    )
}

export function transferV1ToV2({ defaultConfig, resources, scripts }: any) {
    const buildConfig: BuildConfig = {
        formatVersion: 2,
        buildOptions: {
            useHMR: true,
            buildMode: 'development',
            buildEntry: defaultConfig.buildEntry,
            scriptEntry: defaultConfig.scriptEntry,
            scriptOutput: defaultConfig.scriptEntry.replace('.ts', '.js'),
            useJs: scripts[0].type === 'ts' ? false : true,
            buildDir: defaultConfig.buildDir,
            dependencies: defaultConfig.dependencies,
            resource: {
                path: resources[0].path,
                resourceHints: true
            }
        },
        versionType: 'release'
    }

    return buildConfig
}

function parseBuildConfig(file: any) {
    const obj = parseJsonWithComments(fs.readFileSync(file) as any)

    if (obj.formatVersion === 2) {
        return obj as BuildConfig
    }

    const upgratedConfig = transferV1ToV2(obj)
    fs.writeFileSync(file, JSON.stringify(upgratedConfig, null, 2))

    return upgratedConfig
}