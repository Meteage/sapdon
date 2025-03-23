import { world, system, Dimension, Entity } from "@minecraft/server";
import { Calculator, Transformation } from "./lib/core";

/**
 * 颜色粒子管理器
 */
class ColorParticleManager {
    // 用于存储粒子实体及其间隔任务句柄和生命周期的 Map
    static particleDataMap = new Map();

    /**
     * 生成动态彩色粒子
     * @param {Dimension} dimension - 维度对象
     * @param {import("@minecraft/server").Vector3} location - 粒子的生成位置
     * @param {number} lifetime - 粒子的生命周期（秒）
     * @param {Object} color - 粒子的颜色（包含 r, g, b 属性）
     * @param {Function} movementFunction - 自定义粒子运动函数
     * @param {number} tick - 间隔任务的执行间隔（游戏刻）
     */
    static spawnColorParticle(dimension, location, lifetime, color, movementFunction, tick = 1) {
        // 生成颜色粒子实体
        const particle = dimension.spawnEntity("sapdon:color_particle", location);

        // 设置粒子生命周期
        particle.setProperty("sapdon:float_lifetime", lifetime);

        // 设置粒子颜色
        particle.setProperty("sapdon:float_color_red", color.r);
        particle.setProperty("sapdon:float_color_green", color.g);
        particle.setProperty("sapdon:float_color_blue", color.b);

        // 注册间隔任务
        const intervalHandle = system.runInterval(() => {
            this._onParticleTick(particle, lifetime * 20, movementFunction);
        }, tick);

        // 将粒子实体及其间隔任务句柄和生命周期存入 Map
        this.particleDataMap.set(particle.id, {
            handle: intervalHandle,
            lifetime: lifetime * 20 // 将秒转换为游戏刻
        });
    }

    /**
     * 间隔任务函数：控制粒子的运动和生命周期
     * @param {Entity} particle - 粒子实体
     * @param {number} totalTicks - 粒子的总生命周期（游戏刻）
     * @param {Function} movementFunction - 自定义粒子运动函数
     */
    static _onParticleTick(particle, totalTicks, movementFunction) {
        const particleData = this.particleDataMap.get(particle.id);

        if (particleData.lifetime > 0) {
            // 获取粒子当前位置
            const currentLocation = particle.location;

            // 调用自定义运动函数计算新位置
            const targetLocation = movementFunction(currentLocation, particleData.lifetime, totalTicks);

            // 更新粒子的位置
            particle.teleport(targetLocation, { facingLocation: currentLocation });

            // 粒子生命周期减一
            particleData.lifetime--;
            this.particleDataMap.set(particle.id, particleData);
        } else {
            // 粒子生命周期结束，清除间隔任务并移除粒子
            system.clearRun(particleData.handle);
            this.particleDataMap.delete(particle.id);
            particle.remove();
        }
    }
}

// 监听玩家使用物品事件
world.afterEvents.itemUse.subscribe((event) => {
    const item = event.itemStack.typeId;
    const player = event.source;

    switch (item) {
        case "minecraft:diamond":
            // 使用钻石生成旋转的正方体阵列
            const cubePoints = Calculator.calculateCubePoints([0, 0, 0], 2, 0.5); // 生成正方体的点
            const center = player.location; // 固定中心点坐标

            cubePoints.forEach((point, index) => {
                const location = {
                    x: point[0] + center.x,
                    y: point[1] + center.y,
                    z: point[2] + center.z
                };
                ColorParticleManager.spawnColorParticle(
                    player.dimension,
                    location,
                    10, // 生命周期为 100 秒
                    { r: 0.001, g: 0.001, b: 0.999 }, // 蓝色
                    (currentLocation, currentTick, totalTicks) => {
                        // 计算旋转后的点
                        const rotatedPoints = Transformation.rotationTransformation(cubePoints, 'y', 2 * Math.PI * (currentTick / totalTicks));
                        return {
                            x: center.x + rotatedPoints[index][0],
                            y: center.y + rotatedPoints[index][1],
                            z: center.z + rotatedPoints[index][2]
                        };
                    },
                    1 // 每 1 游戏刻执行一次
                );
            });
            break;
    }
});