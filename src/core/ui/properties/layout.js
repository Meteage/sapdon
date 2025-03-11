/**
 * Layout 类
 * 
 * 该类表示一个具有各种属性和方法的 UI 布局元素，用于操作其布局和大小。
 * 
 * 属性：
 * - size: Vector [width, height] - UI 元素的大小（默认值：["default", "default"]）
 * - max_size: Vector [width, height] - UI 元素的最大大小（默认值：["default", "default"]）
 * - min_size: Vector [width, height] - UI 元素的最小大小（默认值：["default", "default"]）
 * - offset: Vector [x, y] - UI 元素相对于父元素的位置（默认值：[0, 0]）
 * - anchor_from: enum - 父元素中的锚点（默认值：center）
 * - anchor_to: enum - 元素自身的锚点（默认值：center）
 * - inherit_max_sibling_width: boolean - 是否使用兄弟元素的最大宽度（默认值：false）
 * - inherit_max_sibling_height: boolean - 是否使用兄弟元素的最大高度（默认值：false）
 * - use_anchored_offset: boolean - 是否使用基于锚点的偏移（默认值：false）
 * - contained: boolean - 是否限制元素在父元素边界内（默认值：false）
 * - draggable: enum - 是否使元素可拖动（可能值：vertical, horizontal, both）
 * - follows_cursor: boolean - 是否使元素跟随光标（默认值：false）
 */

export class Layout {
    constructor() {
        /*
        this.size = ["default", "default"];
        this.max_size = ["default", "default"];
        this.min_size = ["default", "default"];
        this.offset = [0, 0];
        this.anchor_from = "center";
        this.anchor_to = "center";
        this.inherit_max_sibling_width = false;
        this.inherit_max_sibling_height = false;
        this.use_anchored_offset = false;
        this.contained = false;
        this.draggable = null;
        this.follows_cursor = false;
        */
    }

    /**
     * 设置 UI 元素的大小。
     * @param {any[]} size - 大小，格式为 [width, height]（默认值：["default", "default"]）
     * @returns {Layout} 返回当前实例以支持链式调用
     */
    setSize(size = ["default", "default"]) {
        this.size = size;
        return this;
    }

    /**
     * 设置 UI 元素的最大大小。
     * @param {string[]} maxSize - 最大大小，格式为 [width, height]（默认值：["default", "default"]）
     * @returns {Layout} 返回当前实例以支持链式调用
     */
    setMaxSize(maxSize = ["default", "default"]) {
        this.max_size = maxSize;
        return this;
    }

    /**
     * 设置 UI 元素的最小大小。
     * @param {string[]} minSize - 最小大小，格式为 [width, height]（默认值：["default", "default"]）
     * @returns {Layout} 返回当前实例以支持链式调用
     */
    setMinSize(minSize = ["default", "default"]) {
        this.min_size = minSize;
        return this;
    }

    /**
     * 设置 UI 元素相对于父元素的位置。
     * @param {number[]} offset - 偏移量，格式为 [x, y]（默认值：[0, 0]）
     * @returns {Layout} 返回当前实例以支持链式调用
     */
    setOffset(offset = [0, 0]) {
        this.offset = offset;
        return this;
    }

    /**
     * 设置父元素中的锚点。
     * @param {string} anchorFrom - 锚点（可能值：top_left, top_middle, top_right, left_middle, center, right_middle, bottom_left, bottom_middle, bottom_right）（默认值：center）
     * @returns {Layout} 返回当前实例以支持链式调用
     */
    setAnchorFrom(anchorFrom = "center") {
        this.anchor_from = anchorFrom;
        return this;
    }

    /**
     * 设置元素自身的锚点。
     * @param {string} anchorTo - 锚点（可能值：top_left, top_middle, top_right, left_middle, center, right_middle, bottom_left, bottom_middle, bottom_right）（默认值：center）
     * @returns {Layout} 返回当前实例以支持链式调用
     */
    setAnchorTo(anchorTo = "center") {
        this.anchor_to = anchorTo;
        return this;
    }

    /**
     * 设置是否使用兄弟元素的最大宽度。
     * @param {boolean} inherit - 是否使用兄弟元素的最大宽度（默认值：false）
     * @returns {Layout} 返回当前实例以支持链式调用
     */
    setInheritMaxSiblingWidth(inherit = false) {
        this.inherit_max_sibling_width = inherit;
        return this;
    }

    /**
     * 设置是否使用兄弟元素的最大高度。
     * @param {boolean} inherit - 是否使用兄弟元素的最大高度（默认值：false）
     * @returns {Layout} 返回当前实例以支持链式调用
     */
    setInheritMaxSiblingHeight(inherit = false) {
        this.inherit_max_sibling_height = inherit;
        return this;
    }

    /**
     * 设置是否使用基于锚点的偏移。
     * @param {boolean} use - 是否使用基于锚点的偏移（默认值：false）
     * @returns {Layout} 返回当前实例以支持链式调用
     */
    setUseAnchoredOffset(use = false) {
        this.use_anchored_offset = use;
        return this;
    }

    /**
     * 设置是否限制元素在父元素边界内。
     * @param {boolean} contained - 是否限制元素在父元素边界内（默认值：false）
     * @returns {Layout} 返回当前实例以支持链式调用
     */
    setContained(contained = false) {
        this.contained = contained;
        return this;
    }

    /**
     * 设置是否使元素可拖动。
     * @param {string} draggable - 是否使元素可拖动（可能值：vertical, horizontal, both）
     * @returns {Layout} 返回当前实例以支持链式调用
     */
    setDraggable(draggable) {
        this.draggable = draggable;
        return this;
    }

    /**
     * 设置是否使元素跟随光标。
     * @param {boolean} follows - 是否使元素跟随光标（默认值：false）
     * @returns {Layout} 返回当前实例以支持链式调用
     */
    setFollowsCursor(follows = false) {
        this.follows_cursor = follows;
        return this;
    }
}