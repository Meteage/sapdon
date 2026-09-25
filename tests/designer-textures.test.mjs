/**
 * 纹理路径解析单测（Sapdon UI Designer）
 *
 * 运行：`node tests/designer-textures.test.mjs`（纯逻辑，零依赖）
 *
 * 除了纯函数，末尾还有一条**跨工程实测**：示例工程用到的贴图必须真的能在
 * `bedrock-samples*` 原版资源包里找到（找不到就跳过并提示）—— 这条是"拿原版贴图来显示"的落地判据。
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  IMAGE_EXTS,
  PREVIEW_EXTS,
  normalizeTexturePath,
  stripImageExt,
  isTextureRef,
  textureCandidates,
  textureUrl,
  resolveTexture,
  buildTextureIndex,
  parseTextureIndex,
  nodeTexture,
} from '../tools/designer/src/textures.js'
import { loadProject } from '../tools/designer/src/model.js'
import { diagnose } from '../tools/designer/src/diagnostics.js'
import { TEXTURE_SUGGESTIONS } from '../tools/designer/src/catalog.js'
import { SAMPLE } from '../tools/designer/samples/gated_book.js'

const REPO = resolve(fileURLToPath(new URL('../', import.meta.url)))
const WORKSPACE = resolve(REPO, '..')

// ---------------------------------------------------------------------------
// 归一化
// ---------------------------------------------------------------------------

test('normalizeTexturePath：补前缀、去扩展名、反斜杠转正斜杠', () => {
  assert.equal(normalizeTexturePath('textures/ui/White'), 'textures/ui/White')
  assert.equal(normalizeTexturePath('textures/ui/White.png'), 'textures/ui/White')
  assert.equal(normalizeTexturePath('textures\\ui\\White.PNG'), 'textures/ui/White')
  assert.equal(normalizeTexturePath('ui/White'), 'textures/ui/White', '缺 textures/ 前缀要补上')
  assert.equal(normalizeTexturePath('/textures/ui/White'), 'textures/ui/White')
  assert.equal(normalizeTexturePath('  textures/ui/White  '), 'textures/ui/White')
  assert.equal(normalizeTexturePath(''), '')
})

test('normalizeTexturePath：越界段直接判非法（返回空串）', () => {
  assert.equal(normalizeTexturePath('../../etc/passwd'), '')
  assert.equal(normalizeTexturePath('textures/../../secret.png'), '')
  assert.equal(normalizeTexturePath('textures/./ui/White'), '')
})

test('stripImageExt：只剥图片扩展名（.json 保留，好让诊断看出引用错了翻页定义）', () => {
  assert.equal(stripImageExt('a/b.png'), 'a/b')
  assert.equal(stripImageExt('a/b.TGA'), 'a/b')
  assert.equal(stripImageExt('a/b.json'), 'a/b.json')
  assert.equal(stripImageExt('a/b'), 'a/b')
})

test('isTextureRef / textureCandidates：候选按 png→jpg→jpeg→tga 顺序', () => {
  assert.equal(isTextureRef('textures/ui/White'), true)
  assert.equal(isTextureRef(''), false)
  assert.deepEqual(textureCandidates('textures/ui/White'), [
    'textures/ui/White.png',
    'textures/ui/White.jpg',
    'textures/ui/White.jpeg',
    'textures/ui/White.tga',
  ])
  assert.deepEqual(textureCandidates(''), [])
  assert.deepEqual([...IMAGE_EXTS], ['.png', '.jpg', '.jpeg', '.tga'])
  assert.deepEqual([...PREVIEW_EXTS], ['.png', '.jpg', '.jpeg'])
})

test('textureUrl：拼出可直接喂给 <img>/background-image 的地址（不带扩展名，由服务端解析）', () => {
  assert.equal(textureUrl('textures/ui/White.png'), '/tex/textures/ui/White')
  assert.equal(textureUrl('textures/ui/White', '/assets/'), '/assets/textures/ui/White')
  assert.equal(textureUrl(''), '')
})

// ---------------------------------------------------------------------------
// 解析（有没有索引两种模式）
// ---------------------------------------------------------------------------

test('resolveTexture：没有索引时 known=null（不猜存在性），有索引才判定', () => {
  const noIndex = resolveTexture('textures/ui/white', null)
  assert.equal(noIndex.known, null)
  assert.equal(noIndex.path, 'textures/ui/white')
  assert.equal(noIndex.url, '/tex/textures/ui/white')
  assert.equal(noIndex.previewable, true)
  assert.equal(noIndex.caseMismatch, null)

  const idx = buildTextureIndex(['textures/ui/white'])
  assert.equal(resolveTexture('textures/ui/white', idx).known, true)
  assert.equal(resolveTexture('textures/ui/Nope', idx).known, false)
  assert.equal(resolveTexture('textures/ui/Nope', idx).previewable, true, '找不到与不可预览是两件事')
})

test('resolveTexture：只差大小写 → known=true 但给出包内规范写法（Windows 上 Test-Path 会骗你）', () => {
  const idx = buildTextureIndex(['textures/ui/white', 'textures/ui/book_pageleft_default'])
  const res = resolveTexture('textures/ui/White', idx)
  assert.equal(res.known, true, '大小写不同不算"找不到"（不制造假告警）')
  assert.equal(res.caseMismatch, 'textures/ui/white')
  assert.equal(resolveTexture('textures/ui/white', idx).caseMismatch, null, '写法正确就没有 mismatch')
})

test('resolveTexture：.tga 存在但不可预览', () => {
  const idx = buildTextureIndex(['textures/ui/legacy'], ['textures/ui/legacy'])
  const res = resolveTexture('textures/ui/legacy.tga', idx)
  assert.equal(res.path, 'textures/ui/legacy')
  assert.equal(res.known, true)
  assert.equal(res.previewable, false)
})

test('buildTextureIndex：paths/list/noPreview/lower 一致', () => {
  const idx = buildTextureIndex(['textures/ui/b', 'textures/ui/a', 'textures/ui/b'], ['textures/ui/a'])
  assert.equal(idx.paths.size, 2, '去重')
  assert.deepEqual(idx.list, ['textures/ui/b', 'textures/ui/a'])
  assert.ok(idx.noPreview.has('textures/ui/a'))
  assert.equal(idx.lower.get('textures/ui/a'), 'textures/ui/a')
})

test('resolveTexture：非法路径 known=false（会被诊断报 error）', () => {
  assert.equal(resolveTexture('../secret', { paths: new Set() }).known, false)
})

test('parseTextureIndex：容错空行与 CRLF', () => {
  const set = parseTextureIndex('textures/ui/a\r\n\r\ntextures/ui/b\n')
  assert.equal(set.size, 2)
  assert.ok(set.has('textures/ui/b'))
  assert.equal(parseTextureIndex('').size, 0)
})

test('nodeTexture：image 用 texture，form_button 用 texture_default，其余没有自有贴图', () => {
  assert.equal(nodeTexture({ type: 'image', props: { texture: 'textures/ui/White' } }), 'textures/ui/White')
  assert.equal(nodeTexture({ type: 'form_button', props: { texture_default: 'textures/ui/book_back' } }), 'textures/ui/book_back')
  assert.equal(nodeTexture({ type: 'label', props: { text: 'hi' } }), '')
  assert.equal(nodeTexture({ type: 'panel', props: {} }), '')
})

// ---------------------------------------------------------------------------
// 诊断接入
// ---------------------------------------------------------------------------

/** 示例工程里的背景图元素（按 id 找，别用下标 —— 元素顺序会随工程模型变化） */
function bgNode(doc) {
  return findIn(doc.elements, 'bg')
}

