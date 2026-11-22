import { onSiegeMapChange } from './siege-map-selection.js';

export let CROW_WAR_PREVIEW;
onSiegeMapChange((map) => { CROW_WAR_PREVIEW = map === 'crow-war'; });

export const CROW_WAR_FIELD_SRC = 'assets/field-crow-war-maze-preview.png';

export const CROW_WAR_GATES = {
  west: { spawn: { x: 0.066, y: 0.438 }, entries: [{ col: 0, row: 5 }] },
  north: { spawn: { x: 0.464, y: 0.087 }, entries: [{ col: 10, row: 0 }] },
  south: {
    name: 'Arbor portal',
    spawn: { x: 0.765, y: 0.845 },
    entries: [{ col: 17, row: 12 }],
    announce: 'A portal opened by the GARDEN ARBOR!',
  },
};

// Straw bases and the planted ground under the painted corn rows.
const scarecrows = new Set([
  '2,3', '7,2', '13,3', '18,3', '4,6',
  '9,6', '16,7', '2,9', '8,10', '15,10',
]);
const corn = [
  [3, 5, 2, 2], [4, 5, 3, 3], [5, 7, 4, 4],
  [8, 11, 2, 2], [11, 16, 1, 1], [14, 16, 2, 2],
  [3, 10, 8, 8], [10, 12, 7, 7], [11, 13, 6, 6],
  [17, 19, 6, 7],
  [9, 11, 10, 11],
  [16, 19, 10, 10],
];

export function isCrowWarObstacle(col, row) {
  const northBed = col >= 14 && col <= 16 && row >= 3 && row <= 4;
  const southBed = col >= 4 && col <= 6 && row >= 9 && row <= 10;
  return northBed || southBed || scarecrows.has(`${col},${row}`) ||
    corn.some(([left, right, top, bottom]) => col >= left && col <= right && row >= top && row <= bottom);
}
