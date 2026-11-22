import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

globalThis.location = new URL('https://example.com/');
globalThis.window = { location, addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1 };
globalThis.localStorage = { getItem() { return null; } };
globalThis.Image = class { set src(path) {} };
const selection = await import('../js/siege-map-selection.js');
const maze = await import('../js/maze-field.js?v=20261122live1');
const { createTDEngine } = await import('../js/td-engine.js');
const { MATH_TOPICS } = await import('../js/topics-data.js');
const { makeChallengeCode, readChallengeCode, MAX_SCORE } = await import('../js/challenge-code.js');
const { FLOOD_ROUTES } = await import('../js/flood-preview.js');
const { SANDCASTLE_ROUTES } = await import('../js/sandcastle-preview.js');

test('the normal game can mount each topic battlefield and return to the seeded lawn', () => {
  const requestedArt = new Set();
  const canvasGradient = { addColorStop() {} };
  globalThis.Image = class { set src(path) { requestedArt.add(path); } };
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  const ctx = new Proxy({ globalAlpha: 1, measureText() { return { width: 100 }; } }, {
    get: (target, name) => target[name] ?? (() => canvasGradient),
  });
  const canvas = {
    style: {}, getContext: () => ctx, addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 675 }),
  };

  assert.equal(selection.previewSiegeMap, null);
  const maps = MATH_TOPICS.map(({ id }) => selection.mapForSiege(id, 0));
  assert.deepEqual([...new Set(maps)].sort(), [...selection.SIEGE_MAP_IDS].sort());
  for (const id of maps) {
    selection.selectSiegeMap(id);
    requestedArt.clear();
    const engine = createTDEngine(canvas, {
      mission: { maxLeaks: 5 }, maze: true, getBudget: () => 100,
      showToast() {}, onMissionEnd() {},
    });
    assert.deepEqual([maze.MAZE_LAYOUT.cols, maze.MAZE_LAYOUT.rows], [22, 13]);
    const field = [...requestedArt].find((path) => /assets\/field-.*preview\.png/.test(path));
    assert.ok(field, id);
    assert.ok(readFileSync(new URL('../' + field.split('?')[0], import.meta.url)).length);
    const fixed = id === 'flood' ? FLOOD_ROUTES : id === 'sandcastle' ? SANDCASTLE_ROUTES : null;
    const terrain = maze.createMazeTerrain();
    const distance = maze.computeFlowField(terrain);
    for (const gate of maze.MAZE_GATES) {
      if (fixed) {
        assert.deepEqual(fixed[gate.id][0], gate.spawn);
        assert.ok(fixed[gate.id].length > 2);
      } else {
        const goal = maze.traceRoute(distance, terrain, gate).at(-1);
        assert.ok(goal && maze.isGoalCell(goal.col, goal.row), `${id}/${gate.id}`);
      }
    }
    assert.ok(engine.startWave(), id);
    engine.destroy();
  }

  selection.selectSiegeMap(null);
  assert.deepEqual([maze.MAZE_LAYOUT.cols, maze.MAZE_LAYOUT.rows], [16, 11]);
  const seeded = createTDEngine(canvas, {
    mission: { maxLeaks: 5 }, maze: true, yardSeed: 12345, getBudget: () => 100,
    showToast() {}, onMissionEnd() {},
  });
  assert.equal(seeded.getYardLayout().seed, 12345);
  seeded.destroy();
});

test('friend challenges can round-trip any curated map or a legacy seed', () => {
  for (const mapId of selection.SIEGE_MAP_IDS) {
    const code = makeChallengeCode(MAX_SCORE, null, mapId);
    assert.deepEqual(readChallengeCode(code), { score: MAX_SCORE, yardSeed: null, mapId });
    assert.equal(readChallengeCode(code.slice(0, -1) + (code.endsWith('2') ? '3' : '2')), null);
  }
  assert.deepEqual(readChallengeCode(makeChallengeCode(200, 12345)), { score: 200, yardSeed: 12345 });
});
