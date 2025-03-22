import { ArrayEx } from "../array.js"
import { Vec3, Vector3 } from "../vec/vec3.js"
import { Vec4, Vector4 } from "../vec/vec4.js"

export class Matrix extends ArrayEx {
    constructor() {
        super((<any[]>[]).fill(0, 0, 16))
        this.fill(0)
    }

    get m11() {
        return this[0]
    }

    get m12() {
        return this[1]
    }

    get m13() {
        return this[2]
    }

    get m14() {
        return this[3]
    }

    get m21() {
        return this[4]
    }

    get m22() {
        return this[5]
    }

    get m23() {
        return this[6]
    }

    get m24() {
        return this[7]
    }

    get m31() {
        return this[8]
    }

    get m32() {
        return this[9]
    }

    get m33() {
        return this[10]
    }

    get m34() {
        return this[11]
    }

    get m41() {
        return this[12]
    }

    get m42() {
        return this[13]
    }

    get m43() {
        return this[14]
    }

    get m44() {
        return this[15]
    }
 
    set m11(v) {
        this[0] = v
    }

    set m12(v) {
        this[1] = v
    }

    set m13(v) {
        this[2] = v
    }

    set m14(v) {
        this[3] = v
    }

    set m21(v) {
        this[4] = v
    }

    set m22(v) {
        this[5] = v
    }

    set m23(v) {
        this[6] = v
    }

    set m24(v) {
        this[7] = v
    }

    set m31(v) {
        this[8] = v
    }

    set m32(v) {
        this[9] = v
    }

    set m33(v) {
        this[10] = v
    }

    set m34(v) {
        this[11] = v
    }

    set m41(v) {
        this[12] = v
    }

    set m42(v) {
        this[13] = v
    }

    set m43(v) {
        this[14] = v
    }

    set m44(v) {
        this[15] = v
    }

    get a() {
        return this.m11
    }

    get b() {
        return this.m12
    }

    get c() {
        return this.m21
    }

    get d() {
        return this.m22
    }

    get e() {
        return this.m41
    }

    get f() {
        return this.m42
    }

    set a(v) {
        this.m11 = v
    }

    set b(v) {
        this.m12 = v
    }

    set c(v) {
        this.m21 = v
    }

    set d(v) {
        this.m22 = v
    }

    set e(v) {
        this.m41 = v
    }

    set f(v) {
        this.m42 = v
    }

    static init(init: Iterable<number>, mapfn: (v: number, k: number) => number, thisArg?: any) {
        const arr = ArrayEx.from(init, mapfn, thisArg)
        const m = new Matrix()
        m.set(arr)

        return m
    }

    clone() {
        return Matrix.init(this.slice(), v => v)
    }

    setIdentity() {
        this.set([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ])

        return this
    }

    static identity() {
        const m = new Matrix()
        m.setIdentity()
        return m
    }

    static add(m1: Matrix, m2: Matrix) {
        const m = new Matrix()
        m.set(m1.map((v, i) => v + m2[i]))
        return m
    }

    add(m: Matrix) {
        return Matrix.add(this, m)
    }

    static sub(m1: Matrix, m2: Matrix) {
        const m = new Matrix()
        m.set(m1.map((v, i) => v - m2[i]))
        return m
    }

    sub(m: Matrix) {
        return Matrix.sub(this, m)
    }

    setTranslation(x: number, y: number, z: number) {
        this.m14 = x
        this.m24 = y
        this.m34 = z

        return this
    }

    setRotation(angle: number, axis: Vec3) {
        Vec3.normalize(axis)
        const sin = Math.sin(angle)
        const cos = Math.cos(angle)
        const x = axis.x
        const y = axis.y
        const z = axis.z
        const t = 1 - cos
        
        const a00 = t * x * x + cos
        const a01 = t * x * y - sin * z
        const a02 = t * x * z + sin * y
        const a10 = t * x * y + sin * z
        const a11 = t * y * y + cos
        const a12 = t * y * z - sin * x
        const a20 = t * x * z - sin * y
        const a21 = t * y * z + sin * x
        const a22 = t * z * z + cos
        
        this.m11 = a00
        this.m12 = a01
        this.m13 = a02
        this.m21 = a10
        this.m22 = a11
        this.m23 = a12
        this.m31 = a20
        this.m32 = a21
        this.m33 = a22

        return this
    }

