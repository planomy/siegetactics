import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COACH_TIPS, TOUR_TIPS } from '../js/coach-tips.js';

const source = ['js/home.js', 'js/armory-promo.js', 'js/shop.js']
  .map((f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'))
  .join('\n');

test('the opening tour is three numbered steps', () => {
  assert.deepEqual(TOUR_TIPS, ['pick', 'level', 'armory']);
  TOUR_TIPS.forEach((id, i) => assert.equal(COACH_TIPS[id].step, i + 1));
});

test('step 1 points both up at the random mission and down at the topics', () => {
  assert.deepEqual(COACH_TIPS.pick.targets, ['#mission-start-mixed', '.mission-all-topics']);
});

test('every tip target still exists in the page markup', () => {
  for (const [id, tip] of Object.entries(COACH_TIPS)) {
    for (const sel of tip.targets) {
      const name = sel.startsWith('#')
        ? `id="${sel.slice(1)}"`
        : sel.startsWith('.')
          ? sel.slice(1)
          : sel.match(/data-turret-id="([^"]+)"/)?.[1];
      assert.ok(name && source.includes(name), `${id}: ${sel} not found`);
    }
  }
});
