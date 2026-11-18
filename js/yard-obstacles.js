/**
 * Static backyard props that block ground aliens and turret/hedge placement.
 * Mix-and-match layouts keep every gate a path to the porch.
 */

import {
  MAZE_LAYOUT,
  CELL_COUNT,
  cellIndex,
  isReservedCell,
  computeFlowField,
  bestEntryCell,
  MAZE_GATES,
  traceRoute,
} from './maze-field.js?v=20261113m7';

/**
 * @typedef {{ dc: number, dr: number }} YardBuildSlot
 * @typedef {{ id: string, src: string, w: number, h: number, label: string, scale?: number, blockW?: number, blockH?: number, noShadow?: boolean, water?: boolean, smoke?: boolean, grounding?: 'feet'|'box'|'contacts'|'none', contacts?: number[], buildSlots?: YardBuildSlot[] }} YardProp
 * @typedef {{ id: string, col: number, row: number }} YardPlacement
 * @typedef {{ id: string, label: string, items: YardPlacement[] }} YardLayout
 */

/** @type {Record<string, YardProp>} */
export const YARD_PROPS = {
  // Copilot refresh — grass already baked under the casters.
  'laundry-trolley': {
    id: 'laundry-trolley',
    src: 'assets/obstacles/laundry-trolley.png?v=20261119r1',
    w: 1,
    h: 1,
    label: 'Laundry trolley',
    scale: 1.15,
    grounding: 'none',
  },
  wheelbarrow: {
    id: 'wheelbarrow',
    src: 'assets/obstacles/wheelbarrow.png?v=20261119r1',
    w: 1,
    h: 1,
    label: 'Wheelbarrow',
    scale: 1.15,
    grounding: 'none',
  },
  'bbq-kettle': {
    id: 'bbq-kettle',
    src: 'assets/obstacles/bbq-kettle.png?v=20261119r1',
    w: 2,
    h: 2,
    label: 'BBQ',
    scale: 1.05,
    grounding: 'none',
    smoke: true,
  },
  'bed-square': {
    id: 'bed-square',
    src: 'assets/obstacles/bed-square.png?v=20261119r1',
    w: 2,
    h: 2,
    label: 'Herb bed',
    scale: 1.1,
    grounding: 'none',
  },
  'bed-long': {
    id: 'bed-long',
    src: 'assets/obstacles/bed-long.png?v=20261119r1',
    w: 2,
    h: 2,
    label: 'Veggie bed',
    scale: 1.15,
    grounding: 'none',
  },
  'duck-pond': {
    id: 'duck-pond',
    src: 'assets/obstacles/duck-pond.png?v=20261119r1',
    w: 3,
    h: 3,
    label: 'Duck pond',
    scale: 1.05,
    noShadow: true,
    water: true,
  },
  'pool-under-construction': {
    id: 'pool-under-construction',
    src: 'assets/obstacles/pool-under-construction.png?v=20261119r1',
    w: 4,
    h: 3,
    label: 'Pool dig',
    // Solid dig is 4×3; footprintCells adds one column on the right so a vertical
    // route cannot clip the painted fence. Grass under the dig stays open.
    scale: 1.15,
    noShadow: true,
    grounding: 'none',
  },
  'wedding-arbor': {
    id: 'wedding-arbor',
    src: 'assets/obstacles/wedding-arbor.png?v=20261119r1',
    w: 4,
    h: 3,
    label: 'Wedding arbor',
    scale: 1.05,
    grounding: 'none',
    // Front-left corner + back-right of the aisle — turrets nest under the art.
    buildSlots: [
      { dc: 0, dr: 2 },
      { dc: 3, dr: 0 },
    ],
  },
  'uncle-bobs-ute': {
    id: 'uncle-bobs-ute',
    src: 'assets/obstacles/uncle-bobs-ute.png?v=20261119r1',
    w: 2,
    h: 2,
    label: "Uncle Bob's ute",
    scale: 1.2,
    grounding: 'none',
    // Front row under the cab / door — turret nests behind the ute art.
    buildSlots: [
      { dc: 0, dr: 1 },
      { dc: 1, dr: 1 },
    ],
  },
};

/**
 * Hand-authored mix-and-match yards. Top-left cell of each prop.
 * Every layout must choke the west mid-run so the dotted path lengthens or
 * zigzags hard — decorative corner props alone are not enough.
 * @type {YardLayout[]}
 */