    setScale(x: number, y: number, z: number) {
        this.m11 *= x
        this.m22 *= y
        this.m33 *= z

        return this
    }

    setRotationX(angle: number) {
        const sin = Math.sin(angle)
        const cos = Math.cos(angle)
        
        this.m11 = 1
        this.m12 = 0
        this.m13 = 0
        this.m21 = 0
        this.m22 = cos
        this.m23 = sin
        this.m31 = 0
        this.m32 = -sin
        this.m33 = cos

        return this
    }

    setRotationY(angle: number) {
        const sin = Math.sin(angle)
        const cos = Math.cos(angle)
        
        this.m11 = cos
        this.m12 = 0
        this.m13 = -sin
        this.m21 = 0
        this.m22 = 1
        this.m23 = 0
        this.m31 = sin
        this.m32 = 0
        this.m33 = cos

        return this
    }

    setRotationZ(angle: number) {
        const sin = Math.sin(angle)
        const cos = Math.cos(angle)
        
        this.m11 = cos
        this.m12 = sin
        this.m13 = 0
        this.m21 = -sin
        this.m22 = cos
        this.m23 = 0
        this.m31 = 0
        this.m32 = 0
        this.m33 = 1

        return this
    }

    setRotationXYZ(yaw: number, pitch: number, roll: number) {
        const sinYaw = Math.sin(yaw)
        const cosYaw = Math.cos(yaw)
        const sinPitch = Math.sin(pitch)
        const cosPitch = Math.cos(pitch)
        const sinRoll = Math.sin(roll)
        const cosRoll = Math.cos(roll)
        
        this.m11 = cosYaw * cosRoll + sinYaw * sinPitch * sinRoll
        this.m12 = cosYaw * sinRoll - sinYaw * sinPitch * cosRoll
        this.m13 = sinYaw * cosPitch
        this.m21 = sinYaw * cosRoll - cosYaw * sinPitch * sinRoll 
        this.m22 = cosYaw * cosRoll - sinYaw * sinPitch * cosRoll
        this.m23 = cosYaw * sinPitch
        this.m31 = sinYaw * sinRoll + cosYaw * sinPitch * cosRoll
        this.m32 = -sinYaw * cosRoll + cosYaw * sinPitch * sinRoll
        this.m33 = cosYaw * cosPitch

        return this
    }
    
    static translate(mat: Matrix, vec: Vector3) {
        const { x, y, z } = vec
        const m = mat.clone()
        m.m14 = m.m11 * x + m.m21 * y + m.m31 * z + x
        m.m24 = m.m21 * x + m.m22 * y + m.m32 * z + y
        m.m34 = m.m31 * x + m.m32 * y + m.m33 * z + z
        return m
    }

    translate(vec: Vector3) {
        return Matrix.translate(this, vec)
    }

    static transpose(mat: Matrix) {
        return this.from([
            mat.m11, mat.m21, mat.m31, mat.m41,
            mat.m12, mat.m22, mat.m32, mat.m42,
            mat.m13, mat.m23, mat.m33, mat.m43,
            mat.m14, mat.m24, mat.m34, mat.m44
        ])
    }

    transpose() {
        return Matrix.transpose(this)
    }

