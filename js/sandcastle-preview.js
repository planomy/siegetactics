import { onSiegeMapChange } from './siege-map-selection.js';

export let SANDCASTLE_PREVIEW;
onSiegeMapChange((map) => { SANDCASTLE_PREVIEW = map === 'sandcastle'; });

export const SANDCASTLE_FIELD_SRC = 'assets/field-sandcastle-preview.png?v=20261121b5';

// Route centres in the 1672 × 941 concept art. All three ramps join the same exit.
const junction = [997, 609];
const exit = [[997, 504], [1460, 504]];
const routePixels = {
  west: [[187, 181], [270, 228], [829, 228], [829, 322], [300, 322],
    [300, 415], [875, 415], [875, 508], [227, 508], [227, 609], junction, ...exit],
  north: [[1165, 197], [1178, 504], exit[1]],
  south: [[258, 712], [337, 738], [1374, 738], [1374, 504], exit[1]],
};
export const SANDCASTLE_ROUTES = Object.fromEntries(
  Object.entries(routePixels).map(([gate, points]) =>
    [gate, points.map(([x, y]) => ({ x: x / 1672, y: y / 941 }))]
  )
);

// The build grid follows the grass banks. Sand, ramps and the castle are reserved.
const buildRows = [
  '.#..................##',
  '..##########...##.....',
  '..........##...##.....',
  '..##########...##....#',
  '..##...........##...##',
  '...........#...##...##',
  '.###########.#########',
  '.##..........#....##..',
  '.#############........',
  '#..............####...',
  '..#...................',
  '#.##################..',
  '......................',
];

// The two new props are placed and blocked from the same grid footprints.
export const SANDCASTLE_PROPS_SRC = 'assets/sandcastle-preview-props.png';
export const SANDCASTLE_PROPS = [
  { col: 12, row: 3, cols: 2, rows: 1, crop: [74, 130, 725, 729] },
  { col: 18, row: 3, cols: 2, rows: 1, crop: [1005, 22, 643, 835] },
];

// Keep bases away from the visual lip on narrow or offset grass banks.
export function sandcastleBuildOffset(col, row) {
  if (row === 4 && col >= 4 && col <= 11) return { x: 0, y: -0.31 };
  if (row === 5 && col >= 3 && col <= 10) return { x: 0, y: 0.31 };
  if (col === 18 && row === 8) return { x: -0.24, y: 0 };
  if (col === 19 && row >= 8 && row <= 10) return { x: 0.24, y: 0 };
  if (row === 10 && col >= 15 && col <= 18) return { x: col === 18 ? -0.24 : 0, y: 0.19 };
  return { x: 0, y: 0 };
}

export function isSandcastleBuildCell(col, row) {
  return buildRows[row]?.[col] === '.' &&
    !SANDCASTLE_PROPS.some((prop) =>
      col >= prop.col && col < prop.col + prop.cols &&
      row >= prop.row && row < prop.row + prop.rows
    );
}
