import { FIELD_LAYOUT } from './field-layout.js';

/**
 * @typedef {{ row: number, col: number, x: number, y: number }} PlacementCell
 */

/**
 * @param {number} width
 * @param {number} height
 * @returns {PlacementCell[]}
 */
export function buildPlacementCells(width, height) {
  const { turretRowY, TURRET_ROWS, GRID_COLS, gridColX } = FIELD_LAYOUT;
  /** @type {PlacementCell[]} */
  const cells = [];

  for (let row = 0; row < TURRET_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      cells.push({
        row,
        col,
        x: width * gridColX[col],
        y: height * turretRowY[row],
      });
    }
  }
  return cells;
}

/**
 * @param {number} normY
 * @returns {number} row index or -1 if on dirt / out of bounds
 */
export function rowAtNormY(normY) {
  for (let row = 0; row < FIELD_LAYOUT.TURRET_ROWS; row++) {
    const band = FIELD_LAYOUT.grassBandY[row];
    if (normY >= band.top && normY <= band.bottom) return row;
  }
  return -1;
}

/**
 * @param {PlacementCell[]} cells
 * @param {number} px
 * @param {number} py
 * @param {number} width
 * @param {number} height
 * @param {(row: number, col: number) => boolean} isOccupied
 */
export function pickPlacementCell(cells, px, py, width, height, isOccupied) {
  const normY = py / height;
  const row = rowAtNormY(normY);
  if (row < 0) {
    return { cell: null, x: px, y: py, valid: false };
  }

  const rowCells = cells.filter((c) => c.row === row);
  let best = rowCells[0];
  let bestDist = Infinity;
  for (const cell of rowCells) {
    const d = Math.abs(px - cell.x);
    if (d < bestDist) {
      bestDist = d;
      best = cell;
    }
  }

  const valid = !isOccupied(best.row, best.col);
  return { cell: best, x: best.x, y: best.y, valid };
}
