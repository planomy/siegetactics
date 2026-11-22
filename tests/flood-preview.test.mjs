import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFloodRoutes, FLOOD_ROUTES, floodTowerBlockCell, isFloodBuildCell } from '../js/flood-preview.js';

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

test('a lower wall sends the south wave around the west and upper bridges', () => {
  const wall = new Set([cell(3, 8), cell(3, 9), cell(3, 11)]);
  const detour = createFloodRoutes(wall);
  assert.ok(detour);
  assert.ok(detour.south.some((point) => point.floodCell === cell(7, 4)));
  assert.ok(detour.south.some((point) => point.floodCell === cell(12, 3)));
  assert.equal(createFloodRoutes(new Set([cell(4, 9)]), [cell(4, 9)]), null);
});

test('the north and west portals can fall back through the west and south bridges', () => {
  assert.ok(!FLOOD_ROUTES.north.some((point) => point.floodCell === cell(7, 4)));
  const forceWest = new Set([
    cell(12, 2), cell(11, 3), cell(12, 4),
  ]);
  const detour = createFloodRoutes(forceWest);
  assert.ok(detour);
  assert.ok(detour.north.some((point) => point.floodCell === cell(7, 4)));
  assert.ok(detour.north.some((point) => point.floodCell === cell(13, 9)));
  assert.ok(detour.west.some((point) => point.floodCell === cell(13, 9)));
});

test('turrets in front of the west portal can send its route across the south bridge', () => {
  const anchors = [[2, 4], [2, 5], [2, 6]];
  for (const [col, row] of anchors) assert.ok(isFloodBuildCell(col, row));
  const blocked = new Set(anchors.map(([col, row]) => floodTowerBlockCell(col, row)));
  const detour = createFloodRoutes(blocked);
  assert.ok(detour);
  assert.ok(detour.west.some((point) => point.floodCell === cell(13, 9)));
  for (const blockedCell of blocked) {
    assert.ok(!detour.west.some((point) => point.floodCell === blockedCell));
  }
});

test('porch-side placements reroute through visible grass gaps', () => {
  const porchTurrets = new Set([cell(18, 5), cell(17, 6)]);
  const detour = createFloodRoutes(porchTurrets);
  assert.ok(detour);
  for (const route of [detour.west, detour.north, detour.south]) {
    assert.ok(!route.some((point) => porchTurrets.has(point.floodCell)));
  }
  assert.ok(detour.north.some((point) => point.floodCell === cell(19, 5)));
  assert.ok(detour.west.some((point) => point.floodCell === cell(19, 5)));
  assert.ok(detour.south.some((point) => point.floodCell === cell(18, 7)));
});

test('placement fails only when the shared destination is genuinely cut off', () => {
  assert.equal(createFloodRoutes(new Set([cell(17, 7), cell(18, 6), cell(18, 8), cell(19, 6), cell(19, 8)])), null);
});

test('a turret blocks the square occupied by its artwork, not the ground anchor below it', () => {
  const visibleSquare = floodTowerBlockCell(10, 4);
  assert.equal(visibleSquare, cell(10, 3));
  assert.equal(floodTowerBlockCell(10, 4, true), cell(10, 4), 'hedges stay in their anchor square');
  assert.ok(FLOOD_ROUTES.west.some((point) => point.floodCell === visibleSquare));

  const detour = createFloodRoutes(new Set([visibleSquare]));
  assert.ok(detour);
  assert.ok(!detour.west.some((point) => point.floodCell === visibleSquare));
  assert.ok(!detour.north.some((point) => point.floodCell === visibleSquare));
});

test('every legal turret square either reroutes cleanly or is rejected', () => {
  let checked = 0;
  for (let row = 0; row < 13; row++) {
    for (let col = 0; col < 22; col++) {
      if (!isFloodBuildCell(col, row)) continue;
      checked++;
      const blocked = floodTowerBlockCell(col, row);
      const routes = createFloodRoutes(new Set([blocked]));
      if (!routes) continue;
      for (const gate of ['west', 'north', 'south']) {
        assert.ok(
          !routes[gate].some((point) => point.floodCell === blocked),
          `${gate} route crosses turret artwork at ${col},${row}`
        );
      }
    }
  }
  assert.ok(checked >= 100, `expected at least 100 build squares, checked ${checked}`);
});
