import { world } from '@minecraft/server'
import {
    MinecraftMain,
    MinecraftGameInstance,
    MinecraftPlayerInputComponent,
    PlayerHudComponent,
    PlayerSpawned,
} from '@sapdon/runtime'

function green(str: string) {
    return `§a${str}`
}

function gray(str: string) {
    return `§7${str}`
}

@PlayerSpawned( // 写在这里面的类会在玩家生成时在被装饰的类之前实例化
    MinecraftPlayerInputComponent as any,
)
// 被 PlayerSpawned 装饰的类会在玩家生成时自动添加到玩家的组件列表中
export class InputDisplayComponent extends PlayerHudComponent {
    // 除非依赖的类实例化出错，否则 lazyGet 不会返回 null
    input = this.lazyGet(MinecraftPlayerInputComponent)

    render() {
        const input = this.input
        const [ x, y ] = (input.getAxis('LStick') as [number, number]) ?? [ 0, 0 ]
        const pressingSpace = input.getKeyPressing('Space')
        const pressingSneak = input.getKeyPressing('LShift')
        const d = x < 0 ? green('D') : gray('D')
        const a = x > 0 ? green('A') : gray('A')
        const w = y > 0 ? green('W') : gray('W')
        const s = y < 0 ? green('S') : gray('S')
        const space = pressingSpace ? green('space') : gray('space')
        const sneak = pressingSneak ? green('sneak') : gray('sneak')

        return `${sneak}    ${w}\n${space}  ${a}${s}${d}`
    }
}

@MinecraftMain
export class MainGame extends MinecraftGameInstance {
    afterStart(): void {
        world.afterEvents.itemUse.subscribe(() => {
            world.sendMessage(`Interacted`)
        })
    }
}