/** 示例工程里的表单格盘（用来改三态纹理） */
function buttonsGridNode(doc) {
  return findIn(doc.elements, 'page2_buttons_grid')
}

function findIn(nodes, id) {
  for (const n of nodes || []) {
    if (n.id === id) return n
    const hit = findIn(n.controls, id)
    if (hit) return hit
  }
  return null
}

test('诊断：没有纹理索引时**不判定**存在性（不猜）', () => {
  const doc = loadProject(SAMPLE).project
  bgNode(doc).props.texture = 'textures/ui/definitely_not_here'
  const { items } = diagnose(doc)
  assert.equal(items.filter((i) => i.rule === 'texture-missing').length, 0)
})

test('诊断：有索引时缺纹理报 warn、非法路径报 error、大小写不一致报 info', () => {
  const doc = loadProject(SAMPLE).project
  const bg = bgNode(doc)
  const texKeys = ['texture', 'texture_default', 'texture_hover', 'texture_pressed']
  // 索引 = 示例工程的全部纹理引用（再把 bg 换成不存在的）⇒ 只有这一处该报缺纹理
  const paths = new Set()
  const collect = (nodes) => {
    for (const n of nodes) {
      for (const k of texKeys) if ((n.props || {})[k]) paths.add(normalizeTexturePath(n.props[k]))
      collect(n.controls || [])
    }
  }
  collect(doc.elements)
  bg.props.texture = 'textures/ui/definitely_not_here'
  buttonsGridNode(doc).controls[0].props.texture_default = '../escape'

  const items = diagnose(doc, { textureIndex: buildTextureIndex([...paths]) }).items
  const missing = items.filter((i) => i.rule === 'texture-missing')
  assert.equal(missing.length, 1, JSON.stringify(missing, null, 1))
  assert.equal(missing[0].id, 'bg')
  assert.equal(missing[0].severity, 'warn')
  const invalid = items.filter((i) => i.rule === 'texture-invalid')
  assert.equal(invalid.length, 1)
  assert.equal(invalid[0].severity, 'error')

  // 大小写不一致 → info（不当作"找不到"）
  const doc2 = loadProject(SAMPLE).project
  bgNode(doc2).props.texture = 'textures/ui/DIALOG_background_opaque'
  const items2 = diagnose(doc2, { textureIndex: buildTextureIndex([...paths]) }).items
  assert.equal(items2.filter((i) => i.rule === 'texture-missing').length, 0, '大小写不同不算找不到')
  const caseHit = items2.filter((i) => i.rule === 'texture-case')
  assert.equal(caseHit.length, 1)
  assert.equal(caseHit[0].severity, 'info')
  assert.ok(caseHit[0].message.includes('textures/ui/dialog_background_opaque'))
})

