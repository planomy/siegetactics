#!/usr/bin/env python3
"""Cut the art for a framed Alien Homeland region.

  frame SRC OUT   Removes the flat magenta opening from a 16:9 frame painting. Add --steam when
                  smoke or steam was painted over the magenta, to turn its pink tint back to white.
  scene SRC OUT   Crops a distant landscape at its horizon, so its bottom edge sits on the floor line.

Frames are painted with the opening filled with pure #FF00FF. Only big, flat patches of near-pure
magenta are cut, so magenta details and shaded pink or purple parts of the painting survive.
"""
import sys

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage


def frame(src, out):
    f = np.asarray(Image.open(src).convert('RGB')).astype(int)
    h, w, _ = f.shape
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    mag = (r > 170) & (b > 170) & (g < 110) & (np.abs(r - b) < 70)
    lab, n = ndimage.label(mag)
    ids = range(1, n + 1)
    sizes = ndimage.sum(mag, lab, ids)
    off = np.sqrt((255 - r) ** 2 + g ** 2 + (255 - b) ** 2)
    offs = ndimage.mean(off, lab, ids)
    keep = ndimage.binary_fill_holes(np.isin(lab, [i for i, s, o in zip(ids, sizes, offs) if s > 300 and o < 40]))
    cut = ndimage.binary_dilation(keep, iterations=2) | (off < 50)
    alpha = np.asarray(Image.fromarray(np.where(cut, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)))
    band = ndimage.binary_dilation(cut, iterations=4) & ~cut
    rgb = f.copy()
    pink = band & (r > g + 40) & (b > g + 40)
    rgb[pink, 0] = np.minimum(r[pink], g[pink] + 40)
    rgb[pink, 2] = np.minimum(b[pink], g[pink] + 60)
    if '--steam' in sys.argv:
        near = ndimage.binary_dilation(cut, iterations=40) & (r > g + 25) & (b > g + 3)
        grey = f[near].mean(1, keepdims=True) * 1.1
        rgb[near] = np.repeat(grey, 3, 1)
    # Hidden pixels take the colour of the nearest visible one, so no magenta bleeds into the edges.
    _, (iy, ix) = ndimage.distance_transform_edt(cut, return_indices=True)
    rgb = rgb[iy, ix]
    Image.fromarray(np.dstack([rgb.clip(0, 255).astype(np.uint8), alpha]), 'RGBA').save(out, quality=88, method=6)
    print(f'{out}: {w}x{h}, opening {keep.sum() / keep.size:.0%} of the frame')
    for y in range(0, h, h // 12):
        xs = np.where(keep[y])[0]
        if len(xs):
            print(f'  {y / h:4.0%} down: sides {xs.min() / w:.0%} / {1 - xs.max() / w:.0%}')


def scene(src, out):
    im = Image.open(src).convert('RGB')
    s = np.asarray(im).astype(float)
    h, w, _ = s.shape
    lum = s[:, w // 5: w * 4 // 5].mean(2).mean(1)
    floor = np.median(lum[-h // 12:])
    y = h - 1
    while y > h // 2 and lum[y] < floor * 1.6 + 8:
        y -= 1
    bottom = min(h, y + 6)
    im.crop((0, 0, w, bottom)).save(out, quality=86, method=6)
    print(f'{out}: {w}x{bottom} (horizon at row {y} of {h})')


if __name__ == '__main__':
    {'frame': frame, 'scene': scene}[sys.argv[1]](sys.argv[2], sys.argv[3])
