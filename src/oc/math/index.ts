import { Vec3 } from './vec/vec3.js'
import { Vec4 } from './vec/vec4.js'

export * from './mat/mat4.js'
export * from './vec/vec3.js'
export * from './vec/vec4.js'

export namespace MathExt {
    export function clamp(val: number, min: number, max: number) {
        return Math.min(Math.max(val, min), max)
    }

    export function lerps(a: number, b: number, scalar: number) {
        return a + (b - a) * scalar
    }

    export function lerpVec3(a: Vec3, b: Vec3, scalar: number) {
        return Vec3.fromXYZ(
            lerps(a.x, b.x, scalar),
            lerps(a.y, b.y, scalar),
            lerps(a.z, b.z, scalar)
        )
    }

    export function lerpVec4(a: Vec4, b: Vec4, scalar: number) {
        return Vec4.fromXYZW(
            lerps(a.x, b.x, scalar),
            lerps(a.y, b.y, scalar),
            lerps(a.z, b.z, scalar),
            lerps(a.w, b.w, scalar)
        )
    }

    export function lerp(a: number, b: number, scalar: number): number
    export function lerp(a: Vec3, b: Vec3, scalar: number): Vec3
    export function lerp(a: Vec4, b: Vec4, scalar: number): Vec4
    export function lerp(a: any, b: any, scalar: number) {
        if (typeof a === 'number') {
            return lerps(a, b, scalar)
        }

        if ('w' in a) {
            return lerpVec4(a, b, scalar)
        }

        return lerpVec3(a, b, scalar)
    }
}