// 引擎层 R — 运行时诊断日志（写 ContentLog）
let runtimeLog = false;

export function setRuntimeLog(enable: boolean) { runtimeLog = enable; }

export function isRuntimeLog() { return runtimeLog; }

export function rlog(msg: string) { if (runtimeLog) console.warn(`[rt] ${msg}`); }

export function logErr(where: string, e: unknown) {
    console.warn(`[fluid][err] ${where}: ${e && ((e as any).message || String(e)) || e}`);
}