import { InputButton, ButtonState as MCButtonState, Entity, Player } from "@minecraft/server"
import { PlayerInputComponent } from "../../input/base.js"
import { utils } from "../utils.js"
import { Optional } from "../../../oc/optional.js"

export class MinecraftPlayerInputComponent extends PlayerInputComponent<Entity> {
    private playerRef: Optional<Player> = Optional.none()

    onTick(): void {
        if (this.playerRef.isEmpty()) {
            this.getEntity().use(en => this.playerRef = utils.toPlayer(en))
        } else {
            this.syncAxisAndButtons()
        }
    }

    syncAxisAndButtons() {
        const player = this.playerRef.unwrap()
        const inputInfo = player.inputInfo
        const { x, y } = inputInfo.getMovementVector()
        this.inputAxis('LStick', [ x, y ])

        const JumpState = inputInfo.getButtonState(InputButton.Jump)
        const SneakState = inputInfo.getButtonState(InputButton.Sneak)

        this.inputKey('Space', JumpState === MCButtonState.Pressed)
        this.inputKey('LShift', SneakState === MCButtonState.Pressed)
    }
}