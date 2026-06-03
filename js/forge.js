import { getMission, SLICE_MISSION_ID } from './missions-data.js';

/**
 * @param {HTMLElement} container
 * @param {{
 *   onSuccess: (rewards: { forgeXp: number, placementBudget: number }) => void,
 *   showToast: (msg: string) => void,
 *   trainingMode?: boolean,
 *   onBack?: () => void,
 * }} callbacks
 */
export function initForge(container, callbacks) {
  const mission = getMission(SLICE_MISSION_ID);
  if (!mission) return;

  /** @type {(number|null)[]} */
  const picks = mission.slots.map(() => null);

  container.innerHTML = `
    <div class="panel forge-panel">
      ${callbacks.onBack ? '<button type="button" class="btn btn-ghost btn-sm times-back" id="forge-back">← Home</button>' : ''}
      <p class="mission-tag">${mission.strand.toUpperCase()} · Level ${mission.level}${callbacks.trainingMode ? ' · Prep drill' : ''}</p>
      <h2 class="panel-title">${mission.title}</h2>
      <p class="granny-line">${callbacks.trainingMode ? 'Forge the digits to push the attack back — no siege yet.' : mission.opener}</p>
      <div class="forge-slots" id="forge-slots"></div>
      <div class="lock-in-row">
        <label for="lock-in-input">Total headcount</label>
        <input id="lock-in-input" type="number" inputmode="numeric" placeholder="?" autocomplete="off" />
      </div>
      <button type="button" class="btn btn-primary" id="forge-check">${callbacks.trainingMode ? 'Complete training' : 'CHECK'}</button>
    </div>
  `;

  container.querySelector('#forge-back')?.addEventListener('click', () => {
    callbacks.onBack?.();
  });

  const slotsEl = container.querySelector('#forge-slots');
  mission.slots.forEach((slot, slotIndex) => {
    const row = document.createElement('div');
    row.className = 'forge-slot';
    row.innerHTML = `<span class="slot-role">${slot.role}</span>`;
    const opts = document.createElement('div');
    opts.className = 'slot-options';
    slot.options.forEach((opt, optIndex) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot-opt';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        picks[slotIndex] = optIndex;
        row.querySelectorAll('.slot-opt').forEach((b, i) => {
          b.classList.toggle('selected', i === optIndex);
          b.classList.toggle('wrong-flash', false);
        });
        if (optIndex !== slot.correctIndex) {
          btn.classList.add('wrong-flash');
          callbacks.showToast(mission.grannyHints.slotWrong[slotIndex]);
        }
      });
      opts.appendChild(btn);
    });
    row.appendChild(opts);
    slotsEl?.appendChild(row);
  });

  container.querySelector('#forge-check')?.addEventListener('click', () => {
    const allCorrect = mission.slots.every((slot, i) => picks[i] === slot.correctIndex);
    if (!allCorrect) {
      callbacks.showToast('Pick the right digit in each row first.');
      return;
    }
    const raw = container.querySelector('#lock-in-input')?.value?.trim() ?? '';
    const val = Number(raw);
    if (mission.lockIn.type === 'exact' && val !== mission.lockIn.value) {
      callbacks.showToast(mission.grannyHints.lockInWrong);
      return;
    }
    callbacks.onSuccess({ ...mission.rewards });
  });
}
