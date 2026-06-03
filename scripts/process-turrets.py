#!/usr/bin/env python3
"""Chroma-key cyan GPT backgrounds from turret PNGs."""
from pathlib import Path
from PIL import Image

SRC = Path("/Users/niccomino/.cursor/projects/Users-niccomino-Desktop-siegetactics/assets")
OUT = Path("/Users/niccomino/Desktop/siegetactics/assets/turrets")

MAPPING = [
    ("ChatGPT_Image_Jun_3__2026__10_22_59_AM__1_-e5105f7a-0934-42e0-b303-2a7c733cc63b.png", "granny-blaster.png"),
    ("ChatGPT_Image_Jun_3__2026__10_22_59_AM__2_-5dda8591-9308-40fb-b41e-0a2f678dfa3b.png", "zap-sprinkler.png"),
    ("ChatGPT_Image_Jun_3__2026__10_22_59_AM__3_-6ed703db-a9f4-4d3d-b8e9-83e9062b6061.png", "boom-gnome.png"),
    ("ChatGPT_Image_Jun_3__2026__10_22_59_AM__4_-440aa33b-a984-436f-8aaa-aa180b1d31cc.png", "plasma-daisy.png"),
    ("ChatGPT_Image_Jun_3__2026__10_22_59_AM__5_-311b2abf-d088-4fbf-ac77-dc868343aa58.png", "rocket-rooster.png"),
    ("ChatGPT_Image_Jun_3__2026__10_22_59_AM__6_-d1ee6968-d691-4ee0-a995-d8c87325f5f9.png", "sonic-slicer.png"),
    ("ChatGPT_Image_Jun_3__2026__10_23_00_AM__7_-f2b2e113-5883-4bf7-a59e-3816d22ed1a7.png", "slime-spitter.png"),
    ("ChatGPT_Image_Jun_3__2026__10_23_00_AM__8_-40eb04de-10a6-4676-b451-53c7d24ae4b5.png", "meteor-mortar.png"),
    ("ChatGPT_Image_Jun_3__2026__10_23_00_AM__9_-a7f751e8-a7d2-43a2-ba6b-4a8721ab3e43.png", "laser-lantern.png"),
    ("ChatGPT_Image_Jun_3__2026__10_23_02_AM__10_-4db8631a-d648-4028-a6f5-214df7e10941.png", "thunder-bucket.png"),
]


def bg_alpha(r, g, b):
    """0 = keep, 255 = remove. Soft edge for cyan backdrop."""
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
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            key = bg_alpha(r, g, b)
            if key >= 255:
                px[x, y] = (r, g, b, 0)
            elif key > 0:
                px[x, y] = (r, g, b, max(0, a - key))

    # Trim empty margins
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, optimize=True)
    print(f"  {out_path.name} ({img.size[0]}x{img.size[1]})")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for src_name, out_name in MAPPING:
        src = SRC / src_name
        if not src.exists():
            print(f"MISSING: {src_name}")
            continue
        process(src, OUT / out_name)


if __name__ == "__main__":
    main()
