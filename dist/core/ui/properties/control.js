/**
 * Control Class
 *
 * This class represents a UI control element with various properties and methods to manipulate its state.
 *
 * Properties:
 * - visible: boolean - If the UI element should be visible (default: true)
 * - enabled: boolean - If true and if the UI element or any of its children have the locked state then they will be in the locked (default: true)
 * - layer: int - Z-Index/Layer (like zindex in CSS) relative to parent element. Higher layers will render above (default: 0)
 * - alpha: float - Alpha/transparency of the element. It will only affect the UI element. Its children will be unaffected. (default: 1.0)
 * - propagate_alpha: boolean - If alpha should not only apply to the parent if possible but also all its children (default: false)
 * - clips_children: boolean - Cuts off visually and interactively everything beyond the boundaries of the UI element (default: false)
 * - allow_clipping: boolean - If clips_children works in the UI element. Otherwise, it won't have any effect (default: true)
 * - clip_offset: Vector [x, y] - Offset from the start of the clipping (default: [0, 0])
 * - clip_state_change_event: string - Event triggered when the clip state changes
 * - enable_scissor_test: boolean - Enables scissor test for clipping (default: false)
 * - property_bag: object - Property bag contains properties/variables that are more related with the data than the actual structure and look of the UI element
 * - selected: boolean - If the text box is selected by default
 * - use_child_anchors: boolean - Use the anchor_from and anchor_to of the child of the UI element (default: false)
 * - controls: array - For adding children to the element
 * - anims: string[] - Array of the animation names
 * - disable_anim_fast_forward: boolean - Disables fast-forwarding animations
 * - animation_reset_name: string - Name of the animation to reset to
 * - ignored: boolean - If the UI element should be ignored (default: false)
 * - variables: array or object - A bunch of conditions that change the variables values
 * - modifications: array - Allows to modify the UI files of resource packs below (vanilla being the most bottom one)
 * - grid_position: Vector [row, column] - Position that the control will take inside the grid. This also allows to modify specific grid items of a hardcoded grid
 * - collection_index: int - Index that the control takes in the collection
 */
/**
 * Control 类
 *
 * 该类表示一个具有各种属性和方法的 UI 控件元素，用于操作其状态。
 *
 * 属性：
 * - visible: boolean - 控制 UI 元素是否可见（默认值：true）
 * - enabled: boolean - 如果为 true，且 UI 元素或其任何子元素处于锁定状态，则它们将被锁定（默认值：true）
 * - layer: int - 相对于父元素的 Z-Index/层级（类似于 CSS 中的 zindex）。较高的层级将渲染在上方（默认值：0）
 * - alpha: float - 元素的透明度。仅影响 UI 元素本身，其子元素不受影响。如果希望透明度同时应用于父元素和子元素，请使用 propagate_alpha（默认值：1.0）
 * - propagate_alpha: boolean - 透明度是否应同时应用于父元素及其所有子元素（默认值：false）
 * - clips_children: boolean - 是否在视觉上和交互上裁剪超出 UI 元素边界的内容（默认值：false）
 * - allow_clipping: boolean - 是否允许在 UI 元素中启用裁剪。否则，clips_children 将无效（默认值：true）
 * - clip_offset: Vector [x, y] - 裁剪起始点的偏移量（默认值：[0, 0]）
 * - clip_state_change_event: string - 裁剪状态更改时触发的事件
 * - enable_scissor_test: boolean - 是否启用裁剪测试（默认值：false）
 * - property_bag: object - 属性包，包含与数据相关的属性/变量，而不是 UI 元素的实际结构和外观
 * - selected: boolean - 文本框是否默认被选中
 * - use_child_anchors: boolean - 是否使用 UI 元素子元素的 anchor_from 和 anchor_to（默认值：false）
 * - controls: array - 用于向元素添加子元素
 * - anims: string[] - 动画名称数组
 * - disable_anim_fast_forward: boolean - 是否禁用动画快进
 * - animation_reset_name: string - 重置动画的名称
 * - ignored: boolean - 是否忽略该 UI 元素（默认值：false）
 * - variables: array 或 object - 一组条件，用于更改变量的值
 * - modifications: array - 允许修改资源包中的 UI 文件（最底层为原版资源包）
 * - grid_position: Vector [row, column] - 控件在网格中的位置。此属性还允许修改硬编码网格中的特定网格项
 * - collection_index: int - 控件在集合中的索引
 */
