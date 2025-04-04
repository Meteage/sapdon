declare enum ItemCategory {
    Commands = "commands",
    Construction = "construction",
    Equipment = "equipment",
    Nature = "nature",
    Items = "items",
    None = "none"
}

declare function getMetadata(target: any): any;
declare function getOrCreateMetadata(target: any): any;

interface ISerializer {
    (instance: any): object;
}
declare function jsonEncoderReplacer(_: string, v: any): any;
declare const defaultSerializer: ISerializer;
declare function Serializable(serializer?: ISerializer): (_: any, ctx: DecoratorContext) => void;
/**
 * 只能应用一个 Serializer
 *
 * 重复的 Serializer 会被覆盖
 * @param target
 * @param ctx
 */
declare const Serializer: MethodDecorator;
declare function serialize<R, T extends object>(inst: T): R;
declare const jsonEncodeDecoder: EncodeDecoder<any, string>;
declare function encode<Base, Trans>(value: Base, encodeDecoder?: EncodeDecoder<Base, Trans>): Trans;
declare function decode<Trans, Base>(value: Trans, encodeDecoder?: EncodeDecoder<Base, Trans>): Base;
interface EncodeDecoder<Base, Trans> {
    encode: (data: Base) => Trans;
    decode: (chunk: Trans) => Base;
}

type ConstructorOf<T, Arg extends unknown[] = []> = new (...args: Arg) => T;

type FloatLiteral = `${number}.${number}`;
interface RawType<T> extends RawJSON {
    valueOf(): T;
}
declare const IS_RAW_SYMBOL: unique symbol;
declare const f64: (literal: FloatLiteral) => {
    [IS_RAW_SYMBOL]: boolean;
    rawJSON: string;
    valueOf(): number;
};
declare function isRawJSON(v: any): boolean;

declare class ArrayEx extends Array {
    constructor(init?: number[]);
    set(arr: Iterable<number>): void;
}

interface Vector3 {
    x: number;
    y: number;
    z: number;
}
declare class Vec3 extends ArrayEx implements Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(init: number[]);
    static fromXYZ(x: number, y: number, z: number): Vec3;
    static fromVec3(vec3: Vector3): Vec3;
    static m(vec3: Vector3): number;
    m(): number;
    static isZero(vec: Vector3): boolean;
    isZero(): boolean;
    static normalize(vec: Vector3): false | undefined;
    n(): false | undefined;
    static add(vec1: Vector3, vec2: Vector3): Vec3;
    add(vec: Vector3): Vec3;
    static sub(vec1: Vector3, vec2: Vector3): Vec3;
    sub(vec: Vector3): Vec3;
    static mul(vec: Vector3, scalar: number): Vec3;
    mul(scalar: number): Vec3;
    static div(vec: Vector3, scalar: number): Vec3;
    div(scalar: number): Vec3;
    static dot(vec1: Vector3, vec2: Vector3): number;
    dot(vec: Vector3): number;
    static cross(vec1: Vector3, vec2: Vector3): Vec3;
    cross(vec: Vector3): Vec3;
    valueOf(): ArrayEx;
    toString(): string;
}

interface Vector4 extends Vector3 {
    w: number;
}
declare class Vec4 extends ArrayEx implements Vector4 {
    x: number;
    y: number;
    z: number;
    w: number;
    constructor(init: number[]);
    static fromXYZW(x: number, y: number, z: number, w: number): Vec4;
    static fromVec3(vec3: Vector4): Vec4;
    static fromVec4(vec4: Vector4): Vec4;
    static m(vec: Vector4): number;
    m(): number;
    static isZero(vec: Vector4): boolean;
    isZero(): boolean;
    static normalize(vec: Vector4): false | undefined;
    n(): false | undefined;
    static add(vec1: Vector4, vec2: Vector4): Vec4;
    add(vec: Vector4): Vec4;
    static sub(vec1: Vector4, vec2: Vector4): Vec4;
    sub(vec: Vector4): Vec4;
    static mul(vec: Vector4, scalar: number): Vec4;
    mul(scalar: number): Vec4;
    static div(vec: Vector4, scalar: number): Vec4;
    div(scalar: number): Vec4;
    static dot(vec1: Vector4, vec2: Vector4): number;
    dot(vec: Vector4): number;
    static multiply(vec: Vector4, mat: Matrix): number[] | Vec4;
    multiply(mat: Matrix): number[] | Vec4;
    valueOf(): ArrayEx;
    toString(): string;
}

declare class Matrix extends ArrayEx {
    constructor();
    get m11(): any;
    get m12(): any;
    get m13(): any;
    get m14(): any;
    get m21(): any;
    get m22(): any;
    get m23(): any;
    get m24(): any;
    get m31(): any;
    get m32(): any;
    get m33(): any;
    get m34(): any;
    get m41(): any;
    get m42(): any;
    get m43(): any;
    get m44(): any;
    set m11(v: any);
    set m12(v: any);
    set m13(v: any);
    set m14(v: any);
    set m21(v: any);
    set m22(v: any);
    set m23(v: any);
    set m24(v: any);
    set m31(v: any);
    set m32(v: any);
    set m33(v: any);
    set m34(v: any);
    set m41(v: any);
    set m42(v: any);
    set m43(v: any);
    set m44(v: any);
    get a(): any;
    get b(): any;
    get c(): any;
    get d(): any;
    get e(): any;
    get f(): any;
    set a(v: any);
    set b(v: any);
    set c(v: any);
    set d(v: any);
    set e(v: any);
    set f(v: any);
    static init(init: Iterable<number>, mapfn: (v: number, k: number) => number, thisArg?: any): Matrix;
    clone(): Matrix;
    setIdentity(): this;
    static identity(): Matrix;
    static add(m1: Matrix, m2: Matrix): Matrix;
    add(m: Matrix): Matrix;
    static sub(m1: Matrix, m2: Matrix): Matrix;
    sub(m: Matrix): Matrix;
    setTranslation(x: number, y: number, z: number): this;
    setRotation(angle: number, axis: Vec3): this;
    setScale(x: number, y: number, z: number): this;
    setRotationX(angle: number): this;
    setRotationY(angle: number): this;
    setRotationZ(angle: number): this;
    setRotationXYZ(yaw: number, pitch: number, roll: number): this;
    static translate(mat: Matrix, vec: Vector3): Matrix;
    translate(vec: Vector3): Matrix;
    static transpose(mat: Matrix): any[];
    transpose(): any[];
    static multiply(mat1: Matrix, t: Matrix | Vector4): number[] | Vec4;
    multiply(t: Matrix | Vector4): number[] | Vec4;
    valueOf(): ArrayEx;
    toString(): string;
    static perspective(fov: number, aspect: number, near: number, far: number): number[];
    static orthographic(right: number, top: number, near: number, far: number): number[];
    static lookAt(eye: Vector3, target: Vector3, up: Vector3): number[];
}

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
declare class Control {
    /**
     * 设置控件的可见性。
     * @param {boolean} visible - 控件是否可见（默认值：true）
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setVisible(visible?: boolean): Control;
    visible: boolean | undefined;
    /**
     * 设置控件的启用状态。
     * @param {boolean} enabled - 控件是否启用（默认值：true）
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setEnabled(enabled?: boolean): Control;
    enabled: boolean | undefined;
    /**
     * 设置控件的层级（z-index）。
     * @param {number} layer - 要设置的层级（默认值：0）
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setLayer(layer?: number): Control;
    layer: number | undefined;
    /**
     * 设置控件的透明度。
     * @param {number} alpha - 要设置的透明度值（默认值：1.0）
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setAlpha(alpha?: number): Control;
    alpha: number | undefined;
    /**
     * 设置透明度是否应传播到子元素。
     * @param {boolean} propagate - 透明度是否应传播（默认值：false）
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setPropagateAlpha(propagate?: boolean): Control;
    propagate_alpha: boolean | undefined;
    /**
     * 设置控件是否应裁剪其子元素。
     * @param {boolean} clips - 控件是否应裁剪其子元素（默认值：false）
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setClipsChildren(clips?: boolean): Control;
    clips_children: boolean | undefined;
    /**
     * 设置控件是否允许裁剪。
     * @param {boolean} allow - 是否允许裁剪（默认值：true）
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setAllowClipping(allow?: boolean): Control;
    allow_clipping: boolean | undefined;
    /**
     * 设置控件的裁剪偏移量。
     * @param {number[]} offset - 裁剪偏移量，格式为 [x, y]（默认值：[0, 0]）
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setClipOffset(offset?: number[]): Control;
    clip_offset: number[] | undefined;
    /**
     * 设置裁剪状态更改事件。
     * @param {string} event - 裁剪状态更改时触发的事件名称
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setClipStateChangeEvent(event: string): Control;
    clip_state_change_event: string | undefined;
    /**
     * 设置是否启用裁剪测试。
     * @param {boolean} enable - 是否启用裁剪测试（默认值：false）
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setEnableScissorTest(enable?: boolean): Control;
    enable_scissor_test: boolean | undefined;
    /**
     * 设置控件的属性包。
     * @param {object} bag - 要设置的属性包
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setPropertyBag(bag: object): Control;
    property_bag: object | undefined;
    /**
     * 设置控件是否被选中。
     * @param {boolean} selected - 控件是否被选中（默认值：false）
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setSelected(selected?: boolean): Control;
    selected: boolean | undefined;
    /**
     * 设置控件是否使用子元素的锚点。
     * @param {boolean} use - 是否使用子元素的锚点（默认值：false）
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setUseChildAnchors(use?: boolean): Control;
    use_child_anchors: boolean | undefined;
    /**
     * 向控件添加子控件。
     * @param {Control} control - 要添加的子控件
     * @returns {Control} 返回当前实例以支持链式调用
     */
    addControl(control: Control): Control;
    controls: any[] | undefined;
    /**
     * 设置控件的动画。
     * @param {string[]} anims - 动画名称数组
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setAnimations(anims: string[]): Control;
    anims: string[] | undefined;
    /**
     * 设置是否禁用动画快进。
     * @param {boolean} disable - 是否禁用动画快进（默认值：false）
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setDisableAnimFastForward(disable?: boolean): Control;
    disable_anim_fast_forward: boolean | undefined;
    /**
     * 设置动画重置名称。
     * @param {string} name - 要重置的动画名称
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setAnimationResetName(name: string): Control;
    animation_reset_name: string | undefined;
    /**
     * 设置是否忽略该控件。
     * @param {boolean} ignored - 是否忽略该控件（默认值：false）
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setIgnored(ignored?: boolean): Control;
    ignored: boolean | undefined;
    /**
     * 设置控件的变量。
     * @param {object} variables - 要设置的变量
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setVariables(variables: object): Control;
    variables: object | undefined;
    /**
     * 设置控件的修改项。
     * @param {array} modifications - 要设置的修改项
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setModifications(modifications: array): Control;
    modifications: any;
    /**
     * 设置控件在网格中的位置。
     * @param {number[]} position - 网格位置，格式为 [行, 列]
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setGridPosition(position: number[]): Control;
    grid_position: number[] | undefined;
    /**
     * 设置控件在集合中的索引。
     * @param {number} index - 要设置的索引
     * @returns {Control} 返回当前实例以支持链式调用
     */
    setCollectionIndex(index: number): Control;
    collection_index: number | undefined;
}

declare class UIElement {
    constructor(name: any, type: any, template: any);
    type: any;
    id: any;
    name: any;
    control: Control;
    properties: Map<any, any>;
    variables: Map<any, any>;
    modifications: any[];
    enableDebug(): this;
    setControl(control: any): this;
    addControl(control: any): this;
    addControls(controls: any): this;
    addVariable(name: any, value: any): this;
    addProp(name: any, value: any): this;
    addModification(modification: any): this;
    serialize(): {
        [x: number]: any;
    };
}
/**
 * Modifications ​
    To modify JSON UI in a non-intrusive way, you can use the modifications property to modify previously existing JSON UI elements from other packs (usually vanilla JSON UI files). Doing this makes sure only necessary parts are modified unless otherwise intended, to improve compatibility with other packs that modify the JSON UI.

    Modification	Description
    insert_back	insert at end of array
    insert_front	insert at start of array
    insert_after	insert after target in array
    insert_before	insert before target in array
    move_back	move target to end of array
    move_front	move target to start of array
    move_after	move target after second target
    move_before	move target before second target
    swap	swap first target with second target
    replace	replace first target with second target
    remove	remove target
 */
