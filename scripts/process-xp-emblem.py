#!/usr/bin/env python3
"""Key the flat sky-blue background out of the generated XP medallion → assets/ui/xp-emblem.png."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = Path("/Users/niccomino/.cursor/projects/Users-niccomino-Desktop-siegetactics/assets/xp-emblem-source.jpg")
OUT = ROOT / "assets/ui/xp-emblem.png"
SIZE = 320

BG = (1, 205, 255)
# Colour distance from the background: inside SOLID is opaque, beyond CLEAR is fully keyed out.
CLEAR, SOLID = 60, 140


def alpha_for(r, g, b):
    d = ((r - BG[0]) ** 2 + (g - BG[1]) ** 2 + (b - BG[2]) ** 2) ** 0.5
    if d <= CLEAR:
        return 0
    if d >= SOLID:
        return 255
    return int(255 * (d - CLEAR) / (SOLID - CLEAR))


def main():
    img = Image.open(SRC).convert("RGBA")
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, _ = px[x, y]
            a = alpha_for(r, g, b)
            if 0 < a < 255:
                # Pull the blue fringe out of the gold rim's soft edge.
                b = min(b, max(r, g))
            px[x, y] = (r, g, b, a)
    img = img.crop(img.getbbox())
    img.thumbnail((SIZE, SIZE), Image.LANCZOS)
    img.save(OUT, optimize=True)
    print(f"Saved {OUT.relative_to(ROOT)} {img.size}")


if __name__ == "__main__":
    main()
