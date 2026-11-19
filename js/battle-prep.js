import { makeTimesQuestion, timesConfigForLevel } from './times-tables.js?v=20261118f4';
import { makePlaceValueQuestion } from './place-value.js?v=20261118f1';
import { makeLengthQuestion } from './measurement-length.js?v=20261114v1';
import { makeFractionQuestion } from './fractions.js?v=20261114v1';
import { makeAnglesQuestion } from './angles-shapes.js?v=20261115p1';
import { makeExpandedQuestion } from './expanded-maths.js?v=20261114v1';
import { sanitizeQuestionOptions, valuesMatch } from './question-options.js?v=20260819b';
import { labelQuestion } from './maths-skills.js';

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
  return 1;
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
  const targetTable = level <= 3 ? cfg.tables[cycle % cfg.tables.length] : 0;
  const fact = makeTimesQuestion(targetTable, level);
  if (level >= 6 && Math.random() < 0.25) {
    const n = 2 + Math.floor(Math.random() * 14);
    return Math.random() < 0.5
      ? labelQuestion({ prompt: `${n}² = ?`, answer: n * n, options: numberOptions(n * n) }, 'times-tables', 'square-number')
      : labelQuestion({ prompt: `√${n * n} = ?`, answer: n, options: numberOptions(n) }, 'times-tables', 'square-root');
  }
  if (level >= 5) {
    const kind = Math.floor(Math.random() * 3);
    if (kind === 1) {
      return labelQuestion({
        prompt: `${fact.answer} ÷ ${fact.a} = ?`,
        answer: fact.b,
        options: numberOptions(fact.b),
      }, 'times-tables', 'division-fact');
    }
    if (kind === 2) {
      return labelQuestion({
        prompt: `${fact.a} × ? = ${fact.answer}`,
        answer: fact.b,
        options: numberOptions(fact.b),
      }, 'times-tables', 'missing-factor');
    }
  }
  return {
    prompt: `${fact.a} × ${fact.b} = ?`,
    answer: fact.answer,
    options: numberOptions(fact.answer),
    type: fact.type,
    skill: fact.skill,
  };
}

