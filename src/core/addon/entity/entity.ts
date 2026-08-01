import { Serializer } from "../../../utils/index.js"

export class AddonEntity {
    format_version: string
    definitions: AddonEntityDefinition

    constructor(format_version: string, definitions: AddonEntityDefinition) {
        this.format_version = format_version;
        this.definitions = definitions;
    }

    @Serializer
    toObject(): Record<string, any> {
        const description: Record<string, any> = {
            identifier: this.definitions.description.identifier,
            is_spawnable: this.definitions.description.is_spawnable,
            is_summonable: this.definitions.description.is_summonable,
        };

        if (this.definitions.description.runtime_identifier) {
            description.runtime_identifier = this.definitions.description.runtime_identifier;
        }

        if (this.definitions.description.properties && Object.keys(this.definitions.description.properties).length > 0) {
            description.properties = this.definitions.description.properties;
        }

        return {
            format_version: this.format_version,
            ["minecraft:entity"]: {
                description,
                components: this.definitions.components,
                component_groups: this.definitions.component_groups,
                events: this.definitions.events,
            }
        };
    }
}

export class AddonEntityDefinition {
    description: AddonEntityDescription
    components: Record<string, any>
    component_groups: Record<string, any>
    events: Record<string, any>

    constructor(description: AddonEntityDescription, components: Record<string, any> = {}, component_groups: Record<string, any> = {}, events: Record<string, any> = {}) {
        this.description = description;
        this.components = components;
        this.component_groups = component_groups;
        this.events = events;
    }
}

export class AddonEntityDescription {
    identifier: string
    is_spawnable: boolean
    is_summonable: boolean
    properties: Record<string, any>
    runtime_identifier?: string

    constructor(identifier: string, is_spawnable: boolean = false, is_summonable: boolean = false, properties: Record<string, any> = {}, runtime_identifier?: string) {
        this.identifier = identifier;
        this.is_spawnable = is_spawnable;
        this.is_summonable = is_summonable;
        this.properties = properties;
        this.runtime_identifier = runtime_identifier;
    }
}
