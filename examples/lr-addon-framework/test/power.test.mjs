// power-settle 镜像测试（与 src/core/power-settle.ts + network.ts 语义一致）
// 运行: node --test test/power.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

const GEN_OUTPUT = 40, SOLAR_OUTPUT = 10, FURNACE_DRAW = 30, BATTERY_MAX = 1000, CHARGE_RATE = 60, DISCHARGE_RATE = 60, EPS = 0.001;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

function settlePower(inp) {
  const { gens = {}, bats = {}, relays = {}, furnaceHasInput = {}, solarKeys = new Set(), deviceSegs = {}, sunlight = 0, dt = 1, segPowered = () => {} } = inp;
  const parent = new Map(); const all = [...new Set(Object.values(deviceSegs).flat())];
  for (const s of all) parent.set(s, s);
  const find = (x) => { let r = x; while (parent.get(r) !== r) r = parent.get(r); while (parent.get(x) !== x) { const n = parent.get(x); parent.set(x, r); x = n; } return r; };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(rb, ra); };
  for (const [dev, ids] of Object.entries(deviceSegs)) {
    if (ids.length < 2) continue;
    const couple = relays[dev] !== undefined ? !!relays[dev].open : true;
    if (!couple) continue;
    for (let i = 1; i < ids.length; i++) union(ids[0], ids[i]);
  }
  const agg = {};
  const getAgg = (r) => (agg[r] || (agg[r] = { segs: new Set(), gens: [], bats: [], furnace: 0, solar: 0 }));
  for (const [dev, ids] of Object.entries(deviceSegs)) {
    if (!ids.length) continue;
    const a = getAgg(find(ids[0])); ids.forEach((s) => a.segs.add(s));
    if (gens[dev] !== undefined) a.gens.push(gens[dev]);
    else if (bats[dev] !== undefined) a.bats.push(bats[dev]);
    else if (furnaceHasInput[dev] !== undefined) { if (furnaceHasInput[dev] !== false) a.furnace++; }
    else if (solarKeys.has(dev)) a.solar++;
  }
  const out = {};
  for (const a of Object.values(agg)) {
    let gen = 0;
    for (const g of a.gens) { g.burnTicks -= dt; if (g.burnTicks < 0) g.burnTicks = 0; if (g.burnTicks > 0) gen += GEN_OUTPUT; }
    gen += a.solar * SOLAR_OUTPUT * clamp01(sunlight);
    const load = a.furnace * FURNACE_DRAW;
    const energized = gen > EPS || a.bats.some((b) => b.level > EPS);
    let powered;
    if (!energized) powered = false;
    else if (gen >= load - EPS) { let surplus = gen - load; powered = true; for (const b of a.bats) { const add = Math.min(CHARGE_RATE, surplus); if (add > 0) { b.level = Math.min(BATTERY_MAX, b.level + add); surplus -= add; } } }
    else { const deficit = load - gen; let rem = deficit; for (const b of a.bats) { const give = Math.min(rem, DISCHARGE_RATE, b.level); b.level -= give; rem -= give; } powered = rem <= EPS; }
    a.segs.forEach((s) => { out[s] = powered; segPowered(s, powered); });
  }
  return { out, gens, bats };
}

test('发电机供能熔炉', () => {
  const r = settlePower({ gens: { g1: { burnTicks: 10 } }, furnaceHasInput: { f1: true }, deviceSegs: { g1: ['s1'], f1: ['s1'] }, dt: 1 });
  assert.equal(r.out.s1, true);
  assert.equal(r.gens.g1.burnTicks, 9);
});
test('盈余充电 + 封顶', () => {
  const r = settlePower({ gens: { g1: { burnTicks: 99 } }, bats: { b1: { level: 0 } }, deviceSegs: { g1: ['s1'], b1: ['s1'] }, dt: 1 });
  assert.equal(r.out.s1, true);
  assert.equal(r.bats.b1.level, 40); // 无负荷 → 全充
});
test('无源无负荷不激活（避免 0>=0 空真）', () => {
  const r = settlePower({ deviceSegs: { w1: ['s1'] } });
  assert.equal(r.out.s1, false);
});
test('空炉不算负荷', () => {
  const r1 = settlePower({ gens: { g1: { burnTicks: 99 } }, bats: { b1: { level: 0 } }, furnaceHasInput: { f1: false }, deviceSegs: { g1: ['s1'], b1: ['s1'], f1: ['s1'] }, dt: 1 });
  assert.equal(r1.bats.b1.level, 40); // 空炉不耗电，全充
  const r2 = settlePower({ gens: { g1: { burnTicks: 99 } }, bats: { b1: { level: 0 } }, furnaceHasInput: { f1: true }, deviceSegs: { g1: ['s1'], b1: ['s1'], f1: ['s1'] }, dt: 1 });
  assert.equal(r2.bats.b1.level, 10); // 有料扣 30
});
test('电池放电补缺 / 不足断电', () => {
  const r = settlePower({ bats: { b1: { level: 100 } }, furnaceHasInput: { f1: true }, deviceSegs: { b1: ['s1'], f1: ['s1'] }, dt: 1 });
  assert.equal(r.out.s1, true);
  assert.equal(r.bats.b1.level, 70);
  const r2 = settlePower({ bats: { b1: { level: 10 } }, furnaceHasInput: { f1: true }, deviceSegs: { b1: ['s1'], f1: ['s1'] }, dt: 1 });
  assert.equal(r2.out.s1, false);
});
test('继电器关断分隔', () => {
  const ds = { g1: ['sA'], r1: ['sA', 'sB'], f1: ['sB'] };
  const rOpen = settlePower({ gens: { g1: { burnTicks: 10 } }, relays: { r1: { open: true } }, furnaceHasInput: { f1: true }, deviceSegs: ds, dt: 1 });
  assert.equal(rOpen.out.sA, true);
  assert.equal(rOpen.out.sB, true);
  const rClosed = settlePower({ gens: { g1: { burnTicks: 10 } }, relays: { r1: { open: false } }, furnaceHasInput: { f1: true }, deviceSegs: ds, dt: 1 });
  assert.equal(rClosed.out.sA, true);
  assert.equal(rClosed.out.sB, false); // 被隔开且无源 → 不激活
});
test('太阳能昼夜', () => {
  const day = settlePower({ solarKeys: new Set(['s']), bats: { b1: { level: 50 } }, furnaceHasInput: { f1: true }, deviceSegs: { s: ['s1'], b1: ['s1'], f1: ['s1'] }, sunlight: 1, dt: 1 });
  assert.equal(day.out.s1, true);
  const night = settlePower({ solarKeys: new Set(['s']), furnaceHasInput: { f1: true }, deviceSegs: { s: ['s1'], f1: ['s1'] }, sunlight: 0, dt: 1 });
  assert.equal(night.out.s1, false);
});