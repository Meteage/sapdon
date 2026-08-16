// icon_ref.mjs - fetch an emoji icon vector (Twemoji SVG) and rasterize it to PNG
// Usage: node tools/icon_ref.mjs <emoji-char | hex-codepoint> [-s <size>] [-o <out.png>]
//   node tools/icon_ref.mjs 1f527 -s 64 -o E:/Temp/opencode/wrench_ref.png   (the :wrench: emoji)
//   node tools/icon_ref.mjs "🔧" -s 16
// No dependencies: parses SVG path (M/L/H/V/C/S/Q/T + relative + Z), flattens beziers,
// scanline fills with even-odd rule, encodes PNG via node zlib.
// Then view the result with tools/view_texture.ps1 <png> to "see" the icon in ASCII.

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const args = process.argv.slice(2);
const arg = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : null;
};
const emojiArg = args[0];
if (!emojiArg) {
    console.error("usage: node tools/icon_ref.mjs <emoji-char|hex> [-s size] [-o out.png]");
    process.exit(1);
}
const codepoint = /^[0-9a-fA-F]+$/.test(emojiArg) ? emojiArg.toLowerCase() : emojiArg.codePointAt(0).toString(16);
const size = parseInt(arg("-s") || "64", 10);
const out = arg("-o") || `E:/Temp/opencode/icon_${codepoint}.png`;

