import fs from 'fs'
import lodash from 'lodash'
import { buildProject } from '../build.js'
import { watchResourceDir } from '../res/server.js'

const debounce = lodash.debounce

export function hmr(projectPath, projectName) {
    watchResourceDir()
    fs.watch(projectPath, { recursive: true }, debounce(async (eventType, filename) => {
        if (!eventType || !filename) {
            return
        }

        if (filename.startsWith('.')) {
            return
        }

        if (filename.endsWith('.js') || filename.endsWith('.ts')) {
            process.stdout.write(`File ${filename} changed, reloading...\r`)
            await buildProject(projectPath, projectName)
            console.log(`Reloaded ${filename}`)
        }
    }), 1000)
}