/**
 * 控件箱 + 属性 schema（Sapdon UI Designer）
 *
 * ★ 单一事实来源：`inspector.js`（属性面板长什么样、插什么默认值）、`codegen.js`
 *   （生成哪个 setter、进哪个属性包）、`preview.js`（JSON 键名与归属）**都只读这一份**。
 *   要加一个可编辑属性，只改这里 —— 照 `SLOT_CALIBRATION` 的"单一校准点"先例。
 *
 * 属性包 ↔ 框架类的对应关系来自 `src/core/ui/properties/**`（setter 名逐个核对过），
 * 归属错了产物就会多/少字段（`serialize()` 只拷属性包上**存在**的字段）。
 */

// ---------------------------------------------------------------------------
// 属性包：ctor = 框架类名，apply = 挂到元素上的方法名
// ---------------------------------------------------------------------------

export const PACKS = Object.freeze({
  layout: { id: 'layout', label: '版面 Layout', ctor: 'Layout', apply: 'setLayout' },
  control: { id: 'control', label: '控件 Control', ctor: 'Control', apply: 'setControl' },
  text: { id: 'text', label: '文本 Text', ctor: 'Text', apply: 'setText' },
  sprite: { id: 'sprite', label: '纹理 Sprite', ctor: 'Sprite', apply: 'setSprite' },
  grid: { id: 'grid', label: '网格 GridProp', ctor: 'GridProp', apply: 'setGridProp' },
  input: { id: 'input', label: '输入 Input', ctor: 'Input', apply: 'setInput' },
  sound: { id: 'sound', label: '音效 Sound', ctor: 'Sound', apply: 'setSound' },
  scroll: { id: 'scroll', label: '滚动 ScrollView', ctor: 'ScrollView', apply: 'setScrollView' },
})

/** 属性定义：{ key(JSON 键) setter(链式方法) type def(options/hint) } */
const p = (key, setter, type, def, extra = {}) => ({ key, setter, type, def, ...extra })

const SIZE = (key, setter, def, hint) => p(key, setter, 'size', def, { hint })
const ANCHOR = (key, setter, def, extra = {}) => p(key, setter, 'anchor', def, extra)

/** 锚点：引擎缺省是 `center`（2026-09 由真机截图反证，见 layout.js 的 ENGINE_DEFAULT_ANCHOR 注释） */
const ANCHOR_PROPS = [
  ANCHOR('anchor_from', 'setAnchorFrom', 'center', { engineDefault: 'center', setterDefault: 'center', hint: '父容器里的基准点；未声明时引擎按 center' }),
  ANCHOR('anchor_to', 'setAnchorTo', 'center', { engineDefault: 'center', setterDefault: 'center', hint: '自身贴到基准点的哪个角；决定盒子往哪边长' }),
]

