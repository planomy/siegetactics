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

test('pool dig path-blocks only its 4×3 place rect — grass around the fence stays clear', () => {
  const pool = YARD_PROPS['pool-under-construction'];
  assert.equal(pool.w, 4);
  assert.equal(pool.h, 3);
  assert.equal(pool.blockW, undefined);
  assert.equal(pool.blockH, undefined);
  assert.equal(footprintCells(pool, 4, 3).length, 12);

  const layout = YARD_LAYOUTS.find((l) => l.id === 'bbq-sunday');
  const item = layout.items.find((i) => i.id === 'pool-under-construction');
  const blocked = new Uint8Array(CELL_COUNT);
  stampYardBlocked(blocked, layout.items);
  // One cell outside the dig (old invisible skirt) must stay walkable.
  assert.equal(blocked[cellIndex(item.col - 1, item.row + 1)], 0);
  assert.equal(blocked[cellIndex(item.col + pool.w, item.row + 1)], 0);

  const route = traceRoute(computeFlowField(blocked), blocked, MAZE_GATES[0]);
  assert.ok(route.length > 0, 'west gate still reaches the porch');
  // Placing a hedge on the dotted route must leave a bypass through that clear grass.
  const bend = route.find((c) => c.col > 0 && c.col < 14);
  assert.ok(bend);
  assert.equal(blockingKeepsRoute(blocked, bend.col, bend.row, []).ok, true);
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
