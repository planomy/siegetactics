import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILLS, QUESTION_TYPES } from '../js/maths-skills.js';
import { makeFractionQuestion } from '../js/fractions.js';
import { makeLengthQuestion } from '../js/measurement-length.js';
import { makeAnglesQuestion } from '../js/angles-shapes.js';
import { makeExpandedQuestion } from '../js/expanded-maths.js';
import { makeTimesQuestion, timesConfigForLevel } from '../js/times-tables.js';
import { makePrepQuestion, PREP_MODULES } from '../js/battle-prep.js';
import { createQuestSet, QUEST_SETS } from '../js/maths-quest-data.js';
import { makePlaceValueVariant } from '../js/missions-data.js';

const LEVELS = [1, 2, 3, 4, 5, 6];
const SAMPLES = 600;

const GENERATORS = {
  fractions: makeFractionQuestion,
  'measurement-length': makeLengthQuestion,
  angles: makeAnglesQuestion,
  operations: (level) => makeExpandedQuestion('operations', level),
  'decimals-percent': (level) => makeExpandedQuestion('decimals-percent', level),
  time: (level) => makeExpandedQuestion('time', level),
  'mass-capacity': (level) => makeExpandedQuestion('mass-capacity', level),
};

/** @param {{ type?: string, skill?: string, prompt?: string }} q @param {string} where */
function assertLabelled(q, where) {
  assert.ok(q.type, `${where}: no question type on "${q.prompt}"`);
  assert.ok(SKILLS[q.skill], `${where}: "${q.type}" has unknown skill "${q.skill}" ("${q.prompt}")`);
}

test('every skill a question type points to is in the skill list', () => {
  for (const [type, skill] of Object.entries(QUESTION_TYPES)) {
    assert.ok(SKILLS[skill], `${type} points to missing skill ${skill}`);
  }
});

test('every topic question at every level carries a known skill and question type', () => {
  const seen = new Set();
  for (const [topic, make] of Object.entries(GENERATORS)) {
    for (const level of LEVELS) {
      for (let i = 0; i < SAMPLES; i++) {
        const q = make(level);
        assertLabelled(q, `${topic} level ${level}`);
        assert.ok(q.type.startsWith(`${topic}:`), `${topic} level ${level} produced ${q.type}`);
        assert.equal(q.skill, QUESTION_TYPES[q.type]);
        seen.add(q.type);
      }
    }
  }
  const unreached = Object.keys(QUESTION_TYPES).filter((t) => Object.keys(GENERATORS).some((topic) => t.startsWith(`${topic}:`)) && !seen.has(t));
  assert.deepEqual(unreached, [], 'listed question types that no question maker produces (probably a typo)');
});

test('times tables facts are labelled by their table', () => {
  for (const level of LEVELS) {
    for (const table of timesConfigForLevel(level).tables) {
      const q = makeTimesQuestion(table, level);
      assert.equal(q.type, `times-tables:table-${table}`);
      assert.equal(q.skill, 'operations.times-tables');
    }
  }
});

test('Battle Prep questions from every module are labelled', () => {
  for (const level of LEVELS) {
    for (const module of PREP_MODULES) {
      for (let i = 0; i < 60; i++) assertLabelled(makePrepQuestion(module.id, level, i), `prep ${module.id} level ${level}`);
    }
  }
});

test('Place Value Patrol slots and totals are labelled', () => {
  for (const level of LEVELS) {
    const mission = makePlaceValueVariant(level);
    for (const slot of mission.slots) assert.equal(slot.skill, 'number.place-value');
    assert.equal(mission.lockIn.skill, 'number.place-value');
    assert.equal(mission.lockIn.type, 'exact');
  }
});

test('every Maths Quest problem, generated or hand-written, is labelled', () => {
  for (const level of LEVELS) {
    for (let i = 0; i < 20; i++) {
      for (const problem of createQuestSet(level).problems) assertLabelled(problem, `quest level ${level}`);
    }
  }
  for (const set of QUEST_SETS) {
    set.problems.forEach((problem, i) => {
      assertLabelled(problem, set.id);
      assert.equal(problem.type, `maths-quest:${set.id}-${i + 1}`);
    });
  }
});
