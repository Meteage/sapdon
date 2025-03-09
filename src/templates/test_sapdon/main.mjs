import { startDevServer } from '@sapdon/cli'
import { GRegistry, UISystemRegistry } from '@sapdon/core'

// 开启开发服务器, 不开启开发服务器无法使用文件同步和热更新
startDevServer(GRegistry, UISystemRegistry)
// 通知父进程初始化完成, 否则父进程会杀死这个子进程
process.send('initialized')