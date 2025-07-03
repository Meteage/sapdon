import { Entity } from '@minecraft/server'
import {
    MinecraftMain,
    MinecraftGameInstance,
    EntitySpawned,
    CustomComponent,
    SpawnFilter,
} from '@sapdon/runtime'

@MinecraftMain
export class Main extends MinecraftGameInstance {
    afterStart(): void {
        
    }
}