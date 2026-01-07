import { GeometryBlock } from "../block/geometryBlock.js";
import { FlipbookTextures } from "../texture.js";
import { Item } from "./item.js";
import { ItemComponent } from "./itemComponents.js";

/**
 * 翻书物品配置选项接口
 */
export interface FlipbookItemOptions {
	/**
	 * 物品分组 - 用于在创造模式物品栏中分组显示
	 * @example "construction" - 建筑类
	 * @example "equipment" - 装备类
	 * @example "nature" - 自然类
	 */
	group?: string;
	
	/**
	 * 是否在命令自动补全中隐藏该物品
	 * @default false - 默认在命令中显示
	 */
	hide_in_command?: boolean;
	
	/**
	 * 每个动画帧持续的游戏刻数（tick）
	 * 1秒 = 20游戏刻，因此8刻 = 0.4秒
	 * @default 8 - 默认每帧显示0.4秒
	 * @minimum 1 - 最小值1刻
	 */
	ticks_per_frame?: number;
	
	/**
	 * 物品的最大堆叠数量
	 * @default 64 - 默认堆叠64个
	 * @minimum 1 - 最小值1
	 * @maximum 99 - 最大堆叠限制
	 */
	max_stack_size?: number;
	
	/**
	 * 资源包的格式版本号
	 * @example "1.20.0" - 1.20版本
	 * @example "1.19.0" - 1.19版本
	 * @default "1.20.0" - 默认使用最新版本
	 */
	format_version?: string;
}

/**
 * 翻书物品类
 * 继承自Item类，用于创建具有动态翻书动画效果的物品
 * 该类会自动创建对应的几何方块并注册翻书材质动画
 */
export class FlipbookItem extends Item {
	
	/**
	 * 关联的外观方块实例
	 * 用于在游戏中显示该翻书物品的3D模型
	 */
	public block: GeometryBlock;
	
	/**
	 * 创建并注册翻书物品
	 * 
	 * @param identifier - 物品的唯一标识符（如："my_mod:flipbook_item"）
	 * @param category - 物品所属的分类（如："construction", "equipment"等）
	 * @param texture - 纹理名称（不包含路径和后缀，如："my_flipbook_texture"）
	 * @param options - 可选的配置参数对象
	 * @param options.group - 物品分组，用于在创造模式物品栏中分组显示
	 * @param options.hide_in_command - 是否在命令自动补全中隐藏该物品
	 * @param options.ticks_per_frame - 每个动画帧持续的游戏刻数（tick），默认8刻
	 * @param options.max_stack_size - 物品的最大堆叠数量
	 * @param options.format_version - 格式版本号
	 */
	constructor(
		identifier: string, 
		category: string, 
		texture: string, 
		options?: FlipbookItemOptions
	) {
		// 调用父类Item的构造函数
		super(identifier, category, texture, options);

		this.removeComponent("minecraft:icon")
		.addComponent(
			ItemComponent.setBlockPlacer(
				identifier + "_block",  // 使用与物品对应的方块标识符,
				false,
				[identifier + "_block"]
			)
		);

		// 注册对应的外观方块
		// 该方块使用指定的几何模型和渲染设置来显示翻书效果
		this.block = new GeometryBlock(
			identifier + "_block",              // 方块标识符：在原物品标识符后添加"_block"
			"construction",                     // 方块分类
			"geometry.flipbook_item",          // 使用的几何模型标识符
			{
				"*": {
					"texture": texture,                     // 应用相同的纹理
					"render_method": "alpha_test_single_sided", // 单面透明渲染，用于显示带透明度的纹理
					"face_dimming": false,                  // 禁用面变暗效果，使方块在不同光照下保持相同亮度
					"ambient_occlusion": false              // 禁用环境光遮蔽，避免在角落产生阴影
				}
			}
		);

		// 注册翻书材质动画
		// 这会使纹理以指定的速度进行帧动画播放，创建翻书效果
		FlipbookTextures.registerFlipbookTexture(
			texture,                              // 纹理标识符
			"textures/blocks/" + texture,         // 纹理文件路径（假设位于blocks文件夹中）
			options?.ticks_per_frame ?? 8         // 动画速度：每个帧持续的游戏刻数，默认8刻（0.4秒）
		);
	}
}