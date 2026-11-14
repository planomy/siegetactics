/**
 * The parallax sky: layers of galaxies, planets, aurora, passing traffic and cloud banks that
 * slide at different speeds as Granny drives left and right, so the sky feels deep.
 */
import { view, horizonY } from './world.js?v=6';

/** @type {Map<string, HTMLImageElement>} */
const images = new Map();

/** @param {string} name */
function img(name) {
  let im = images.get(name);
  if (!im) {
    im = new Image();
    im.src = `assets/homeland/sky/${name}.webp`;
    images.set(name, im);
  }
  return im;
}

/**
 * Fixed sky pieces. x and y are fractions of the screen, size is a fraction of screen height,
 * depth is how much the piece slides as Granny moves (bigger is nearer).
 */
const BACKDROP = [
  { name: 'galaxy-spiral', x: 0.3, y: 0.09, size: 0.26, depth: 0.02, alpha: 0.45, glow: true },
  { name: 'nebula', x: 0.62, y: 0.06, size: 0.2, depth: 0.025, alpha: 0.5, glow: true },
  { name: 'galaxy-disc', x: 0.08, y: 0.2, size: 0.12, depth: 0.03, alpha: 0.5, glow: true },
  { name: 'aurora-wave', x: 0.5, y: 0.17, size: 0.2, depth: 0.05, alpha: 0.4, glow: true, sway: true },
  { name: 'aurora-curtain', x: 0.14, y: 0.12, size: 0.14, depth: 0.05, alpha: 0.3, glow: true, sway: true },
  { name: 'planet-ringed', x: 0.82, y: 0.14, size: 0.24, depth: 0.06 },
  { name: 'moon-crescent', x: 0.17, y: 0.08, size: 0.08, depth: 0.05 },
  { name: 'moon-small-purple', x: 0.68, y: 0.22, size: 0.045, depth: 0.07 },
  { name: 'moon-small-red', x: 0.72, y: 0.19, size: 0.025, depth: 0.065 },
  { name: 'moon-blue', x: 0.42, y: 0.04, size: 0.03, depth: 0.04 },
];

/** A giant planet sitting low behind the mountains. */
const GIANT = { name: 'planet-giant', x: 0.2, size: 0.2, depth: 0.1 };

/** Things that cross the sky now and then. Speed is screen widths per second. */
const TRAFFIC = [
  { name: 'saucer-formation', size: 0.1, speed: 0.07, bob: 0.004, weight: 3 },
  { name: 'saucer-mid', size: 0.05, speed: 0.09, bob: 0.008, weight: 3 },
  { name: 'saucer-small', size: 0.035, speed: 0.11, bob: 0.008, weight: 3 },
  { name: 'saucer-purple', size: 0.07, speed: 0.06, bob: 0.006, weight: 2 },
  { name: 'saucer-big', size: 0.07, speed: 0.05, bob: 0.005, weight: 1 },
  { name: 'blimp', size: 0.09, speed: 0.025, bob: 0.004, weight: 2, facesLeft: true },
  { name: 'balloon-alien', size: 0.06, speed: 0.018, bob: 0.01, weight: 1, rise: 0.004 },
  { name: 'balloon-striped', size: 0.06, speed: 0.018, bob: 0.01, weight: 1, rise: 0.004 },
  { name: 'satellite', size: 0.07, speed: 0.03, spin: 0.25, weight: 2 },
  { name: 'asteroids', size: 0.08, speed: 0.02, spin: 0.1, weight: 1 },
  { name: 'asteroid-rocks', size: 0.07, speed: 0.025, spin: 0.15, weight: 1 },
  { name: 'comet-blue', size: 0.09, speed: 0.45, fall: 0.18, weight: 2, facesLeft: true },
  { name: 'comet-green', size: 0.08, speed: 0.5, fall: 0.1, weight: 2, facesLeft: true },
  { name: 'meteor-fire', size: 0.08, speed: 0.35, fall: 0.22, weight: 2, facesLeft: true },
  { name: 'meteor-small', size: 0.045, speed: 0.4, fall: 0.2, weight: 1, facesLeft: true },
];

const CLOUD_BANDS = [
  { names: ['cloud-wisp', 'cloud-long', 'cloud-lilac', 'cloud-violet'], count: 7, lift: 0.12, size: 0.05, speed: 0.006, depth: 0.16, alpha: 0.55 },
  { names: ['cloud-bank-pink', 'cloud-bank-purple', 'cloud-big', 'cloud-pink', 'cloud-orange'], count: 6, lift: 0.05, size: 0.09, speed: 0.012, depth: 0.3, alpha: 0.85 },
];

for (const p of [...BACKDROP, GIANT, ...TRAFFIC]) img(p.name);
for (const band of CLOUD_BANDS) band.names.forEach(img);

/**
 * @typedef {{ kind: typeof TRAFFIC[number], x: number, y: number, dir: number, t: number }} Mover
 * @typedef {{ cam: number, movers: Mover[], nextIn: number, clouds: { name: string, u: number, scale: number }[][] }} Sky
 */

