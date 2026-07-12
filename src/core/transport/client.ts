import { encode } from '../../utils/index.js'

const DEFAULT_PORT = 49037

function getDevPort(): number {
  const envPort = process.env.SAPDON_DEV_SERVER_PORT
  return envPort ? parseInt(envPort, 10) : DEFAULT_PORT
}

export async function transportPost(path: string, ...params: any[]) {
  try {
    const port = getDevPort()
    await fetch(`http://localhost:${port}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: encode(params)
    })
  } catch (error) {
    console.error(error)
    console.error('Dev server not running. Start it with server.startDevServer() or `sapdon build`.')
  }
}
