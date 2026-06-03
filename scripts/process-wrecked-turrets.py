#!/usr/bin/env python3
"""Chroma-key cyan backgrounds from wrecked turret PNGs."""
from pathlib import Path
from PIL import Image

SRC = Path("/Users/niccomino/.cursor/projects/Users-niccomino-Desktop-siegetactics/assets")
OUT = Path("/Users/niccomino/Desktop/siegetactics/assets/turrets/wrecked")

MAPPING = [
    ("ChatGPT_Image_Jun_3__2026__11_21_28_AM__1_-a3f2d404-9ab2-49e0-9cd2-29002b9306cb.png", "granny-blaster.png"),
    ("ChatGPT_Image_Jun_3__2026__11_21_29_AM__2_-f7fa52a1-d8eb-410d-802d-b579a3693135.png", "zap-sprinkler.png"),
    ("ChatGPT_Image_Jun_3__2026__11_21_29_AM__3_-94d7dadc-1502-49e3-a1b7-163c408138d8.png", "boom-gnome.png"),
    ("ChatGPT_Image_Jun_3__2026__11_21_29_AM__4_-1f9a7c01-e786-4547-9439-562493ffc50c.png", "plasma-daisy.png"),
    ("ChatGPT_Image_Jun_3__2026__11_21_29_AM__5_-5e120863-0cc2-4360-9bee-582899c8819f.png", "rocket-rooster.png"),
    ("ChatGPT_Image_Jun_3__2026__11_21_30_AM__6_-c9e6acab-19bc-4fd9-919c-e87cca819c5e.png", "sonic-slicer.png"),
    ("ChatGPT_Image_Jun_3__2026__11_21_30_AM__7_-f8e55ced-051b-48a5-ad6b-ff719e2cea60.png", "slime-spitter.png"),
    ("ChatGPT_Image_Jun_3__2026__11_21_31_AM__8_-b545d606-a2e7-41c1-a709-d32ad64fe847.png", "meteor-mortar.png"),
    ("ChatGPT_Image_Jun_3__2026__11_21_31_AM__9_-204ec214-209f-411c-9bd8-ed74fc2b3271.png", "laser-lantern.png"),
    ("ChatGPT_Image_Jun_3__2026__11_21_31_AM__10_-15283274-1a69-4e28-9b07-cd4121f17fb6.png", "thunder-bucket.png"),
    ("ChatGPT_Image_Jun_3__2026__03_21_28_PM__1_-827a17e9-552d-4038-af5f-b0b0242143e7.png", "repair-shed.png"),
    ("ChatGPT_Image_Jun_3__2026__03_21_28_PM__2_-1d09f12c-b1e7-4319-8401-f166198c2ff3.png", "xp-magnet.png"),
    ("ChatGPT_Image_Jun_3__2026__03_21_28_PM__3_-9c516458-51fa-49cd-aa11-a2349c990aab.png", "glue-goo.png"),
    ("ChatGPT_Image_Jun_3__2026__03_21_28_PM__4_-ca5f050d-da1c-423e-8b05-e3c04db47e17.png", "freeze-fridge.png"),
    ("ChatGPT_Image_Jun_3__2026__03_21_28_PM__5_-b17d3473-119c-40e8-9410-0a269122fdac.png", "decoy-gnome.png"),
]


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
    w, h = img.size
    for y in range(h):
        for x in range(w):
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
    for src_name, out_name in MAPPING:
        src = SRC / src_name
        if not src.exists():
            print(f"MISSING: {src_name}")
            continue
        process(src, OUT / out_name)


if __name__ == "__main__":
    main()
