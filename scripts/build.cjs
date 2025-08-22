const cp = require('child_process')
const { default: ora } = require('ora')
const fs = require('fs/promises') // 使用 promises API 实现更好的异步处理
const path = require('path')

const spinner = ora('正在构建...').start()
const args = process.argv.slice(2)
const DETAILED_LOGS = args.includes('verbose')  // 详细日志
const KEEP_DIST = args.includes('keep')         // 保留dist目录

// 更好的错误处理，包含更多上下文信息
class BuildError extends Error {
  constructor(message, taskName) {
    super(message)
    this.taskName = taskName
    this.name = 'BuildError'
  }
}

/**
 * 执行构建任务，具有适当的错误处理
 */
async function build(type, execStr, taskName = execStr) {
  spinner.text = `正在运行 \u001b[32m${taskName}\u001b[0m`
  
  return new Promise((resolve, reject) => {
    let child

    try {
      if (type === 'file') {
        child = cp.spawn('node', ['--no-warnings', execStr])
      } else {
        child = cp.exec(execStr)
      }

      let stderrData = ''

      child.stderr.on('data', data => {
        stderrData += data.toString()
        if (DETAILED_LOGS) {
          process.stderr.write(data.toString())
        }
      })

      child.stdout.on('data', data => {
        if (DETAILED_LOGS) {
          process.stdout.write(data.toString())
        }
      })

      child.on('exit', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new BuildError(
            `任务 "${taskName}" 失败，退出代码 ${code}\n${stderrData}`,
            taskName
          ))
        }
      })

      child.on('error', (error) => {
        reject(new BuildError(
          `任务 "${taskName}" 遇到错误: ${error.message}\n${stderrData}`,
          taskName
        ))
      })

    } catch (error) {
      reject(new BuildError(
        `启动任务 "${taskName}" 失败: ${error.message}`,
        taskName
      ))
    }
  })
}

async function startBuild() {
  try {
    //await build('cmd', 'tsc --declaration --emitDeclarationOnly')
    await build('cmd', 'tsc', 'TypeScript 编译')
    await build('cmd', 'tsc-alias', '路径别名解析')
    await build('file', './scripts/buildTask.cjs', '生产环境构建')
    
    if (!KEEP_DIST) {
      spinner.text = '正在清理...'
      try {
        await fs.rm(path.join(__dirname, '../dist'), { 
          recursive: true, 
          force: true 
        })
      } catch (error) {
        spinner.warn(`清理失败: ${error.message}`)
      }
    }
    
    spinner.succeed('构建成功!')
    
  } catch (error) {
    spinner.fail(error.message)
    process.exit(1) // 退出并返回错误代码
  }
}

// 处理进程终止
process.on('SIGINT', () => {
  spinner.stop()
  process.exit(0)
})

startBuild()