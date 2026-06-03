import { TURRETS, TURRET_ORDER } from './turrets-data.js';
import { ECONOMY } from './economy.js';
import { formatUnlockXp, turretStatLine } from './shop.js';

/**
 * @param {number} xp
 * @param {Set<string>} unlocked
 */
export function nextUnlockableTurret(xp, unlocked) {
  return TURRET_ORDER.find((id) => !unlocked.has(id) && xp >= TURRETS[id].unlockXp) ?? null;
}

/**
 * @param {number} xp
 * @param {Set<string>} unlocked
 */
export function nextLockedTurret(xp, unlocked) {
  return TURRET_ORDER.find((id) => !unlocked.has(id)) ?? null;
}

/** @param {import('./turrets-data.js').TurretDef} t @param {number} xp @param {boolean} isUnlocked */
function armoryCardStatus(t, xp, isUnlocked) {
  if (isUnlocked) {
    return { tone: 'owned', label: 'In arsenal', detail: `${t.placementCost} ${ECONOMY.siegeCoinsLabel} to deploy` };
  }
  if (xp >= t.unlockXp) {
    return { tone: 'unlock', label: 'Unlock now', detail: `Spend ${formatUnlockXp(t.unlockXp)}` };
  }
  const need = t.unlockXp - xp;
  return {
    tone: 'locked',
    label: 'Locked',
    detail: `${need.toLocaleString()} more ${ECONOMY.forgeXpLabel}`,
  };
}

/**
 * @param {HTMLElement} host
 * @param {{
 *   xp: number,
 *   unlocked: Set<string>,
 *   onUnlock: (id: string) => boolean,
 *   onBack: () => void,
 *   showToast: (msg: string, opts?: { variant?: string }) => void,
 * }} callbacks
 */
export function renderArmory(host, callbacks) {
  const { xp, unlocked, onUnlock, onBack, showToast } = callbacks;
  const owned = TURRET_ORDER.filter((id) => unlocked.has(id)).length;
  const next = nextLockedTurret(xp, unlocked);
  const nextT = next ? TURRETS[next] : null;
  const canUnlockNow = nextUnlockableTurret(xp, unlocked);

  let headline = `${owned} / ${TURRET_ORDER.length} turrets in your arsenal`;
  if (canUnlockNow) {
    headline = `Ready to unlock ${TURRETS[canUnlockNow].name}!`;
  } else if (nextT) {
    const gap = Math.max(0, nextT.unlockXp - xp);
    headline =
      gap > 0
        ? `Next: ${nextT.name} — ${gap.toLocaleString()} ${ECONOMY.forgeXpLabel} to go`
        : `Next: ${nextT.name} — unlock ready`;
  }

  const cards = TURRET_ORDER.map((id) => {
    const t = TURRETS[id];
    const isUnlocked = unlocked.has(id);
    const status = armoryCardStatus(t, xp, isUnlocked);
    const canUnlock = !isUnlocked && xp >= t.unlockXp;
    return `
      <button
        type="button"
        class="armory-card armory-card--${status.tone}${canUnlock ? ' armory-card--ready' : ''}"
        data-turret-id="${id}"
        style="--turret-color: ${t.color}"
        ${!isUnlocked && !canUnlock ? 'disabled' : ''}
      >
        <span class="armory-card-badge armory-card-badge--${status.tone}">${status.label}</span>
        <span class="armory-card-art">
          <img src="${t.sprite}" alt="" class="${t.flipX ? 'flip-x' : ''}" width="72" height="72" loading="lazy" />
        </span>
        <span class="armory-card-name">${t.name}</span>
        <span class="armory-card-stat">${turretStatLine(t)}</span>
        <span class="armory-card-price">${isUnlocked ? 'Owned' : formatUnlockXp(t.unlockXp)}</span>
        <span class="armory-card-detail">${status.detail}</span>
      </button>
    `;
  }).join('');

  host.innerHTML = `
    <div class="panel armory-panel">
      <button type="button" class="btn btn-ghost btn-sm times-back" id="armory-back">← Back</button>
      <p class="mission-tag">Field armory</p>
      <h2 class="panel-title">Turret arsenal</h2>
      <p class="granny-line armory-lead">${headline}. ${ECONOMY.forgeXpLabel} unlocks gear forever — ${ECONOMY.siegeCoinsLabel} only place them during a siege.</p>
      <div class="armory-xp-bar">
        <span class="armory-xp-label">${ECONOMY.forgeXpLabel}</span>
        <span class="armory-xp-val">${xp.toLocaleString()}</span>
      </div>
      <div class="armory-grid">${cards}</div>
    </div>
  `;

  host.querySelector('#armory-back')?.addEventListener('click', onBack);

  host.querySelectorAll('.armory-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-turret-id');
      if (!id || btn.hasAttribute('disabled')) return;
      const t = TURRETS[id];
      if (unlocked.has(id)) {
        showToast(`${t.name} is already in your arsenal.`, { variant: 'info' });
        return;
      }
      if (xp < t.unlockXp) return;
      if (onUnlock(id)) {
        showToast(`${t.name} unlocked!`, { variant: 'success' });
      }
    });
  });
}
