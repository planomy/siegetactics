#!/usr/bin/env python3
"""Cut the 17 GPT palace characters (magenta studio BG) into transparent webps.

Usage (from repo root):
  python3 scripts/cut-palace-roster.py

Reads the named PNGs from ~/Downloads and writes:
  assets/enemies/palace/{id}.webp
  assets/enemies/bosses/palace.webp  (crowned slug)
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

DL = Path.home() / 'Downloads'
OUT = Path('assets/enemies/palace')
BOSS = Path('assets/enemies/bosses')

ASSETS = [
    ('slug', "Doompickle’s Crowned Slug Boss-3.png", 960, True),
    ('crane-truck', "Violet Crane-Truck Robot Boss-2.png", 420, False),
    ('disco-diesel', "Disco Diesel, the Bus Queen-1.png", 420, False),
    ('grumble-dozer', "Grumble Dozer_ Cartoon Bulldozer Boss-4.png", 420, False),
    ('rally-rita', "Rally Rita, Cobalt Car-Bot Boss-3.png", 420, False),
    ('sir-honks', "Sir Honks, the Royal Fire Knight-2.png", 420, False),
    ('tow-wrestler', "Yellow Tow-Truck Wrestler Boss-1.png", 420, False),
    ('ladybug', "Goofy mechanized ladybug palace guard-4.png", 360, False),
    ('trex', "Goofy Lime-Green Mechanized T-Rex Guard-3.png", 380, False),
    ('chook', "Goofy Mechanised Chook Palace Guard-2.png", 360, False),
    ('hamburger', "Goofy mechanized hamburger palace guard-1.png", 340, False),
    ('toastinator', "The Toastinator-6.png", 360, False),
    ('beep-boffin', "Beep Boffin, the Suction-Dart Robot-5.png", 360, False),
    ('short-circuit-sid', "Short Circuit Sid, Spark-Blasting Mechanic-4.png", 360, False),
    ('sir-clanks', "Sir Clanks-a-Lot, Brass Palace Brawler-3.png", 380, False),
    ('shock-bot', "Frightened Treaded Shock Robot-2.png", 360, False),
    ('robo-copier', "Robo-Copier_ Vintage Toner Siege Bot-1.png", 340, False),
]


def cut(path: Path, max_w: int) -> Image.Image:
    a = np.asarray(Image.open(path).convert('RGB')).astype(float)
    edge = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(edge, axis=0)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    magenta = (r > 180) & (b > 180) & (g < 140) & (r + b > g * 2.4)
    near = (np.linalg.norm(a - bg, axis=2) < 28) | magenta
    labels, _ = ndimage.label(near)
    border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    background = np.isin(labels, border[border > 0])
    dist = np.linalg.norm(a - bg, axis=2)
    holes, m = ndimage.label(near & ~background)
    if m:
        ids = np.arange(1, m + 1)
        flat = (ndimage.sum(near, holes, ids) > 300) & (ndimage.mean(dist, holes, ids) < 14)
        background |= np.isin(holes, ids[flat])
    solid = ndimage.binary_erosion(~ndimage.binary_opening(background, iterations=1), iterations=1)
    parts, n = ndimage.label(solid)
    if n:
        sizes = ndimage.sum(solid, parts, np.arange(1, n + 1))
        solid = np.isin(parts, np.flatnonzero(sizes > 200) + 1)
    ys, xs = np.where(solid)
    if len(ys) < 50:
        raise RuntimeError(f'cut failed for {path.name}')
    y0, y1, x0, x1 = int(ys.min()), int(ys.max() + 1), int(xs.min()), int(xs.max() + 1)
    alpha = np.asarray(
        Image.fromarray(np.where(solid, 255, 0).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
    )
    im = Image.fromarray(np.dstack([a.astype(np.uint8), alpha])[y0:y1, x0:x1], 'RGBA')
    arr = np.asarray(im).astype(np.float32)
    rr, gg, bb, aa = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    fringe = (rr > 170) & (bb > 170) & (gg < 150) & (aa > 0)
    arr[:, :, 3] = np.where(fringe & (aa < 220), 0, aa)
    im = Image.fromarray(arr.astype(np.uint8), 'RGBA')
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    return im


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    BOSS.mkdir(parents=True, exist_ok=True)
    for id_, name, max_w, is_boss in ASSETS:
        src = DL / name
        if not src.exists():
            raise SystemExit(f'missing: {src}')
        im = cut(src, max_w)
        dest = BOSS / 'palace.webp' if is_boss else OUT / f'{id_}.webp'
        im.save(dest, quality=90, method=6)
        print(f'{dest}: {im.width}x{im.height}')


if __name__ == '__main__':
    main()
