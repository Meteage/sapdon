import { startDevServer } from '@sapdon/cli'
import { GRegistry, UISystemRegistry } from '@sapdon/core'

// 开启开发服务器, 不开启开发服务器无法使用文件同步和热更新
startDevServer(GRegistry, UISystemRegistry)