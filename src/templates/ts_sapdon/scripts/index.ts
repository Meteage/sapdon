import {
    MinecraftMain,
    MinecraftGameInstance,
    registerBuiltinComponents,
} from '@sapdon/runtime'

import './custom_components/index.js'

registerBuiltinComponents()

@MinecraftMain
export class Main extends MinecraftGameInstance {
    
}