import {
    MinecraftMain,
    MinecraftGameInstance,
    registerBuiltinComponents,
} from '@sapdon/runtime'

registerBuiltinComponents()

@MinecraftMain
export class Main extends MinecraftGameInstance {
    
}