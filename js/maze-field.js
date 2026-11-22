import { onSiegeMapChange } from './siege-map-selection.js';
import { backyardPreviewMap, isBackyardPreviewObstacle, isBackyardPreviewReserved } from './backyard-preview-maps.js?v=20261122live1';
import { CROW_WAR_PREVIEW, CROW_WAR_GATES, isCrowWarObstacle } from './crow-war-preview.js?v=20261122live1';
import { BIRTHDAY_RUCKUS_PREVIEW, BIRTHDAY_RUCKUS_GATES, isCoasterCrossing, isBirthdayRuckusObstacle } from './birthday-ruckus-preview.js?v=20261122live1';
import { FIVE_BRIDGES_PREVIEW, FIVE_BRIDGES_GATES, fiveBridgesDeck, isFiveBridgesObstacle } from './five-bridges-preview.js?v=20261122live1';
import { FLOOD_PREVIEW, FLOOD_ROUTES } from './flood-preview.js?v=20261122live1';
import { isOutsideCuratedLawn } from './curated-grid.js';
import { SANDCASTLE_PREVIEW, SANDCASTLE_ROUTES } from './sandcastle-preview.js?v=20261122live1';
import { BIRTHDAY_FOOTPRINTS, BIRTHDAY_PREVIEW } from './birthday-preview.js?v=20261122live1';

/**
 * Open-lawn "maze" field: no dirt lanes. Aliens walk a grid from the portal
 * gate to the porch steps and re-route around every turret and hedge, so the
 * player's layout decides how long the walk is.
 */

export const MAZE_FIELD_SRC = 'assets/field-lawn.jpg';

/**
 * @typedef {Object} MazeGate
 * @property {'west'|'north'|'south'} id
 * @property {string} name
 * @property {{x:number,y:number}} spawn - Normalised point aliens appear at
 * @property {{col:number,row:number}[]} entries - First cells they step into (never buildable)
 * @property {number} opensAtWave
 * @property {string} [announce]
 */

export let MAZE_LAYOUT;
/** @type {MazeGate[]} */
export let MAZE_GATES;
export let CELL_COUNT;
let COLS, ROWS, GOAL_COL, curated;

