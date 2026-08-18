import { ECONOMY } from './economy.js';
import { GATE } from './training-gate.js';
import { difficultyTrainingTag } from './difficulty.js';

/**
 * Shared multiple-choice drill UI for topic modules.
 * @param {HTMLElement} host
 * @param {{
 *   title: string,
 *   missionTag: string,
 *   quizTag: string,
 *   difficultyLevel: import('./difficulty.js').DifficultyLevel,
 *   sessionSize: number,
 *   xpPerCorrect: number,
 *   makeQuestion: (level: import('./difficulty.js').DifficultyLevel) => { prompt: string, answer: number|string, options: { label: string, value: number|string }[] },
 *   onAwardXp: (amount: number) => void,
 *   onSessionComplete?: (result: { accuracy: number, passed: boolean }) => void,
 *   onHome: () => void,
 *   showToast: (msg: string, opts?: { variant?: string }) => void,
 *   unitDone?: boolean,
 *   gatePassMessage?: string,
 *   optionClass?: string,
 * }} config
 * @returns {() => void} Dispose — clears pending timers (call before re-init or leaving).
 */
export function initDrillSession(host, config) {
  /** @type {'quiz'|'done'} */
  let phase = 'quiz';
  /** @type {{ prompt: string, answer: number|string, options: { label: string, value: number|string }[] }[]} */
  let deck = [];
  let index = 0;
  let correct = 0;
  let sessionXp = 0;
  let answered = false;
  let sessionReported = false;
  /** @type {ReturnType<typeof setTimeout>|null} */
  let answerTimer = null;
  let lastDone = { accuracy: 0, passed: false };
  let disposed = false;
  const optClass = config.optionClass ?? 'drill-opt';

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
    config.onHome();
  }

  function startSession() {
    clearAnswerTimer();
    sessionReported = false;
    deck = [];
    const usedPrompts = new Set();
    let guard = 0;
    while (deck.length < config.sessionSize && guard++ < config.sessionSize * 40) {
      const question = config.makeQuestion(config.difficultyLevel);
      if (usedPrompts.has(question.prompt)) continue;
      usedPrompts.add(question.prompt);
      deck.push(question);
    }
    index = 0;
    correct = 0;
    sessionXp = 0;
    phase = 'quiz';
    answered = false;
    render();
  }

  function render() {
    if (phase === 'done') renderDone(lastDone.accuracy, lastDone.passed);
    else renderQuiz();
  }

  function renderQuiz() {
    const q = deck[index];
    const opts = q.options
      .map(
        (o) =>
          `<button type="button" class="times-answer-btn ${optClass}" data-value="${escapeAttr(String(o.value))}">${o.label}</button>`
      )
      .join('');

    host.innerHTML = `
      <div class="panel times-panel drill-panel">
        <button type="button" class="btn btn-ghost btn-sm times-back" id="drill-home">← Home</button>
        <p class="mission-tag">${config.missionTag} · ${difficultyTrainingTag(config.difficultyLevel)}</p>
        <h2 class="panel-title">${config.title}</h2>
        <div class="times-quiz-header">
          <span class="times-quiz-tag">${config.quizTag}</span>
          <span class="times-quiz-progress">${index + 1} / ${deck.length}</span>
        </div>
        <div class="times-question-wrap">
          <p class="times-question length-question">${q.prompt}</p>
        </div>
        <div class="times-answers">${opts}</div>
        <p class="times-session-xp">Session XP: <strong id="drill-session-xp">${sessionXp}</strong></p>
      </div>
    `;

    host.querySelector('#drill-home')?.addEventListener('click', goHome);

    host.querySelectorAll(`.${optClass}`).forEach((btn) => {
      btn.addEventListener('click', () => {
        if (answered || disposed) return;
        answered = true;
        const picked = btn.getAttribute('data-value') ?? '';
        const right = valuesMatch(picked, q.answer);
        btn.classList.add(right ? 'is-correct' : 'is-wrong');
        host.querySelectorAll(`.${optClass}`).forEach((b) => {
          if (valuesMatch(b.getAttribute('data-value') ?? '', q.answer)) b.classList.add('is-correct');
          b.disabled = true;
        });

        if (right) {
          correct += 1;
          sessionXp += config.xpPerCorrect;
          config.onAwardXp(config.xpPerCorrect);
          const xpEl = host.querySelector('#drill-session-xp');
          if (xpEl) xpEl.textContent = String(sessionXp);
        } else {
          const label = q.options.find((o) => valuesMatch(o.value, q.answer))?.label ?? String(q.answer);
          config.showToast(`Correct: ${label}`, { variant: 'shop' });
        }

        clearAnswerTimer();
        answerTimer = setTimeout(() => {
          answerTimer = null;
          if (disposed) return;
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
    if (sessionReported || disposed || deck.length === 0) return;
    sessionReported = true;
    clearAnswerTimer();
    const accuracy = correct / deck.length;
    const passed = accuracy >= GATE.passAccuracy;
    config.onSessionComplete?.({ accuracy, passed });
    lastDone = { accuracy, passed };
    phase = 'done';
    renderDone(accuracy, passed);
  }

  /** @param {number} accuracy @param {boolean} passed */
  function renderDone(accuracy, passed) {
    const pct = Math.round(accuracy * 100);
    let gateNote = `${pct}% on ${config.title}.`;
    if (config.onSessionComplete) {
      gateNote = passed
        ? config.unitDone
          ? `${pct}% — already bought time this cycle.`
          : `${pct}% — ${config.gatePassMessage ?? 'Training logged!'}`
        : `${pct}% — need ${Math.round(GATE.passAccuracy * 100)}%+ to push the attack back.`;
    }
    host.innerHTML = `
      <div class="panel times-panel times-done">
        <p class="mission-tag">Session complete</p>
        <h2 class="panel-title">${correct} / ${deck.length} correct</h2>
        <p class="granny-line">${gateNote}</p>
        <div class="times-done-xp">
          <span class="times-done-xp-num">+${sessionXp}</span>
          <span class="times-done-xp-label">${ECONOMY.forgeXpLabel}</span>
        </div>
        <div class="times-done-actions">
          <button type="button" class="btn btn-primary" id="drill-again">Try again</button>
          <button type="button" class="btn btn-ghost" id="drill-home-done">Home</button>
        </div>
      </div>
    `;
    host.querySelector('#drill-again')?.addEventListener('click', startSession);
    host.querySelector('#drill-home-done')?.addEventListener('click', goHome);
  }

  startSession();

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
function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
