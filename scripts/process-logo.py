#!/usr/bin/env python3
"""Remove flat black background from header logo → transparent PNG."""
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets/home/granny-boom-siege-logo.jpg"
OUT = ROOT / "assets/home/granny-boom-siege-logo.png"


def is_bg(r, g, b, _a, threshold=28):
    return r < threshold and g < threshold and b < threshold


def process(src_path, out_path):
    img = Image.open(src_path).convert("RGBA")
    px = img.load()
    w, h = img.size
    visited = bytearray(w * h)
    q = deque()

    for x in range(w):
        for y in (0, h - 1):
            if is_bg(*px[x, y]):
                i = y * w + x
                if not visited[i]:
                    visited[i] = 1
                    q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_bg(*px[x, y]):
                i = y * w + x
                if not visited[i]:
                    visited[i] = 1
                    q.append((x, y))

    while q:
        x, y = q.popleft()
        px[x, y] = (px[x, y][0], px[x, y][1], px[x, y][2], 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h:
                i = ny * w + nx
                if not visited[i] and is_bg(*px[nx, ny]):
                    visited[i] = 1
                    q.append((nx, ny))

    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, optimize=True)
    print(f"Wrote {out_path} ({img.size[0]}x{img.size[1]})")


if __name__ == "__main__":
    if not SRC.exists():
        raise SystemExit(f"Missing source: {SRC}")
    process(SRC, OUT)
