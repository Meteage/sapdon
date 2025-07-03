const path = require('path')
const commonjs = require('@rollup/plugin-commonjs')
const { nodeResolve } = require('@rollup/plugin-node-resolve')
const json = require('@rollup/plugin-json')
const { dts } = require('rollup-plugin-dts')
const terser = require('@rollup/plugin-terser')
const fs = require('fs')

const packageInfo = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json')))
const deps = Object.keys(Object.assign({}, packageInfo.dependencies, packageInfo.devDependencies))

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
    ocConfig,
    utilsConfig,
    cliDeclareConfig,
    coreDeclareConfig,
    ocDeclareConfig,
    utilsDeclareConfig
}