import { Entity, world } from '@minecraft/server'
import {
    BaseComponent,
    ComponentManager,
    oc,
    InputChangeState,
    Optional,
    PlayerInputCompatibilityComponent
} from '@sapdon/oc'

// 开启oc
// 只有oc启用时, 才能使用oc相关的功能
world.afterEvents.worldInitialize.subscribe(() => {
    oc.start()
})

// 监听玩家生成/离开服务器
// 加入服务器时, 创建对应的oc entity
world.afterEvents.playerSpawn.subscribe(({ player }) => {
    const manager = oc.addEntity(player.id)
    // 给玩家添加组件, 顺序会影响效果
    manager.attachComponent(
        new PlayerInputCompatibilityComponent(),
        // 需要手动创建 `JumpCounterComponent` 的原因是 `DoubleJumpComponent` 依赖 `JumpCounterComponent`
        new JumpCounterComponent(),
        new DoubleJumpComponent()
    )
})

// 离开服务器时, 自动销毁对应的oc实体
world.afterEvents.playerLeave.subscribe(({ playerId }) => {
    oc.removeEntity(playerId)
})

/**
 * 跳跃计数器组件, 用于记录玩家的跳跃次数
 */
class JumpCounterComponent extends BaseComponent {

    public enabled = true
    public jumpCount = 0

    reset() {
        this.jumpCount = 0
        this.enabled = true
    }

    // 玩家的input组件 (需要在添加玩家entity时手动创建这个组件)
    protected playerInput = Optional.none<PlayerInputCompatibilityComponent>()

    onAttach(manager: ComponentManager) {
        // 依赖 `PlayerInputCompatibilityComponent`, 但是不需要创建新的 `PlayerInputCompatibilityComponent`
        this.playerInput = manager.getComponent(PlayerInputCompatibilityComponent)
    }

    // 每个tick都会调用这个方法
    onTick(): void {
        // 组件被禁用时, 不再响应
        if (!this.enabled) {
            return
        }
        // 因为 `PlayerInputCompatibilityComponent` 一定会创建, 所以这里一定有值
        const input = this.playerInput.unwrap()
        if (input.Jump === InputChangeState.Press) {
            // 每次按下会使跳跃计数器加1
            this.jumpCount++
        }
    }
}

// 二段跳组件, 用于实现二段跳效果
class DoubleJumpComponent extends BaseComponent {
    // 借助 `JumpCounterComponent` 的计数来简单获得二段跳输入
    protected jumpCounter = Optional.none<JumpCounterComponent>()

    onAttach(manager: ComponentManager) {
        // 依赖 `JumpCounterComponent`, 但是不需要创建新的 `JumpCounterComponent`
        this.jumpCounter = manager.getComponent(JumpCounterComponent)
    }

    onTick(manager: ComponentManager, en: Optional<Entity>): void {
        // 这里不需要 Player 也可以使用 applyKnockback() 方法
        const entity = en.unwrap()
        // 因为 `JumpCounterComponent` 不一定会创建, 所以这里使用 `use()` 方法避免TypeError
        this.jumpCounter.use(counter => {
            if (counter.jumpCount < 2) {
                return
            }
    
            // 清空跳跃计数
            counter.jumpCount = 0
    
            // 二段跳效果
            entity.applyKnockback(0, 0, 0, 1)
            // 二段跳粒子效果
            entity.dimension.spawnParticle(
                'minecraft:dragon_death_explosion_emitter',
                entity.location
            )

            // 在执行完成后, 禁用 `JumpCounterComponent` 避免继续计数
            // 这里使用 `afterTick()` 方法避免在 `onTick()` 方法中修改组件数据导致后续组件无法正常工作
            manager.afterTick(() => {
                this.jumpCounter.use(counter => counter.enabled = false)
            })
        })

        // 玩家在地面上时, 重新启用 `JumpCounterComponent`
        if (entity.isOnGround) {
            this.jumpCounter.use(counter => counter.reset())
        }
    }
}