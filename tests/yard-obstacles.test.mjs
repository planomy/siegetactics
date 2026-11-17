import test from 'node:test';
import assert from 'node:assert/strict';
import {
  YARD_LAYOUTS,
  validateYardItems,
  layoutForcesDetour,
  yardDetourMetrics,
  detourYardLayouts,
  pickYardLayout,
} from '../js/yard-obstacles.js';

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