test('诊断：示例工程在原版包索引下应当零告警（路径都是真存在的）', async (t) => {
  const pack = await findVanillaPack()
  if (!pack) return t.skip('工作区里没找到 bedrock-samples 原版资源包')
  const paths = new Set(await collectTextures(pack))
  const { items, counts } = diagnose(loadProject(SAMPLE).project, { textureIndex: { paths } })
  assert.deepEqual(counts, { error: 0, warn: 0, info: 0 }, JSON.stringify(items, null, 1))
})

// ---------------------------------------------------------------------------
// 跨工程实测：示例用到的贴图必须真的在原版包里
// ---------------------------------------------------------------------------

/** 在 workspace 里浅层找 `resource_pack`（含 textures/） */
async function findVanillaPack() {
  const listDirs = async (dir) => {
    try {
      return (await readdir(dir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name)
    } catch {
      return []
    }
  }
  for (const name of await listDirs(WORKSPACE)) {
    if (!/^bedrock-samples/i.test(name)) continue
    for (const sub of await listDirs(join(WORKSPACE, name))) {
      for (const candidate of [join(WORKSPACE, name, 'resource_pack'), join(WORKSPACE, name, sub, 'resource_pack')]) {
        if (existsSync(join(candidate, 'textures'))) return candidate
      }
    }
  }
  return null
}

/** 扫一个资源包的 textures/，返回归一化路径（与 serve.mjs 同规则） */
async function collectTextures(pack) {
  const out = []
  const walk = async (dir, base) => {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      const full = join(dir, e.name)
      if (e.isDirectory()) await walk(full, base)
      else if (IMAGE_EXTS.includes(e.name.toLowerCase().slice(e.name.lastIndexOf('.')))) {
        out.push(normalizeTexturePath(full.slice(base.length + 1)))
      }
    }
  }
  await walk(join(pack, 'textures'), pack)
  return out
}

test('★实测：示例工程引用的每张贴图都能在原版资源包里找到', async (t) => {
  const pack = await findVanillaPack()
  if (!pack) return t.skip('工作区里没找到 bedrock-samples 原版资源包')
  const set = new Set(await collectTextures(pack))
  assert.ok(set.size > 5000, `原版贴图索引太小（${set.size}），扫描逻辑可能不对`)

  const refs = []
  const walkNode = (nodes) => {
    for (const n of nodes) {
      for (const key of ['texture', 'texture_default', 'texture_hover', 'texture_pressed']) {
        const v = (n.props || {})[key]
        if (v) refs.push({ id: n.id, from: key, path: normalizeTexturePath(v) })
      }
      walkNode(n.controls || [])
    }
  }
  walkNode(loadProject(SAMPLE).project.elements)

  assert.ok(refs.length >= 10, `示例工程应该引用到多张贴图（背景 1 + 三枚按钮 × 三态 = 10），实际 ${refs.length}`)
  for (const ref of refs) {
    assert.ok(set.has(ref.path), `${ref.id}.${ref.from} 引用的 ${ref.path} 在原版包里不存在`)
  }
})

test('★实测：原版包里存在手册用的那批 book_* 贴图（编辑器画布会真的画出来）', async (t) => {
  const pack = await findVanillaPack()
  if (!pack) return t.skip('工作区里没找到 bedrock-samples 原版资源包')
  for (const p of [
    'textures/ui/book_pageleft_default',
    'textures/ui/book_pageleft_hover',
    'textures/ui/book_pageleft_pressed',
    'textures/ui/book_pageright_default',
    'textures/ui/book_shiftleft_default',
    'textures/ui/dialog_background_opaque',
  ]) {
    const file = join(pack, ...p.split('/')) + '.png'
    const info = await stat(file).catch(() => null)
    assert.ok(info && info.isFile(), `${p}.png 不存在（${file}）`)
  }
})

test('★实测：目录里的纹理建议必须是原版真实路径（含大小写，防止又抄到 textures/ui/White 这种）', async (t) => {
  const pack = await findVanillaPack()
  if (!pack) return t.skip('工作区里没找到 bedrock-samples 原版资源包')
  const set = new Set(await collectTextures(pack))
  for (const s of TEXTURE_SUGGESTIONS) {
    assert.ok(set.has(s), `TEXTURE_SUGGESTIONS 里的 ${s} 在原版包里不存在（包内写法区分大小写）`)
  }
})