onSiegeMapChange(() => {
  const curatedGridGates = backyardPreviewMap?.gates ?? (
    CROW_WAR_PREVIEW ? CROW_WAR_GATES :
    BIRTHDAY_RUCKUS_PREVIEW ? BIRTHDAY_RUCKUS_GATES :
    FIVE_BRIDGES_PREVIEW ? FIVE_BRIDGES_GATES : null
  );
  curated = BIRTHDAY_PREVIEW || SANDCASTLE_PREVIEW || FLOOD_PREVIEW || Boolean(curatedGridGates);

  /** Normalised (0–1) coordinates on assets/field-lawn.jpg. */
  const mainRamp = FLOOD_PREVIEW ? FLOOD_ROUTES.west[0] : SANDCASTLE_PREVIEW ? SANDCASTLE_ROUTES.west[0] : curatedGridGates?.west.spawn;

  MAZE_LAYOUT = {
    cols: curated ? 22 : 16,
    rows: curated ? 13 : 11,
    /** Open grass rectangle the grid covers. */
    left: 0.06,
    right: curated ? 0.94 : 0.86,
    top: 0.16,
    bottom: curated ? 0.875 : 0.886,
    /** Right-edge cells that count as reaching the porch (path goals — buildable if a route remains). */
    goalRows: CROW_WAR_PREVIEW ? [5] : BIRTHDAY_PREVIEW || curatedGridGates ? [6] : [3, 4, 5, 6],
    /** Left-edge cells covered by the portal ring art (walkable, never buildable). */
    portalRows: BIRTHDAY_PREVIEW ? [5, 6, 7] : [3, 4, 5, 6],
    spawn: { x: 0.044, y: 0.49 },
    porch: { x: 0.905, y: 0.52 },
    /** Anchor at the centre of the opening, above the front stone rim. */
    portalSprite: { src: 'assets/maze-portal-perspective.png', anchorX: 0.5, anchorY: 0.425 },
    grannyPorch: { rightX: 0.93, baseY: 0.528 },
    grannyNuke: { rightX: 0.905, baseY: 0.545 },
  };

  /** Ways onto the lawn. More open as the siege goes on; all must stay reachable from the start. */
  /** @type {MazeGate[]} */
  MAZE_GATES = [
    {
      id: 'west',
      name: 'Portal',
      spawn: mainRamp ?? { x: 0.044, y: 0.49 },
      entries: BIRTHDAY_PREVIEW ? [{ col: 0, row: 6 }, { col: 0, row: 7 }] : [{ col: 0, row: 4 }, { col: 0, row: 5 }],
      ...curatedGridGates?.west,
      opensAtWave: 1,
    },
    {
      id: 'north',
      name: FLOOD_PREVIEW ? 'Island portal' : SANDCASTLE_PREVIEW ? 'Upper ramp' : 'Garden gate',
      spawn: FLOOD_PREVIEW ? FLOOD_ROUTES.north[0] : SANDCASTLE_PREVIEW ? SANDCASTLE_ROUTES.north[0] : { x: 0.475, y: 0.04 },
      entries: BIRTHDAY_PREVIEW ? [{ col: 10, row: 0 }, { col: 11, row: 0 }] : [{ col: 7, row: 0 }, { col: 8, row: 0 }],
      ...curatedGridGates?.north,
      opensAtWave: 2,
      announce: FLOOD_PREVIEW ? 'Scouts found the ISLAND!' : SANDCASTLE_PREVIEW ? 'Scouts found the UPPER RAMP!' : 'Scouts are sneaking in through the GARDEN GATE!',
    },
    {
      id: 'south',
      name: FLOOD_PREVIEW ? 'Ladder bridge' : BIRTHDAY_PREVIEW ? 'Party Portal' : SANDCASTLE_PREVIEW ? 'Lower ramp' : 'Back fence',
      spawn: FLOOD_PREVIEW ? FLOOD_ROUTES.south[0] : BIRTHDAY_PREVIEW ? { x: 0.46, y: 0.79 } : SANDCASTLE_PREVIEW ? SANDCASTLE_ROUTES.south[0] : { x: 0.36, y: 0.97 },
      entries: BIRTHDAY_PREVIEW ? [{ col: 9, row: 11 }, { col: 10, row: 11 }] : [{ col: 5, row: 10 }, { col: 6, row: 10 }],
      opensAtWave: 4,
      announce: FLOOD_PREVIEW ? 'Aliens found the LADDER BRIDGE!' : BIRTHDAY_PREVIEW ? 'A PARTY PORTAL opened between the inflatables!' : SANDCASTLE_PREVIEW ? 'Aliens are pouring down the LOWER RAMP!' : 'They smashed through the BACK FENCE!',
      ...curatedGridGates?.south,
    },
  ];
    ({ cols: COLS, rows: ROWS } = MAZE_LAYOUT);
    CELL_COUNT = COLS * ROWS;
    GOAL_COL = BIRTHDAY_PREVIEW || curatedGridGates ? 19 : COLS - 1;
});

/** @param {number} waveNum */
export function openGates(waveNum) {
  return MAZE_GATES.filter((g) => waveNum >= g.opensAtWave);
}

/** Gate that opens on the following wave, for an early warning. @param {number} waveNum */
export function gateOpeningAfter(waveNum) {
  return MAZE_GATES.find((g) => g.opensAtWave === waveNum + 1) ?? null;
}

/**
 * How each kind of alien gets in and gets about.
 * Scouts sneak through side gates, Raiders and Motherships fly over hedges,
 * Bruisers smash hedges, the heavies come through the portal.
 */
const UNIT_GATES = {
  monster1: ['north', 'south', 'west'],
  monster2: ['south', 'west'],
  monster3: ['north', 'west', 'south'],
  monster4: ['west'],
  monster5: ['west', 'south'],
  monster6: ['north', 'south', 'west'],
  monster7: ['south', 'west'],
  monster8: ['north', 'west'],
  monster9: ['west', 'south'],
  monster10: ['west'],
  monster11: ['west', 'south'],
  monster12: ['north', 'west', 'south'],
  monster13: ['north', 'west', 'south'],
  monster14: ['north', 'west', 'south'],
  monster15: ['north', 'west', 'south'],
  monster16: ['north', 'west', 'south'],
  monster17: ['north', 'west', 'south'],
  monster18: ['north', 'west', 'south'],
  monster19: ['north', 'west', 'south'],
  monster20: ['north', 'west', 'south'],
  monster21: ['north', 'west', 'south'],
  monster22: ['north', 'west', 'south'],
  monster23: ['north', 'west', 'south'],
};
export const FLYING_UNITS = new Set([
  'monster3',
  'monster12',
  'monster13',
  'monster14',
  'monster15',
  'monster16',
  'monster17',
  'monster18',
  'monster19',
  'monster20',
  'monster21',
  'monster22',
  'monster23',
  'mothership',
]);
export const HEDGE_SMASHERS = new Set(['monster4', 'monster10']);

