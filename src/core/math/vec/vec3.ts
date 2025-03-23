import { ArrayEx } from "../array.js"

export interface Vector3 {
    x: number
    y: number
    z: number
}

export class Vec3 extends ArrayEx implements Vector3 {
    x = 0
    y = 0
    z = 0

    constructor(init: number[]) {
        super(init)
        this.x = init[0] || 0
        this.y = init[1] || 0
        this.z = init[2] || 0
    }

    static fromXYZ(x: number, y: number, z: number) {
        return new Vec3([x, y, z])
    }

    static fromVec3(vec3: Vector3) {
        return new Vec3([vec3.x, vec3.y, vec3.z])
    }

    static m(vec3: Vector3) {
        const { x, y, z } = vec3

        return Math.sqrt(x * x + y * y + z * z)
    }

    m() {
        return Vec3.m(this)
    }

    static isZero(vec: Vector3) {
        return vec.x === 0 && vec.y === 0 && vec.z === 0
    }

    isZero() {
        return Vec3.isZero(this)
    }

    static normalize(vec: Vector3) {
        if (this.isZero(vec)) {
            return false
        }

        const { x, y, z } = vec
        const m = this.m(vec);

        vec.x = x / m;
        vec.y = y / m;
        vec.z = z / m;
    }

    n() {
        return Vec3.normalize(this)
    }

    static add(vec1: Vector3, vec2: Vector3) {
        return new Vec3([vec1.x + vec2.x, vec1.y + vec2.y, vec1.z + vec2.z])
    }

    add(vec: Vector3) {
        return Vec3.add(this, vec)
    }

    static sub(vec1: Vector3, vec2: Vector3) {
        return new Vec3([vec1.x - vec2.x, vec1.y - vec2.y, vec1.z - vec2.z])
    }

    sub(vec: Vector3) {
        return Vec3.sub(this, vec)
    }

    static mul(vec: Vector3, scalar: number) {
        return new Vec3([vec.x * scalar, vec.y * scalar, vec.z * scalar])
    }

    mul(scalar: number) {
        return Vec3.mul(this, scalar)
    }

    static div(vec: Vector3, scalar: number) {
        return new Vec3([vec.x / scalar, vec.y / scalar, vec.z / scalar])
    }

    div(scalar: number) {
        return Vec3.div(this, scalar)
    }

    static dot(vec1: Vector3, vec2: Vector3) {
        return vec1.x * vec2.x + vec1.y * vec2.y + vec1.z * vec2.z
    }

    dot(vec: Vector3) {
        return Vec3.dot(this, vec)
    }

    static cross(vec1: Vector3, vec2: Vector3) {
        return new Vec3([
            vec1.y * vec2.z - vec1.z * vec2.y,
            vec1.z * vec2.x - vec1.x * vec2.z,
            vec1.x * vec2.y - vec1.y * vec2.x
        ])
    }

    cross(vec: Vector3) {
        return Vec3.cross(this, vec)
    }

    valueOf() {
        return new ArrayEx([this.x, this.y, this.z])
    }

    toString() {
        return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)}, ${this.z.toFixed(2)})`
    }
}