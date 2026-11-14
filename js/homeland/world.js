/**
 * The camera and the curved planet surface.
 *
 * Positions are in world units: x across the screen, z distance ahead of the camera, y height
 * above the ground. On top of normal perspective, the ground drops away by (SIDE_CURVE·x² + z²) / 2R, so
 * the surface bends over a curved horizon and anything far enough away is hidden behind the
 * planet. Aliens come into view by cresting that curve.
 */

export const view = { w: 0, h: 0, cx: 0, h0: 0, a: 0, k: 0, unit: 0 };

/** How much the planet curves away to the left and right, compared with straight ahead. Lower is a flatter horizon. */
const SIDE_CURVE = 0.22;

/** @param {number} w @param {number} h */
export function resizeView(w, h) {
  view.w = w;
  view.h = h;
  view.cx = w / 2;
  view.unit = Math.min(w * 0.32, h * 0.62);
  // Tuned so the horizon sits about 36% down the middle of the screen, and ground about
  // 8 units away is the furthest you can see before it curves out of sight.
  view.k = h * 0.01403;
  view.h0 = h * 0.1356;
  view.a = h * 0.898;
}

/** @param {number} x @param {number} y @param {number} z */
export function project(x, y, z) {
  const s = 1 / z;
  return {
    x: view.cx + x * view.unit * s,
    y: view.h0 + view.a * s + view.k * (SIDE_CURVE * x * x + z * z) * s - y * view.unit * s,
    s,
  };
}

/** Screen height of the horizon at screen column `sx`. @param {number} sx */
export function horizonY(sx) {
  const q = ((sx - view.cx) / view.unit) ** 2;
  return view.h0 + 2 * Math.sqrt(view.a * view.k * (1 + SIDE_CURVE * q));
}

/** True when a ground point is round the curve of the planet, out of sight. @param {number} x @param {number} z */
export function isBehindHorizon(x, z) {
  return view.k * (SIDE_CURVE * x * x + z * z) > view.a;
}

/** The ground point under a screen position (clamped to the visible ground). @param {number} sx @param {number} sy */
export function screenToGround(sx, sy) {
  const q = ((sx - view.cx) / view.unit) ** 2;
  const a2 = view.k * (1 + SIDE_CURVE * q);
  const b = sy - view.h0;
  const disc = b * b - 4 * a2 * view.a;
  const z = disc < 0 ? Math.sqrt(view.a / a2) : (b - Math.sqrt(disc)) / (2 * a2);
  return { x: ((sx - view.cx) * z) / view.unit, z };
}

/**
 * A spot just behind the horizon somewhere across the screen, for aliens to appear from.
 * @param {number} across 0 is the left edge of the screen, 1 the right edge.
 * @param {number} [beyond] How far behind the curve, as a multiple of the horizon distance.
 */
export function spawnBehindHorizon(across, beyond = 1.18) {
  const sx = view.w * (-0.08 + across * 1.16);
  const q = ((sx - view.cx) / view.unit) ** 2;
  const z = Math.sqrt(view.a / (view.k * (1 + SIDE_CURVE * q))) * beyond;
  return { x: ((sx - view.cx) * z) / view.unit, z };
}

/** How far left or right Granny can drive at distance z and stay on screen. @param {number} z */
export function maxXAt(z) {
  return (0.44 * view.w * z) / view.unit;
}
