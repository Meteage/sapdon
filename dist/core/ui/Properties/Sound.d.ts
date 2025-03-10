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
export class Sound {
    /**
     * 设置声音名称。
     * @param {string} name - 声音名称（定义在 RP/sounds/sound_definitions.json 文件中）
     * @returns {Sound} 返回当前实例以支持链式调用
     */
    setSoundName(name: string): Sound;
    sound_name: string;
    /**
     * 设置声音音量。
     * @param {number} volume - 音量（范围：0.0 到 1.0，默认值：1.0）
     * @returns {Sound} 返回当前实例以支持链式调用
     */
    setSoundVolume(volume?: number): Sound;
    sound_volume: number;
    /**
     * 设置声音音调。
     * @param {number} pitch - 音调（默认值：1.0）
     * @returns {Sound} 返回当前实例以支持链式调用
     */
    setSoundPitch(pitch?: number): Sound;
    sound_pitch: number;
    /**
     * 设置触发事件时播放的声音数组。
     * @param {object[]} sounds - 声音对象数组
     * @returns {Sound} 返回当前实例以支持链式调用
     */
    setSounds(sounds: object[]): Sound;
    sounds: any[];
    /**
     * 添加一个声音对象到声音数组。
     * @param {object} sound - 声音对象
     * @returns {Sound} 返回当前实例以支持链式调用
     */
    addSound(sound: object): Sound;
}
