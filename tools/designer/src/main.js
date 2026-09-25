/**
 * 浏览器入口（Sapdon UI Designer）
 *
 * 这里集中所有**浏览器专有**能力（localStorage / 剪贴板 / 下载 / prompt / confirm），
 * 通过 `opts` 注入 `ui/app.js` —— 于是 UI 模块本身在 Node 里也能被冒烟测试。
 */

import { Store, emptyProject, loadProject, serializeProject } from './model.js'
import { mountApp } from './ui/app.js'
import { buildTextureIndex } from './textures.js'
import { SAMPLE as GUIDEBOOK } from '../samples/guidebook.js'
import { SAMPLE as GATED_BOOK } from '../samples/gated_book.js'

/** 内置示例：手册（照着真产物抄的，默认）与对称门控小书（最小可跑） */
export const SAMPLES = {
  guidebook: { label: 'Sapdon 手册（照真产物）', doc: GUIDEBOOK },
  gated_book: { label: '对称门控小书（最小）', doc: GATED_BOOK },
}

const DRAFT_KEY = 'sapdon-designer:draft'
const SAMPLE_VERSION = 2 // 内置示例换了一批就 +1（旧草稿不再自动套用，见下）

function boot() {
  const host = document.getElementById('app')

  // ★ 启动**总是**先给默认示例：草稿不再自动套用（否则改了示例你也看不到，只看到旧草稿 —— 用户报过）
  const res = loadProject(GUIDEBOOK)
  const store = new Store(res.project || emptyProject())
  if (res.errors.length) console.warn('[designer] 示例工程有问题：', res.errors)

  let draft = readDraft()
  const app = mountApp(host, store, {
    notice: (msg) => setStatus(msg),
    prompt: (msg, initial) => window.prompt(msg, initial),
    confirm: (msg) => window.confirm(msg),
    copy: (text) => copyText(text),
    open: () => openFile(store),
    download: (text, filename) => download(text, filename, 'text/plain'),
    samples: SAMPLES,
    loadSample: (key) => {
      const s = SAMPLES[key]
      if (!s) return
      const r = loadProject(s.doc)
      if (r.project) store.reset(r.project)
      setStatus(`已载入示例：${s.label}`)
    },
    // 版面偏好（侧边栏宽度）单独存一个 key：换工程/清草稿都不该动版式
    layout: {
      get: (k) => localStorage.getItem(k),
      set: (k, v) => localStorage.setItem(k, v),
    },
    // 有草稿就给一个显式的"恢复"入口（而不是默默盖掉默认示例）
    draft: draft ? { at: draft.at, version: draft.v, restore: () => restoreDraft(store, draft), discard: () => discardDraft() } : null,
    save: (text, filename) => {
      download(text, filename, 'application/json')
      store.dirty = false
      app.render()
    },
  })

  // 自动存草稿（防手滑关页面）；启动时不再自动读回
  let timer = null
  store.on(() => {
    clearTimeout(timer)
    timer = setTimeout(() => writeDraft(store), 600)
  })

  window.addEventListener('beforeunload', (e) => {
    if (store.dirty) {
      e.preventDefault()
      e.returnValue = ''
    }
  })

  function setStatus(msg) {
    const el = document.querySelector('.statusbar .msg')
    if (el) el.textContent = String(msg)
  }

  function restoreDraft(s, d) {
    const r = loadProject(d.doc)
    if (!r.project) return window.alert('草稿损坏，无法恢复')
    s.reset(r.project)
    setStatus(`已恢复草稿（${new Date(d.at).toLocaleString()}）`)
  }

  function discardDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch (e) {
      console.warn(e)
    }
    draft = null
    app.draftChip = null
    app.render()
  }

  window.__designer = { store, app, restoreDraft: () => draft && restoreDraft(store, draft) }
  console.info('[designer] 就绪。控制台可用 window.__designer 观察/驱动。')

  // ★ 拉资源包纹理索引：画布据此画**原版贴图**，属性面板的"浏览…"据此出缩略图
  loadTextures(app)
}

function readDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !parsed.doc) return null
    return parsed
  } catch (e) {
    console.warn('[designer] 草稿读取失败：', e)
    return null
  }
}

function writeDraft(store) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ v: SAMPLE_VERSION, at: Date.now(), doc: serializeProject(store.doc) }))
  } catch (e) {
    console.warn('[designer] 草稿写入失败：', e)
  }
}

/**
 * 从 `serve.mjs` 取纹理索引（原版 + 工程包）。
 * 拿不到也不影响编辑器可用性：画布不画贴图、纹理选择器退回文本输入，并且**不判定**纹理存在性。
 */
async function loadTextures(app) {
  try {
    const cfg = await fetch('/api/config').then((r) => r.json())
    if (!cfg.hasTextures) {
      app.notice('没找到资源包：画布不画贴图（serve.mjs 会自动找 bedrock-samples，或用 --vanilla 指定）')
      return
    }
    const data = await fetch('/api/textures?all=1').then((r) => r.json())
    const index = buildTextureIndex(data.paths || [], data.noPreview || [], data.defs || {})
    app.setTextures(index)
    const byKind = (kind) => (cfg.roots || []).filter((r) => r.kind === kind).reduce((n, r) => n + r.count, 0)
    app.notice(`贴图 ${index.paths.size} 条（原版 ${byKind('vanilla')} + 工程 ${byKind('project')}；${cfg.sidecarCount || 0} 条带九宫格侧车定义）`)
  } catch (e) {
    console.warn('[designer] 纹理索引加载失败（用 file:// 直接打开时属正常）：', e)
  }
}

async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return
    }
  } catch (e) {
    console.warn('[designer] clipboard 失败，回退 textarea：', e)
  }
  const ta = document.createElement('textarea')
  ta.value = text
  document.body.appendChild(ta)
  ta.select()
  try {
    document.execCommand('copy')
  } finally {
    document.body.removeChild(ta)
  }
}

function download(text, filename, mime) {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function openFile(store) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,application/json'
  input.addEventListener('change', () => {
    const file = input.files && input.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const res = loadProject(String(reader.result))
      if (!res.project) {
        window.alert(`打开失败：${res.errors.join('；')}`)
        return
      }
      store.reset(res.project)
      if (res.errors.length) window.alert(`已打开，但有告警：\n${res.errors.join('\n')}`)
    }
    reader.readAsText(file)
  })
  input.click()
}

boot()
