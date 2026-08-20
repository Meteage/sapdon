// power_grid 引擎核心逻辑测试（镜像副本）
// 对应 scripts/core/settle.ts（纯逻辑，Node 可直接镜像）；改核心逻辑必须同步本副本。
// 运行: node --test test/power.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';

const GEN_OUTPUT = 40;
const SOLAR_OUTPUT = 10;
const FURNACE_DRAW = 30;
const BATTERY_MAX = 1000;
const CHARGE_RATE = 60;
const DISCHARGE_RATE = 60;
const EPS = 0.001;

function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

// 电网结算镜像（与 scripts/core/settle.ts 语义一致）
// input: { generators, batteries, furnaces, solars, relays, deviceSegs, sunlight, dt }
//   maps 用普通对象；deviceSegs: { devKey: [segId,...] }
// 返回 { result: {segId->powered}, generators, batteries }
function settle(input) {
  const { generators = {}, batteries = {}, furnaces = {}, solars = {}, relays = {}, deviceSegs = {}, sunlight = 0, dt = 1 } = input;
  const parent = new Map();
  const segs = [...new Set(Object.values(deviceSegs).flat())];
  for (const s of segs) parent.set(s, s);
  const find = (x) => { let r = x; while (parent.get(r) !== r) r = parent.get(r); while (parent.get(x) !== x) { const n = parent.get(x); parent.set(x, r); x = n; } return r; };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(rb, ra); };

  for (const [dev, sids] of Object.entries(deviceSegs)) {
    if (sids.length < 2) continue;
    if (relays[dev] !== undefined && !relays[dev].open) continue; // 关继电器=屏障
    for (let i = 1; i < sids.length; i++) union(sids[0], sids[i]);
  }

  const agg = {};
  const getAgg = (r) => (agg[r] || (agg[r] = { segs: new Set(), gens: [], bats: [], furnaces: 0, solars: 0 }));
  for (const [dev, sids] of Object.entries(deviceSegs)) {
    if (relays[dev] !== undefined) {
      if (!relays[dev].open) continue;
      const a = getAgg(find(sids[0]));
      sids.forEach((s) => a.segs.add(s));
      continue;
    }
    const a = getAgg(find(sids[0]));
    sids.forEach((s) => a.segs.add(s));
    if (generators[dev] !== undefined) a.gens.push(generators[dev]);
    else if (batteries[dev] !== undefined) a.bats.push(batteries[dev]);
    else if (furnaces[dev] !== undefined && furnaces[dev].hasInput !== false) a.furnaces++;
    else if (solars[dev] !== undefined) a.solars++;
  }

  const result = {};
  for (const a of Object.values(agg)) {
    let gen = 0;
    for (const g of a.gens) { g.burnTicks -= dt; if (g.burnTicks < 0) g.burnTicks = 0; if (g.burnTicks > 0) gen += GEN_OUTPUT; }
    gen += a.solars * SOLAR_OUTPUT * clamp01(sunlight);
    const load = a.furnaces * FURNACE_DRAW;
    // 无可用能源（无发电、电池全空）→ 不激活（避免无源线段 0>=0 空真“有电”）
    const energized = gen > EPS || a.bats.some((b) => b.level > EPS);
    let powered;
    if (!energized) {
      powered = false;
    } else if (gen >= load - EPS) {
      let surplus = gen - load;
      powered = true;
      for (const b of a.bats) { const add = Math.min(CHARGE_RATE, surplus); if (add > 0) { b.level = Math.min(BATTERY_MAX, b.level + add); surplus -= add; } }
    } else {
      const deficit = load - gen;
      let remaining = deficit;
      for (const b of a.bats) { const give = Math.min(remaining, DISCHARGE_RATE, b.level); b.level -= give; remaining -= give; }
      powered = remaining <= EPS;
    }
    a.segs.forEach((s) => { result[s] = powered; });
  }
  return { result, generators, batteries };
}

