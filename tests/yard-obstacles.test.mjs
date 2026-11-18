import test from 'node:test';
import assert from 'node:assert/strict';
import {
  YARD_LAYOUTS,
  YARD_PROPS,
  footprintCells,
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
  blockingKeepsRoute,
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

test('yard path blocks match place footprints — pool dig skirts the pit and forces the over-route', () => {
  for (const prop of Object.values(YARD_PROPS)) {
    if (prop.id === 'pool-under-construction') {
      assert.equal(prop.blockW, 5, 'pool dig path skirt width');
      assert.equal(prop.blockH, 5, 'pool dig path skirt height');
      assert.ok(footprintCells(prop, 2, 2).length > prop.w * prop.h, 'pool dig path footprint includes under-lip');
      continue;
    }
    assert.equal(prop.blockW, undefined, `${prop.id} should not set blockW`);
    assert.equal(prop.blockH, undefined, `${prop.id} should not set blockH`);
    assert.equal(footprintCells(prop, 2, 2).length, prop.w * prop.h, `${prop.id} footprint`);
  }

  const pool = YARD_PROPS['pool-under-construction'];
  const layout = YARD_LAYOUTS.find((l) => l.id === 'bbq-sunday');
  const item = layout.items.find((i) => i.id === 'pool-under-construction');
  const blocked = new Uint8Array(CELL_COUNT);
  stampYardBlocked(blocked, layout.items);
  assert.equal(blocked[cellIndex(item.col, item.row)], 1);
  // Two rows under the dig foot are sealed so the west run cannot hug the pit lip.
  assert.equal(blocked[cellIndex(item.col + 1, item.row + pool.h)], 1);
  assert.equal(blocked[cellIndex(item.col + 1, item.row + pool.h + 1)], 1);

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
    // Path climbs over the dig on clear grass — not under the painted pit.
    assert.ok(
      route.some((c) => c.row < dig.row),
      `${yard.id}: west route should climb over the dig`,
    );
    assert.equal(
      route.some((c) => c.row > dig.row + pool.h - 1 && c.col >= dig.col - 1 && c.col <= dig.col + pool.w),
      false,
      `${yard.id}: west route must not hug under the dig lip`,
    );
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
