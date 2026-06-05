import { ECONOMY } from './economy.js';
import { difficultyTrainingTag } from './difficulty.js';
import { getQuestSet, getQuestSetsForLevel } from './maths-quest-data.js';

export const MATHS_QUEST = {
  problemsPerSet: 10,
  xpPerCorrect: 5,
  /** Bonus XP when accuracy >= this (0–1) at end of set. */
  accuracyBonusThreshold: 0.8,
  accuracyBonusXp: 15,
};

/** @typedef {'pick'|'quiz'|'done'} QuestPhase */

/**
 * @param {HTMLElement} host
 * @param {{
 *   difficultyLevel: import('./difficulty.js').DifficultyLevel,
 *   onAwardXp: (amount: number) => number|void,
 *   onSessionComplete?: (accuracy: number) => void,
 *   onHome: () => void,
 *   showToast: (msg: string, opts?: { variant?: string }) => void,
 * }} callbacks
 * @returns {() => void} Dispose — clears pending timers (call before re-init or leaving).
 */
export function initMathsQuest(host, callbacks) {
  /** @type {QuestPhase} */
  let phase = 'pick';
  /** @type {import('./maths-quest-data.js').QuestSet|null} */
  let activeSet = null;
  let index = 0;
  let correct = 0;
  let sessionXp = 0;
  let answered = false;
  let sessionReported = false;
  /** @type {ReturnType<typeof setTimeout>|null} */
  let answerTimer = null;
  let lastDone = { accuracy: 0, bonus: 0 };
  let disposed = false;

  const sets = getQuestSetsForLevel(callbacks.difficultyLevel);

  function clearAnswerTimer() {
    if (answerTimer != null) {
      clearTimeout(answerTimer);
      answerTimer = null;
    }
  }

  function goHome() {
    if (disposed) return;
    clearAnswerTimer();
    disposed = true;
    callbacks.onHome();
  }

  function render() {
    if (phase === 'pick') renderPick();
    else if (phase === 'quiz') renderQuiz();
    else if (phase === 'done') renderDone(lastDone.accuracy, lastDone.bonus);
  }

  function renderPick() {
    const setCards =
      sets.length > 0
        ? sets
            .map(
              (set) => `
          <button type="button" class="quest-set-btn" data-set="${set.id}">
            <span class="quest-set-title">${escapeHtml(set.title)}</span>
            <span class="quest-set-sub">${escapeHtml(set.subtitle)}</span>
            <span class="quest-set-meta">${set.problems.length} problems</span>
          </button>`
            )
            .join('')
        : `<p class="granny-line">No quest sets at Level ${callbacks.difficultyLevel} yet — try another level on Home.</p>`;

    host.innerHTML = `
      <div class="panel times-panel quest-panel">
        <button type="button" class="btn btn-ghost btn-sm times-back" id="quest-home">← Home</button>
        <p class="mission-tag">Problem solving · ${difficultyTrainingTag(callbacks.difficultyLevel)}</p>
        <h2 class="panel-title">Maths Quest</h2>
        <p class="granny-line">Pick a set of 10 problems — word sums, patterns, and logic puzzles. Every correct answer earns ${ECONOMY.forgeXpLabel}.</p>
        <div class="quest-set-grid">${setCards}</div>
      </div>
    `;

    host.querySelector('#quest-home')?.addEventListener('click', goHome);
    host.querySelectorAll('[data-set]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-set');
        if (!id) return;
        activeSet = getQuestSet(id);
        if (!activeSet) return;
        clearAnswerTimer();
        sessionReported = false;
        index = 0;
        correct = 0;
        sessionXp = 0;
        phase = 'quiz';
        answered = false;
        render();
      });
    });
  }

  function renderQuiz() {
    if (!activeSet) return;
    const problem = activeSet.problems[index];
    const progress = `${index + 1} / ${activeSet.problems.length}`;

    let answerArea = '';
    if (problem.kind === 'choice' && problem.options?.length) {
      answerArea = problem.options
        .map(
          (o) =>
            `<button type="button" class="times-answer-btn quest-answer-btn" data-value="${escapeAttr(String(o.value))}">${escapeHtml(o.label)}</button>`
        )
        .join('');
      answerArea = `<div class="times-answers" id="quest-answers">${answerArea}</div>`;
    } else {
      answerArea = `
        <div class="quest-numeric-row">
          <input id="quest-numeric-input" class="name-input quest-numeric-input" type="text" inputmode="decimal" autocomplete="off" placeholder="Your answer" />
          <button type="button" class="btn btn-primary" id="quest-numeric-check">Check</button>
        </div>`;
    }

    host.innerHTML = `
      <div class="panel times-panel quest-panel">
        <button type="button" class="btn btn-ghost btn-sm times-back" id="quest-quit">← Sets</button>
        <div class="times-quiz-header">
          <span class="times-quiz-tag">${escapeHtml(activeSet.title)}</span>
          <span class="times-quiz-progress">${progress}</span>
        </div>
        <div class="times-question-wrap">
          <p class="times-question quest-prompt">${escapeHtml(problem.prompt)}</p>
        </div>
        ${answerArea}
        <p class="times-session-xp">Session XP: <strong id="quest-session-xp">${sessionXp}</strong></p>
      </div>
    `;

    host.querySelector('#quest-quit')?.addEventListener('click', () => {
      clearAnswerTimer();
      phase = 'pick';
      activeSet = null;
      render();
    });

    if (problem.kind === 'choice') {
      host.querySelectorAll('.quest-answer-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (answered) return;
          answered = true;
          const picked = btn.getAttribute('data-value') ?? '';
          const right = valuesMatch(picked, problem.answer);
          revealChoice(problem, picked, right);
          afterAnswer(right, problem);
        });
      });
    } else {
      const input = host.querySelector('#quest-numeric-input');
      const check = () => {
        if (answered || !input) return;
        const raw = input.value.trim();
        if (!raw) {
          callbacks.showToast('Type an answer first.');
          return;
        }
        answered = true;
        const right = valuesMatch(raw, problem.answer);
        input.classList.add(right ? 'is-correct' : 'is-wrong');
        host.querySelector('#quest-numeric-check')?.setAttribute('disabled', 'true');
        afterAnswer(right, problem);
      };
      host.querySelector('#quest-numeric-check')?.addEventListener('click', check);
      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') check();
      });
    }
  }

  /**
   * @param {import('./maths-quest-data.js').QuestProblem} problem
   * @param {string} picked
   * @param {boolean} right
   */
  function revealChoice(problem, picked, right) {
    host.querySelectorAll('.quest-answer-btn').forEach((btn) => {
      const val = btn.getAttribute('data-value') ?? '';
      const isPick = val === picked;
      const isAns = valuesMatch(val, problem.answer);
      btn.classList.toggle('is-correct', isAns);
      btn.classList.toggle('is-wrong', isPick && !right);
      btn.disabled = true;
    });
  }

  /**
   * @param {boolean} right
   * @param {import('./maths-quest-data.js').QuestProblem} problem
   */
  function afterAnswer(right, problem) {
    if (right) {
      correct += 1;
      sessionXp += MATHS_QUEST.xpPerCorrect;
      callbacks.onAwardXp(MATHS_QUEST.xpPerCorrect);
      const xpEl = host.querySelector('#quest-session-xp');
      if (xpEl) xpEl.textContent = String(sessionXp);
    } else {
      const hint = problem.hint ? ` ${problem.hint}` : '';
      const shown =
        typeof problem.answer === 'number'
          ? String(problem.answer)
          : String(problem.answer);
      callbacks.showToast(`Answer: ${shown}.${hint}`, { variant: 'shop' });
    }

    clearAnswerTimer();
    answerTimer = setTimeout(() => {
      answerTimer = null;
      if (disposed) return;
      index += 1;
      if (!activeSet || index >= activeSet.problems.length) finishSet();
      else {
        answered = false;
        render();
      }
    }, right ? 650 : 950);
  }

  function finishSet() {
    if (!activeSet || sessionReported || disposed) return;
    sessionReported = true;
    clearAnswerTimer();
    const accuracy = correct / activeSet.problems.length;
    let bonus = 0;
    if (accuracy >= MATHS_QUEST.accuracyBonusThreshold) {
      bonus = MATHS_QUEST.accuracyBonusXp;
      sessionXp += bonus;
      callbacks.onAwardXp(bonus);
    }
    callbacks.onSessionComplete?.(accuracy);
    lastDone = { accuracy, bonus };
    phase = 'done';
    renderDone(accuracy, bonus);
  }

  /** @param {number} accuracy @param {number} bonus */
  function renderDone(accuracy, bonus) {
    const pct = Math.round(accuracy * 100);
    const title = activeSet?.title ?? 'Quest';
    const total = activeSet?.problems.length ?? MATHS_QUEST.problemsPerSet;
    host.innerHTML = `
      <div class="panel times-panel times-done quest-done">
        <p class="mission-tag">Set complete</p>
        <h2 class="panel-title">${correct} / ${total} correct</h2>
        <p class="granny-line">${pct}% on ${escapeHtml(title)}. Granny logged every solve.</p>
        <div class="times-done-xp">
          <span class="times-done-xp-num">+${sessionXp}</span>
          <span class="times-done-xp-label">${ECONOMY.forgeXpLabel}</span>
        </div>
        ${bonus > 0 ? `<p class="times-bonus-note">Accuracy bonus +${bonus} XP!</p>` : ''}
        <div class="times-done-actions">
          <button type="button" class="btn btn-primary" id="quest-again">Another set</button>
          <button type="button" class="btn btn-ghost" id="quest-home-done">Home</button>
        </div>
      </div>
    `;
    host.querySelector('#quest-again')?.addEventListener('click', () => {
      clearAnswerTimer();
      sessionReported = false;
      phase = 'pick';
      activeSet = null;
      render();
    });
    host.querySelector('#quest-home-done')?.addEventListener('click', goHome);
  }

  render();

  return () => {
    disposed = true;
    clearAnswerTimer();
  };
}

/** @param {string|number} a @param {string|number} b */
function valuesMatch(a, b) {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return Math.abs(na - nb) < 0.001;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

/** @param {string} s */
function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** @param {string} s */
function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}
