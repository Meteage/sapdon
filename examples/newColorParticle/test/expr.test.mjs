// newColorParticle 数学表达式 DSL 单测
// 运行：node --experimental-strip-types test/expr.test.mjs
// 直接 import 源码 scripts/expr.ts（纯计算、无 mc 依赖），保持单一事实来源。
import { compileMath } from "../scripts/expr.ts";

let pass = 0;
let fail = 0;

function approx(a, b, eps = 1e-6) {
    return Math.abs(a - b) < eps;
}

function assert(cond, name) {
    if (cond) { pass++; }
    else { fail++; console.log(`  [FAIL] ${name}`); }
}

function evalPos(program, ctx = { t: 0, i: 0, n: 1, r: 1 }) {
    const prog = compileMath(program);
    const r = prog.eval(ctx);
    return [r.x, r.y, r.z];
}

// ---- 基础四则 ----
assert(evalPos("x=1+2;y=0;z=0")[0] === 3, "加法 x=1+2");
assert(evalPos("x=7-3;y=0;z=0")[0] === 4, "减法 x=7-3");
assert(evalPos("x=6*7;y=0;z=0")[0] === 42, "乘法 x=6*7");
assert(evalPos("x=10/4;y=0;z=0")[0] === 2.5, "除法 x=10/4");
assert(evalPos("x=10%3;y=0;z=0")[0] === 1, "取余 x=10%3");
assert(evalPos("x=2^10;y=0;z=0")[0] === 1024, "幂 x=2^10 (右结合)");
assert(evalPos("x=2^3^2;y=0;z=0")[0] === 512, "幂右结合 2^3^2=512");
assert(evalPos("x=(1+2)*4;y=0;z=0")[0] === 12, "括号 (1+2)*4");

// ---- 一元负号与优先级 ----
assert(evalPos("x=-3+1;y=0;z=0")[0] === -2, "一元负号 -3+1=-2");
assert(evalPos("x=-2^2;y=0;z=0")[0] === -4, "-2^2 = -(2^2) = -4");
assert(evalPos("x=2^-2;y=0;z=0")[0] === 0.25, "2^-2 = 0.25");

// ---- 隐式乘 ----
assert(evalPos("x=2PI;y=0;z=0")[0] === 2 * Math.PI, "隐式乘 2PI");
assert(evalPos("x=3t;y=0;z=0", { t: 2 }) [0] === 6, "隐式乘 3t");
assert(evalPos("x=2(3+1);y=0;z=0")[0] === 8, "隐式乘 2(3+1)");
const groupMult = evalPos("a=(1)(2);x=a;y=0;z=0", {});
assert(groupMult[0] === 2, "隐式乘 (1)(2)=2");

// ---- 函数与常量 ----
assert(evalPos("x=sin(PI/2);y=0;z=0")[0] === 1, "sin(PI/2)=1");
assert(evalPos("x=cos(0);y=0;z=0")[0] === 1, "cos(0)=1");
assert(evalPos("x=floor(3.7);y=0;z=0")[0] === 3, "floor(3.7)=3");
assert(evalPos("x=ceil(3.2);y=0;z=0")[0] === 4, "ceil(3.2)=4");
assert(evalPos("x=round(3.5);y=0;z=0")[0] === 4, "round(3.5)=4");
assert(evalPos("x=abs(-5);y=0;z=0")[0] === 5, "abs(-5)=5");
assert(evalPos("x=sqrt(16);y=0;z=0")[0] === 4, "sqrt(16)=4");
assert(evalPos("x=pow(2,5);y=0;z=0")[0] === 32, "pow(2,5)=32");
assert(evalPos("x=min(3,7);y=0;z=0")[0] === 3, "min(3,7)=3");
assert(evalPos("x=max(3,7);y=0;z=0")[0] === 7, "max(3,7)=7");
assert(evalPos("x=mod(-1,3);y=0;z=0")[0] === 2, "mod(-1,3)=2 (正余数)");
assert(evalPos("x=clamp(5,0,1);y=0;z=0")[0] === 1, "clamp(5,0,1)=1");
assert(evalPos("x=sign(-8);y=0;z=0")[0] === -1, "sign(-8)=-1");
assert(evalPos("x=exp(0);y=0;z=0")[0] === 1, "exp(0)=1");
assert(evalPos("x=log(1);y=0;z=0")[0] === 0, "log(1)=0");
assert(evalPos("x=atan2(1,1);y=0;z=0")[0] === Math.PI / 4, "atan2(1,1)=π/4");

// ---- 变量与赋值链 ----
assert(evalPos("a=5;b=a*2;x=b+1;y=0;z=0")[0] === 11, "赋值链 a→b→x");
const double = evalPos("a=2;a=a*a;x=a;y=0;z=0");
assert(double[0] === 4, "变量自更新 a=a*a=4");
const ctxVar = evalPos("x=t*t;y=0;z=0", { t: 0.5 });
assert(ctxVar[0] === 0.25, "自变量 t 使用 x=t*t");
const radiusVar = evalPos("x=r;y=0;z=0", { t: 0, i: 0, n: 1, r: 3 });
assert(radiusVar[0] === 3, "半径常量 r 使用");
const idxVar = evalPos("x=i;y=0;z=0", { t: 0, i: 7, n: 10, r: 1 });
assert(idxVar[0] === 7, "自变量 i 使用");

// ---- 三维输出与颜色输出 ----
const polar = compileMath("x=sin(t)*r;y=cos(t)*r;z=0;red=0.5;green=0.2;blue=0.9");
const pr = polar.eval({ t: 0, i: 0, n: 1, r: 2 });
assert(polar.hasColor(), "含颜色输出");
assert(approx(pr.x, 0) && approx(pr.y, 2), "xyz 位置输出");

// ---- 错误处理 ----
function throws(fn) { try { fn(); return false; } catch { return true; } }
assert(throws(() => evalPos("x=q;y=0;z=0")), "未定义的变量 q 求值报错");
assert(throws(() => evalPos("x=unknownFn(1);y=0;z=0")), "未知标识符求值报错");
assert(throws(() => compileMath("x==")), "缺操作数报错");
assert(throws(() => compileMath("x=(1+2")), "缺右括号报错");
assert(throws(() => compileMath("t=3")), "给内置量 t 赋值报错");
assert(throws(() => compileMath("")), "空表达式报错");
assert(throws(() => compileMath("a=1;x=2+")), "尾随运算符报错");

// ---- 除零/取余零不抛错 ----
assert(evalPos("x=1/0;y=0;z=0")[0] === 0, "除零安全返回 0");

console.log(`\nexpr.test.mjs: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);