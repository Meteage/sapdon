// 4-bit ripple-carry full adder -> mode=topo logic record JSON generator
// Gates: AND/OR/NOT only. Face conventions (facing=north): output face=east;
// AND/OR inputs = north/west/south (3 faces, unused tie to const).
// NOT input face = west.
// Mapping: inVal = A | B<<4 ; outputs = S0..S3 | Cout<<4
//
// IMPORTANT (matches circuit.js buildTopoModel):
//  - comp.nets[face] must be the STRING INDEX of the net in topo.nets array
//    (evaluator looks up netsMap key "tn"+idx).
//  - net.terms entries are [compKey, face] of DRIVERS only.
function buildAdderTopo() {
    const comps = [];
    const nets = [];
    const newNet = () => {
        const idx = nets.length;
        const n = { idx, terms: [], wires: [], width: 1 };
        nets.push(n);
        return n;
    };
    const ref = (net) => String(net.idx);

    const mkComp = (k, t, x, y, z, f, netsObj) => {
        // buildTopoModel 只读 k/t/f/p/nets（loc 由 k 解析），x/y/z/directs 冗余，省略省体积
        comps.push({ k, t, f, p: 0, nets: netsObj });
    };

    const OUT = "east";

    const mkNot = (x, inNet) => {
        const k = `${x},0,0`;
        const net = newNet();
        mkComp(k, "sapdon:not_gate", x, 0, 0, "north", { west: ref(inNet) });
        net.terms.push([k, OUT]);
        return net;
    };
    const mkAnd = (x, in1, in2, tieNet) => {
        const k = `${x},0,0`;
        const net = newNet();
        mkComp(k, "sapdon:and_gate", x, 0, 0, "north", { north: ref(in1), west: ref(in2), south: ref(tieNet) });
        net.terms.push([k, OUT]);
        return net;
    };
    const mkOr = (x, in1, in2, tieNet) => {
        const k = `${x},0,0`;
        const net = newNet();
        mkComp(k, "sapdon:or_gate", x, 0, 0, "north", { north: ref(in1), west: ref(in2), south: ref(tieNet) });
        net.terms.push([k, OUT]);
        return net;
    };

    // const sources: oneNet = 1, zeroNet = 0
    const oneNet = newNet();
    mkComp("100,0,0", "sapdon:on_signal", 100, 0, 0, "north", {});
    oneNet.terms.push(["100,0,0", OUT]);

    const zeroNet = newNet();
    mkComp("101,0,0", "sapdon:off_signal", 101, 0, 0, "north", {});
    zeroNet.terms.push(["101,0,0", OUT]);

    // inputs: A0..A3 at ports 0..3, B0..B3 at ports 4..7
    const inputNets = [];
    for (let i = 0; i < 8; i++) {
        const x = 10 + i;
        const k = `${x},0,0`;
        mkComp(k, `sapdon:input_port_${i}`, x, 0, 0, "north", {});
        const net = newNet();
        net.terms.push([k, OUT]);
        inputNets.push(net);
    }

    // outputs: ports 8..11 = S0..S3, port 12 = Cout
    const outputKeys = [];
    for (let i = 0; i < 5; i++) {
        const x = 200 + i;
        const k = `${x},0,0`;
        mkComp(k, `sapdon:output_port_${8 + i}`, x, 0, 0, "north", {});
        outputKeys.push(k);
    }

    // per-bit ripple adder
    let carryNet = zeroNet; // C0 = 0
    for (let bit = 0; bit < 4; bit++) {
        const aNet = inputNets[bit];
        const bNet = inputNets[4 + bit];
        const bx = 20 + bit * 30;

        // !A, !B
        const nA = mkNot(bx, aNet);
        const nB = mkNot(bx + 1, bNet);
        // A&!B, !A&B
        const t1 = mkAnd(bx + 2, aNet, nB, oneNet);
        const t2 = mkAnd(bx + 3, nA, bNet, oneNet);
        // X = t1|t2 = A^B
        const xSig = mkOr(bx + 4, t1, t2, zeroNet);
        // !C, !X
        const nC = mkNot(bx + 5, carryNet);
        const nX = mkNot(bx + 6, xSig);
        // S = (X&!C)|(!X&C)
        const s1 = mkAnd(bx + 7, xSig, nC, oneNet);
        const s2 = mkAnd(bx + 8, nX, carryNet, oneNet);
        const sSig = mkOr(bx + 9, s1, s2, zeroNet);
        // Cout = (A&B)|(C&X)
        const ab = mkAnd(bx + 10, aNet, bNet, oneNet);
        const cx = mkAnd(bx + 11, carryNet, xSig, oneNet);
        carryNet = mkOr(bx + 12, ab, cx, zeroNet);

        // sum -> output port bit
        const sKey = outputKeys[bit];
        const sComp = comps.find((c) => c.k === sKey);
        sComp.nets = { north: ref(sSig) };
    }
    // cout -> output port bit4
    const cKey = outputKeys[4];
    const cComp = comps.find((c) => c.k === cKey);
    cComp.nets = { north: ref(carryNet) };

    const inputs = Array.from({ length: 8 }, (_, i) => ({ num: i, k: `${10 + i},0,0` }));
    const outputs = Array.from({ length: 5 }, (_, i) => ({ num: 8 + i, k: outputKeys[i] }));

    return {
        mode: "topo",
        origin: { x: 0, y: 0, z: 0 },
        inputs,
        outputs,
        comps,
        nets: nets.map((n) => ({ terms: n.terms, width: 1 })),
    };
}

const rec = buildAdderTopo();
const json = JSON.stringify(rec);
console.log("chars:", json.length);

// 输出完整 JSON
console.log("=== JSON ===");
console.log(json);

// 输出分段 logic_stage 命令（聊天输入约 230 字符内安全）
console.log("=== STAGE CHUNKS ===");
const CHUNK = 200;
const parts = [];
for (let i = 0; i < json.length; i += CHUNK) parts.push(json.slice(i, i + CHUNK));
parts.forEach((p, i) => console.log(`sapdon:logic_stage ${p}`));
console.log(`(共 ${parts.length} 段)`);
console.log("=== DONE ===");