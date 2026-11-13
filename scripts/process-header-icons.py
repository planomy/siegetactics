#!/usr/bin/env python3
"""Split the generated 2x2 header icon sheet and key out its sky-blue backdrop → assets/ui/icons/{name}.png.

The backdrop is removed by flood fill from the edges, which stops at each icon's dark outline, so
teal parts inside an icon (the dart's feathers) are never keyed out.
"""
from collections import deque
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = Path("/Users/niccomino/.cursor/projects/Users-niccomino-Desktop-siegetactics/assets/header-icons-sheet.jpg")
OUT_DIR = ROOT / "assets/ui/icons"
NAMES = [["flame", "target"], ["crystal", "chest"]]
SIZE = 128

BG = (1, 204, 255)
CLEAR, SOFT = 60, 110


def dist(r, g, b):
    return ((r - BG[0]) ** 2 + (g - BG[1]) ** 2 + (b - BG[2]) ** 2) ** 0.5


def key_out(img):
    w, h = img.size
    px = img.load()
    seen = bytearray(w * h)
    queue = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
    while queue:
        x, y = queue.popleft()
        if seen[y * w + x]:
            continue
        seen[y * w + x] = 1
        r, g, b, _ = px[x, y]
        d = dist(r, g, b)
        if d <= CLEAR:
            px[x, y] = (r, g, b, 0)
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
                    queue.append((nx, ny))
        elif d < SOFT:
            # Edge pixel: fade it and pull out the blue cast.
            px[x, y] = (r, g, min(b, max(r, g)), int(255 * (d - CLEAR) / (SOFT - CLEAR)))


def main():
    OUT_DIR.mkdir(exist_ok=True)
    sheet = Image.open(SRC).convert("RGBA")
    half_w, half_h = sheet.width // 2, sheet.height // 2
    for row, names in enumerate(NAMES):
        for col, name in enumerate(names):
            icon = sheet.crop((col * half_w, row * half_h, (col + 1) * half_w, (row + 1) * half_h))
            key_out(icon)
            icon = icon.crop(icon.getbbox())
            icon.thumbnail((SIZE, SIZE), Image.LANCZOS)
            out = OUT_DIR / f"{name}.png"
            icon.save(out, optimize=True)
            print(f"Saved {out.relative_to(ROOT)} {icon.size}")


if __name__ == "__main__":
    main()