export const PACK_PROPS = Object.freeze({
  layout: [
    SIZE('size', 'setSize', ['default', 'default'], '尺寸；数字=像素，"50%"=父尺寸百分比，未声明按锚点跨距'),
    p('offset', 'setOffset', 'offset', [0, 0], { hint: '相对锚点的像素偏移（也可写百分比字符串）' }),
    ...ANCHOR_PROPS,
    SIZE('max_size', 'setMaxSize', ['default', 'default']),
    SIZE('min_size', 'setMinSize', ['default', 'default']),
    p('contained', 'setContained', 'bool', false),
    p('draggable', 'setDraggable', 'enum', 'both', { options: ['vertical', 'horizontal', 'both'], optional: true }),
    p('follows_cursor', 'setFollowsCursor', 'bool', false),
    p('use_anchored_offset', 'setUseAnchoredOffset', 'bool', false, { hint: 'true 时 offset 相对"对齐后的盒子"再加一次' }),
    p('inherit_max_sibling_width', 'setInheritMaxSiblingWidth', 'bool', false),
    p('inherit_max_sibling_height', 'setInheritMaxSiblingHeight', 'bool', false),
  ],
  control: [
    p('visible', 'setVisible', 'bool', true),
    p('enabled', 'setEnabled', 'bool', true),
    p('layer', 'setLayer', 'number', 0, { hint: '同层绘制顺序，大的在上' }),
    p('alpha', 'setAlpha', 'number', 1),
    p('propagate_alpha', 'setPropagateAlpha', 'bool', false),
    p('clips_children', 'setClipsChildren', 'bool', false),
    p('allow_clipping', 'setAllowClipping', 'bool', true),
    p('clip_offset', 'setClipOffset', 'offset', [0, 0]),
    p('clip_state_change_event', 'setClipStateChangeEvent', 'string', '', { optional: true }),
    p('enable_scissor_test', 'setEnableScissorTest', 'bool', false),
    p('selected', 'setSelected', 'bool', false),
    p('use_child_anchors', 'setUseChildAnchors', 'bool', false),
    p('ignored', 'setIgnored', 'bool', false),
    p('disable_anim_fast_forward', 'setDisableAnimFastForward', 'bool', false),
    p('animation_reset_name', 'setAnimationResetName', 'string', '', { optional: true }),
    p('anims', 'setAnimations', 'array', [], { hint: '动画名数组（编辑器不解析动画内容；★ JSON 键是 anims，不是 animations）' }),
    p('property_bag', 'setPropertyBag', 'json', {}, { editor: 'json', hint: '数据属性袋（与运行期变量相关）' }),
    p('variables', 'setVariables', 'json', [], { editor: 'json', hint: '条件变量表；一般用 addVariable 更省事' }),
  ],
  text: [
    p('text', 'setText', 'text', '', { hint: '文案或 lang 键；框架不解析键名，由 JSON UI 解析' }),
    p('color', 'setColor', 'color', [1, 1, 1]),
    p('locked_color', 'setLockedColor', 'color', [1, 1, 1]),
    p('shadow', 'setShadow', 'bool', false),
    p('hide_hyphen', 'setHideHyphen', 'bool', false),
    p('notify_on_ellipses', 'setNotifyOnEllipses', 'array', []),
    p('enable_profanity_filter', 'setEnableProfanityFilter', 'bool', false),
    p('locked_alpha', 'setLockedAlpha', 'number', 1),
    p('font_size', 'setFontSize', 'enum', 'normal', { options: ['small', 'normal', 'large', 'extra_large'] }),
    p('font_scale_factor', 'setFontScaleFactor', 'number', 1),
    p('localize', 'setLocalize', 'bool', false),
    p('line_padding', 'setLinePadding', 'number', 0),
    p('font_type', 'setFontType', 'string', 'default', { hint: 'default / rune / unicode / ascii…' }),
    p('backup_font_type', 'setBackupFontType', 'string', 'default'),
    p('text_alignment', 'setTextAlignment', 'enum', 'center', { options: ['left', 'center', 'right'] }),
  ],
  sprite: [
    p('texture', 'setTexture', 'texture', '', { hint: '纹理路径，如 textures/ui/White；或原版纹理名' }),
    p('allow_debug_missing_texture', 'setAllowDebugMissingTexture', 'bool', true),
    p('uv', 'setUV', 'array', [0, 0]),
    p('uv_size', 'setUVSize', 'array', [0, 0]),
    p('texture_file_system', 'setTextureFileSystem', 'enum', 'InUserPackage', { options: ['InUserPackage', 'InSystemPackage', 'InWorldPackage', 'External'] }),
    p('nineslice_size', 'setNineSliceSize', 'number', 0, { hint: '数字或 [左,上,右,下]' }),
    p('tiled', 'setTiled', 'enum', false, { options: [false, true, 'x', 'y'] }),
    p('tiled_scale', 'setTiledScale', 'array', [1, 1]),
    p('clip_direction', 'setClipDirection', 'enum', 'left', { options: ['left', 'right', 'up', 'down'] }),
    p('clip_ratio', 'setClipRatio', 'number', 1),
    p('clip_pixel_perfect', 'setClipPixelPerfect', 'bool', false),
    p('keep_ratio', 'setKeepRatio', 'bool', true, { hint: 'false = 按 size 拉伸铺满（进度槽要拉伸必须显式 false）' }),
    p('bilinear', 'setBilinear', 'bool', false),
    p('fill', 'setFill', 'bool', false),
    p('fit_to_width', 'setFitToWidth', 'bool', false),
    p('zip_folder', 'setZipFolder', 'string', '', { optional: true }),
    p('grayscale', 'setGrayscale', 'bool', false),
    p('force_texture_reload', 'setForceTextureReload', 'bool', false),
    p('base_size', 'setBaseSize', 'array', [0, 0]),
  ],
  grid: [
    p('grid_dimensions', 'setGridDimensions', 'gridDimensions', [1, 1], { hint: '[列, 行] —— 本仓库约定列在前' }),
    p('maximum_grid_items', 'setMaximumGridItems', 'number', 1, { hint: '需 int；集合数量绑定用 #form_button_length' }),
    p('grid_dimension_binding', 'setGridDimensionBinding', 'string', '', { optional: true }),
    p('grid_rescaling_type', 'setGridRescalingType', 'enum', 'none', { options: ['none', 'vertical', 'horizontal'] }),
    p('grid_fill_direction', 'setGridFillDirection', 'enum', 'none', { options: ['none', 'vertical', 'horizontal'] }),
    p('grid_item_template', 'setGridItemTemplate', 'string', '', { hint: '如 common.container_item' }),
    p('precached_grid_item_count', 'setPrecachedGridItemCount', 'number', 1),
  ],
  input: [
    p('modal', 'setModal', 'bool', false),
    p('inline_modal', 'setInlineModal', 'bool', false),
    p('always_listen_to_input', 'setAlwaysListenToInput', 'bool', false),
    p('always_handle_pointer', 'setAlwaysHandlePointer', 'bool', false),
    p('always_handle_controller_direction', 'setAlwaysHandleControllerDirection', 'bool', false),
    p('hover_enabled', 'setHoverEnabled', 'bool', false),
    p('prevent_touch_input', 'setPreventTouchInput', 'bool', false),
    p('consume_event', 'setConsumeEvent', 'bool', false),
    p('consume_hover_events', 'setConsumeHoverEvents', 'bool', false),
    p('gesture_tracking_button', 'setGestureTrackingButton', 'string', '', { optional: true }),
    p('button_mappings', 'setButtonMappings', 'json', [], { hint: '数组；按钮映射（from_button_id/to_button_id/mapping_type）', editor: 'json' }),
  ],
  sound: [
    p('sound_name', 'setSoundName', 'string', ''),
    p('sound_volume', 'setSoundVolume', 'number', 1),
    p('sound_pitch', 'setSoundPitch', 'number', 1),
    p('sounds', 'setSounds', 'json', [], { editor: 'json' }),
  ],
  scroll: [
    p('scroll_speed', 'setScrollSpeed', 'number', 1),
    p('scrollbar_track_button', 'setScrollbarTrackButton', 'string', '', { optional: true }),
    p('scrollbar_touch_button', 'setScrollbarTouchButton', 'string', '', { optional: true }),
    p('scrollbar_box', 'setScrollbarBox', 'string', '', { optional: true }),
    p('scrollbar_track', 'setScrollbarTrack', 'string', '', { optional: true }),
    p('scroll_view_port', 'setScrollViewPort', 'string', '', { optional: true }),
    p('scroll_content', 'setScrollContent', 'string', '', { optional: true }),
    p('scroll_box_and_track_panel', 'setScrollBoxAndTrackPanel', 'string', '', { optional: true }),
    p('gesture_control_enabled', 'setGestureControlEnabled', 'bool', false),
    p('always_handle_scrolling', 'setAlwaysHandleScrolling', 'bool', false),
    p('touch_mode', 'setTouchMode', 'bool', false),
    p('jump_to_bottom_on_update', 'setJumpToBottomOnUpdate', 'bool', false),
  ],
})