/** @returns {Sky} */
export function createSky() {
  return {
    cam: 0,
    movers: [],
    nextIn: 2,
    clouds: CLOUD_BANDS.map((band) => Array.from({ length: band.count }, (_, i) => ({
      name: band.names[i % band.names.length],
      u: (i + Math.random() * 0.6) / band.count,
      scale: 0.75 + Math.random() * 0.5,
    }))),
  };
}

/** @param {Sky} sky @param {number} dt @param {number} granny Granny's x in world units. */
export function updateSky(sky, dt, granny) {
  sky.cam += (granny - sky.cam) * Math.min(1, dt * 3);
  sky.nextIn -= dt;
  if (sky.nextIn <= 0 && sky.movers.length < 3) {
    sky.movers.push(newMover());
    sky.nextIn = 4 + Math.random() * 6;
  }
  for (const m of sky.movers) {
    m.t += dt;
    m.x += m.dir * m.kind.speed * dt;
    if (m.kind.fall) m.y += m.kind.fall * dt;
    if (m.kind.rise) m.y -= m.kind.rise * dt;
  }
  sky.movers = sky.movers.filter((m) => m.x > -0.3 && m.x < 1.3 && m.y < 0.45);
}

function newMover() {
  const total = TRAFFIC.reduce((sum, k) => sum + k.weight, 0);
  let roll = Math.random() * total;
  let kind = TRAFFIC[0];
  for (const k of TRAFFIC) {
    roll -= k.weight;
    if (roll < 0) {
      kind = k;
      break;
    }
  }
  const dir = Math.random() < 0.5 ? -1 : 1;
  return { kind, x: dir > 0 ? -0.2 : 1.2, y: kind.fall ? 0.02 + Math.random() * 0.08 : 0.06 + Math.random() * 0.16, dir, t: 0 };
}

/** How far a layer slides for Granny's position. @param {Sky} sky @param {number} depth */
function slide(sky, depth) {
  return -sky.cam * depth * view.unit;
}

/**
 * @param {CanvasRenderingContext2D} ctx @param {string} name @param {number} x centre @param {number} y centre
 * @param {number} height in pixels @param {{ flip?: boolean, alpha?: number, glow?: boolean, angle?: number }} [o]
 */
function drawSprite(ctx, name, x, y, height, o = {}) {
  const im = img(name);
  if (!im.complete || !im.naturalWidth) return;
  const w = height * (im.naturalWidth / im.naturalHeight);
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  if (o.glow) ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, y);
  if (o.angle) ctx.rotate(o.angle);
  if (o.flip) ctx.scale(-1, 1);
  ctx.drawImage(im, -w / 2, -height / 2, w, height);
  ctx.restore();
}

/** Everything above the clouds: galaxies, aurora, planets, moons and passing traffic. @param {CanvasRenderingContext2D} ctx @param {Sky} sky @param {number} t */
export function drawSkyLayers(ctx, sky, t) {
  const H = view.h;
  for (const p of BACKDROP) {
    const sway = p.sway ? Math.sin(t * 0.4 + p.x * 9) * H * 0.01 : 0;
    const alpha = p.sway ? (p.alpha ?? 1) * (0.75 + 0.25 * Math.sin(t * 0.7 + p.x * 5)) : p.alpha;
    drawSprite(ctx, p.name, p.x * view.w + slide(sky, p.depth), p.y * H + sway, p.size * H, { alpha, glow: p.glow });
  }
  for (const m of sky.movers) {
    const k = m.kind;
    const bob = k.bob ? Math.sin(m.t * 2.2) * k.bob * H : 0;
    const flip = k.facesLeft ? m.dir > 0 : false;
    drawSprite(ctx, k.name, m.x * view.w + slide(sky, 0.12), m.y * H + bob, k.size * H, { flip, angle: k.spin ? m.t * k.spin : 0 });
  }
  const gx = GIANT.x * view.w + slide(sky, GIANT.depth);
  drawSprite(ctx, GIANT.name, gx, horizonY(gx) - view.h * 0.07, GIANT.size * H, { alpha: 0.8 });
}

/** One band of clouds, drifting sideways and wrapping round. @param {CanvasRenderingContext2D} ctx @param {Sky} sky @param {number} band @param {number} t */
export function drawCloudBand(ctx, sky, band, t) {
  const spec = CLOUD_BANDS[band];
  const span = view.w * 1.4;
  for (const c of sky.clouds[band]) {
    const raw = c.u * span + t * spec.speed * view.w + slide(sky, spec.depth);
    const x = ((raw % span) + span) % span - view.w * 0.2;
    drawSprite(ctx, c.name, x, horizonY(x) - view.h * spec.lift, spec.size * view.h * c.scale, { alpha: spec.alpha });
  }
}

/** How far the mountain ranges slide, as a fraction of screen width. @param {Sky} sky @param {number} depth */
export function mountainSlide(sky, depth) {
  return slide(sky, depth) / view.w;
}
