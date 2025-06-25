import { Vec3 } from './vec/vec3.js'
import { Vec4 } from './vec/vec4.js'

export * from './mat/mat4.js'
export * from './vec/vec3.js'
export * from './vec/vec4.js'

export namespace MathExt {
    export function clamp(val: number, min: number, max: number) {
        return Math.min(Math.max(val, min), max)
    }

    export function lerp(a: number, b: number, scalar: number) {
        return a + (b - a) * scalar
    }

    export function lerpVec3(a: Vec3, b: Vec3, scalar: number) {
        return Vec3.fromXYZ(
            lerp(a.x, b.x, scalar),
            lerp(a.y, b.y, scalar),
            lerp(a.z, b.z, scalar)
        )
    }

    export function lerpVec4(a: Vec4, b: Vec4, scalar: number) {
        return Vec4.fromXYZW(
            lerp(a.x, b.x, scalar),
            lerp(a.y, b.y, scalar),
            lerp(a.z, b.z, scalar),
            lerp(a.w, b.w, scalar)
        )
    }
}