const { argv } = require('process')
const rollup = require('rollup')
const {
    startConfig,
    cliConfig,
    coreConfig,
    ocConfig,
    utilsConfig,
    cliDeclareConfig,
    coreDeclareConfig,
    ocDeclareConfig,
    utilsDeclareConfig,
} = require('./buildConfig.cjs')

const tasks = [
    startConfig,
    cliConfig,
    coreConfig,
    ocConfig,
    utilsConfig,
    cliDeclareConfig,
    coreDeclareConfig,
    ocDeclareConfig,
    utilsDeclareConfig,
]

async function runBuilds() {
    for (const task of tasks) {
        const bundle = await rollup.rollup(task)
        await bundle.write(task.output)
    }
}

runBuilds()