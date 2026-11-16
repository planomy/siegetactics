import { ECONOMY } from './economy.js';
import { labelQuestion } from './maths-skills.js';
import { GATE, tableKey } from './training-gate.js?v=20261114n1';
import { gateRemaining } from './gate-status.js?v=20261116xp21';
import { difficultyTrainingTag } from './difficulty.js?v=20261114k1';
import { renderDoneActions, bindDoneActions } from './done-actions.js?v=20261116xp27';
import { isResumable } from './drill-session.js?v=20261114m1';

/** @typedef {import('./difficulty.js?v=20261114k1').DifficultyLevel} DifficultyLevel */

/** @typedef {'pick'|'quiz'|'done'} TimesPhase */

export const TIMES_TABLES = {
  questionsPerSession: 10,
  xpPerCorrect: 3,
  streakLength: 5,
  streakBonusXp: 5,
  /** Bonus XP when accuracy >= this (0–1) at end of session. */
  accuracyBonusThreshold: 0.8,
  accuracyBonusXp: 10,
  tables: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
};

/**
 * @param {DifficultyLevel} level
 * @returns {{ tables: number[], multMin: number, multMax: number, showMixed: boolean }}
 */
export function timesConfigForLevel(level) {
  if (level <= 1) {
    return { tables: [2, 5, 10], multMin: 1, multMax: 10, showMixed: false };
  }
  if (level === 2) {
    return { tables: [2, 3, 4, 5, 10], multMin: 1, multMax: 10, showMixed: false };
  }
  if (level === 3) {
    return { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], multMin: 1, multMax: 10, showMixed: true };
  }
  if (level === 4) {
    return { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], multMin: 1, multMax: 12, showMixed: true };
  }
  if (level === 5) {
    // The tricky facts: no ×1 or ×10 freebies.
    return { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], multMin: 2, multMax: 12, showMixed: true };
  }
  return { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], multMin: 2, multMax: 15, showMixed: true };
}

/**
 * @param {number} table 2–12, or 0 for mixed
 * @param {DifficultyLevel} level
 * @returns {{ a: number, b: number, answer: number, type: string, skill: string }}
 */
export function makeTimesQuestion(table, level = 3) {
  const cfg = timesConfigForLevel(level);
  const pick = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const a = table > 0 ? table : pick(cfg.tables[0], cfg.tables[cfg.tables.length - 1]);
  const b = pick(cfg.multMin, cfg.multMax);
  return labelQuestion({ a, b, answer: a * b }, 'times-tables', `table-${a}`);
}

/** @param {number} correct */
function makeOptions(correct) {
  const opts = new Set([correct]);
  let guard = 0;
  while (opts.size < 4 && guard++ < 40) {
    const delta = pick([-3, -2, -1, 1, 2, 3, 4, 5, 6, 8, 10]);
    const wrong = correct + delta;
    if (wrong > 0 && wrong !== correct) opts.add(wrong);
  }
  while (opts.size < 4) opts.add(correct + opts.size * 2);
  return shuffle([...opts]);
}

/** @param {number[]} arr */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** @param {number[]} choices */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * @param {HTMLElement} host
 * @param {{
 *   playerName: string,
 *   onAwardXp: (amount: number) => void,
 *   onAnswer?: (right: boolean) => void,
 *   onSessionComplete: (result: { table: number, accuracy: number, passed: boolean, gateAdded: boolean }) => void,
 *   onHome: () => void,
 *   showToast: (msg: string, opts?: { variant?: string }) => void,
 *   completedTables: string[],
 *   difficultyLevel: DifficultyLevel,
 * }} callbacks
 */