// ---------------------------------------------------------------------------
// 控件箱
// ---------------------------------------------------------------------------

/**
 * kind: 'element' = 一个 UIElement 子类；'composite' = 组合件（构造器/构建器形态特殊）
 * mode: 画布排布模式（'anchored' | 'flow' | 'grid' | 'form-grid'）
 */
export const WIDGETS = Object.freeze([
  { type: 'panel', ctor: 'Panel', label: 'Panel 面板', group: '容器', kind: 'element', container: true, mode: 'anchored', hint: '空容器，子项重叠可叠层 —— 一切版面的底座' },
  { type: 'stack_panel', ctor: 'StackPanel', label: 'StackPanel 流式', group: '容器', kind: 'element', container: true, mode: 'flow', ctorDefaults: { size: ['100%', '100%'], orientation: 'vertical' }, hint: '子项沿 orientation 顺序排；构造默认 size 100%×100%' },
  { type: 'collection_panel', ctor: 'CollectionPanel', label: 'CollectionPanel 集合', group: '容器', kind: 'element', container: true, mode: 'anchored', hint: '靠 collection_name 绑运行期集合；编辑器只画一个样板' },
  { type: 'grid', ctor: 'Grid', label: 'Grid 网格', group: '容器', kind: 'element', container: true, mode: 'grid', hint: '子项按 grid_position 绑格位；格内 offset 无效' },
  { type: 'scroll_view', ctor: 'ScrollingPanel', label: 'ScrollingPanel 滚动', group: '容器', kind: 'element', container: true, mode: 'anchored', hint: 'scroll_view 类型' },
  { type: 'label', ctor: 'Label', label: 'Label 文本', group: '显示', kind: 'element', container: false, mode: 'anchored', hint: '文案/颜色/字号/对齐' },
  { type: 'image', ctor: 'Image', label: 'Image 图片', group: '显示', kind: 'element', container: false, mode: 'anchored', hint: '纹理/UV/九宫格/裁切' },
  { type: 'button', ctor: 'Button', label: 'Button 按钮', group: '交互', kind: 'element', container: true, mode: 'anchored', hint: '普通按钮；配 common.button 模板 + $pressed_button_name 变量' },
  { type: 'form_button_grid', ctor: 'FormButtonGrid', label: 'FormButtonGrid 表单格盘', group: '组合件', kind: 'composite', container: true, mode: 'form-grid', ctorProps: ['dimensions', 'size'], hint: 'dimensions [列,行] + size；子项只能是 FormButton' },
  { type: 'form_button', ctor: 'FormButton', label: 'FormButton 按钮/卡片', group: '组合件', kind: 'composite', container: true, mode: 'anchored', onlyInside: 'form_button_grid', hint: '格盘里的按钮：addButton 注入集合/门控绑定；可挂图标/文字子控件（手册索引卡就是这么做的）' },
  { type: 'page_panel_manage', ctor: 'PagePanelManage', label: 'PagePanelManage 多页管理器', group: '组合件', kind: 'manager', container: false, mode: 'none', hint: '一屏之内多页面：把多块页面板登记给它（tag + 面板），它负责给每块挂 #form_text 门控并挂进容器；运行期脚本 .body(tag) 选页。非视觉对象' },
])

