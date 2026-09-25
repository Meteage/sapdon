/**
 * 示例工程：**Sapdon 手册**索引页 + 分类页（Sapdon UI Designer）
 *
 * ★ 这份工程是**照着真产物抄的**，不是凭空画的：
 *   参考 `examples/guidebook_demo/dev/guidebook_demo_RP/ui/gateddemo_book.json`（SapdonGuideBook 的产物）
 *   与 `src/core/ui/systems/sapdon/sapdonGuideBook.ts` 的常量，逐节点对齐：
 *
 *   - 根：`book_content_panel`（320×207）+ `book_buttons_panel`（320×207, layer 10）
 *   - 背景：`book_background` 只写 `texture: textures/ui/book_back` **不写 size** ⇒ 引擎缺省=铺满，
 *     再叠 `textures/ui/book_back.json` 侧车里的 `nineslice_size: 14` ⇒ 画出木框（真机同款）
 *   - 索引页：`index_layout`(95%×90%) → `index_spread`(横向 stack) →
 *       左半「封面」：5% 空隙 + 20% 缎带(`saleribbon`, offset[-8%,0]) + 5% 空隙 + 三行 15% 说明文字
 *       右半「类别」：5% 空隙 + 10% 标题 + 3% 分隔线 + 20% 卡片格盘(4×1, 90%×90%) + 3% 分隔线 + 59% 空隙
 *   - 卡片=FormButtonGrid 的格子（槽位从 3 起）：`FormButton` 只给 hover 纹理 `promotion_slot`，
 *     里面挂 `idx_icon_*`(60%×60%, top_middle, offset[0,-2]) 与 `idx_name_*`(100%×30%, bottom_middle, offset[0,-2])
 *   - 按键面板：右上关闭键（14×14, 模板 `book.close_button_default/hover/pressed`）
 *     + 导航格盘（3×1：prev/home/next，24×24，书页三态贴图）
 *   - 页面门控：`$gtag` + `(not( (#form_text - $gtag) = #form_text))` → `#visible`（前缀包含匹配）
 *
 * 4 个分类图标用的是原版物品贴图（与真产物同一批）：`book_writable` / `paper` / `comparator` / `iron_ingot`。
 */

const IDX_COLS = 4
const IDX_SLOT_BASE = 3 // 前三个槽位归导航按钮（prev/home/next）

/** 页面门控：`$gtag` 是「这一页的标签」，运行时 .body() emit 的前缀包含它才可见 */
const gated = (tag) => ({
  vars: { gtag: tag },
  bindings: [
    { type: 'view', source: '(not( (#form_text - $gtag) = #form_text))', target: '#visible' },
  ],
})

/** 索引卡：Button@common.button（只给 hover 纹理）+ 图标 + 名字 */
const catCard = (id, binding, icon, name) => ({
  id,
  type: 'form_button',
  props: {
    size: ['80%', '80%'],
    binding,
    texture_hover: 'textures/ui/promotion_slot',
  },
  props_note: '真产物里 default/pressed 是空串纹理（setTexture 三参一起建 Image）',
  controls: [
    {
      id: `${id}_icon`,
      type: 'image',
      props: { size: ['60%', '60%'], texture: icon, anchor_from: 'top_middle', anchor_to: 'top_middle', offset: [0, -2] },
    },
    {
      id: `${id}_name`,
      type: 'label',
      props: {
        size: ['100%', '30%'],
        text: name,
        color: [0, 0, 0],
        text_alignment: 'center',
        anchor_from: 'bottom_middle',
        anchor_to: 'bottom_middle',
        offset: [0, -2],
      },
    },
  ],
})

/** 竖向 stack 的一个「槽」：panel + size + 内容 */
const stackRow = (id, size, controls) => ({ id, type: 'panel', props: { size }, controls })

/** 导航按钮（书页三态贴图） */
const navButton = (id, binding, tex, anchor) => ({
  id,
  type: 'form_button',
  props: {
    size: [24, 24],
    binding,
    anchor,
    texture_default: `textures/ui/${tex}_default`,
    texture_hover: `textures/ui/${tex}_hover`,
    texture_pressed: `textures/ui/${tex}_pressed`,
  },
})