const url = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codepoint}.svg`;
console.log(`fetching ${url}`);
const svg = await (await fetch(url)).text();

// ---------- SVG -> paths ----------
const viewBox = svg.match(/viewBox="[\s\d.]*\s([\d.]+)\s([\d.]+)\s([\d.]+)\s([\d.]+)"/);
const vbW = viewBox ? parseFloat(viewBox[3]) : 36;
const vbH = viewBox ? parseFloat(viewBox[4]) : 36;

const items = [];
const pathRe = /<path\b[^>]*>/g;
for (const m of svg.matchAll(pathRe)) {
    const tag = m[0];
    const d = (tag.match(/\bd="([^"]*)"/) || [])[1];
    if (!d) continue;
    const fill = (tag.match(/\bfill="([^"]*)"/) || [])[1] || "#000000";
    if (fill === "none") continue;
    items.push({ d, fill });
}

// ---------- path data -> polygons (bezier flattening) ----------
function parsePath(d) {
    const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
    let i = 0;
    let cmd = "";
    let x = 0, y = 0, sx = 0, sy = 0;
    let lastC = null, lastQ = null;
    const polys = [];
    let cur = null;
    const num = () => parseFloat(tokens[i++]);
    const bezier = (p0, p1, p2, p3, steps) => {
        const pts = [];
        for (let s = 1; s <= steps; s++) {
            const u = s / steps, v = 1 - u;
            pts.push([
                v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0],
                v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1],
            ]);
        }
        return pts;
    };
    const quad = (p0, p1, p2, steps) => {
        const pts = [];
        for (let s = 1; s <= steps; s++) {
            const u = s / steps, v = 1 - u;
            pts.push([
                v * v * p0[0] + 2 * v * u * p1[0] + u * u * p2[0],
                v * v * p0[1] + 2 * v * u * p1[1] + u * u * p2[1],
            ]);
        }
        return pts;
    };
    const newSub = () => {
        cur = [[x, y]];
        polys.push(cur);
        return cur;
    };
    while (i < tokens.length) {
        const t = tokens[i];
        if (/[a-zA-Z]/.test(t)) { cmd = t; i++; }
        else if (!cmd) break;
        const rel = cmd === cmd.toLowerCase();
        const c = cmd.toUpperCase();
        const px = x, py = y;
        switch (c) {
            case "M": {
                x = rel ? x + num() : num();
                y = rel ? y + num() : num();
                sx = x; sy = y;
                newSub();
                cmd = rel ? "l" : "L";
                lastC = null; lastQ = null;
                break;
            }
            case "L": {
                x = rel ? x + num() : num();
                y = rel ? y + num() : num();
                cur.push([x, y]);
                lastC = null; lastQ = null;
                break;
            }
            case "H": {
                x = rel ? x + num() : num();
                cur.push([x, y]);
                lastC = null; lastQ = null;
                break;
            }
            case "V": {
                y = rel ? y + num() : num();
                cur.push([x, y]);
                lastC = null; lastQ = null;
                break;
            }
            case "C": {
                const x1 = rel ? x + num() : num(), y1 = rel ? y + num() : num();
                const x2 = rel ? x + num() : num(), y2 = rel ? y + num() : num();
                const nx = rel ? x + num() : num(), ny = rel ? y + num() : num();
                for (const p of bezier([px, py], [x1, y1], [x2, y2], [nx, ny], 16)) cur.push(p);
                lastC = [x2, y2]; lastQ = null;
                x = nx; y = ny;
                break;
            }
            case "S": {
                const cx1 = lastC ? 2 * x - lastC[0] : x;
                const cy1 = lastC ? 2 * y - lastC[1] : y;
                const x2 = rel ? x + num() : num(), y2 = rel ? y + num() : num();
                const nx = rel ? x + num() : num(), ny = rel ? y + num() : num();
                for (const p of bezier([px, py], [cx1, cy1], [x2, y2], [nx, ny], 16)) cur.push(p);
                lastC = [x2, y2]; lastQ = null;
                x = nx; y = ny;
                break;
            }
            case "Q": {
                const x1 = rel ? x + num() : num(), y1 = rel ? y + num() : num();
                const nx = rel ? x + num() : num(), ny = rel ? y + num() : num();
                for (const p of quad([px, py], [x1, y1], [nx, ny], 12)) cur.push(p);
                lastQ = [x1, y1]; lastC = null;
                x = nx; y = ny;
                break;
            }
            case "T": {
                const cx1 = lastQ ? 2 * x - lastQ[0] : x;
                const cy1 = lastQ ? 2 * y - lastQ[1] : y;
                const nx = rel ? x + num() : num(), ny = rel ? y + num() : num();
                for (const p of quad([px, py], [cx1, cy1], [nx, ny], 12)) cur.push(p);
                lastQ = [cx1, cy1]; lastC = null;
                x = nx; y = ny;
                break;
            }
            case "Z": {
                if (cur.length && (cur[0][0] !== x || cur[0][1] !== y)) cur.push([sx, sy]);
                x = sx; y = sy;
                lastC = null; lastQ = null;
                break;
            }
            default:
                throw new Error(`unsupported cmd ${c}`);
        }
    }
    return polys;
}

// ---------- scanline rasterize (even-odd) ----------
const hexToRgb = (hex) => {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

function render(polys, rgb, renderSize) {
    const buf = new Uint8Array(renderSize * renderSize * 4);
    const scale = renderSize / Math.max(vbW, vbH);
    const offX = (renderSize - vbW * scale) / 2;
    const offY = (renderSize - vbH * scale) / 2;
    for (let py = 0; py < renderSize; py++) {
        const y = (py + 0.5 - offY) / scale;
        const xs = [];
        for (const poly of polys) {
            for (let k = 0; k < poly.length; k++) {
                const a = poly[k], b = poly[(k + 1) % poly.length];
                const y1 = a[1], y2 = b[1];
                if (y1 === y2) continue;
                const lo = Math.min(y1, y2), hi = Math.max(y1, y2);
                if (y < lo || y >= hi) continue;
                xs.push(a[0] + ((y - y1) / (y2 - y1)) * (b[0] - a[0]));
            }
        }
        xs.sort((a, b) => a - b);
        for (let k = 0; k + 1 < xs.length; k += 2) {
            const x0 = Math.round(xs[k] * scale + offX), x1 = Math.round(xs[k + 1] * scale + offX);
            for (let x = Math.max(0, x0); x <= Math.min(renderSize - 1, x1); x++) {
                const o = (py * renderSize + x) * 4;
                buf[o] = rgb[0]; buf[o + 1] = rgb[1]; buf[o + 2] = rgb[2]; buf[o + 3] = 255;
            }
        }
    }
    return buf;
}

// ---------- box downscale ----------
function downscale(src, srcSize, dstSize) {
    const dst = new Uint8Array(dstSize * dstSize * 4);
    const f = srcSize / dstSize;
    for (let y = 0; y < dstSize; y++) {
        for (let x = 0; x < dstSize; x++) {
            const x0 = Math.floor(x * f), x1 = Math.min(srcSize - 1, Math.floor((x + 1) * f));
            const y0 = Math.floor(y * f), y1 = Math.min(srcSize - 1, Math.floor((y + 1) * f));
            let r = 0, g = 0, b = 0, a = 0, n = 0;
            for (let yy = y0; yy <= y1; yy++) {
                for (let xx = x0; xx <= x1; xx++) {
                    const o = (yy * srcSize + xx) * 4;
                    if (src[o + 3] > 0) { r += src[o]; g += src[o + 1]; b += src[o + 2]; n++; }
                }
            }
            const o = (y * dstSize + x) * 4;
            if (n > 0) {
                dst[o] = Math.round(r / n); dst[o + 1] = Math.round(g / n);
                dst[o + 2] = Math.round(b / n); dst[o + 3] = 255;
            }
        }
    }
    return dst;
}

// ---------- PNG encode (no deps) ----------
const CRC_TABLE = new Int32Array(256).map((_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c;
});
const crc32 = (buf) => {
    let c = -1;
    for (const b of buf) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
};
function encodePng(buf, size) {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0);
    ihdr.writeUInt32BE(size, 4);
    ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
    const stride = size * 4 + 1;
    const raw = Buffer.alloc(stride * size);
    for (let y = 0; y < size; y++) {
        raw[y * stride] = 0;
        Buffer.from(buf.buffer, y * size * 4, size * 4).copy(raw, y * stride + 1);
    }
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk("IHDR", ihdr),
        chunk("IDAT", zlib.deflateSync(raw)),
        chunk("IEND", Buffer.alloc(0)),
    ]);
}

// ---------- MC item-icon styling (selective outlining) ----------
// From a flat silhouette: dark outline around the shape + highlight on top-left
// inner edges + shadow on bottom-right inner edges, all derived from the base color.
function stylize(buf, size, baseHex) {
    const baseRgb = hexToRgb(baseHex);
    const outline = baseRgb.map((v) => Math.round(v * 0.42));
    const shadow = baseRgb.map((v) => Math.round(v * 0.72));
    const highlight = baseRgb.map((v) => Math.min(255, Math.round(v * 1.35)));
    const idx = (x, y) => (y * size + x) * 4;
    const filled = (x, y) => x >= 0 && x < size && y >= 0 && y < size && buf[idx(x, y) + 3] > 0;
    const edge = new Uint8Array(size * size);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (!filled(x, y)) continue;
            edge[y * size + x] = (!filled(x - 1, y) || !filled(x + 1, y) || !filled(x, y - 1) || !filled(x, y + 1)) ? 1 : 0;
        }
    }
    const out = new Uint8Array(buf.length);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (!filled(x, y)) continue;
            let c = baseRgb;
            if (edge[y * size + x]) {
                c = outline;
            } else {
                const eUp = edge[(y - 1) * size + x] === 1;
                const eLeft = edge[y * size + (x - 1)] === 1;
                const eDown = edge[(y + 1) * size + x] === 1;
                const eRight = edge[y * size + (x + 1)] === 1;
                if (eUp || eLeft) c = highlight;
                else if (eDown || eRight) c = shadow;
            }
            const o = idx(x, y);
            out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
        }
    }
    return out;
}

// ---------- main ----------
const stylizeFlag = args.includes("-stylize");
const colorArg = arg("-color");
// render internally at high res for smooth shapes, then box-downscale to output size
const renderSize = Math.max(128, size);
const full = new Uint8Array(renderSize * renderSize * 4);
for (const it of items) {
    const polys = parsePath(it.d);
    const rgb = hexToRgb(it.fill);
    const layer = render(polys, rgb, renderSize);
    for (let o = 0; o < full.length; o += 4) {
        if (layer[o + 3] > 0) {
            full[o] = layer[o]; full[o + 1] = layer[o + 1]; full[o + 2] = layer[o + 2]; full[o + 3] = 255;
        }
    }
}
const final = size >= renderSize ? full : downscale(full, renderSize, size);
let outBuf = final;
if (stylizeFlag) {
    const baseColor = colorArg || (items[0] && items[0].fill) || "#8899A6";
    outBuf = stylize(final, size, baseColor);
    console.log(`stylized (selective outlining) base=${baseColor}`);
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, encodePng(outBuf, size));
console.log(`icon ${codepoint}: ${items.length} path(s), rendered ${size}x${size} -> ${out}`);
console.log(`view with: powershell -ExecutionPolicy Bypass -File tools/view_texture.ps1 ${out}`);
