import { onSiegeMapChange } from './siege-map-selection.js';

export let BIRTHDAY_RUCKUS_PREVIEW;
onSiegeMapChange((map) => { BIRTHDAY_RUCKUS_PREVIEW = map === 'birthday-ruckus'; });

export const BIRTHDAY_RUCKUS_FIELD_SRC = 'assets/field-birthday-ruckus-preview.png';

export const BIRTHDAY_RUCKUS_GATES = {
  west: { spawn: { x: 0.071, y: 0.489 }, entries: [{ col: 0, row: 5 }] },
  north: { spawn: { x: 0.464, y: 0.09 }, entries: [{ col: 10, row: 0 }] },
  south: {
    name: 'Lamppost portal',
    spawn: { x: 0.554, y: 0.857 },
    entries: [{ col: 12, row: 12 }],
    announce: 'A portal opened by the LAMPPOST!'
  },
};

const attractions = [
  { left: 1, right: 5, top: 0, bottom: 4 }, // Jumping castle
  { left: 6, right: 7, top: 2, bottom: 4 }, // Cake table
  { left: 2, right: 7, top: 7, bottom: 10 }, // Clown booth
];

export function isCoasterCrossing(col, row) {
  return row === 5 && (col === 10 || col === 17);
}

export function isBirthdayRuckusObstacle(col, row) {
  if (isCoasterCrossing(col, row)) return false;
  const rail = col >= 10 && col <= 17 && row >= 2 && row <= 8 &&
    (row === 2 || row === 8 || col === 10 || col === 17);
  return rail || attractions.some(({ left, right, top, bottom }) =>
    col >= left && col <= right && row >= top && row <= bottom
  );
}
