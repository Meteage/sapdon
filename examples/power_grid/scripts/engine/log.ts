// 引擎层 R — 运行期诊断日志（写 ContentLog）
let RUNTIME_LOG = false;
export function setRuntimeLog(on: boolean) { RUNTIME_LOG = !!on; }
export function isRuntimeLog() { return RUNTIME_LOG; }

export function rlog(...args: unknown[]) {
    if (!RUNTIME_LOG) return;
    console.warn("[power][rt] " + args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
}

export function logErr(ctx: string, e: unknown) {
    console.warn(`[power][err] ${ctx}: ${e && ((e as { message?: string }).message || String(e)) || e}`);
}