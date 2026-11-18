import test from 'node:test';
import assert from 'node:assert/strict';
import {
  YARD_LAYOUTS,
  YARD_PROPS,
  YARD_BIG_IDS,
  YARD_SMALL_IDS,
  YARD_GARDEN_IDS,
  YARD_MAX_ITEMS,
  blockSize,
  footprintCells,
  placeCells,
  validateYardItems,
  layoutForcesDetour,
  yardDetourMetrics,
  detourYardLayouts,
  pickYardLayout,
  generateYardLayout,
  generateYardLayoutOrFallback,
  yardPropsEdgeTouch,
  yardPropsNeedPathGap,
  stampYardBlocked,
} from '../js/yard-obstacles.js';
import {
  CELL_COUNT,
  cellIndex,
  computeFlowField,
  traceRoute,
  MAZE_GATES,
} from '../js/maze-field.js';

function assertComposition(items, label) {
  assert.ok(items.length <= YARD_MAX_ITEMS, `${label}: ${items.length} > ${YARD_MAX_ITEMS}`);
  const big = items.filter((i) => YARD_BIG_IDS.has(i.id));
  const small = items.filter((i) => YARD_SMALL_IDS.has(i.id));
  assert.equal(big.length + small.length, items.length, `${label}: unknown prop id`);
  assert.ok(big.length >= 2 && big.length <= 3, `${label}: ${big.length} big (want 2–3)`);
  assert.ok(small.length >= 3 && small.length <= 4, `${label}: ${small.length} small (want 3–4)`);
}

function assertPathGaps(items, label) {
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (!yardPropsNeedPathGap(a, b)) {
        assert.ok(
          YARD_GARDEN_IDS.has(a.id) && YARD_GARDEN_IDS.has(b.id),
          `${label}: only garden beds may skip the path gap`,
        );
        continue;
      }
      assert.equal(
        yardPropsEdgeTouch(a, b),
        false,
        `${label}: ${a.id}@${a.col},${a.row} touches ${b.id}@${b.col},${b.row}`,
      );
    }
  }
}

test('every authored preview scene is 2–3 big + 3–4 small and at most 6 props', () => {
  for (const layout of YARD_LAYOUTS) {
    assertComposition(layout.items, layout.id);
  }
});

test('every authored yard layout stays open and forces a real detour', () => {
  for (const layout of YARD_LAYOUTS) {
    const check = validateYardItems(layout.items);
    assert.equal(check.ok, true, `${layout.id}: ${check.ok ? '' : check.reason}`);
    assert.equal(layoutForcesDetour(layout.items), true, `${layout.id} must bend a gate route`);
  }
  assert.equal(detourYardLayouts().length, YARD_LAYOUTS.length);
});

test('props need a path gap except garden beds may touch', () => {
  for (const layout of YARD_LAYOUTS) {
    assertPathGaps(layout.items, layout.id);
  }
  // Beds may abut; ute may not abut a bed.
  assert.equal(
    yardPropsNeedPathGap({ id: 'bed-square', col: 0, row: 0 }, { id: 'bed-long', col: 2, row: 0 }),
    false,
  );
  assert.equal(
    yardPropsNeedPathGap({ id: 'bed-square', col: 0, row: 0 }, { id: 'uncle-bobs-ute', col: 3, row: 0 }),
    true,
  );
});

test('path blocks match solid place footprints — no skirts', () => {
  for (const prop of Object.values(YARD_PROPS)) {
    assert.equal(prop.blockW, undefined, `${prop.id} should not set blockW`);
    assert.equal(prop.blockH, undefined, `${prop.id} should not set blockH`);
    assert.deepEqual(blockSize(prop), { w: prop.w, h: prop.h }, `${prop.id} path size`);
    assert.equal(placeCells(prop, 2, 2).length, prop.w * prop.h, `${prop.id} place`);
    assert.equal(footprintCells(prop, 2, 2).length, prop.w * prop.h, `${prop.id} path footprint`);
    assert.ok(prop.scale > 0 && prop.scale <= 1, `${prop.id} scale within place`);
  }
});

test('pool dig and duck pond block only their place rects; west routes go around', () => {
  const pool = YARD_PROPS['pool-under-construction'];
  const pond = YARD_PROPS['duck-pond'];
  const yard = YARD_LAYOUTS.find((l) => l.id === 'duck-pond');
  const dig = yard.items.find((i) => i.id === 'pool-under-construction');
  const water = yard.items.find((i) => i.id === 'duck-pond');
  const map = new Uint8Array(CELL_COUNT);
  stampYardBlocked(map, yard.items);

  assert.equal(map[cellIndex(dig.col + 1, dig.row + pool.h)], 0, 'grass under the dig is walkable');

  for (const layout of YARD_LAYOUTS.filter((l) => l.items.some((i) => i.id === 'pool-under-construction'))) {
    const hole = layout.items.find((i) => i.id === 'pool-under-construction');
    const blocked = new Uint8Array(CELL_COUNT);
    stampYardBlocked(blocked, layout.items);
    const route = traceRoute(computeFlowField(blocked), blocked, MAZE_GATES[0]);
    assert.ok(route.length > 0, `${layout.id}: west gate still reaches the porch`);
    assert.equal(
      route.some((c) => c.col >= hole.col && c.col < hole.col + pool.w && c.row >= hole.row && c.row < hole.row + pool.h),
      false,
      `${layout.id}: west route must not walk the dig`,
    );
  }

  const route = traceRoute(computeFlowField(map), map, MAZE_GATES[0]);
  assert.equal(
    route.some((c) => c.col >= water.col && c.col < water.col + pond.w && c.row >= water.row && c.row < water.row + pond.h),
    false,
    'west route must not walk the pond',
  );
});

test('live sieges generate rule-based yards (not a fixed random pick)', () => {
  const layouts = [];
  for (let i = 0; i < 12; i++) {
    const layout = pickYardLayout(null);
    layouts.push(layout);
    assertComposition(layout.items, layout.id);
    assertPathGaps(layout.items, layout.id);
    const check = validateYardItems(layout.items);
    assert.equal(check.ok, true, `${layout.id}: ${check.reason || ''}`);
    assert.equal(layoutForcesDetour(layout.items), true, `${layout.id} must bend a gate route`);
  }
  // Fresh generation should not always repeat the exact same placement.
  const signatures = new Set(layouts.map((l) => l.items.map((i) => `${i.id}@${i.col},${i.row}`).join('|')));
  assert.ok(signatures.size >= 2, 'generated yards should vary across sieges');
});

test('generateYardLayoutOrFallback always returns a legal yard', () => {
  for (let i = 0; i < 8; i++) {
    const layout = generateYardLayoutOrFallback(40);
    assert.ok(layout?.items?.length);
    assert.equal(validateYardItems(layout.items).ok, true);
    assert.equal(layoutForcesDetour(layout.items), true);
  }
  // Direct generate may miss, but should succeed often enough on this grid.
  let hits = 0;
  for (let i = 0; i < 30; i++) {
    if (generateYardLayout()) hits += 1;
  }
  assert.ok(hits >= 5, `generateYardLayout succeeded ${hits}/30 times`);
});

test('dev yard= id still resolves a named layout', () => {
  assert.equal(pickYardLayout('pool-dig').id, 'pool-dig');
  assert.equal(pickYardLayout(0).id, YARD_LAYOUTS[0].id);
});
