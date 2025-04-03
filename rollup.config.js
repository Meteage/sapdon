import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import ts from '@rollup/plugin-typescript'
import { typescriptPaths as paths } from 'rollup-plugin-typescript-paths'
import json from '@rollup/plugin-json'
import dts from 'rollup-plugin-dts'
// import terser from '@rollup/plugin-terser'

export default [
    {
        input: './src/core/index.js',
        output: {
            file: './dist/core/index.js',
            format: 'esm'
        },
        plugins: [
            paths(),
            nodeResolve({
                preferBuiltins: true
            }),
            ts(),
            commonjs(),
            json(),
            // terser(),
        ]
    },
    {
        input: './src/cli/index.js',
        output: {
            file: './dist/cli/index.js',
            format: 'esm'
        },
        plugins: [
            paths(),
            nodeResolve({
                preferBuiltins: true
            }),
            ts(),
            commonjs(),
            json(),
            // terser(),
        ]
    },
    {
        input: './src/core/index.js',
        output: {
            file: './dist/core/index.d.ts',
            format: 'esm'
        },
        plugins: [
            dts()
        ]
    },
    {
        input: './src/cli/index.js',
        output: {
            file: './dist/cli/index.d.ts',
            format: 'esm'
        },
        plugins: [
            dts()
        ]
    },
    {
        input: './src/cli/start.js',
        output: {
            file: './dist/cli/start.js',
            format: 'esm',
        },
        plugins: [
            paths(),
            ts(),
            commonjs(),
            json(),
            // terser(),
        ],
    },
    {
        input: './src/oc/index.ts',
        output: {
            file: './dist/oc/index.js',
            format: 'esm'
        },
        plugins: [
            paths(),
            nodeResolve({
                preferBuiltins: true
            }),
            ts(),
            commonjs(),
            json(),
            // terser(),
        ],
        external: [
            /\@minecraft/,
        ]
    },
    {
        input: './src/oc/index.ts',
        output: {
            file: './dist/oc/index.d.ts',
            format: 'esm'
        },
        plugins: [
            dts()
        ],
        external: [
            /\@minecraft/,
        ]
    },
]