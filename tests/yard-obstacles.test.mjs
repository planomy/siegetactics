import test from 'node:test';
import assert from 'node:assert/strict';
import {
  YARD_LAYOUTS,
  YARD_PROPS,
  blockSize,
  footprintCells,
  placeCells,
  validateYardItems,
  layoutForcesDetour,
  yardDetourMetrics,
  detourYardLayouts,
  pickYardLayout,
  stampYardBlocked,
} from '../js/yard-obstacles.js';
import {
  CELL_COUNT,
  cellIndex,
  computeFlowField,
  traceRoute,
  MAZE_GATES,
} from '../js/maze-field.js';

test('every authored yard layout stays open and forces a real detour', () => {
  for (const layout of YARD_LAYOUTS) {
    const check = validateYardItems(layout.items);
    assert.equal(check.ok, true, `${layout.id}: ${check.ok ? '' : check.reason}`);
    assert.equal(layoutForcesDetour(layout.items), true, `${layout.id} must bend a gate route`);
    const west = yardDetourMetrics(layout.items).west;
    assert.ok(
      west.delta >= 1 || west.turns >= 3,
      `${layout.id} west route still looks empty (Δ${west.delta} turns${west.turns})`,
    );
  }
  assert.equal(detourYardLayouts().length, YARD_LAYOUTS.length);
});

test('path blocks match solid place footprints — no invisible art skirts', () => {
  for (const prop of Object.values(YARD_PROPS)) {
    assert.equal(prop.blockW, undefined, `${prop.id} should not set blockW`);
    assert.equal(prop.blockH, undefined, `${prop.id} should not set blockH`);
    assert.deepEqual(blockSize(prop), { w: prop.w, h: prop.h }, `${prop.id} path size`);
    assert.equal(placeCells(prop, 2, 2).length, prop.w * prop.h, `${prop.id} place`);
    assert.equal(footprintCells(prop, 2, 2).length, prop.w * prop.h, `${prop.id} path footprint`);
  }
});

test('pool dig and duck pond leave a walkable grass gap; routes skip the solids', () => {
  const pool = YARD_PROPS['pool-under-construction'];
  const pond = YARD_PROPS['duck-pond'];
  const yard = YARD_LAYOUTS.find((l) => l.id === 'duck-pond');
  const dig = yard.items.find((i) => i.id === 'pool-under-construction');
  const water = yard.items.find((i) => i.id === 'duck-pond');
  const map = new Uint8Array(CELL_COUNT);
  stampYardBlocked(map, yard.items);

  // Grass between dig place and pond place stays open (the visible corridor).
  const gapCol = dig.col + pool.w;
  const gapRow = dig.row + 1;
  assert.ok(gapCol < water.col, 'layout still has a column between dig and pond');
  assert.equal(map[cellIndex(gapCol, gapRow)], 0, 'gap grass between pool and pond is walkable');

  const route = traceRoute(computeFlowField(map), map, MAZE_GATES[0]);
  assert.ok(route.length > 0, 'west gate still reaches the porch');
  assert.equal(
    route.some((c) => c.col >= dig.col && c.col < dig.col + pool.w && c.row >= dig.row && c.row < dig.row + pool.h),
    false,
    'west route must not walk the dig hole',
  );
  assert.equal(
    route.some((c) => c.col >= water.col && c.col < water.col + pond.w && c.row >= water.row && c.row < water.row + pond.h),
    false,
    'west route must not walk the pond water',
  );
});

test('random yard picks only come from the detour pool', () => {
  const ids = new Set();
  for (let i = 0; i < 40; i++) ids.add(pickYardLayout(null).id);
  for (const id of ids) {
    assert.ok(YARD_LAYOUTS.some((l) => l.id === id), id);
    assert.equal(layoutForcesDetour(YARD_LAYOUTS.find((l) => l.id === id).items), true);
  }
  assert.ok(ids.size >= 3, 'random pick should visit several layouts');
});

test('dev yard= id still resolves a named layout', () => {
  assert.equal(pickYardLayout('pool-dig').id, 'pool-dig');
  assert.equal(pickYardLayout(0).id, YARD_LAYOUTS[0].id);
});
