// 包清单（packages.json）与 CLI 的 lib 同步清单必须一致：
//   `npx tsc && npx tsc-alias && node tests/packages-manifest.test.mjs`
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..')
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'packages.json'), 'utf8'))

const { LIB_PACKAGES } = await import('../dist/cli/dev-server/libPlan.js')

test('LIB_PACKAGES 与 packages.json 里 lib:true 的条目一致（防漂移）', () => {
    const byName = (list) => [...list].sort((a, b) => a.name.localeCompare(b.name))
    const expected = byName(manifest.packages
        .filter((pkg) => pkg.lib)
        .map((pkg) => ({ name: pkg.name, target: pkg.target, sources: pkg.sources })))

    assert.deepEqual(
        byName(LIB_PACKAGES.map((pkg) => ({ name: pkg.name, target: pkg.target, sources: pkg.sources }))),
        expected
    )
})

test('发布顺序满足「依赖先于使用者」', () => {
    const seen = new Set()
    for (const pkg of manifest.packages.filter((entry) => entry.publish)) {
        for (const dependency of pkg.dependencies ?? []) {
            assert.ok(seen.has(dependency), `${pkg.name} 依赖 ${dependency}，后者必须排在前面`)
        }
        seen.add(pkg.name)
    }
})

test('每个包都有 src/<dir>/<sourceEntry>', () => {
    for (const pkg of manifest.packages) {
        const entry = path.join(repoRoot, 'src', pkg.dir, pkg.sourceEntry)
        assert.ok(fs.existsSync(entry), `${pkg.name} 缺入口：src/${pkg.dir}/${pkg.sourceEntry}`)
    }
})