    static multiply(mat1: Matrix, t: Matrix | Vector4) {
        if (t instanceof Matrix) {
            return this.from([
                mat1.m11 * t.m11 + mat1.m12 * t.m21 + mat1.m13 * t.m31 + mat1.m14 * t.m41,
                mat1.m11 * t.m12 + mat1.m12 * t.m22 + mat1.m13 * t.m32 + mat1.m14 * t.m42,
                mat1.m11 * t.m13 + mat1.m12 * t.m23 + mat1.m13 * t.m33 + mat1.m14 * t.m43,
                mat1.m11 * t.m14 + mat1.m12 * t.m24 + mat1.m13 * t.m34 + mat1.m14 * t.m44,
                
                mat1.m21 * t.m11 + mat1.m22 * t.m21 + mat1.m23 * t.m31 + mat1.m24 * t.m41,
                mat1.m21 * t.m12 + mat1.m22 * t.m22 + mat1.m23 * t.m32 + mat1.m24 * t.m42,
                mat1.m21 * t.m13 + mat1.m22 * t.m23 + mat1.m23 * t.m33 + mat1.m24 * t.m43,
                mat1.m21 * t.m14 + mat1.m22 * t.m24 + mat1.m23 * t.m34 + mat1.m24 * t.m44,
                
                mat1.m31 * t.m11 + mat1.m32 * t.m21 + mat1.m33 * t.m31 + mat1.m34 * t.m41,
                mat1.m31 * t.m12 + mat1.m32 * t.m22 + mat1.m33 * t.m32 + mat1.m34 * t.m42,
                mat1.m31 * t.m13 + mat1.m32 * t.m23 + mat1.m33 * t.m33 + mat1.m34 * t.m43,
                mat1.m31 * t.m14 + mat1.m32 * t.m24 + mat1.m33 * t.m34 + mat1.m34 * t.m44,
                
                mat1.m41 * t.m11 + mat1.m42 * t.m21 + mat1.m43 * t.m31 + mat1.m44 * t.m41,
                mat1.m41 * t.m12 + mat1.m42 * t.m22 + mat1.m43 * t.m32 + mat1.m44 * t.m42,
                mat1.m41 * t.m13 + mat1.m42 * t.m23 + mat1.m43 * t.m33 + mat1.m44 * t.m43,
                mat1.m41 * t.m14 + mat1.m42 * t.m24 + mat1.m43 * t.m34 + mat1.m44 * t.m44
            ])
        }

        return new Vec4([
            mat1.m11 * t.x + mat1.m12 * t.y + mat1.m13 * t.z + mat1.m14 * t.w,
            mat1.m21 * t.x + mat1.m22 * t.y + mat1.m23 * t.z + mat1.m24 * t.w,
            mat1.m31 * t.x + mat1.m32 * t.y + mat1.m33 * t.z + mat1.m34 * t.w,
            mat1.m41 * t.x + mat1.m42 * t.y + mat1.m43 * t.z + mat1.m44 * t.w
        ])
    }

    multiply(t: Matrix | Vector4) {
        return Matrix.multiply(this, t)
    }

    //@ts-ignore
    valueOf() {
        return new ArrayEx(this)
    }

    toString() {
        return `${this.m11.toFixed(2)}\t${this.m12.toFixed(2)}\t${this.m13.toFixed(2)}\t${this.m14.toFixed(2)}\n` +
            `${this.m21.toFixed(2)}\t${this.m22.toFixed(2)}\t${this.m23.toFixed(2)}\t${this.m24.toFixed(2)}\n` +
            `${this.m31.toFixed(2)}\t${this.m32.toFixed(2)}\t${this.m33.toFixed(2)}\t${this.m34.toFixed(2)}\n` +
            `${this.m41.toFixed(2)}\t${this.m42.toFixed(2)}\t${this.m43.toFixed(2)}\t${this.m44.toFixed(2)}\n`

    }

    static perspective(fov: number, aspect: number, near: number, far: number) {
        const tan = Math.tan(fov / 2)
        const r = tan * aspect
        return Matrix.from([
            near / r, 0, 0, 0,
            0, 1 / tan, 0, 0,
            0, 0, -(near + far) / (far - near), -2 * far * near / (far - near),
            0, 0, -1, 0
        ])
    }

    static orthographic(right: number, top: number, near: number, far: number) {
        return Matrix.from([
            1 / right, 0, 0, 0,
            0, 1 / top, 0, 0,
            0, 0, -2 / (far - near), - (far + near) / (far - near),
            0, 0, 0, 1  
        ])
    }

    static lookAt(eye: Vector3, target: Vector3, up: Vector3) {
        const look = Vec3.sub(target, eye)
        look.n()

        const right = Vec3.cross(up, look)
        right.n()

        const newUp = Vec3.cross(look, right)
        newUp.n()

        return Matrix.from([
            right.x, right.y, right.z, -Vec3.dot(right, eye),
            newUp.x, newUp.y, newUp.z, -Vec3.dot(newUp, eye),
            look.x, look.y, look.z, -Vec3.dot(look, eye),
            0, 0, 0, 1  
        ])
    }
}
