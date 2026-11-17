import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeLengthQuestion } from '../js/measurement-length.js';
import { sanitizeQuestionOptions, valuesMatch } from '../js/question-options.js';

test('Year 2 length questions include string answers that must match without Number()', () => {
  let sawString = false;
  for (let i = 0; i < 80; i++) {
    const q = sanitizeQuestionOptions(makeLengthQuestion(1));
    if (typeof q.answer === 'string') {
      sawString = true;
      const hit = q.options.find((o) => valuesMatch(o.value, q.answer));
      assert.ok(hit, `no option matches answer ${q.answer}`);
      assert.equal(Number(String(hit.value)) === q.answer, false, 'Number() must not be how these are scored');
      assert.equal(valuesMatch(String(hit.value), q.answer), true);
    }
  }
  assert.equal(sawString, true, 'expected some Year 2 length answers to be strings');
});

test('Length Lab marks answers with valuesMatch, not Number()', () => {
  const src = readFileSync(new URL('../js/measurement-length.js', import.meta.url), 'utf8');
  assert.match(src, /valuesMatch\(picked, q\.answer\)/);
  assert.doesNotMatch(src, /const picked = Number\(btn\.getAttribute\('data-value'\)\)/);
});
