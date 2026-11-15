const path = require('path')
const commonjs = require('@rollup/plugin-commonjs')
const { nodeResolve } = require('@rollup/plugin-node-resolve')
const json = require('@rollup/plugin-json')
const { dts } = require('rollup-plugin-dts')
const terser = require('@rollup/plugin-terser')
const fs = require('fs')

const packageInfo = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json')))
const deps = Object.keys(Object.assign({}, packageInfo.dependencies, packageInfo.devDependencies))

// 包清单的单一事实来源：scripts/（构建/发布）与 src/cli（lib 同步）都读它。
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../packages.json')))
const packageByName = new Map(manifest.packages.map((pkg) => [pkg.name, pkg]))

const asPosix = (id) => id.replace(/\\/g, '/')

/**
 * 一个包的跨包依赖目录，如 core → ['utils']。
 * 打包时这些依赖保持 external，并用 `../<dir>/index.js` 的同级引用，
 * 安装后正好落到 node_modules/@sapdon/<依赖>/index.js。
 */
function dependencyDirs(pkg) {
    return pkg.dependencies
        .map((name) => packageByName.get(name)?.dir)
        .filter(Boolean)
}

/** 生成一个库包的 bundle 配置（输入 dist/<dir>，输出 prod/<dir>） */
function makeBundleConfig(pkg) {
    const dirs = dependencyDirs(pkg)
    const isExternal = (id) => dirs.some((dir) => asPosix(id).includes(`/dist/${dir}/`))
    const resolvePath = (id) => {
        const posix = asPosix(id)
        for (const dir of dirs) {
            if (posix.includes(`/dist/${dir}/`)) return `../${dir}/index.js`
        }
        return id
    }

    return {
        input: `./dist/${pkg.dir}/index.js`,
        output: {
            file: `./prod/${pkg.dir}/index.js`,
            format: 'esm',
            ...(dirs.length > 0
                ? { paths: resolvePath, makeAbsoluteExternalsRelative: false }
                : {}),
        },
        plugins: [
            nodeResolve({ preferBuiltins: true }),
            commonjs(),
            json(),
            terser(),
        ],
        ...(dirs.length > 0 ? { external: isExternal } : {}),
    }
}

/** 生成一个库包的 d.ts 配置（输入 src/<dir>/<sourceEntry>） */
function makeDeclareConfig(pkg) {
    return {
        input: `./src/${pkg.dir}/${pkg.sourceEntry}`,
        output: {
            file: `./prod/${pkg.dir}/index.d.ts`,
            format: 'esm',
        },
        plugins: [dts()],
    }
}

const taskName = (pkg) => (pkg.dir === 'oc' ? 'Runtime' : pkg.dir === 'ui' ? 'UI' : pkg.dir[0].toUpperCase() + pkg.dir.slice(1))

const bundledPackages = manifest.packages.filter((pkg) => pkg.bundle)

const bundleConfigs = {}
const declareConfigs = {}
const bundleTasks = []
const declareTasks = []

for (const pkg of bundledPackages) {
    const bundle = makeBundleConfig(pkg)
    const declare = makeDeclareConfig(pkg)
    bundleConfigs[`${pkg.dir}Config`] = bundle
    declareConfigs[`${pkg.dir}DeclareConfig`] = declare
    bundleTasks.push({ name: taskName(pkg), config: bundle })
    declareTasks.push({ name: `${taskName(pkg)} Declarations`, config: declare })
}

/** CLI 有两个入口（start.js / index.js），单独维护 */
const startConfig = {
    input: path.join(__dirname, '../dist/cli/start.js'),
    output: {
        file: './prod/cli/start.js',
        format: 'esm',
    },
    plugins: [
        nodeResolve({ preferBuiltins: true }),
        commonjs(),
        json(),
        terser(),
    ],
    external(name) {
        return deps.includes(name)
    },
}

const cliConfig = {
    input: './dist/cli/index.js',
    output: {
        file: './prod/cli/index.js',
        format: 'esm',
    },
    plugins: [
        nodeResolve({ preferBuiltins: true }),
        commonjs(),
        json(),
        terser(),
    ],
    external(name) {
        return deps.includes(name)
    },
}

const cliDeclareConfig = {
    input: './src/cli/index.js',
    output: {
        file: './prod/cli/index.d.ts',
        format: 'esm',
    },
    plugins: [dts()],
}

module.exports = {
    startConfig,
    cliConfig,
    cliDeclareConfig,
    ...bundleConfigs,
    ...declareConfigs,
    bundleTasks,
    declareTasks,
}