const WIDGET_INDEX = new Map(WIDGETS.map((w) => [w.type, w]))

export function widgetFor(type) {
  return WIDGET_INDEX.get(type) || null
}

export function isContainer(type) {
  const w = widgetFor(type)
  return !!(w && w.container)
}

/** 可以直接放进 parentType 的控件（子项过滤，例如 FormButton 只能进 FormButtonGrid） */
export function widgetsAllowedIn(parentType) {
  return WIDGETS.filter((w) => !w.onlyInside || w.onlyInside === parentType)
}

// ---------------------------------------------------------------------------
// 每个元素类型：开放哪些属性包 + 哪些 addProp 直通属性
// ---------------------------------------------------------------------------

const RAW = {
  orientation: p('orientation', 'addProp', 'enum', 'vertical', { options: ['vertical', 'horizontal'], hint: 'StackPanel 序列化时总带此键（默认 vertical）' }),
  collection_name: p('collection_name', 'addProp', 'string', '', { hint: '集合名，如 form_buttons / container_items' }),
  default_control: p('default_control', 'addProp', 'string', 'default', { optional: true }),
  hover_control: p('hover_control', 'addProp', 'string', 'hover', { optional: true }),
  pressed_control: p('pressed_control', 'addProp', 'string', 'pressed', { optional: true }),
  locked_control: p('locked_control', 'addProp', 'string', 'locked', { optional: true }),
}

