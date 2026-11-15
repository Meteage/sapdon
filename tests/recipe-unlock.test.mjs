// 1.20+ 合成配方的 unlock（`src/core/addon/recipe/baseRecipe.ts`）：
//   `node tests/recipe-unlock.test.mjs`（**需先 `tsc && tsc-alias` 生成 `dist/`**）
//
// 真机：format_version ≥ 1.20 的有序 / 无序配方没有 unlock ⇒ `1.20+ Recipes require unlock data`，整条配方不加载；
// unlock 写成 `[{ context }]` ⇒ `Recipe ingredient is invalid` + `invalid unlock ingredient`。见 known-pitfalls §1.8。
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { AddonRecipeShaped, AddonRecipeShaped_1_17, AddonRecipeShaped_1_20 } from '../dist/core/addon/recipe/shaped.js'
import { AddonRecipeShapeless, AddonRecipeShapeless_1_17 } from '../dist/core/addon/recipe/shapeless.js'
import { AddonRecipeFurnace_1_17 } from '../dist/core/addon/recipe/furnace.js'
import { recipeUnlockProblem } from '../dist/core/addon/recipe/baseRecipe.js'
import { RecipeAPI } from '../dist/core/factory/recipeFactory.js'

const body = (recipe) => Object.values(recipe.toObject())[1]

test('RecipeAPI.registerSimpleShaped（1.20）缺省写入 { context: AlwaysUnlocked }', () => {
    const r = RecipeAPI.registerSimpleShaped('t:a', 't:a', ['x'], { x: { item: 'minecraft:stick' } })
    assert.equal(r.toObject().format_version, '1.20')
    assert.deepEqual(body(r).unlock, { context: 'AlwaysUnlocked' })
    assert.equal(r.definitions.unlock, undefined, '缺省值只出现在产物里，不改实例本身')
})

test('显式 unlock 原样保留（Ex Nihilo 的 r.definitions.unlock 写法也照旧）', () => {
    const r = new AddonRecipeShaped_1_20().identifier('t:b').unlock([{ tag: 'minecraft:planks' }])
    assert.deepEqual(body(r).unlock, [{ tag: 'minecraft:planks' }])
    const legacy = new AddonRecipeShaped_1_20().identifier('t:c')
    legacy.definitions.unlock = { context: 'PlayerInWater' }
    assert.deepEqual(body(legacy).unlock, { context: 'PlayerInWater' })
})

test('1.20.x 的无序配方同样补缺省；1.20 以下与熔炉配方不动（产物逐字节不变）', () => {
    assert.deepEqual(body(AddonRecipeShapeless.create('1.20.10', { description: { identifier: 't:d' } })).unlock, { context: 'AlwaysUnlocked' })
    assert.deepEqual(body(AddonRecipeShaped.create('1.21.0', { description: { identifier: 't:e' } })).unlock, { context: 'AlwaysUnlocked' })
    assert.equal('unlock' in body(new AddonRecipeShaped_1_17().identifier('t:f')), false)
    assert.equal('unlock' in body(new AddonRecipeShapeless_1_17().identifier('t:g')), false)
    assert.equal('unlock' in body(new AddonRecipeFurnace_1_17().identifier('t:h')), false)
})

test('unlock() 拒绝把 { context } 放进数组等错误形状', () => {
    const r = new AddonRecipeShaped_1_20().identifier('t:i')
    assert.throws(() => r.unlock([{ context: 'AlwaysUnlocked' }]), /\{ context \} 要写成单个对象/)
    assert.throws(() => r.unlock([]), /不能为空/)
    assert.throws(() => r.unlock({ item: 'minecraft:stick' }), /必须是 \{ context \} 对象/)
    assert.equal(recipeUnlockProblem({ context: 'AlwaysUnlocked' }), undefined)
    assert.equal(recipeUnlockProblem([{ item: 'minecraft:stick' }, { tag: 'minecraft:planks' }]), undefined)
})
