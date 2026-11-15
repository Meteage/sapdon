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

    cp.execFileSync(process.execPath, args, {
        cwd: path.join(__dirname, '..', dir),
        stdio: 'inherit',
    })
}
