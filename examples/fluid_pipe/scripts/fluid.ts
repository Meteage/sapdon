// 门面：引擎层 R 聚合导出（实现分散在 engine/{const,world,log,state,graph,rebuild,render,persist,tick,diag}.ts）
// 逻辑层 L 见 ./fluidCore.js（core/{graph,potential,flow}.ts）。
export * from "./engine/const.js";
export * from "./engine/world.js";
export * from "./engine/log.js";
export * from "./engine/state.js";
export * from "./engine/graph.js";
export * from "./engine/rebuild.js";
export * from "./engine/render.js";
export * from "./engine/persist.js";
export * from "./engine/tick.js";
export * from "./engine/diag.js";