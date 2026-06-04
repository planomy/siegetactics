import { ECONOMY } from './economy.js';
import { GATE } from './training-gate.js';
import { difficultyTrainingTag } from './difficulty.js';

/** @typedef {import('./difficulty.js').DifficultyLevel} DifficultyLevel */

export const LENGTH_LAB = {
  questionsPerSession: 8,
  xpPerCorrect: 4,
  unitId: 'measurement-length-lab',
  topicId: 'measurement-length',
};

/** @param {DifficultyLevel} level */
function sessionSize(level) {
  if (level === 1) return 6;
  if (level === 2) return 8;
  return 10;
}

/**
 * @param {DifficultyLevel} level
 * @returns {{ prompt: string, answer: number, options: { label: string, value: number }[] }}
 */
function makeQuestion(level) {
  if (level === 1) {
    const kind = pick(['compare-cm-small', 'compare-m-whole', 'longer-or-shorter']);
    if (kind === 'compare-m-whole') {
      const a = pick([1, 2, 3]);
      const b = a + pick([1, 2]);
      const longer = Math.max(a, b);
      const shorter = Math.min(a, b);
      return {
        prompt: `Which is longer: ${shorter} m or ${longer} m?`,
        answer: longer,
        options: shuffle([
          { label: `${shorter} m`, value: shorter },
          { label: `${longer} m`, value: longer },
        ]),
      };
    }
    if (kind === 'longer-or-shorter') {
      const items = pick([
        [{ name: 'pencil', cm: 12 }, { name: 'ruler', cm: 30 }],
        [{ name: 'book', cm: 22 }, { name: 'eraser', cm: 5 }],
        [{ name: 'stick', cm: 45 }, { name: 'coin', cm: 2 }],
      ]);
      const longer = items[0].cm > items[1].cm ? items[0] : items[1];
      return {
        prompt: `Which is longer — the ${items[0].name} (${items[0].cm} cm) or the ${items[1].name} (${items[1].cm} cm)?`,
        answer: longer.cm,
        options: shuffle([
          { label: `${items[0].name} (${items[0].cm} cm)`, value: items[0].cm },
          { label: `${items[1].name} (${items[1].cm} cm)`, value: items[1].cm },
        ]),
      };
    }
    const a = pick([8, 12, 15, 18, 22, 25]);
      const b = a + pick([3, 5, 7]);
      const longer = Math.max(a, b);
      const shorter = Math.min(a, b);
      const askLonger = Math.random() > 0.5;
      const answer = askLonger ? longer : shorter;
      const prompt = askLonger
        ? `Which is longer: ${shorter} cm or ${longer} cm?`
        : `Which is shorter: ${shorter} cm or ${longer} cm?`;
      return {
        prompt,
        answer,
        options: shuffle([
          { label: `${shorter} cm`, value: shorter },
          { label: `${longer} cm`, value: longer },
        ]),
      };
  }

  if (level === 2) {
    const kind = pick(['compare-cm', 'compare-m', 'convert-simple', 'mm-to-cm']);
    if (kind === 'compare-cm') {
      const a = pick([25, 34, 45, 56, 67]);
      const b = a + pick([8, 11, 14]);
      const longer = Math.max(a, b);
      const shorter = Math.min(a, b);
      const askLonger = Math.random() > 0.5;
      const answer = askLonger ? longer : shorter;
      const prompt = askLonger
        ? `Which is longer: ${shorter} cm or ${longer} cm?`
        : `Which is shorter: ${shorter} cm or ${longer} cm?`;
      return {
        prompt,
        answer,
        options: shuffle([
          { label: `${shorter} cm`, value: shorter },
          { label: `${longer} cm`, value: longer },
        ]),
      };
    }
    if (kind === 'compare-m') {
      const a = pick([2, 3, 4, 5]);
      const b = a + pick([1, 2]);
      const longer = Math.max(a, b);
      const shorter = Math.min(a, b);
      return {
        prompt: `Which is longer: ${shorter} m or ${longer} m?`,
        answer: longer,
        options: shuffle([
          { label: `${shorter} m`, value: shorter },
          { label: `${longer} m`, value: longer },
        ]),
      };
    }
    if (kind === 'mm-to-cm') {
      const cm = pick([2, 3, 4, 5, 6]);
      const mm = cm * 10;
      return {
        prompt: `${mm} mm = ? cm`,
        answer: cm,
        options: shuffle([
          { label: `${cm} cm`, value: cm },
          { label: `${cm + 1} cm`, value: cm + 1 },
          { label: `${Math.max(1, cm - 1)} cm`, value: Math.max(1, cm - 1) },
        ]),
      };
    }
    const metres = pick([1, 2, 3, 4]);
    const cm = metres * 100;
    const wrong1 = cm + pick([10, 20]);
    const wrong2 = Math.max(10, cm - pick([10, 25]));
    return {
      prompt: `${metres} m = ? cm`,
      answer: cm,
      options: shuffle([
        { label: `${cm} cm`, value: cm },
        { label: `${wrong1} cm`, value: wrong1 },
        { label: `${wrong2} cm`, value: wrong2 },
      ]),
    };
  }

  const kind = pick(['compare-cm', 'compare-m', 'convert-simple', 'convert-hard', 'perimeter-rect']);
  if (kind === 'compare-cm') {
    const a = pick([12, 15, 23, 34, 45, 56, 67, 78, 89]);
    const b = a + pick([5, 8, 11, 14]);
    const longer = Math.max(a, b);
    const shorter = Math.min(a, b);
    const askLonger = Math.random() > 0.5;
    const answer = askLonger ? longer : shorter;
    const prompt = askLonger
      ? `Which is longer: ${shorter} cm or ${longer} cm?`
      : `Which is shorter: ${shorter} cm or ${longer} cm?`;
    return {
      prompt,
      answer,
      options: shuffle([
        { label: `${shorter} cm`, value: shorter },
        { label: `${longer} cm`, value: longer },
      ]),
    };
  }
  if (kind === 'compare-m') {
    const a = pick([2, 3, 4, 5, 6]);
    const b = a + pick([1, 2, 3]);
    const longer = Math.max(a, b);
    const shorter = Math.min(a, b);
    return {
      prompt: `Which is longer: ${shorter} m or ${longer} m?`,
      answer: longer,
      options: shuffle([
        { label: `${shorter} m`, value: shorter },
        { label: `${longer} m`, value: longer },
      ]),
    };
  }
  if (kind === 'convert-hard') {
    const cm = pick([150, 250, 350, 450, 550]);
    const metres = cm / 100;
    const wrong1 = metres + 1;
    const wrong2 = Math.max(1, metres - 1);
    return {
      prompt: `${cm} cm = ? m`,
      answer: metres,
      options: shuffle([
        { label: `${metres} m`, value: metres },
        { label: `${wrong1} m`, value: wrong1 },
        { label: `${wrong2} m`, value: wrong2 },
      ]),
    };
  }
  if (kind === 'perimeter-rect') {
    const w = pick([3, 4, 5, 6, 7]);
    const h = pick([2, 3, 4, 5]);
    const p = 2 * (w + h);
    return {
      prompt: `A rectangle is ${w} cm long and ${h} cm wide. What is its perimeter?`,
      answer: p,
      options: shuffle([
        { label: `${p} cm`, value: p },
        { label: `${p + 4} cm`, value: p + 4 },
        { label: `${Math.max(4, p - 4)} cm`, value: Math.max(4, p - 4) },
      ]),
    };
  }
  const metres = pick([1, 2, 3, 4, 5]);
  const cm = metres * 100;
  const wrong1 = cm + pick([10, 20, 50]);
  const wrong2 = Math.max(10, cm - pick([10, 25, 40]));
  return {
    prompt: `${metres} m = ? cm`,
    answer: cm,
    options: shuffle([
      { label: `${cm} cm`, value: cm },
      { label: `${wrong1} cm`, value: wrong1 },
      { label: `${wrong2} cm`, value: wrong2 },
    ]),
  };
}

