import { world, system, Dimension, Vector3, MolangVariableMap, Entity } from "@minecraft/server";
import { Calculator, Transformation } from "./lib/core.js";

const PARTICLE_ID = "sapdon:color_particle";

// ============================================================
// 方案 A：spawnParticle 直出（推荐，无实体开销）
// 共享调度器：1 个 runInterval 遍历活跃粒子组，空则暂停（无泄漏）
// ============================================================
interface ParticleGroup {
    dimension: Dimension;
    center: Vector3;
    basePoints: number[][];                                  // 相对基准点（形状定义）
    color: { r: number; g: number; b: number };
    spin: number;                                            // 粒子自身旋转角速度（rad/tick）
    trail: number;                                           // 单个粒子存留秒数（拖尾长度）
    totalTicks: number;                                      // 总持续游戏刻
    elapsed: number;
    movementFn: (basePoint: number[], elapsedTick: number, totalTicks: number) => Vector3;
}

class ColorParticleManager {
    private static groups: ParticleGroup[] = [];
    private static handle: number | null = null;

    /**
     * 生成一组沿轨迹运动的彩色粒子（每 tick 在轨迹点 spawnParticle 一个短命粒子）
     */
    static spawn(
        dimension: Dimension,
        center: Vector3,
        basePoints: number[][],
        color: { r: number; g: number; b: number },
        opts: {
            duration?: number;                                 // 总持续秒数（默认 10）
            trail?: number;                                    // 单粒子存留秒数（默认 0.5）
            spin?: number;                                     // 粒子自身旋转（rad/tick，默认 0）
            tick?: number;                                     // 发射间隔游戏刻（默认 1）
            movementFn: (basePoint: number[], elapsedTick: number, totalTicks: number) => Vector3;
        },
    ) {
        ColorParticleManager.groups.push({
            dimension,
            center,
            basePoints,
            color,
            spin: opts.spin ?? 0,
            trail: opts.trail ?? 0.5,
            totalTicks: Math.round((opts.duration ?? 10) * 20),
            elapsed: 0,
            movementFn: opts.movementFn,
        });
        ColorParticleManager.ensureScheduler(opts.tick ?? 1);
    }

    static clearAll() {
        ColorParticleManager.groups = [];
        if (ColorParticleManager.handle !== null) {
            system.clearRun(ColorParticleManager.handle);
            ColorParticleManager.handle = null;
        }
    }

    private static ensureScheduler(tick: number) {
        if (ColorParticleManager.handle !== null) return;
        ColorParticleManager.handle = system.runInterval(() => {
            const groups = ColorParticleManager.groups;
            for (let i = groups.length - 1; i >= 0; i--) {
                const g = groups[i];
                g.elapsed++;
                if (g.elapsed > g.totalTicks) { groups.splice(i, 1); continue; }
                const vars = new MolangVariableMap();
                vars.setFloat("variable.color_r", g.color.r);
                vars.setFloat("variable.color_g", g.color.g);
                vars.setFloat("variable.color_b", g.color.b);
                vars.setFloat("variable.lifetime", g.trail);
                vars.setFloat("variable.spin", g.spin);
                for (const bp of g.basePoints) {
                    const pos = g.movementFn(bp, g.elapsed, g.totalTicks);
                    try {
                        g.dimension.spawnParticle(PARTICLE_ID, pos, vars);
                    } catch {
                        // 位置在未加载区块/世界外时忽略本次发射
                    }
                }
            }
            if (groups.length === 0 && ColorParticleManager.handle !== null) {
                system.clearRun(ColorParticleManager.handle);
                ColorParticleManager.handle = null;
            }
        }, tick);
    }
}

// ============================================================
// 方案 B：DummyEntity 实体（备选路线，保留）
// 每点一个隐形实体 + 动画触发粒子 + 每 tick teleport；已加固生命周期
// ============================================================
interface EntityParticleData {
    entity: Entity;
    handle: number;
    remaining: number;
    totalTicks: number;
    basePoint: number[];
    center: Vector3;
    movementFn: (basePoint: number[], elapsedTick: number, totalTicks: number) => Vector3;
}

class EntityParticleManager {
    private static data = new Map<string, EntityParticleData>();

