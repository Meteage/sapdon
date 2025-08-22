import { Entity, Vector2 } from "@minecraft/server"
import { CustomComponent } from "@sapdon/runtime/core.js";
import { Vec3 } from "@sapdon/runtime/math/index.js";

export class EasyKinematicsComponent extends CustomComponent<Entity> {
    angularVelocity: Vec3;
    constructor(
        readonly mass: number,
        public allowRotation: boolean = false,
        public simulated: boolean = false,
    ) {
        super()
        this.angularVelocity = Vec3.fromXYZ(0, 0, 0);
    }

    force: Vec3 = Vec3.fromXYZ(0, 0, 0)
    /**
     * Z 无法使用，实际上只允许 X 和 Y 轴旋转
     */
    torque: Vec3 = Vec3.fromXYZ(0, 0, 0)

    onTick(dt: number): void {
        this.getEntity().use(en => {
            if (!this.simulated) {
                en.applyImpulse(Vec3.mul(this.force, dt))
                const enRot = en.getRotation()
                en.setRotation({
                    x: enRot.x,
                    y: enRot.y + this.angularVelocity.x * dt,
                })
                return
            }

            const dPos = Vec3.mul(Vec3.div(this.force, this.mass), dt ** 2 * 0.5)
            en.tryTeleport(Vec3.add(en.location, dPos))
            const enRot = en.getRotation()
            en.setRotation({
                x: enRot.x,
                y: enRot.y + this.angularVelocity.x * dt,
            })
        })
    }
}