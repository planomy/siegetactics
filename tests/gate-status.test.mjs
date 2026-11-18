import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setGateRemainingProvider, gateNote } from '../js/gate-status.js';

test('gate note matches remaining answers — never claims charged while invasion still needs work', () => {
  setGateRemainingProvider(() => 13);
  assert.match(gateNote(), /still needs 13 more right answers/i);
  assert.doesNotMatch(gateNote(), /fully charged/i);

  setGateRemainingProvider(() => 0);
  assert.match(gateNote(), /fully charged/i);
});

test('drills take gateNote from app callbacks, not a second gate-status module', () => {
  const length = readFileSync(new URL('../js/measurement-length.js', import.meta.url), 'utf8');
  const drill = readFileSync(new URL('../js/drill-session.js', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(length, /from '\.\/gate-status\.js/);
  assert.doesNotMatch(drill, /from '\.\/gate-status\.js/);
  assert.match(app, /gateNote: siegeGateNote/);
  assert.match(length, /callbacks\.gateNote/);
  assert.match(drill, /config\.gateNote/);
});
