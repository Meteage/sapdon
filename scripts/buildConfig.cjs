const path = require('path')
const commonjs = require('@rollup/plugin-commonjs')
const { nodeResolve } = require('@rollup/plugin-node-resolve')
const json = require('@rollup/plugin-json')
const { dts } = require('rollup-plugin-dts')
const terser = require('@rollup/plugin-terser')
const fs = require('fs')

const packageInfo = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json')))
const deps = Object.keys(Object.assign({}, packageInfo.dependencies, packageInfo.devDependencies))

// ── 跨包外部化 ───────────────────────────────────────────────────────────────
// `tsc-alias` 会把 @sapdon/utils 之类的别名改写成相对路径（dist/core/../utils/...）。
// 打包单个包时，这些相对引用必须**换成裸包名**并保持 external，否则：
//   ① core 与 ui 各打一份 utils → GRegistry / Serializer 变成两份状态，UI 文件会丢；
//   ② core 与 ui 各打一份彼此 → 同一界面出现两个注册表。
// `output.paths` 负责把 dist/utils、dist/ui 的绝对路径映射回 `@sapdon/...` 裸包名。
const asPosix = (id) => id.replace(/\\/g, '/')

function isFromDist(dir, id) {
    return asPosix(id).includes(`/dist/${dir}/`)
}

function resolvePackagePath(id) {
    const posix = asPosix(id)
    // 用「同级包」相对路径：安装后 node_modules/@sapdon/core/index.js → ../utils/index.js
    // 正好解析到 node_modules/@sapdon/utils/index.js；仓库内的 prod/core → prod/utils 同样成立。
    // utils 是单入口包（prod/utils 只有 index.js / index.d.ts），所有子模块都收敛到入口。
    if (posix.includes('/dist/utils/')) return '../utils/index.js'
    if (posix.includes('/dist/ui/')) return '../ui/index.js'
    return id
}

/**
 * @type {import('rollup').RollupOptions}
 */
const startConfig = {
    input: path.join(__dirname, '../dist/cli/start.js'),
    output: {
        file: './prod/cli/start.js',
        format: 'esm'
    },
    plugins: [
        nodeResolve({
            preferBuiltins: true
        }),
        commonjs(),
        json(),
        terser(),
    ],
    external(name) {
        return deps.includes(name)
    }
}

/**
 * @type {import('rollup').RollupOptions}
 */
const cliConfig = {
    input: './dist/cli/index.js',
    output: {
        file: './prod/cli/index.js',
        format: 'esm'
    },
    plugins: [
        nodeResolve({
            preferBuiltins: true
        }),
        commonjs(),
        json(),
        terser(),
    ],
    external(name) {
        return deps.includes(name)
    }
}

/**
 * @type {import('rollup').RollupOptions}
 */
const coreConfig = {
    input: './dist/core/index.js',
    output: {
        file: './prod/core/index.js',
        format: 'esm',
        paths: resolvePackagePath,
        // 相对 import 被 external 时不要改写成相对输出路径，否则会变成 ./@sapdon/...
        makeAbsoluteExternalsRelative: false,
    },
    plugins: [
        nodeResolve({
            preferBuiltins: true
        }),
        commonjs(),
        json(),
        terser(),
    ],
    external(id) {
        // utils 与 ui 各自是独立包：core 只保留裸包名引用
        return isFromDist('utils', id) || isFromDist('ui', id)
    }
}


/**
 * @type {import('rollup').RollupOptions}
 */
const uiConfig = {
    input: './dist/ui/index.js',
    output: {
        file: './prod/ui/index.js',
        format: 'esm',
        paths: resolvePackagePath,
        makeAbsoluteExternalsRelative: false,
    },
    plugins: [
        nodeResolve({
            preferBuiltins: true
        }),
        commonjs(),
        json(),
        terser(),
    ],
    external(id) {
        // ui 只依赖 utils（注册表 + 序列化），后者是独立包
        return isFromDist('utils', id)
    }
}


/**
 * @type {import('rollup').RollupOptions}
 */
const ocConfig = {
    input: './dist/oc/index.js',
    output: {
        file: './prod/oc/index.js',
        format: 'esm'
    },
    plugins: [
        nodeResolve({
            preferBuiltins: true
        }),
        commonjs(),
        json(),
        terser(),
    ]
}


/**
 * @type {import('rollup').RollupOptions}
 */
const utilsConfig = {
    input: './dist/utils/index.js',
    output: {
        file: './prod/utils/index.js',
        format: 'esm'
    },
    plugins: [
        nodeResolve({
            preferBuiltins: true
        }),
        commonjs(),
        json(),
        terser(),
    ]
}

/**
 * @type {import('rollup').RollupOptions}
 */
const cliDeclareConfig = {
    input: './src/cli/index.js',
    output: {
        file: './prod/cli/index.d.ts',
        format: 'esm'
    },
    plugins: [
        dts()
    ]
}

/**
 * @type {import('rollup').RollupOptions}
 */
const coreDeclareConfig = {
    input: './src/core/index.js',
    output: {
        file: './prod/core/index.d.ts',
        format: 'esm'
    },
    plugins: [
        dts()
    ]
}

/**
 * @type {import('rollup').RollupOptions}
 */
const uiDeclareConfig = {
    input: './src/ui/index.ts',
    output: {
        file: './prod/ui/index.d.ts',
        format: 'esm'
    },
    plugins: [
        dts()
    ]
}

/**
 * @type {import('rollup').RollupOptions}
 */
const ocDeclareConfig = {
    input: './src/oc/index.ts',
    output: {
        file: './prod/oc/index.d.ts',
        format: 'esm'
    },
    plugins: [
        dts()
    ]
}

/**
 * @type {import('rollup').RollupOptions}
 */
const utilsDeclareConfig = {
    input: './src/utils/index.ts',
    output: {
        file: './prod/utils/index.d.ts',
        format: 'esm'
    },
    plugins: [
        dts()
    ]
}

module.exports = {
    startConfig,
    cliConfig,
    coreConfig,
    uiConfig,
    ocConfig,
    utilsConfig,
    cliDeclareConfig,
    coreDeclareConfig,
    uiDeclareConfig,
    ocDeclareConfig,
    utilsDeclareConfig
}