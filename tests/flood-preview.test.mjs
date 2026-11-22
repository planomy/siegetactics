import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFloodRoutes, FLOOD_ROUTES, isFloodBuildCell } from '../js/flood-preview.js';

const cell = (col, row) => row * 22 + col;

test('the lower grass can route around either side of the puddle', () => {
  const defences = [cell(3, 9), cell(4, 9), cell(5, 9)];
  for (const col of [3, 4, 5]) assert.ok(isFloodBuildCell(col, 9));
  for (const col of [3, 4, 5, 6, 7]) {
    assert.ok(!isFloodBuildCell(col, 10), 'the painted puddle is reserved');
    assert.ok(isFloodBuildCell(col, 11), 'the grass below the puddle is buildable');
  }

  assert.ok(FLOOD_ROUTES.south.some((point) => point.floodCell === cell(4, 9)));
  const detour = createFloodRoutes(new Set(defences));
  assert.ok(detour.south.some((point) => point.floodCell === cell(4, 11)));
  assert.ok(!detour.south.some((point) => defences.includes(point.floodCell)));
  assert.deepEqual(detour.west, FLOOD_ROUTES.west);
  assert.deepEqual(detour.north, FLOOD_ROUTES.north);
  assert.ok(!isFloodBuildCell(13, 9), 'the bridge landing is reserved');
});

test('a lower wall cannot seal the crossing or strand aliens on the lawn', () => {
  const wall = new Set([cell(3, 8), cell(3, 9), cell(3, 11)]);
  assert.equal(createFloodRoutes(wall), null);
  assert.equal(createFloodRoutes(new Set([cell(4, 9)]), [cell(4, 9)]), null);
});