/**
 * Wave 3+ flyer flanks: random Y bands just above / below the west portal,
 * so a second and third air line bypass a single choke on the grass.
 */
export const FLYER_FLANK_BANDS = {
  above: { x: 0.044, yMin: 0.18, yMax: 0.34 },
  below: { x: 0.044, yMin: 0.64, yMax: 0.80 },
};

/** @param {'above'|'below'} flank @param {() => number} [rand] */
export function randomFlyerFlankPoint(flank, rand = Math.random) {
  const band = FLYER_FLANK_BANDS[flank] ?? FLYER_FLANK_BANDS.above;
  return {
    x: band.x + (rand() - 0.5) * 0.03,
    y: band.yMin + rand() * (band.yMax - band.yMin),
  };
}

/**
 * Which open gate a spawn uses. Every other alien of a kind takes its
 * favourite open gate, the rest come through the portal, so groups split up.
 * @param {string} unit @param {number} index - position in the wave queue
 * @param {MazeGate[]} open
 */
export function gateForUnit(unit, index, open) {
  const prefs = UNIT_GATES[/** @type {keyof typeof UNIT_GATES} */ (unit)] ?? ['west'];
  const usable = prefs.map((id) => open.find((g) => g.id === id)).filter(Boolean);
  if (!usable.length) return open[0];
  if (usable.length === 1 || index % 2 === 0) return /** @type {MazeGate} */ (usable[0]);
  return /** @type {MazeGate} */ (usable[1 + (Math.floor(index / 2) % (usable.length - 1))]);
}

export const HEDGE = {
  id: 'hedge',
  name: 'Hedge',
  placementCost: 3,
  unlockXp: 0,
  color: '#4caf3a',
  role: 'wall',
  damage: 0,
  range: 0,
  fireRate: 99,
  desc: 'Cheap wall. Aliens have to walk around it — build a maze!',
};

export const HEDGE_MAX_HP = 100;

/** Painted hedge designs; each new hedge takes the next one in turn. */
export const HEDGE_SPRITES = ['assets/hedges/hedge-1.png', 'assets/hedges/hedge-2.png', 'assets/hedges/hedge-3.png'];

export function isMazeLawnCell(col, row) {
  return !curated || !isOutsideCuratedLawn(col, row);
}

export function isCuratedObstacle(col, row) {
  if (backyardPreviewMap) return isBackyardPreviewObstacle(col, row);
  if (CROW_WAR_PREVIEW) return isCrowWarObstacle(col, row);
  if (FIVE_BRIDGES_PREVIEW) return isFiveBridgesObstacle(col, row);
  if (BIRTHDAY_RUCKUS_PREVIEW) return isBirthdayRuckusObstacle(col, row);
  return BIRTHDAY_PREVIEW && BIRTHDAY_FOOTPRINTS.some(({ left, right, top, bottom }) =>
    col >= left && col <= right && row >= top && row <= bottom
  );
}

export function createMazeTerrain() {
  return Uint8Array.from({ length: CELL_COUNT }, (_, index) => {
    const { col, row } = cellColRow(index);
    return Number(!isMazeLawnCell(col, row) || isCuratedObstacle(col, row));
  });
}

const NEIGHBOURS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

/** @param {number} col @param {number} row */
export function cellIndex(col, row) {
  return row * COLS + col;
}

/** @param {number} idx */
export function cellColRow(idx) {
  return { col: idx % COLS, row: Math.floor(idx / COLS) };
}

/** @param {number} col @param {number} row */
export function isGoalCell(col, row) {
  return col === GOAL_COL && MAZE_LAYOUT.goalRows.includes(row);
}

/** @param {number} col @param {number} row */
export function isEntryCell(col, row) {
  return MAZE_GATES.some((g) => g.entries.some((e) => e.col === col && e.row === row));
}

