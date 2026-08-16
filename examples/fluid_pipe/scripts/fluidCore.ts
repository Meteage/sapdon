// 门面：逻辑层 L 聚合导出（实现分散在 core/{graph,potential,flow}.ts）
// 无 @minecraft/server 依赖；改核心逻辑须同步 test/fluid.test.mjs 镜像副本。
export * from "./core/graph.js";
export * from "./core/potential.js";
export * from "./core/flow.js";