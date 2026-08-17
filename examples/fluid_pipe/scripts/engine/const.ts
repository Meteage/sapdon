// 引擎层 R — 常量：方块/物品类型、方块状态名、持久化参数（供 engine/* 共享）
export const PIPE_TYPE = "fluid_pipe:fluid_pipe";
export const PUMP_TYPE = "fluid_pipe:pump";
export const TANK_TYPE = "fluid_pipe:tank";
export const VALVE_TYPE = "fluid_pipe:valve";
export const VALVE3_TYPE = "fluid_pipe:valve3";
export const FLUID_TYPES = [PIPE_TYPE, PUMP_TYPE, TANK_TYPE, VALVE_TYPE, VALVE3_TYPE];
export const PLACE_ITEMS = ["fluid_pipe:pipe_item"];
export const WRENCH_ITEM = "fluid_pipe:wrench";

export const CONNECT = (face: string) => `pipe_connect:${face}`;
export const FLUID_STATE = "fluid_pipe:core";
export const PUMP_ON_STATE = "fluid_pipe:on";
export const TANK_LEVEL_STATE = "fluid_pipe:level";
export const TANK_LEVEL_MAX = 15; // 渲染水块级数（状态最多 16 值 0..15；内存液位 0..32 映射）
export const CARDINAL_STATE = "minecraft:cardinal_direction"; // 旋转方块朝向（north/south/east/west）
export const FACING_STATE = "minecraft:facing_direction";     // 6 面旋转朝向（north/south/east/west/up/down）
export const VALVE_OPEN_STATE = "fluid_pipe:open"; // 单方向阀门开/关（扳手只切顶面箭头，方块朝向不动）
export const VALVE3_DIR_STATE = "fluid_pipe:dir"; // 三通阀输出方向（east/south/west/north，west=全关）

export const SAVE_KEY = "fluid_pipe:data";
export const CHUNK = 24000;
export const VER = 3;

export const PENDING_BATCH = 64; // 加载后每 tick 渐进重建的管道批数