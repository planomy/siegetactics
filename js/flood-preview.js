import { onSiegeMapChange } from './siege-map-selection.js';

export let FLOOD_PREVIEW;
onSiegeMapChange((map) => { FLOOD_PREVIEW = map === 'flood'; });

export const FLOOD_WATER_ART_PREVIEW = true;
export const FLOOD_FIELD_SRC = 'assets/field-flood-water-precision.jpg?v=20261122a1';

const artWidth = 1672;
const artHeight = 941;
const point = ([x, y]) => ({ x: x / artWidth, y: y / artHeight });
const approaches = {
  west: [[80, 369]].map(point),
  north: [[784, 80], [784, 152]].map(point),
  south: [[155, 715], [215, 699]].map(point),
};
const porchExit = point([1490, 549]);

const buildRows = [
  '....###.......####.###',
  '..#.###.......###....#',
  '..#####......####...#.',
  '...####......#####...#',
  '...####......#####..##',
  '...######.....###...##',
  '....#############...##',
  '....#############...##',
  '.....############....#',
  '#............#####...#',
  '#..#####......###.....',
  '#.............###..###',
  '.########.....##..####',
];

const COLS = 22;
const ROWS = 13;
const cellKey = (col, row) => row * COLS + col;
const cellCol = (cell) => cell % COLS;
const cellRow = (cell) => Math.floor(cell / COLS);

// Turrets are drawn one grid square above their ground anchor. Block that visible
// square so route lines and aliens cannot pass through the turret artwork.
export function floodTowerBlockCell(col, row, isHedge = false) {
  return cellKey(col, Math.max(0, row - (isHedge ? 0 : 1)));
}

const westStart = cellKey(3, 4);
const westGate = cellKey(0, 4);
const northStart = cellKey(10, 0);
const southStart = cellKey(2, 10);
const westIsland = cellKey(7, 4);
const upperIsland = cellKey(12, 3);
const upperPorch = cellKey(18, 3);
const lowerOuter = cellKey(13, 9);
const lowerPorch = cellKey(18, 9);
const porchGoal = cellKey(19, 7);

const reserved = new Set([
  westGate, westStart, northStart, southStart,
  westIsland, upperIsland, upperPorch, lowerOuter, lowerPorch, porchGoal,
]);

const bridgeLinks = new Map();
function linkBridge(a, b) {
  bridgeLinks.set(a, [...(bridgeLinks.get(a) ?? []), b]);
  bridgeLinks.set(b, [...(bridgeLinks.get(b) ?? []), a]);
}
linkBridge(westStart, westIsland);
linkBridge(upperIsland, upperPorch);
linkBridge(lowerOuter, lowerPorch);

function gridPoint(col, row) {
  return {
    x: 0.06 + (col + 0.5) * 0.04 + (row === 10 && col === 8 ? 0.008 : 0),
    y: 0.16 + (row + 0.5) * 0.055 + (row === 11 && col >= 3 && col <= 8 ? 0.01 : 0),
    floodCell: cellKey(col, row),
  };
}

const lawnPoints = new Map();
for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    const cell = cellKey(col, row);
    if (buildRows[row][col] === '.' || reserved.has(cell)) {
      lawnPoints.set(cell, gridPoint(col, row));
    }
  }
}

function neighboursOf(cell) {
  const col = cellCol(cell);
  const row = cellRow(cell);
  const neighbours = [];
  if (col > 0) neighbours.push(cellKey(col - 1, row));
  if (col < COLS - 1) neighbours.push(cellKey(col + 1, row));
  if (row > 0) neighbours.push(cellKey(col, row - 1));
  if (row < ROWS - 1) neighbours.push(cellKey(col, row + 1));
  neighbours.push(...(bridgeLinks.get(cell) ?? []));
  return neighbours;
}

function routeTree(blocked) {
  const previous = blocked.has(porchGoal) ? new Map() : new Map([[porchGoal, null]]);
  const queue = blocked.has(porchGoal) ? [] : [porchGoal];
  for (const current of queue) {
    for (const next of neighboursOf(current)) {
      if (!lawnPoints.has(next) || blocked.has(next) || previous.has(next)) continue;
      previous.set(next, current);
      queue.push(next);
    }
  }
  return {
    has: (cell) => previous.has(cell),
    route(start) {
      if (!previous.has(start)) return null;
      const path = [];
      for (let cell = start; cell != null; cell = previous.get(cell)) path.push(lawnPoints.get(cell));
      return [...path, porchExit];
    },
  };
}

export function createFloodRoutes(blocked, occupied = []) {
  const tree = routeTree(blocked);
  if (![westGate, northStart, southStart, ...occupied].every((cell) => tree.has(cell))) return null;
  return {
    west: [...approaches.west, ...tree.route(westGate)],
    north: [...approaches.north, ...tree.route(northStart)],
    south: [...approaches.south, ...tree.route(southStart)],
    fromCell: (cell) => tree.route(cell),
  };
}

export const FLOOD_ROUTES = createFloodRoutes(new Set());

export function isFloodBuildCell(col, row) {
  if (buildRows[row]?.[col] !== '.') return false;
  const key = cellKey(col, row);
  if (reserved.has(key)) return false;
  const { x, y } = gridPoint(col, row);
  // Only the short off-grid portal approaches remain fixed and reserved.
  return Object.values(approaches).every((points) => points.slice(1).every((end, i) => {
    const start = points[i];
    const dx = (end.x - start.x) * artWidth;
    const dy = (end.y - start.y) * artHeight;
    const px = (x - start.x) * artWidth;
    const py = (y - start.y) * artHeight;
    const t = Math.min(1, Math.max(0, (px * dx + py * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - t * dx, py - t * dy) >= 40;
  }));
}
