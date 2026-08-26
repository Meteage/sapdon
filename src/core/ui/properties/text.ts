/**
 * Text 类
 *
 * 该类表示一个文本控件，用于管理文本内容及其样式属性。
 *
 * 属性：
 * - text: string - 文本内容（默认值：空字符串）
 * - color: Vector [r, g, b] - 文本颜色（RGB 值，范围 0.0 到 1.0，默认值：[1.0, 1.0, 1.0]）
 * - locked_color: Vector [r, g, b] - 父级禁用时的文本颜色
 * - shadow: boolean - 是否显示文本阴影（默认值：false）
 * - hide_hyphen: boolean - 是否隐藏断词连字符（默认值：false）
 * - notify_on_ellipses: string[] - 文本出现省略号时需通知的控件名称数组
 * - enable_profanity_filter: boolean - 是否启用脏话过滤（默认值：false）
 * - locked_alpha: float - 父级禁用时的透明度
 * - font_size: enum - 字体大小（可能值：small, normal, large, extra_large，默认值：normal）
 * - font_scale_factor: float - 字体缩放比例（默认值：1.0）
 * - localize: boolean - 是否启用本地化翻译（默认值：false）
 * - line_padding: number - 行间距
 * - font_type: enum - 字体类型（可能值：default, rune, unicode, smooth, MinecraftTen 或自定义字体，默认值：default）
 * - backup_font_type: enum - 备用字体类型（默认值：default）
 * - text_alignment: enum - 文本对齐方式（未定义时根据 anchor_from 和 anchor_to 自动调整）
 */

import type { JsonUIBag } from '../types.js'

type RGB = [number, number, number]
type FontSize = 'small' | 'normal' | 'large' | 'extra_large'
type TextAlignment = 'left' | 'right' | 'center'

export class Text {
  [key: string]: unknown

  declare text: string
  declare color: RGB
  declare locked_color: RGB
  declare shadow: boolean
  declare hide_hyphen: boolean
  declare notify_on_ellipses: string[]
  declare enable_profanity_filter: boolean
  declare locked_alpha: number
  declare font_size: FontSize
  declare font_scale_factor: number
  declare localize: boolean
  declare line_padding: number
  declare font_type: string
  declare backup_font_type: string
  declare text_alignment: TextAlignment

  /**
   * 设置文本内容。
   * @param {string} text - 文本内容
   * @returns {Text} 返回当前实例以支持链式调用
   */
  setText(text = ''): this {
    this.text = text
    return this
  }

  /**
   * 设置文本颜色。
   * @param {RGB} color - RGB 颜色值（格式：[r, g, b]，默认值：[1.0, 1.0, 1.0]）
   * @returns {Text} 返回当前实例以支持链式调用
   */
  setColor(color: RGB = [1.0, 1.0, 1.0]): this {
    this.color = color
    return this
  }

  /**
   * 设置父级禁用时的文本颜色。
   * @param {RGB} lockedColor - RGB 颜色值（格式：[r, g, b]）
   * @returns {Text} 返回当前实例以支持链式调用
   */
  setLockedColor(lockedColor: RGB): this {
    this.locked_color = lockedColor
    return this
  }

  /**
   * 设置是否显示文本阴影。
   * @param {boolean} shadow - 是否显示阴影（默认值：false）
   * @returns {Text} 返回当前实例以支持链式调用
   */
  setShadow(shadow = false): this {
    this.shadow = shadow
    return this
  }

  /**
   * 设置是否隐藏断词连字符。
   * @param {boolean} hide - 是否隐藏连字符（默认值：false）
   * @returns {Text} 返回当前实例以支持链式调用
   */
  setHideHyphen(hide = false): this {
    this.hide_hyphen = hide
    return this
  }

  /**
   * 设置文本出现省略号时需通知的控件名称数组。
   * @param {string[]} controls - 控件名称数组
   * @returns {Text} 返回当前实例以支持链式调用
   */
  setNotifyOnEllipses(controls: string[]): this {
    this.notify_on_ellipses = controls
    return this
  }

  /**
   * 添加一个需通知省略号事件的控件名称。
   * @param {string} controlName - 控件名称
   * @returns {Text} 返回当前实例以支持链式调用
   */
  addNotifyOnEllipses(controlName: string): this {
    this.notify_on_ellipses!.push(controlName)
    return this
  }

  /**
   * 设置是否启用脏话过滤。
   * @param {boolean} enable - 是否启用过滤（默认值：false）
   * @returns {Text} 返回当前实例以支持链式调用
   */
  setEnableProfanityFilter(enable = false): this {
    this.enable_profanity_filter = enable
    return this
  }

  /**
   * 设置父级禁用时的透明度。
   * @param {number} alpha - 透明度（范围：0.0 到 1.0）
   * @returns {Text} 返回当前实例以支持链式调用
   */
  setLockedAlpha(alpha: number): this {
    this.locked_alpha = alpha
    return this
  }

  /**
   * 设置字体大小。
   * @param {FontSize} size - 字体大小（可能值：small, normal, large, extra_large，默认值：normal）
   * @returns {Text} 返回当前实例以支持链式调用
   */
  setFontSize(size: FontSize = 'normal'): this {
    this.font_size = size
    return this
  }

  /**
   * 设置字体缩放比例。
   * @param {number} factor - 缩放比例（默认值：1.0）
   * @returns {Text} 返回当前实例以支持链式调用
   */
  setFontScaleFactor(factor = 1.0): this {
    this.font_scale_factor = factor
    return this
  }

  /**
   * 设置是否启用本地化翻译。
   * @param {boolean} localize - 是否启用本地化（默认值：false）
   * @returns {Text} 返回当前实例以支持链式调用
   */
  setLocalize(localize = false): this {
    this.localize = localize
    return this
  }

  /**
   * 设置行间距。
   * @param {number} padding - 行间距
   * @returns {Text} 返回当前实例以支持链式调用
   */
  setLinePadding(padding: number): this {
    this.line_padding = padding
    return this
  }

  /**
   * 设置字体类型。
   * @param {string} font - 字体类型（可能值：default, rune, unicode 等，默认值：default）
   * @returns {Text} 返回当前实例以支持链式调用
   */
  setFontType(font = 'default'): this {
    this.font_type = font
    return this
  }

  /**
   * 设置备用字体类型。
   * @param {string} backupFont - 备用字体类型（默认值：default）
   * @returns {Text} 返回当前实例以支持链式调用
   */
  setBackupFontType(backupFont = 'default'): this {
    this.backup_font_type = backupFont
    return this
  }

  /**
   * 设置文本对齐方式。
   * @param {TextAlignment} alignment - 对齐方式（例如：left, right, center）
   * @returns {Text} 返回当前实例以支持链式调用
   */
  setTextAlignment(alignment: TextAlignment): this {
    this.text_alignment = alignment
    return this
  }
}