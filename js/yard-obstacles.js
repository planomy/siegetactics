/**
 * Backyard props that block ground aliens and turret/hedge placement.
 * Default sieges build a fresh yard from rules (2–3 big + 3–4 small, ≤6,
 * path gaps except garden beds). Named YARD_LAYOUTS remain for ?yard= previews.
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
 * @typedef {{ id: string, src: string, w: number, h: number, label: string, scale?: number, fit?: 'width'|'cover', blockW?: number, blockH?: number, noShadow?: boolean, water?: boolean, smoke?: boolean, grounding?: 'feet'|'box'|'contacts'|'none', contacts?: number[], buildSlots?: YardBuildSlot[] }} YardProp
 * @typedef {{ id: string, col: number, row: number }} YardPlacement
 * @typedef {{ id: string, label: string, items: YardPlacement[] }} YardLayout
 */

/**
 * Place footprint = path block. Art width locks to w cells and sits on the
 * bottom row; tall bits overhang north. buildSlots nest turrets behind.
 * @type {Record<string, YardProp>}
 */
export const YARD_PROPS = {
  'laundry-trolley': {
    id: 'laundry-trolley',
    src: 'assets/obstacles/laundry-trolley.png?v=20261119t1',
    w: 2,
    h: 1,
    label: 'Laundry trolley',
    // Art is nearly square; width-lock fills ~2 cells tall. 1.5× the old 0.45 shrink.
    scale: 0.675,
    noShadow: true,
    grounding: 'none',
    buildSlots: [
      { dc: 0, dr: 0 },
      { dc: 1, dr: 0 },
    ],
  },
  wheelbarrow: {
    id: 'wheelbarrow',
    src: 'assets/obstacles/wheelbarrow.png?v=20261119t1',
    w: 2,
    h: 2,
    label: 'Wheelbarrow',
    scale: 1,
    noShadow: true,
    grounding: 'none',
    buildSlots: [
      { dc: 0, dr: 0 },
      { dc: 1, dr: 0 },
    ],
  },
  'bbq-kettle': {
    id: 'bbq-kettle',
    src: 'assets/obstacles/bbq-kettle.png?v=20261119t1',
    w: 2,
    h: 2,
    label: 'BBQ',
    scale: 1,
    noShadow: true,
    grounding: 'none',
    smoke: true,
    buildSlots: [
      { dc: 0, dr: 0 },
      { dc: 1, dr: 0 },
    ],
  },
  'bed-square': {
    id: 'bed-square',
    src: 'assets/obstacles/bed-square.png?v=20261119t1',
    w: 2,
    h: 2,
    label: 'Herb bed',
    scale: 1,
    noShadow: true,
    grounding: 'none',
    buildSlots: [
      { dc: 0, dr: 0 },
      { dc: 1, dr: 0 },
    ],
  },
  'bed-long': {
    id: 'bed-long',
    src: 'assets/obstacles/bed-long.png?v=20261119t1',
    w: 3,
    h: 2,
    label: 'Veggie bed',
    scale: 1,
    noShadow: true,
    grounding: 'none',
    buildSlots: [
      { dc: 0, dr: 0 },
      { dc: 1, dr: 0 },
      { dc: 2, dr: 0 },
    ],
  },
  'duck-pond': {
    id: 'duck-pond',
    src: 'assets/obstacles/duck-pond.png?v=20261119t1',
    w: 3,
    h: 3,
    label: 'Duck pond',
    scale: 1,
    fit: 'cover',
    noShadow: true,
    grounding: 'none',
    water: true,
    buildSlots: [
      { dc: 0, dr: 0 },
      { dc: 1, dr: 0 },
      { dc: 2, dr: 0 },
    ],
  },
  'pool-under-construction': {
    id: 'pool-under-construction',
    src: 'assets/obstacles/pool-under-construction.png?v=20261119t1',
    w: 6,
    h: 5,
    label: 'Pool dig',
    scale: 1,
    fit: 'cover',
    noShadow: true,
    grounding: 'none',
    buildSlots: [
      { dc: 0, dr: 0 },
      { dc: 1, dr: 0 },
      { dc: 2, dr: 0 },
      { dc: 3, dr: 0 },
      { dc: 4, dr: 0 },
      { dc: 5, dr: 0 },
    ],
  },
  'wedding-arbor': {
    id: 'wedding-arbor',
    src: 'assets/obstacles/wedding-arbor.png?v=20261119t1',
    w: 4,
    h: 3,
    label: 'Wedding arbor',
    scale: 1,
    noShadow: true,
    grounding: 'none',
    buildSlots: [
      { dc: 0, dr: 0 },
      { dc: 1, dr: 0 },
      { dc: 2, dr: 0 },
      { dc: 3, dr: 0 },
    ],
  },
  'uncle-bobs-ute': {
    id: 'uncle-bobs-ute',
    src: 'assets/obstacles/uncle-bobs-ute.png?v=20261119t1',
    w: 5,
    h: 3,
    label: "Uncle Bob's ute",
    scale: 1,
    fit: 'cover',
    noShadow: true,
    grounding: 'none',
    buildSlots: [
      { dc: 0, dr: 0 },
      { dc: 1, dr: 0 },
      { dc: 2, dr: 0 },
      { dc: 3, dr: 0 },
      { dc: 4, dr: 0 },
    ],
  },
};

