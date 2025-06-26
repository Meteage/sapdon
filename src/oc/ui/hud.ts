import { CustomComponent } from "../core.js"
import { Optional } from "../optional.js"

export abstract class HudComponent<Actor, Hud> extends CustomComponent<Actor> {
    hud?: Hud
    actor = Optional.none<Actor>()
    abstract render(): Hud
    abstract draw(): void

    onTick(dt: number): void {
        this.hud = this.render()
        this.draw()
    }
}