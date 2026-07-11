export class AddonMenuCategory {
    category: string
    group?: string
    is_hidden_in_commands?: boolean

    constructor(category: string, group?: string, is_hidden?: boolean) {
        this.category = category;
        this.group = group;
        this.is_hidden_in_commands = is_hidden;
    }
}