export const YARD_LAYOUTS = [
  {
    id: 'bbq-sunday',
    label: 'BBQ Sunday',
    items: [
      // Dig on the mid run; herb beds seal the cheap slip under / beside it.
      { id: 'pool-under-construction', col: 4, row: 3 },
      { id: 'bed-square', col: 2, row: 2 },
      { id: 'bed-square', col: 9, row: 5 },
      { id: 'bbq-kettle', col: 11, row: 6 },
      { id: 'laundry-trolley', col: 1, row: 7 },
    ],
  },
  {
    id: 'veggie-maze',
    label: 'Veggie Maze',
    items: [
      // Staggered beds choke the west run without invisible path skirts.
      { id: 'bed-square', col: 3, row: 1 },
      { id: 'bed-square', col: 3, row: 3 },
      { id: 'bed-square', col: 3, row: 5 },
      { id: 'bed-long', col: 5, row: 2 },
      { id: 'bed-square', col: 5, row: 4 },
      { id: 'bed-square', col: 7, row: 3 },
      { id: 'wheelbarrow', col: 1, row: 7 },
      { id: 'bbq-kettle', col: 12, row: 7 },
    ],
  },
  {
    id: 'wedding-day',
    label: 'Wedding Day',
    items: [
      { id: 'wedding-arbor', col: 3, row: 2 },
      { id: 'bed-square', col: 2, row: 5 },
      { id: 'bed-long', col: 7, row: 3 },
      { id: 'bed-square', col: 7, row: 5 },
      { id: 'bbq-kettle', col: 11, row: 6 },
      { id: 'laundry-trolley', col: 1, row: 7 },
    ],
  },
  {
    id: 'uncle-bob',
    label: "Uncle Bob's Visit",
    items: [
      { id: 'uncle-bobs-ute', col: 2, row: 3 },
      { id: 'bed-square', col: 2, row: 5 },
      { id: 'duck-pond', col: 5, row: 2 },
      { id: 'bed-square', col: 8, row: 2 },
      { id: 'bed-long', col: 8, row: 4 },
      { id: 'bbq-kettle', col: 12, row: 7 },
      { id: 'laundry-trolley', col: 1, row: 7 },
    ],
  },
  {
    id: 'pool-dig',
    label: 'Pool Dig',
    items: [
      { id: 'pool-under-construction', col: 4, row: 3 },
      { id: 'bed-square', col: 2, row: 2 },
      { id: 'bed-square', col: 9, row: 5 },
      { id: 'bbq-kettle', col: 11, row: 6 },
      { id: 'laundry-trolley', col: 1, row: 7 },
      { id: 'wheelbarrow', col: 12, row: 8 },
    ],
  },
  {
    id: 'duck-pond',
    label: 'Duck Pond',
    items: [
      // Dig + pond + herb beds: west must climb several rows over clear grass.
      { id: 'pool-under-construction', col: 3, row: 3 },
      { id: 'bed-square', col: 1, row: 2 },
      { id: 'duck-pond', col: 8, row: 5 },
      { id: 'bed-square', col: 8, row: 2 },
      { id: 'laundry-trolley', col: 1, row: 7 },
    ],
  },
  {
    id: 'full-backyard',
    label: 'Full Backyard',
    items: [
      { id: 'pool-under-construction', col: 3, row: 3 },
      { id: 'bed-square', col: 1, row: 2 },
      { id: 'bed-square', col: 8, row: 2 },
      { id: 'bed-long', col: 8, row: 5 },
      { id: 'bbq-kettle', col: 11, row: 6 },
      { id: 'laundry-trolley', col: 1, row: 7 },
    ],
  },
];

/**
 * Path collision size. Matches the solid place footprint (dig hole, water, bed…)
 * so painted overhang can sit on grass that stays walkable. Optional blockW/H
 * still overrides when a prop truly needs a wider solid.
 */
export function blockSize(prop) {
  return { w: prop.blockW ?? prop.w, h: prop.blockH ?? prop.h };
}

/** Place rect — same as the solid path block unless blockW/H widens path only. */
export function placeCells(prop, col, row) {
  /** @type {{ col: number, row: number }[]} */
  const cells = [];
  for (let dr = 0; dr < prop.h; dr++) {
    for (let dc = 0; dc < prop.w; dc++) {
      cells.push({ col: col + dc, row: row + dr });
    }
  }
  return cells;
}

/**
 * Cells blocked for pathing. Default = solid place rect. If blockW/H is wider,
 * pad is centred horizontally and biased upward (iso art grows up from the foot).
 * @param {YardProp} prop @param {number} col @param {number} row
 */