/**
 * Cells that can never be built on: gate entries + portal column under the ring art.
 * Porch goal cells stay walk-targets but are buildable — kids can put a turret on the
 * grass in front of Granny as long as blockingKeepsRoute still leaves a porch route.
 */
export function isReservedCell(col, row) {
  if (FIVE_BRIDGES_PREVIEW && fiveBridgesDeck(col, row)) return true;
  if (BIRTHDAY_RUCKUS_PREVIEW && isCoasterCrossing(col, row)) return true;
  if (isBackyardPreviewReserved(col, row)) return true;
  return isEntryCell(col, row) || (col === 0 && MAZE_LAYOUT.portalRows.includes(row));
}

/** Normalised centre of a cell. */
export function cellCenter(col, row) {
  const { left, right, top, bottom } = MAZE_LAYOUT;
  const coasterY = BIRTHDAY_RUCKUS_PREVIEW && isCoasterCrossing(col, row) ? 0.483 : undefined;
  return {
    x: left + ((col + 0.5) * (right - left)) / COLS,
    y: coasterY ?? (FIVE_BRIDGES_PREVIEW ? fiveBridgesDeck(col, row)?.y : undefined) ?? top + ((row + 0.5) * (bottom - top)) / ROWS,
  };
}

/** Normalised cell size. */
export function cellSize() {
  const { left, right, top, bottom } = MAZE_LAYOUT;
  return { w: (right - left) / COLS, h: (bottom - top) / ROWS };
}

/** @param {number} nx @param {number} ny @returns {{col:number,row:number}|null} */
export function cellAtPoint(nx, ny) {
  const { left, right, top, bottom } = MAZE_LAYOUT;
  if (nx < left || nx >= right || ny < top || ny >= bottom) return null;
  const col = Math.min(COLS - 1, Math.floor(((nx - left) / (right - left)) * COLS));
  const row = Math.min(ROWS - 1, Math.floor(((ny - top) / (bottom - top)) * ROWS));
  return isMazeLawnCell(col, row) ? { col, row } : null;
}

/** Diagonal steps may not squeeze between two blocked corners. */
function canStep(blocked, col, row, dc, dr) {
  const c = col + dc;
  const r = row + dr;
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return false;
  if (blocked[cellIndex(c, r)]) return false;
  if (dc !== 0 && dr !== 0) {
    if (blocked[cellIndex(col + dc, row)] || blocked[cellIndex(col, row + dr)]) return false;
  }
  return true;
}

/**
 * Walking distance from every cell to the porch (Infinity = sealed off).
 * @param {Uint8Array} blocked
 */
export function computeFlowField(blocked) {
  const dist = new Float64Array(CELL_COUNT).fill(Infinity);
  const done = new Uint8Array(CELL_COUNT);
  MAZE_LAYOUT.goalRows.forEach((row) => {
    const idx = cellIndex(GOAL_COL, row);
    if (!blocked[idx]) dist[idx] = 0;
  });
  for (;;) {
    let cur = -1;
    let best = Infinity;
    for (let i = 0; i < CELL_COUNT; i++) {
      if (!done[i] && dist[i] < best) {
        best = dist[i];
        cur = i;
      }
    }
    if (cur < 0) break;
    done[cur] = 1;
    const { col, row } = cellColRow(cur);
    for (const [dc, dr, cost] of NEIGHBOURS) {
      if (!canStep(blocked, col, row, dc, dr)) continue;
      const n = cellIndex(col + dc, row + dr);
      if (dist[cur] + cost < dist[n]) dist[n] = dist[cur] + cost;
    }
  }
  return dist;
}

/**
 * Best neighbouring cell to walk to next, or null if already at the porch / stuck.
 * If this cell was just walled in (rebuild on a breach), step onto any free neighbour
 * that still reaches the porch — don't freeze mid-swarm.
 * @param {Float64Array} dist @param {Uint8Array} blocked
 */
