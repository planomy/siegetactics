import test from 'node:test';
import assert from 'node:assert/strict';
import {
  YARD_LAYOUTS,
  YARD_PROPS,
  YARD_BIG_IDS,
  YARD_SMALL_IDS,
  YARD_MAX_ITEMS,
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

test('every scene is 2–3 big + 3–4 small and at most 6 props', () => {
  for (const layout of YARD_LAYOUTS) {
    const items = layout.items;
    assert.ok(items.length <= YARD_MAX_ITEMS, `${layout.id}: ${items.length} > ${YARD_MAX_ITEMS}`);
    const big = items.filter((i) => YARD_BIG_IDS.has(i.id));
    const small = items.filter((i) => YARD_SMALL_IDS.has(i.id));
    assert.equal(big.length + small.length, items.length, `${layout.id}: unknown prop id`);
    assert.ok(big.length >= 2 && big.length <= 3, `${layout.id}: ${big.length} big (want 2–3)`);
    assert.ok(small.length >= 3 && small.length <= 4, `${layout.id}: ${small.length} small (want 3–4)`);
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

test('yard props stay spaced — no shared edges that form one mega-blob', () => {
  for (const layout of YARD_LAYOUTS) {
    const items = layout.items;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const pa = YARD_PROPS[a.id];
        const pb = YARD_PROPS[b.id];
        const ax2 = a.col + pa.w;
        const ay2 = a.row + pa.h;
        const bx2 = b.col + pb.w;
        const by2 = b.row + pb.h;
        const xOverlap = a.col < bx2 && b.col < ax2;
        const yOverlap = a.row < by2 && b.row < ay2;
        const xAdj = ax2 === b.col || bx2 === a.col;
        const yAdj = ay2 === b.row || by2 === a.row;
        const edgeTouch = (xOverlap && (yOverlap || yAdj)) || (yOverlap && xAdj);
        assert.equal(
          edgeTouch,
          false,
          `${layout.id}: ${a.id}@${a.col},${a.row} touches ${b.id}@${b.col},${b.row}`,
        );
      }
    }
  }
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
