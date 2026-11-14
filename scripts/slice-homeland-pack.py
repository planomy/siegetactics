"""Slice a GPT scenery pack for Alien Homeland into WebP props.

Packs are laid out as a clean grid on a transparent background. Every separate piece of the sheet
(pebbles, steam puffs and all) belongs to the grid cell its centre falls in.

Usage: python3 scripts/slice-homeland-pack.py [--alpha=N] SHEET.png PREFIX ROWS COLS name1 name2 ...
Names run left to right, top to bottom; files land in assets/homeland/props/PREFIX-NAME.webp.
--alpha=N treats anything fainter than N as background and clears it, for sheets that come back
with a faint haze instead of a clean transparent background.
--matte is for sheets where the "transparent" background was painted in (a fake checkerboard,
smudges behind each object). It flood-fills from the gaps between cells through anything that
looks like that background, stopping at the objects' dark outlines. --matte=N widens (or narrows)
how far from the background colour still counts as background; the default is 45.
--flow is for rows that don't sit on the grid (one oversized piece shoving the rest along): each
row's `cols` biggest objects are taken left to right, and loose fragments join the nearest one.
--split=N cuts neighbours apart where they touch: near every grid line it finds the thinnest
crossing, and if no more than N pixels of artwork cross there it clears a narrow strip.
"""
import sys

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage


def remove_painted_background(a, rows, cols, reach=45):
    h, w = a.shape[:2]
    rgb = a[:, :, :3].astype(float)
    lum = rgb @ np.array([0.299, 0.587, 0.114])
    sat = rgb.max(2) - rgb.min(2)
    gaps = np.zeros((h, w), bool)
    for r in range(rows + 1):
        y = min(h - 1, int(r * h / rows))
        gaps[max(0, y - 4):y + 4, :] = True
    for c in range(cols + 1):
        x = min(w - 1, int(c * w / cols))
        gaps[:, max(0, x - 4):x + 4] = True
    smudge = np.median(rgb[gaps & (lum < 110)], axis=0)
    pale = (lum > 150) & (sat < 40)
    candidate = (np.linalg.norm(rgb - smudge, axis=2) < reach) | pale
    labels, _ = ndimage.label(candidate)
    touching = np.unique(labels[gaps & candidate])
    background = np.isin(labels, touching[touching > 0]) | pale
    keep = ~ndimage.binary_opening(background, iterations=1)
    holes, count = ndimage.label(ndimage.binary_fill_holes(keep) & ~keep)
    small = np.flatnonzero(ndimage.sum(np.ones_like(keep), holes, range(1, count + 1)) < 800) + 1
    keep |= np.isin(holes, small)
    alpha = Image.fromarray(np.where(keep, 255, 0).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    out = a.copy()
    out[:, :, 3] = np.array(alpha)
    return out


args = sys.argv[1:]
cut = 12
matte = False
flow = False
split = 0
while args and args[0].startswith('--'):
    flag = args.pop(0)
    if flag.startswith('--alpha='):
        cut = int(flag.split('=')[1])
    elif flag.startswith('--matte'):
        matte = int(flag.split('=')[1]) if '=' in flag else 45
    elif flag == '--flow':
        flow = True
    elif flag.startswith('--split='):
        split = int(flag.split('=')[1])
sheet, prefix, rows, cols, *names = args
rows, cols = int(rows), int(cols)
if len(names) != rows * cols:
    sys.exit(f'need {rows * cols} names, got {len(names)}')

a = np.array(Image.open(sheet).convert('RGBA'))
if matte:
    a = remove_painted_background(a, rows, cols, matte)
solid = a[:, :, 3] > cut
h, w = solid.shape
if split:
    ch, cw = h / rows, w / cols
    for r in range(rows):
        y0, y1 = int(r * ch), int((r + 1) * ch)
        for c in range(1, cols):
            lo, hi = int(c * cw - 0.15 * cw), int(c * cw + 0.15 * cw)
            density = solid[y0:y1, lo:hi].sum(0)
            x = lo + int(density.argmin())
            if 0 < density.min() <= split:
                solid[y0:y1, x - 3:x + 4] = False
    for c in range(cols):
        x0, x1 = int(c * cw), int((c + 1) * cw)
        for r in range(1, rows):
            lo, hi = int(r * ch - 0.15 * ch), int(r * ch + 0.15 * ch)
            density = solid[lo:hi, x0:x1].sum(1)
            y = lo + int(density.argmin())
            if 0 < density.min() <= split:
                solid[y - 3:y + 4, x0:x1] = False
raw, n = ndimage.label(ndimage.binary_dilation(solid, iterations=2))
cell = np.full(n + 1, -1)
centres = ndimage.center_of_mass(solid, raw, range(1, n + 1))
if flow:
    sizes = ndimage.sum(solid, raw, range(1, n + 1))
    for r in range(rows):
        row = [i for i in range(n) if min(rows - 1, int(centres[i][0] / (h / rows))) == r]
        mains = sorted(sorted(row, key=lambda i: -sizes[i])[:cols], key=lambda i: centres[i][1])
        if len(mains) < cols:
            sys.exit(f'row {r} has only {len(mains)} objects')
        for i in row:
            nearest = min(mains, key=lambda m: np.hypot(*np.subtract(centres[i], centres[m])))
            cell[i + 1] = r * cols + mains.index(nearest)
else:
    for i, (cy, cx) in enumerate(centres, 1):
        cell[i] = min(rows - 1, int(cy / (h / rows))) * cols + min(cols - 1, int(cx / (w / cols)))
labels = cell[raw]
labels[raw == 0] = -1

for c, name in enumerate(names):
    ys, xs = np.nonzero(labels == c)
    if not len(ys):
        sys.exit(f'cell {c} ({name}) is empty')
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    crop = a[y0:y1, x0:x1].copy()
    crop[:, :, 3] = np.where((labels[y0:y1, x0:x1] == c) & solid[y0:y1, x0:x1], crop[:, :, 3], 0)
    out = Image.fromarray(crop)
    out.thumbnail((420, 420), Image.LANCZOS)
    out.save(f'assets/homeland/props/{prefix}-{name}.webp', 'WEBP', quality=82, method=4)
    print(f'{prefix}-{name}', out.size)
