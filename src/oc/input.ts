import { ButtonState, Entity, InputButton, world } from '@minecraft/server'
import { BaseComponent, ComponentManager } from './core.js'
import { oc } from './core.js'
import { Optional } from './optional.js'

export enum InputChangeState {
    Press,
    Release,
    None,
}

/**
 * `@minecraft/server` version 2.0.0-beta
 * 低于此版本请不要使用此组件
 */
export class PlayerInputComponent extends BaseComponent {
    ;[InputButton.Jump] = InputChangeState.None
    ;[InputButton.Sneak] = InputChangeState.None

    static setup() {
        world.afterEvents.playerButtonInput.subscribe(e => {
            const manager = oc.getManager(e.player.id)
            const playerInput = manager.getComponent(PlayerInputComponent)
            playerInput.use(playerInput => {
                playerInput[e.button] = e.newButtonState === ButtonState.Pressed? InputChangeState.Press : InputChangeState.Release
                manager.afterTick(() => {
                    playerInput[e.button] = InputChangeState.None
                })
            })
        })
    }
}

/**
 * `@minecraft/server` version 1.17.0-beta
 * 有 1tick 延迟
 * 条件允许请使用 `PlayerInputComponent`
 */
export class PlayerInputCompatibilityComponent extends BaseComponent {
    ;[InputButton.Jump] = InputChangeState.None
    ;[InputButton.Sneak] = InputChangeState.None

    private _lastJump: ButtonState = ButtonState.Released
    private _lastSneak: ButtonState = ButtonState.Released

    onTick(manager: ComponentManager, en: Optional<Entity>): void {
        const player = oc.toPlayer(
            en.unwrap()
        ).unwrap()

        const jump = player.inputInfo.getButtonState(InputButton.Jump)
        const sneak = player.inputInfo.getButtonState(InputButton.Sneak)

        if (jump === ButtonState.Pressed && this._lastJump === ButtonState.Released) {
            this[InputButton.Jump] = InputChangeState.Press
        } else if (jump === ButtonState.Released && this._lastJump === ButtonState.Pressed) {
            this[InputButton.Jump] = InputChangeState.Release
        } else {
            this[InputButton.Jump] = InputChangeState.None
        }

        if (sneak === ButtonState.Pressed && this._lastSneak === ButtonState.Released) {
            this[InputButton.Sneak] = InputChangeState.Press
        } else if (sneak === ButtonState.Released && this._lastSneak === ButtonState.Pressed) {
            this[InputButton.Sneak] = InputChangeState.Release
        } else {
            this[InputButton.Sneak] = InputChangeState.None
        }

        this._lastJump = jump
        this._lastSneak = sneak
    }
}