declare class Modifications {
    static OPERATION: Readonly<{
        INSERT_BACK: "insert_back";
        INSERT_FRONT: "insert_front";
        INSERT_AFTER: "insert_after";
        INSERT_BEFORE: "insert_before";
        MOVE_BACK: "move_back";
        MOVE_FRONT: "move_front";
        MOVE_AFTER: "move_after";
        MOVE_BEFORE: "move_before";
        SWAP: "swap";
        REPLACE: "replace";
        REMOVE: "remove";
    }>;
}

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
declare class Input {
    /**
     * 设置按钮映射配置。
     * @param {ButtonMapping[]} mappings - 按钮映射配置数组
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setButtonMappings(mappings: ButtonMapping[]): Input;
    button_mappings: ButtonMapping[] | undefined;
    /**
     * 设置是否为模态输入。
     * @param {boolean} modal - 是否为模态输入
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setModal(modal?: boolean): Input;
    modal: boolean | undefined;
    /**
     * 设置是否为内联模态输入。
     * @param {boolean} inlineModal - 是否为内联模态输入
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setInlineModal(inlineModal?: boolean): Input;
    inline_modal: boolean | undefined;
    /**
     * 设置是否始终监听输入。
     * @param {boolean} alwaysListen - 是否始终监听输入
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setAlwaysListenToInput(alwaysListen?: boolean): Input;
    always_listen_to_input: boolean | undefined;
    /**
     * 设置是否始终处理指针事件。
     * @param {boolean} alwaysHandle - 是否始终处理指针事件
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setAlwaysHandlePointer(alwaysHandle?: boolean): Input;
    always_handle_pointer: boolean | undefined;
    /**
     * 设置是否始终处理控制器方向事件。
     * @param {boolean} alwaysHandle - 是否始终处理控制器方向事件
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setAlwaysHandleControllerDirection(alwaysHandle?: boolean): Input;
    always_handle_controller_direction: boolean | undefined;
    /**
     * 设置是否启用悬停事件。
     * @param {boolean} enabled - 是否启用悬停事件
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setHoverEnabled(enabled?: boolean): Input;
    hover_enabled: boolean | undefined;
    /**
     * 设置是否阻止触摸输入。
     * @param {boolean} prevent - 是否阻止触摸输入
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setPreventTouchInput(prevent?: boolean): Input;
    prevent_touch_input: boolean | undefined;
    /**
     * 设置是否消耗事件。
     * @param {boolean} consume - 是否消耗事件
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setConsumeEvent(consume?: boolean): Input;
    consume_event: boolean | undefined;
    /**
     * 设置是否消耗悬停事件。
     * @param {boolean} consume - 是否消耗悬停事件
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setConsumeHoverEvents(consume?: boolean): Input;
    consume_hover_events: boolean | undefined;
    /**
     * 设置手势跟踪按钮。
     * @param {string} button - 手势跟踪按钮
     * @returns {Input} 返回当前实例以支持链式调用
     */
    setGestureTrackingButton(button: string): Input;
    gesture_tracking_button: string | undefined;
}

/**
 * Sound 类
 *
 * 该类表示一个声音控件，用于管理声音播放及其相关属性。
 *
 * 属性：
 * - sound_name: string - 声音名称（定义在 RP/sounds/sound_definitions.json 文件中）
 * - sound_volume: float - 声音音量（默认值：1.0）
 * - sound_pitch: float - 声音音调（默认值：1.0）
 * - sounds: Array of sound objects - 触发事件时播放的声音数组
 */
declare class Sound {
    /**
     * 设置声音名称。
     * @param {string} name - 声音名称（定义在 RP/sounds/sound_definitions.json 文件中）
     * @returns {Sound} 返回当前实例以支持链式调用
     */
    setSoundName(name: string): Sound;
    sound_name: string | undefined;
    /**
     * 设置声音音量。
     * @param {number} volume - 音量（范围：0.0 到 1.0，默认值：1.0）
     * @returns {Sound} 返回当前实例以支持链式调用
     */
    setSoundVolume(volume?: number): Sound;
    sound_volume: number | undefined;
    /**
     * 设置声音音调。
     * @param {number} pitch - 音调（默认值：1.0）
     * @returns {Sound} 返回当前实例以支持链式调用
     */
    setSoundPitch(pitch?: number): Sound;
    sound_pitch: number | undefined;
    /**
     * 设置触发事件时播放的声音数组。
     * @param {object[]} sounds - 声音对象数组
     * @returns {Sound} 返回当前实例以支持链式调用
     */
    setSounds(sounds: object[]): Sound;
    sounds: object[] | undefined;
    /**
     * 添加一个声音对象到声音数组。
     * @param {object} sound - 声音对象
     * @returns {Sound} 返回当前实例以支持链式调用
     */
    addSound(sound: object): Sound;
}

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
declare class Layout {
    /**
     * 设置 UI 元素的大小。
     * @param {any[]} size - 大小，格式为 [width, height]（默认值：["default", "default"]）
     * @returns {Layout} 返回当前实例以支持链式调用
     */
    setSize(size?: any[]): Layout;
    size: any[] | undefined;
    /**
     * 设置 UI 元素的最大大小。
     * @param {string[]} maxSize - 最大大小，格式为 [width, height]（默认值：["default", "default"]）
     * @returns {Layout} 返回当前实例以支持链式调用
     */
    setMaxSize(maxSize?: string[]): Layout;
    max_size: string[] | undefined;
    /**
     * 设置 UI 元素的最小大小。
     * @param {string[]} minSize - 最小大小，格式为 [width, height]（默认值：["default", "default"]）
     * @returns {Layout} 返回当前实例以支持链式调用
     */
    setMinSize(minSize?: string[]): Layout;
    min_size: string[] | undefined;
    /**
     * 设置 UI 元素相对于父元素的位置。
     * @param {number[]} offset - 偏移量，格式为 [x, y]（默认值：[0, 0]）
     * @returns {Layout} 返回当前实例以支持链式调用
     */
    setOffset(offset?: number[]): Layout;
    offset: number[] | undefined;
    /**
     * 设置父元素中的锚点。
     * @param {string} anchorFrom - 锚点（可能值：top_left, top_middle, top_right, left_middle, center, right_middle, bottom_left, bottom_middle, bottom_right）（默认值：center）
     * @returns {Layout} 返回当前实例以支持链式调用
     */
    setAnchorFrom(anchorFrom?: string): Layout;
    anchor_from: string | undefined;
    /**
     * 设置元素自身的锚点。
     * @param {string} anchorTo - 锚点（可能值：top_left, top_middle, top_right, left_middle, center, right_middle, bottom_left, bottom_middle, bottom_right）（默认值：center）
     * @returns {Layout} 返回当前实例以支持链式调用
     */
    setAnchorTo(anchorTo?: string): Layout;
    anchor_to: string | undefined;
    /**
     * 设置是否使用兄弟元素的最大宽度。
     * @param {boolean} inherit - 是否使用兄弟元素的最大宽度（默认值：false）
     * @returns {Layout} 返回当前实例以支持链式调用
     */
    setInheritMaxSiblingWidth(inherit?: boolean): Layout;
    inherit_max_sibling_width: boolean | undefined;
    /**
     * 设置是否使用兄弟元素的最大高度。
     * @param {boolean} inherit - 是否使用兄弟元素的最大高度（默认值：false）
     * @returns {Layout} 返回当前实例以支持链式调用
     */
    setInheritMaxSiblingHeight(inherit?: boolean): Layout;
    inherit_max_sibling_height: boolean | undefined;
    /**
     * 设置是否使用基于锚点的偏移。
     * @param {boolean} use - 是否使用基于锚点的偏移（默认值：false）
     * @returns {Layout} 返回当前实例以支持链式调用
     */
    setUseAnchoredOffset(use?: boolean): Layout;
    use_anchored_offset: boolean | undefined;
    /**
     * 设置是否限制元素在父元素边界内。
     * @param {boolean} contained - 是否限制元素在父元素边界内（默认值：false）
     * @returns {Layout} 返回当前实例以支持链式调用
     */
    setContained(contained?: boolean): Layout;
    contained: boolean | undefined;
    /**
     * 设置是否使元素可拖动。
     * @param {string} draggable - 是否使元素可拖动（可能值：vertical, horizontal, both）
     * @returns {Layout} 返回当前实例以支持链式调用
     */
    setDraggable(draggable: string): Layout;
    draggable: string | undefined;
    /**
     * 设置是否使元素跟随光标。
     * @param {boolean} follows - 是否使元素跟随光标（默认值：false）
     * @returns {Layout} 返回当前实例以支持链式调用
     */
    setFollowsCursor(follows?: boolean): Layout;
    follows_cursor: boolean | undefined;
}

declare class DataBinding {
    setBinding(binding: any): this;
    bindings: any[] | undefined;
    binding: any;
    addDataBinding(dataBindingObject: any): this;
}

/**
 * Factory 类
 *
 * 该类表示一个工厂控件，用于管理子控件的名称和 ID。
 *
 * 属性：
 * - control_name: string - 工厂的子控件名
 * - control_ids: object - 工厂的子控件 ID 对象组
 */
declare class Factory {
    /**
     * 设置工厂的名。
     * @param {string} name - 名（格式：name）
     * @returns {Factory} 返回当前实例以支持链式调用
     */
    setName(name: string): Factory;
    factory: {} | undefined;
    /**
     * 设置工厂的子控件名。
     * @param {string} name - 子控件名（格式：namespace.controls_name）
     * @returns {Factory} 返回当前实例以支持链式调用
     */
    setControlName(name: string): Factory;
    /**
     * 设置工厂的子控件 ID 对象组。
     * @param {object} ids - 子控件 ID 对象组
     * @returns {Factory} 返回当前实例以支持链式调用
     */
    setControlIds(ids: object): Factory;
    /**
     * 添加一个子控件 ID。
     * @param {string} key - 子控件的键名
     * @param {string} value - 子控件的 ID 值
     * @returns {Factory} 返回当前实例以支持链式调用
     */
    addControlId(key: string, value: string): Factory;
}

declare class Button extends UIElement {
    constructor(id: any, template: any);
    input: Input;
    sound: Sound;
    layout: Layout;
    dataBinding: DataBinding;
    factory: Factory;
    setDefaultControl(default_control: any): this;
    setHoverControl(hover_control: any): this;
    setPressedControl(pressed_control: any): this;
    setLockedControl(locked_control: any): this;
    setInput(input: any): this;
    setSound(sound: any): this;
    setLayout(layout: any): this;
}

declare class CollectionPanel extends UIElement {
    constructor(id: any, template: any);
    layout: Layout;
    dataBinding: DataBinding;
    factory: Factory;
    setCollectionName(collection_name: any): this;
    setLayout(layout: any): this;
}

/**
 * Grid 类
 *
 * 该类表示一个网格控件属性，用于管理网格布局及其相关属性。
 *
 * 属性：
 * - grid_dimensions: Vector [columns, rows] - 网格的列数和行数
 * - maximum_grid_items: int - 网格生成的最大项目数
 * - grid_dimension_binding: string - 网格尺寸的绑定名称
 * - grid_rescaling_type: enum - 网格重新缩放方向（可能值：vertical, horizontal, none，默认值：none）
 * - grid_fill_direction: enum - 网格填充方向（可能值：vertical, horizontal, none，默认值：none）
 * - grid_item_template: string - 处理集合的子元素名称（例如："common.container_item"）
 * - precached_grid_item_count: int - 预缓存的网格项目数量
 */
