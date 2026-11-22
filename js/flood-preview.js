import { onSiegeMapChange } from './siege-map-selection.js';

export let FLOOD_PREVIEW;
onSiegeMapChange((map) => { FLOOD_PREVIEW = map === 'flood'; });

export const FLOOD_FIELD_SRC = 'assets/field-flood-preview.png?v=20261121c4';

const artWidth = 1672;
const artHeight = 941;
const point = ([x, y]) => ({ x: x / artWidth, y: y / artHeight });
const approaches = {
  west: [[80, 369], [320, 372], [514, 372]].map(point),
  north: [[784, 80], [784, 152]].map(point),
  south: [[155, 715], [215, 699]].map(point),
};
const upperExit = [[986, 346], [1245, 346], [1412, 416]].map(point);
const lowerExit = [[1022, 625], [1225, 625], [1450, 570], [1490, 549]].map(point);

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

const cellKey = (col, row) => row * 22 + col;
const westLanding = cellKey(7, 4);
const northLanding = cellKey(10, 0);
const eastLanding = cellKey(12, 3);
const lowerEntry = cellKey(2, 10);
const lowerLanding = cellKey(13, 9);
const landings = new Set([westLanding, northLanding, eastLanding, lowerEntry, lowerLanding]);
const neighbours = [-1, 1, -22, 22];

function lawnPoints(left, right, top, bottom) {
  const points = new Map();
  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      const cell = cellKey(col, row);
      if (buildRows[row][col] !== '.' && !landings.has(cell)) continue;
      points.set(cell, {
        x: 0.06 + (col + 0.5) * 0.04 + (row === 10 && col === 8 ? 0.008 : 0),
        y: 0.16 + (row + 0.5) * 0.055 + (row === 11 && col >= 3 && col <= 8 ? 0.01 : 0),
        floodCell: cell,
      });
    }
  }
  return points;
}

const islandPoints = lawnPoints(7, 13, 0, 5);
const lowerPoints = lawnPoints(1, 13, 8, 12);

function routeToBridge(points, landing, exit, blocked, required) {
  const previous = new Map([[landing, null]]);
  const queue = [landing];
  for (const current of queue) {
    for (const delta of neighbours) {
      const next = current + delta;
      if (!points.has(next) || blocked.has(next) || previous.has(next)) continue;
      previous.set(next, current);
      queue.push(next);
    }
  }
  if (!required.every((cell) => previous.has(cell))) return null;
  return (start) => {
    const path = [];
    for (let cell = start; cell != null; cell = previous.get(cell)) path.push(points.get(cell));
    return [...path, ...exit];
  };
}

export function createFloodRoutes(blocked, occupied = []) {
  const upper = routeToBridge(islandPoints, eastLanding, upperExit, blocked, [
    westLanding, northLanding, ...occupied.filter((cell) => islandPoints.has(cell)),
  ]);
  const lower = routeToBridge(lowerPoints, lowerLanding, lowerExit, blocked, [
    lowerEntry, ...occupied.filter((cell) => lowerPoints.has(cell)),
  ]);
  if (!upper || !lower) return null;
  return {
    west: [...approaches.west, ...upper(westLanding)],
    north: [...approaches.north, ...upper(northLanding)],
    south: [...approaches.south, ...lower(lowerEntry)],
    fromCell: (cell) => (islandPoints.has(cell) ? upper : lower)(cell),
  };
}

export const FLOOD_ROUTES = createFloodRoutes(new Set());

export function isFloodBuildCell(col, row) {
  if (buildRows[row]?.[col] !== '.') return false;
  const key = cellKey(col, row);
  if (landings.has(key)) return false;
  if (islandPoints.has(key) || lowerPoints.has(key)) return true;
  const x = 0.06 + (col + 0.5) * 0.04;
  const y = 0.16 + (row + 0.5) * 0.055;
  // Fixed approaches off the island need room around each centreline.
  const fixedPaths = [approaches.west, approaches.north, approaches.south, upperExit, lowerExit];
  return fixedPaths.every((points) => points.slice(1).every((end, i) => {
    const start = points[i];
    const dx = (end.x - start.x) * artWidth;
    const dy = (end.y - start.y) * artHeight;
    const px = (x - start.x) * artWidth;
    const py = (y - start.y) * artHeight;
    const t = Math.min(1, Math.max(0, (px * dx + py * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - t * dx, py - t * dy) >= 40;
  }));
}
