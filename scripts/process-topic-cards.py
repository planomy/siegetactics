#!/usr/bin/env python3
"""Cut the flat dark-navy backdrop away from the topic card JPEGs → assets/topics/cards/{topic-id}.png.

Each row and column is scanned inwards from both ends and stops at the first frame pixel, so the
dark jungle inside the frame is never touched, even where the frame art has a hairline gap.
The pixel where a scan stops fades out for a clean edge.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "assets/topics"
OUT_DIR = ROOT / "assets/topics/cards"

BG = (1, 13, 19)
# Colour distance from the backdrop: within CLEAR is removed; up to SOFT fades; beyond is the card.
CLEAR, SOFT = 34, 70


def dist(p):
    return ((p[0] - BG[0]) ** 2 + (p[1] - BG[1]) ** 2 + (p[2] - BG[2]) ** 2) ** 0.5


def scan(px, alpha, points):
    for x, y in points:
        r, g, b, _ = px[x, y]
        d = dist((r, g, b))
        if d <= CLEAR:
            alpha[(x, y)] = 0
            continue
        if d < SOFT:
            soft = int(255 * (d - CLEAR) / (SOFT - CLEAR))
            alpha[(x, y)] = min(alpha.get((x, y), 255), soft)
        return


def process(src, out):
    img = Image.open(src).convert("RGBA")
    w, h = img.size
    px = img.load()
    alpha = {}
    for y in range(h):
        scan(px, alpha, ((x, y) for x in range(w)))
        scan(px, alpha, ((x, y) for x in reversed(range(w))))
    for x in range(w):
        scan(px, alpha, ((x, y) for y in range(h)))
        scan(px, alpha, ((x, y) for y in reversed(range(h))))
    for (x, y), a in alpha.items():
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, a)
    img.save(out, optimize=True)


def main():
    OUT_DIR.mkdir(exist_ok=True)
    for src in sorted(SRC_DIR.glob("*.jpg")):
        out = OUT_DIR / f"{src.stem}.png"
        process(src, out)
        print(f"Saved {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
