# `@sapdon/cli` 包

## 自定义处理器
```ts
import { devServer } from '@sapdon/cli'
devServer.handle('ping', () => {
    console.log('pong')
})
```

## 拦截cli处理器
```ts
import { devServer, ServerHandles } from '@sapdon/cli'

devServer.interceptHandler(ServerHandles.WRITE_ADDON, handler => {
    return (...args: any[]) => {
        const now = peformance.now()
        handler.apply(args)
        const dt = peformance.now() - now
        console.log(`执行耗时 ${dt}ms.`)
    }
})
```

