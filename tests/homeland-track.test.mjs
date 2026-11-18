import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  defaultMapProgress,
  recordMapPass,
  mapPassFraction,
  getMapPasses,
  MAP_PASSES_REQUIRED,
} from '../js/map-progress.js';

const home = readFileSync(new URL('../js/home.js', import.meta.url), 'utf8');
const coach = readFileSync(new URL('../js/coach-tips.js', import.meta.url), 'utf8');
const howto = readFileSync(new URL('../js/how-to-play.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('AHPB uses one slot per topic card with ten lit pips, not closest-only creep', () => {
  assert.match(home, /TOPIC_DISPLAY_ORDER/);
  assert.match(home, /homeland-track-slot/);
  assert.match(home, /homeland-track-pip/);
  assert.match(home, /data-homeland-slot/);
  assert.match(home, /showTipPill/);
  assert.match(home, /is-progress/);
  assert.match(home, /homeland-track-ship/);
  assert.doesNotMatch(home, /closest \/ MAP_PASSES_REQUIRED/);
  assert.doesNotMatch(home, /homeland-track-fill/);
  assert.doesNotMatch(home, /homeland-track-slot-fill/);
});

test('tapping a slot shows a tip; the title opens the map', () => {
  assert.match(home, /bindHomelandTrackSlots/);
  assert.match(home, /data-homeland-map/);
  assert.match(home, /showTipPill\(btn\)/);
  assert.match(coach, /homeland:\s*\{/);
  assert.match(app, /!seen\.has\('homeland'\)/);
  assert.match(howto, /1–10/);
  assert.match(home, /homeland-track-home/);
});

test('three different topics each with one pass fill three separate tenths', () => {
  let progress = defaultMapProgress();
  for (const id of ['times-tables', 'fractions', 'angles']) {
    progress = recordMapPass(progress, id, 0.85).progress;
  }
  assert.equal(getMapPasses(progress, 'times-tables'), 1);
  assert.equal(getMapPasses(progress, 'fractions'), 1);
  assert.equal(getMapPasses(progress, 'angles'), 1);
  assert.equal(mapPassFraction(progress, 'times-tables'), 1 / MAP_PASSES_REQUIRED);
  assert.equal(mapPassFraction(progress, 'fractions'), 1 / MAP_PASSES_REQUIRED);
  assert.equal(mapPassFraction(progress, 'operations'), 0);
  // Overall bar progress = 3 / (10 topics × 10 passes).
  const sum = ['times-tables', 'fractions', 'angles']
    .reduce((n, id) => n + getMapPasses(progress, id), 0);
  assert.equal(sum / (10 * MAP_PASSES_REQUIRED), 0.03);
});

test('random missions still skip map passes and shields', () => {
  assert.match(app, /does not count towards\s*\n\s*\/\/ map sectors or level shields/);
});
