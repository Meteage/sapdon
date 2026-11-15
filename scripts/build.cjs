const cp = require('child_process')
const { default: ora } = require('ora')
const fs = require('fs/promises') // 使用 promises API 实现更好的异步处理
const path = require('path')

const spinner = ora('正在构建...').start()
const args = process.argv.slice(2)
const DETAILED_LOGS = args.includes('verbose')  // 详细日志
const KEEP_DIST = args.includes('keep')         // 保留dist目录

// 将 src/templates 拷贝到 prod/templates，随包发布供 create 命令使用
async function copyTemplates() {
  spinner.text = '正在拷贝模板...'
  const src = path.join(__dirname, '../src/templates')
  const dest = path.join(__dirname, '../prod/templates')
  await fs.rm(dest, { recursive: true, force: true })
  await fs.cp(src, dest, { recursive: true })
}

// 更好的错误处理，包含更多上下文信息
// 给 prod 下的每个子包写 package.json（版本与根包锁步）。
// `sapdon lib` 在同步时也会重写，但发布 tar 包里不能缺这些文件。
async function writePackageJsons() {
  const pkg = JSON.parse(await fs.readFile(path.join(__dirname, '../package.json'), 'utf8'))
  const manifest = JSON.parse(await fs.readFile(path.join(__dirname, '../packages.json'), 'utf8'))

  for (const item of manifest.packages) {
    const dependencies = Object.fromEntries(
      (item.dependencies ?? []).map((name) => [name, pkg.version])
    )
    const entry = {
      name: item.name,
      type: 'module',
      main: 'index.js',
      types: 'index.d.ts',
      version: pkg.version,
    }
    if (Object.keys(dependencies).length > 0) entry.dependencies = dependencies

    await fs.writeFile(
      path.join(__dirname, '../prod', item.dir, 'package.json'),
      JSON.stringify(entry, null, 2)
    )
  }
}

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
    await build('cmd', 'npx tsc-alias', '路径别名解析')
    await build('file', './scripts/buildTask.cjs', '生产环境构建')
    spinner.text = '正在写子包 package.json...'
    await writePackageJsons()
    await copyTemplates()
    
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