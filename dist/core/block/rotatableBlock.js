import { BasicBlock } from "./basicBlock.js";
import { BlockComponent } from "./blockComponent.js";
export const RotationTypes = {
    CARDINAL: "cardinal", // 北、南、东、西
    FACING: "facing", // 上、下、北、南、东、西
    BLOCK_FACE: "block_face", // 上、下、北、南、东、西（与 FACING 类似，但用途不同）
    LOG: "log" // 原木旋转（X、Y、Z 轴对齐）
};
export class RotatableBlock extends BasicBlock {
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
    constructor(identifier, category, textures_arr, options = {}) {
        // 调用父类构造函数
        super(identifier, category, textures_arr, options);
        const { rotationType = RotationTypes.CARDINAL, yRotationOffset = 180 } = options;
        // 根据旋转类型注册特性和添加变体
        this.#setupRotation(rotationType, yRotationOffset);
    }
    /**
     * 根据旋转类型设置特性和变体
     * @param {string} rotationType 旋转类型
     * @param {number} yRotationOffset 初始旋转偏移量
     */
    #setupRotation(rotationType, yRotationOffset) {
        switch (rotationType) {
            case RotationTypes.CARDINAL:
                // 北、南、东、西
                this.registerTrait("minecraft:placement_direction", {
                    enabled_states: ["minecraft:cardinal_direction"],
                    y_rotation_offset: yRotationOffset
                });
                this.#addCardinalDirectionPermutations();
                break;
            case RotationTypes.FACING:
                // 上、下、北、南、东、西
                this.registerTrait("minecraft:placement_direction", {
                    enabled_states: ["minecraft:facing_direction"]
                });
                this.#addFacingDirectionPermutations();
                break;
            case RotationTypes.BLOCK_FACE:
                // 上、下、北、南、东、西（与 FACING 类似，但用途不同）
                this.registerTrait("minecraft:placement_position", {
                    enabled_states: ["minecraft:block_face"]
                });
                this.#addBlockFacePermutations();
                break;
            case RotationTypes.LOG:
                // 原木旋转（X、Y、Z 轴对齐）
                this.registerTrait("minecraft:placement_position", {
                    enabled_states: ["minecraft:block_face"]
                });
                this.#addLogRotationPermutations();
                break;
            default:
                throw new Error(`Unknown rotation type: ${rotationType}`);
        }
    }
    /**
     * 添加 Cardinal Direction 旋转变体
     */
    #addCardinalDirectionPermutations() {
        this.addPermutation("q.block_state('minecraft:cardinal_direction') == 'north'", BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, 0, 0], [0, 0, 0]))
            .addPermutation("q.block_state('minecraft:cardinal_direction') == 'south'", BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, 0, 0], [0, 90, 0]))
            .addPermutation("q.block_state('minecraft:cardinal_direction') == 'east'", BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, 0, 0], [0, 180, 0]))
            .addPermutation("q.block_state('minecraft:cardinal_direction') == 'west'", BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, 0, 0], [0, -90, 0]));
    }
    /**
     * 添加 Facing Direction 旋转变体
     */
    #addFacingDirectionPermutations() {
        this.addPermutation("q.block_state('minecraft:facing_direction') == 'down'", BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, 0, 0], [-90, 0, 0]))
            .addPermutation("q.block_state('minecraft:facing_direction') == 'up'", BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, 0, 0], [90, 0, 0]))
            .addPermutation("q.block_state('minecraft:facing_direction') == 'north'", BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, 0, 0], [0, 0, 0]))
            .addPermutation("q.block_state('minecraft:facing_direction') == 'west'", BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, 0, 0], [0, 90, 0]))
            .addPermutation("q.block_state('minecraft:facing_direction') == 'south'", BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, 0, 0], [0, 180, 0]))
            .addPermutation("q.block_state('minecraft:facing_direction') == 'east'", BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, 0, 0], [0, -90, 0]));
    }
    /**
     * 添加 Block Face 旋转变体
     */
    #addBlockFacePermutations() {
        this.addPermutation("q.block_state('minecraft:block_face') == 'down'", BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [-90, 0, 0], [0, 0, 0]))
            .addPermutation("q.block_state('minecraft:block_face') == 'up'", BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [90, 0, 0], [0, 0, 0]))
            .addPermutation("q.block_state('minecraft:block_face') == 'north'", BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, 0, 0], [0, 0, 0]))
            .addPermutation("q.block_state('minecraft:block_face') == 'south'", BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, 180, 0], [0, 90, 0]))
            .addPermutation("q.block_state('minecraft:block_face') == 'east'", BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, 90, 0], [0, 180, 0]))
            .addPermutation("q.block_state('minecraft:block_face') == 'west'", BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, -90, 0], [0, -90, 0]));
    }
    /**
     * 添加 Log Rotation 旋转变体
     */
    #addLogRotationPermutations() {
        this.addPermutation("q.block_state('minecraft:block_face') == 'west' || q.block_state('minecraft:block_face') == 'east'", BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, 0, 90], [0, 0, 0]))
            .addPermutation("q.block_state('minecraft:block_face') == 'down' || q.block_state('minecraft:block_face') == 'up'", BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [0, 0, 0], [0, 0, 0]))
            .addPermutation("q.block_state('minecraft:block_face') == 'north' || q.block_state('minecraft:block_face') == 'south'", BlockComponent.setTransformation([0, 0, 0], [1, 1, 1], [90, 0, 0], [0, 0, 0]));
    }
}
