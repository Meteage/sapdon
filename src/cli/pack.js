import path from 'path'
import fs from 'fs'
import archiver from 'archiver'
import { getBuildConfig } from './meta/buildConfig.js'
import { getProjectPath } from './init.js'

export const packProject = async (projectName) => {
    const projectPath = getProjectPath()
    const buildConfig = getBuildConfig()
    const buildDir = path.join(projectPath, buildConfig.buildOptions.buildDir)

    const bpPath = path.join(buildDir, `${projectName}_BP`)
    const rpPath = path.join(buildDir, `${projectName}_RP`)

    if (!fs.existsSync(bpPath) || !fs.existsSync(rpPath)) {
        console.error('构建输出目录不存在，请先运行 sapdon compile')
        return
    }

    const outputPath = path.join(buildDir, `${projectName}.mcaddon`)
    const output = fs.createWriteStream(outputPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', () => {
        console.log(`打包完成: ${outputPath} (${archive.pointer()} bytes)`)
    })

    archive.on('error', (err) => {
        throw err
    })

    archive.pipe(output)
    archive.directory(bpPath, `${projectName}_BP`)
    archive.directory(rpPath, `${projectName}_RP`)
    await archive.finalize()
}
