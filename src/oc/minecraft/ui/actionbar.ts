import { Player } from "@minecraft/server"
import { utils } from "../utils.js"
import { HudComponent } from '../../ui/hud.js'

export abstract class PlayerHudComponent extends HudComponent<Player, string> {
    abstract render(): string

    draw(): void {
        if (this.actor.isEmpty()) {
            this.actor = utils.toPlayer(this.getEntity().unwrap())
            return
        }

        const player = this.actor.unwrap()
        player.runCommand(`title @s actionbar ${this.hud}`)
    }
}