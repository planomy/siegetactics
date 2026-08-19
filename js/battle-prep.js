import { makeTimesQuestion, timesConfigForLevel } from './times-tables.js?v=20260819b';
import { makePlaceValueVariant } from './missions-data.js?v=20260819b';
import { makeLengthQuestion } from './measurement-length.js?v=20260819b';
import { makeFractionQuestion } from './fractions.js?v=20260819b';
import { makeAnglesQuestion } from './angles-shapes.js?v=20260819b';
import { makeExpandedQuestion } from './expanded-maths.js?v=20260819b';
import { difficultyTrainingTag } from './difficulty.js';
import { sanitizeQuestionOptions, valuesMatch } from './question-options.js?v=20260819b';

export const PREP_MODULES = [
  { id: 'times-tables', title: 'Target Times Table', symbol: '×' },
  { id: 'place-value-siege', title: 'Place Value', symbol: '10' },
  { id: 'measurement-length', title: 'Length', symbol: 'cm' },
  { id: 'fractions', title: 'Fractions', symbol: '½' },
  { id: 'angles', title: 'Angles & Shapes', symbol: '∠' },
  { id: 'mass-capacity', title: 'Mass Capacity Volume', symbol: 'kg' },
  { id: 'operations', title: 'Operations', symbol: '+' },
  { id: 'decimals-percent', title: 'Decimals & %', symbol: '%' },
  { id: 'time', title: 'Time', symbol: '⏱' },
];

/** @param {number} level */
export function questionsPerCoreModule(level) {
  if (level === 1) return 2;
  if (level === 2) return 3;
  return 5;
}

