import { ConstructorOf } from './type.js'
import { isRawJSON } from './rawTypes.js'
import {
    getMetadata,
    getOrCreateMetadata,
} from "./core.js"


export interface ISerializer {
    (instance: any): object
}

const rawTypes = [
    'boolean', 'number'
]

const transferableTypes = [
    'string', 'undefined'
]

export function jsonEncoderReplacer(_: string, v: any) {
    const typeOf = typeof v
    if (typeOf === null) {
        return null
    }

    if (transferableTypes.includes(typeOf)) {
        return v
    }

    if (rawTypes.includes(typeOf)) {
        return JSON.rawJSON(v)
    }

    if (typeOf === 'object') {
        if (JSON.isRawJSON(v)) {
            return v
        }

        if (isRawJSON(v)) {
            // 字符串再包装一遍
            return JSON.rawJSON(v.rawJSON)
        }

        return v
    }

    if (typeOf === 'bigint') {
        return JSON.rawJSON(v.toString())
    }

    throw new Error('Unexpected value')
}

export const defaultSerializer: ISerializer = instance => {
    return structuredClone(instance)
}

const serializerSymbol = Symbol('serializer')
const serializerMapping = new WeakMap<ConstructorOf<any>, ISerializer>()

export function Serializable(serializer: ISerializer = defaultSerializer) {
    return (_: any, ctx: DecoratorContext) => {
        if (ctx.kind === 'class') {
            getOrCreateMetadata(ctx)[serializerSymbol] = serializer
            return
        }

        throw new Error('Serializable decorator can only be applied to classes')
    }
}

/**
 * 只能应用一个 Serializer
 * 
 * 重复的 Serializer 会被覆盖
 * @param target 
 * @param ctx 
 */
// export function Serializer(target: CallableFunction, ctx: DecoratorContext) {
//     if (ctx.kind !== 'method') {
//         throw new Error('Serializer decorator can only be applied to methods')
//     }

//     const ctor = Reflect.getPrototypeOf(target)?.constructor as ConstructorOf<any>
//     if (!ctor) {
//         throw new Error('Cannot serialize an instance of an anonymous class')
//     }

//     serializerMapping.set(ctor, target as ISerializer)
// }
export const Serializer: MethodDecorator = (target, prop) => {
    const ctor = target.constructor as ConstructorOf<any>
    if (!ctor) {
        throw new Error('Cannot serialize an instance of an anonymous class')
    }

    serializerMapping.set(ctor, (target as any)[prop] as ISerializer)
}

export function serialize<R, T extends object>(inst: T): R {
    const ctor = Reflect.getPrototypeOf(inst as T)?.constructor as ConstructorOf<T>
    if (!ctor) {
        throw new Error('Cannot serialize an instance of an anonymous class')
    }

    const serializer = <ISerializer> getMetadata(ctor)?.[serializerSymbol]
        ?? serializerMapping.get(ctor)
        ?? defaultSerializer
    return serializer.call(inst, inst) as R
}

export const jsonEncodeDecoder: EncodeDecoder<any, string> = {
    encode(value: any) {
        return JSON.stringify(value, jsonEncoderReplacer)
    },
    decode: JSON.parse
}

export function encode<Base, Trans>(value: Base, encodeDecoder: EncodeDecoder<Base, Trans> = jsonEncodeDecoder as any): Trans {
    return encodeDecoder.encode(value)
}

export function decode<Trans, Base>(value: Trans, encodeDecoder: EncodeDecoder<Base, Trans> = jsonEncodeDecoder as any): Base {
    return encodeDecoder.decode(value)
}

export interface EncodeDecoder<Base, Trans> {
    encode: (data: Base) => Trans
    decode: (chunk: Trans) => Base
}