export function initTimesTables(host, callbacks) {
  const levelCfg = timesConfigForLevel(callbacks.difficultyLevel);
  /** @type {TimesPhase} */
  let phase = 'pick';
  /** @type {number} 0 = mixed */
  let chosenTable = 0;
  /** @type {{ a: number, b: number, answer: number, options: number[] }[]} */
  let deck = [];
  let index = 0;
  let correct = 0;
  let streak = 0;
  let sessionXp = 0;
  let answered = false;
  /** A set the player left part-way through, to carry on from. */
  let paused = callbacks.resume ?? null;

  function render() {
    if (phase === 'pick') renderPick();
    else if (phase === 'quiz') renderQuiz();
    else renderDone();
  }

  function renderPick() {
    const done = new Set(callbacks.completedTables ?? []);
    const tableBtns = levelCfg.tables.map((n) => {
      const key = tableKey(n);
      const counted = done.has(key);
      return `<button type="button" class="times-table-btn${counted ? ' times-table-done' : ''}" data-table="${n}">
        <span class="times-table-num">×${n}</span>
        ${counted ? '<span class="times-table-check" aria-label="Practised this cycle">✓</span>' : ''}
      </button>`;
    });
    const mixedDone = done.has('mixed');
    const mixedBtn = levelCfg.showMixed
      ? `<button type="button" class="times-table-btn times-table-mixed${mixedDone ? ' times-table-done' : ''}" data-table="0">
          <span class="times-table-num">Mixed</span>
          <span class="times-table-sub">All tables</span>
          ${mixedDone ? '<span class="times-table-check" aria-label="Practised this cycle">✓</span>' : ''}
        </button>`
      : '';
    host.innerHTML = `
      <div class="panel times-panel times-pick">
        <div class="times-pick-bar">
          <button type="button" class="btn btn-ghost btn-sm times-back" id="times-home">← Home</button>
          <h2 class="times-pick-title">Times Tables <span>· ${difficultyTrainingTag(callbacks.difficultyLevel)}</span></h2>
          ${done.size ? `<span class="times-pick-sets">${done.size} set${done.size === 1 ? '' : 's'} this cycle</span>` : ''}
        </div>
        <div class="times-table-grid">
          ${tableBtns.join('')}
          ${mixedBtn}
        </div>
      </div>
    `;
    host.querySelector('#times-home')?.addEventListener('click', callbacks.onHome);
    host.querySelectorAll('[data-table]').forEach((btn) => {
      btn.addEventListener('click', () => {
        chosenTable = Number(btn.getAttribute('data-table'));
        startSession(paused?.table === chosenTable);
      });
    });
  }

  function startSession(allowResume = false) {
    streak = 0;
    phase = 'quiz';
    answered = false;
    if (allowResume && isResumable(paused)) {
      ({ deck, index } = paused);
      correct = paused.correct || 0;
      sessionXp = paused.sessionXp || 0;
      callbacks.showToast(`Welcome back — carry on from question ${index + 1}!`, { variant: 'success' });
      render();
      return;
    }
    deck = [];
    const used = new Set();
    let guard = 0;
    while (deck.length < TIMES_TABLES.questionsPerSession && guard++ < 250) {
      const q = makeTimesQuestion(chosenTable, callbacks.difficultyLevel);
      const key = `${q.a}x${q.b}`;
      if (used.has(key)) continue;
      used.add(key);
      deck.push({ ...q, options: makeOptions(q.answer) });
    }
    index = 0;
    correct = 0;
    streak = 0;
    sessionXp = 0;
    phase = 'quiz';
    answered = false;
    render();
  }

  function renderQuiz() {
    const q = deck[index];
    const tableLabel =
      chosenTable > 0 ? `×${chosenTable} table` : 'Mixed tables';
    const opts = q.options
      .map(
        (n) =>
          `<button type="button" class="times-answer-btn" data-answer="${n}">${n}</button>`
      )
      .join('');

    host.innerHTML = `
      <div class="panel times-panel">
        <div class="times-quiz-header times-quiz-toolbar">
          <div class="times-toolbar-left">
            <button type="button" class="btn btn-ghost btn-sm times-back" id="times-quit">← Quit</button>
            <span class="times-quiz-tag">${tableLabel}</span>
          </div>
          <div class="times-toolbar-centre">
            <div class="session-xp-badge" aria-label="Session XP ${sessionXp}">
              <span class="session-xp-badge-label">XP</span>
              <strong class="session-xp-badge-num" id="times-session-xp">${sessionXp}</strong>
            </div>
          </div>
          <div class="times-toolbar-right">
            <div class="times-streak" id="times-streak" hidden>
              <span class="times-streak-label">Streak</span>
              <span class="times-streak-num" id="times-streak-num">0</span>
            </div>
          </div>
        </div>
        <div class="times-question-wrap">
          <p class="times-question">${q.a} × ${q.b} = ?</p>
        </div>
        <div class="times-answers" id="times-answers">${opts}</div>
      </div>
    `;

    host.querySelector('#times-quit')?.addEventListener('click', () => {
      phase = 'pick';
      render();
    });

    const streakEl = host.querySelector('#times-streak');
    const streakNum = host.querySelector('#times-streak-num');
    if (streakEl && streakNum) {
      streakEl.hidden = streak < 2;
      streakNum.textContent = String(streak);
    }

    host.querySelectorAll('.times-answer-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const picked = Number(btn.getAttribute('data-answer'));
        const right = picked === q.answer;
        btn.classList.add(right ? 'is-correct' : 'is-wrong');
        host.querySelectorAll('.times-answer-btn').forEach((b) => {
          if (Number(b.getAttribute('data-answer')) === q.answer) b.classList.add('is-correct');
          b.disabled = true;
        });

        if (right) {
          correct += 1;
          streak += 1;
          let gain = TIMES_TABLES.xpPerCorrect;
          if (streak > 0 && streak % TIMES_TABLES.streakLength === 0) {
            gain += TIMES_TABLES.streakBonusXp;
            callbacks.showToast(`${streak} in a row! +${TIMES_TABLES.streakBonusXp} bonus`, {
              variant: 'success',
            });
          }
          sessionXp += gain;
          callbacks.onAwardXp(gain);
          const xpEl = host.querySelector('#times-session-xp');
          const badge = host.querySelector('.session-xp-badge');
          if (xpEl) xpEl.textContent = String(sessionXp);
          if (badge) {
            badge.classList.remove('is-pop');
            void badge.offsetWidth;
            badge.classList.add('is-pop');
          }
        } else {
          streak = 0;
          callbacks.showToast(`It's ${q.answer}. Keep going!`, { variant: 'shop' });
        }

        callbacks.onAnswer?.(right);
        paused = index + 1 < deck.length ? { table: chosenTable, deck, index: index + 1, correct, sessionXp } : null;
        callbacks.onProgress?.(paused);
        setTimeout(() => {
          index += 1;
          if (index >= deck.length) finishSession();
          else {
            answered = false;
            render();
          }
        }, right ? 650 : 950);
      });
    });
  }

  function finishSession() {
    const accuracy = correct / deck.length;
    let bonus = 0;
    if (accuracy >= TIMES_TABLES.accuracyBonusThreshold) {
      bonus = TIMES_TABLES.accuracyBonusXp;
      sessionXp += bonus;
      callbacks.onAwardXp(bonus);
    }
    const passed = accuracy >= GATE.passAccuracy;
    const result = callbacks.onSessionComplete({
      table: chosenTable,
      accuracy,
      passed,
      gateAdded: false,
    });
    phase = 'done';
    renderDone(bonus, accuracy, result?.gateAdded ?? false, result?.reason);
  }

  /**
   * @param {number} [bonus]
   * @param {number} [accuracy]
   * @param {boolean} [gateAdded]
   * @param {string} [gateReason]
   */
  function renderDone(bonus = 0, accuracy = correct / Math.max(1, deck.length), gateAdded = false, _gateReason) {
    const charged = gateAdded || Boolean(callbacks.siegeReady?.());
    const more = Math.max(1, gateRemaining() || TIMES_TABLES.questionsPerSession);
    // Charged: no "again" — the red radar Defend is the next move. Uncharged: more questions to fill the bar.
    const againLabel = charged
      ? null
      : `Give me ${more} more question${more === 1 ? '' : 's'}`;
    host.innerHTML = `
      <div class="panel times-panel times-done">
        <p class="mission-tag">Session complete</p>
        <h2 class="panel-title">${correct} / ${deck.length} correct</h2>
        <div class="times-done-xp">
          <span class="times-done-xp-num">+${sessionXp}</span>
          <span class="times-done-xp-label">${ECONOMY.forgeXpLabel}</span>
        </div>
        ${charged ? '<p class="times-gate-added">SIEGE UNLOCKED — hit Defend Granny on the radar!</p>' : ''}
        ${renderDoneActions({ againLabel, siegeReady: () => false })}
      </div>
    `;
    bindDoneActions(host, { onAgain: () => startSession(false), onHome: callbacks.onHome });
  }

  if (isResumable(paused) && typeof paused.table === 'number') {
    chosenTable = paused.table;
    startSession(true);
  } else {
    render();
  }
}
