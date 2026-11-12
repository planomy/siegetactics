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
    return { tone: 'unlock', label: 'Unlock now', detail: 'Permanent upgrade ready' };
  }
  const need = t.unlockXp - xp;
  return {
    tone: 'locked',
    label: 'Locked',
    detail: `${need.toLocaleString()} more ${ECONOMY.forgeXpLabel}`,
  };
}

/**
 * Featured live turret preview. Selecting a card reveals its weapon and
 * firing style, even before the player has unlocked it.
 * @param {string} id
 * @param {number} xp
 * @param {Set<string>} unlocked
 */
function renderArmoryFeature(id, xp, unlocked) {
  const turret = TURRETS[id];
  if (!turret) return '';
  const owned = unlocked.has(id);
  const ready = !owned && xp >= turret.unlockXp;
  const state = owned ? 'IN YOUR ARSENAL' : ready ? 'READY TO UNLOCK' : `${(turret.unlockXp - xp).toLocaleString()} XP TO GO`;
  const role = turret.role ?? (turret.aoe ? 'splash' : 'attack');
  return `
    <div class="armory-feature" data-role="${role}" style="--turret-color:${turret.color}">
      <div class="armory-feature-visual" aria-hidden="true">
        <div class="armory-feature-aura"></div>
        <img class="armory-feature-turret ${turret.flipX ? 'flip-x' : ''}" src="${turret.sprite}" alt="" width="230" height="230" />
        <div class="armory-demo-lane">
          <span class="armory-demo-shot"></span>
          <span class="armory-demo-target">✺</span>
        </div>
      </div>
      <div class="armory-feature-copy">
        <span class="armory-feature-eyebrow">WEAPON SPOTLIGHT · FIELD TEST</span>
        <h3>${turret.name}</h3>
        <p>${turret.desc}</p>
        <strong>${state}</strong>
        <div class="armory-feature-stats">${turretStatLine(turret)}</div>
        <span class="armory-feature-explain">${owned ? 'Unlocked permanently. Deploy during sieges using siege coins.' : ready ? 'Select this weapon in the grid below to unlock it permanently.' : 'Keep doing maths and earning Forge XP to unlock this weapon.'}</span>
      </div>
    </div>
  `;
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
  const featuredId = canUnlockNow ?? next ?? TURRET_ORDER[TURRET_ORDER.length - 1];

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
        aria-label="View ${t.name}${canUnlock ? ', ready to unlock' : ''}"
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
      <div id="armory-feature-host">${renderArmoryFeature(featuredId, xp, unlocked)}</div>
      <p class="armory-grid-intro">CHOOSE ANY TURRET TO PREVIEW IT · AVAILABLE WEAPONS CAN BE UNLOCKED BELOW</p>
      <div class="armory-grid">${cards}</div>
    </div>
  `;

  host.querySelector('#armory-back')?.addEventListener('click', onBack);

  host.querySelectorAll('.armory-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-turret-id');
      if (!id || !TURRETS[id]) return;
      const preview = host.querySelector('#armory-feature-host');
      if (preview) preview.innerHTML = renderArmoryFeature(id, xp, unlocked);
      host.querySelectorAll('.armory-card').forEach((card) => {
        card.classList.toggle('armory-card--previewing', card === btn);
      });
      if (unlocked.has(id) || xp < TURRETS[id].unlockXp) return;
      if (onUnlock(id)) showToast(`${TURRETS[id].name} unlocked permanently!`, { variant: 'success' });
    });
  });
}
