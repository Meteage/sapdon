const isOptional = Symbol('isOptional')

export class Optional<T = any> {

    static none<T>(): Optional<T> {
        return new Optional(null as T)
    }

    static some<T>(value?: T): Optional<T> {
        return new Optional(value) as Optional<T>
    }

    constructor(
        private value: T,
    ) {}

    private [isOptional] = isOptional

    unwrap(): T {
        if (!this.isEmpty()) {
            return this.value
        }

        throw new Error('Optional is empty')
    }

    isEmpty(): boolean {
        return this.value === undefined || this.value === null
    }

    orElse(other: T): T {
        return this.value ?? other
    }

    use<R=any>(fn: (v: T) => R, self?: any): R extends Optional ? R : Optional<R> {
        if (!this.isEmpty()) {
            const result = fn.call(self, this.value)
            //@ts-ignore
            return result[isOptional] ? result : Optional.some(fn.call(self, this.value))
        }

        return Optional.none() as any
    }
}