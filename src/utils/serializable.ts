import { getMetadata, getOrCreateMetadata } from "./core.js"
import { ConstructorOf } from "./type.js"

export interface ISerializer<T> {
    (instance: any): T
}

export namespace Serializer {
    export const json: ISerializer<string> = (instance: any) => {
        return JSON.stringify(instance)
    }

    export const jsonDev: ISerializer<string> = (instance: any) => {
        return JSON.stringify(instance, null, 2)
    }
}

const serializerSymbol = Symbol('serializer')

export function Serializable(serializer: ISerializer<any> = Serializer.json) {
    return (_: any, ctx: DecoratorContext) => {
        if (ctx.kind === 'class') {
            getOrCreateMetadata(ctx)[serializerSymbol] = serializer
            return
        }

        throw new Error('Serializable decorator can only be applied to classes')
    }
}

export function serialize<R, T extends object>(inst: T) {
    const ctor = Reflect.getPrototypeOf(inst as T)?.constructor as ConstructorOf<T>
    if (!ctor) {
        throw new Error('Cannot serialize an instance of an anonymous class')
    }

    const serializer = <ISerializer<R>> getMetadata(ctor)?.[serializerSymbol] ?? Serializer.jsonDev
    return serializer?.(
        (inst as any).toJson ? (inst as any).toJson() : inst
    )
}