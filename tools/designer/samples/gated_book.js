/**
 * 示例工程：两页「对称门控」小书（Sapdon UI Designer）
 *
 * 它演示 sapdon 最通用的落地模式（`doc/dev/ui-architecture.md` §5）：
 *   页面级门控 = `($binding_text = #form_text)`  → 该页的「内容 + 按钮组」一起显隐
 *   按钮级门控 = `($binding_button_text = #form_button_text)` → 组内按钮按运行期 emit 的按钮键显隐
 *   （后者由 FormButtonGrid.addButton 自动注入"激活三件套"）
 *
 * 它同时是单测的输入：`tests/designer-codegen.test.mjs` 用它跑
 * 「模型 → TS 代码 / JSON 产物预览 / 真实框架类」三方交叉验证。
 *
 * 保存为 `.sui.json` 时的内容与这里**同构**（就是 JSON.stringify 的结果）。
 * ★ 贴图用的全是**原版资源包真实存在**的路径（`textures/ui/book_*` 与 `dialog_background_opaque`，
 *   与 FZ 手册真机在用的是同一批），所以编辑器画布能直接把它们画出来；
 *   换成工程自带贴图时路径同样写 `textures/...`（不带扩展名），编辑器会去工程包里找。
 */

const gate = (pageKey) => ({
  vars: { binding_text: pageKey },
  bindings: [{ type: 'view', source: '($binding_text = #form_text)', target: '#visible' }],
})

/** 原版书页按钮三态（取自 bedrock-samples 的 textures/ui，真机同款） */
const NAV_TEX = {
  prev: {
    texture_default: 'textures/ui/book_pageleft_default',
    texture_hover: 'textures/ui/book_pageleft_hover',
    texture_pressed: 'textures/ui/book_pageleft_pressed',
  },
  home: {
    texture_default: 'textures/ui/book_shiftleft_default',
    texture_hover: 'textures/ui/book_shiftleft_hover',
    texture_pressed: 'textures/ui/book_shiftleft_pressed',
  },
  next: {
    texture_default: 'textures/ui/book_pageright_default',
    texture_hover: 'textures/ui/book_pageright_hover',
    texture_pressed: 'textures/ui/book_pageright_pressed',
  },
}

export const SAMPLE = {
  formatVersion: 1,
  tool: 'sapdon-designer',
  uiSystem: { identifier: 'sapdon_ui', path: 'ui/' },   // ns 段；UI 文件/namespace = ns_nm（→ sapdon_ui_page1）
  canvas: { size: [320, 207], zoom: 2 },
  screen: { name: 'page1', content: 'book_content_panel', buttons: 'book_buttons_panel' },
  elements: [
    // 多页管理器：把两块页面板登记进来（tag + 面板），它负责挂 $gtag 门控并把它们挂进容器
    {
      id: 'book_pager',
      type: 'page_panel_manage',
      props: { container: 'book_content_panel', mode: 'prefix' },
      pages: [
        { tag: 'page1', panel: 'managed_page_a' },
        { tag: 'page2', panel: 'managed_page_b' },
      ],
    },
    {
      id: 'managed_page_a',
      type: 'panel',
      props: { size: ['100%', '100%'], layer: 3 },
      controls: [{ id: 'managed_a_label', type: 'label', props: { text: 'A 页（管理器门控）' } }],
    },
    {
      id: 'managed_page_b',
      type: 'panel',
      props: { size: ['100%', '100%'], layer: 3 },
      controls: [{ id: 'managed_b_label', type: 'label', props: { text: 'B 页（管理器门控）' } }],
    },
    {
      id: 'book_content_panel',
      type: 'panel',
      props: { size: ['100%', '100%'] },
      controls: [
        {
          id: 'bg',
          type: 'image',
          props: { size: ['100%', '100%'], texture: 'textures/ui/dialog_background_opaque', keep_ratio: false, layer: 0 },
        },        {
          id: 'page1_content',
          type: 'panel',
          props: { size: ['100%', '100%'], layer: 1 },
          ...gate('page1'),
          controls: [
            {
              id: 'page1_stack',
              type: 'stack_panel',
              props: { size: ['100%', '100%'], orientation: 'vertical' },
              controls: [
                {
                  id: 'page1_title_row',
                  type: 'panel',
                  props: { size: ['100%', '30%'] },
                  controls: [
                    {
                      id: 'page1_title',
                      type: 'label',
                      props: { size: ['100%', '100%'], text: '第一章 · 设计思想', text_alignment: 'center', font_size: 'large' },
                    },
                  ],
                },
                {
                  id: 'page1_body_row',
                  type: 'panel',
                  props: { size: ['100%', '70%'] },
                  controls: [
                    {
                      id: 'page1_body',
                      type: 'label',
                      props: { size: ['90%', '100%'], text: 'JSON UI 只能做算术与相等判定，\n显隐全部交给绑定表达式。', text_alignment: 'left', line_padding: 2 },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'page2_content',
          type: 'panel',
          props: { size: ['100%', '100%'], layer: 1 },
          ...gate('page2'),
          controls: [
            {
              id: 'page2_title',
              type: 'label',
              props: { size: ['100%', '30%'], text: '第二章 · 对称门控', text_alignment: 'center', font_size: 'large' },
            },
            {
              id: 'page2_body',
              type: 'label',
              props: { size: ['90%', '60%'], text: '内容与按钮按同一页键显隐，\n按钮组内再按按钮键显隐。', text_alignment: 'left' },
            },
          ],
        },
      ],
    },
    {
      id: 'book_buttons_panel',
      type: 'panel',
      props: { size: ['100%', '100%'] },
      controls: [
        {
          id: 'page1_buttons_grid',
          type: 'form_button_grid',
          props: { dimensions: [1, 1], size: ['100%', '100%'] },
          ...gate('page1'),
          controls: [
            {
              id: 'btn_next',
              type: 'form_button',
              props: { anchor: 'bottom_right', size: [24, 24], binding: 'next_button', ...NAV_TEX.next },
              slot: 0,
              pos: [0, 0],
            },
          ],
        },
        {
          id: 'page2_buttons_grid',
          type: 'form_button_grid',
          props: { dimensions: [2, 1], size: ['100%', '100%'] },
          ...gate('page2'),
          controls: [
            {
              id: 'btn_prev',
              type: 'form_button',
              props: { anchor: 'bottom_left', size: [24, 24], binding: 'prev_button', ...NAV_TEX.prev },
              slot: 0,
              pos: [0, 0],
            },
            {
              id: 'btn_home',
              type: 'form_button',
              props: { anchor: 'bottom_right', size: [24, 24], binding: 'home_button', ...NAV_TEX.home },
              slot: 1,
              pos: [1, 0],
            },
          ],
        },
      ],
    },
  ],
}

export default SAMPLE
