import fs from 'fs'
import lodash from 'lodash'
import { buildProject } from '../build.js'
import { watchResourceDir } from '../res/server.js'
import { getBuildConfig } from '../meta/buildConfig.js'
import { syncDevFilesServer } from './syncFiles.js'
import path from 'path'

const debounce = lodash.debounce

export function hmr(projectPath, projectName) {
    const { buildDir, useHMR } = getBuildConfig().buildOptions
    watchResourceDir()
    if (useHMR) {
        fs.watch(projectPath, { recursive: true }, debounce(async (eventType, filename) => {
            if (!eventType || !filename) {
                return
            }

            if (
                filename.startsWith('.') ||
                filename.startsWith(path.join(buildDir, './'))
            ) {
                return
            }
    
            if (
                filename.endsWith('.js') ||
                filename.endsWith('.ts') ||
                filename === 'build.config' ||
                filename === 'mod.info'
            ) {
                process.stdout.write(`File ${filename} changed, reloading...\r`)
                await buildProject(projectPath, projectName)
                await syncDevFilesServer(projectPath, projectName)
                console.log(`Reloaded ${filename}`)
            }
        }), 1000)
    }
}