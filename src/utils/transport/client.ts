import { encode } from '../index.js'

const DEFAULT_PORT = 49037

function getDevPort(): number {
  const envPort = process.env.SAPDON_DEV_SERVER_PORT
  return envPort ? parseInt(envPort, 10) : DEFAULT_PORT
}

/**
 * 把构建数据 POST 给 CLI 的 dev server。
 *
 * - 连不上（直接跑 `node main.mjs`，没有 dev server）→ 打日志后返回，保持脚本可单独执行
 * - 连上了但处理失败（非 2xx）→ **抛错**，让子进程退出码非 0，构建不会假装成功
 */
export async function transportPost(path: string, ...params: any[]) {
  const port = getDevPort()
  let res: Response
  try {
    res = await fetch(`http://localhost:${port}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: encode(params),
    })
  } catch (error) {
    console.error(error)
    console.error('Dev server not running. Start it with server.startDevServer() or `sapdon build`.')
    return
  }

  if (!res.ok) {
    throw new Error(`Dev server 处理 /${path} 失败：HTTP ${res.status}`)
  }
}
