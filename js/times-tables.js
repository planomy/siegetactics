import { ECONOMY } from './economy.js';
import { GATE, tableKey } from './training-gate.js';
import { difficultyTrainingTag } from './difficulty.js';

/** @typedef {import('./difficulty.js').DifficultyLevel} DifficultyLevel */

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
  if (level === 1) {
    return { tables: [2, 3, 5, 10], multMin: 1, multMax: 10, showMixed: false };
  }
  if (level === 2) {
    return { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], multMin: 1, multMax: 10, showMixed: true };
  }
  return { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], multMin: 1, multMax: 12, showMixed: true };
}

/**
 * @param {number} table 2–12, or 0 for mixed
 * @param {DifficultyLevel} level
 * @returns {{ a: number, b: number, answer: number }}
 */
export function makeTimesQuestion(table, level = 3) {
  const cfg = timesConfigForLevel(level);
  const pick = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const a = table > 0 ? table : pick(cfg.tables[0], cfg.tables[cfg.tables.length - 1]);
  const b = pick(cfg.multMin, cfg.multMax);
  return { a, b, answer: a * b };
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
      <div class="panel times-panel">
        <button type="button" class="btn btn-ghost btn-sm times-back" id="times-home">← Home</button>
        <p class="mission-tag">Number · Fluency · ${difficultyTrainingTag(callbacks.difficultyLevel)}</p>
        <h2 class="panel-title">Times Tables</h2>
        <p class="granny-line">Choose a table and sharpen your rapid recall. Every correct answer earns ${ECONOMY.forgeXpLabel}.</p>
        <p class="times-gate-progress">${done.size} practice set${done.size === 1 ? '' : 's'} logged this cycle</p>
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
        startSession();
      });
    });
  }

  function startSession() {
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
        <button type="button" class="btn btn-ghost btn-sm times-back" id="times-quit">← Quit</button>
        <div class="times-quiz-header">
          <span class="times-quiz-tag">${tableLabel}</span>
          <span class="times-quiz-progress">${index + 1} / ${deck.length}</span>
        </div>
        <div class="times-streak" id="times-streak" hidden>
          <span class="times-streak-label">Streak</span>
          <span class="times-streak-num" id="times-streak-num">0</span>
        </div>
        <div class="times-question-wrap">
          <p class="times-question">${q.a} × ${q.b} = ?</p>
        </div>
        <div class="times-answers" id="times-answers">${opts}</div>
        <p class="times-session-xp">Session XP: <strong id="times-session-xp">${sessionXp}</strong></p>
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
          if (xpEl) xpEl.textContent = String(sessionXp);
        } else {
          streak = 0;
          callbacks.showToast(`It's ${q.answer}. Keep going!`, { variant: 'shop' });
        }

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
  function renderDone(bonus = 0, accuracy = correct / Math.max(1, deck.length), gateAdded = false, gateReason) {
    const pct = Math.round(accuracy * 100);
    const label = chosenTable > 0 ? `×${chosenTable}` : 'Mixed';
    let gateNote = '';
    if (gateAdded) {
      gateNote = `${label} practice logged!`;
    } else if (passed && gateReason) {
      gateNote = gateReason;
    } else if (!passed) {
      gateNote = `Keep practising — aim for ${Math.round(GATE.passAccuracy * 100)}%+.`;
    }
    host.innerHTML = `
      <div class="panel times-panel times-done">
        <p class="mission-tag">Session complete</p>
        <h2 class="panel-title">${correct} / ${deck.length} correct</h2>
        <p class="granny-line">${pct}% on the ${label} drill.${gateNote ? ` ${gateNote}` : ''}</p>
        <div class="times-done-xp">
          <span class="times-done-xp-num">+${sessionXp}</span>
          <span class="times-done-xp-label">${ECONOMY.forgeXpLabel}</span>
        </div>
        ${bonus > 0 ? `<p class="times-bonus-note">Accuracy bonus +${bonus} XP!</p>` : ''}
        ${gateAdded ? '<p class="times-gate-added">Practice logged!</p>' : ''}
        <div class="times-done-actions">
          <button type="button" class="btn btn-primary" id="times-again">Drill again</button>
          <button type="button" class="btn btn-ghost" id="times-home-done">Home</button>
        </div>
      </div>
    `;
    host.querySelector('#times-again')?.addEventListener('click', startSession);
    host.querySelector('#times-home-done')?.addEventListener('click', callbacks.onHome);
  }

  render();
}
