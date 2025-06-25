import { world } from '@minecraft/server'

function assertInMinecraft() {
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

export const MinecraftMethod = (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    return {
        ...descriptor,
        get() {
            assertInMinecraft()
            return target[propertyKey]
        }
    }
}