export function nextCell(dist, blocked, col, row) {
  if (isGoalCell(col, row)) return null;
  let best = null;
  let bestScore = Infinity;
  const hereIdx = cellIndex(col, row);
  const here = dist[hereIdx];
  const stranded = Boolean(blocked[hereIdx]) || !Number.isFinite(here);
  for (const [dc, dr, cost] of NEIGHBOURS) {
    if (!canStep(blocked, col, row, dc, dr)) continue;
    const there = dist[cellIndex(col + dc, row + dr)];
    if (!Number.isFinite(there)) continue;
    if (!stranded && !(there < here)) continue;
    const score = there + cost;
    if (score < bestScore - 1e-9) {
      bestScore = score;
      best = { col: col + dc, row: row + dr };
    }
  }
  return best;
}

/**
 * Entry cell of a gate with the shortest walk, or null if that gate is sealed.
 * @param {Float64Array} dist @param {MazeGate} [gate]
 */
export function bestEntryCell(dist, gate = MAZE_GATES[0]) {
  let best = null;
  let bestD = Infinity;
  gate.entries.forEach(({ col, row }) => {
    const d = dist[cellIndex(col, row)];
    if (d < bestD) {
      bestD = d;
      best = { col, row };
    }
  });
  return best;
}

/**
 * Cells from a gate to the porch along the current route (empty if sealed).
 * @param {Float64Array} dist @param {Uint8Array} blocked @param {MazeGate} [gate]
 */
export function traceRoute(dist, blocked, gate = MAZE_GATES[0]) {
  const start = bestEntryCell(dist, gate);
  if (!start) return [];
  const route = [start];
  let cur = start;
  for (let guard = 0; guard < CELL_COUNT; guard++) {
    const next = nextCell(dist, blocked, cur.col, cur.row);
    if (!next) break;
    route.push(next);
    cur = next;
  }
  return route;
}

/**
 * Would blocking this cell still leave the given gates (default: all),
 * and every listed alien cell, a way to the porch?
 * @param {Uint8Array} blocked
 * @param {number} col @param {number} row
 * @param {number[]} mustReach - cell indices aliens currently stand in
 * @param {MazeGate[]} [gates] - gates that must stay reachable (open + next flank)
 */
export function blockingKeepsRoute(blocked, col, row, mustReach = [], gates = MAZE_GATES) {
  const trial = blocked.slice();
  trial[cellIndex(col, row)] = 1;
  const dist = computeFlowField(trial);
  if (gates.some((g) => !bestEntryCell(dist, g))) return { ok: false, dist };
  for (const idx of mustReach) {
    if (!Number.isFinite(dist[idx])) return { ok: false, dist };
  }
  return { ok: true, dist, trial };
}

/**
 * Leafy hedge block that fills one cell.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx @param {number} cy - cell centre
 * @param {number} w @param {number} h - cell size
 */
export function drawHedge(ctx, cx, cy, w, h) {
  const bw = w * 0.96;
  const bh = h * 0.9;
  const x0 = cx - bw / 2;
  const y0 = cy - bh / 2;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.beginPath();
  ctx.ellipse(cx, y0 + bh * 0.95, bw * 0.52, bh * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1f5a1c';
  ctx.beginPath();
  ctx.roundRect(x0, y0 + bh * 0.2, bw, bh * 0.78, Math.min(bw, bh) * 0.22);
  ctx.fill();

  const blobs = [
    [0.18, 0.34, 0.24], [0.5, 0.26, 0.28], [0.82, 0.34, 0.24],
    [0.3, 0.55, 0.26], [0.7, 0.55, 0.26],
  ];
  blobs.forEach(([bx, by, br]) => {
    ctx.fillStyle = '#2f7d27';
    ctx.beginPath();
    ctx.arc(x0 + bw * bx, y0 + bh * by, Math.min(bw, bh) * br, 0, Math.PI * 2);
    ctx.fill();
  });
  blobs.forEach(([bx, by, br]) => {
    ctx.fillStyle = '#4fa83c';
    ctx.beginPath();
    ctx.arc(x0 + bw * (bx - 0.04), y0 + bh * (by - 0.06), Math.min(bw, bh) * br * 0.62, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = 'rgba(190, 240, 140, 0.55)';
  [[0.44, 0.14], [0.14, 0.24], [0.76, 0.24], [0.26, 0.45], [0.64, 0.45]].forEach(([bx, by]) => {
    ctx.beginPath();
    ctx.arc(x0 + bw * bx, y0 + bh * by, Math.min(bw, bh) * 0.06, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

/** Shop button art. */
export function hedgeIconUrl() {
  return HEDGE_SPRITES[0];
}