declare class GridProp {
    /**
     * 设置网格的列数和行数。
     * @param {number[]} dimensions - 格式为 [columns, rows]
     * @returns {GridProp} 返回当前实例以支持链式调用
     */
    setGridDimensions(dimensions: number[]): GridProp;
    grid_dimensions: number[] | undefined;
    /**
     * 设置网格生成的最大项目数。
     * @param {number} maxItems - 最大项目数
     * @returns {GridProp} 返回当前实例以支持链式调用
     */
    setMaximumGridItems(maxItems: number): GridProp;
    maximum_grid_items: number | undefined;
    /**
     * 设置网格尺寸的绑定名称。
     * @param {string} binding - 绑定名称
     * @returns {GridProp} 返回当前实例以支持链式调用
     */
    setGridDimensionBinding(binding: string): GridProp;
    grid_dimension_binding: string | undefined;
    /**
     * 设置网格重新缩放方向。
     * @param {string} type - 可能值：vertical, horizontal, none（默认值：none）
     * @returns {GridProp} 返回当前实例以支持链式调用
     */
    setGridRescalingType(type?: string): GridProp;
    grid_rescaling_type: string | undefined;
    /**
     * 设置网格填充方向。
     * @param {string} direction - 可能值：vertical, horizontal, none（默认值：none）
     * @returns {GridProp} 返回当前实例以支持链式调用
     */
    setGridFillDirection(direction?: string): GridProp;
    grid_fill_direction: string | undefined;
    /**
     * 设置处理集合的子元素名称。
     * @param {string} template - 元素名称（例如："common.container_item"）
     * @returns {GridProp} 返回当前实例以支持链式调用
     */
    setGridItemTemplate(template: string): GridProp;
    grid_item_template: string | undefined;
    /**
     * 设置预缓存的网格项目数量。
     * @param {number} count - 预缓存数量
     * @returns {GridProp} 返回当前实例以支持链式调用
     */
    setPrecachedGridItemCount(count: number): GridProp;
    precached_grid_item_count: number | undefined;
}

declare class Grid extends CollectionPanel {
    gridNum: number;
    grid: GridProp;
    setGridProp(grid_prop: any): this;
    addGridItem(grid_position: any, content: any): this;
}

/**
 * Sprite 类
 *
 * 该类表示一个 Sprite 控件，用于管理图像纹理及其相关属性。
 *
 * 属性：
 * - texture: string - 图像路径（从包根目录开始，例如："textures/ui/White"）
 * - allow_debug_missing_texture: boolean - 是否在纹理未找到时显示缺失纹理（默认值：true）
 * - uv: Vector [u, v] - 纹理映射的起始位置
 * - uv_size: Vector [width, height] - 纹理映射的大小
 * - texture_file_system: string - 纹理来源（默认值：InUserPackage）
 * - nineslice_size: int or Vector [x0, y0, x1, y1] - 9-slice 分割大小
 * - tiled: boolean or enum - 是否平铺纹理（可能值：true/false, x, y）
 * - tiled_scale: Vector [sX, sY] - 平铺纹理的缩放比例（默认值：false）
 * - clip_direction: enum - 裁剪方向的起始点（可能值：left, right, up, down, center）
 * - clip_ratio: float - 裁剪比例（范围：0.0 到 1.0）
 * - clip_pixelperfect: boolean - 是否尽可能保持像素精确裁剪
 * - keep_ratio: boolean - 是否在调整大小时保持比例（默认值：true）
 * - bilinear: boolean - 是否在调整大小时使用双线性函数（默认值：false）
 * - fill: boolean - 是否拉伸图像以适应大小（默认值：false）
 * - $fit_to_width: boolean - 是否适应宽度
 * - zip_folder: string - 压缩文件夹路径
 * - grayscale: boolean - 是否以黑白渲染图像（默认值：false）
 * - force_texture_reload: boolean - 是否在纹理路径更改时强制重新加载图像
 * - base_size: Vector [width, height] - 基础大小
 */
declare class Sprite {
    /**
     * 设置图像纹理路径。
     * @param {string} texture - 图像路径（例如："textures/ui/White"）
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setTexture(texture: string): Sprite;
    texture: string | undefined;
    /**
     * 设置是否在纹理未找到时显示缺失纹理。
     * @param {boolean} allow - 是否显示缺失纹理（默认值：true）
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setAllowDebugMissingTexture(allow?: boolean): Sprite;
    allow_debug_missing_texture: boolean | undefined;
    /**
     * 设置纹理映射的起始位置。
     * @param {number[]} uv - 起始位置，格式为 [u, v]
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setUV(uv: number[]): Sprite;
    uv: number[] | undefined;
    /**
     * 设置纹理映射的大小。
     * @param {number[]} uvSize - 大小，格式为 [width, height]
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setUVSize(uvSize: number[]): Sprite;
    uv_size: number[] | undefined;
    /**
     * 设置纹理来源。
     * @param {string} source - 纹理来源（可能值：InUserPackage, InAppPackage, RawPath, RawPersistent, InSettingsDir, InExternalDir, InServerPackage, InDataDir, InUserDir, InWorldDir, StoreCache, Usage is Unknown）
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setTextureFileSystem(source?: string): Sprite;
    texture_file_system: string | undefined;
    /**
     * 设置 9-slice 分割大小。
     * @param {number|number[]} size - 9-slice 分割大小（可以是单个数字或 [x0, y0, x1, y1] 数组）
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setNineSliceSize(size: number | number[]): Sprite;
    nineslice_size: number | number[] | undefined;
    /**
     * 设置是否平铺纹理。
     * @param {boolean|string} tiled - 是否平铺纹理（可能值：true/false, x, y）
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setTiled(tiled: boolean | string): Sprite;
    tiled: string | boolean | undefined;
    /**
     * 设置平铺纹理的缩放比例。
     * @param {number[]} scale - 缩放比例，格式为 [sX, sY]（默认值：[1, 1]）
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setTiledScale(scale?: number[]): Sprite;
    tiled_scale: number[] | undefined;
    /**
     * 设置裁剪方向的起始点。
     * @param {string} direction - 裁剪方向（可能值：left, right, up, down, center）
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setClipDirection(direction: string): Sprite;
    clip_direction: string | undefined;
    /**
     * 设置裁剪比例。
     * @param {number} ratio - 裁剪比例（范围：0.0 到 1.0）
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setClipRatio(ratio: number): Sprite;
    clip_ratio: number | undefined;
    /**
     * 设置是否尽可能保持像素精确裁剪。
     * @param {boolean} pixelPerfect - 是否保持像素精确裁剪
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setClipPixelPerfect(pixelPerfect?: boolean): Sprite;
    clip_pixelperfect: boolean | undefined;
    /**
     * 设置是否在调整大小时保持比例。
     * @param {boolean} keep - 是否保持比例（默认值：true）
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setKeepRatio(keep?: boolean): Sprite;
    keep_ratio: boolean | undefined;
    /**
     * 设置是否在调整大小时使用双线性函数。
     * @param {boolean} bilinear - 是否使用双线性函数（默认值：false）
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setBilinear(bilinear?: boolean): Sprite;
    bilinear: boolean | undefined;
    /**
     * 设置是否拉伸图像以适应大小。
     * @param {boolean} fill - 是否拉伸图像（默认值：false）
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setFill(fill?: boolean): Sprite;
    fill: boolean | undefined;
    /**
     * 设置是否适应宽度。
     * @param {boolean} fit - 是否适应宽度
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setFitToWidth(fit?: boolean): Sprite;
    $fit_to_width: boolean | undefined;
    /**
     * 设置压缩文件夹路径。
     * @param {string} folder - 压缩文件夹路径
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setZipFolder(folder: string): Sprite;
    zip_folder: string | undefined;
    /**
     * 设置是否以黑白渲染图像。
     * @param {boolean} grayscale - 是否以黑白渲染图像（默认值：false）
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setGrayscale(grayscale?: boolean): Sprite;
    grayscale: boolean | undefined;
    /**
     * 设置是否在纹理路径更改时强制重新加载图像。
     * @param {boolean} force - 是否强制重新加载图像
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setForceTextureReload(force?: boolean): Sprite;
    force_texture_reload: boolean | undefined;
    /**
     * 设置基础大小。
     * @param {number[]} size - 基础大小，格式为 [width, height]
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setBaseSize(size: number[]): Sprite;
    base_size: number[] | undefined;
}

declare class Image extends UIElement {
    constructor(id: any, template: any);
    sprite: Sprite;
    layout: Layout;
    dataBinding: DataBinding;
    factory: Factory;
    setSprite(sprite: any): this;
}

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
declare class Text {
    /**
     * 设置文本内容。
     * @param {string} text - 文本内容
     * @returns {Text} 返回当前实例以支持链式调用
     */
    setText(text?: string): Text;
    text: string | undefined;
    /**
     * 设置文本颜色。
     * @param {number[]} color - RGB 颜色值（格式：[r, g, b]，默认值：[1.0, 1.0, 1.0]）
     * @returns {Text} 返回当前实例以支持链式调用
     */
    setColor(color?: number[]): Text;
    color: number[] | undefined;
    /**
     * 设置父级禁用时的文本颜色。
     * @param {number[]} lockedColor - RGB 颜色值（格式：[r, g, b]）
     * @returns {Text} 返回当前实例以支持链式调用
     */
    setLockedColor(lockedColor: number[]): Text;
    locked_color: number[] | undefined;
    /**
     * 设置是否显示文本阴影。
     * @param {boolean} shadow - 是否显示阴影（默认值：false）
     * @returns {Text} 返回当前实例以支持链式调用
     */
    setShadow(shadow?: boolean): Text;
    shadow: boolean | undefined;
    /**
     * 设置是否隐藏断词连字符。
     * @param {boolean} hide - 是否隐藏连字符（默认值：false）
     * @returns {Text} 返回当前实例以支持链式调用
     */
    setHideHyphen(hide?: boolean): Text;
    hide_hyphen: boolean | undefined;
    /**
     * 设置文本出现省略号时需通知的控件名称数组。
     * @param {string[]} controls - 控件名称数组
     * @returns {Text} 返回当前实例以支持链式调用
     */
    setNotifyOnEllipses(controls: string[]): Text;
    notify_on_ellipses: string[] | undefined;
    /**
     * 添加一个需通知省略号事件的控件名称。
     * @param {string} controlName - 控件名称
     * @returns {Text} 返回当前实例以支持链式调用
     */
    addNotifyOnEllipses(controlName: string): Text;
    /**
     * 设置是否启用脏话过滤。
     * @param {boolean} enable - 是否启用过滤（默认值：false）
     * @returns {Text} 返回当前实例以支持链式调用
     */
    setEnableProfanityFilter(enable?: boolean): Text;
    enable_profanity_filter: boolean | undefined;
    /**
     * 设置父级禁用时的透明度。
     * @param {number} alpha - 透明度（范围：0.0 到 1.0）
     * @returns {Text} 返回当前实例以支持链式调用
     */
    setLockedAlpha(alpha: number): Text;
    locked_alpha: number | undefined;
    /**
     * 设置字体大小。
     * @param {string} size - 字体大小（可能值：small, normal, large, extra_large，默认值：normal）
     * @returns {Text} 返回当前实例以支持链式调用
     */
    setFontSize(size?: string): Text;
    font_size: string | undefined;
    /**
     * 设置字体缩放比例。
     * @param {number} factor - 缩放比例（默认值：1.0）
     * @returns {Text} 返回当前实例以支持链式调用
     */
    setFontScaleFactor(factor?: number): Text;
    font_scale_factor: number | undefined;
    /**
     * 设置是否启用本地化翻译。
     * @param {boolean} localize - 是否启用本地化（默认值：false）
     * @returns {Text} 返回当前实例以支持链式调用
     */
    setLocalize(localize?: boolean): Text;
    localize: boolean | undefined;
    /**
     * 设置行间距。
     * @param {number} padding - 行间距
     * @returns {Text} 返回当前实例以支持链式调用
     */
    setLinePadding(padding: number): Text;
    line_padding: number | undefined;
    /**
     * 设置字体类型。
     * @param {string} font - 字体类型（可能值：default, rune, unicode 等，默认值：default）
     * @returns {Text} 返回当前实例以支持链式调用
     */
    setFontType(font?: string): Text;
    font_type: string | undefined;
    /**
     * 设置备用字体类型。
     * @param {string} backupFont - 备用字体类型（默认值：default）
     * @returns {Text} 返回当前实例以支持链式调用
     */
    setBackupFontType(backupFont?: string): Text;
    backup_font_type: string | undefined;
    /**
     * 设置文本对齐方式。
     * @param {string} alignment - 对齐方式（例如：left, right, center）
     * @returns {Text} 返回当前实例以支持链式调用
     */
    setTextAlignment(alignment: string): Text;
    text_alignment: string | undefined;
}

