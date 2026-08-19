import { PREP_MODULES, buildBattlePrepDeck, makePrepQuestion } from '../js/battle-prep.js';
import { QUEST_SETS, createQuestSet } from '../js/maths-quest-data.js';

const samples = Number(process.argv[2] ?? 5000);

function optionKey(value) {
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) return `n:${Number(numeric.toFixed(9))}`;
  return `s:${String(value).trim().toLowerCase()}`;
}

function assertChoice(question, context) {
  if (!question.prompt || !Array.isArray(question.options) || question.options.length < 2) {
    throw new Error(`${context}: invalid question shape`);
  }
  const keys = question.options.map((option) => optionKey(option.value));
  if (new Set(keys).size !== keys.length) {
    throw new Error(`${context}: duplicate options in “${question.prompt}”`);
  }
  if (keys.filter((key) => key === optionKey(question.answer)).length !== 1) {
    throw new Error(`${context}: correct answer must appear exactly once in “${question.prompt}”`);
  }
}

let prepQuestions = 0;
for (const level of [1, 2, 3, 4]) {
  for (const module of PREP_MODULES) {
    for (let index = 0; index < samples; index += 1) {
      const question = makePrepQuestion(module.id, level, index);
      assertChoice(question, `Level ${level} · ${module.id}`);
      prepQuestions += 1;
      if (
        level <= 2 &&
        module.id === 'time' &&
        (/\b(?:1[3-9]|2[0-3]):\d{2}\b|24-hour/i.test(question.prompt) ||
          /how many minutes long is it|minutes after 9:00 is how many minutes after/i.test(question.prompt))
      ) {
        throw new Error(`Level ${level} · time: inappropriate prompt “${question.prompt}”`);
      }
    }
  }
  const expectedDeckSize = 10 + 8 * (level === 1 ? 2 : level === 2 ? 3 : 5);
  for (let cycle = 0; cycle < 100; cycle += 1) {
    const deck = buildBattlePrepDeck(level, cycle);
    if (deck.length !== expectedDeckSize) {
      throw new Error(`Level ${level}: expected ${expectedDeckSize} Battle Prep questions, received ${deck.length}`);
    }
  }
}

let questProblems = 0;
for (const level of [1, 2, 3, 4]) {
  for (let index = 0; index < samples; index += 1) {
    const set = createQuestSet(level);
    if (set.problems.length !== 10) throw new Error(`Level ${level}: Maths Quest did not contain 10 problems`);
    for (const problem of set.problems) {
      if (problem.kind === 'choice') assertChoice(problem, `Level ${level} · Maths Quest`);
      questProblems += 1;
    }
  }
}

for (const set of QUEST_SETS) {
  for (const problem of set.problems) {
    if (problem.kind === 'choice') assertChoice(problem, `Classic quest · ${set.id}`);
  }
}

console.log(`Question audit passed: ${prepQuestions.toLocaleString()} Battle Prep questions and ${questProblems.toLocaleString()} Maths Quest problems.`);
