#!/usr/bin/env python3
"""Chroma-key cyan background from module art PNGs → assets/topics/{topic-id}.png."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CURSOR_ASSETS = Path("/Users/niccomino/.cursor/projects/Users-niccomino-Desktop-siegetactics/assets")
OUT_DIR = ROOT / "assets/topics"

# Source file → topic id on Home HQ module cards
MODULE_MAP = {
    "ChatGPT_Image_Jun_3__2026__10_47_01_PM__1_-77431073-a8f3-4558-bb4f-b6319c2ce58f.png": "times-tables",
    "ChatGPT_Image_Jun_3__2026__10_47_02_PM__2_-27573737-792d-4f63-8cc6-01db44ca4500.png": "place-value-siege",
    "ChatGPT_Image_Jun_3__2026__10_47_05_PM__5_-8f03f83a-0ef8-4fe2-be5b-fe4cda6728c3.png": "measurement-length",
    "ChatGPT_Image_Jun_3__2026__10_47_04_PM__4_-34ff03b4-f2b7-4473-9f25-494f642f2bba.png": "fractions",
    "ChatGPT_Image_Jun_3__2026__10_47_03_PM__3_-a5828cdd-7ea0-423a-b01a-299ce46ec173.png": "angles",
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
    for name, topic_id in MODULE_MAP.items():
        src = CURSOR_ASSETS / name
        if not src.exists():
            src = ROOT / "assets" / name
        if not src.exists():
            print(f"Missing: {name}")
            continue
        process(src, OUT_DIR / f"{topic_id}.png")
    print("Done.")


if __name__ == "__main__":
    main()