declare class Label extends UIElement {
    constructor(id: any, template: any);
    text: Text;
    layout: Layout;
    dataBinding: DataBinding;
    factory: Factory;
    setLayout(layout: any): this;
    setText(text: any): this;
}

declare class Panel extends UIElement {
    constructor(id: any, template: any);
    layout: Layout;
    dataBinding: DataBinding;
    factory: Factory;
    setLayout(layout: any): this;
}

/**
 * ScrollView 类
 *
 * 该类表示一个滚动视图控件，用于管理滚动行为及其相关属性。
 *
 * 属性：
 * - scrollbar_track_button: string - 滚动条轨道按钮的 ID
 * - scrollbar_touch_button: string - 滚动条触摸按钮的 ID
 * - scroll_speed: number - 滚动速度
 * - gesture_control_enabled: boolean - 是否启用手势控制
 * - always_handle_scrolling: boolean - 是否始终处理滚动
 * - touch_mode: boolean - 是否启用触摸模式
 * - scrollbar_box: string - 滚动条滑块子元素的名称
 * - scrollbar_track: string - 滚动条轨道子元素的名称
 * - scroll_view_port: string - 视口子元素的名称
 * - scroll_content: string - 内容根父元素的名称
 * - scroll_box_and_track_panel: string - 包含滚动条滑块和轨道的子元素名称
 * - jump_to_bottom_on_update: boolean - 是否在更新时跳转到底部
 */
declare class ScrollView {
    /**
     * 设置滚动条轨道按钮的 ID。
     * @param {string} buttonId - 滚动条轨道按钮的 ID
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setScrollbarTrackButton(buttonId: string): ScrollView;
    scrollbar_track_button: string | undefined;
    /**
     * 设置滚动条触摸按钮的 ID。
     * @param {string} buttonId - 滚动条触摸按钮的 ID
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setScrollbarTouchButton(buttonId: string): ScrollView;
    scrollbar_touch_button: string | undefined;
    /**
     * 设置滚动速度。
     * @param {number} speed - 滚动速度
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setScrollSpeed(speed: number): ScrollView;
    scroll_speed: number | undefined;
    /**
     * 设置是否启用手势控制。
     * @param {boolean} enabled - 是否启用手势控制（默认值：false）
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setGestureControlEnabled(enabled?: boolean): ScrollView;
    gesture_control_enabled: boolean | undefined;
    /**
     * 设置是否始终处理滚动。
     * @param {boolean} alwaysHandle - 是否始终处理滚动（默认值：false）
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setAlwaysHandleScrolling(alwaysHandle?: boolean): ScrollView;
    always_handle_scrolling: boolean | undefined;
    /**
     * 设置是否启用触摸模式。
     * @param {boolean} touchMode - 是否启用触摸模式（默认值：false）
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setTouchMode(touchMode?: boolean): ScrollView;
    touch_mode: boolean | undefined;
    /**
     * 设置滚动条滑块子元素的名称。
     * @param {string} boxName - 滚动条滑块子元素的名称
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setScrollbarBox(boxName: string): ScrollView;
    scrollbar_box: string | undefined;
    /**
     * 设置滚动条轨道子元素的名称。
     * @param {string} trackName - 滚动条轨道子元素的名称
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setScrollbarTrack(trackName: string): ScrollView;
    scrollbar_track: string | undefined;
    /**
     * 设置视口子元素的名称。
     * @param {string} viewPortName - 视口子元素的名称
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setScrollViewPort(viewPortName: string): ScrollView;
    scroll_view_port: string | undefined;
    /**
     * 设置内容根父元素的名称。
     * @param {string} contentName - 内容根父元素的名称
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setScrollContent(contentName: string): ScrollView;
    scroll_content: string | undefined;
    /**
     * 设置包含滚动条滑块和轨道的子元素名称。
     * @param {string} panelName - 包含滚动条滑块和轨道的子元素名称
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setScrollBoxAndTrackPanel(panelName: string): ScrollView;
    scroll_box_and_track_panel: string | undefined;
    /**
     * 设置是否在更新时跳转到底部。
     * @param {boolean} jump - 是否在更新时跳转到底部（默认值：false）
     * @returns {ScrollView} 返回当前实例以支持链式调用
     */
    setJumpToBottomOnUpdate(jump?: boolean): ScrollView;
    jump_to_bottom_on_update: boolean | undefined;
}

declare class ScrollingPanel extends UIElement {
    constructor(id: any, template: any);
    input: Input;
    scrollView: ScrollView;
    layout: Layout;
    dataBinding: DataBinding;
    factory: Factory;
}

declare class StackPanel extends Panel {
    type: string;
    orientation: string;
    stackNum: number;
    addStack(size: any, content: any, debug?: boolean): this;
    /**
     * Possible values:
        vertical
        horizontal
     * @param {*} orientation
     */
    setOrientation(orientation: any): this;
}

declare class UISystem {
    constructor(identifier: any, path: any);
    identifier: any;
    namespace: any;
    name: any;
    path: any;
    elements: Map<any, any>;
    animations: Map<any, any>;
    addElement(element: any): this;
    getElement(element_name: any): any;
    addAnimation(name: any, value: any): void;
    getAnimation(animation_name: any): any;
    toObject(): {
        namespace: any;
    };
}

declare class ChestUISystem {
    static chest_screen: UISystem;
    static registerContainerUI(new_container_title: any, ui_system_root_panel: any): void;
}

/**
 * 自定义容器 UI 系统类，用于创建和管理容器界面。
 * 支持动态添加网格项、设置标题、调整尺寸等功能。
 */
declare class ContainerUISystem {
    /**
     * 构造函数，初始化容器 UI 系统。
     * @param {string} identifier - 容器的唯一标识符。
     * @param {string} path - 资源路径。
     */
    constructor(identifier: string, path: string);
    system: UISystem;
    title: string;
    root_panel_size: number[];
    gridDimension: number[];
    output_grids: any[];
    main_panel: Panel;
    grids: Grid;
    setInputGrid(output_arr: any): void;
    /**
     * 向网格中添加一个网格项。
     * @param {number[]} grid_position - 网格项的位置 [行, 列] 用于定位实体的背包槽。
     * @param {number[]} offset - 网格项的偏移量 [x, y]。
     * @param {Object} [options] - 可选参数，用于配置网格项。
     * @param {boolean} [options.enable=true] - 是否启用该网格项，默认为 true。
     * @param {number[]} [options.size] - 网格项的大小 [宽度, 高度]。
     * @param {UIElement[]} [options.background_images] - 网格项的背景图片控件。
     * @returns {ContainerUISystem} 返回当前实例以支持链式调用。
     */
    addGridItem(grid_position: number[], offset: number[], options?: {
        enable?: boolean | undefined;
        size?: number[] | undefined;
        background_images?: UIElement[] | undefined;
    }): ContainerUISystem;
    addInputGrid(grid_position: any, offset: any, options: any): void;
    addOutputGrid(grid_position: any, offset: any, options: any): void;
    /**
     * 向主面板中添加一个 UI 元素。
     * @param {Object} element - 要添加的 UI 元素。
     * @returns {ContainerUISystem} 返回当前实例以支持链式调用。
     */
    addElementToMain(element: Object): ContainerUISystem;
    /**
     * 设置网格的维度（行和列）。
     * @param {number[]} dimension - 网格的维度 [行数, 列数]。
     * @returns {ContainerUISystem} 返回当前实例以支持链式调用。
     */
    setGridDimension(dimension: number[]): ContainerUISystem;
    /**
     * 设置容器的标题。
     * @param {string} title - 容器的标题。
     * @returns {ContainerUISystem} 返回当前实例以支持链式调用。
     */
    setTitle(title: string): ContainerUISystem;
    /**
     * 设置根面板的尺寸。
     * @param {number[]} size - 根面板的尺寸 [宽度, 高度]。
     * @returns {ContainerUISystem} 返回当前实例以支持链式调用。
     */
    setSize(size: number[]): ContainerUISystem;
    setItemMatrix(n: any, matrix: any): void;
    #private;
}

declare const ServerFormSystem: UISystem;
declare const form_button_panel: Panel;
declare class ServerUISystem {
    static "__#6492@#binding_map": Map<any, any>;
    static "__#6492@#binding_title_list": any[];
    static addBindingTitle(title_name: any): void;
    static getBindingTitleList(): any[];
    static getBindingContentList(): any[];
    static bindingTitlewithContent(title_name: any, content: any): void;
    static "__#6492@#updateServerFormSystem"(): void;
}

declare class Guidebook {
    constructor(identifier: any, path: any);
    system: UISystem;
    addPageBinding(page_name: any, left_control_name: any, right_control_name: any): this;
    addPage(page_name: any, left_control: any, right_control: any): this;
    addElement(element: any): this;
    #private;
}

/**
 * ButtonMapping 类
 *
 * 该类表示按钮映射配置，用于定义输入事件的映射关系。
 *
 * 属性：
 * - ignored: boolean - 是否忽略映射（默认值：false）
 * - from_button_id: string - 触发事件的按钮 ID
 * - to_button_id: string - 事件触发时执行的按钮 ID
 * - mapping_type: enum - 映射类型（可能值：global, pressed, double_pressed, focused）
 * - scope: enum - 映射范围（可能值：view, controller）
 * - input_mode_condition: enum - 输入模式条件（可能值：not_gaze, not_gamepad, gamepad_and_not_gaze）
 * - ignore_input_scope: boolean - 是否忽略输入范围
 * - consume_event: boolean - 是否消耗事件
 * - handle_select: boolean - 是否处理选择事件
 * - handle_deselect: boolean - 是否处理取消选择事件
 * - button_up_right_of_first_refusal: boolean - 是否在首次拒绝后处理按钮释放事件
 */
declare class ButtonMapping$1 {
    ignored: boolean;
    from_button_id: string;
    to_button_id: string;
    mapping_type: string | null;
    scope: string | null;
    input_mode_condition: string | null;
    ignore_input_scope: boolean;
    consume_event: boolean;
    handle_select: boolean;
    handle_deselect: boolean;
    button_up_right_of_first_refusal: boolean;
    /**
     * 设置是否忽略映射。
     * @param {boolean} ignored - 是否忽略映射（默认值：false）
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setIgnored(ignored?: boolean): ButtonMapping$1;
    /**
     * 设置触发事件的按钮 ID。
     * @param {string} fromButtonId - 触发事件的按钮 ID
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setFromButtonId(fromButtonId: string): ButtonMapping$1;
    /**
     * 设置事件触发时执行的按钮 ID。
     * @param {string} toButtonId - 事件触发时执行的按钮 ID
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setToButtonId(toButtonId: string): ButtonMapping$1;
    /**
     * 设置映射类型。
     * @param {string} mappingType - 映射类型（可能值：global, pressed, double_pressed, focused）
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setMappingType(mappingType: string): ButtonMapping$1;
    /**
     * 设置映射范围。
     * @param {string} scope - 映射范围（可能值：view, controller）
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setScope(scope: string): ButtonMapping$1;
    /**
     * 设置输入模式条件。
     * @param {string} condition - 输入模式条件（可能值：not_gaze, not_gamepad, gamepad_and_not_gaze）
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setInputModeCondition(condition: string): ButtonMapping$1;
    /**
     * 设置是否忽略输入范围。
     * @param {boolean} ignore - 是否忽略输入范围
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setIgnoreInputScope(ignore?: boolean): ButtonMapping$1;
    /**
     * 设置是否消耗事件。
     * @param {boolean} consume - 是否消耗事件
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setConsumeEvent(consume?: boolean): ButtonMapping$1;
    /**
     * 设置是否处理选择事件。
     * @param {boolean} handle - 是否处理选择事件
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setHandleSelect(handle?: boolean): ButtonMapping$1;
    /**
     * 设置是否处理取消选择事件。
     * @param {boolean} handle - 是否处理取消选择事件
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setHandleDeselect(handle?: boolean): ButtonMapping$1;
    /**
     * 设置是否在首次拒绝后处理按钮释放事件。
     * @param {boolean} handle - 是否处理按钮释放事件
     * @returns {ButtonMapping} 返回当前实例以支持链式调用
     */
    setButtonUpRightOfFirstRefusal(handle?: boolean): ButtonMapping$1;
}

