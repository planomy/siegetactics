/**
 * Normalized layout for assets/field.png (1024×576, no baked pad circles).
 * 6 dirt paths · 6 grass lanes · invisible placement grid along each lane.
 */

const PLAY_TOP = 0.168;
const PLAY_BOTTOM = 0.82;

/** @param {number[]} enemyPathY */
function computeTurretRowY(enemyPathY) {
  /** @type {number[]} */
  const rows = [(PLAY_TOP + enemyPathY[0]) / 2];
  for (let i = 0; i < enemyPathY.length - 1; i++) {
    rows.push((enemyPathY[i] + enemyPathY[i + 1]) / 2);
  }
  rows.push((enemyPathY[enemyPathY.length - 1] + PLAY_BOTTOM) / 2);
  return rows;
}

/** @param {number[]} enemyPathY @param {number[]} turretRowY */
function computeGrassBands(enemyPathY, turretRowY) {
  /** @type {{ top: number, bottom: number, center: number }[]} */
  const bands = [];
  for (let row = 0; row < turretRowY.length; row++) {
    if (row === 0) {
      bands.push({
        top: PLAY_TOP,
        bottom: (enemyPathY[0] + turretRowY[0]) / 2,
        center: turretRowY[0],
      });
    } else if (row === turretRowY.length - 1) {
      const lastPath = enemyPathY.length - 1;
      bands.push({
        top: (enemyPathY[lastPath - 1] + turretRowY[row]) / 2,
        bottom:
          lastPath > row
            ? (enemyPathY[lastPath] + PLAY_BOTTOM) / 2
            : PLAY_BOTTOM,
        center: turretRowY[row],
      });
    } else {
      bands.push({
        top: (enemyPathY[row - 1] + turretRowY[row]) / 2,
        bottom: (enemyPathY[row] + turretRowY[row]) / 2,
        center: turretRowY[row],
      });
    }
  }
  return bands;
}

const ENEMY_PATH_Y = [0.2378, 0.3299, 0.4288, 0.5295, 0.6337, 0.7297];
/** Per-lane Y nudge (rows 2–5 from top, 0-indexed 1–4). */
const ROW_Y_NUDGE = [0, 0.022, 0.026, 0.028, 0.024, 0];
/** Grass rows stay calibrated to the first five path midpoints + bottom porch band. */
const TURRET_ROW_Y = computeTurretRowY(ENEMY_PATH_Y.slice(0, 5)).map((y, i) => y + ROW_Y_NUDGE[i]);

const PATH_START_X = 0.12;
const PATH_END_X = 0.96;
/** Former 8-col grid: keep old columns 2–7 (1-based) at the same X. */
const GRID_COL_X = Array.from({ length: 6 }, (_, i) =>
  PATH_START_X + ((i + 2) * (PATH_END_X - PATH_START_X)) / 9
);

export const FIELD_LAYOUT = {
  ENEMY_PATHS: 6,
  TURRET_ROWS: 6,
  /** Slots per grass lane (cols 2–7 of the old 8-wide grid). */
  GRID_COLS: 6,
  /** @deprecated use GRID_COLS */
  PADS_PER_ROW: 6,
  enemyPathY: ENEMY_PATH_Y,
  turretRowY: TURRET_ROW_Y,
  grassBandY: computeGrassBands(ENEMY_PATH_Y, TURRET_ROW_Y),
  gridColX: GRID_COL_X,
  padOffsetX: 0,
  padOffsetY: 0,
  turretAnchorY: 0.91,
  /** Right edge of Granny sprite at porch stair base; she faces left (flipX). */
  grannyPorch: {
    rightX: 0.93,
    baseY: 0.528,
    flipX: true,
    /** Barrel opening on granny-porch.png (unflipped source, 0–1). */
    muzzle: { x: 0.38, y: 0.07 },
  },
  /** Standing nuke pose when Fire nukes is active (faces left, no flip). */
  grannyNuke: {
    rightX: 0.905,
    baseY: 0.545,
    flipX: false,
    heightScale: 0.21,
    /** Launcher muzzle on granny-nuke.png (unflipped, 0–1). */
    muzzle: { x: 0.1, y: 0.36 },
  },
  pathStartX: PATH_START_X,
  pathEndX: PATH_END_X,
  /** Alien spawn portal (left side of field.png) — VFX overlay anchor. */
  alienPortal: {
    cx: 0.048,
    cy: 0.43,
    radius: 0.092,
    socketCount: 8,
    /** Socket indices that pulse dim (charging up). */
    inactiveSockets: [5, 6],
  },
};

/** Dirt paths a turret row can fire at (row sits on grass between/adjacent paths). */
export function targetPathsForRow(row) {
  const { ENEMY_PATHS } = FIELD_LAYOUT;
  const paths = new Set();
  if (row < ENEMY_PATHS) paths.add(row);
  if (row > 0) paths.add(row - 1);
  if (row >= ENEMY_PATHS) paths.add(ENEMY_PATHS - 1);
  return paths;
}
