import { onSiegeMapChange } from './siege-map-selection.js';

export let FIVE_BRIDGES_PREVIEW;
onSiegeMapChange((map) => { FIVE_BRIDGES_PREVIEW = map === 'five-bridges'; });

export const FIVE_BRIDGES_FIELD_SRC = 'assets/field-five-bridges-preview.png';

export const FIVE_BRIDGES_GATES = {
  west: { spawn: { x: 0.073, y: 0.46 }, entries: [{ col: 0, row: 5 }] },
  north: { spawn: { x: 0.464, y: 0.083 }, entries: [{ col: 10, row: 0 }] },
  south: { spawn: { x: 0.116, y: 0.759 }, entries: [{ col: 1, row: 11 }] },
};

// Stream columns span the full grid. Each deck reserves one row across its stream.
const bridges = [
  { left: 6, right: 6, row: 4, y: 0.382 },
  { left: 6, right: 6, row: 8, y: 0.627 },
  { left: 13, right: 14, row: 2, y: 0.307 },
  { left: 13, right: 14, row: 6, y: 0.489 },
  { left: 13, right: 14, row: 9, y: 0.690 },
];

const gardens = [
  { left: 8, right: 11, top: 2, bottom: 5 },
  { left: 8, right: 11, top: 7, bottom: 10 },
  { left: 5, right: 5, top: 5, bottom: 6 },
];

export function fiveBridgesDeck(col, row) {
  return bridges.find((bridge) => row === bridge.row && col >= bridge.left && col <= bridge.right);
}

export function isFiveBridgesObstacle(col, row) {
  if (fiveBridgesDeck(col, row)) return false;
  return col === 6 || col === 13 || col === 14 || gardens.some(({ left, right, top, bottom }) =>
    col >= left && col <= right && row >= top && row <= bottom
  );
}