    static spawn(
        dimension: Dimension,
        location: Vector3,
        lifetime: number,                                     // 总持续秒数
        color: { r: number; g: number; b: number },
        basePoint: number[],
        center: Vector3,
        movementFn: (basePoint: number[], elapsedTick: number, totalTicks: number) => Vector3,
        tick = 1,
    ) {
        const entity = dimension.spawnEntity("sapdon:color_particle", location);
        entity.setProperty("sapdon:float_lifetime", Math.min(0.5, lifetime)); // 单粒子存留（动画粒子寿命）
        entity.setProperty("sapdon:float_color_red", color.r);
        entity.setProperty("sapdon:float_color_green", color.g);
        entity.setProperty("sapdon:float_color_blue", color.b);

        const totalTicks = Math.round(lifetime * 20);
        const handle = system.runInterval(() => {
            const d = EntityParticleManager.data.get(entity.id);
            if (!d) { system.clearRun(handle); return; }
            d.remaining--;
            if (d.remaining <= 0) {
                system.clearRun(d.handle);
                EntityParticleManager.data.delete(entity.id);
                try { entity.remove(); } catch { /* 已被移除 */ }
                return;
            }
            try {
                const target = d.movementFn(d.basePoint, d.totalTicks - d.remaining, d.totalTicks);
                entity.teleport(target, { facingLocation: entity.location });
            } catch {
                system.clearRun(d.handle);
                EntityParticleManager.data.delete(entity.id);
                try { entity.remove(); } catch { /* 已被移除 */ }
            }
        }, tick);

        EntityParticleManager.data.set(entity.id, {
            entity, handle, remaining: totalTicks, totalTicks, basePoint, center, movementFn,
        });
    }

    static clearAllEntities() {
        for (const [, d] of EntityParticleManager.data) {
            system.clearRun(d.handle);
            try { d.entity.remove(); } catch { /* 已被移除 */ }
        }
        EntityParticleManager.data.clear();
    }
}

// ============================================================
// 演示：正方体（只有边） × 缩放/绕Y旋转 × 两方案
// ============================================================
const CUBE = Calculator.calculateCubePoints([0, 0, 0], 2, 0.5); // 8 顶点 + 12 边采样
const BLUE = { r: 0.101, g: 0.501, b: 0.001 };   // 蓝色
const ORANGE = { r: 0.999, g: 0.501, b: 0.001 }; // 橙色
const GREEN = { r: 0.101, g: 0.999, b: 0.001 };  // 绿色
const YELLOW = { r: 0.999, g: 0.999, b: 0.001 }; // 黄色

// 缩放动画：脉冲呼吸（0.3 ~ 1.0，周期 40 tick）
function scalePulse(base: number[], tick: number, _total: number): number {
    return 0.3 + 0.7 * (0.5 + 0.5 * Math.sin((2 * Math.PI * tick) / 40));
}

function cubePulseFn(center: Vector3, base: number[], tick: number, total: number): Vector3 {
    const s = scalePulse(base, tick, total);
    return { x: center.x + base[0] * s, y: center.y + base[1] * s, z: center.z + base[2] * s };
}

function cubeSpinFn(center: Vector3, base: number[], tick: number, total: number): Vector3 {
    const r = Transformation.rotationTransformation([base], "y", (2 * Math.PI * tick) / total)[0];
    return { x: center.x + r[0], y: center.y + r[1], z: center.z + r[2] };
}

world.afterEvents.itemUse.subscribe((event) => {
    const item = event.itemStack.typeId;
    const player = event.source;
    const center = player.location;

    switch (item) {
        // 方案 A（spawnParticle）+ 缩放动画
        case "sapdon:demo_scale_sp": {
            ColorParticleManager.clearAll();
            ColorParticleManager.spawn(player.dimension, center, CUBE, BLUE, {
                duration: 10, trail: 0.5, spin: 0.8,
                movementFn: (bp, t, total) => cubePulseFn(center, bp, t, total),
            });
            break;
        }
        // 方案 A（spawnParticle）+ 绕 Y 旋转动画
        case "sapdon:demo_spin_sp": {
            ColorParticleManager.clearAll();
            ColorParticleManager.spawn(player.dimension, center, CUBE, ORANGE, {
                duration: 10, trail: 0.5, spin: 0,
                movementFn: (bp, t, total) => cubeSpinFn(center, bp, t, total),
            });
            break;
        }
        // 方案 B（实体）+ 缩放动画
        case "sapdon:demo_scale_ent": {
            EntityParticleManager.clearAllEntities();
            for (const bp of CUBE) {
                EntityParticleManager.spawn(
                    player.dimension,
                    { x: center.x + bp[0], y: center.y + bp[1], z: center.z + bp[2] },
                    10, GREEN, bp, center,
                    (b, t, total) => cubePulseFn(center, b, t, total),
                );
            }
            break;
        }
        // 方案 B（实体）+ 绕 Y 旋转动画
        case "sapdon:demo_spin_ent": {
            EntityParticleManager.clearAllEntities();
            for (const bp of CUBE) {
                EntityParticleManager.spawn(
                    player.dimension,
                    { x: center.x + bp[0], y: center.y + bp[1], z: center.z + bp[2] },
                    10, YELLOW, bp, center,
                    (b, t, total) => cubeSpinFn(center, b, t, total),
                );
            }
            break;
        }
    }
});
