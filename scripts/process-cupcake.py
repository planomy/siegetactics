#!/usr/bin/env python3
"""Chroma-key cyan background from cupcake missile PNG."""
from pathlib import Path
from PIL import Image

SRC = Path("/Users/niccomino/.cursor/projects/Users-niccomino-Desktop-siegetactics/assets")
ALT = Path(__file__).resolve().parents[1] / "assets/cupcake-source.png"
OUT = Path(__file__).resolve().parents[1] / "assets/cupcake-missile.png"


def bg_alpha(r, g, b):
    if b > 160 and g > 140 and r < 130:
        cyan_score = min(b, g) - r
        if cyan_score > 80:
            return 255
        if cyan_score > 40:
            return int(255 * (cyan_score - 40) / 40)
    if b > 200 and g > 200 and r < 100:
        return 255
    return 0


def process(src_path, out_path):
    img = Image.open(src_path).convert("RGBA")
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            key = bg_alpha(r, g, b)
            if key >= 255:
                px[x, y] = (r, g, b, 0)
            elif key > 0:
                px[x, y] = (r, g, b, max(0, a - key))
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    img.save(out_path, optimize=True)
    print(f"  {out_path.name} ({img.size[0]}x{img.size[1]})")


def main():
    for name in sorted(SRC.glob("*cupcake*")) + sorted(SRC.glob("*Cupcake*")):
        process(name, OUT)
        return
    if ALT.exists():
        process(ALT, OUT)
        return
    print("Drop cupcake PNG in assets/cupcake-source.png or cursor assets folder")


if __name__ == "__main__":
    main()
