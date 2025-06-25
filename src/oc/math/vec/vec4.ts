import { ArrayEx } from "../array.js"
import { Matrix } from "../mat/mat4.js"
import { Vector3 } from "./vec3.js"

export interface Vector4 extends Vector3 {
    w: number
}

export class Vec4 extends ArrayEx implements Vector4 {
    x = 0
    y = 0
    z = 0
    w = 0

    constructor(init: number[]) {
        super(init)
        this.x = init[0] || 0
        this.y = init[1] || 0
        this.z = init[2] || 0
        this.w = init[3] || 0
    }

    static fromXYZW(x: number, y: number, z: number, w: number) {
        return new Vec4([x, y, z, w])
    }

    static fromVec3(vec3: Vector4) {
        return new Vec4([vec3.x, vec3.y, vec3.z])
    }

    static fromVec4(vec4: Vector4) {
        return new Vec4([vec4.x, vec4.y, vec4.z, vec4.w])
    }

    static m(vec: Vector4) {
        const { x, y, z, w } = vec

        return Math.sqrt(x * x + y * y + z * z + w * w)
    }

    m() {
        return Vec4.m(this)
    }

    static isZero(vec: Vector4) {
        return vec.x === 0 && vec.y === 0 && vec.z === 0 && vec.w === 0
    }

    isZero() {
        return Vec4.isZero(this)
    }

    static normalize(vec: Vector4) {
        if (this.isZero(vec)) {
            return false
        }

        const { x, y, z, w } = vec
        const m = this.m(vec);

        vec.x = x / m;
        vec.y = y / m;
        vec.z = z / m;
        vec.w = w / m;
    }

    n() {
        return Vec4.normalize(this)
    }

    static add(vec1: Vector4, vec2: Vector4) {
        return new Vec4([vec1.x + vec2.x, vec1.y + vec2.y, vec1.z + vec2.z, vec1.w + vec2.w])
    }

    add(vec: Vector4) {
        return Vec4.add(this, vec)
    }

    static sub(vec1: Vector4, vec2: Vector4) {
        return new Vec4([vec1.x - vec2.x, vec1.y - vec2.y, vec1.z - vec2.z, vec1.w - vec2.w])
    }

    sub(vec: Vector4) {
        return Vec4.sub(this, vec)
    }

    static mul(vec: Vector4, scalar: number) {
        return new Vec4([vec.x * scalar, vec.y * scalar, vec.z * scalar, vec.w * scalar])
    }

    mul(scalar: number) {
        return Vec4.mul(this, scalar)
    }

    static div(vec: Vector4, scalar: number) {
        return new Vec4([vec.x / scalar, vec.y / scalar, vec.z / scalar, vec.w / scalar])
    }

    div(scalar: number) {
        return Vec4.div(this, scalar)
    }

    static dot(vec1: Vector4, vec2: Vector4) {
        return vec1.x * vec2.x + vec1.y * vec2.y + vec1.z * vec2.z + vec1.w * vec2.w
    }

    dot(vec: Vector4) {
        return Vec4.dot(this, vec)
    }

    static multiply(vec: Vector4, mat: Matrix) {
        return Matrix.multiply(mat, vec)
    }

    multiply(mat: Matrix) {
        return Vec4.multiply(this, mat)
    }

    valueOf() {
        return new ArrayEx([this.x, this.y, this.z, this.w])
    }

    toString() {
        return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)}, ${this.z.toFixed(2)}, ${this.w.toFixed(2)})`
    }
}