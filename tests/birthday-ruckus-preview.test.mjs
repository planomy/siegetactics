import assert from 'node:assert/strict';
import { test } from 'node:test';

globalThis.location = new URL('http://localhost:8765/?dev=siege&map=birthday-ruckus');
const maze = await import('../js/maze-field.js');

const routeFrom = (terrain, gate) => maze.traceRoute(maze.computeFlowField(terrain), terrain, gate);
const hasCell = (route, col, row) => route.some((point) => point.col === col && point.row === row);

test('coaster crossings reserve the shortcut and the infield has buildable grass', () => {
  const terrain = maze.createMazeTerrain();
  const [west] = maze.MAZE_GATES;
  const route = routeFrom(terrain, west);
  for (const col of [10, 17]) {
    assert.ok(hasCell(route, col, 5));
    assert.ok(maze.isReservedCell(col, 5));
  }
  assert.ok(terrain[maze.cellIndex(12, 5)] === 0 && !maze.isReservedCell(12, 5));
  const infieldBuild = maze.blockingKeepsRoute(terrain, 12, 5);
  assert.ok(infieldBuild.ok);
  assert.ok(!hasCell(routeFrom(infieldBuild.trial, west), 12, 5));
});

test('closing the west approach diverts the main wave and keeps the lamppost route open', () => {
  const terrain = maze.createMazeTerrain();
  const [west, , lamppost] = maze.MAZE_GATES;
  const outside = maze.blockingKeepsRoute(terrain, 9, 5);
  assert.ok(outside.ok);
  assert.ok(!hasCell(routeFrom(outside.trial, west), 10, 5));
  assert.equal(lamppost.opensAtWave, 4);
  assert.deepEqual(maze.cellAtPoint(lamppost.spawn.x, lamppost.spawn.y), { col: 12, row: 12 });
  assert.ok(maze.isReservedCell(12, 12));
  for (const gate of maze.MAZE_GATES) {
    const end = routeFrom(outside.trial, gate).at(-1);
    assert.ok(maze.isGoalCell(end.col, end.row));
  }
});
