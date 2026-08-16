// 引擎层 R — 诊断：段描述 / 全局转储（写 ContentLog + 聊天）
import { world, Block } from "@minecraft/server";
import { segments, tanks, pumps, pipeSeg } from "./state.js";
import { blockKey, keyParts } from "./world.js";
import { TANK_MAX } from "../core/potential.js";

export function describeSegmentAt(pipeBlock: Block): string | null {
    const key = blockKey(pipeBlock);
    const sid = pipeSeg.get(key);
    if (sid == null) return null;
    const seg = segments.get(sid);
    if (!seg) return null;
    const ends = seg.ends.map((e) => `${e.face}:${e.kind}${e.deviceKey ? "#" + e.deviceKey.split(":")[0] : ""}`).join(",");
    const hiPot = seg.hi ? (seg.pot.get(seg.hi.pipeKey) ?? -1) : -1;
    return `seg=${seg.id} front=${seg.front.toFixed(1)}/${seg.len} hi=${seg.hi ? seg.hi.kind : "-"} hiPot=${hiPot.toFixed(2)} ends=[${ends}]`;
}

export function dumpFluid(loc: { x: number; y: number; z: number } | null, radius: number | null) {
    const r = (radius && radius > 0) ? radius : 20;
    let out: string[] = [];
    for (const seg of segments.values()) {
        const near = loc ? seg.pipes.some((k) => {
            const p = keyParts(k);
            return p && Math.abs(p.x - loc.x) <= r && Math.abs(p.y - loc.y) <= r && Math.abs(p.z - loc.z) <= r;
        }) : true;
        if (!near) continue;
        const ends = seg.ends.map((e) => `${e.face}:${e.kind}${e.deviceKey ? "#" + e.deviceKey.split(":")[0] : ""}`).join(",");
        const hiPot = seg.hi ? (seg.pot.get(seg.hi.pipeKey) ?? -1) : -1;
        out.push(`seg=${seg.id} front=${seg.front.toFixed(1)}/${seg.len} hi=${seg.hi ? seg.hi.kind : "-"} hiPot=${hiPot.toFixed(2)} pipes=${seg.pipes.length} ends=[${ends}]`);
    }
    for (const [k, t] of tanks) out.push(`tank ${k} level=${t.level}/${TANK_MAX}`);
    for (const [k, p] of pumps) out.push(`pump ${k} on=${p.on}`);
    const msg = out.join("\n") || "(empty)";
    world.sendMessage(`[fluid_dump] ${msg.split("\n").length} lines, 详见日志`);
    console.warn(`[fluid_dump]\n${msg}`);
}