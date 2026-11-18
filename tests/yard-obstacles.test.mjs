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

test('scaled yard art gets a path skirt; place rect stays the build footprint', () => {
  for (const prop of Object.values(YARD_PROPS)) {
    const place = placeCells(prop, 2, 2);
    assert.equal(place.length, prop.w * prop.h, `${prop.id} place size`);
    const { w: bw, h: bh } = blockSize(prop);
    if ((prop.scale ?? 1) > 1.1 || (prop.blockW != null && prop.blockH != null)) {
      assert.ok(bw >= prop.w && bh >= prop.h, `${prop.id} path block covers place`);
      assert.ok(footprintCells(prop, 2, 2).length >= place.length, `${prop.id} path footprint`);
    } else {
      assert.equal(bw, prop.w, `${prop.id} unscaled path width`);
      assert.equal(bh, prop.h, `${prop.id} unscaled path height`);
    }
  }

  const pond = YARD_PROPS['duck-pond'];
  assert.deepEqual(blockSize(pond), { w: 4, h: 4 }, 'duck pond path matches painted water');

  const pool = YARD_PROPS['pool-under-construction'];
  assert.equal(pool.blockW, 5, 'pool dig path skirt width');
  assert.equal(pool.blockH, 5, 'pool dig path skirt height');
  assert.ok(footprintCells(pool, 2, 2).length > 25, 'pool dig path footprint includes under-lip');
});

test('pool dig forces the over-route; pond west routes stay off the water', () => {
  const pool = YARD_PROPS['pool-under-construction'];
  const pond = YARD_PROPS['duck-pond'];

  for (const yard of YARD_LAYOUTS.filter((l) => l.items.some((i) => i.id === 'pool-under-construction'))) {
    const dig = yard.items.find((i) => i.id === 'pool-under-construction');
    const map = new Uint8Array(CELL_COUNT);
    stampYardBlocked(map, yard.items);
    const route = traceRoute(computeFlowField(map), map, MAZE_GATES[0]);
    const foot = footprintCells(pool, dig.col, dig.row);
    assert.ok(route.length > 0, `${yard.id}: west gate still reaches the porch`);
    assert.equal(
      route.some((c) => foot.some((f) => f.col === c.col && f.row === c.row)),
      false,
      `${yard.id}: west route must not walk the dig skirt`,
    );
    assert.equal(
      route.some((c) => c.col >= dig.col && c.col < dig.col + pool.w && c.row >= dig.row && c.row < dig.row + pool.h),
      false,
      `${yard.id}: west route must not walk the dig place`,
    );
  }

  for (const yard of YARD_LAYOUTS.filter((l) => l.items.some((i) => i.id === 'duck-pond'))) {
    const water = yard.items.find((i) => i.id === 'duck-pond');
    const map = new Uint8Array(CELL_COUNT);
    stampYardBlocked(map, yard.items);
    const route = traceRoute(computeFlowField(map), map, MAZE_GATES[0]);
    const foot = footprintCells(pond, water.col, water.row);
    assert.ok(route.length > 0, `${yard.id}: west gate still reaches the porch`);
    assert.equal(
      route.some((c) => foot.some((f) => f.col === c.col && f.row === c.row)),
      false,
      `${yard.id}: west route must not walk the pond`,
    );
    assert.equal(map[cellIndex(water.col, water.row)], 1, `${yard.id}: pond place is path-blocked`);
  }
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
