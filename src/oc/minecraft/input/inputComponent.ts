import { InputButton, ButtonState as MCButtonState, Entity, Player } from "@minecraft/server"
import { PlayerInputComponent } from "../../input/base.js"
import { Minecraft } from "../decorator.js"
import { oc } from "../core.js"
import { Optional } from "../../../oc/optional.js"

@Minecraft
export class MinecraftPlayerInputComponent extends PlayerInputComponent<Entity> {
    private playerRef: Optional<Player> = Optional.none()

    onTick(): void {
        if (!this.playerRef) {
            this.getEntity().use(en => this.playerRef = oc.toPlayer(en))
        }

        this.syncAxisAndButtons()
    }

    syncAxisAndButtons() {
        this.playerRef.use(player => {
            const inputInfo = player.inputInfo
            const { x, y } = inputInfo.getMovementVector()
            this.inputAxis('LStick', [ x, y ])

            const JumpState = inputInfo.getButtonState(InputButton.Jump)
            const SneakState = inputInfo.getButtonState(InputButton.Sneak)

            this.inputKey('Space', JumpState === MCButtonState.Pressed)
            this.inputKey('LShift', SneakState === MCButtonState.Pressed)
        })
    }
}