/** Big scene anchors — pool, pond, arbor, ute. Each layout picks 2–3. */
export const YARD_BIG_IDS = new Set([
  'pool-under-construction',
  'duck-pond',
  'wedding-arbor',
  'uncle-bobs-ute',
]);

/** Small clutter — gardens, trolley, BBQ, barrow. Each layout picks 3–4. */
export const YARD_SMALL_IDS = new Set([
  'bed-square',
  'bed-long',
  'laundry-trolley',
  'bbq-kettle',
  'wheelbarrow',
]);

/** Garden beds may share an edge; every other prop pair needs a grass path between. */
export const YARD_GARDEN_IDS = new Set(['bed-square', 'bed-long']);

/** Hard cap per scene: 2–3 big + 3–4 small, never more than 6 props. */
export const YARD_MAX_ITEMS = 6;

/** How many generate attempts before falling back to an authored layout. */
const YARD_GENERATE_TRIES = 80;

/**
 * Hand-authored preview yards (`?yard=bbq-sunday`). Live sieges generate
 * fresh layouts from the same composition + spacing rules.
 * @type {YardLayout[]}
 */
export const YARD_LAYOUTS = [
  {
    id: 'bbq-sunday',
    label: 'BBQ Sunday',
    items: [
      { id: 'pool-under-construction', col: 5, row: 1 },
      { id: 'wedding-arbor', col: 1, row: 6 },
      { id: 'bed-square', col: 1, row: 1 },
      { id: 'bbq-kettle', col: 12, row: 1 },
      { id: 'laundry-trolley', col: 13, row: 5 },
      { id: 'wheelbarrow', col: 12, row: 7 },
    ],
  },
  {
    id: 'veggie-maze',
    label: 'Veggie Maze',
    items: [
      { id: 'wedding-arbor', col: 6, row: 2 },
      { id: 'uncle-bobs-ute', col: 1, row: 6 },
      { id: 'bed-square', col: 1, row: 1 },
      { id: 'bed-long', col: 11, row: 1 },
      { id: 'bbq-kettle', col: 12, row: 4 },
      { id: 'wheelbarrow', col: 12, row: 7 },
    ],
  },
  {
    id: 'wedding-day',
    label: 'Wedding Day',
    items: [
      { id: 'wedding-arbor', col: 5, row: 1 },
      { id: 'uncle-bobs-ute', col: 10, row: 5 },
      { id: 'duck-pond', col: 1, row: 1 },
      { id: 'bed-long', col: 1, row: 5 },
      { id: 'bbq-kettle', col: 1, row: 8 },
      { id: 'bed-square', col: 5, row: 7 },
    ],
  },
  {
    id: 'uncle-bob',
    label: "Uncle Bob's Visit",
    items: [
      { id: 'uncle-bobs-ute', col: 5, row: 1 },
      { id: 'duck-pond', col: 1, row: 1 },
      { id: 'bbq-kettle', col: 12, row: 1 },
      { id: 'bed-long', col: 11, row: 5 },
      { id: 'wheelbarrow', col: 1, row: 5 },
      { id: 'laundry-trolley', col: 1, row: 8 },
    ],
  },
  {
    id: 'pool-dig',
    label: 'Pool Dig',
    items: [
      { id: 'pool-under-construction', col: 5, row: 1 },
      { id: 'duck-pond', col: 1, row: 1 },
      { id: 'uncle-bobs-ute', col: 9, row: 7 },
      { id: 'bed-square', col: 1, row: 5 },
      { id: 'bbq-kettle', col: 12, row: 1 },
      { id: 'wheelbarrow', col: 1, row: 8 },
    ],
  },
  {
    id: 'duck-pond',
    label: 'Duck Pond',
    items: [
      { id: 'duck-pond', col: 1, row: 1 },
      { id: 'pool-under-construction', col: 5, row: 1 },
      { id: 'bed-long', col: 12, row: 1 },
      { id: 'bbq-kettle', col: 1, row: 5 },
      { id: 'laundry-trolley', col: 1, row: 8 },
      { id: 'wheelbarrow', col: 12, row: 5 },
    ],
  },
  {
    id: 'full-backyard',
    label: 'Full Backyard',
    items: [
      { id: 'pool-under-construction', col: 5, row: 1 },
      { id: 'wedding-arbor', col: 1, row: 6 },
      { id: 'duck-pond', col: 12, row: 6 },
      { id: 'bed-square', col: 1, row: 1 },
      { id: 'bbq-kettle', col: 12, row: 1 },
      { id: 'laundry-trolley', col: 12, row: 4 },
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
  return cells;
}

/**
 * True when two place rects share an edge or overlap (no grass path between).
 * @param {YardPlacement} a @param {YardPlacement} b
 */
export function yardPropsEdgeTouch(a, b) {
  const pa = YARD_PROPS[a.id];
  const pb = YARD_PROPS[b.id];
  if (!pa || !pb) return false;
  const ax2 = a.col + pa.w;
  const ay2 = a.row + pa.h;
  const bx2 = b.col + pb.w;
  const by2 = b.row + pb.h;
  const xOverlap = a.col < bx2 && b.col < ax2;
  const yOverlap = a.row < by2 && b.row < ay2;
  const xAdj = ax2 === b.col || bx2 === a.col;
  const yAdj = ay2 === b.row || by2 === a.row;
  return (xOverlap && (yOverlap || yAdj)) || (yOverlap && xAdj);
}

/** Garden beds may abut; every other pair needs at least one grass cell between. */
export function yardPropsNeedPathGap(a, b) {
  return !(YARD_GARDEN_IDS.has(a.id) && YARD_GARDEN_IDS.has(b.id));
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

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (!yardPropsNeedPathGap(a, b)) continue;
      if (yardPropsEdgeTouch(a, b)) {
        return { ok: false, reason: `${a.id} touches ${b.id} — need a path between` };
      }
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

/** @param {T[]} list @returns {T[]} */
function shuffleCopy(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/** @param {number} lo @param {number} hi inclusive */
function randInt(lo, hi) {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

/**
 * Candidate top-left cells for a prop that stay in-bounds and off reserved cells.
 * @param {YardProp} prop
 */
function candidateOrigins(prop) {
  const { cols, rows } = MAZE_LAYOUT;
  /** @type {{ col: number, row: number }[]} */
  const out = [];
  for (let row = 0; row <= rows - prop.h; row++) {
    for (let col = 0; col <= cols - prop.w; col++) {
      let ok = true;
      for (const cell of placeCells(prop, col, row)) {
        if (isReservedCell(cell.col, cell.row)) {
          ok = false;
          break;
        }
      }
      if (ok) out.push({ col, row });
    }
  }
  return out;
}

/**
 * True if `next` can sit with the items already placed (overlap + path-gap rules).
 * @param {YardPlacement[]} placed @param {YardPlacement} next
 */
function placementFits(placed, next) {
  const prop = YARD_PROPS[next.id];
  if (!prop) return false;
  const check = validateYardItems([...placed, next]);
  return check.ok;
}

/**
 * Build one yard from the composition + spacing rules.
 * Returns null if this attempt cannot seat the full mix with a real detour.
 * @returns {YardLayout|null}
 */
export function generateYardLayout() {
  const bigCount = randInt(2, 3);
  const smallCount = Math.min(4, Math.max(3, YARD_MAX_ITEMS - bigCount));
  // Prefer 2 big + 4 small or 3 big + 3 small.
  const bigIds = shuffleCopy([...YARD_BIG_IDS]).slice(0, bigCount);
  const smallIds = shuffleCopy([...YARD_SMALL_IDS]).slice(0, smallCount);
  // Place biggest footprints first so small clutter fills the leftovers.
  const ids = [...bigIds, ...smallIds].sort(
    (a, b) => YARD_PROPS[b].w * YARD_PROPS[b].h - YARD_PROPS[a].w * YARD_PROPS[a].h,
  );

  /** @type {YardPlacement[]} */
  const items = [];
  for (const id of ids) {
    const prop = YARD_PROPS[id];
    const spots = shuffleCopy(candidateOrigins(prop));
    let seated = false;
    for (const spot of spots) {
      const next = { id, col: spot.col, row: spot.row };
      if (!placementFits(items, next)) continue;
      items.push(next);
      seated = true;
      break;
    }
    if (!seated) return null;
  }

  if (items.length > YARD_MAX_ITEMS) return null;
  const check = validateYardItems(items);
  if (!check.ok || !layoutForcesDetour(items)) return null;

  const bigLabel = bigIds.map((id) => YARD_PROPS[id].label).join(' + ');
  return {
    id: `gen-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`,
    label: bigLabel || 'Backyard',
    items,
  };
}

/**
 * Keep trying until a legal yard appears, then fall back to an authored scene.
 * @param {number} [tries]
 * @returns {YardLayout}
 */
export function generateYardLayoutOrFallback(tries = YARD_GENERATE_TRIES) {
  for (let i = 0; i < tries; i++) {
    const layout = generateYardLayout();
    if (layout) return layout;
  }
  const pool = detourYardLayouts();
  return pool[0] ?? YARD_LAYOUTS[0];
}

/** @param {string|number|null|undefined} want */
export function resolveYardLayout(want) {
  if (want == null || want === '') return YARD_LAYOUTS[0];
  if (typeof want === 'number' && Number.isFinite(want)) {
    const i = ((Math.floor(want) % YARD_LAYOUTS.length) + YARD_LAYOUTS.length) % YARD_LAYOUTS.length;
    return YARD_LAYOUTS[i];
  }
  const key = String(want).toLowerCase();
  if (key === 'gen' || key === 'random') {
    return generateYardLayoutOrFallback();
  }
  const byId = YARD_LAYOUTS.find((l) => l.id === key);
  if (byId) return byId;
  const n = Number(key);
  if (Number.isFinite(n)) return resolveYardLayout(n);
  return YARD_LAYOUTS[0];
}

/**
 * Live sieges (no `?yard=`) generate a fresh rule-based yard.
 * `?yard=bbq-sunday` / `?yard=0` still force an authored preview scene.
 * @param {string|number|null|undefined} want
 */
export function pickYardLayout(want) {
  const forced = want != null && want !== '';
  const pool = detourYardLayouts();
  const fallbackPool = pool.length ? pool : YARD_LAYOUTS;

  if (!forced) {
    return generateYardLayoutOrFallback();
  }

  const key = String(want).toLowerCase();
  if (key === 'gen' || key === 'random') {
    return generateYardLayoutOrFallback();
  }

  const layout = resolveYardLayout(want);
  const check = validateYardItems(layout.items);
  if (!check.ok) {
    console.warn(`[yard] layout "${layout.id}" invalid (${check.reason}); generating instead`);
    return generateYardLayoutOrFallback();
  }
  if (!layoutForcesDetour(layout.items) && pool.length) {
    console.warn(`[yard] layout "${layout.id}" barely bends routes; prefer a choke layout`);
  }
  return layout ?? fallbackPool[0];
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
