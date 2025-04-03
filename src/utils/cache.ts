const caches = new Map<string, any>()

export async function cache<T>(
    uri: string,
    setter: (uri: string, resolve: (value: T) => void, reject: (reason: any) => void) => void
): Promise<T> | never {
    const { promise, resolve, reject } = Promise.withResolvers<T>()
    if (caches.has(uri)) {
        resolve(caches.get(uri))
        return promise
    }

    setter(uri, resolve, reject)
    const result = await promise
    caches.set(uri, result)
    return result
}

export function cacheSync<T>(
    uri: string,
    setter: (uri: string) => T
): T | never {
    let value: T = caches.get(uri) as T

    if (value) {
        return value
    }

    value = setter(uri)
    caches.set(uri, value)
    return value as T
}

export function clearCache(uri: string) {
    caches.delete(uri)
}

export function updateCache<Old, New=Old>(uri: string, updater: (old: Old) => New) {
    const old = caches.get(uri)
    if (old) {
        const newValue = updater(old)
        if (old !== newValue) {
            caches.set(uri, newValue)
        }

        return newValue
    }
}