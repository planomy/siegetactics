import test from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTY, legacyLevel, normalizeDifficultyLevel, xpMultiplierLabel } from '../js/difficulty.js';
import { makeFractionQuestion } from '../js/fractions.js';
import { makeAnglesQuestion } from '../js/angles-shapes.js';
import { makeLengthQuestion } from '../js/measurement-length.js';
import { makeExpandedQuestion } from '../js/expanded-maths.js';
import { makePrepQuestion, PREP_MODULES } from '../js/battle-prep.js';
import { createQuestSet } from '../js/maths-quest-data.js';
import { makePlaceValueVariant } from '../js/missions-data.js';
import { timesConfigForLevel } from '../js/times-tables.js';
import { valuesMatch, sanitizeQuestionOptions } from '../js/question-options.js';

const RUNS = 300;

function checkChoice(raw, label) {
  // The game de-duplicates options before showing them, so check what players see.
  const q = sanitizeQuestionOptions(raw);
  assert.ok(q && typeof q.prompt === 'string' && q.prompt.length > 0, `${label}: prompt`);
  assert.ok(Array.isArray(q.options) && q.options.length >= 2, `${label}: options for "${q.prompt}"`);
  assert.ok(q.options.some((o) => valuesMatch(o.value, q.answer)), `${label}: answer ${q.answer} missing from "${q.prompt}"`);
  for (const o of q.options) {
    assert.ok(!String(o.label).includes('NaN') && !String(o.label).includes('undefined'), `${label}: bad option in "${q.prompt}"`);
  }
  const keys = q.options.map((o) => String(o.value));
  assert.equal(new Set(keys).size, keys.length, `${label}: duplicate options in "${q.prompt}"`);
}

test('there are six levels, Year 2 to Year 7, with a small XP step', () => {
  assert.deepEqual(DIFFICULTY.levels, [1, 2, 3, 4, 5, 6]);
  assert.equal(DIFFICULTY.labels[1].grade, 'Year 2');
  assert.equal(DIFFICULTY.labels[6].grade, 'Year 7');
  assert.equal(xpMultiplierLabel(1), '1× XP');
  assert.equal(xpMultiplierLabel(6), '+25% XP');
  assert.equal(normalizeDifficultyLevel(6), 6);
  assert.equal(normalizeDifficultyLevel(9), DIFFICULTY.default);
});

test('levels 2–5 reuse the original four levels', () => {
  assert.deepEqual([2, 3, 4, 5].map(legacyLevel), [1, 2, 3, 4]);
});

test('every topic makes sound questions at every level', () => {
  const makers = {
    fractions: makeFractionQuestion,
    angles: makeAnglesQuestion,
    length: makeLengthQuestion,
    operations: (l) => makeExpandedQuestion('operations', l),
    decimals: (l) => makeExpandedQuestion('decimals-percent', l),
    time: (l) => makeExpandedQuestion('time', l),
    mass: (l) => makeExpandedQuestion('mass-capacity', l),
  };
  for (const level of DIFFICULTY.levels) {
    for (const [name, make] of Object.entries(makers)) {
      for (let i = 0; i < RUNS; i++) checkChoice(make(level), `${name} L${level}`);
    }
  }
});

test('the random mission works at every level', () => {
  for (const level of DIFFICULTY.levels) {
    for (const module of PREP_MODULES) {
      for (let i = 0; i < 60; i++) checkChoice(makePrepQuestion(module.id, level, i), `${module.id} L${level}`);
    }
  }
});

test('maths quest and place value build at every level', () => {
  for (const level of DIFFICULTY.levels) {
    for (let i = 0; i < 40; i++) {
      const set = createQuestSet(level);
      assert.equal(set.problems.length, 10, `quest L${level}`);
      for (const p of set.problems) {
        assert.ok(p.answer !== undefined && !Number.isNaN(p.answer), `quest L${level}: ${p.prompt}`);
        if (p.kind === 'choice') checkChoice(p, `quest L${level}`);
      }
      const pv = makePlaceValueVariant(level);
      assert.equal(pv.slots.length, 3, `place value L${level}`);
      assert.ok(Number.isFinite(pv.lockIn.value), `place value L${level}`);
    }
  }
});

test('Year 2 has picture questions and gentle times tables; Year 7 goes beyond 12', () => {
  assert.deepEqual(timesConfigForLevel(1).tables, [2, 5, 10]);
  assert.ok(timesConfigForLevel(6).tables.includes(15));
  assert.notDeepEqual(timesConfigForLevel(4), timesConfigForLevel(5));
  const visuals = Array.from({ length: 200 }, () => makeExpandedQuestion('time', 1)).filter((q) => q.visual);
  assert.ok(visuals.length > 0 && visuals.every((q) => q.visual.startsWith('<svg') && q.key));
});
