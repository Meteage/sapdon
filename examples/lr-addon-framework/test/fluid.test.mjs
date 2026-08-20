// fluid-settle 镜像测试（与 scripts/framework/core/fluid-settle.ts + network.ts 语义一致）
// 运行: node --test test/fluid.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

const TANK_MAX = 32, TANK_RATE = 1, EPS = 0.001;

function settleFluid(inp) {
  const { pumps = {}, tanks = {}, valves = {}, deviceSegs = {}, endsBySeg = {}, dt = 1, segPowered = () => {} } = inp;
  const parent = new Map(); const all = [...new Set(Object.values(deviceSegs).flat())];
  for (const s of all) parent.set(s, s);
  const find = (x) => { let r = x; while (parent.get(r) !== r) r = parent.get(r); while (parent.get(x) !== x) { const n = parent.get(x); parent.set(x, r); x = n; } return r; };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(rb, ra); };
  for (const [dev, ids] of Object.entries(deviceSegs)) {
    if (ids.length < 2) continue;
    const open = valves[dev] !== undefined ? !!valves[dev].open : true;
    if (!open) continue;
    for (let i = 1; i < ids.length; i++) union(ids[0], ids[i]);
  }
  const grids = {};
  for (const [dev, ids] of Object.entries(deviceSegs)) for (const s of ids) {
    const r = find(s); (grids[r] || (grids[r] = new Set())).add(s);
  }
  const out = {};
  for (const segs of Object.values(grids)) {
    let pumpOut = false, openEnd = false; const tankEnds = [];
    for (const sid of segs) {
      for (const e of endsBySeg[sid] || []) {
        if (e.kind === 'pumpOut' && e.deviceKey && pumps[e.deviceKey]?.on) pumpOut = true;
        else if (e.kind === 'tank' && e.deviceKey) tankEnds.push(e.deviceKey);
        else if (e.kind === 'open') openEnd = true;
      }
    }
    const tankCanAbsorb = tankEnds.some((k) => (tanks[k]?.level ?? TANK_MAX) < TANK_MAX - EPS);
    const flowing = pumpOut && (tankCanAbsorb || openEnd);
    for (const sid of segs) { out[sid] = flowing; segPowered(sid, flowing); }
    if (flowing) for (const k of tankEnds) { const t = tanks[k]; if (t && t.level < TANK_MAX) t.level = Math.min(TANK_MAX, t.level + TANK_RATE * dt); }
  }
  return { out, tanks };
}

test('泵+罐：流动且罐吸水', () => {
  const tanks = { tk: { level: 0 } };
  const endsBySeg = { s1: [ { kind: 'pumpOut', deviceKey: 'p' }, { kind: 'tank', deviceKey: 'tk' } ] };
  const r = settleFluid({ pumps: { p: { on: true } }, tanks, deviceSegs: { p: ['s1'], tk: ['s1'] }, endsBySeg, dt: 1 });
  assert.equal(r.out.s1, true);
  assert.equal(r.tanks.tk.level, 1); // 每秒吸 1 格
});
test('泵停：不流动', () => {
  const r = settleFluid({ pumps: { p: { on: false } }, tanks: { tk: { level: 0 } }, deviceSegs: { p: ['s1'], tk: ['s1'] }, endsBySeg: { s1: [{ kind: 'pumpOut', deviceKey: 'p' }, { kind: 'tank', deviceKey: 'tk' }] }, dt: 1 });
  assert.equal(r.out.s1, false);
});
test('无罐有泵但空气开放：流动不储液', () => {
  const r = settleFluid({ pumps: { p: { on: true } }, deviceSegs: { p: ['s1'] }, endsBySeg: { s1: [{ kind: 'pumpOut', deviceKey: 'p' }, { kind: 'open' }] }, dt: 1 });
  assert.equal(r.out.s1, true);
});
test('罐满停吸：不再吸水但仍流动（有空气汇）或停', () => {
  const tanks = { tk: { level: TANK_MAX } };
  const r = settleFluid({ pumps: { p: { on: true } }, tanks, deviceSegs: { p: ['s1'], tk: ['s1'] }, endsBySeg: { s1: [{ kind: 'pumpOut', deviceKey: 'p' }, { kind: 'tank', deviceKey: 'tk' }] }, dt: 1 });
  // 罐满且无空气汇 → 无吸收目标 → 不流动（静止）
  assert.equal(r.out.s1, false);
});
test('阀门开合并管网 / 关分隔', () => {
  const endsA = { sA: [{ kind: 'pumpOut', deviceKey: 'p' }], sB: [{ kind: 'tank', deviceKey: 'tk' }] };
  const ds = { p: ['sA'], v: ['sA', 'sB'], tk: ['sB'] };
  const open = settleFluid({ pumps: { p: { on: true } }, valves: { v: { open: true } }, tanks: { tk: { level: 0 } }, deviceSegs: ds, endsBySeg: endsA, dt: 1 });
  assert.equal(open.out.sB, true); // 经开阀连通 → 罐吸水
  const closed = settleFluid({ pumps: { p: { on: true } }, valves: { v: { open: false } }, tanks: { tk: { level: 0 } }, deviceSegs: ds, endsBySeg: endsA, dt: 1 });
  assert.equal(closed.out.sB, false);
});