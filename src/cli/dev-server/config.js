/**
 * Dev Server 端口。
 *
 * ⚠️ 必须与 `src/core/transport/client.ts` 的解析规则保持一致：
 *    客户端那侧读 `SAPDON_DEV_SERVER_PORT`，服务端若硬编码 49037，
 *    一旦设了环境变量就会出现「客户端 POST 到 A 端口、服务端监听 B 端口」的静默失联。
 *
 * 用途：多个 sapdon 构建并行（多 agent / 多项目同时构建）时靠它避开 EADDRINUSE ——
 * 端口被占时 server.ts 会直接 exit 1（「已被其他 sapdon 进程占用」）。
 */
const DEFAULT_PORT = 49037

function resolvePort() {
    const envPort = process.env.SAPDON_DEV_SERVER_PORT
    const parsed = envPort ? parseInt(envPort, 10) : NaN
    return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PORT
}

export const devServerConfig = {
    port: resolvePort(),
}
