import { Serializer } from "../../../utils/index.js"

export class AddonAnimationController {
    format_version: string
    definition: AddonAnimationStateMachine

    constructor(format_version: string, definition: AddonAnimationStateMachine) {
        this.format_version = format_version;
        this.definition = definition;
    }

    @Serializer
    toObject(): Record<string, any> {
        return {
            format_version: this.format_version,
            ["animation_controllers"]: this.definition
        }
    }
}

export class AddonAnimationStateMachine {
    identifier: string
    namespace: string
    name: string
    initialState: string | null
    states: Map<string, { animations: string[]; transitions: Record<string, string>[] }>

    constructor(identifier: string) {
        this.identifier = identifier;
        this.namespace = identifier.split(":")[0];
        this.name = identifier.split(":")[1];
        this.initialState = null;
        this.states = new Map();
    }

    setInitialState(stateName: string): this {
        this.initialState = stateName;
        return this;
    }

    addState(stateName: string, animations: string[] = []): this {
        this.states.set(stateName, {
            animations: animations,
            transitions: []
        });
        return this;
    }

    addTransition(fromState: string, toState: string, condition: string): this {
        if (!this.states.has(fromState)) {
            throw new Error(`状态 "${fromState}" 不存在。`);
        }
        const state = this.states.get(fromState)!;
        state.transitions.push({
            [toState]: condition
        });
        return this;
    }

    @Serializer
    toObject(): Record<string, any> {
        return {
            [`controller.animation.${this.namespace}.${this.name}`]: {
                initial_state: this.initialState,
                states: Object.fromEntries(this.states)
            }
        };
    }
}