/**
 * DataBinding 类
 *
 * 该类表示数据绑定配置，用于将硬编码值或变量绑定到元素属性。
 *
 * 属性：
 * - ignored: boolean - 是否忽略绑定（默认值：false）
 * - binding_type: enum - 绑定类型（可能值：global, view, collection, collection_details, none）
 * - binding_name: string - 数据绑定名称或条件的值
 * - binding_name_override: string - 应用 binding_name 值的 UI 元素属性名称
 * - binding_collection_name: string - 要使用的集合名称
 * - binding_collection_prefix: string - 集合前缀
 * - binding_condition: enum - 数据绑定的条件（可能值：always, always_when_visible, visible, once, none, visibility_changed）
 * - source_control_name: string - 要观察其属性值的 UI 元素名称
 * - source_property_name: string - 存储 source_control_name 引用的 UI 元素的属性值
 * - target_property_name: string - 应用 source_property_name 值的 UI 元素属性
 * - resolve_sibling_scope: boolean - 是否允许选择同级元素而非子元素（默认值：false）
 */
declare class DataBindingObject {
    /**
     * 设置是否忽略绑定。
     * @param {boolean} ignored - 是否忽略绑定（默认值：false）
     * @returns {DataBindingObject} 返回当前实例以支持链式调用
     */
    setIgnored(ignored?: boolean): DataBindingObject;
    ignored: boolean | undefined;
    /**
     * 设置绑定类型。
     * @param {string} type - 绑定类型（可能值：global, view, collection, collection_details, none）
     * @returns {DataBindingObject} 返回当前实例以支持链式调用
     */
    setBindingType(type: string): DataBindingObject;
    binding_type: string | undefined;
    /**
     * 设置数据绑定名称或条件的值。
     * @param {string} name - 数据绑定名称或条件的值
     * @returns {DataBindingObject} 返回当前实例以支持链式调用
     */
    setBindingName(name: string): DataBindingObject;
    binding_name: string | undefined;
    /**
     * 设置应用 binding_name 值的 UI 元素属性名称。
     * @param {string} nameOverride - 应用 binding_name 值的 UI 元素属性名称
     * @returns {DataBindingObject} 返回当前实例以支持链式调用
     */
    setBindingNameOverride(nameOverride: string): DataBindingObject;
    binding_name_override: string | undefined;
    /**
     * 设置要使用的集合名称。
     * @param {string} collectionName - 集合名称
     * @returns {DataBindingObject} 返回当前实例以支持链式调用
     */
    setBindingCollectionName(collectionName: string): DataBindingObject;
    binding_collection_name: string | undefined;
    /**
     * 设置集合前缀。
     * @param {string} prefix - 集合前缀
     * @returns {DataBindingObject} 返回当前实例以支持链式调用
     */
    setBindingCollectionPrefix(prefix: string): DataBindingObject;
    binding_collection_prefix: string | undefined;
    /**
     * 设置数据绑定的条件。
     * @param {string} condition - 数据绑定的条件（可能值：always, always_when_visible, visible, once, none, visibility_changed）
     * @returns {DataBindingObject} 返回当前实例以支持链式调用
     */
    setBindingCondition(condition: string): DataBindingObject;
    binding_condition: string | undefined;
    /**
     * 设置要观察其属性值的 UI 元素名称。
     * @param {string} controlName - UI 元素名称
     * @returns {DataBindingObject} 返回当前实例以支持链式调用
     */
    setSourceControlName(controlName: string): DataBindingObject;
    source_control_name: string | undefined;
    /**
     * 设置存储 source_control_name 引用的 UI 元素的属性值。
     * @param {string} propertyName - 属性名称
     * @returns {DataBindingObject} 返回当前实例以支持链式调用
     */
    setSourcePropertyName(propertyName: string): DataBindingObject;
    source_property_name: string | undefined;
    /**
     * 设置应用 source_property_name 值的 UI 元素属性。
     * @param {string} propertyName - 属性名称
     * @returns {DataBindingObject} 返回当前实例以支持链式调用
     */
    setTargetPropertyName(propertyName: string): DataBindingObject;
    target_property_name: string | undefined;
    /**
     * 设置是否允许选择同级元素而非子元素。
     * @param {boolean} resolve - 是否允许选择同级元素（默认值：false）
     * @returns {DataBindingObject} 返回当前实例以支持链式调用
     */
    setResolveSiblingScope(resolve?: boolean): DataBindingObject;
    resolve_sibling_scope: boolean | undefined;
}

declare class UISystemRegistry {
    static "__#6489@#ui_system_map": {};
    static "__#6489@#ui_def_list": any[];
    static registerUISystem(ui_system: any): void;
    static addOuterUIdefs(ui_defs: any): void;
    static submit(): void;
}
declare class UISystemRegistryServer {
    static "__#6490@#ui_system_map": {};
    static "__#6490@#ui_def_list": any[];
    static getUISystemList(): any[];
    static getUIdefList(): any[];
    static startServer(): void;
}

declare namespace registry {
    function submit(): void;
    function log(...info: any[]): void;
}

declare class Item {
    /**
     * 物品类
     * @param {string} identifier 物品唯一标识符
     * @param {string} category 菜单栏分类 可选："construction", "nature", "equipment", "items", and "none"
     * @param {string} texture 物品纹理
     * @param {Object} options 可选参数
     * @param {string} options.group 分组
     * @param {boolean} options.hide_in_command 是否在命令中隐藏，默认为 false
     */
    constructor(identifier: string, category: string, texture: string, options?: {
        group: string;
        hide_in_command: boolean;
    });
    identifier: string;
    category: string;
    texture: string;
    group: string;
    hide_in_command: boolean;
    components: Map<any, any>;
    /**
     * 添加组件
     * @param {Map} componentMap 组件 Map
     */
    addComponent(componentMap: Map<any, any>): this;
    /**
     * 移除组件
     * @param {string} key 组件名称
     */
    removeComponent(key: string): this;
    /**
     * 将物品转换为 JSON 格式
     * @returns {Object} JSON 格式的物品对象
     */
    toObject(): Object;
}

declare class Food extends Item {
    /**
     * 物品类
     * @param {string} identifier 物品唯一标识符
     * @param {string} category 菜单栏分类 可选："construction", "nature", "equipment", "items", and "none"
     * @param {string} texture 物品纹理
     * @param {Object} options 可选参数
     * @param {string} options.group 分组
     * @param {boolean} options.hide_in_command 是否在命令中隐藏，默认为 false
     * @param {string} options.animation 使用动画，默认为 "eat"
     * @param {boolean} options.canAlwaysEat 是否总是可以食用，默认为 false
     * @param {number} options.nutrition 营养价值，默认为 0
     * @param {number} options.saturationModifier 饱和度修正值，默认为 1
     */
    constructor(identifier: string, category: string, texture: string, options?: {
        group: string;
        hide_in_command: boolean;
        animation: string;
        canAlwaysEat: boolean;
        nutrition: number;
        saturationModifier: number;
    });
}

declare class AddonAttachableDescription {
    /**
     * 可附着物描述类
     * @param {string} identifier 标识符
     */
    constructor(identifier: string);
    identifier: string;
    /**
     * 添加材质
     * @param {string} name 材质名称
     * @param {string} material 材质路径
     * @returns {AddonAttachableDescription} 返回当前实例以支持链式调用
     */
    addMaterial(name: string, material: string): AddonAttachableDescription;
    materials: {} | undefined;
    /**
     * 添加纹理
     * @param {string} name 纹理名称
     * @param {string} texture 纹理路径
     * @returns {AddonAttachableDescription} 返回当前实例以支持链式调用
     */
    addTexture(name: string, texture: string): AddonAttachableDescription;
    textures: {} | undefined;
    /**
     * 添加几何体
     * @param {string} name 几何体名称
     * @param {string} geometry 几何体路径
     * @returns {AddonAttachableDescription} 返回当前实例以支持链式调用
     */
    addGeometry(name: string, geometry: string): AddonAttachableDescription;
    geometry: {} | undefined;
    /**
     * 添加动画
     * @param {string} name 动画名称
     * @param {string} animation 动画路径
     * @returns {AddonAttachableDescription} 返回当前实例以支持链式调用
     */
    addAnimation(name: string, animation: string): AddonAttachableDescription;
    animations: {} | undefined;
    /**
     * 添加动画控制器
     * @param {string} name 控制器名称
     * @param {string} controller 控制器路径
     * @returns {AddonAttachableDescription} 返回当前实例以支持链式调用
     */
    addAnimationController(name: string, controller: string): AddonAttachableDescription;
    animation_controllers: any[] | undefined;
    /**
     * 添加渲染控制器
     * @param {string} controller 渲染控制器路径
     * @returns {AddonAttachableDescription} 返回当前实例以支持链式调用
     */
    addRenderController(controller: string): AddonAttachableDescription;
    render_controllers: any[] | undefined;
    /**
     * 添加定位器
     * @param {string} name 定位器名称
     * @param {Object} locator 定位器数据
     * @returns {AddonAttachableDescription} 返回当前实例以支持链式调用
     */
    addLocator(name: string, locator: Object): AddonAttachableDescription;
    locators: {} | undefined;
    /**
     * 设置脚本
     * @param {string} key 脚本键
     * @param {string} value 脚本值
     * @returns {AddonAttachableDescription} 返回当前实例以支持链式调用
     */
    setScript(key: string, value: string): AddonAttachableDescription;
    scripts: {} | undefined;
}

declare class Attachable extends AddonAttachableDescription {
    constructor(identifier: any);
    getId(): string;
    toObject(): any;
}

declare class Armor {
    constructor(identifier: any, category: any, item_texture: any, texture_path: any, options?: {});
    identifier: any;
    item: Item;
    attachable: Attachable;
    setArrachableGeometry(key: any, geometry: any): this;
}
declare class Chestplate extends Armor {
    constructor(identifier: any, item_texture: any, texture_path: any, options?: {});
}
declare class Boot extends Armor {
    constructor(identifier: any, item_texture: any, texture_path: any, options?: {});
}
declare class Leggings extends Armor {
    constructor(identifier: any, item_texture: any, texture_path: any, options?: {});
}
declare class Helmet extends Armor {
    constructor(identifier: any, item_texture: any, texture_path: any, options?: {});
}

