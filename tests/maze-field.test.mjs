import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAZE_LAYOUT,
  CELL_COUNT,
  cellIndex,
  computeFlowField,
  traceRoute,
  bestEntryCell,
  blockingKeepsRoute,
  isReservedCell,
  cellAtPoint,
  cellCenter,
  MAZE_GATES,
  openGates,
  gateOpeningAfter,
  gateForUnit,
  FLYING_UNITS,
} from '../js/maze-field.js';

const { cols, rows } = MAZE_LAYOUT;

test('open lawn routes straight from the gate to the porch', () => {
  const blocked = new Uint8Array(CELL_COUNT);
  const route = traceRoute(computeFlowField(blocked), blocked);
  assert.equal(route[0].col, 0);
  assert.equal(route.at(-1).col, cols - 1);
  assert.equal(route.length, cols);
});

test('a wall with one gap forces the route through the gap', () => {
  const blocked = new Uint8Array(CELL_COUNT);
  for (let row = 0; row < rows; row++) {
    if (row !== 0) blocked[cellIndex(7, row)] = 1;
  }
  const dist = computeFlowField(blocked);
  const route = traceRoute(dist, blocked);
  assert.ok(route.some((c) => c.col === 7 && c.row === 0));
  const open = computeFlowField(new Uint8Array(CELL_COUNT));
  const entry = bestEntryCell(dist);
  assert.ok(dist[cellIndex(entry.col, entry.row)] > open[cellIndex(0, 4)] + 2);
});

test('the last gap in a wall cannot be filled', () => {
  const blocked = new Uint8Array(CELL_COUNT);
  for (let row = 1; row < rows; row++) blocked[cellIndex(7, row)] = 1;
  assert.equal(blockingKeepsRoute(blocked, 7, 0).ok, false);
  assert.equal(blockingKeepsRoute(blocked, 3, 3).ok, true);
});

test('aliens cannot squeeze diagonally between two corner blocks', () => {
  const blocked = new Uint8Array(CELL_COUNT);
  for (let row = 0; row < rows; row++) {
    if (row !== 5) blocked[cellIndex(7, row)] = 1;
  }
  blocked[cellIndex(8, 4)] = 1;
  blocked[cellIndex(8, 6)] = 1;
  const check = blockingKeepsRoute(blocked, 8, 5);
  assert.equal(check.ok, false);
});

test('building may not seal off an alien already on the lawn', () => {
  const blocked = new Uint8Array(CELL_COUNT);
  blocked[cellIndex(2, 0)] = 1;
  blocked[cellIndex(3, 1)] = 1;
  blocked[cellIndex(2, 2)] = 1;
  const pocket = cellIndex(2, 1);
  assert.equal(blockingKeepsRoute(blocked, 1, 1).ok, true);
  assert.equal(blockingKeepsRoute(blocked, 1, 1, [pocket]).ok, false);
});

test('gate and porch-step cells are reserved', () => {
  MAZE_GATES.forEach((g) => g.entries.forEach(({ col, row }) => assert.ok(isReservedCell(col, row))));
  MAZE_LAYOUT.goalRows.forEach((row) => assert.ok(isReservedCell(cols - 1, row)));
  assert.equal(isReservedCell(5, 5), false);
  assert.ok(bestEntryCell(computeFlowField(new Uint8Array(CELL_COUNT))));
});

test('cell lookup round-trips through cell centres', () => {
  const c = cellCenter(4, 6);
  assert.deepEqual(cellAtPoint(c.x, c.y), { col: 4, row: 6 });
  assert.equal(cellAtPoint(0.01, 0.5), null);
});

test('gates open as the siege goes on, with a warning a wave early', () => {
  assert.deepEqual(openGates(1).map((g) => g.id), ['west']);
  assert.deepEqual(openGates(2).map((g) => g.id), ['west', 'north']);
  assert.deepEqual(openGates(4).map((g) => g.id), ['west', 'north', 'south']);
  assert.equal(gateOpeningAfter(1)?.id, 'north');
  assert.equal(gateOpeningAfter(3)?.id, 'south');
  assert.equal(gateOpeningAfter(4), null);
});

test('a gate that has not opened yet still cannot be walled off', () => {
  const blocked = new Uint8Array(CELL_COUNT);
  [6, 9].forEach((col) => (blocked[cellIndex(col, 0)] = 1));
  [6, 7, 8].forEach((col) => (blocked[cellIndex(col, 1)] = 1));
  assert.equal(blockingKeepsRoute(blocked, 9, 1).ok, false);
});

test('aliens split between their favourite gate and the portal', () => {
  const early = openGates(1);
  assert.equal(gateForUnit('monster1', 0, early).id, 'west');
  const later = openGates(4);
  const scouts = [0, 1, 2, 3].map((i) => gateForUnit('monster1', i, later).id);
  assert.ok(scouts.includes('north'));
  assert.ok(new Set(scouts).size >= 2);
  assert.equal(gateForUnit('monster4', 1, later).id, 'west');
  assert.equal(gateForUnit('mothership', 0, later).id, 'west');
  assert.ok(FLYING_UNITS.has('monster3'));
});

test('every gate can reach the porch on an empty lawn', () => {
  const blocked = new Uint8Array(CELL_COUNT);
  const dist = computeFlowField(blocked);
  MAZE_GATES.forEach((g) => {
    const route = traceRoute(dist, blocked, g);
    assert.ok(route.length > 0, g.id);
    assert.equal(route.at(-1).col, cols - 1);
  });
});