/** @param {unknown[]} values */
function shuffle(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** @param {number} answer */
function numberOptions(answer) {
  const offsets = [1, 2, 3, 5, 10];
  const values = new Set([answer]);
  let guard = 0;
  while (values.size < 4 && guard++ < 30) {
    const delta = offsets[Math.floor(Math.random() * offsets.length)];
    const wrong = answer + (Math.random() < 0.5 ? -delta : delta);
    if (wrong >= 0 && wrong !== answer) values.add(wrong);
  }
  while (values.size < 4) values.add(answer + values.size + 1);
  return shuffle([...values].map((value) => ({ label: String(value), value })));
}

/** @param {number} level @param {number} cycle */
function timesQuestion(level, cycle) {
  const cfg = timesConfigForLevel(level);
  const targetTable = level <= 2 ? cfg.tables[cycle % cfg.tables.length] : 0;
  const fact = makeTimesQuestion(targetTable, level);
  if (level === 4) {
    const kind = Math.floor(Math.random() * 3);
    if (kind === 1) {
      return {
        prompt: `${fact.answer} ÷ ${fact.a} = ?`,
        answer: fact.b,
        options: numberOptions(fact.b),
        skill: 'division fact',
      };
    }
    if (kind === 2) {
      return {
        prompt: `${fact.a} × ? = ${fact.answer}`,
        answer: fact.b,
        options: numberOptions(fact.b),
        skill: 'missing factor',
      };
    }
  }
  return {
    prompt: `${fact.a} × ${fact.b} = ?`,
    answer: fact.answer,
    options: numberOptions(fact.answer),
    skill: targetTable > 0 ? `×${targetTable}` : 'mixed × facts',
  };
}

/** @param {number} level */
function placeValueQuestion(level) {
  const mission = makePlaceValueVariant(level);
  const slot = mission.slots[Math.floor(Math.random() * mission.slots.length)];
  const answer = Number(slot.options[slot.correctIndex]);
  return {
    prompt: `In ${mission.lockIn.value.toLocaleString()}, what is the value of the ${slot.role.toLowerCase()} digit?`,
    answer,
    options: shuffle(slot.options.map((value) => ({ label: Number(value).toLocaleString(), value: Number(value) }))),
  };
}

/** @param {string} moduleId @param {number} level @param {number} cycle */
export function makePrepQuestion(moduleId, level, cycle = 0) {
  let question;
  if (moduleId === 'times-tables') question = timesQuestion(level, cycle);
  else if (moduleId === 'place-value-siege') question = placeValueQuestion(level);
  else if (moduleId === 'measurement-length') question = makeLengthQuestion(level);
  else if (moduleId === 'fractions') question = makeFractionQuestion(level);
  else if (moduleId === 'angles') question = makeAnglesQuestion(level);
  else question = makeExpandedQuestion(moduleId, level);

  // Some standalone drills deliberately trim distractors. Battle Prep must always
  // keep the correct choice present when it combines questions from every module.
  if (!question.options.some((option) => valuesMatch(option.value, question.answer))) {
    const options = [...question.options];
    const correct = { label: String(question.answer), value: question.answer };
    if (options.length > 1) options[options.length - 1] = correct;
    else options.push(correct);
    question = { ...question, options: shuffle(options) };
  }
  return sanitizeQuestionOptions(question);
}

/** @param {number} level @param {number} cycle */
export function buildBattlePrepDeck(level, cycle = 0) {
  const coreCount = questionsPerCoreModule(level);
  const deck = [];
  for (const module of PREP_MODULES) {
    const count = module.id === 'times-tables' ? 10 : coreCount;
    const used = new Set();
    let guard = 0;
    while (used.size < count && guard++ < count * 80) {
      const question = makePrepQuestion(module.id, level, cycle);
      if (used.has(question.prompt)) continue;
      used.add(question.prompt);
      deck.push({ ...question, moduleId: module.id, moduleTitle: module.title, rescue: false });
    }
  }
  return deck;
}

/**
 * @param {HTMLElement} host
 * @param {{
 *   level: number,
 *   cycle: number,
 *   onAwardXp: (amount: number) => void,
 *   onFinished: (results: Record<string, {correct:number, attempts:number, accuracy:number}>, overall:number) => void,
 *   onReady: (overall:number) => void,
 *   onHome: () => void,
 *   showToast: (message:string, opts?:{variant?:string}) => void,
 * }} callbacks
 */
export function initBattlePrep(host, callbacks) {
  let deck = buildBattlePrepDeck(callbacks.level, callbacks.cycle);
  const initialTotal = deck.length;
  const coreQuestions = questionsPerCoreModule(callbacks.level);
  let index = 0;
  let totalCorrect = 0;
  let answered = false;
  let finished = false;
  let disposed = false;
  let timer = null;
  const results = Object.fromEntries(PREP_MODULES.map((module) => [module.id, { correct: 0, attempts: 0, accuracy: 0 }]));

  function clearTimer() {
    if (timer != null) clearTimeout(timer);
    timer = null;
  }

  function renderQuestion() {
    const item = deck[index];
    const modulePosition = PREP_MODULES.findIndex((module) => module.id === item.moduleId) + 1;
    const moduleTarget = item.moduleId === 'times-tables' ? 10 : coreQuestions;
    const moduleQuestion = deck
      .slice(0, index + 1)
      .filter((question) => question.moduleId === item.moduleId && !question.rescue).length;
    const answeredBefore = deck.slice(0, index);
    const moduleRail = PREP_MODULES.map((module) => {
      const answeredForModule = answeredBefore.filter(
        (question) => question.moduleId === module.id && !question.rescue
      ).length;
      const target = module.id === 'times-tables' ? 10 : coreQuestions;
      const current = module.id === item.moduleId;
      const done = answeredForModule >= target && !current;
      return `<span
        class="prep-module-node${current ? ' is-current' : ''}${done ? ' is-done' : ''}"
        title="${escapeAttr(module.title)}"
        ${current ? 'aria-current="step"' : ''}
      >${done ? '✓' : escapeHtml(module.symbol)}</span>`;
    }).join('');
    const options = item.options.map((option) => `
      <button type="button" class="times-answer-btn prep-answer" data-value="${escapeAttr(String(option.value))}">${escapeHtml(String(option.label))}</button>
    `).join('');
    host.innerHTML = `
      <div class="panel times-panel prep-panel">
        <button type="button" class="btn btn-ghost btn-sm times-back" id="prep-home">← Home</button>
        <p class="mission-tag">Battle Prep · ${difficultyTrainingTag(callbacks.level)}</p>
        <h2 class="panel-title">${escapeHtml(item.moduleTitle)}</h2>
        <div class="prep-module-rail" aria-label="Battle Prep module progress">${moduleRail}</div>
        <div class="prep-track"><span style="width:${Math.round((index / deck.length) * 100)}%"></span></div>
        <div class="times-quiz-header">
          <span class="times-quiz-tag">Module ${modulePosition} / ${PREP_MODULES.length}</span>
          <span class="times-quiz-progress">${item.rescue ? 'Rescue question' : `Question ${moduleQuestion} / ${moduleTarget}`} · Overall ${index + 1} / ${deck.length}</span>
        </div>
        <div class="times-question-wrap"><p class="times-question length-question">${escapeHtml(item.prompt)}</p></div>
        <div class="times-answers">${options}</div>
        <p class="prep-summary-line">10 Times Tables · ${coreQuestions} per other module · ${initialTotal} total${item.rescue ? ' · rescue' : ''}</p>
      </div>`;
    host.querySelector('#prep-home')?.addEventListener('click', callbacks.onHome);
    host.querySelectorAll('.prep-answer').forEach((button) => {
      button.addEventListener('click', () => answer(button, item));
    });
  }

  function answer(button, item) {
    if (answered || disposed) return;
    answered = true;
    const picked = button.getAttribute('data-value') ?? '';
    const right = valuesMatch(picked, item.answer);
    const stats = results[item.moduleId];
    stats.attempts += 1;
    if (right) {
      stats.correct += 1;
      totalCorrect += 1;
      callbacks.onAwardXp(item.moduleId === 'times-tables' ? 3 : 4);
    } else if (!item.rescue) {
      const rescue = makePrepQuestion(item.moduleId, callbacks.level, callbacks.cycle);
      deck.push({ ...rescue, moduleId: item.moduleId, moduleTitle: item.moduleTitle, rescue: true });
    }
    host.querySelectorAll('.prep-answer').forEach((candidate) => {
      const isAnswer = valuesMatch(candidate.getAttribute('data-value') ?? '', item.answer);
      candidate.classList.toggle('is-correct', isAnswer);
      candidate.disabled = true;
    });
    if (!right) {
      button.classList.add('is-wrong');
      const shown = item.options.find((option) => valuesMatch(option.value, item.answer))?.label ?? item.answer;
      callbacks.showToast(`Correct: ${shown}${item.rescue ? '' : ' · Rescue question added'}`, { variant: 'shop' });
    }
    clearTimer();
    timer = setTimeout(() => {
      timer = null;
      if (disposed) return;
      index += 1;
      if (index >= deck.length) finish();
      else {
        answered = false;
        renderQuestion();
      }
    }, right ? 550 : 900);
  }

  function finish() {
    if (finished || disposed) return;
    finished = true;
    for (const stats of Object.values(results)) {
      stats.accuracy = stats.attempts > 0 ? stats.correct / stats.attempts : 0;
    }
    const overall = deck.length > 0 ? totalCorrect / deck.length : 0;
    callbacks.onFinished(results, overall);
    host.innerHTML = `
      <div class="panel times-panel times-done prep-panel prep-done">
        <p class="mission-tag">Battle Prep complete</p>
        <h2 class="panel-title">Cleared to defend Granny</h2>
        <p class="granny-line">You completed all ${PREP_MODULES.length} curriculum stations. Accuracy: ${Math.round(overall * 100)}%.</p>
        <div class="times-done-actions">
          <button type="button" class="btn btn-primary" id="prep-defend">Defend Granny</button>
          <button type="button" class="btn btn-ghost" id="prep-home-done">Home</button>
        </div>
      </div>`;
    host.querySelector('#prep-defend')?.addEventListener('click', () => callbacks.onReady(overall));
    host.querySelector('#prep-home-done')?.addEventListener('click', callbacks.onHome);
  }

  renderQuestion();
  return () => {
    disposed = true;
    clearTimer();
  };
}

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, '&#39;');
}
