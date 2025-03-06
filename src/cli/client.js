import { port } from './server.js'

export async function cliRequest(path, ...params) {
    try {
        await fetch(`http://localhost:${port}/${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        })
    } catch (error) {
        console.error('尝试在构建脚本中使用 server.startDevServer() 启动开发服务器')
    }
}

async function writeAddon(modPath, buildPath, projectName) {
    await cliRequest('write-addon', modPath, buildPath, projectName)
}

export const client = {
    writeAddon
}