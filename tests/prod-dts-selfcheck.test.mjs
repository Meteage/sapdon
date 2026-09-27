// `prod/core/index.d.ts` 的「引用能不能解析」体检
// （需先 `npx tsc && npx tsc-alias && node scripts/buildTask.cjs`，prod/ 是构建产物、不入库）
//
// 为什么要有这条：`AGENTS.md` 的「落地要求」只说改框架后要**看一眼** `prod/core/index.d.ts`
// 的文案。2026-09-27 实测证明**光看文案不够**：一次「删掉 `.js` 里唯一那行值 import」的干净修复，
// 让 dts 打包器不再把 `RideableComponentDesc` 的**声明**带进 bundle（旧产物里它是因为那个
// 有 bug 的值 import 才被顺带打包进去的），而签名与 JSDoc 里的**引用**还在 ⇒ 公开类型文件里
// 出现 11 处「引用了自己从未声明的类型名」，下游所有项目的 IDE 直接报红，
// 且 `EntityComponent.setRideable` 的返回类型整体退化成参数类型。
//
// 判据（本次改成自动化的那一条）：**引用集合 ⊆ 声明集合 ∪ 内建名字**。
// 实现用真正的 TS 编译器（`typescript` 是框架依赖）：给 `prod/core/index.d.ts` 建一个 Program
// 并只取**落在该文件内**的诊断。⚠️ 两处实现细节都是实测出来的（不是猜的）：
//   1. `skipLibCheck: false` 时 TS 才会检查 `.d.ts` —— 但那样整套要 ~39 s；
//   2. 把**同样字节**拷成 `.tmp/*.ts`（非 `.d.ts`）再 `skipLibCheck: true` ⇒ ~10 s，
//      诊断**逐条一致**（连行号都一样），因为 `skipLibCheck` 只跳过库文件、不跳过根文件。
//      故走 (2)：检查的仍是 prod 产物本身的内容，只是让编译器愿意检查它。
//
// ⚠️ 基线 `KNOWN_PRE_EXISTING`：npm 3.6.0 的**旧产物里就已经有**的几条，本次不修（超出范围），
//    逐条登记 ⇒ 这条测试是**棘轮**：只允许变少、不允许变多。任何**新增**的悬空引用都会失败。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..')
const DTS = path.join(repoRoot, 'prod', 'core', 'index.d.ts')
const hasDts = fs.existsSync(DTS)
const SKIP_HINT = 'prod/ 还没构建（prod 是构建产物、不入库）：先 npx tsc && npx tsc-alias && node scripts/buildTask.cjs'

/**
 * npm 3.6.0 的旧产物（`synthage/node_modules/@sapdon/core/index.d.ts`，2026-09-27 只读比对）里
 * 就已经存在的诊断。`count` 是上限：实际多于它 = 新增缺陷。
 */
const KNOWN_PRE_EXISTING = [
    {
        code: 2304,
        match: /'EntityBehaviorRandomStroll'/,
        count: 2,
        why: 'behavior/randomStroll.js 的 JSDoc @returns 写了一个不存在的类名（旧产物同样存在）',
    },
    {
        code: 2304,
        match: /'RawJSON'/,
        count: 1,
        why: 'RawType<T> extends RawJSON —— RawJSON 不在任何 typescript lib 里（旧产物同样存在）',
    },
    {
        code: 2339,
        match: /'all_items'|'singular_pickup'/,
        count: 2,
        why: 'setShareables 的解构选项与 JSDoc 参数类型不一致（旧产物同样存在）',
    },
]

function diagnose(dtsPath) {
    // 同样字节拷成 `.ts`：根文件不再是 `.d.ts` ⇒ 可以开 skipLibCheck（快 4 倍），
    // 但 prod 产物本身仍被逐字检查（诊断与直接查 `.d.ts` 逐条一致，含行号）
    const copyPath = path.join(repoRoot, '.tmp', 'prod-core-dts-selfcheck.ts')
    fs.mkdirSync(path.dirname(copyPath), { recursive: true })
    fs.writeFileSync(copyPath, fs.readFileSync(dtsPath, 'utf-8'), 'utf-8')

    const program = ts.createProgram({
        rootNames: [copyPath],
        options: {
            noEmit: true,
            skipLibCheck: true, // 只跳过库文件（`.d.ts` 依赖）；根文件是 `.ts`，照查
            target: ts.ScriptTarget.ESNext,
            module: ts.ModuleKind.NodeNext,
            moduleResolution: ts.ModuleResolutionKind.NodeNext,
            strict: true,
        },
    })
    const normalized = copyPath.replace(/\\/g, '/').toLowerCase()
    return ts.getPreEmitDiagnostics(program)
        .filter((d) => d.file && d.file.fileName.replace(/\\/g, '/').toLowerCase() === normalized)
        .map((d) => ({
            code: d.code,
            line: d.file.getLineAndCharacterOfPosition(d.start).line + 1, // 行号与 prod 产物 1:1
            message: ts.flattenDiagnosticMessageText(d.messageText, ' '),
        }))
}

const fmt = (d) => `TS${d.code} @${d.line}: ${d.message}`
const diags = hasDts ? diagnose(DTS) : []

test('prod/core/index.d.ts 没有**新增**的悬空类型引用 / 签名错误', (t) => {
    if (!hasDts) return t.skip(SKIP_HINT)

    const unexpected = diags.filter(
        (d) => !KNOWN_PRE_EXISTING.some((b) => b.code === d.code && b.match.test(d.message))
    )
    assert.deepEqual(
        unexpected.map(fmt),
        [],
        '公开类型文件里出现了基线之外的诊断 —— 多半是某个类型的**声明**没被打进 bundle（引用还在）'
    )
})

test('棘轮：基线里的旧缺陷只允许变少，不允许变多', (t) => {
    if (!hasDts) return t.skip(SKIP_HINT)

    for (const b of KNOWN_PRE_EXISTING) {
        const n = diags.filter((d) => b.code === d.code && b.match.test(d.message)).length
        assert.ok(n <= b.count, `${b.why}：基线 ${b.count} 条，实际 ${n} 条`)
    }
})

test('rideable 三件套：既被引用、也有声明（`entity/index.ts` 的显式 type 导出不能删）', (t) => {
    if (!hasDts) return t.skip(SKIP_HINT)

    const text = fs.readFileSync(DTS, 'utf-8')
    const declared = new Set(
        [...text.matchAll(/^\s*(?:export\s+)?(?:declare\s+)?(?:type|interface|class|enum)\s+([A-Za-z_$][\w$]*)/gm)]
            .map((m) => m[1])
    )
    for (const name of ['RideableComponent', 'RideableComponentDesc', 'RideableSeat']) {
        const used = new RegExp(`\\b${name}\\b`, 'g').test(text)
        if (!used) continue // 将来若不再被引用，就不需要它
        assert.equal(declared.has(name), true, `${name} 被引用但没被声明 —— 检查 src/core/entity/index.ts 的 export type`)
    }
})
