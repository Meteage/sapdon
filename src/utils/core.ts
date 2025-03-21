if (!Symbol.metadata) {
    //@ts-ignore
    Symbol.metadata = Symbol('[[metadata]]')
}

export function getMetadata(target: any): any {
    return target?.[Symbol.metadata]
}

export function getOrCreateMetadata(target: any) {
    if (target === undefined || target === null) {
        return undefined
    }

    const metadata = target?.[Symbol.metadata] ?? (target[Symbol.metadata] = {})
    return metadata
}