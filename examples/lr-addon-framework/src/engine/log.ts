// ===== L-R framework :: engine/log.ts =====
export function makeLogger(scope: string) {
    let on = false;
    return {
        setRuntime(on: boolean) { on = !!on; },
        isRuntime() { return on; },
        info(...args: unknown[]) { if (on) console.warn(`[${scope}][rt] ` + args.map((a) => typeof a === "string" ? a : JSON.stringify(a)).join(" ")); },
        log(...args: unknown[]) { console.warn(`[${scope}][evt] ` + args.map((a) => typeof a === "string" ? a : JSON.stringify(a)).join(" ")); },
        err(ctx: string, e: unknown) { console.warn(`[${scope}][err] ${ctx}: ${e && ((e as { message?: string }).message || String(e)) || e}`); },
    };
}
export type Logger = ReturnType<typeof makeLogger>;