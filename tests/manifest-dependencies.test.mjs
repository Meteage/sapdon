// `build.config` 依赖的校验与规范化（`src/cli/meta/manifestDependencies.ts`，纯函数）：
//   `node tests/manifest-dependencies.test.mjs`（**需先 `tsc` 生成 `dist/`**）
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
    normalizeManifestDependencies,
    missingManifestDependencies,
} from '../dist/cli/meta/manifestDependencies.js'

const CORE_UUID = '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90'
const OWN_BP = '50fdcf07-ee56-441c-a82a-8a17d83a35cf'
const OWN_RP = '1bdbc903-e3ed-47c3-aca7-b204a2a56276'
const serverModule = { module_name: '@minecraft/server', version: '2.0.0' }

test('缺省 / null → 空列表', () => {
    assert.deepEqual(normalizeManifestDependencies(undefined), [])
    assert.deepEqual(normalizeManifestDependencies(null), [])
    assert.deepEqual(normalizeManifestDependencies([]), [])
})

test('脚本模块依赖原样透传（同一个对象 ⇒ 产物逐字节不变）', () => {
    const extra = { module_name: '@minecraft/server-ui', version: '2.1.0-beta', note: '保留未知字段' }
    const out = normalizeManifestDependencies([serverModule, extra])
    assert.equal(out[0], serverModule)
    assert.equal(out[1], extra)
})

test('包依赖：version 字符串 → 三段数组；数组保持；uuid 原样保留大小写', () => {
    const upper = CORE_UUID.toUpperCase()
    assert.deepEqual(
        normalizeManifestDependencies([{ uuid: upper, version: '1.2.0' }]),
        [{ uuid: upper, version: [1, 2, 0] }],
    )
    assert.deepEqual(
        normalizeManifestDependencies([{ uuid: CORE_UUID, version: [2, 0, 10] }]),
        [{ uuid: CORE_UUID, version: [2, 0, 10] }],
    )
})

test('模块依赖与包依赖可以混写，顺序保持', () => {
    const out = normalizeManifestDependencies([serverModule, { uuid: CORE_UUID, version: '1.0.0' }])
    assert.equal(out[0], serverModule)
    assert.deepEqual(out[1], { uuid: CORE_UUID, version: [1, 0, 0] })
})

test('非法输入一律抛错，且文案指向出错的下标', () => {
    const cases = [
        [{}, /必须是数组/],
        [['x'], /\[0\] 必须是对象/],
        [[null], /\[0\] 必须是对象/],
        [[{ version: '1.0.0' }], /\[0\] 必须且只能写/],
        [[{ module_name: '@minecraft/server', uuid: CORE_UUID, version: '1.0.0' }], /\[0\] 必须且只能写/],
        [[{ module_name: '', version: '1.0.0' }], /module_name 必须是非空字符串/],
        [[{ module_name: '@minecraft/server' }], /version 必须是非空字符串/],
        [[serverModule, { uuid: 'not-a-uuid', version: '1.0.0' }], /\[1\] 的 uuid 不是合法的 UUID/],
        [[{ uuid: CORE_UUID, version: '1.0' }], /三段非负整数/],
        [[{ uuid: CORE_UUID, version: '1.0.0-beta' }], /三段非负整数/],
        [[{ uuid: CORE_UUID, version: [1, -1, 0] }], /三段非负整数/],
        [[{ uuid: CORE_UUID, version: [1, 0.5, 0] }], /三段非负整数/],
        [[{ uuid: CORE_UUID }], /三段非负整数/],
    ]
    for (const [input, pattern] of cases) {
        assert.throws(() => normalizeManifestDependencies(input), pattern, JSON.stringify(input))
    }
})

test('拒绝依赖自身（不区分大小写）与重复的包依赖', () => {
    assert.throws(
        () => normalizeManifestDependencies([{ uuid: OWN_BP.toUpperCase(), version: '1.0.0' }], [OWN_BP, OWN_RP]),
        /依赖的是本项目自己/,
    )
    assert.throws(
        () => normalizeManifestDependencies([
            { uuid: CORE_UUID, version: '1.0.0' },
            { uuid: CORE_UUID.toUpperCase(), version: '1.1.0' },
        ]),
        /\[1\] 与前面的依赖重复/,
    )
})

test('missingManifestDependencies：只报「配置有、manifest 没有」的项', () => {
    const expected = normalizeManifestDependencies([serverModule, { uuid: CORE_UUID, version: '1.0.0' }])

    // manifest 里多出来的手写依赖（rp 的交叉依赖等）不算差异
    const complete = [
        { module_name: '@minecraft/server', version: '2.0.0' },
        { uuid: CORE_UUID.toUpperCase(), version: [1, 0, 0] },
        { uuid: OWN_RP, version: [1, 0, 0] },
    ]
    assert.deepEqual(missingManifestDependencies(expected, complete), [])

    // 字符串形式的 version 也认
    assert.deepEqual(
        missingManifestDependencies(expected, [serverModule, { uuid: CORE_UUID, version: '1.0.0' }]),
        [],
    )

    // 首次构建之后才加进配置的包依赖
    assert.deepEqual(missingManifestDependencies(expected, [serverModule]), [expected[1]])

    // 版本不同也算缺失
    assert.deepEqual(
        missingManifestDependencies(expected, [{ module_name: '@minecraft/server', version: '1.8.0' }, complete[1]]),
        [expected[0]],
    )

    // manifest 没有 dependencies 字段
    assert.deepEqual(missingManifestDependencies(expected, undefined), expected)
})
