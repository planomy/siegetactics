import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sanitizeQuestionOptions, valuesMatch } from '../js/question-options.js';
import { makeLengthQuestion } from '../js/measurement-length.js';
import { makeFractionQuestion } from '../js/fractions.js';
import { makeAnglesQuestion } from '../js/angles-shapes.js';
import { makeExpandedQuestion } from '../js/expanded-maths.js';

/**
 * Simulate tapping the correct option the way Length Lab used to (Number()) vs
 * the shared valuesMatch path used by drill-session / battle-prep / Length Lab now.
 */
function scoreCorrectTap(q, coerceNumber) {
  const hit = q.options.find((o) => valuesMatch(o.value, q.answer));
  assert.ok(hit, `no option for ${q.answer}`);
  const attr = String(hit.value);
  if (coerceNumber) return Number(attr) === q.answer;
  return valuesMatch(attr, q.answer);
}

const TOPIC_MAKERS = [
  ['measurement-length', makeLengthQuestion],
  ['fractions', makeFractionQuestion],
  ['angles', makeAnglesQuestion],
  ['operations', (level) => makeExpandedQuestion('operations', level)],
  ['decimals-percent', (level) => makeExpandedQuestion('decimals-percent', level)],
  ['time', (level) => makeExpandedQuestion('time', level)],
  ['mass-capacity', (level) => makeExpandedQuestion('mass-capacity', level)],
];

test('Year 2 string answers score correctly with valuesMatch across topic cards', () => {
  for (const [name, make] of TOPIC_MAKERS) {
    let stringQs = 0;
    let numberCoerceHits = 0;
    let matchHits = 0;
    for (let i = 0; i < 40; i++) {
      const q = sanitizeQuestionOptions(make(1));
      if (typeof q.answer !== 'string' || !Number.isNaN(Number(q.answer))) continue;
      stringQs += 1;
      if (scoreCorrectTap(q, true)) numberCoerceHits += 1;
      if (scoreCorrectTap(q, false)) matchHits += 1;
    }
    if (stringQs === 0) continue; // operations is numeric-only
    assert.equal(matchHits, stringQs, `${name}: valuesMatch must credit every string answer`);
    assert.equal(numberCoerceHits, 0, `${name}: Number() must not credit string answers`);
  }
});

test('topic scorers use valuesMatch on data-value, never Number()', () => {
  const files = [
    '../js/drill-session.js',
    '../js/measurement-length.js',
    '../js/battle-prep.js',
    '../js/maths-quest.js',
  ];
  for (const rel of files) {
    const src = readFileSync(new URL(rel, import.meta.url), 'utf8');
    assert.match(src, /valuesMatch/, `${rel} should score with valuesMatch`);
    assert.doesNotMatch(
      src,
      /Number\(\s*(?:btn|button|b|candidate)\.getAttribute\(\s*['"]data-value['"]\s*\)/,
      `${rel} must not Number()-coerce data-value`,
    );
  }
});