declare namespace ItemAPI {
    function createItem(identifier: string, category: string, texture: string, options?: {
        group: string;
        hight_resolution: boolean;
        hide_in_command: boolean;
    }): Item;
    function createFood(identifier: string, category: string, texture: string, options?: {
        group: string;
        hide_in_command: boolean;
        animation: string;
        canAlwaysEat: boolean;
        nutrition: number;
        saturationModifier: number;
    }): Food;
    function createAttachable(identifier: string, texture: string, material: string, options?: Object): Attachable;
    function createChestplateArmor(identifier: any, item_texture: any, texture_path: any, options?: {}): Chestplate;
    function createHelmetArmor(identifier: any, item_texture: any, texture_path: any, options?: {}): Helmet;
    function createBootArmor(identifier: any, item_texture: any, texture_path: any, options?: {}): Boot;
    function createLeggingsArmor(identifier: any, item_texture: any, texture_path: any, options?: {}): Leggings;
}

declare class BasicBlock {
    /**
     * 基础方块类
     * @param {string} identifier 方块唯一标识符
     * @param {string} category 菜单栏分类 可选："construction", "nature", "equipment", "items", and "none"
     * @param {Array} textures_arr 纹理数组 [上,下,东,西,南,北]
     * @param {Object} options 可选参数
     * @param {string} options.group 分组，默认为 "construction"
     * @param {boolean} options.hide_in_command 是否在命令中隐藏，默认为 false
     */
    constructor(identifier: string, category: string, textures_arr: any[], options?: {
        group: string;
        hide_in_command: boolean;
    });
    identifier: string;
    category: string;
    textures: any[];
    group: string;
    hide_in_command: boolean;
    traits: Map<any, any>;
    states: Map<any, any>;
    components: Map<any, any>;
    permutations: any[];
    getId(): string;
    registerTrait(key: any, value: any): this;
    registerState(key: any, value: any): this;
    /**
     * 添加组件
     * @param {Map} componentMap 组件 Map
     */
    addComponent(componentMap: Map<any, any>): this;
    /**
     * 移除组件
     * @param {string} key 组件名称
     */
    removeComponent(key: string): this;
    /**
     * 添加方块变体
     * @param {string} condition 变体条件
     * @param {Map} componentMap 组件 Map
     */
    addPermutation(condition: string, componentMap: Map<any, any>): this;
    /**
     * 将方块对象转换为 JSON 格式
     * @returns {Object} JSON 格式的方块对象
     */
    toObject(): Object;
}

declare class Block extends BasicBlock {
    /**
     * 方块类
     * @param {string} identifier 方块的唯一标识符
     * @param {string} category 方块的分类 "construction", "nature", "equipment", "items", and "none"
     * @param {Array} variantDatas 方块的变体数据，包含每个变体的状态标签和纹理
     * @param {Object} options 可选参数
     * @param {string} options.group 分组，默认为 "construction"
     * @param {boolean} options.hide_in_command 是否在命令中隐藏，默认为 false
     * @param {boolean} options.ambient_occlusion 是否应用环境光遮蔽，默认为 false
     * @param {boolean} options.face_dimming 是否根据面的方向进行亮度调整，默认为 false
     * @param {string} options.render_method 渲染方法，默认为 "alpha_test"
     */
    constructor(identifier: string, category: string, variantDatas: any[], options?: {
        group: string;
        hide_in_command: boolean;
        ambient_occlusion: boolean;
        face_dimming: boolean;
        render_method: string;
    });
    options: {
        group: string;
        hide_in_command: boolean;
        ambient_occlusion: boolean;
        face_dimming: boolean;
        render_method: string;
    };
    variantDatas: any[];
    addVariantComponent(variantIndex: any, componentMap: any): this;
    #private;
}

declare class RotatableBlock extends BasicBlock {
    /**
     * 可旋转方块类
     * @param {string} identifier 方块唯一标识符
     * @param {string} category 菜单栏分类
     * @param {Array} textures_arr 纹理数组 [上,下,东,西,南,北]
     * @param {Object} options 可选参数
     * @param {string} options.group 分组，默认为 "construction"
     * @param {boolean} options.hide_in_command 是否在命令中隐藏，默认为 false
     * @param {string} options.rotationType 旋转类型，默认为 "cardinal"
     * @param {number} options.yRotationOffset 初始旋转偏移量，默认为 180
     */
    constructor(identifier: string, category: string, textures_arr: any[], options?: {
        group: string;
        hide_in_command: boolean;
        rotationType: string;
        yRotationOffset: number;
    });
    #private;
}

declare class GeometryBlock extends BasicBlock {
    /**
     * 带模型方块类
     * @param {string} identifier 方块标识符 由命名空间和方块名组成 例如 "my_mod:stone"
     * @param {string} category 方块的分类 "construction", "nature", "equipment", "items", and "none"
     * @param {string} geometry 模型标识符
     * @param {Object} material_instances 材质实例对象
     * @param {Object} options 可选参数
     */
    constructor(identifier: string, category: string, geometry: string, material_instances: Object, options?: Object);
}

declare class OreFeature {
    constructor(identifier: any, count: any, replace_rules: any);
    identifier: any;
    count: any;
    replace_rules: any;
    toObject(): any;
}

/**
 * 表示生物群系过滤条件的类
 */
declare class BiomeFilter {
    filters: any[];
    /**
     * 添加一个逻辑条件组（如 any_of, all_of）
     * @param {"any_of" | "all_of"} logicType - 逻辑类型
     * @param {Array<Object>} conditions - 条件数组
     * @returns {BiomeFilter} 返回自身以支持链式调用
     */
    addLogicGroup(logicType: "any_of" | "all_of", conditions: Array<Object>): BiomeFilter;
    /**
     * 添加一个简单条件（如 has_biome_tag）
     * @param {string} test - 测试类型（如 "has_biome_tag"）
     * @param {"==" | "!="} operator - 操作符
     * @param {string} value - 目标值（如 "overworld"）
     * @returns {BiomeFilter} 返回自身以支持链式调用
     */
    addSimpleCondition(test: string, operator: "==" | "!=", value: string): BiomeFilter;
    /**
     * 转换为 JSON 格式
     * @returns {Array<Object>} 返回生物群系过滤条件数组
     */
    toObject(): Array<Object>;
}

/**
 * 表示功能规则生成条件的类
 */
declare class FeatureConditions {
    conditions: {
        placement_pass: string;
        "minecraft:biome_filter": never[];
    };
    /**
     * 设置生成阶段（placement_pass）
     * @param {string} pass - 生成阶段标识符（如 "underground_pass"）
     * @returns {FeatureConditions} 返回自身以支持链式调用
     */
    setPlacementPass(pass: string): FeatureConditions;
    /**
     * 设置生物群系过滤器
     * @param {BiomeFilter} biomeFilter - 生物群系过滤条件对象
     * @returns {FeatureConditions} 返回自身以支持链式调用
     */
    setBiomeFilter(biomeFilter: BiomeFilter): FeatureConditions;
    /**
     * 转换为 JSON 格式
     * @returns {Object} 返回生成条件对象
     */
    toObject(): Object;
}

/**
 * 表示单个坐标轴（x/y/z）分布规则的类
 */
declare class CoordinateDistribution {
    /**
     * @param {"uniform" | "triangle"} distribution - 分布类型
     * @param {Array<number>} extent - 范围（如 [0, 16]）
     */
    constructor(distribution?: "uniform" | "triangle", extent?: Array<number>);
    distribution: "uniform" | "triangle";
    extent: number[];
    /**
     * 转换为 JSON 格式
     * @returns {Object} 返回坐标分布配置
     */
    toObject(): Object;
}

/**
 * 表示功能规则分布配置的类
 */
declare class FeatureDistribution {
    distribution: {
        iterations: number;
        coordinate_eval_order: string;
        x: any;
        y: any;
        z: any;
    };
    /**
     * 设置迭代次数
     * @param {number} iterations - 放置尝试次数
     * @returns {FeatureDistribution} 返回自身以支持链式调用
     */
    setIterations(iterations: number): FeatureDistribution;
    /**
     * 设置坐标轴的分布规则
     * @param {"x" | "y" | "z"} axis - 坐标轴
     * @param {CoordinateDistribution} config - 分布配置
     * @returns {FeatureDistribution} 返回自身以支持链式调用
     */
    setAxisDistribution(axis: "x" | "y" | "z", config: CoordinateDistribution): FeatureDistribution;
    /**
     * 转换为 JSON 格式
     * @returns {Object} 返回分布规则对象
     */
    toObject(): Object;
}

declare class FeatureRule {
    constructor(identifier: any, places_feature: any);
    identifier: any;
    places_feature: any;
    condition: FeatureConditions;
    distribution: FeatureDistribution;
    setPlacementPass(pass: any): void;
    setBiomeFilter(biomeFilter: any): void;
    setIterations(iterations: any): void;
    setAxisDistribution(axis: any, config: any): void;
    toObject(): any;
}

declare class OreBlock {
    constructor(identifier: any, category: any, textures_arr: any, options?: {});
    block: BasicBlock;
    feature: OreFeature;
    feature_rules: FeatureRule;
}

declare class CropBlock extends Block {
    stageNum: number;
}

declare namespace BlockAPI {
    function createBasicBlock(identifier: string, category: string, textures_arr: any[], options?: {
        group: string;
        hide_in_command: boolean;
    }): BasicBlock;
    function createBlock(identifier: string, category: string, variantDatas: any[], options?: {
        group: string;
        hide_in_command: boolean;
        ambient_occlusion: boolean;
        face_dimming: boolean;
        render_method: string;
    }): Block;
    function createRotatableBlock(identifier: string, category: string, textures_arr: any[], options?: {
        group: string;
        hide_in_command: boolean;
        rotationType: string;
        yRotationOffset: number;
    }): RotatableBlock;
    function createGeometryBlock(identifier: any, category: any, geometry: any, material_instances: any, options?: {}): GeometryBlock;
    function createOreBlock(identifier: any, category: any, textures_arr: any, options?: {}): OreBlock;
    function createCropBlock(identifier: string, category: string, variantDatas: any[], options?: {
        group: string;
        hide_in_command: boolean;
        ambient_occlusion: boolean;
        face_dimming: boolean;
        render_method: string;
    }): CropBlock;
}

declare namespace FeatureAPI {
    function createOreFeature(identifier: any, count: any, replace_rules: any): OreFeature;
    function createFeatureRules(identifier: any, places_feature: any): FeatureRule;
}

declare class BasicEntity {
    /**
     * 构造函数
     * @param {string} identifier - 实体的唯一标识符
     * @param {Object} options - 配置选项
     * @param {boolean} [options.is_spawnable=true] - 是否可生成
     * @param {boolean} [options.is_summonable=true] - 是否可召唤
     * @param {string} [options.runtime_identifier] - 复刻标识符
     * @param {Object} data - 继承的数据
     * @param {Object} [data.components={}] - 继承的组件
     * @param {Object} [data.component_groups={}] - 继承的组件组
     * @param {Object} [data.events={}] - 继承的事件
     */
    constructor(identifier: string, options?: {
        is_spawnable?: boolean | undefined;
        is_summonable?: boolean | undefined;
        runtime_identifier?: string | undefined;
    }, data?: {
        components?: Object | undefined;
        component_groups?: Object | undefined;
        events?: Object | undefined;
    });
    identifier: string;
    is_spawnable: boolean;
    is_summonable: boolean;
    runtime_identifier: string | undefined;
    properties: any;
    components: Map<string, any>;
    component_groups: Map<string, any>;
    events: Map<string, any>;
    /**
     * 添加属性到实体
     * @param {string} name 属性名称
     * @param {Object} value 属性值
     * @returns
     */
    addProperty(name: string, value: Object): this;
    /**
     * 移除属性
     * @param {string} name 属性名称
     * @returns
     */
    removeProperty(name: string): this;
    /**
     * 移除所有属性
     * @returns
     */
    clearProperties(): this;
    /**
     * 添加事件到实体
     * @param {string} name - 事件名称
     * @param {Map} eventMap - 事件的键值对 Map
     * @returns {BasicEntity} - 返回当前实例以支持链式调用
     */
    addEvent(name: string, eventMap: Map<any, any>): BasicEntity;
    /**
     * 删除事件
     * @param {string} name - 事件名称
     * @returns {BasicEntity} - 返回当前实例以支持链式调用
     */
    removeEvent(name: string): BasicEntity;
    /**
     * 清除所有事件
     * @returns {BasicEntity} - 返回当前实例以支持链式调用
     */
    clearEvents(): BasicEntity;
    /**
     * 添加组件组到实体
     * @param {string} name - 组件组名称
     * @param {Map} componentMap - 组件组的键值对 Map
     * @returns {BasicEntity} - 返回当前实例以支持链式调用
     */
    addComponentGroup(name: string, componentMap: Map<any, any>): BasicEntity;
    /**
     * 删除组件组
     * @param {string} name - 组件组名称
     * @returns {BasicEntity} - 返回当前实例以支持链式调用
     */
    removeComponentGroup(name: string): BasicEntity;
    /**
     * 清除所有组件组
     * @returns {BasicEntity} - 返回当前实例以支持链式调用
     */
    clearComponentGroups(): BasicEntity;
    /**
     * 添加组件到实体
     * @param {Map} componentMap - 组件的键值对 Map
     * @returns {BasicEntity} - 返回当前实例以支持链式调用
     */
    addComponent(componentMap: Map<any, any>): BasicEntity;
    /**
     * 删除组件
     * @param {string} key - 组件名称
     * @returns {BasicEntity} - 返回当前实例以支持链式调用
     */
    removeComponent(key: string): BasicEntity;
    /**
     * 清除所有组件
     * @returns {BasicEntity} - 返回当前实例以支持链式调用
     */
    clearComponents(): BasicEntity;
    /**
     * 清除所有数据
     */
    clearAll(): this;
    /**
     * 将实体转换为 JSON 格式
     * @returns {Object} - 返回 JSON 格式的实体数据
     */
    toObject(): Object;
}

