import { readFileSync } from "fs"
import { dirname } from "../utils.js"
import path from "path"
import fs from 'fs'
import { getGamePath } from '../meta/versionType.js'
import { getPackageJson } from "../meta/package.js"

export async function syncDevFilesServer(projectPath, projectName) {
    const buildConfig = JSON.parse(readFileSync(path.join(projectPath, "build.config")))
    const buildDir = path.join(projectPath, buildConfig.buildOptions.buildDir)
    const buildBehDirPath = path.join(buildDir, `${projectName}_BP`)
    const buildResDirPath = path.join(buildDir, `${projectName}_RP`)
    fs.cpSync(buildBehDirPath, path.join(getGamePath(), "development_behavior_packs/", `${projectName}_BP/`), { recursive: true, force: true })
    fs.cpSync(buildResDirPath, path.join(getGamePath(), "development_resource_packs/", `${projectName}_RP/`), { recursive: true, force: true })
}

export async function writeLib(projectPath) {
    const projectModules = path.join(projectPath, "node_modules")
    const rootDir = path.join(dirname(import.meta), '../')
    const corePath = path.join(rootDir, 'core')
    const cliPath = path.join(rootDir, 'cli')
    const ocPath = path.join(rootDir, 'oc')
    const targetCorePath = path.join(projectModules, '@sapdon/core')
    const targetCliPath = path.join(projectModules, '@sapdon/cli')
    const targetOcPath = path.join(projectModules, '@sapdon/oc')
    const packageJson = getPackageJson()

    fs.cpSync(corePath, targetCorePath, { recursive: true, force: true })
    fs.cpSync(cliPath, targetCliPath, { recursive: true, force: true })
    fs.cpSync(ocPath, targetOcPath, { recursive: true, force: true })

    fs.writeFileSync(path.join(targetCorePath, 'package.json'), JSON.stringify({
        name: '@sapdon/core',
        main: 'index.js',
        version: packageJson.version,
    }))
    fs.writeFileSync(path.join(targetCliPath, 'package.json'), JSON.stringify({
        name: '@sapdon/cli',
        main: 'index.js',
        version: packageJson.version,
    }))
    fs.writeFileSync(path.join(targetOcPath, 'package.json'), JSON.stringify({
        name: '@sapdon/oc',
        main: 'index.js',
        version: packageJson.version,
    }))
}

