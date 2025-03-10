import fs from 'fs';
import lodash from 'lodash';
import { buildProject } from '../build.js';
const debounce = lodash.debounce;
export function hmr(projectPath, projectName) {
    // fs.watch(projectPath, { recursive: true }, debounce(async (eventType, filename) => {
    //     if (filename.endsWith('.js') || filename.endsWith('.ts')) {
    //         process.stdout.write(`File ${filename} changed, reloading...\r`)
    //         await buildProject(projectPath, projectName)
    //         console.log(`Reloaded ${filename}`)
    //     }
    // }), 1000)
}
