// 引擎层 R — 常量：方块/物品类型、方块状态名、持久化参数（供 engine/* 共享）
export const WIRE_TYPE = "power_grid:wire";
export const COAL_GEN_TYPE = "power_grid:coal_generator";
export const SOLAR_TYPE = "power_grid:solar";
export const FURNACE_TYPE = "power_grid:electric_furnace";
export const BATTERY_TYPE = "power_grid:battery";
export const RELAY_TYPE = "power_grid:relay";
export const DEVICE_TYPES = [COAL_GEN_TYPE, SOLAR_TYPE, FURNACE_TYPE, BATTERY_TYPE, RELAY_TYPE];

export const PLACE_ITEMS = ["power_grid:wire_item"];
export const MULTIMETER_ITEM = "power_grid:multimeter";

// 方块状态（世界自动持久化；点/朝向不入持久化表）
export const POWER_STATE = "power_grid:powered";   // 电线/继电器/熔炉发光（0/1）
export const GEN_BURN_STATE = "power_grid:burning"; // 发电机燃烧中（0/1）
export const SOLAR_STATE = "power_grid:active";     // 太阳能板日照中（0/1）
export const BATTERY_LEVEL_STATE = "power_grid:level"; // 电池电量 0..15（受 16 状态上限）
export const RELAY_ON_STATE = "power_grid:on";       // 继电器导通（0/1）
export const CONNECT = (face: string) => `wire_connect:${face}`; // 电线连接手臂（骨显隐）

export const CARDINAL_STATE = "minecraft:cardinal_direction";

// 燃油：1 个煤炭 = 若干秒燃烧（发电机以记忆 fuel 计数，点击煤炭喂入）
export const COAL_BURN_SECONDS = 10;   // 发电机每个煤炭燃烧时长 / s（产出周期见 core/settle.ts GEN_OUTPUT）

export const SAVE_KEY = "power_grid:data";
export const CHUNK = 24000;
export const VER = 1;
export const PENDING_BATCH = 64;        // 加载后每 tick 渐进重建的电线批数
export const TICK_INTERVAL = 20;        // 主循环间隔（tick）
export const SUN_TIME_NIGHT_START = 13000;
export const SUN_TIME_DAY_START = 23500;