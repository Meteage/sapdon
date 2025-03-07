export class DataBinding {
    constructor() {
    }
    setBinding(binding) {
        if (!this.bindings)
            this.bindings = [];
        this.binding = binding;
        return this;
    }
    addDataBinding(dataBindingObject) {
        if (!this.bindings)
            this.bindings = [];
        this.bindings.push(dataBindingObject);
        return this;
    }
}
