import { StartupEvent } from '@minecraft/server'
import {
    oc,
    GameInstance,
} from '@sapdon/oc'

@GameInstance
export class MainGame implements GameInstance {
    onStart(ev: StartupEvent): void { }

    shutdown(): void { }

}