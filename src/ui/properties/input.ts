/**
 * Input 类
 *
 * 该类表示输入配置，用于管理 UI 元素的输入行为。
 *
 * 属性：
 * - button_mappings: Array of mapping objects - 按钮映射配置
 * - modal: boolean - 是否为模态输入
 * - inline_modal: boolean - 是否为内联模态输入
 * - always_listen_to_input: boolean - 是否始终监听输入
 * - always_handle_pointer: boolean - 是否始终处理指针事件
 * - always_handle_controller_direction: boolean - 是否始终处理控制器方向事件
 * - hover_enabled: boolean - 是否启用悬停事件
 * - prevent_touch_input: boolean - 是否阻止触摸输入
 * - consume_event: boolean - 是否消耗事件
 * - consume_hover_events: boolean - 是否消耗悬停事件
 * - gesture_tracking_button: string - 手势跟踪按钮
 */

import type { JsonUIBag } from '../types.js'

export class Input {
  [key: string]: unknown

  declare button_mappings: JsonUIBag[]
  declare modal: boolean
  declare inline_modal: boolean
  declare always_listen_to_input: boolean
  declare always_handle_pointer: boolean
  declare always_handle_controller_direction: boolean
  declare hover_enabled: boolean
  declare prevent_touch_input: boolean
  declare consume_event: boolean
  declare consume_hover_events: boolean
  declare gesture_tracking_button: string

  /**
   * 设置按钮映射配置。
   * @param {JsonUIBag[]} mappings - 按钮映射配置数组
   * @returns {Input} 返回当前实例以支持链式调用
   */
  setButtonMappings(mappings: JsonUIBag[]): this {
    this.button_mappings = mappings
    return this
  }

  /**
   * 设置是否为模态输入。
   * @param {boolean} modal - 是否为模态输入
   * @returns {Input} 返回当前实例以支持链式调用
   */
  setModal(modal = false): this {
    this.modal = modal
    return this
  }

  /**
   * 设置是否为内联模态输入。
   * @param {boolean} inlineModal - 是否为内联模态输入
   * @returns {Input} 返回当前实例以支持链式调用
   */
  setInlineModal(inlineModal = false): this {
    this.inline_modal = inlineModal
    return this
  }

  /**
   * 设置是否始终监听输入。
   * @param {boolean} alwaysListen - 是否始终监听输入
   * @returns {Input} 返回当前实例以支持链式调用
   */
  setAlwaysListenToInput(alwaysListen = false): this {
    this.always_listen_to_input = alwaysListen
    return this
  }

  /**
   * 设置是否始终处理指针事件。
   * @param {boolean} alwaysHandle - 是否始终处理指针事件
   * @returns {Input} 返回当前实例以支持链式调用
   */
  setAlwaysHandlePointer(alwaysHandle = false): this {
    this.always_handle_pointer = alwaysHandle
    return this
  }

  /**
   * 设置是否始终处理控制器方向事件。
   * @param {boolean} alwaysHandle - 是否始终处理控制器方向事件
   * @returns {Input} 返回当前实例以支持链式调用
   */
  setAlwaysHandleControllerDirection(alwaysHandle = false): this {
    this.always_handle_controller_direction = alwaysHandle
    return this
  }

  /**
   * 设置是否启用悬停事件。
   * @param {boolean} enabled - 是否启用悬停事件
   * @returns {Input} 返回当前实例以支持链式调用
   */
  setHoverEnabled(enabled = false): this {
    this.hover_enabled = enabled
    return this
  }

  /**
   * 设置是否阻止触摸输入。
   * @param {boolean} prevent - 是否阻止触摸输入
   * @returns {Input} 返回当前实例以支持链式调用
   */
  setPreventTouchInput(prevent = false): this {
    this.prevent_touch_input = prevent
    return this
  }

  /**
   * 设置是否消耗事件。
   * @param {boolean} consume - 是否消耗事件
   * @returns {Input} 返回当前实例以支持链式调用
   */
  setConsumeEvent(consume = false): this {
    this.consume_event = consume
    return this
  }

  /**
   * 设置是否消耗悬停事件。
   * @param {boolean} consume - 是否消耗悬停事件
   * @returns {Input} 返回当前实例以支持链式调用
   */
  setConsumeHoverEvents(consume = false): this {
    this.consume_hover_events = consume
    return this
  }

  /**
   * 设置手势跟踪按钮。
   * @param {string} button - 手势跟踪按钮
   * @returns {Input} 返回当前实例以支持链式调用
   */
  setGestureTrackingButton(button: string): this {
    this.gesture_tracking_button = button
    return this
  }
}