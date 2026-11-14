#!/usr/bin/env python3
"""Cut a GPT picture of one Alien Homeland boss into a transparent sprite.

Usage: python3 scripts/cut-homeland-boss.py SHEET.png REGION

The boss sits on a flat light background. Only background connected to the edge is removed, so
pale parts of the ship stay; detached bits (smoke puffs, slime drips) are kept, specks are dropped.
The sprite lands in assets/enemies/bosses/REGION.webp.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

WIDTH = 960


def cut(sheet, region):
    a = np.asarray(Image.open(sheet).convert('RGB')).astype(float)
    edge = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(edge, axis=0)
    near = np.linalg.norm(a - bg, axis=2) < 22
    labels, _ = ndimage.label(near)
    border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    background = np.isin(labels, border[border > 0])
    dist = np.linalg.norm(a - bg, axis=2)
    holes, m = ndimage.label(near & ~background)
    if m:
        ids = np.arange(1, m + 1)
        flat = (ndimage.sum(near, holes, ids) > 300) & (ndimage.mean(dist, holes, ids) < 10)
        background |= np.isin(holes, ids[flat])
    solid = ndimage.binary_erosion(~ndimage.binary_opening(background, iterations=1), iterations=1)

    parts, n = ndimage.label(solid)
    sizes = ndimage.sum(solid, parts, np.arange(1, n + 1))
    solid = np.isin(parts, np.flatnonzero(sizes > 150) + 1)

    ys, xs = np.where(solid)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    alpha = np.asarray(Image.fromarray(np.where(solid, 255, 0).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7)))
    im = Image.fromarray(np.dstack([a.astype(np.uint8), alpha])[y0:y1, x0:x1], 'RGBA')
    if im.width > WIDTH:
        im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
    folder = os.path.join('assets', 'enemies', 'bosses')
    os.makedirs(folder, exist_ok=True)
    out = os.path.join(folder, f'{region}.webp')
    im.save(out, quality=90, method=6)
    print(f'{out}: {im.width}x{im.height}')


if __name__ == '__main__':
    cut(sys.argv[1], sys.argv[2])
