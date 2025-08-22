import { Entity, Player, world, ButtonState } from "@minecraft/server"
import { PlayerInputComponent } from "../../input/base.js"
import { utils } from "../utils.js"
import { Optional } from "../../../oc/optional.js"
import { getGameInstance } from "@sapdon/runtime/arch.js"

export class MinecraftPlayerInputComponent extends PlayerInputComponent<Entity> {
    private playerRef: Optional<Player> = Optional.none()

    static {
        world.afterEvents.playerButtonInput.subscribe(e => {
            const input = getGameInstance()?.getLevel()?.getManager(e.player.id).getComponentUnsafe(MinecraftPlayerInputComponent)
            input?.inputKey(e.button, e.newButtonState === ButtonState.Pressed)
        })
    }

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
        this.inputAxis('Movement', [ x, y ])
    }
}