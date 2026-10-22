/**
 * 示例工程：液体燃料发电机 —— 容器屏（Sapdon UI Designer）
 *
 * 版式对照游戏内截图：左侧液位柱、中间两个槽位（燃料 / 输出）、下方原版物品栏。
 *
 * 要点（都是容器屏特有的）：
 *   · 画布尺寸 = `setPanel({ size })` 的面板尺寸（176×166，原版容器规格）
 *   · 下半部分不用画：`ContainerUISystem` 会自动挂 `common.inventory_panel_bottom_half_with_label`
 *     （36 个背包格），自己再画一遍会重复
 *   · 自定义槽位从 36 号起：0–35 归原版背包，撞号会互相覆盖
 *   · 槽位的 `offset` 就是 `addSlot` 的 `pos`（面板内顶左像素坐标），锚点必须 `top_left`
 *
 * 保存为 `.sui.json` 时的内容与这里同构（就是 JSON.stringify 的结果）。
 * 贴图 `textures/ui/white` 是原版资源包真实存在的路径，画布能直接画出来；
 * 液位柱的橙色液面在真机要用工程自带贴图（JSON UI 的 image 不支持着色），
 * 这里用白色占位，版式一致。
 */

export const SAMPLE = {
  formatVersion: 1,
  tool: 'sapdon-designer',
  uiSystem: { identifier: 'generator_ui', path: 'ui/' },
  canvas: { size: [176, 166], zoom: 4 },
  screenKind: 'container',
  screen: { name: 'fuel_generator', content: null, buttons: null },
  elements: [
    {
      id: 'title_label',
      type: 'label',
      props: {
        size: ['100%', 14],
        text: '[F2]液体燃料发电机',
        color: [0, 0, 0],
        text_alignment: 'center',
        offset: [0, 3],
        anchor_from: 'top_left',
        anchor_to: 'top_left',
        layer: 12,
      },
    },
    {
      id: 'tank_frame',
      type: 'image',
      props: {
        size: [20, 62],
        texture: 'textures/ui/white',
        offset: [22, 22],
        anchor_from: 'top_left',
        anchor_to: 'top_left',
        layer: 5,
        keep_ratio: false,
      },
      controls: [
        {
          id: 'tank_fill',
          type: 'image',
          props: {
            size: [16, 34],
            texture: 'textures/ui/white',
            offset: [0, -2],
            anchor_from: 'bottom_middle',
            anchor_to: 'bottom_middle',
            layer: 6,
            keep_ratio: false,
          },
        },
      ],
    },
    {
      id: 'slot_36',
      type: 'slot',
      props: {
        slot: 36,
        kind: 'input',
        offset: [76, 40],
        size: [18, 18],
        anchor_from: 'top_left',
        anchor_to: 'top_left',
      },
    },
    {
      id: 'slot_37',
      type: 'slot',
      props: {
        slot: 37,
        kind: 'output',
        offset: [110, 42],
        size: [18, 18],
        anchor_from: 'top_left',
        anchor_to: 'top_left',
      },
    },
    {
      id: 'inventory_label',
      type: 'label',
      props: {
        size: [60, 10],
        text: '物品栏',
        color: [0, 0, 0],
        text_alignment: 'left',
        offset: [18, 84],
        anchor_from: 'top_left',
        anchor_to: 'top_left',
        layer: 12,
      },
    },
  ],
}
