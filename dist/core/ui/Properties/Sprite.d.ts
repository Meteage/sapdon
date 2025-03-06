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
export class Sprite {
    /**
     * 设置图像纹理路径。
     * @param {string} texture - 图像路径（例如："textures/ui/White"）
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setTexture(texture: string): Sprite;
    texture: string;
    /**
     * 设置是否在纹理未找到时显示缺失纹理。
     * @param {boolean} allow - 是否显示缺失纹理（默认值：true）
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setAllowDebugMissingTexture(allow?: boolean): Sprite;
    allow_debug_missing_texture: boolean;
    /**
     * 设置纹理映射的起始位置。
     * @param {number[]} uv - 起始位置，格式为 [u, v]
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setUV(uv: number[]): Sprite;
    uv: number[];
    /**
     * 设置纹理映射的大小。
     * @param {number[]} uvSize - 大小，格式为 [width, height]
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setUVSize(uvSize: number[]): Sprite;
    uv_size: number[];
    /**
     * 设置纹理来源。
     * @param {string} source - 纹理来源（可能值：InUserPackage, InAppPackage, RawPath, RawPersistent, InSettingsDir, InExternalDir, InServerPackage, InDataDir, InUserDir, InWorldDir, StoreCache, Usage is Unknown）
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setTextureFileSystem(source?: string): Sprite;
    texture_file_system: string;
    /**
     * 设置 9-slice 分割大小。
     * @param {number|number[]} size - 9-slice 分割大小（可以是单个数字或 [x0, y0, x1, y1] 数组）
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setNineSliceSize(size: number | number[]): Sprite;
    nineslice_size: number | number[];
    /**
     * 设置是否平铺纹理。
     * @param {boolean|string} tiled - 是否平铺纹理（可能值：true/false, x, y）
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setTiled(tiled: boolean | string): Sprite;
    tiled: string | boolean;
    /**
     * 设置平铺纹理的缩放比例。
     * @param {number[]} scale - 缩放比例，格式为 [sX, sY]（默认值：[1, 1]）
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setTiledScale(scale?: number[]): Sprite;
    tiled_scale: number[];
    /**
     * 设置裁剪方向的起始点。
     * @param {string} direction - 裁剪方向（可能值：left, right, up, down, center）
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setClipDirection(direction: string): Sprite;
    clip_direction: string;
    /**
     * 设置裁剪比例。
     * @param {number} ratio - 裁剪比例（范围：0.0 到 1.0）
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setClipRatio(ratio: number): Sprite;
    clip_ratio: number;
    /**
     * 设置是否尽可能保持像素精确裁剪。
     * @param {boolean} pixelPerfect - 是否保持像素精确裁剪
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setClipPixelPerfect(pixelPerfect?: boolean): Sprite;
    clip_pixelperfect: boolean;
    /**
     * 设置是否在调整大小时保持比例。
     * @param {boolean} keep - 是否保持比例（默认值：true）
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setKeepRatio(keep?: boolean): Sprite;
    keep_ratio: boolean;
    /**
     * 设置是否在调整大小时使用双线性函数。
     * @param {boolean} bilinear - 是否使用双线性函数（默认值：false）
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setBilinear(bilinear?: boolean): Sprite;
    bilinear: boolean;
    /**
     * 设置是否拉伸图像以适应大小。
     * @param {boolean} fill - 是否拉伸图像（默认值：false）
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setFill(fill?: boolean): Sprite;
    fill: boolean;
    /**
     * 设置是否适应宽度。
     * @param {boolean} fit - 是否适应宽度
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setFitToWidth(fit?: boolean): Sprite;
    $fit_to_width: boolean;
    /**
     * 设置压缩文件夹路径。
     * @param {string} folder - 压缩文件夹路径
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setZipFolder(folder: string): Sprite;
    zip_folder: string;
    /**
     * 设置是否以黑白渲染图像。
     * @param {boolean} grayscale - 是否以黑白渲染图像（默认值：false）
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setGrayscale(grayscale?: boolean): Sprite;
    grayscale: boolean;
    /**
     * 设置是否在纹理路径更改时强制重新加载图像。
     * @param {boolean} force - 是否强制重新加载图像
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setForceTextureReload(force?: boolean): Sprite;
    force_texture_reload: boolean;
    /**
     * 设置基础大小。
     * @param {number[]} size - 基础大小，格式为 [width, height]
     * @returns {Sprite} 返回当前实例以支持链式调用
     */
    setBaseSize(size: number[]): Sprite;
    base_size: number[];
}