export class Control {
    constructor() {
        /*
        this.visible = true;
        this.enabled = true;
        this.layer = 0;
        this.alpha = 1.0;
        this.propagate_alpha = false;
        this.clips_children = false;
        this.allow_clipping = true;
        this.clip_offset = [0, 0];
        this.clip_state_change_event = '';
        this.enable_scissor_test = false;
        this.property_bag = {};
        this.selected = false;
        this.use_child_anchors = false;
        this.controls = [];
        this.anims = [];
        this.disable_anim_fast_forward = false;
        this.animation_reset_name = '';
        this.ignored = false;
        this.variables = {};
        this.modifications = [];
        this.grid_position = [0, 0];
        this.collection_index = 0;
        */
    }
    /**
     * 设置控件的可见性。
     * @param {boolean} visible - 控件是否可见（默认值：true）
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setVisible(visible = true) {
        this.visible = visible;
        return this;
    }
    /**
     * 设置控件的启用状态。
     * @param {boolean} enabled - 控件是否启用（默认值：true）
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setEnabled(enabled = true) {
        this.enabled = enabled;
        return this;
    }
    /**
     * 设置控件的层级（z-index）。
     * @param {number} layer - 要设置的层级（默认值：0）
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setLayer(layer = 0) {
        this.layer = layer;
        return this;
    }
    /**
     * 设置控件的透明度。
     * @param {number} alpha - 要设置的透明度值（默认值：1.0）
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setAlpha(alpha = 1.0) {
        this.alpha = alpha;
        return this;
    }
    /**
     * 设置透明度是否应传播到子元素。
     * @param {boolean} propagate - 透明度是否应传播（默认值：false）
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setPropagateAlpha(propagate = false) {
        this.propagate_alpha = propagate;
        return this;
    }
    /**
     * 设置控件是否应裁剪其子元素。
     * @param {boolean} clips - 控件是否应裁剪其子元素（默认值：false）
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setClipsChildren(clips = false) {
        this.clips_children = clips;
        return this;
    }
    /**
     * 设置控件是否允许裁剪。
     * @param {boolean} allow - 是否允许裁剪（默认值：true）
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setAllowClipping(allow = true) {
        this.allow_clipping = allow;
        return this;
    }
    /**
     * 设置控件的裁剪偏移量。
     * @param {number[]} offset - 裁剪偏移量，格式为 [x, y]（默认值：[0, 0]）
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setClipOffset(offset = [0, 0]) {
        this.clip_offset = offset;
        return this;
    }
    /**
     * 设置裁剪状态更改事件。
     * @param {string} event - 裁剪状态更改时触发的事件名称
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setClipStateChangeEvent(event) {
        this.clip_state_change_event = event;
        return this;
    }
    /**
     * 设置是否启用裁剪测试。
     * @param {boolean} enable - 是否启用裁剪测试（默认值：false）
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setEnableScissorTest(enable = false) {
        this.enable_scissor_test = enable;
        return this;
    }
    /**
     * 设置控件的属性包。
     * @param {object} bag - 要设置的属性包
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setPropertyBag(bag) {
        this.property_bag = bag;
        return this;
    }
    /**
     * 设置控件是否被选中。
     * @param {boolean} selected - 控件是否被选中（默认值：false）
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setSelected(selected = false) {
        this.selected = selected;
        return this;
    }
    /**
     * 设置控件是否使用子元素的锚点。
     * @param {boolean} use - 是否使用子元素的锚点（默认值：false）
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setUseChildAnchors(use = false) {
        this.use_child_anchors = use;
        return this;
    }
    /**
     * 向控件添加子控件。
     * @param {Control} control - 要添加的子控件
     * @returns {Control} 返回当前实例以支持链式调用
     */
    addControl(control) {
        if (!this.controls)
            this.controls = [];
        this.controls.push(control);
        return this;
    }
    /**
     * 设置控件的动画。
     * @param {string[]} anims - 动画名称数组
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setAnimations(anims) {
        this.anims = anims;
        return this;
    }
    /**
     * 设置是否禁用动画快进。
     * @param {boolean} disable - 是否禁用动画快进（默认值：false）
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setDisableAnimFastForward(disable = false) {
        this.disable_anim_fast_forward = disable;
        return this;
    }
    /**
     * 设置动画重置名称。
     * @param {string} name - 要重置的动画名称
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setAnimationResetName(name) {
        this.animation_reset_name = name;
        return this;
    }
    /**
     * 设置是否忽略该控件。
     * @param {boolean} ignored - 是否忽略该控件（默认值：false）
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setIgnored(ignored = false) {
        this.ignored = ignored;
        return this;
    }
    /**
     * 设置控件的变量。
     * @param {object} variables - 要设置的变量
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setVariables(variables) {
        this.variables = variables;
        return this;
    }
    /**
     * 设置控件的修改项。
     * @param {array} modifications - 要设置的修改项
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setModifications(modifications) {
        this.modifications = modifications;
        return this;
    }
    /**
     * 设置控件在网格中的位置。
     * @param {number[]} position - 网格位置，格式为 [行, 列]
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setGridPosition(position) {
        this.grid_position = position;
        return this;
    }
    /**
     * 设置控件在集合中的索引。
     * @param {number} index - 要设置的索引
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setCollectionIndex(index) {
        this.collection_index = index;
        return this;
    }
}
