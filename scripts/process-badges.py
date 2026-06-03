#!/usr/bin/env python3
"""Chroma-key cyan background from military badge PNGs → assets/badges/badge-N.png."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CURSOR_ASSETS = Path("/Users/niccomino/.cursor/projects/Users-niccomino-Desktop-siegetactics/assets")
OUT_DIR = ROOT / "assets/badges"

# Source filename suffix → badge tier (stars on shield)
BADGE_MAP = {
    "ChatGPT_Image_Jun_3__2026__02_08_54_PM__1_-60001f23-f47f-49fb-9449-e9556a439072.png": 1,
    "ChatGPT_Image_Jun_3__2026__02_08_54_PM__3_-b8fbe4bd-13e2-4ef5-a139-1b1b08489bf3.png": 2,
    "ChatGPT_Image_Jun_3__2026__02_08_54_PM__2_-cf37ba09-5367-4c53-a664-10385ca9a27f.png": 3,
    "ChatGPT_Image_Jun_3__2026__02_08_54_PM__5_-6e5c1e64-8296-42fb-be3b-3f2023fa46be.png": 4,
    "ChatGPT_Image_Jun_3__2026__02_08_54_PM__4_-6ff11800-3641-4325-8398-7bf4aa98cf5e.png": 5,
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
    print(f"  badge-{out_path.stem.split('-')[-1] if 'badge' in out_path.name else '?'}: {out_path.name} ({img.size[0]}x{img.size[1]})")


def main():
    for name, level in BADGE_MAP.items():
        src = CURSOR_ASSETS / name
        if not src.exists():
            src = ROOT / "assets" / name
        if not src.exists():
            print(f"Missing: {name}")
            continue
        process(src, OUT_DIR / f"badge-{level}.png")
    print("Done.")


if __name__ == "__main__":
    main()