export function footprintCells(prop, col, row) {
  const { w: bw, h: bh } = blockSize(prop);
  const originCol = col - Math.floor((bw - prop.w) / 2);
  const originRow = row - Math.ceil((bh - prop.h) / 2);
  /** @type {{ col: number, row: number }[]} */
  const cells = [];
  for (let dr = 0; dr < bh; dr++) {
    for (let dc = 0; dc < bw; dc++) {
      cells.push({ col: originCol + dc, row: originRow + dr });
    }
  }
  // Dig only: one column past the right edge (not the bottom row). Stops a
  // vertical run clipping the painted fence, while the bottom-right corner
  // beside a garden bed stays a real grass gap.
  if (prop.id === 'pool-under-construction') {
    for (let r = row; r < row + prop.h - 1; r++) {
      cells.push({ col: col + prop.w, row: r });
    }
  }
  return cells;
}

/**
 * @param {YardPlacement[]} items
 * @returns {{ ok: true, blocked: Uint8Array } | { ok: false, reason: string }}
 */
export function validateYardItems(items) {
  const { cols, rows } = MAZE_LAYOUT;
  const blocked = new Uint8Array(CELL_COUNT);
  const placeUsed = new Set();

  for (const item of items) {
    const prop = YARD_PROPS[item.id];
    if (!prop) return { ok: false, reason: `unknown prop ${item.id}` };
    if (item.col < 0 || item.row < 0 || item.col + prop.w > cols || item.row + prop.h > rows) {
      return { ok: false, reason: `${item.id} out of bounds` };
    }
    // Place rects must not overlap. Path skirts may share cells — stamping ORs them.
    for (const cell of placeCells(prop, item.col, item.row)) {
      if (isReservedCell(cell.col, cell.row)) return { ok: false, reason: `${item.id} on reserved` };
      const idx = cellIndex(cell.col, cell.row);
      if (placeUsed.has(idx)) return { ok: false, reason: `${item.id} overlap` };
      placeUsed.add(idx);
    }
    for (const cell of footprintCells(prop, item.col, item.row)) {
      if (cell.col < 0 || cell.row < 0 || cell.col >= cols || cell.row >= rows) {
        return { ok: false, reason: `${item.id} block out of bounds` };
      }
      if (isReservedCell(cell.col, cell.row)) return { ok: false, reason: `${item.id} on reserved` };
      blocked[cellIndex(cell.col, cell.row)] = 1;
    }
  }

  const dist = computeFlowField(blocked);
  if (MAZE_GATES.some((g) => !bestEntryCell(dist, g))) {
    return { ok: false, reason: 'blocks a gate route' };
  }
  return { ok: true, blocked };
}

/** @param {{ col: number, row: number }[]} route */
function routeTurns(route) {
  let turns = 0;
  for (let i = 2; i < route.length; i++) {
    const dx1 = route[i - 1].col - route[i - 2].col;
    const dy1 = route[i - 1].row - route[i - 2].row;
    const dx2 = route[i].col - route[i - 1].col;
    const dy2 = route[i].row - route[i - 1].row;
    if (dx1 !== dx2 || dy1 !== dy2) turns += 1;
  }
  return turns;
}

/**
 * How hard the yard pushes aliens off the empty lawn routes.
 * A layout “forces a detour” when the west walk lengthens by 2+ cells, or it
 * zigzags across 3+ rows — corner decoration alone never passes.
 * @param {YardPlacement[]} items
 */
export function yardDetourMetrics(items) {
  const empty = new Uint8Array(CELL_COUNT);
  const emptyDist = computeFlowField(empty);
  const blocked = new Uint8Array(CELL_COUNT);
  stampYardBlocked(blocked, items);
  const dist = computeFlowField(blocked);
  /** @type {Record<string, { delta: number, turns: number, span: number }>} */
  const gates = {};
  for (const gate of MAZE_GATES) {
    const emptyRoute = traceRoute(emptyDist, empty, gate);
    const route = traceRoute(dist, blocked, gate);
    const rows = route.map((c) => c.row);
    gates[gate.id] = {
      delta: route.length - emptyRoute.length,
      turns: routeTurns(route),
      span: rows.length ? Math.max(...rows) - Math.min(...rows) : 0,
    };
  }
  return gates;
}

/** @param {YardPlacement[]} items */
export function layoutForcesDetour(items) {
  const m = yardDetourMetrics(items);
  const west = m.west;
  if (!west) return false;
  // Without invisible path skirts, a zigzag (4+ turns) or a 2-cell lengthen counts.
  return (
    west.delta >= 2 ||
    (west.turns >= 4 && west.span >= 2) ||
    (west.delta >= 1 && west.turns >= 3) ||
    (m.north?.delta ?? 0) >= 2 ||
    (m.south?.delta ?? 0) >= 2
  );
}

