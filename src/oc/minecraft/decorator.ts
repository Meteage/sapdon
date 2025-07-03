import { Entity, Player, world } from '@minecraft/server'
import { GameInstance, getGameInstance } from '../arch.js'
import { utils } from './utils.js'
import { ComponentCtor } from '../core.js'
import { getMetadata, getOrCreateMetadata } from '../../utils/core.js'

export function assertInMinecraft() {
    if (!world) {
        throw new Error('Not running in the Minecraft host environment. required @minecraft/server')
    }
}

export const Minecraft: ClassDecorator = (target: any) => {
    return new Proxy(target, {
        construct(t: any, args: any[]) {
            assertInMinecraft()
            return Reflect.construct(t, args)
        }
    })
}

export const MinecraftMain = (target: any) => {
    assertInMinecraft()
    GameInstance(target)
    utils.start()

    //初始化组件，省去多余的初始化步骤
    world.afterEvents.playerSpawn.subscribe(ev => getGameInstance()?.getLevel().getManager(ev.player.id).attachComponent(...dedup(playerSpawnComponents).filter(c => getMetadata(c)?.spawnFilter?.(ev.player) ?? true).map(c => Reflect.construct(c, []))))
    world.afterEvents.entitySpawn.subscribe(ev => {
        if (ev.entity.typeId === 'minecraft:player') {
            return
        }

        getGameInstance()?.getLevel().getManager(ev.entity.id).attachComponent(...dedup(entitySpawnComponents).filter(c => getMetadata(c)?.spawnFilter?.(ev.entity) ?? true).map(c => Reflect.construct(c, [])))
    })
}

function dedup<T>(arr: T[]) {
    return Array.from(new Set(arr))
}

const playerSpawnComponents: ComponentCtor<Player>[] = []
const entitySpawnComponents: ComponentCtor<Entity>[] = []

export const PlayerSpawned = (...deps: ComponentCtor<Player>[]) => (target: any) => {
    playerSpawnComponents.push(...deps, target)
}

export const EntitySpawned = (...deps: ComponentCtor<Player>[]) => (target: any) => {
    entitySpawnComponents.push(...deps, target)
}

export const ActorSpawned = (...deps: ComponentCtor<Player>[]) => (target: any) => {
    playerSpawnComponents.push(...deps, target)
    entitySpawnComponents.push(...deps, target)
}

export const SpawnFilter = (filter: (entity: Entity) => boolean) => (target: any) => {
    const metadata = getOrCreateMetadata(target)
    metadata.spawnFilter = filter
}