#!/usr/bin/env python3
"""Chroma-key cyan background from Granny nuke pose PNG."""
from pathlib import Path
from PIL import Image

SRC = Path("/Users/niccomino/.cursor/projects/Users-niccomino-Desktop-siegetactics/assets")
OUT = Path(__file__).resolve().parents[1] / "assets/granny-nuke.png"
SRC_NAME = "image-a9ab29e3-b320-4454-be41-5ddd4acafed8.png"


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
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, optimize=True)
    print(f"  {out_path.name} ({img.size[0]}x{img.size[1]})")


def main():
    src = SRC / SRC_NAME
    if not src.exists():
        print(f"MISSING: {SRC_NAME}")
        return
    process(src, OUT)


if __name__ == "__main__":
    main()
