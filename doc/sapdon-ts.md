# sapdon with typescript
在使用脚手架创建项目时，默认使用的语言将会是 `ts`

但这并不意味着你需要手动去调整 tsconfig 和打包工具，我们提供了一套默认能用的ts设置

## 和 js 版本相比有什么区别？
ts版本拥有更好的类型提示，更严格的类型检查，也可以直接使用node_modules里的库（只能是js/ts）

## 听起来太酷了我们开始吧！
比如我们需要注册一个物品，可能你会想去找它在哪，但在ts版本中，你只需要 `@sapdon/core` 就可以了

```ts
import { ItemAPI } from '@sapdon/core'
```

如果你需要更高级的功能，比如你需要一个ts打包器，或者添加命令行的功能，你可以使用 `@sapdon/cli`

## 从js迁移到ts
js 的 `main.mjs` 包含了一些预定义的代码：
```js
import { registry } from '@sapdon/core'

// 进行注册后需进行一次提交, 通知开发服务器更新文件
registry.setup()
```
如果需要从js迁移到ts，删除 `startDevServer` 那行即可（不删也没事）


## OC (Object - Component)
sapdon通过 `@sapdon/oc` 为sapi提供了一些高级功能, 比如:
- 实体组件系统
- 组件间通信

传统的书写方式是通过事件和tick回调来实现功能, 而OC提供了更适合游戏的组件化开发方式

```ts
import { world, system } from '@minecraft/server'
import { oc, CustomComponent } from '@sapdon/oc'

world.afterEvents.worldInitialize.subscribe(oc.start)

class MyComponent extends CustomComponent {
    onTick() {
        world.sendMessage('tick')
    }
}
```

是的, 我们得到了一个MyComponent, 它每刻都会给玩家发送 'tick'
但是如果你进入游戏, 会发现它毫无作用, 没错! 因为我们还没有把它到绑定在实体身上!

```ts
const manager = oc.addEntity(id)
manager.attachComponent(new MyComponent())
```

这样就可以了, 我们已经把MyComponent绑定到了entityId为id的实体身上

你也可以动态增删改查组件! 这很方便!

如果你想看它到底是怎么回事,可以从 `examples/oc-core` 开始了解

## [Object - Component](./oc/index.md)
关于 `@sapdon/oc` 的一切