/** Layouts that stay open and visibly bend the west (or side) routes. */
export function detourYardLayouts() {
  return YARD_LAYOUTS.filter((layout) => {
    const check = validateYardItems(layout.items);
    return check.ok && layoutForcesDetour(layout.items);
  });
}

/** @param {string|number|null|undefined} want */
export function resolveYardLayout(want) {
  if (want == null || want === '') return YARD_LAYOUTS[0];
  if (typeof want === 'number' && Number.isFinite(want)) {
    const i = ((Math.floor(want) % YARD_LAYOUTS.length) + YARD_LAYOUTS.length) % YARD_LAYOUTS.length;
    return YARD_LAYOUTS[i];
  }
  const key = String(want).toLowerCase();
  const byId = YARD_LAYOUTS.find((l) => l.id === key);
  if (byId) return byId;
  const n = Number(key);
  if (Number.isFinite(n)) return resolveYardLayout(n);
  return YARD_LAYOUTS[0];
}

/** @param {string|number|null|undefined} want */
export function pickYardLayout(want) {
  const forced = want != null && want !== '';
  const pool = detourYardLayouts();
  const fallbackPool = pool.length ? pool : YARD_LAYOUTS;

  if (!forced) {
    const pick = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
    return pick ?? YARD_LAYOUTS[0];
  }

  const layout = resolveYardLayout(want);
  const check = validateYardItems(layout.items);
  if (!check.ok) {
    console.warn(`[yard] layout "${layout.id}" invalid (${check.reason}); falling back`);
    return fallbackPool.find((alt) => alt.id !== layout.id) ?? fallbackPool[0] ?? layout;
  }
  if (!layoutForcesDetour(layout.items) && pool.length) {
    console.warn(`[yard] layout "${layout.id}" barely bends routes; prefer a choke layout`);
  }
  return layout;
}

/** @returns {Promise<Record<string, HTMLImageElement>>} */
export function loadYardSprites() {
  const entries = Object.values(YARD_PROPS).map(
    (prop) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(/** @type {[string, HTMLImageElement]} */ ([prop.id, img]));
        img.onerror = () => resolve(/** @type {[string, HTMLImageElement]} */ ([prop.id, img]));
        img.src = prop.src;
      }),
  );
  return Promise.all(entries).then((pairs) => Object.fromEntries(pairs));
}

/**
 * Stamp every footprint cell into an existing blocked map.
 * @param {Uint8Array} blocked
 * @param {YardPlacement[]} items
 */
export function stampYardBlocked(blocked, items) {
  for (const item of items) {
    const prop = YARD_PROPS[item.id];
    if (!prop) continue;
    for (const cell of footprintCells(prop, item.col, item.row)) {
      blocked[cellIndex(cell.col, cell.row)] = 1;
    }
  }
}

/**
 * True if (col,row) is a carve-out where a turret may sit under the prop art.
 * Explicit buildSlots always nest; any path-block pad outside the place rect
 * also nests (trolley 2×2 skirt, ute pad, etc.) — same rules everywhere.
 */
export function isYardBuildSlot(prop, itemCol, itemRow, col, row) {
  const slots = prop.buildSlots;
  if (slots?.some((s) => itemCol + s.dc === col && itemRow + s.dr === row)) return true;
  const { w: bw, h: bh } = blockSize(prop);
  if (bw === prop.w && bh === prop.h) return false;
  const inFoot = footprintCells(prop, itemCol, itemRow).some((c) => c.col === col && c.row === row);
  if (!inFoot) return false;
  // Pad outside the place rectangle — path-blocked, but buildable under the art.
  return col < itemCol || row < itemRow || col >= itemCol + prop.w || row >= itemRow + prop.h;
}

/**
 * Cells that block turret placement (path footprint minus build-slot carve-outs).
 * Pathing still uses the full footprint via stampYardBlocked.
 * @param {YardPlacement[]} items @param {number} col @param {number} row
 */
export function yardOccupies(items, col, row) {
  for (const item of items) {
    const prop = YARD_PROPS[item.id];
    if (!prop) continue;
    if (!footprintCells(prop, item.col, item.row).some((c) => c.col === col && c.row === row)) {
      continue;
    }
    if (isYardBuildSlot(prop, item.col, item.row, col, row)) continue;
    return true;
  }
  return false;
}

/**
 * Which yard prop a turret at (col,row) is nesting under, if any.
 * @param {YardPlacement[]} items @param {number} col @param {number} row
 */
export function yardNestProp(items, col, row) {
  for (const item of items) {
    const prop = YARD_PROPS[item.id];
    if (!prop) continue;
    if (isYardBuildSlot(prop, item.col, item.row, col, row)) return { item, prop };
  }
  return null;
}
