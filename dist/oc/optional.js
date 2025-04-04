export class Optional {
    value;
    static none() {
        return new Optional(null);
    }
    static some(value) {
        return new Optional(value);
    }
    constructor(value) {
        this.value = value;
    }
    unwrap() {
        if (!this.isEmpty()) {
            return this.value;
        }
        throw new Error('Optional is empty');
    }
    isEmpty() {
        return this.value === undefined || this.value === null;
    }
    orElse(other) {
        return this.value ?? other;
    }
    use(fn, self) {
        if (!this.isEmpty()) {
            fn.call(self, this.value);
            return true;
        }
        return false;
    }
}