// 发电机满负荷覆盖熔炉
test('发电机供能熔炉（gen>=load）', () => {
  const generators = { g1: { burnTicks: 10 } };
  const furnaces = { f1: {} };
  const ds = { g1: ['s1'], f1: ['s1'] };
  const { result, generators: g } = settle({ generators, furnaces, deviceSegs: ds, dt: 1 });
  assert.equal(result.s1, true);
  assert.equal(g.g1.burnTicks, 9); // 燃烧时间递减
});

// 盈余给电池充电（受 surplus 与 chargeRate 限制）
test('盈余充电：电池 level 增加且封顶 MAX', () => {
  const generators = { g1: { burnTicks: 10 } };
  const batteries = { b1: { level: 0 } };
  const furnaces = { f1: {} };
  const ds = { g1: ['s1'], b1: ['s1'], f1: ['s1'] };
  // surge = 40-30 = 10/tick（< CHARGE_RATE 60）
  let { result, batteries: b } = settle({ generators, batteries, furnaces, deviceSegs: ds, dt: 1 });
  assert.equal(result.s1, true);
  assert.equal(b.b1.level, 10);
  // 大富余：多块太阳能，充电按 chargeRate 60
  const generators2 = { g1: { burnTicks: 999 } };
  const solars = { s: {} };
  const batteries2 = { b1: { level: 990 } };
  const ds2 = { g1: ['s1'], s: ['s1'], b1: ['s1'] };
  let r = settle({ generators: generators2, solars, batteries: batteries2, deviceSegs: ds2, dt: 1, sunlight: 1 });
  assert.equal(r.result.s1, true);
  // gen=40+10, load=0 → surplus50 → charge min(60,50)=50 → 1040 -> cap 1000
  // 但 level 990→ min(1000, 990+50)=1000
  assert.equal(r.batteries.b1.level, 1000);
});

// 无发电机+空电池 → 断电（褐灯）
test('无源无储能 → 断电', () => {
  const batteries = { b1: { level: 0 } };
  const furnaces = { f1: {} };
  const ds = { b1: ['s1'], f1: ['s1'] };
  const { result } = settle({ batteries, furnaces, deviceSegs: ds, dt: 1 });
  assert.equal(result.s1, false);
});

// 电池补缺（放电到 0，先补发电缺口）
test('电池放电补缺 → 通电', () => {
  const batteries = { b1: { level: 100 } };
  const furnaces = { f1: {} }; // load 30, gen0
  const ds = { b1: ['s1'], f1: ['s1'] };
  const { result, batteries: b } = settle({ batteries, furnaces, deviceSegs: ds, dt: 1 });
  assert.equal(result.s1, true);
  assert.equal(b.b1.level, 70);
});

// 电池不足 → 断电（放电到 0 仍缺）
test('电池不足 → 断电', () => {
  const batteries = { b1: { level: 10 } };
  const furnaces = { f1: {} };
  const ds = { b1: ['s1'], f1: ['s1'] };
  const { result, batteries: b } = settle({ batteries, furnaces, deviceSegs: ds, dt: 1 });
  assert.equal(result.s1, false);
  assert.equal(b.b1.level, 0);
});

// 太阳能：白天供电，夜放电（有电池）
test('太阳能昼夜切换', () => {
  const solars = { s: {} };
  const furnaces = { f1: {} };
  const ds = { s: ['s1'], f1: ['s1'] };
  // 夜：gen0 < load30，无电池 → 断电
  let night = settle({ solars, furnaces, deviceSegs: ds, dt: 1, sunlight: 0 });
  assert.equal(night.result.s1, false);
  // 昼：gen=10 < 30，有电池补
  const batteries = { b1: { level: 50 } };
  const ds2 = { s: ['s1'], f1: ['s1'], b1: ['s1'] };
  let day = settle({ solars, batteries, furnaces, deviceSegs: ds2, dt: 1, sunlight: 1 });
  assert.equal(day.result.s1, true);
  assert.equal(day.batteries.b1.level, 30); // gen=10 < load30，缺口 20：放电补 20 → 50-20=30
});

