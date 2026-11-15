/**
 * 发布拆分后的子包（顺序由 packages.json 决定：依赖在前）。
 *
 * 用法：
 *   node scripts/publish-packages.cjs --dry-run          # 先看每个包的 tarball
 *   node scripts/publish-packages.cjs --otp=123456       # 带 2FA 验证码发布
 *   node scripts/publish-packages.cjs                    # 已登录且无需 OTP 时
 *
 * 已发布过的版本会自动跳过，所以中途 OTP 过期时可以重跑续发。
 * 伞包 `sapdon` 仍用 `npm run pub`（build 后发布根包）。
 */
const cp = require('child_process')
const fs = require('fs')
const path = require('path')

const manifest = require('../packages.json')
const packages = manifest.packages
    .filter((pkg) => pkg.publish)
    .map((pkg) => [`prod/${pkg.dir}`, pkg.name])

const dryRun = process.argv.includes('--dry-run')
const otp = process.argv.find((arg) => arg.startsWith('--otp='))?.slice('--otp='.length)
// Node 24 起不能直接 execFile 一个 .cmd（不经过 shell），用 node + npm-cli.js 最稳
const npmCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')

/** 该版本是否已经在 npm 上（用于中断后重跑续发） */
function isPublished(name, version) {
    try {
        const out = cp.execFileSync(
            process.execPath,
            [npmCli, 'view', `${name}@${version}`, 'version'],
            { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
        )
        return out.trim() === version
    } catch {
        return false
    }
}

for (const [dir, name] of packages) {
    const pkgJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', dir, 'package.json'), 'utf8'))
    const version = pkgJson.version

    if (!dryRun && isPublished(name, version)) {
        console.log(`\n=== 跳过 ${name}@${version}（已发布）===`)
        continue
    }

    console.log(`\n=== ${dryRun ? '[dry-run] ' : ''}${dryRun ? 'pack' : 'publish'} ${name}@${version} (${dir}) ===`)
    // dry-run 用 `npm pack --dry-run`：只看 tarball，不碰 registry（publish --dry-run 会因版本已存在而失败）
    const args = dryRun
        ? [npmCli, 'pack', '--dry-run']
        : [npmCli, 'publish', '--access', 'public', ...(otp ? [`--otp=${otp}`] : [])]

    try {
        cp.execFileSync(process.execPath, args, {
            cwd: path.join(__dirname, '..', dir),
            stdio: 'inherit',
        })
    } catch (error) {
        const status = error.status ?? 1
        console.error(`\n[sapdon] 发布 ${name} 失败（exit ${status}），后续包已停止，不会出现「只发了一半」的供应链。`)

        if (status === 1) {
            console.error('[sapdon] 如果 npm 报 EOTP：把 6 位验证码带上重跑，已发布的包会自动跳过：')
            console.error('[sapdon]   npm run pub:packages -- --otp=123456')
            console.error('[sapdon] 如果 npm 报 404：通常不是代码问题，而是 @sapdon scope 不存在或 token 没有该 scope 的写权限。')
            console.error('[sapdon]   1) 确认 https://www.npmjs.com/org/sapdon 存在且你是 owner；')
            console.error('[sapdon]   2) Access Tokens → 该 token 的 Packages and scopes 需包含 `@sapdon`、权限 Read and write；')
            console.error('[sapdon]   3) 或直接 npm login（走浏览器/OTP）后重跑。')
        }

        process.exit(status)
    }
}
