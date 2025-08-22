const rollup = require('rollup')
const { promisify } = require('util')
const sleep = promisify(setTimeout)

// 导入配置
const buildConfigs = require('./buildConfig.cjs')

// 任务列表 - 更清晰的命名
const tasks = [
    { name: 'Start', config: buildConfigs.startConfig },
    { name: 'CLI', config: buildConfigs.cliConfig },
    { name: 'Core', config: buildConfigs.coreConfig },
    { name: 'OC', config: buildConfigs.ocConfig },
    { name: 'Utils', config: buildConfigs.utilsConfig },
    { name: 'CLI Declarations', config: buildConfigs.cliDeclareConfig },
    { name: 'Core Declarations', config: buildConfigs.coreDeclareConfig },
    { name: 'OC Declarations', config: buildConfigs.ocDeclareConfig },
    { name: 'Utils Declarations', config: buildConfigs.utilsDeclareConfig },
]

// 带进度和错误处理的构建函数
async function runBuilds() {
    console.log('🚀 Starting Rollup builds...')
    console.log(`📦 Total tasks: ${tasks.length}`)
    
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < tasks.length; i++) {
        const { name, config } = tasks[i]
        
        try {
            console.log(`\n🔨 [${i + 1}/${tasks.length}] Building ${name}...`)
            
            const startTime = Date.now()
            const bundle = await rollup.rollup(config)
            await bundle.write(config.output)
            await bundle.close() // 重要：关闭 bundle 释放资源
            
            const endTime = Date.now()
            console.log(`✅ ${name} built successfully in ${endTime - startTime}ms`)
            successCount++
            
            // 可选：添加短暂延迟避免资源冲突
            if (i < tasks.length - 1) {
                await sleep(100)
            }
            
        } catch (error) {
            console.error(`❌ Failed to build ${name}:`, error.message)
            failCount++
            
            // 决定是否继续执行后续任务
            // 如果希望一个失败就停止，可以取消下面的 break
            // break;
        }
    }

    // 输出构建总结
    console.log('\n📊 Build Summary:')
    console.log(`✅ Successful: ${successCount}`)
    console.log(`❌ Failed: ${failCount}`)
    console.log(`📋 Total: ${tasks.length}`)
    
    if (failCount > 0) {
        process.exit(1) // 有失败时退出码为1
    }
}

// 添加错误处理
process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error)
    process.exit(1)
})

// 添加信号处理
process.on('SIGINT', () => {
    console.log('\nBuild process interrupted')
    process.exit(0)
})

runBuilds().catch(error => {
    console.error('Build process failed:', error)
    process.exit(1)
})