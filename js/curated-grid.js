// Grass beyond the original 20 × 12 rectangle. The second corner column
// starts farther down, where the stone path curves away from the lawn.
export function isOutsideCuratedLawn(col, row) {
  if (col < 20 && row < 12) return false;
  if (row === 12 && col < 20) return false;
  if (col === 20) return row < 7;
  if (col === 21) return row < 9;
  return true;
}
