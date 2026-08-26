/** 共享 UI 类型定义（JSON UI 规范的受控映射） */

/** 尺寸向量（像素数字或百分比/计算字符串），如 [320, 207] / ["50%", "100%"] */
export type Size2 = [number | string, number | string]

/** 偏移向量 [x, y]（像素） */
export type Offset2 = [number, number]

/** 锚点（anchor_from / anchor_to）可选值 */
export type Anchor =
  | 'top_left'
  | 'top_middle'
  | 'top_right'
  | 'left_middle'
  | 'center'
  | 'right_middle'
  | 'bottom_left'
  | 'bottom_middle'
  | 'bottom_right'

/** 数据绑定类型 */
export type BindingType = 'global' | 'view' | 'collection' | 'collection_details' | 'none'

/** 数据绑定条件 */
export type BindingCondition =
  | 'always'
  | 'always_when_visible'
  | 'visible'
  | 'once'
  | 'none'
  | 'visibility_changed'

/** 调制操作类型（Modifications.OPERATION 的字面量） */
export type ModificationOperation =
  | 'insert_back'
  | 'insert_front'
  | 'insert_after'
  | 'insert_before'
  | 'move_back'
  | 'move_front'
  | 'move_after'
  | 'move_before'
  | 'swap'
  | 'replace'
  | 'remove'

/** 一个 JSON UI 元素对象（键值对，值可为基本类型/数组/对象/表达式字符串） */
export type JsonUIValue = string | number | boolean | null | unknown[] | Record<string, unknown>

/** 支持任意键的 JSON UI 属性包（类内部索引签名基类型） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JsonUIBag = { [key: string]: any }