export const ELEMENT_SCHEMA = Object.freeze({
  panel: { packs: ['layout', 'control'], raw: [] },
  stack_panel: { packs: ['layout', 'control'], raw: [RAW.orientation], alwaysSerialized: ['orientation'] },
  collection_panel: { packs: ['layout', 'control'], raw: [RAW.collection_name] },
  grid: { packs: ['layout', 'control', 'grid'], raw: [RAW.collection_name] },
  scroll_view: { packs: ['layout', 'control', 'input', 'scroll'], raw: [] },
  label: { packs: ['layout', 'control', 'text'], raw: [] },
  image: { packs: ['layout', 'control', 'sprite'], raw: [] },
  button: { packs: ['layout', 'control', 'input', 'sound'], raw: [RAW.default_control, RAW.hover_control, RAW.pressed_control, RAW.locked_control] },

  // 组合件：props 语义 = 构造器/构建器入参（不是 UIElement 的 props）
  form_button_grid: {
    packs: [],
    raw: [],
    ctorProps: [
      p('dimensions', 'ctor', 'gridDimensions', [1, 1], { hint: '[列, 行]，必填' }),
      p('size', 'ctor', 'size', ['100%', '100%'], { hint: '面板大小，必填' }),
    ],
  },
  form_button: {
    packs: [],
    raw: [],
    ctorProps: [
      p('anchor', 'setAnchor', 'anchor', 'top_left'),
      p('size', 'setSize', 'size', [24, 24]),
      p('binding', 'setBinding', 'string', '', { hint: '门控键 = 运行期 .button("...") 发出的 #form_button_text' }),
      p('texture_default', 'setTexture', 'texture', ''),
      p('texture_hover', 'setTexture', 'texture', ''),
      p('texture_pressed', 'setTexture', 'texture', ''),
    ],
  },

  // 非视觉对象：多页管理器（PagePanelManage）。props = 它的构造入参；
  // 页列表是节点字段 `pages[]`（tag + 页面板），由专用编辑器维护（ui/inspector.js）
  page_panel_manage: {
    packs: [],
    raw: [],
    ctorProps: [
      p('container', 'ctor', 'elementRef', '', { hint: '门控容器（内容面板）；页面板会被挂进它' }),
      p('mode', 'ctor', 'enum', 'prefix', { options: ['prefix', 'eq'], hint: 'prefix：body 以 tag 开头即命中（手册那套）；eq：全等' }),
    ],
  },
})

/** 取某类型的属性面板分组（属性包 + 直通属性） */
export function schemaFor(type) {
  const s = ELEMENT_SCHEMA[type]
  if (!s) return { packs: [], raw: [], ctorProps: [] }
  return {
    packs: (s.packs || []).map((id) => ({ ...PACKS[id], props: PACK_PROPS[id] })),
    raw: s.raw || [],
    ctorProps: s.ctorProps || [],
    alwaysSerialized: s.alwaysSerialized || [],
  }
}

/** 属性键 → 定义（含所属包与包挂载方法），供面板/生成器反查 */
export function propDef(type, key) {
  const s = schemaFor(type)
  for (const pack of s.packs) {
    const hit = pack.props.find((x) => x.key === key)
    if (hit) return { ...hit, pack: pack.id, packCtor: pack.ctor, apply: pack.apply }
  }
  const raw = s.raw.find((x) => x.key === key)
  if (raw) return { ...raw, pack: null, apply: 'addProp' }
  const ctor = s.ctorProps.find((x) => x.key === key)
  if (ctor) return { ...ctor, pack: null, apply: 'ctor' }
  return null
}

/** 该类型可编辑的全部属性键（面板"添加属性"下拉用） */
export function editableKeys(type) {
  const s = schemaFor(type)
  return [...s.packs.flatMap((pk) => pk.props), ...s.raw, ...s.ctorProps].filter((x) => !x.optional)
}