declare class AddonClientEntityDescription {
    /**
     * 实体描述类
     * @param {string} identifier 实体标识符
     * @param {string} min_engine_version 最低引擎版本
     */
    constructor(identifier: string, min_engine_version: string);
    identifier: string;
    min_engine_version: string;
    /**
     * 注册粒子效果
     * @param {string} name 组件名称
     * @param {Object} component 组件数据
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
    */
    addParticleEffect(name: string, particle: any): AddonClientEntityDescription;
    particle_effects: {} | undefined;
    /**
     * 添加材质
     * @param {string} name 材质名称
     * @param {string} material 材质路径
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
     */
    addMaterial(name: string, material: string): AddonClientEntityDescription;
    materials: {} | undefined;
    /**
     * 添加纹理
     * @param {string} name 纹理名称
     * @param {string} texture 纹理路径
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
     */
    addTexture(name: string, texture: string): AddonClientEntityDescription;
    textures: {} | undefined;
    /**
     * 添加几何体
     * @param {string} name 几何体名称
     * @param {string} geometry 几何体路径
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
     */
    addGeometry(name: string, geometry: string): AddonClientEntityDescription;
    geometry: {} | undefined;
    /**
     * 添加动画
     * @param {string} name 动画名称
     * @param {string} animation 动画路径
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
     */
    addAnimation(name: string, animation: string): AddonClientEntityDescription;
    animations: {} | undefined;
    /**
     * 添加动画控制器
     * @param {string} name 控制器名称
     * @param {string} controller 控制器路径
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
     */
    addAnimationController(name: string, controller: string): AddonClientEntityDescription;
    animation_controllers: any[] | undefined;
    /**
     * 添加渲染控制器
     * @param {string} controller 渲染控制器路径
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
     */
    addRenderController(controller: string): AddonClientEntityDescription;
    render_controllers: any[] | undefined;
    /**
     * 添加定位器
     * @param {string} name 定位器名称
     * @param {Object} locator 定位器数据
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
     */
    addLocator(name: string, locator: Object): AddonClientEntityDescription;
    locators: {} | undefined;
    /**
     * 设置生成蛋
     * @param {string} texture 生成蛋纹理
     * @param {number} texture_index 生成蛋纹理索引
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
     */
    setSpawnEgg(texture: string, texture_index: number): AddonClientEntityDescription;
    spawn_egg: {
        texture: string;
        texture_index: number;
    } | undefined;
    /**
     * 设置脚本
     * @param {string} key 脚本键
     * @param {string} value 脚本值
     * @returns {AddonClientEntityDescription} 返回当前实例以支持链式调用
     */
    setScript(key: string, value: string): AddonClientEntityDescription;
    scripts: {} | undefined;
}

/**
 * ClientEntity 类，用于表示客户端实体。
 * 继承自 AddonClientEntityDescription，并扩展了实体的数据加载和 JSON 序列化功能。
 */
declare class ClientEntity extends AddonClientEntityDescription {
    /**
     * 构造函数，用于创建一个客户端实体实例。
     *
     * @param {string} identifier - 实体的唯一标识符。
     * @param {Object} data - 实体的初始数据，默认为空对象。
     */
    constructor(identifier: string, data?: Object);
    /**
     * 将当前实体实例转换为 JSON 格式。
     *
     * @returns {Object} - 表示实体的 JSON 对象。
     */
    toObject(): Object;
}

declare namespace EntityAPI {
    function createNativeEntity(identifier: string, proto_id: string, options?: Object): {
        behavior: BasicEntity;
        resource: ClientEntity;
    };
    function createEntity(identifier: string, texture: string, behData: Object, resData: Object, options?: Object): {
        behavior: BasicEntity;
        resource: ClientEntity;
    };
    function createProjectile(identifier: string, texture: string, options?: Object): {
        behavior: BasicEntity;
        resource: ClientEntity;
    };
    function createDummyEntity(identifier: string, texture: string, options: Object | undefined, behData: Object, resData: Object): {
        behavior: BasicEntity;
        resource: ClientEntity;
    };
}

declare class AddonRecipe {
    constructor(format_version: any, recipe_type: any, definitions?: {});
    format_version: any;
    recipe_type: any;
    definitions: {};
    getId(): any;
    identifier(identifier: any): this;
    tags(tags: any): this;
    toObject(): {
        format_version: any;
    };
}

declare class AddonRecipeFurnace extends AddonRecipe {
    /**
     * @param {'1.12'|'1.17'} ver
     * @param {any} def
     */
    static create(ver: "1.12" | "1.17", def: any): AddonRecipeFurnace;
    constructor(format_version: any, definitions: any);
    input(item: any, data: any, count: any): this;
    output(item: any): this;
}
declare class AddonRecipeFurnace_1_17 extends AddonRecipeFurnace {
    constructor(definitions?: {});
}

declare class AddonRecipeShaped extends AddonRecipe {
    /**
     * @param {'1.12'|'1.17'|'1.19'|'1.20'} ver
     * @param {any} def
     */
    static create(ver: "1.12" | "1.17" | "1.19" | "1.20", def: any): AddonRecipeShaped;
    constructor(format_version: any, definitions: any);
    assumeSymmetry(): void;
    key(key: any): this;
    pattern(pattern: any): this;
    priority(priority: any): this;
    output(item: any): this;
}
declare class AddonRecipeShaped_1_20 extends AddonRecipeShaped {
    constructor(definitions: any);
}

declare class AddonRecipeShapeless extends AddonRecipe {
    /**
     * @param {'1.12'|'1.17'} ver
     * @param {any} def
     */
    static create(ver: "1.12" | "1.17", def: any): AddonRecipeShapeless;
    constructor(format_version: any, definitions: any);
    priority(priority: any): this;
    ingredients(ingredients: any): this;
    output(item: any): this;
}
declare class AddonRecipeShapeless_1_17 extends AddonRecipeShapeless {
    constructor(definitions: any);
}

declare const RecipeAPI: RecipeRegistry;
declare class RecipeRegistry {
    /**
     *
     * @param {AddonRecipeFurnace_1_17} recipe
     */
    registerRecipe(recipe: AddonRecipeFurnace_1_17): void;
    registerSimpleFurnace(identifier: any, output: any, input: any): AddonRecipeFurnace_1_17;
    registerFurnace(identifier: any): AddonRecipeFurnace_1_17;
    registerSimpleShaped(identifier: any, output: any, pattern: any, key: any): AddonRecipeShaped_1_20;
    registerShaped(identifier: any): AddonRecipeShaped_1_20;
    registerSimpleShapeless(identifier: any, output: any, ingredients: any): AddonRecipeShapeless_1_17;
    registerShapeless(identifier: any): AddonRecipeShapeless_1_17;
}

