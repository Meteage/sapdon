/**
 * 发布拆分后的子包（顺序由 packages.json 决定：依赖在前）。
 *
 * 用法：
 *   node scripts/publish-packages.cjs --dry-run   # 先看每个包的 tarball
 *   node scripts/publish-packages.cjs             # 真正发布（需要 npm 登录 + 2FA）
 *
 * 伞包 `sapdon` 仍用 `npm run pub`（build 后发布根包）。
 */
const cp = require('child_process')
const path = require('path')

const manifest = require('../packages.json')
const packages = manifest.packages
    .filter((pkg) => pkg.publish)
    .map((pkg) => [`prod/${pkg.dir}`, pkg.name])

const dryRun = process.argv.includes('--dry-run')
// Node 24 起不能直接 execFile 一个 .cmd（不经过 shell），用 node + npm-cli.js 最稳
const npmCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')

for (const [dir, name] of packages) {
    console.log(`\n=== ${dryRun ? '[dry-run] ' : ''}publish ${name} (${dir}) ===`)
    const args = [npmCli, 'publish', '--access', 'public']
    if (dryRun) args.push('--dry-run')

    try {
        cp.execFileSync(process.execPath, args, {
            cwd: path.join(__dirname, '..', dir),
            stdio: 'inherit',
        })
    } catch (error) {
        const status = error.status ?? 1
        console.error(`\n[sapdon] 发布 ${name} 失败（exit ${status}），后续包已停止，不会出现「只发了一半」的供应链。`)

        if (status === 1) {
            console.error('[sapdon] 如果 npm 报 404：通常不是代码问题，而是 @sapdon scope 不存在或当前 token 没有该 scope 的发布权限。')
            console.error('[sapdon] 处理步骤：')
            console.error('[sapdon]   1) 打开 https://www.npmjs.com/org/create 创建名为 sapdon 的组织（免费，公开包）；')
            console.error('[sapdon]      如果 https://www.npmjs.com/org/sapdon 已被别人占用，需要改用别的 scope，先别继续。')
            console.error('[sapdon]   2) Access Tokens → Generate New Token → Packages and scopes 选 `@sapdon` → Read and write；')
            console.error('[sapdon]   3) 或直接 npm login（走浏览器/OTP），再重跑 npm run pub:packages。')
        }

        process.exit(status)
    }
}
