# sapdon with typescript
在使用脚手架创建项目时，默认使用的语言将会是 `ts`

但这并不意味着你需要手动去调整 tsconfig 和打包工具，我们提供了一套默认能用的ts设置

## 和 js 版本相比有什么区别？
ts版本拥有更好的类型提示，更严格的类型检查，也可以直接使用node_modules里的库（只能是js/ts）

## 听起来太酷了我们开始吧！
比如我们需要注册一个物品，可能你会想去找它在哪，但在ts版本中，你只需要 `@sapdon/core` 就可以了

```ts
import { ItemAPI } from '@sapdon/core.js'
```

如果你需要更高级的功能，比如你需要一个ts打包器，或者添加命令行的功能，你可以使用 `@sapdon/cli`

## 从js迁移到ts
js 的 `main.mjs` 包含了一些预定义的代码：
```js
import { startDevServer } from '@sapdon/cli'
import { GRegistry, UISystemRegistry } from '@sapdon/core'

// 开启开发服务器, 不开启开发服务器无法使用文件同步和热更新
startDevServer(GRegistry, UISystemRegistry)
```
如果需要从js迁移到ts，删除 `startDevServer` 那行即可（不删也没事）