// 两个独立段互不影响
test('两独立段互不影响', () => {
  const generators = { g1: { burnTicks: 10 } };
  const furnaces = { f1: {} };
  const ds = { g1: ['sA'], f1: ['sB'] };
  const { result } = settle({ generators, furnaces, deviceSegs: ds, dt: 1 });
  assert.equal(result.sA, true);  // 发电无负载
  assert.equal(result.sB, false); // 熔炉无源
});

// 继电器：开=合并成同一电网，关=分隔
test('继电器开合并 / 关分隔', () => {
  const generators = { g1: { burnTicks: 10 } };
  const furnaces = { f1: {} };
  const relays = { r1: { open: true } };
  const ds = { g1: ['sA'], r1: ['sA', 'sB'], f1: ['sB'] };
  // 开：sA 与 sB 通过继电器并成同网 → 熔炉被供电
  let open = settle({ generators, furnaces, relays, deviceSegs: ds, dt: 1 });
  assert.equal(open.result.sA, true);
  assert.equal(open.result.sB, true);
  // 关：分隔 → sA 有电，sB 无源断电
  relays.r1.open = false;
  let closed = settle({ generators, furnaces, relays: { ...relays }, deviceSegs: ds, dt: 1 });
  assert.equal(closed.result.sA, true);
  assert.equal(closed.result.sB, false);
});

// 发电机燃料耗尽 → 停机断电
test('发电机耗尽停机', () => {
  const generators = { g1: { burnTicks: 0.5 } };
  const furnaces = { f1: {} };
  const ds = { g1: ['s1'], f1: ['s1'] };
  // 0.5s 燃料，一步 dt=1 即耗尽 → gen0 < load30 无电池 → 断电
  const { result, generators: g } = settle({ generators, furnaces, deviceSegs: ds, dt: 1 });
  assert.equal(g.g1.burnTicks, 0);
  assert.equal(result.s1, false);
});

// 无源无负荷的孤立线段 → 不激活（避免 0>=0 空真“有电”）
test('无源无负荷线段不激活', () => {
  const ds = { w1: ['s1'] };
  const r = settle({ deviceSegs: ds, dt: 1 });
  assert.equal(r.result.s1, false); // 无发电机、无电池 → 暗
  // 有发电但无负荷 → 激活（带电，线亮）
  const r2 = settle({ generators: { g1: { burnTicks: 10 } }, deviceSegs: { g1: ['s2'] }, dt: 1 });
  assert.equal(r2.result.s2, true);
  // 有电电池但无负荷 → 激活（带电）
  const r3 = settle({ batteries: { b1: { level: 50 } }, deviceSegs: { b1: ['s3'] }, dt: 1 });
  assert.equal(r3.result.s3, true);
});

// 多发电机累加
test('多发电机累加供能', () => {
  const generators = { g1: { burnTicks: 10 }, g2: { burnTicks: 10 } };
  const furnaces = { f1: {}, f2: {} }; // load 60
  const ds = { g1: ['s1'], g2: ['s1'], f1: ['s1'], f2: ['s1'] };
  const { result } = settle({ generators, furnaces, deviceSegs: ds, dt: 1 });
  assert.equal(result.s1, true); // 80 >= 60
});

// 空熔炉不计负荷：无料时发电富余全部给电池充电；有料(hasInput)才扣负荷
test('空熔炉不耗电（富余充电 vs 有料扣负荷）', () => {
  const ds = { g1: ['s1'], b1: ['s1'], f1: ['s1'] };
  const mk = (hasInput) => ({ generators: { g1: { burnTicks: 99 } }, batteries: { b1: { level: 0 } }, furnaces: { f1: { hasInput } }, deviceSegs: ds, dt: 1 });
  const empty = settle(mk(false));
  assert.equal(empty.result.s1, true);
  assert.equal(empty.batteries.b1.level, 40); // 无负荷 → 40 全部盈余充电
  const full = settle(mk(true));
  assert.equal(full.result.s1, true);
  assert.equal(full.batteries.b1.level, 10);  // 有料 → 扣 30 负荷后剩 10 盈余充电
});