/** @param {string} moduleId @param {number} level @param {number} cycle */
export function makePrepQuestion(moduleId, level, cycle = 0) {
  let question;
  if (moduleId === 'times-tables') question = timesQuestion(level, cycle);
  else if (moduleId === 'place-value-siege') question = makePlaceValueQuestion(level);
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
export function buildBattlePrepDeck(level, cycle = 0, questionsNeeded = 10) {
  const coreCount = questionsPerCoreModule(level);
  const deck = [];
  for (const module of PREP_MODULES) {
    const count = module.id === 'times-tables' ? 2 : coreCount;
    const used = new Set();
    let guard = 0;
    while (used.size < count && guard++ < count * 80) {
      const question = makePrepQuestion(module.id, level, cycle);
      const repeatKey = question.key ?? question.prompt;
      if (used.has(repeatKey)) continue;
      used.add(repeatKey);
      deck.push({ ...question, moduleId: module.id, moduleTitle: module.title, rescue: false });
    }
  }
  // The remaining credits may be fewer than ten if a player did other activities first.
  return deck.slice(0, Math.max(1, Math.min(10, Math.floor(questionsNeeded))));
}

/** Extra mixed questions when a player still needs more right answers. @param {number} level @param {number} cycle @param {number} count */
function bonusQuestions(level, cycle, count) {
  return Array.from({ length: count }, () => {
    const module = PREP_MODULES[Math.floor(Math.random() * PREP_MODULES.length)];
    return { ...makePrepQuestion(module.id, level, cycle), moduleId: module.id, moduleTitle: module.title, rescue: true };
  });
}

/**
 * @param {HTMLElement} host
 * @param {{
 *   mode?: 'prep'|'zap'|'replay',
 *   banner?: string,
 *   doneTitle?: (right: number) => string,
 *   level: number,
 *   cycle: number,
 *   questionsNeeded?: number,
 *   remainingNeeded?: () => number,
 *   stretchOffer?: () => ({ more: number, seconds: number, coins: number }|null),
 *   isCharged?: () => boolean,
 *   chargeLine?: () => string,
 *   onAgain?: () => void,
 *   onAwardXp: (amount: number) => void,
 *   onAnswer?: (right: boolean, moduleId: string) => void,
 *   onFinished: (results: Record<string, {correct:number, attempts:number, accuracy:number}>, overall:number) => void,
 *   onReady: (overall:number) => void,
 *   onHome: () => void,
 *   showToast: (message:string, opts?:{variant?:string}) => void,
 * }} callbacks
 */
export function initBattlePrep(host, callbacks) {
  // Zap mode: after the siege is earned, a short mixed run where each right answer zaps a scout.
  // Replay mode: fixed 10 mixed questions; 10/10 unlocks the same siege again.
  const zap = callbacks.mode === 'zap';
  const replay = callbacks.mode === 'replay';
  let deck = zap
    ? bonusQuestions(callbacks.level, callbacks.cycle, Math.max(1, Math.floor(callbacks.questionsNeeded ?? 1)))
    : buildBattlePrepDeck(callbacks.level, callbacks.cycle, callbacks.questionsNeeded ?? 10);
  const initialTotal = deck.length;
  const coreQuestions = questionsPerCoreModule(callbacks.level);
  let index = 0;
  let totalCorrect = 0;
  let sessionXp = 0;
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
    const answeredBefore = deck.slice(0, index);
    const moduleRail = PREP_MODULES.map((module) => {
      const answeredForModule = answeredBefore.filter(
        (question) => question.moduleId === module.id && !question.rescue
      ).length;
      const target = module.id === 'times-tables' ? 2 : coreQuestions;
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
    const banner = callbacks.banner
      ? `<p class="prep-replay-banner">${escapeHtml(callbacks.banner)}</p>`
      : '';
    host.innerHTML = `
      <div class="panel times-panel prep-panel${replay ? ' prep-panel--replay' : ''}">
        ${banner}
        <div class="times-quiz-header times-quiz-toolbar prep-toolbar">
          <div class="times-toolbar-left">
            <button type="button" class="btn btn-ghost btn-sm times-back" id="prep-home">← Home</button>
          </div>
          <div class="times-toolbar-centre">
            <div class="session-xp-badge" aria-label="Session XP ${sessionXp}">
              <span class="session-xp-badge-label">XP</span>
              <strong class="session-xp-badge-num" id="prep-session-xp">${sessionXp}</strong>
            </div>
          </div>
          <div class="times-toolbar-right">
            ${zap || replay ? `<span class="times-quiz-progress">${index + 1} / ${deck.length}</span>` : `<div class="prep-module-rail" aria-label="Battle Prep module progress">${moduleRail}</div>`}
          </div>
        </div>
        <div class="prep-track" role="progressbar" aria-valuenow="${index + 1}" aria-valuemin="1" aria-valuemax="${deck.length}" aria-label="${item.rescue ? 'Bonus question' : `Question ${index + 1} of ${deck.length}`}"><span style="width:${Math.round((index / deck.length) * 100)}%"></span></div>
        ${zap ? `<div class="times-quiz-header"><span class="times-quiz-tag">Mixed maths</span><span class="times-quiz-progress">Question ${index + 1} / ${deck.length}</span></div>` : item.rescue ? `<div class="times-quiz-header"><span class="times-quiz-progress">Bonus question</span></div>` : ''}
        <div class="times-question-wrap">${item.visual ? `<div class="question-visual">${item.visual}</div>` : ''}<p class="times-question length-question">${escapeHtml(item.prompt)}</p></div>
        <div class="times-answers">${options}</div>
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
      const gain = item.moduleId === 'times-tables' ? 3 : 4;
      sessionXp += gain;
      callbacks.onAwardXp(gain);
      const xpEl = host.querySelector('#prep-session-xp');
      const badge = host.querySelector('.session-xp-badge');
      if (xpEl) xpEl.textContent = String(sessionXp);
      if (badge) {
        badge.classList.remove('is-pop');
        void badge.offsetWidth;
        badge.classList.add('is-pop');
      }
    }
    host.querySelectorAll('.prep-answer').forEach((candidate) => {
      const isAnswer = valuesMatch(candidate.getAttribute('data-value') ?? '', item.answer);
      candidate.classList.toggle('is-correct', isAnswer);
      candidate.disabled = true;
    });
    if (!right) {
      button.classList.add('is-wrong');
      const shown = item.options.find((option) => valuesMatch(option.value, item.answer))?.label ?? item.answer;
      callbacks.showToast(`Correct answer: ${shown}. Keep going!`, { variant: 'shop' });
    }
    callbacks.onAnswer?.(right, item.moduleId);
    clearTimer();
    timer = setTimeout(() => {
      timer = null;
      if (disposed) return;
      index += 1;
      if (index >= deck.length) {
        // Wrong answers do not charge the defences, so top up — but only to this mission's own target.
        // Replay stays a fixed 10 — no rescue questions.
        if (!replay) {
          const needed = Math.max(0, Math.floor(callbacks.remainingNeeded?.() ?? 0));
          const more = zap ? needed : Math.min(needed, initialTotal - totalCorrect);
          if (more > 0) deck.push(...bonusQuestions(callbacks.level, callbacks.cycle, more));
        }
      }
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
    if (replay) {
      const perfect = totalCorrect >= 10 && totalCorrect >= initialTotal;
      if (perfect) {
        callbacks.onReady?.(1);
        return;
      }
      host.innerHTML = `
        <div class="panel times-panel times-done prep-panel prep-done">
          <button type="button" class="btn btn-ghost btn-sm times-back times-done-home" id="prep-home-done">← Home</button>
          <p class="prep-replay-banner">Score 10/10 to replay this mission</p>
          <h2 class="panel-title">${totalCorrect}/10</h2>
          <div class="times-done-actions is-again-only">
            <button type="button" class="btn btn-primary times-done-again" id="prep-again">Try again</button>
          </div>
        </div>`;
      host.querySelector('#prep-again')?.addEventListener('click', () => callbacks.onAgain?.());
      host.querySelector('#prep-home-done')?.addEventListener('click', callbacks.onHome);
      return;
    }
    if (zap) {
      host.innerHTML = `
        <div class="panel times-panel times-done prep-panel prep-done">
          <button type="button" class="btn btn-ghost btn-sm times-back times-done-home" id="prep-home-done">← Home</button>
          <p class="mission-tag">Mission complete</p>
          <h2 class="panel-title">${escapeHtml(callbacks.doneTitle?.(totalCorrect) ?? `${totalCorrect} right!`)}</h2>
        </div>`;
      host.querySelector('#prep-home-done')?.addEventListener('click', callbacks.onHome);
      return;
    }
    if (callbacks.isCharged && !callbacks.isCharged()) {
      const more = Math.max(1, Math.floor(callbacks.remainingNeeded?.() ?? callbacks.questionsNeeded ?? 10));
      const againLabel = `GIVE ME ${more} MORE OF THESE`;
      host.innerHTML = `
        <div class="panel times-panel times-done prep-panel prep-done">
          <button type="button" class="btn btn-ghost btn-sm times-back times-done-home" id="prep-home-done">← Home</button>
          <p class="mission-tag">Mission complete</p>
          <h2 class="panel-title">${totalCorrect} right!</h2>
          <div class="times-done-actions is-again-only">
            <button type="button" class="btn btn-primary times-done-again" id="prep-again">${escapeHtml(againLabel)}</button>
          </div>
        </div>`;
      host.querySelector('#prep-again')?.addEventListener('click', () => callbacks.onAgain?.());
      host.querySelector('#prep-home-done')?.addEventListener('click', callbacks.onHome);
      return;
    }
    const offer = callbacks.stretchOffer?.() ?? null;
    host.innerHTML = `
      <div class="panel times-panel times-done prep-panel prep-done">
        <button type="button" class="btn btn-ghost btn-sm times-back times-done-home" id="prep-home-done">← Home</button>
        <p class="mission-tag">Mission complete</p>
        <h2 class="panel-title">${totalCorrect} right!</h2>
        ${offer ? `
        <button type="button" class="prep-stretch" id="prep-stretch">
          <strong>🔥 KEEP GOING!</strong>
          <span>${offer.more} more right = +${offer.seconds}s · +${offer.coins} coins each</span>
        </button>` : ''}
      </div>`;
    host.querySelector('#prep-home-done')?.addEventListener('click', callbacks.onHome);
    host.querySelector('#prep-stretch')?.addEventListener('click', () => {
      if (!offer || disposed) return;
      finished = false;
      answered = false;
      deck.push(...bonusQuestions(callbacks.level, callbacks.cycle, offer.more));
      renderQuestion();
    });
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
