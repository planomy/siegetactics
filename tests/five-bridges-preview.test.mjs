import assert from 'node:assert/strict';
import { test } from 'node:test';

globalThis.location = new URL('http://localhost:8765/?dev=siege&map=five-bridges');
const maze = await import('../js/maze-field.js');
const { fiveBridgesDeck } = await import('../js/five-bridges-preview.js?v=20261121c6');

test('ground routes cross streams on reserved decks and reach the porch', () => {
  const terrain = maze.createMazeTerrain();
  const distance = maze.computeFlowField(terrain);
  assert.deepEqual([maze.MAZE_LAYOUT.cols, maze.MAZE_LAYOUT.rows], [22, 13]);
  for (const gate of maze.MAZE_GATES) {
    const route = maze.traceRoute(distance, terrain, gate);
    assert.ok(maze.isGoalCell(route.at(-1).col, route.at(-1).row));
    for (const { col, row } of route) {
      if (![6, 13, 14].includes(col)) continue;
      assert.ok(fiveBridgesDeck(col, row));
      assert.ok(maze.isReservedCell(col, row));
    }
  }
});

test('hedges can divert ground units to the alternative bridge on each stream', () => {
  let terrain = maze.createMazeTerrain();
  for (const [col, row] of [[5, 4], [12, 2], [12, 6]]) {
    const placement = maze.blockingKeepsRoute(terrain, col, row);
    assert.ok(placement.ok);
    terrain = placement.trial;
  }
  const route = maze.traceRoute(maze.computeFlowField(terrain), terrain, maze.MAZE_GATES[0]);
  assert.ok(route.some(({ col, row }) => col === 6 && row === 8));
  assert.ok(route.some(({ col, row }) => col === 14 && row === 9));
  assert.ok(!maze.blockingKeepsRoute(terrain, 12, 9).ok);
});
