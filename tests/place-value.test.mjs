import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLACE_VALUE_LAB, makePlaceValueQuestion, initPlaceValue } from '../js/place-value.js';
import { sanitizeQuestionOptions, valuesMatch } from '../js/question-options.js';
import { MATH_TOPICS } from '../js/topics-data.js';

test('Place Value is a 10-question drill, not a one-puzzle forge', () => {
  assert.equal(PLACE_VALUE_LAB.questionsPerSession, 10);
  const topic = MATH_TOPICS.find((t) => t.id === 'place-value-siege');
  assert.equal(topic?.trainingMode, 'drill');
  const src = readFileSync(new URL('../js/place-value.js', import.meta.url), 'utf8');
  assert.match(src, /sessionSize:\s*PLACE_VALUE_LAB\.questionsPerSession/);
  assert.equal(typeof initPlaceValue, 'function');
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /function showPlaceValue\(/);
  assert.match(app, /LEARNING_SCREENS[\s\S]*'placeValue'/);
  assert.doesNotMatch(app, /function showForgeTraining\(/);
  assert.doesNotMatch(app, /Place Value is a one-puzzle forge/);
});

test('place-value questions always include a matching option', () => {
  for (const level of [1, 2, 3, 4, 5, 6]) {
    for (let i = 0; i < 24; i++) {
      const q = sanitizeQuestionOptions(makePlaceValueQuestion(/** @type {any} */ (level)));
      assert.ok(q.options.some((o) => valuesMatch(o.value, q.answer)), q.prompt);
    }
  }
});

test('every gate-eligible topic card uses a 10-question session', () => {
  const checks = [
    ['../js/measurement-length.js', /questionsPerSession:\s*10/],
    ['../js/fractions.js', /return 10/],
    ['../js/angles-shapes.js', /return 10/],
    ['../js/expanded-maths.js', /sessionSize:\s*10/],
    ['../js/times-tables.js', /questionsPerSession:\s*10/],
    ['../js/maths-quest.js', /problemsPerSet:\s*10/],
    ['../js/place-value.js', /questionsPerSession:\s*10/],
  ];
  for (const [rel, re] of checks) {
    const src = readFileSync(new URL(rel, import.meta.url), 'utf8');
    assert.match(src, re, rel);
  }
});
