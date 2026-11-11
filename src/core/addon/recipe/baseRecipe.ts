import { Serializer } from "../../../utils/index.js"
import { RecipeTypes } from "./data.js"

/** 配方书解锁条件：情境写成**单个对象**；按物品解锁写成 `{ item } | { tag }` 的**数组** */
export type RecipeUnlock =
    | { context: 'AlwaysUnlocked' | 'PlayerInWater' | 'PlayerHasManyItems' | 'None' }
    | ({ item: string } | { tag: string })[]

/** format_version ≥ 1.20 的有序 / 无序配方缺省写入的解锁条件 */
export const DEFAULT_RECIPE_UNLOCK: RecipeUnlock = { context: 'AlwaysUnlocked' }

/** 返回 `unlock` 的形状问题；合法时返回 `undefined` */
export function recipeUnlockProblem(unlock: unknown): string | undefined {
    if (Array.isArray(unlock)) {
        if (unlock.length === 0) return 'unlock 数组不能为空'
        const bad = unlock.find((u) => typeof u?.item !== 'string' && typeof u?.tag !== 'string')
        return bad ? `unlock 数组里只能放 { item } 或 { tag }，不能放 ${JSON.stringify(bad)}（{ context } 要写成单个对象）` : undefined
    }
    if (typeof (unlock as { context?: unknown })?.context === 'string') return undefined
    return `unlock 必须是 { context } 对象或 [{ item } | { tag }] 数组，实际为 ${JSON.stringify(unlock)}`
}

function versionAtLeast(version: string, major: number, minor: number): boolean {
    const [a = 0, b = 0] = String(version).split('.').map(Number)
    return a > major || (a === major && b >= minor)
}

export class AddonRecipe {
    format_version: string
    recipe_type: string
    definitions: Record<string, any>

    constructor(format_version: string, recipe_type: string, definitions: Record<string, any> = {}) {
        this.format_version = format_version;
        this.recipe_type = recipe_type;
        this.definitions = definitions;
    }

    getId(): string {
        return this.definitions.description.identifier;
    }

    identifier(identifier: string): this {
        this.definitions.description = { identifier };
        return this;
    }

    tags(tags: string[]): this {
        this.definitions.tags = tags;
        return this;
    }

    /**
     * 设置配方书解锁条件（format_version ≥ 1.20 的有序 / 无序配方必须有；不设时序列化写入 `{ context: 'AlwaysUnlocked' }`）。
     * @throws 形状不对时（例如把 `{ context }` 放进数组）
     */
    unlock(unlock: RecipeUnlock): this {
        const problem = recipeUnlockProblem(unlock)
        if (problem) throw new Error(`配方 ${this.definitions.description?.identifier ?? '?'}：${problem}`)
        this.definitions.unlock = unlock;
        return this;
    }

    @Serializer
    toObject(): Record<string, any> {
        const json: Record<string, any> = { format_version: this.format_version };
        const isCrafting = this.recipe_type === RecipeTypes.Shaped || this.recipe_type === RecipeTypes.Shapeless
        if (isCrafting && versionAtLeast(this.format_version, 1, 20) && this.definitions.unlock === undefined) {
            json[this.recipe_type] = { ...this.definitions, unlock: DEFAULT_RECIPE_UNLOCK };
        } else {
            json[this.recipe_type] = this.definitions;
        }
        return json;
    }
}
