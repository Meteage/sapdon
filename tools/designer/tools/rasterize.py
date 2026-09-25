#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
离屏光栅化（Sapdon UI Designer）—— 把 rasterize.mjs 生成的 draw list 画成 PNG。

为什么用 Python：本环境没有浏览器（也就没法截 DOM），但装了 Pillow 与中文字体，
用它能把「画布长什么样」落成一张真图，供人（和 AI）肉眼核对。

规则与 `src/ui/canvas.js` 一一对应：
  · 贴图  fit=stretch/contain（keep_ratio）、repeat、nine（九宫格）、clip（按比例裁）
  · 文本  颜色/字号/对齐/阴影/换行（字体是系统字体，不是引擎位图字体 —— 只有比例近似）
  · 占位  缺纹理/`.tga` 斜纹
  · --grid 时叠加盒子与格位调试线（看清楚版面解算）
"""

import json
import sys
from PIL import Image, ImageDraw, ImageFont

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\msyh.ttc",
    r"C:\Windows\Fonts\simhei.ttf",
    r"C:\Windows\Fonts\simsun.ttc",
]
FONT_CACHE = {}


def load_font(px):
    px = max(6, int(round(px)))
    if px in FONT_CACHE:
        return FONT_CACHE[px]
    for path in FONT_CANDIDATES:
        try:
            FONT_CACHE[px] = ImageFont.truetype(path, px)
            return FONT_CACHE[px]
        except Exception:
            continue
    FONT_CACHE[px] = ImageFont.load_default()
    return FONT_CACHE[px]


def px_rect(rect, zoom):
    return (
        int(round(rect["x"] * zoom)),
        int(round(rect["y"] * zoom)),
        int(round((rect["x"] + rect["w"]) * zoom)),
        int(round((rect["y"] + rect["h"]) * zoom)),
    )


def rgba(color, default=(255, 255, 255, 255)):
    if not color:
        return default
    vals = list(color) + [1] * (4 - len(color))
    return tuple(int(max(0, min(1, float(c))) * 255) for c in vals[:4])


def open_texture(path):
    try:
        img = Image.open(path)
        img.load()
        return img.convert("RGBA")
    except Exception:
        return None


def fit_image(src, box_w, box_h, mode):
    if box_w <= 0 or box_h <= 0:
        return None
    if mode == "stretch":
        return src.resize((box_w, box_h), Image.NEAREST)
    # contain（保比例）
    sw, sh = src.size
    scale = min(box_w / sw, box_h / sh)
    w, h = max(1, int(round(sw * scale))), max(1, int(round(sh * scale)))
    return src.resize((w, h), Image.NEAREST)


def nine_slice(src, box_w, box_h, slice_px):
    """JSON UI 的 nineslice_size：四角不缩放、四边单向拉伸、中间双向拉伸。"""
    sw, sh = src.size
    s = min(slice_px, sw // 2, sh // 2)
    if s <= 0 or box_w < 2 * s or box_h < 2 * s:
        return src.resize((max(1, box_w), max(1, box_h)), Image.NEAREST)
    out = Image.new("RGBA", (box_w, box_h), (0, 0, 0, 0))
    # 九块： (源框, 目标框)
    pieces = [
        ((0, 0, s, s), (0, 0, s, s)),
        ((sw - s, 0, sw, s), (box_w - s, 0, box_w, s)),
        ((0, sh - s, s, sh), (0, box_h - s, s, box_h)),
        ((sw - s, sh - s, sw, sh), (box_w - s, box_h - s, box_w, box_h)),
        ((s, 0, sw - s, s), (s, 0, box_w - s, s)),
        ((s, sh - s, sw - s, sh), (s, box_h - s, box_w - s, box_h)),
        ((0, s, s, sh - s), (0, s, s, box_h - s)),
        ((sw - s, s, sw, sh - s), (box_w - s, s, box_w, box_h - s)),
        ((s, s, sw - s, sh - s), (s, s, box_w - s, box_h - s)),
    ]
    for src_box, dst_box in pieces:
        dw, dh = dst_box[2] - dst_box[0], dst_box[3] - dst_box[1]
        if dw <= 0 or dh <= 0:
            continue
        part = src.crop(src_box)
        if part.size != (dw, dh):
            part = part.resize((dw, dh), Image.NEAREST)
        out.alpha_composite(part, (dst_box[0], dst_box[1]))
    return out


def draw_nine_pieces(canvas, src, op, nine, zoom):
    """按 paint.js 算好的九块（源矩形 + 目标矩形，画布单位）逐块铺。

    规则与浏览器画布**完全一致**（同一份 pieces 数据），退化切片（源带 0 宽）也能画对 ——
    这正是原版木框 `book_back`（28×28 + nineslice 14）的画法。
    """
    alpha = op.get("alpha", 1)
    gray = op.get("gray")
    for piece in nine["pieces"]:
        sx, sy, sw, sh = piece["src"]
        dx, dy, dw, dh = piece["dst"]
        tx0, ty0 = int(round(dx * zoom)), int(round(dy * zoom))
        tw, th = max(1, int(round(dw * zoom))), max(1, int(round(dh * zoom)))
        part = src.crop((sx, sy, sx + sw, sy + sh))
        if part.size != (tw, th):
            part = part.resize((tw, th), Image.NEAREST)
        if gray:
            part = part.convert("L").convert("RGBA")
        if alpha is not None and float(alpha) < 1:
            part.putalpha(part.getchannel("A").point(lambda v: int(v * float(alpha))))
        canvas.alpha_composite(part, (tx0, ty0))


def draw_image_op(canvas, op, zoom, textures):
    x0, y0, x1, y1 = px_rect(op["rect"], zoom)
    box_w, box_h = x1 - x0, y1 - y0
    if box_w <= 0 or box_h <= 0:
        return
    file = op.get("file")
    src = open_texture(file) if file else None
    if src is None:
        draw_placeholder(canvas, (x0, y0, x1, y1), "tga" if op.get("reason") == "tga" else "missing")
        return

    if op.get("nine"):
        pieces = (op["nine"] or {}).get("pieces")
        if pieces and pieces.get("pieces"):
            draw_nine_pieces(canvas, src, op, pieces, zoom)
            return
        # 没拿到源像素尺寸（没连资源包）：退回整图缩放近似
        layer = fit_image(src, box_w, box_h, "contain")
        if layer is not None:
            canvas.alpha_composite(layer, (x0 + (box_w - layer.size[0]) // 2, y0 + (box_h - layer.size[1]) // 2))
        return

    if op.get("clip"):
        clip = op["clip"]
        ratio = float(clip["ratio"])
        direction = clip["dir"]
        horizontal = direction in ("left", "right")
        # 先把整图按 fit 铺满整个盒子，再按比例裁出可见部分
        full = fit_image(src, box_w, box_h, op.get("fit", "contain"))
        if full is None:
            return
        layer = Image.new("RGBA", (box_w, box_h), (0, 0, 0, 0))
        layer.alpha_composite(full, (0, 0))
        cw = max(1, int(round(box_w * ratio))) if horizontal else box_w
        ch = box_h if horizontal else max(1, int(round(box_h * ratio)))
        cx = 0 if direction != "right" else box_w - cw
        cy = 0 if direction != "down" else box_h - ch
        layer = layer.crop((cx, cy, cx + cw, cy + ch))
    elif op.get("repeat") and op["repeat"] != "none":
        layer = Image.new("RGBA", (box_w, box_h), (0, 0, 0, 0))
        sw, sh = src.size
        for ty in range(0, box_h, sh):
            if op["repeat"] in ("repeat", "repeat-x"):
                for tx in range(0, box_w, sw):
                    layer.alpha_composite(src, (tx, ty))
            else:  # repeat-y
                layer.alpha_composite(src, ((box_w - sw) // 2, ty))
    else:
        layer = fit_image(src, box_w, box_h, op.get("fit", "contain"))
        if layer is None:
            return

    if op.get("gray"):
        layer = layer.convert("L").convert("RGBA")
    alpha = op.get("alpha", 1)
    if alpha is not None and float(alpha) < 1:
        a = layer.getchannel("A").point(lambda v: int(v * float(alpha)))
        layer.putalpha(a)

    # contain 居中
    ox = x0 + (box_w - layer.size[0]) // 2
    oy = y0 + (box_h - layer.size[1]) // 2
    if op.get("clip") and op["clip"]["dir"] == "right":
        ox = x1 - layer.size[0]
    if op.get("clip") and op["clip"]["dir"] == "down":
        oy = y1 - layer.size[1]
    canvas.alpha_composite(layer, (ox, oy))


def draw_placeholder(canvas, box, reason):
    x0, y0, x1, y1 = box
    color = (226, 179, 65, 60) if reason == "tga" else (239, 107, 107, 60)
    layer = Image.new("RGBA", (max(1, x1 - x0), max(1, y1 - y0)), color)
    d = ImageDraw.Draw(layer)
    w, h = layer.size
    for i in range(-h, w, 12):
        d.line([(i, h), (i + h, 0)], fill=(255, 255, 255, 40), width=3)
    canvas.alpha_composite(layer, (x0, y0))


def draw_text_op(canvas, op, zoom):
    x0, y0, x1, y1 = px_rect(op["rect"], zoom)
    if x1 <= x0 or y1 <= y0:
        return
    font = load_font(op["fontSize"] * zoom)
    color = rgba(op.get("color"))
    layer = Image.new("RGBA", (x1 - x0, y1 - y0), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    lines = str(op["text"]).split("\n")
    line_h = max(1, int(round(op["fontSize"] * zoom * op.get("lineHeight", 1.15))))
    total_h = line_h * len(lines)
    ty = max(0, ((y1 - y0) - total_h) // 2)  # 垂直居中（引擎 label 的常见行为）
    for line in lines:
        if not line:
            ty += line_h
            continue
        bbox = d.textbbox((0, 0), line, font=font)
        tw = bbox[2] - bbox[0]
        align = op.get("align", "center")
        if align == "left":
            tx = 2
        elif align == "right":
            tx = max(0, (x1 - x0) - tw - 2)
        else:
            tx = max(0, ((x1 - x0) - tw) // 2)
        if op.get("shadow"):
            d.text((tx + 1, ty + 1), line, font=font, fill=(0, 0, 0, 200))
        d.text((tx, ty), line, font=font, fill=color)
        ty += line_h
    alpha = op.get("alpha", 1)
    if alpha is not None and float(alpha) < 1:
        layer.putalpha(layer.getchannel("A").point(lambda v: int(v * float(alpha))))
    canvas.alpha_composite(layer, (x0, y0))


def draw_grid(canvas, payload, zoom):
    d = ImageDraw.Draw(canvas, "RGBA")
    for box in payload["boxes"]:
        rect = box["rect"]
        x0, y0, x1, y1 = px_rect(rect, zoom)
        if x1 - x0 < 2 and y1 - y0 < 2:
            continue
        color = (120, 200, 255, 90) if box["placement"] == "anchored" else (255, 210, 90, 110)
        d.rectangle([x0, y0, max(x0 + 1, x1 - 1), max(y0 + 1, y1 - 1)], outline=color, width=1)


def main():
    if len(sys.argv) < 3:
        print("用法: rasterize.py <drawlist.json> <out.png>")
        return 2
    with open(sys.argv[1], "r", encoding="utf-8") as f:
        payload = json.load(f)

    zoom = float(payload.get("zoom") or 2)
    textures = payload.get("textures") or []
    w = int(payload["width"] * zoom)
    h = int(payload["height"] * zoom)
    canvas = Image.new("RGBA", (w, h), (16, 18, 22, 255))

    for op in payload["ops"]:
        if op["kind"] == "image":
            draw_image_op(canvas, op, zoom, textures)
        elif op["kind"] == "placeholder":
            if op.get("reason") == "uv":
                continue  # 画布上只是个角标提示，不必进图
            draw_placeholder(canvas, px_rect(op["rect"], zoom), op.get("reason", "missing"))
        elif op["kind"] == "text":
            draw_text_op(canvas, op, zoom)
        elif op["kind"] == "template":
            # 未解析的原版模板：画一条淡虚线（手册的分隔线就落在这里）
            x0, y0, x1, y1 = px_rect(op["rect"], zoom)
            d = ImageDraw.Draw(canvas, "RGBA")
            d.rectangle([x0, y0, max(x0 + 1, x1 - 1), max(y0 + 1, y1 - 1)], outline=(255, 255, 255, 60), width=1)

    if payload.get("grid"):
        draw_grid(canvas, payload, zoom)

    canvas.convert("RGB").save(sys.argv[2])
    print(f"PIL 光栅化完成：{w}x{h} → {sys.argv[2]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
