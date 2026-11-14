/**
 * Drawn scenery for the Homeland run. Granny herself is her rig's scooter sprite.
 */

/** @typedef {import('./rigs.js').Rig} Rig */

/** How much of the scooter width the tyres span. */
const TYRES = 0.963;

/** @type {Map<string, HTMLImageElement>} */
const sprites = new Map();

/** @param {string} src */
export function rigSprite(src) {
  let img = sprites.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    sprites.set(src, img);
  }
  return img;
}

/** Screen pixels per sprite pixel, and the middle of the tyres in sprite pixels. @param {Rig} rig @param {number} w */
function fit(rig, w) {
  return { s: (w * TYRES) / (rig.tyres[1] - rig.tyres[0]), mid: (rig.tyres[0] + rig.tyres[1]) / 2 };
}

/**
 * Granny on her rocket-powered mobility scooter, seen from behind.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x Centre of the scooter on screen.
 * @param {number} y Bottom of the wheels on screen.
 * @param {number} w Scooter width in pixels.
 * @param {{ t: number, flame: number, lean: number, rig: Rig }} o flame 1 is idling, up to 1.6 at full speed, 2+ is the dash.
 */
export function drawGranny(ctx, x, y, w, o) {
  const img = rigSprite(o.rig.sprite);
  if (!img.complete || !img.naturalWidth) return;
  const { s, mid } = fit(o.rig, w);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(o.lean * 0.1);
  ctx.drawImage(img, -mid * s, -o.rig.wheelY * s, img.naturalWidth * s, img.naturalHeight * s);
  drawExhaust(ctx, w, o);
  ctx.restore();
}

/**
 * Screen positions of the two rocket nozzles, for sparks to fly from.
 * @param {number} x @param {number} y @param {number} w @param {number} lean @param {Rig} rig
 */
export function exhaustPoints(x, y, w, lean, rig) {
  const { s, mid } = fit(rig, w);
  const cos = Math.cos(lean * 0.1);
  const sin = Math.sin(lean * 0.1);
  const py = (rig.pipeY - rig.wheelY) * s;
  return rig.pipes.map((p) => {
    const px = (p - mid) * s;
    return { x: x + px * cos - py * sin, y: y + px * sin + py * cos };
  });
}

/** @param {CanvasRenderingContext2D} ctx @param {number} w @param {{ t: number, flame: number, rig: Rig }} o */
function drawExhaust(ctx, w, o) {
  const boost = o.flame >= 2;
  const throttle = boost ? 1.9 : o.flame;
  const { s, mid } = fit(o.rig, w);
  const cy = (o.rig.pipeY - o.rig.wheelY) * s;
  const r = o.rig.pipeR * s;
  ctx.globalCompositeOperation = 'lighter';
  o.rig.pipes.forEach((p, i) => {
    const cx = (p - mid) * s;
    const glowR = r * (2.1 + 0.35 * Math.sin(o.t * 33 + i * 2));
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    glow.addColorStop(0, boost ? 'rgba(170, 220, 255, 0.6)' : 'rgba(255, 170, 60, 0.5)');
    glow.addColorStop(1, 'rgba(255, 90, 20, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
    ctx.fill();

    const flicker = 0.82 + 0.12 * Math.sin(o.t * 47 + i * 2.1) + 0.08 * Math.sin(o.t * 113 + i * 4.3) + 0.06 * (Math.random() - 0.5);
    const len = w * 0.22 * throttle * flicker;
    flameTongue(ctx, cx, cy, r * 1.0, len, o.t * 1.0, i, OUTER_FLAME);
    flameTongue(ctx, cx, cy, r * 0.85, len * 0.8, o.t * 1.4, i + 3, OUTER_FLAME);
    flameTongue(ctx, cx, cy, r * 0.55, len * 0.55, o.t * 1.7, i + 7, boost ? BOOST_CORE : CORE_FLAME);
  });
  ctx.globalCompositeOperation = 'source-over';
}

const OUTER_FLAME = [[0, 'rgba(255, 236, 170, 0.9)'], [0.22, 'rgba(255, 170, 40, 0.75)'], [0.6, 'rgba(255, 80, 20, 0.45)'], [1, 'rgba(180, 30, 10, 0)']];
const CORE_FLAME = [[0, 'rgba(255, 255, 255, 1)'], [0.35, 'rgba(255, 244, 170, 0.9)'], [1, 'rgba(255, 190, 60, 0)']];
const BOOST_CORE = [[0, 'rgba(255, 255, 255, 1)'], [0.35, 'rgba(170, 225, 255, 0.95)'], [1, 'rgba(80, 140, 255, 0)']];

/**
 * One wavering tongue of flame pointing down the screen from a nozzle.
 * @param {CanvasRenderingContext2D} ctx @param {number} cx @param {number} cy @param {number} r half-width at the nozzle
 * @param {number} len @param {number} t @param {number} seed @param {(string|number)[][]} stops
 */
function flameTongue(ctx, cx, cy, r, len, t, seed, stops) {
  const steps = 8;
  const left = [];
  const right = [];
  for (let k = 0; k <= steps; k++) {
    const f = k / steps;
    const sway = Math.sin(t * 19 + seed * 1.7 + f * 5) * r * 0.35 * f;
    const half = r * Math.pow(1 - f, 0.7) * (1 + 0.22 * Math.sin(t * 37 + seed * 3.1 + f * 9));
    const y = cy + len * f;
    left.push([cx + sway - half, y]);
    right.push([cx + sway + half, y]);
  }
  const fill = ctx.createLinearGradient(0, cy, 0, cy + len);
  for (const [at, colour] of stops) fill.addColorStop(/** @type {number} */ (at), /** @type {string} */ (colour));
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (const [px, py] of left) ctx.lineTo(px, py);
  for (let k = right.length - 1; k >= 0; k--) ctx.lineTo(right[k][0], right[k][1]);
  ctx.closePath();
  ctx.fill();
}

/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} w @param {number} h @param {number} r */
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A jagged alien boulder. @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y bottom @param {number} w @param {number} h @param {number} seed */
export function drawRock(ctx, x, y, w, h, seed) {
  const pts = 7;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  for (let i = 1; i < pts; i++) {
    const f = i / pts;
    const bump = 0.72 + 0.28 * Math.abs(Math.sin(seed * 12.9 + i * 3.7));
    ctx.lineTo(x - w / 2 + w * f, y - h * Math.sin(f * Math.PI) * bump);
  }
  ctx.lineTo(x + w / 2, y);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, y - h, 0, y);
  g.addColorStop(0, '#8a5cc2');
  g.addColorStop(1, '#3b2160');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(30, 10, 50, 0.6)';
  ctx.lineWidth = Math.max(1, w * 0.03);
  ctx.stroke();
}
