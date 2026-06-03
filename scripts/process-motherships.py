#!/usr/bin/env python3
"""Chroma-key cyan background from mothership PNGs → assets/enemies/mothership2–4.png."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CURSOR_ASSETS = Path("/Users/niccomino/.cursor/projects/Users-niccomino-Desktop-siegetactics/assets")
OUT_DIR = ROOT / "assets/enemies"

MOTHERSHIP_MAP = {
    "ChatGPT_Image_Jun_3__2026__11_18_03_PM__1_-20cbdec1-cb75-43f7-a13a-473b36355a48.png": "mothership2.png",
    "ChatGPT_Image_Jun_3__2026__11_18_03_PM__2_-a4cd8ab4-aefd-4219-b0da-26e93510b1ea.png": "mothership3.png",
    "ChatGPT_Image_Jun_3__2026__11_18_03_PM__3_-571ecdf7-1f8a-4a4b-b420-252cbbac53f5.png": "mothership4.png",
}


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
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    img.save(out_path, optimize=True)
    print(f"  {out_path.name}: {img.size[0]}x{img.size[1]}")


def main():
    for name, out_name in MOTHERSHIP_MAP.items():
        src = CURSOR_ASSETS / name
        if not src.exists():
            src = ROOT / "assets" / name
        if not src.exists():
            print(f"Missing: {name}")
            continue
        process(src, OUT_DIR / out_name)
    print("Done.")


if __name__ == "__main__":
    main()