declare class BlockComponent {
    static setTick(interval_range: any, looping: any): Map<any, any>;
    /**
     *
     * @param {Array} custom_components
     * @returns
     */
    static setCustomComponents(custom_components: any[]): Map<any, any>;
    /**
   * 创建一个用于 Minecraft 方块的变换对象，并返回一个 Map。
   * @param {number[]} [translation=[0, 0, 0]] - 平移向量 [x, y, z]。
   * @param {number[]} [scale=[1, 1, 1]] - 缩放向量 [x, y, z]。
   * @param {number[]} [scale_pivot=[0, 0, 0]] - 缩放的枢轴点 [x, y, z]。
   * @param {number[]} [rotation=[0, 0, 0]] - 旋转向量（角度）[x, y, z]。
   * @param {number[]} [rotation_pivot=[0, 0, 0]] - 旋转的枢轴点 [x, y, z]。
   * @returns {Map} - 一个包含变换数据的 Map 对象。
   * @throws {Error} - 如果任何参数无效，则抛出错误。
   */
    static setTransformation(translation?: number[], scale?: number[], scale_pivot?: number[], rotation?: number[], rotation_pivot?: number[]): Map<any, any>;
    /**
     * 设置方块的呼吸行为。
     * @param {String} value - 呼吸行为，可选值为 "solid" 或 "air"。
     * @returns {Map} - 新的组件集合。
     */
    static setBreathability(value: string): Map<any, any>;
    /**
     * 启用或禁用方块的碰撞箱。
     * @param {Boolean} enabled - 是否启用碰撞箱。
     * @returns {Map} - 新的组件集合。
     */
    static setCollisionBoxEnabled(enabled: boolean): Map<any, any>;
    /**
     * 设置自定义的碰撞箱。
     * @param {Array} origin - 碰撞箱的起点坐标 [x, y, z]。
     * @param {Array} size - 碰撞箱的大小 [width, height, depth]。
     * @returns {Map} - 新的组件集合。
     */
    static setCollisionBoxCustom(origin: any[], size: any[]): Map<any, any>;
    /**
     * 设置方块的合成台属性。
     * @param {Array} craftingTags - 合成标签。
     * @param {String} tableName - 合成台名称。
     * @returns {Map} - 新的组件集合。
     */
    static setCraftingTable(craftingTags: any[], tableName: string): Map<any, any>;
    /**
     * 启用或禁用方块的爆炸抗性。
     * @param {Boolean} enabled - 是否启用爆炸抗性。
     * @returns {Map} - 新的组件集合。
     */
    static setDestructibleByExplosionEnabled(enabled: boolean): Map<any, any>;
    /**
     * 设置自定义的爆炸抗性。
     * @param {Number} explosionResistance - 爆炸抗性值。
     * @returns {Map} - 新的组件集合。
     */
    static setDestructibleByExplosionCustom(explosionResistance: number): Map<any, any>;
    /**
     * 启用或禁用方块的挖掘抗性。
     * @param {Boolean} enabled - 是否启用挖掘抗性。
     * @returns {Map} - 新的组件集合。
     */
    static setDestructibleByMiningEnabled(enabled: boolean): Map<any, any>;
    /**
     * 设置自定义的挖掘抗性。
     * @param {Number} secondsToDestroy - 破坏所需时间（秒）。
     * @param {Array} itemSpecificSpeeds - 特定工具的挖掘速度。
     * @returns {Map} - 新的组件集合。
     */
    static setDestructibleByMiningCustom(secondsToDestroy: number, itemSpecificSpeeds: any[]): Map<any, any>;
    /**
     * 设置方块的显示名称。
     * @param {String} displayName - 显示名称。
     * @returns {Map} - 新的组件集合。
     */
    static setDisplayName(displayName: string): Map<any, any>;
    /**
     * 启用或禁用方块的易燃性。
     * @param {Boolean} enabled - 是否启用易燃性。
     * @returns {Map} - 新的组件集合。
     */
    static setFlammableEnabled(enabled: boolean): Map<any, any>;
    /**
     * 设置自定义的易燃性。
     * @param {Number} catchChanceModifier - 着火概率。
     * @param {Number} destroyChanceModifier - 被火焰摧毁的概率。
     * @returns {Map} - 新的组件集合。
     */
    static setFlammableCustom(catchChanceModifier: number, destroyChanceModifier: number): Map<any, any>;
    /**
     * 设置方块的摩擦力。
     * @param {Number} value - 摩擦力值，范围为 0.0 到 0.9。
     * @returns {Map} - 新的组件集合。
     */
    static setFriction(value: number): Map<any, any>;
    /**
     * 设置方块的几何模型。
     * @param {String} identifier - 几何模型标识符。
     * @param {Object} bone_visibility - 骨骼可见性配置。
     * @returns {Map} - 新的组件集合。
     */
    static setGeometry(identifier: string, bone_visibility: Object): Map<any, any>;
    /**
     * 设置方块的物品视觉属性。
     * @param {String} geometry - 几何模型标识符。
     * @param {Object} materialInstances - 材质实例配置。
     * @returns {Map} - 新的组件集合。
     */
    static setItemVisual(geometry: string, materialInstances: Object): Map<any, any>;
    /**
     * 设置方块的光衰减值。
     * @param {Number} value - 光的衰减值，范围为 0 到 15。
     * @returns {Map} - 新的组件集合。
     */
    static setLightDampening(value: number): Map<any, any>;
    /**
     * 设置方块的光照强度。
     * @param {Number} value - 光照强度，范围为 0 到 15。
     * @returns {Map} - 新的组件集合。
     */
    static setLightEmission(value: number): Map<any, any>;
    /**
     * 设置方块的液体检测属性。
     * @param {Boolean} canContainLiquid - 是否可以包含液体。
     * @param {String} liquidType - 液体类型。
     * @param {String} onLiquidTouches - 对液体的反应方式。
     * @param {Array} stopsLiquidFlowingFromDirection - 阻止液体流动的方向。
     * @returns {Map} - 新的组件集合。
     */
    static setLiquidDetection(canContainLiquid: boolean, liquidType: string, onLiquidTouches: string, stopsLiquidFlowingFromDirection: any[]): Map<any, any>;
    /**
     * 设置方块的战利品表路径。
     * @param {String} path - 战利品表路径。
     * @returns {Map} - 新的组件集合。
     */
    static setLoot(path: string): Map<any, any>;
    /**
     * 设置方块的地图颜色。
     * @param {String|Array} value - 地图颜色，可以是十六进制字符串或 RGB 数组。
     * @returns {Map} - 新的组件集合。
     */
    static setMapColor(value: string | any[]): Map<any, any>;
    /**
     * 设置方块的材质实例。
     * @param {Object} instances - 材质实例配置。
     * @returns {Map} - 新的组件集合。
     */
    static setMaterialInstances(instances: Object): Map<any, any>;
    /**
     * 设置方块的放置过滤条件。
     * @param {Array} conditions - 放置条件列表。
     * @returns {Map} - 新的组件集合。
     */
    static setPlacementFilter(conditions: any[]): Map<any, any>;
    /**
     * 设置方块的红石导电性。
     * @param {Boolean} allowsWireToStepDown - 是否允许红石线向下阶梯连接。
     * @param {Boolean} redstoneConductor - 方块是否可以被红石信号激活。
     * @returns {Map} - 新的组件集合。
     */
    static setRedstoneConductivity(allowsWireToStepDown: boolean, redstoneConductor: boolean): Map<any, any>;
    /**
     * 启用或禁用方块的选择框。
     * @param {Boolean} enabled - 是否启用选择框。
     * @returns {Map} - 新的组件集合。
     */
    static setSelectionBoxEnabled(enabled: boolean): Map<any, any>;
    /**
     * 设置自定义的选择框。
     * @param {Array} origin - 选择框的起点坐标 [x, y, z]。
     * @param {Array} size - 选择框的大小 [width, height, depth]。
     * @returns {Map} - 新的组件集合。
     */
    static setSelectionBoxCustom(origin: any[], size: any[]): Map<any, any>;
    /**
     * 将多个组件集合合并为一个。
     * @param {...Map} componentMaps - 多个组件集合。
     * @returns {Map} - 合并后的组件集合。
     */
    static combineComponents(...componentMaps: Map<any, any>[]): Map<any, any>;
    /**
     * 获取当前组件的 JSON 表示。
     * @param {Map} components - 组件集合。
     * @returns {Object} - 组件的 JSON 对象。
     */
    static toJSON(components: Map<any, any>): Object;
}

declare class ItemComponent {
    /**
     * 物品的耐久度组件
     * @param {number} max_durability 最大耐久
     * @param {number} damage_chance_min 损坏最小几率
     * @param {number} damage_chance_max 损坏最大几率
     * @returns {ItemComponent}
     */
    static setDurability(max_durability: number, damage_chance_min?: number, damage_chance_max?: number): ItemComponent;
    static setBlockPlacer(block: any, replace_block_item: any, use_on: any): Map<any, any>;
    /**
  *
  * @param {Array} custom_components
  * @returns
  */
    static setCustomComponents(custom_components: any[]): Map<any, any>;
    /**
     * 设置物品的可投掷组件。
     * @param {Boolean} doSwingAnimation - 是否使用挥动动画。
     * @param {Number} launchPowerScale - 投掷力量的缩放比例。
     * @param {Number} maxDrawDuration - 最大蓄力时间。
     * @param {Number} maxLaunchPower - 最大投掷力量。
     * @param {Number} minDrawDuration - 最小蓄力时间。
     * @param {Boolean} scalePowerByDrawDuration - 投掷力量是否随蓄力时间增加。
     * @returns {Map} - 新的组件集合。
     */
    static setThrowable(doSwingAnimation?: boolean, launchPowerScale?: number, maxDrawDuration?: number, maxLaunchPower?: number, minDrawDuration?: number, scalePowerByDrawDuration?: boolean): Map<any, any>;
    /**
     * 设置物品的显示名称。
     * @param {String} displayName - 显示名称或本地化键。
     * @returns {Map} - 新的组件集合。
     */
    static setDisplayName(displayName: string): Map<any, any>;
    /**
     * 设置物品的食物组件。
     * @param {Boolean} canAlwaysEat - 是否随时可以食用。
     * @param {Number} nutrition - 营养值。
     * @param {Number} saturationModifier - 饱和度修正值。
     * @param {String} [usingConvertsTo] - 食用后转换的目标物品。
     * @returns {Map} - 新的组件集合。
     */
    static setFoodComponent(canAlwaysEat: boolean, nutrition: number, saturationModifier: number, usingConvertsTo?: string): Map<any, any>;
    /**
     * 设置物品的燃料组件。
     * @param {Number} duration - 燃料燃烧的持续时间（秒），最小值为 0.05。
     * @returns {Map} - 新的组件集合。
     */
    static setFuel(duration: number): Map<any, any>;
    /**
     * 设置物品的附魔光效组件。
     * @param {Boolean} hasGlint - 是否显示附魔光效。
     * @returns {Map} - 新的组件集合。
     */
    static setGlint(hasGlint: boolean): Map<any, any>;
    /**
     * 设置物品的手持渲染方式组件。
     * @param {Boolean} isHandEquipped - 是否像工具一样渲染。
     * @returns {Map} - 新的组件集合。
     */
    static setHandEquipped(isHandEquipped: boolean): Map<any, any>;
    /**
     * 设置物品的图标组件。
     * @param {String} texture - 图标纹理名称。
     * @returns {Map} - 新的组件集合。
     */
    static setIcon(texture: string): Map<any, any>;
    /**
     * 设置物品的最大堆叠数量组件。
     * @param {Number} maxStackSize - 最大堆叠数量，默认值为 64。
     * @returns {Map} - 新的组件集合。
     */
    static setMaxStackSize(maxStackSize?: number): Map<any, any>;
    /**
     * 设置物品的投射物组件。
     * @param {Number} [minimumCriticalPower] - 投射物需要蓄力多久才能造成暴击。
     * @param {String} [projectileEntity] - 作为投射物发射的实体名称。
     * @returns {Map} - 新的组件集合。
     */
    static setProjectile(minimumCriticalPower?: number, projectileEntity?: string): Map<any, any>;
    /**
     * 设置物品的使用修饰组件。
     * @param {Number} [movementModifier] - 使用物品时玩家移动速度的缩放值。
     * @param {Number} [useDuration] - 物品使用所需的时间（秒）。
     * @returns {Map} - 新的组件集合。
     */
    static setUseModifiers(movementModifier?: number, useDuration?: number): Map<any, any>;
    /**
     * 设置物品的可穿戴组件。
     * @param {Number} [protection=0] - 物品提供的保护值。
     * @param {String} [slot] - 物品可以穿戴的槽位（如 "head"、"chest" 等）。
     * @returns {Map} - 新的组件集合。
     */
    static setWearable(protection?: number, slot?: string): Map<any, any>;
    /**
    * 设置物品的使用动画组件。
    * @param {String} animation - 物品使用时的动画类型（如 "eat"、"drink" 等）。
    * @returns {Map} - 新的组件集合。
    * @throws {Error} - 如果 animation 不是字符串类型。
    */
    static setUseAnimation(animation: string): Map<any, any>;
    /**
     * 将多个组件集合合并为一个。
     * @param {...Map} componentMaps - 多个组件集合。
     * @returns {Map} - 合并后的组件集合。
     */
    static combineComponents(...componentMaps: Map<any, any>[]): Map<any, any>;
    /**
     * 获取当前组件的 JSON 表示。
     * @param {Map} components - 组件集合。
     * @returns {Object} - 组件的 JSON 对象。
     */
    static toJSON(components: Map<any, any>): Object;
}

declare class ItemTextureManager {
    static item_texture_sets: Map<any, any>;
    static getItemTextureSet(): Map<any, any>;
    static getItemTextures(): any;
    static registerTextureData(texture_name: any, texture_data: any): void;
    static registerTexture(texture_name: any, texture_path: any): void;
}
declare class terrainTextureManager {
    static terrain_texture_sets: Map<any, any>;
    static getTerrainTextureSet(): Map<any, any>;
    static getTerrainTextures(): any;
    static registerTextureData(texture_name: any, texture_data: any): void;
    static registerTexture(texture_name: any, texture_path: any): void;
}
declare namespace FlipbookTextures {
    let flipbook_textures: never[];
    function registerFlipbookTexture(atlas_tile: any, texture: any, ticks_per_frame: any, options?: {}): void;
}

export { BlockAPI, BlockComponent, Button, ButtonMapping$1 as ButtonMapping, ChestUISystem, CollectionPanel, type ConstructorOf, ContainerUISystem, Control, DataBinding, DataBindingObject, type EncodeDecoder, EntityAPI, Factory, FeatureAPI, FlipbookTextures, type FloatLiteral, Grid, GridProp, Guidebook, type ISerializer, Image, Input, ItemAPI, ItemCategory, ItemComponent, ItemTextureManager, Label, Layout, Matrix, Modifications, Panel, type RawType, RecipeAPI, ScrollView, ScrollingPanel, Serializable, Serializer, ServerFormSystem, ServerUISystem, Sound, Sprite, StackPanel, Text, UIElement, UISystem, UISystemRegistry, UISystemRegistryServer, Vec3, Vec4, type Vector3, type Vector4, decode, defaultSerializer, encode, f64, form_button_panel, getMetadata, getOrCreateMetadata, isRawJSON, jsonEncodeDecoder, jsonEncoderReplacer, registry, serialize, terrainTextureManager };
