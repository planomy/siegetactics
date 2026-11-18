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

test('path blocks match solid place footprints — dig adds a right-edge column only', () => {
  for (const prop of Object.values(YARD_PROPS)) {
    assert.equal(prop.blockW, undefined, `${prop.id} should not set blockW`);
    assert.equal(prop.blockH, undefined, `${prop.id} should not set blockH`);
    assert.deepEqual(blockSize(prop), { w: prop.w, h: prop.h }, `${prop.id} path size`);
    assert.equal(placeCells(prop, 2, 2).length, prop.w * prop.h, `${prop.id} place`);
    if (prop.id === 'pool-under-construction') {
      assert.equal(footprintCells(prop, 2, 2).length, prop.w * prop.h + (prop.h - 1), `${prop.id} dig + right edge`);
    } else {
      assert.equal(footprintCells(prop, 2, 2).length, prop.w * prop.h, `${prop.id} path footprint`);
    }
  }
});

test('pool dig and duck pond leave walkable grass; routes skip solids and the dig right edge', () => {
  const pool = YARD_PROPS['pool-under-construction'];
  const pond = YARD_PROPS['duck-pond'];
  const yard = YARD_LAYOUTS.find((l) => l.id === 'duck-pond');
  const dig = yard.items.find((i) => i.id === 'pool-under-construction');
  const water = yard.items.find((i) => i.id === 'duck-pond');
  const map = new Uint8Array(CELL_COUNT);
  stampYardBlocked(map, yard.items);

  // Grass under the dig stays open.
  assert.equal(map[cellIndex(dig.col + 1, dig.row + pool.h)], 0, 'grass under the dig is walkable');
  // Right-edge column sealed on upper rows; bottom-right corner beside a bed stays open.
  assert.equal(map[cellIndex(dig.col + pool.w, dig.row)], 1, 'dig right-edge column is path-blocked');
  assert.equal(map[cellIndex(dig.col + pool.w, dig.row + pool.h - 1)], 0, 'bottom-right corner gap stays open');

  const bbq = YARD_LAYOUTS.find((l) => l.id === 'bbq-sunday');
  const bbqDig = bbq.items.find((i) => i.id === 'pool-under-construction');
  const bbqMap = new Uint8Array(CELL_COUNT);
  stampYardBlocked(bbqMap, bbq.items);
  assert.equal(
    bbqMap[cellIndex(bbqDig.col + pool.w, bbqDig.row + pool.h - 1)],
    0,
    'bbq-sunday: corner between dig and garden bed stays walkable',
  );

  for (const layout of YARD_LAYOUTS.filter((l) => l.items.some((i) => i.id === 'pool-under-construction'))) {
    const hole = layout.items.find((i) => i.id === 'pool-under-construction');
    const blocked = new Uint8Array(CELL_COUNT);
    stampYardBlocked(blocked, layout.items);
    const route = traceRoute(computeFlowField(blocked), blocked, MAZE_GATES[0]);
    assert.ok(route.length > 0, `${layout.id}: west gate still reaches the porch`);
    assert.equal(
      route.some((c) => c.col >= hole.col && c.col < hole.col + pool.w && c.row >= hole.row && c.row < hole.row + pool.h),
      false,
      `${layout.id}: west route must not walk the dig hole`,
    );
    assert.equal(
      route.some((c) => c.col === hole.col + pool.w && c.row >= hole.row && c.row < hole.row + pool.h - 1),
      false,
      `${layout.id}: west route must not run the dig right edge`,
    );
  }

  const route = traceRoute(computeFlowField(map), map, MAZE_GATES[0]);
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