// ---------------------------------------------------------------------------
// 模板继承（Qt 的 promote to custom widget）
// ---------------------------------------------------------------------------

export const TEMPLATES = Object.freeze([
  { id: '', label: '（无模板）', for: ['panel', 'stack_panel', 'collection_panel', 'grid', 'scroll_view', 'label', 'image', 'button'] },
  { id: 'common.common_panel', label: 'common.common_panel（原版灰底面板）', for: ['panel', 'stack_panel', 'collection_panel'] },
  { id: 'common.button', label: 'common.button（无文字贴图按钮）', for: ['button'] },
  { id: 'common_buttons.light_text_button', label: 'light_text_button（带文字按钮，⚠️ 有坑）', for: ['button'], warn: '把 $button_text 设成空串会让整条控制链不渲染 —— ui-lessons.md §2.1' },
  { id: 'server_form.form_button', label: 'server_form.form_button（历史表单按钮）', for: ['button'] },
  { id: 'common.container_item', label: 'common.container_item（容器格位样板）', for: ['panel'] },
])

export function templatesFor(type) {
  return TEMPLATES.filter((t) => t.for.includes(type))
}

// ---------------------------------------------------------------------------
// 门控/绑定模板（sapdon 的"信号槽"）与按钮激活三件套
// ---------------------------------------------------------------------------

export const GATE_TEMPLATES = Object.freeze([
  { id: 'page', label: '页面门控（#form_text）', var: 'binding_text', source: (v) => `($${v} = #form_text)`, target: '#visible', hint: 'ActionFormData().body(x) emit；内容与按钮组共用一个键' },
  { id: 'button', label: '按钮门控（#form_button_text）', var: 'binding_button_text', source: (v) => `($${v} = #form_button_text)`, target: '#visible', hint: 'ActionFormData().button(x) emit' },
  { id: 'hud', label: 'HUD 状态门控（#hud_title_text_string）', var: 'state', source: (v) => `($${v} = #hud_title_text_string)`, target: '#visible', hint: 'HudStatePanel 用：脚本写 <name>.<state>' },
  { id: 'prefix', label: '前缀包含门控', var: 'panel_id', source: (v) => `(not( (#title_text - '$${v}') = #title_text ))`, target: '#visible', hint: '页壳路由用的判定式；$变量要在元素上声明为字面量' },
])

/** FormButtonGrid.addButton 注入的"激活三件套"（少一条按钮就不可点/不可见） */
export const ACTIVATION_TRIPLE = Object.freeze([
  { type: 'collection_details', collection: 'form_buttons' },
  { type: 'collection', collection: 'form_buttons', name: '#form_button_text' },
  { type: 'view', source: '($binding_button_text = #form_button_text)', target: '#visible' },
])

/** collection_name 常见取值（属性面板下拉建议） */
export const COLLECTION_SUGGESTIONS = Object.freeze(['form_buttons', 'container_items', 'inventory_items', 'hotbar_items'])

/**
 * 纹理建议（**逐个核对过原版包真实文件名的**：包内文件名区分大小写，原版是 `white` 不是 `White`）。
 * 完整清单请在编辑器里点「浏览…」——那里的路径是扫资源包得到的，能直接用。
 */
export const TEXTURE_SUGGESTIONS = Object.freeze([
  'textures/ui/white',
  'textures/ui/focus_border_white',
  'textures/ui/focus_border_selected',
  'textures/ui/dialog_background_opaque',
  'textures/ui/button_borderless_light',
  'textures/ui/button_borderless_lighthover',
  'textures/ui/button_borderless_lightpressed',
  'textures/ui/arrow_inactive',
  'textures/ui/arrow_active',
  'textures/ui/arrow_left',
  'textures/ui/arrow_right',
])

/**
 * 类型 → 新建节点时预置的 props。
 * ★ 一律返回**空对象**：框架只序列化已赋值字段，新建控件不该凭空多出字段。
 *   （构造器自带的默认值由 `widget.ctorDefaults` 表示，只在属性面板里作提示、不写进 props）
 */
export function initialProps() {
  return {}
}
