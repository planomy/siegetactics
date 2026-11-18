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

test('yard path blocks match place footprints — pool dig keeps a path-only skirt', () => {
  for (const prop of Object.values(YARD_PROPS)) {
    if (prop.id === 'pool-under-construction') {
      assert.equal(prop.blockW, 5, 'pool dig path skirt width');
      assert.equal(prop.blockH, 5, 'pool dig path skirt height');
      assert.equal(footprintCells(prop, 2, 2).length, 25, 'pool dig path footprint');
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
  // Under-fence row is part of the path skirt (art hangs below the 4×3 place).
  assert.equal(blocked[cellIndex(item.col + 1, item.row + 3)], 1);
  // Grass just left of the skirt stays walkable.
  assert.equal(blocked[cellIndex(item.col - 1, item.row + 1)], 0);

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
      `${yard.id}: west route must not walk through the dig skirt`,
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