export const SAMPLE = {
  formatVersion: 1,
  tool: 'sapdon-designer',
  uiSystem: { identifier: 'sapdon_ui', path: 'ui/' },   // ns 段；UI 文件/namespace = ns_nm（→ sapdon_ui_book）
  canvas: { size: [320, 207], zoom: 3 },
  screen: { name: 'book', content: 'book_content_panel', buttons: 'book_buttons_panel' },
  elements: [
    // ---------------------------------------------------------------- 内容面板
    {
      id: 'book_content_panel',
      type: 'panel',
      props: { size: [320, 207] },
      controls: [
        // 书壳：无 size ⇒ 铺满；九宫格来自 textures/ui/book_back.json 侧车定义
        { id: 'book_background', type: 'image', props: { texture: 'textures/ui/book_back', layer: 0 } },

        // ---------------- 索引页（INDEX）：左封面 + 右类别
        {
          id: 'index_layout',
          type: 'panel',
          props: { size: ['95%', '90%'], layer: 5 },
          ...gated('INDEX'),
          controls: [
            {
              id: 'index_spread',
              type: 'stack_panel',
              props: { size: ['100%', '100%'], orientation: 'horizontal' },
              controls: [
                stackRow('index_left', ['50%', '100%'], [
                  {
                    id: 'left_cover',
                    type: 'stack_panel',
                    props: { size: ['100%', '100%'], orientation: 'vertical' },
                    controls: [
                      stackRow('cover_sp_top', ['100%', '5%'], [{ id: 'cover_sp_top_in', type: 'panel', props: {} }]),
                      stackRow('cover_ribbon_row', ['100%', '20%'], [
                        {
                          id: 'cover_ribbon',
                          type: 'panel',
                          props: { size: ['100%', '100%'], offset: ['-8%', 0] },
                          controls: [
                            { id: 'ribbon_bg', type: 'image', props: { size: ['100%', '100%'], texture: 'textures/ui/saleribbon' } },
                            {
                              id: 'cover_title',
                              type: 'label',
                              props: {
                                size: ['100%', '100%'],
                                anchor_to: 'center',
                                text: '  Sapdon 手册 \n           1st 版 by meteage',
                                color: [0, 0, 0],
                                text_alignment: 'center',
                                font_size: 'normal',
                              },
                            },
                          ],
                        },
                      ]),
                      stackRow('cover_sp_mid', ['100%', '5%'], [{ id: 'cover_sp_mid_in', type: 'panel', props: {} }]),
                      stackRow('cover_line_row1', ['100%', '15%'], [
                        { id: 'cover_line1', type: 'label', props: { text: 'hi 开发者，欢迎使用 Sapdon 手册。', color: [0, 0, 0] } },
                      ]),
                      stackRow('cover_line_row2', ['100%', '15%'], [
                        { id: 'cover_line2', type: 'label', props: { text: '本手册为基岩版开发者提供简单容易的', color: [0, 0, 0] } },
                      ]),
                      stackRow('cover_line_row3', ['100%', '15%'], [
                        { id: 'cover_line3', type: 'label', props: { text: '手册前置库。', color: [0, 0, 0] } },
                      ]),
                    ],
                  },
                ]),
                stackRow('index_right', ['50%', '100%'], [
                  {
                    id: 'right_index',
                    type: 'stack_panel',
                    props: { size: ['100%', '100%'], orientation: 'vertical' },
                    controls: [
                      stackRow('ri_sp_top', ['100%', '5%'], [{ id: 'ri_sp_top_in', type: 'panel', props: {} }]),
                      stackRow('ri_title_row', ['100%', '10%'], [
                        { id: 'cat_title', type: 'label', props: { text: '类别', color: [0, 0, 0], text_alignment: 'center' } },
                      ]),
                      stackRow('ri_div1_row', ['100%', '3%'], [
                        { id: 'ri_div1', type: 'panel', template: 'settings_common.option_group_section_divider', props: { size: ['100%', '100%'] } },
                      ]),
                      stackRow('ri_grid_row', ['100%', '20%'], [
                        {
                          id: 'cat_row',
                          type: 'form_button_grid',
                          props: { dimensions: [IDX_COLS, 1], size: ['90%', '90%'] },
                          controls: [
                            { ...catCard('idx0', 'idx0', 'textures/items/book_writable', '简介'), slot: IDX_SLOT_BASE, pos: [0, 0] },
                            { ...catCard('idx1', 'idx1', 'textures/items/paper', '页类型'), slot: IDX_SLOT_BASE + 1, pos: [1, 0] },
                            { ...catCard('idx2', 'idx2', 'textures/items/comparator', '路由'), slot: IDX_SLOT_BASE + 2, pos: [2, 0] },
                            { ...catCard('idx3', 'idx3', 'textures/items/iron_ingot', '控件'), slot: IDX_SLOT_BASE + 3, pos: [3, 0] },
                          ],
                        },
                      ]),
                      stackRow('ri_div2_row', ['100%', '3%'], [
                        { id: 'ri_div2', type: 'panel', template: 'settings_common.option_group_section_divider', props: { size: ['100%', '100%'] } },
                      ]),
                      stackRow('ri_sp_end', ['100%', '59%'], [{ id: 'ri_sp_end_in', type: 'panel', props: {} }]),
                    ],
                  },
                ]),
              ],
            },
          ],
        },

        // ---------------- 分类页（INTRO）：左标题+说明，右侧留白
        {
          id: 'cat_intro_page',
          type: 'panel',
          props: { size: ['95%', '90%'], layer: 5 },
          ...gated('INTRO'),
          controls: [
            {
              id: 'cat_spread_intro',
              type: 'stack_panel',
              props: { size: ['100%', '100%'], orientation: 'horizontal' },
              controls: [
                stackRow('cat_intro_left', ['50%', '100%'], [
                  {
                    id: 'cat_intro_col',
                    type: 'stack_panel',
                    props: { size: ['100%', '100%'], orientation: 'vertical' },
                    controls: [
                      stackRow('ci_sp1', ['100%', '5%'], [{ id: 'ci_sp1_in', type: 'panel', props: {} }]),
                      stackRow('ci_title', ['100%', '10%'], [
                        { id: 'intro_title', type: 'label', props: { text: '简介', color: [0, 0, 0], text_alignment: 'center', font_size: 'large' } },
                      ]),
                      stackRow('ci_div', ['100%', '5%'], [
                        { id: 'ci_div_line', type: 'panel', template: 'settings_common.option_group_section_divider', props: { size: ['100%', '100%'] } },
                      ]),
                      stackRow('ci_body1', ['100%', '15%'], [
                        { id: 'intro_line1', type: 'label', props: { text: 'Sapdon 把 JSON UI 包成类型安全的', color: [0, 0, 0], text_alignment: 'left' } },
                      ]),
                      stackRow('ci_body2', ['100%', '15%'], [
                        { id: 'intro_line2', type: 'label', props: { text: 'TypeScript，构建期生成 ui/*.json。', color: [0, 0, 0], text_alignment: 'left' } },
                      ]),
                      stackRow('ci_body3', ['100%', '15%'], [
                        { id: 'intro_line3', type: 'label', props: { text: '显隐逻辑全在绑定表达式里，UI 零 JS。', color: [0, 0, 0], text_alignment: 'left' } },
                      ]),
                      stackRow('ci_sp_end', ['100%', '35%'], [{ id: 'ci_sp_end_in', type: 'panel', props: {} }]),
                    ],
                  },
                ]),
                stackRow('cat_intro_right', ['50%', '100%'], [
                  {
                    id: 'cat_intro_right_col',
                    type: 'stack_panel',
                    props: { size: ['100%', '100%'], orientation: 'vertical' },
                    controls: [stackRow('cir_sp', ['100%', '100%'], [{ id: 'cir_sp_in', type: 'panel', props: {} }])],
                  },
                ]),
              ],
            },
          ],
        },

        // ---------------- 纯文本页（TXT|）：整页居中正文
        {
          id: 'text_layout',
          type: 'panel',
          props: { size: ['100%', '100%'], layer: 5 },
          ...gated('TXT|'),
          controls: [
            {
              id: 'text_body',
              type: 'label',
              props: {
                size: ['80%', '80%'],
                anchor_to: 'center',
                text: '左上角是封面与标题带；\n右侧「类别」下是四个入口卡。\n点卡片翻到对应章节。',
                color: [0, 0, 0],
                text_alignment: 'left',
              },
            },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 按键面板
    {
      id: 'book_buttons_panel',
      type: 'panel',
      props: { size: [320, 207], layer: 10 },
      controls: [
        {
          id: 'close_button',
          type: 'button',
          props: { size: [14, 14], anchor_from: 'top_right', anchor_to: 'top_right' },
          controls: [
            { id: 'close_default', type: 'image', template: 'book.close_button_default', props: { size: ['100%', '100%'] } },
            { id: 'close_hover', type: 'image', template: 'book.close_button_hover', props: { size: ['100%', '100%'] } },
            { id: 'close_pressed', type: 'image', template: 'book.close_button_pressed', props: { size: ['100%', '100%'] } },
          ],
        },
        {
          id: 'nav_grid',
          type: 'form_button_grid',
          props: { dimensions: [3, 1], size: ['100%', '100%'] },
          controls: [
            { ...navButton('prev_button_el', 'prev_button', 'book_pageleft', 'bottom_left'), slot: 0, pos: [0, 0] },
            { ...navButton('home_button_el', 'home_button', 'book_shiftleft', 'bottom_middle'), slot: 1, pos: [1, 0] },
            { ...navButton('next_button_el', 'next_button', 'book_pageright', 'bottom_right'), slot: 2, pos: [2, 0] },
          ],
        },
      ],
    },
  ],
}

export default SAMPLE
