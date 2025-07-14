import { Entity } from "@minecraft/server"
import { CustomComponent } from "@sapdon/runtime/core.js"
import { Vec3, Vector3 } from "@sapdon/runtime/math/index.js"

export class VehicleWheel {
    /**
     * Y 无效，不参与计算
     */
    offset: Vector3 = Vec3.fromXYZ(0, 0, 0)
    
}

export class EasyVehicleComponent extends CustomComponent<Entity> {

    constructor(
        public width: number = 2,
        public height: number = 1.5,
        public length: number = 4.5,
        public mass: number = 1500
    ) {
        super()
    }

    inertia: Vec3 = Vec3.fromXYZ(0, 0, 0)

    _calcInertia() {
        this.inertia = Vec3.mul(Vec3.fromXYZ(this.height ** 2 + this.width ** 2, this.width ** 2 + this.length ** 2, 0), this.mass / 12)
    }
}