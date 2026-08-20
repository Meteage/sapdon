// 引擎层 R — 诊断：段描述 / 全局转储（写 ContentLog + 聊天）
import { world, Block } from "@minecraft/server";
import { segments, wireSeg, generators, batteries, furnaces, solars, relays } from "./state.js";
import { blockKey, keyParts } from "./world.js";

export function describeSegmentAt(wireBlock: Block): string | null {
    const key = blockKey(wireBlock);
    const sid = wireSeg.get(key);
    if (sid == null) return null;
    const seg = segments.get(sid);
    if (!seg) return null;
    const ends = seg.ends.map((e) => `${e.face}:${e.kind}${e.deviceKey ? "#" + e.deviceKey : ""}`).join(",");
    return `seg=${seg.id} wires=${seg.pipes.length} powered=${seg.powered} ends=[${ends}]`;
}

export function dumpGrid(loc: { x: number; y: number; z: number } | null, radius: number | null) {
    const r = (radius && radius > 0) ? radius : 20;
    const out: string[] = [];
    for (const seg of segments.values()) {
        const near = loc ? seg.pipes.some((k) => {
            const p = keyParts(k);
            return p && Math.abs(p.x - loc.x) <= r && Math.abs(p.y - loc.y) <= r && Math.abs(p.z - loc.z) <= r;
        }) : true;
        if (!near) continue;
        const ends = seg.ends.map((e) => `${e.face}:${e.kind}${e.deviceKey ? "#" + e.deviceKey : ""}`).join(",");
        out.push(`seg=${seg.id} wires=${seg.pipes.length} powered=${seg.powered} ends=[${ends}]`);
    }
    for (const [k, g] of generators) out.push(`gen ${k} burn=${g.burnTicks.toFixed(1)}`);
    for (const [k, b] of batteries) out.push(`batt ${k} level=${b.level.toFixed(1)}`);
    for (const [k, f] of furnaces) out.push(`furn ${k} progress=${f.progress.toFixed(1)}`);
    for (const [k] of solars) out.push(`solar ${k}`);
    for (const [k, r] of relays) out.push(`relay ${k} open=${r.open}`);
    const msg = out.join("\n") || "(empty)";
    world.sendMessage(`[power_dump] ${msg.split("\n").length} lines, 详见日志`);
    console.warn(`[power_dump]\n${msg}`);
}