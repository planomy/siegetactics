#!/usr/bin/env python3
"""Cut a GPT sheet of Alien Homeland monsters into one sprite per alien type.

Usage: python3 scripts/cut-homeland-monsters.py SHEET.png REGION [ROWS]

Sheets are rows of five monsters on a flat light background, left to right: swarmer, grunt,
leaper, spitter, splitter. Sprites land in assets/enemies/REGION/TYPE.webp. With more than one
row (one region per row), REGION is a comma-separated list, one per row, top to bottom.

Only background connected to the edge of the sheet is removed, so pale parts of a monster stay.
Loose bits (slime drips, toe pads) join the nearest monster.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

TYPES = ['swarmer', 'grunt', 'leaper', 'spitter', 'splitter']
SIZE = 320


def cut(sheet, regions, rows):
    a = np.asarray(Image.open(sheet).convert('RGB')).astype(float)
    h, w, _ = a.shape
    edge = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(edge, axis=0)
    near = np.linalg.norm(a - bg, axis=2) < 22
    labels, _ = ndimage.label(near)
    border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    background = np.isin(labels, border[border > 0])
    solid = ndimage.binary_erosion(~ndimage.binary_opening(background, iterations=1), iterations=1)

    parts, n = ndimage.label(solid)
    ids = np.arange(1, n + 1)
    sizes = ndimage.sum(solid, parts, ids)
    centres = np.array(ndimage.center_of_mass(solid, parts, ids))
    count = rows * len(TYPES)
    big = ids[np.argsort(sizes)[::-1][:count]]
    owner = {i: i for i in big}
    reach = np.sqrt(sizes[big - 1].min())
    for i in ids:
        if i not in owner:
            d = np.linalg.norm(centres[big - 1] - centres[i - 1], axis=1)
            if d.min() < reach:
                owner[i] = big[np.argmin(d)]
    lut = np.zeros(n + 1, int)
    for i, o in owner.items():
        lut[i] = o
    monster = lut[parts]

    order = sorted(big, key=lambda i: (int(centres[i - 1][0] / h * rows), centres[i - 1][1]))
    alpha = np.asarray(Image.fromarray(np.where(solid, 255, 0).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7)))
    rgba = np.dstack([a.astype(np.uint8), alpha])

    for r in range(rows):
        row = order[r * len(TYPES):(r + 1) * len(TYPES)]
        folder = os.path.join('assets', 'enemies', regions[r])
        os.makedirs(folder, exist_ok=True)
        for kind, i in zip(TYPES, row):
            mask = monster == i
            ys, xs = np.where(mask)
            y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            piece = rgba[y0:y1, x0:x1].copy()
            piece[..., 3] = np.where(mask[y0:y1, x0:x1], piece[..., 3], 0)
            im = Image.fromarray(piece, 'RGBA')
            pad = int(max(im.size) * 0.02)
            side = max(im.size) + pad * 2
            square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
            square.alpha_composite(im, ((side - im.width) // 2, side - im.height - pad))
            square = square.resize((SIZE, SIZE), Image.LANCZOS) if side > SIZE else square
            out = os.path.join(folder, f'{kind}.webp')
            square.save(out, quality=90, method=6)
            print(f'{out}: {x1 - x0}x{y1 - y0} px on the sheet')


if __name__ == '__main__':
    rows = int(sys.argv[3]) if len(sys.argv) > 3 else 1
    cut(sys.argv[1], sys.argv[2].split(','), rows)
