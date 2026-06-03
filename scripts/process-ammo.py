#!/usr/bin/env python3
"""Split ammo sprite sheet, remove checkerboard, export per-turret PNGs."""
from pathlib import Path
from PIL import Image

SRC = Path(__file__).resolve().parents[1] / "assets/ammo-sheet.png"
OUT = Path(__file__).resolve().parents[1] / "assets/ammo"

# Top row L→R, then bottom row L→R (matches sheet labels)
NAMES = [
    "granny-blaster",
    "zap-sprinkler",
    "boom-gnome",
    "plasma-daisy",
    "rocket-rooster",
    "sonic-slicer",
    "slime-spitter",
    "meteor-mortar",
    "laser-lantern",
    "thunder-bucket",
]


def is_checker(r, g, b):
    """Gray/white checkerboard backdrop."""
    if abs(r - g) < 12 and abs(g - b) < 12:
        if r > 175:
            return True
        if 115 < r < 175:
            return True
    return False


def process_cell(cell: Image.Image) -> Image.Image:
    img = cell.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if is_checker(r, g, b):
                px[x, y] = (r, g, b, 0)
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    return img


def main():
    src = SRC
    if not src.exists():
        raise SystemExit(f"Missing ammo sheet: {src}")

    sheet = Image.open(src)
    w, h = sheet.size
    cols, rows = 5, 2
    # Crop off label strip at bottom of each cell (~18% height)
    cell_w = w // cols
    cell_h = h // rows
    icon_h = int(cell_h * 0.82)

    OUT.mkdir(parents=True, exist_ok=True)
    idx = 0
    for row in range(rows):
        for col in range(cols):
            left = col * cell_w
            top = row * cell_h
            cell = sheet.crop((left, top, left + cell_w, top + icon_h))
            out = process_cell(cell)
            name = NAMES[idx]
            path = OUT / f"{name}.png"
            out.save(path, optimize=True)
            print(f"  {path.name} ({out.size[0]}x{out.size[1]})")
            idx += 1


if __name__ == "__main__":
    main()
