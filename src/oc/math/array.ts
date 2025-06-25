export class ArrayEx extends Array {
    constructor(init?: number[]) {
        super()
        if (Array.isArray(init)) {
            this.set(init)
        }
    }

    set(arr: Iterable<number>) {
        let i = 0
        for (const el of arr) {
            this[i] = el
            i++
        }
    }
}