/** @param {unknown[]} arr */
function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** @param {unknown[]} arr */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * @param {HTMLElement} host
 * @param {{
 *   difficultyLevel: DifficultyLevel,
 *   onAwardXp: (amount: number) => void,
 *   onSessionComplete: (result: { accuracy: number, passed: boolean }) => void,
 *   onHome: () => void,
 *   showToast: (msg: string, opts?: { variant?: string }) => void,
 *   unitDone: boolean,
 * }} callbacks
 */
export function initMeasurementLength(host, callbacks) {
  /** @type {'quiz'|'done'} */
  let phase = 'quiz';
  /** @type {{ prompt: string, answer: number, options: { label: string, value: number }[] }[]} */
  let deck = [];
  let index = 0;
  let correct = 0;
  let sessionXp = 0;
  let answered = false;

  function startSession() {
    deck = [];
    const count = sessionSize(callbacks.difficultyLevel);
    for (let i = 0; i < count; i++) {
      deck.push(makeQuestion(callbacks.difficultyLevel));
    }
    index = 0;
    correct = 0;
    sessionXp = 0;
    phase = 'quiz';
    answered = false;
    render();
  }

  function render() {
    if (phase === 'done') renderDone();
    else renderQuiz();
  }

  function renderQuiz() {
    const q = deck[index];
    const opts = q.options
      .map(
        (o) =>
          `<button type="button" class="times-answer-btn length-opt" data-value="${o.value}">${o.label}</button>`
      )
      .join('');

    host.innerHTML = `
      <div class="panel times-panel length-panel">
        <button type="button" class="btn btn-ghost btn-sm times-back" id="length-home">← Home</button>
        <p class="mission-tag">Measurement · Length · ${difficultyTrainingTag(callbacks.difficultyLevel)}</p>
        <h2 class="panel-title">Length Lab</h2>
        <div class="times-quiz-header">
          <span class="times-quiz-tag">Compare & convert</span>
          <span class="times-quiz-progress">${index + 1} / ${deck.length}</span>
        </div>
        <div class="times-question-wrap">
          <p class="times-question length-question">${q.prompt}</p>
        </div>
        <div class="times-answers" id="length-answers">${opts}</div>
        <p class="times-session-xp">Session XP: <strong id="length-session-xp">${sessionXp}</strong></p>
      </div>
    `;

    host.querySelector('#length-home')?.addEventListener('click', callbacks.onHome);

    host.querySelectorAll('.length-opt').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const picked = Number(btn.getAttribute('data-value'));
        const right = picked === q.answer;
        btn.classList.add(right ? 'is-correct' : 'is-wrong');
        host.querySelectorAll('.length-opt').forEach((b) => {
          if (Number(b.getAttribute('data-value')) === q.answer) b.classList.add('is-correct');
          b.disabled = true;
        });

        if (right) {
          correct += 1;
          sessionXp += LENGTH_LAB.xpPerCorrect;
          callbacks.onAwardXp(LENGTH_LAB.xpPerCorrect);
          const xpEl = host.querySelector('#length-session-xp');
          if (xpEl) xpEl.textContent = String(sessionXp);
        } else {
          callbacks.showToast(`Correct: ${q.options.find((o) => o.value === q.answer)?.label ?? q.answer}`, {
            variant: 'shop',
          });
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
    const passed = accuracy >= GATE.passAccuracy;
    callbacks.onSessionComplete({ accuracy, passed });
    phase = 'done';
    renderDone(accuracy, passed);
  }

  /** @param {number} accuracy @param {boolean} passed */
  function renderDone(accuracy, passed) {
    const pct = Math.round(accuracy * 100);
    const gateNote = passed
      ? callbacks.unitDone
        ? 'Already bought time this cycle.'
        : 'Length Lab pushed the attack back!'
      : `Need ${Math.round(GATE.passAccuracy * 100)}%+ to push the attack back.`;
    host.innerHTML = `
      <div class="panel times-panel times-done">
        <p class="mission-tag">Session complete</p>
        <h2 class="panel-title">${correct} / ${deck.length} correct</h2>
        <p class="granny-line">${pct}% on Length Lab. ${gateNote}</p>
        <div class="times-done-xp">
          <span class="times-done-xp-num">+${sessionXp}</span>
          <span class="times-done-xp-label">${ECONOMY.forgeXpLabel}</span>
        </div>
        <div class="times-done-actions">
          <button type="button" class="btn btn-primary" id="length-again">Try again</button>
          <button type="button" class="btn btn-ghost" id="length-home-done">Home</button>
        </div>
      </div>
    `;
    host.querySelector('#length-again')?.addEventListener('click', startSession);
    host.querySelector('#length-home-done')?.addEventListener('click', callbacks.onHome);
  }

  startSession();
}
