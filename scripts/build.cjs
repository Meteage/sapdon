const cp = require('child_process')
const { default: ora } = require('ora')
const fs = require('fs')
const path = require('path')

const spinner = ora('building...').start()
const args = process.argv.slice(2)
const DETAILED_LOGS = args.includes('verbose')

/**
 * 
 * @param {'file'|'cmd'} type 
 * @param {string} execStr 
 * @returns 
 */
async function build(type, execStr, taskName) {
    spinner.text = `Running \u001b[32m${taskName ?? execStr}\u001b[0m`
    const { promise, resolve, reject } = Promise.withResolvers()

    let child

    if (type === 'file') {
        child = cp.spawn('node', [ '--no-warnings', execStr ])
    } else {
        child = cp.exec(execStr)
    }

    child.stderr.on('data', data => {
        // throw data.toString()
    })

    if (DETAILED_LOGS) {
        child.stdout.on('data', data => {
            console.log(data.toString())
        })
    }

    child.on('exit', resolve)
    child.on('error', reject)
    return promise
}

async function startBuild() {
    await build('cmd', 'tsc')
    await build('cmd', 'tsc-alias')
    await build('file', './scripts/buildTask.cjs', 'build production')
    if (!args.includes('keep')) {
        spinner.text = 'Cleaning up...'
        fs.rmSync(path.join(__dirname, '../dist'), { recursive: true, force: true })
    }
    spinner.stop()
    console.log('\u001b[32mBuild successful!\u001b[0m')
}

startBuild()