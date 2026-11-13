/**
 * Open-lawn "maze" field: no dirt lanes. Aliens walk a grid from the portal
 * gate to the porch steps and re-route around every turret and hedge, so the
 * player's layout decides how long the walk is.
 */

export const MAZE_FIELD_SRC = 'assets/field-lawn.jpg';

/** Normalised (0–1) coordinates on assets/field-lawn.jpg. */
export const MAZE_LAYOUT = {
  cols: 16,
  rows: 10,
  /** Open grass rectangle the grid covers. */
  left: 0.06,
  right: 0.86,
  top: 0.16,
  bottom: 0.82,
  /** Right-edge cells at the porch steps (kept clear of building). */
  goalRows: [3, 4, 5, 6],
  /** Left-edge cells covered by the portal ring art (walkable, never buildable). */
  portalRows: [3, 4, 5, 6],
  spawn: { x: 0.044, y: 0.49 },
  porch: { x: 0.905, y: 0.52 },
  portal: { cx: 0.044, cy: 0.49, radius: 0.092, socketCount: 8, inactiveSockets: [5, 6] },
  /** Stone ring cut from assets/field.png; anchor = ring centre within the sprite. */
  portalSprite: { src: 'assets/maze-portal.png', cx: 0.044, cy: 0.49, w: 0.1152, h: 0.2326, anchorX: 0.3814, anchorY: 0.5 },
  grannyPorch: { rightX: 0.93, baseY: 0.528 },
  grannyNuke: { rightX: 0.905, baseY: 0.545 },
};

/**
 * @typedef {Object} MazeGate
 * @property {'west'|'north'|'south'} id
 * @property {string} name
 * @property {{x:number,y:number}} spawn - Normalised point aliens appear at
 * @property {{col:number,row:number}[]} entries - First cells they step into (never buildable)
 * @property {number} opensAtWave
 * @property {string} [announce]
 */

/** Ways onto the lawn. More open as the siege goes on; all must stay reachable from the start. */
/** @type {MazeGate[]} */
export const MAZE_GATES = [
  {
    id: 'west',
    name: 'Portal',
    spawn: { x: 0.044, y: 0.49 },
    entries: [{ col: 0, row: 4 }, { col: 0, row: 5 }],
    opensAtWave: 1,
  },
  {
    id: 'north',
    name: 'Garden gate',
    spawn: { x: 0.475, y: 0.04 },
    entries: [{ col: 7, row: 0 }, { col: 8, row: 0 }],
    opensAtWave: 2,
    announce: 'Scouts are sneaking in through the GARDEN GATE!',
  },
  {
    id: 'south',
    name: 'Back fence',
    spawn: { x: 0.36, y: 0.97 },
    entries: [{ col: 5, row: 9 }, { col: 6, row: 9 }],
    opensAtWave: 4,
    announce: 'They smashed through the BACK FENCE!',
  },
];

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
};
export const FLYING_UNITS = new Set(['monster3', 'mothership']);
export const HEDGE_SMASHERS = new Set(['monster4']);

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

const { cols: COLS, rows: ROWS } = MAZE_LAYOUT;
export const CELL_COUNT = COLS * ROWS;

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
  return col === COLS - 1 && MAZE_LAYOUT.goalRows.includes(row);
}

/** @param {number} col @param {number} row */
export function isEntryCell(col, row) {
  return MAZE_GATES.some((g) => g.entries.some((e) => e.col === col && e.row === row));
}

/** Gate and porch-step cells can never be built on, so a route always has both ends. */
export function isReservedCell(col, row) {
  return isGoalCell(col, row) || isEntryCell(col, row) || (col === 0 && MAZE_LAYOUT.portalRows.includes(row));
}

/** Normalised centre of a cell. */
export function cellCenter(col, row) {
  const { left, right, top, bottom } = MAZE_LAYOUT;
  return {
    x: left + ((col + 0.5) * (right - left)) / COLS,
    y: top + ((row + 0.5) * (bottom - top)) / ROWS,
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
  return {
    col: Math.min(COLS - 1, Math.floor(((nx - left) / (right - left)) * COLS)),
    row: Math.min(ROWS - 1, Math.floor(((ny - top) / (bottom - top)) * ROWS)),
  };
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
    const idx = cellIndex(COLS - 1, row);
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
 * @param {Float64Array} dist @param {Uint8Array} blocked
 */
export function nextCell(dist, blocked, col, row) {
  if (isGoalCell(col, row)) return null;
  let best = null;
  let bestScore = Infinity;
  const here = dist[cellIndex(col, row)];
  for (const [dc, dr, cost] of NEIGHBOURS) {
    if (!canStep(blocked, col, row, dc, dr)) continue;
    const there = dist[cellIndex(col + dc, row + dr)];
    if (!(there < here)) continue;
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
 * Would blocking this cell still leave every gate (open or not yet open),
 * and every alien already on the lawn, a way to the porch?
 * @param {Uint8Array} blocked
 * @param {number} col @param {number} row
 * @param {number[]} mustReach - cell indices aliens currently stand in
 */
export function blockingKeepsRoute(blocked, col, row, mustReach = []) {
  const trial = blocked.slice();
  trial[cellIndex(col, row)] = 1;
  const dist = computeFlowField(trial);
  if (MAZE_GATES.some((g) => !bestEntryCell(dist, g))) return { ok: false, dist };
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
