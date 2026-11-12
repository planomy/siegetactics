import { TURRETS, TURRET_ORDER } from './turrets-data.js';
import { ECONOMY } from './economy.js';
import { formatUnlockXp, turretStatLine } from './shop.js';
import { TURRET_MAX_LEVEL, effectiveTurret, nextUpgrade, turretLevel } from './turret-upgrades.js?v=20261112a2';

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

/** Gold stars for the turret's level, dim for levels still to earn. @param {string} id */
function levelStars(id) {
  const level = turretLevel(id);
  return `<span class="armory-level-stars" aria-label="Level ${level} of ${TURRET_MAX_LEVEL}">${Array.from({ length: TURRET_MAX_LEVEL }, (_, i) => `<span class="${i < level ? 'is-earned' : ''}">★</span>`).join('')}</span>`;
}

const coreText = (n) => `${n} alien crystal${n === 1 ? '' : 's'}`;

/** @param {import('./turrets-data.js').TurretDef} t @param {number} xp @param {number} cores @param {boolean} isUnlocked */
function armoryCardStatus(t, xp, cores, isUnlocked) {
  if (isUnlocked) {
    const up = nextUpgrade(t.id, cores, true);
    if (up?.ready) return { tone: 'upgrade', label: `Upgrade to Lv ${up.level}`, detail: `Costs ${coreText(up.cost)}` };
    if (up) return { tone: 'owned', label: `Lv ${turretLevel(t.id)}`, detail: `Lv ${up.level} costs ${coreText(up.cost)}` };
    return { tone: 'owned', label: 'Max level', detail: `${t.placementCost} ${ECONOMY.siegeCoinsLabel} to deploy` };
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
function renderArmoryFeature(id, xp, cores, unlocked) {
  const turret = TURRETS[id];
  if (!turret) return '';
  const owned = unlocked.has(id);
  const ready = !owned && xp >= turret.unlockXp;
  const level = owned ? turretLevel(id) : 1;
  const up = nextUpgrade(id, cores, owned);
  const current = effectiveTurret(id);
  const state = owned
    ? up?.ready ? `LEVEL ${up.level} READY!` : `LEVEL ${level}${level === TURRET_MAX_LEVEL ? ' · MAX POWER' : ''}`
    : ready ? 'READY TO UNLOCK' : `${(turret.unlockXp - xp).toLocaleString()} XP TO GO`;
  const role = turret.role ?? (turret.aoe ? 'splash' : 'attack');
  const upgradeButton = up?.ready
    ? `<button type="button" class="armory-upgrade-btn" data-upgrade-id="${id}">⚡ UPGRADE TO LEVEL ${up.level} <span class="armory-upgrade-cost"><span class="core-gem" aria-hidden="true"></span>${up.cost}</span></button>`
    : '';
  const explain = owned
    ? up?.ready ? 'More damage, more range, faster shots. Power it up!'
      : up ? `Level ${up.level} costs ${coreText(up.cost)}. Collect crystals by finishing 10-question missions and ranking up topics.`
      : 'Fully upgraded. This turret is at maximum power.'
    : ready ? 'Select this weapon in the grid below to unlock it permanently.' : 'Keep doing maths and earning Forge XP to unlock this weapon.';
  return `
    <div class="armory-feature armory-level-${level}" data-role="${role}" style="--turret-color:${turret.color}">
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
        <h3>${turret.name} ${owned ? levelStars(id) : ''}</h3>
        <p>${turret.desc}</p>
        <strong>${state}</strong>
        <div class="armory-feature-stats">${turretStatLine(owned ? current : turret)}</div>
        ${upgradeButton}
        <span class="armory-feature-explain">${explain}</span>
      </div>
    </div>
  `;
}

/**
 * @param {HTMLElement} host
 * @param {{
 *   xp: number,
 *   cores: number,
 *   unlocked: Set<string>,
 *   onUnlock: (id: string) => boolean,
 *   onUpgrade: (id: string) => boolean,
 *   onBack: () => void,
 *   showToast: (msg: string, opts?: { variant?: string }) => void,
 * }} callbacks
 */
export function renderArmory(host, callbacks) {
  const { xp, cores, unlocked, onUnlock, onUpgrade, onBack, showToast } = callbacks;
  const owned = TURRET_ORDER.filter((id) => unlocked.has(id)).length;
  const next = nextLockedTurret(xp, unlocked);
  const nextT = next ? TURRETS[next] : null;
  const canUnlockNow = nextUnlockableTurret(xp, unlocked);
  const upgradeReady = TURRET_ORDER.find((id) => nextUpgrade(id, cores, unlocked.has(id))?.ready) ?? null;
  const featuredId = upgradeReady ?? canUnlockNow ?? next ?? TURRET_ORDER[TURRET_ORDER.length - 1];

  let headline = `${owned} / ${TURRET_ORDER.length} turrets in your arsenal`;
  if (upgradeReady) {
    headline = `You have ${coreText(cores)} to spend. Power up a turret!`;
  } else if (canUnlockNow) {
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
    const status = armoryCardStatus(t, xp, cores, isUnlocked);
    const canUnlock = !isUnlocked && xp >= t.unlockXp;
    const level = isUnlocked ? turretLevel(id) : 1;
    return `
      <button
        type="button"
        class="armory-card armory-card--${status.tone}${canUnlock || status.tone === 'upgrade' ? ' armory-card--ready' : ''} armory-level-${level}"
        data-turret-id="${id}"
        style="--turret-color: ${t.color}"
        aria-label="View ${t.name}${canUnlock ? ', ready to unlock' : ''}${status.tone === 'upgrade' ? ', upgrade ready' : ''}"
      >
        <span class="armory-card-badge armory-card-badge--${status.tone}">${status.label}</span>
        <span class="armory-card-art">
          <img src="${t.sprite}" alt="" class="${t.flipX ? 'flip-x' : ''}" width="72" height="72" loading="lazy" />
        </span>
        <span class="armory-card-name">${t.name}</span>
        ${isUnlocked ? levelStars(id) : ''}
        <span class="armory-card-stat">${turretStatLine(isUnlocked ? effectiveTurret(id) : t)}</span>
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
      <p class="granny-line armory-lead">${headline}${/[.!?]$/.test(headline) ? '' : '.'} ${ECONOMY.forgeXpLabel} unlocks and upgrades gear forever — ${ECONOMY.siegeCoinsLabel} only place them during a siege.</p>
      <div class="armory-xp-bar">
        <span class="armory-xp-label">${ECONOMY.forgeXpLabel}</span>
        <span class="armory-xp-val">${xp.toLocaleString()}</span>
        <span class="armory-cores"><span class="core-gem" aria-hidden="true"></span><strong>${cores}</strong> alien ${cores === 1 ? 'crystal' : 'crystals'}</span>
      </div>
      <div id="armory-feature-host">${renderArmoryFeature(featuredId, xp, cores, unlocked)}</div>
      <p class="armory-grid-intro">CHOOSE ANY TURRET TO PREVIEW IT · UNLOCK AND UPGRADE WEAPONS BELOW</p>
      <div class="armory-grid">${cards}</div>
    </div>
  `;

  host.querySelector('#armory-back')?.addEventListener('click', onBack);

  const bindUpgrade = () => {
    host.querySelector('.armory-upgrade-btn')?.addEventListener('click', (event) => {
      const id = event.currentTarget.getAttribute('data-upgrade-id');
      if (!id) return;
      const level = turretLevel(id) + 1;
      if (onUpgrade(id)) showToast(`${TURRETS[id].name} upgraded to level ${level}!`, { variant: 'success' });
    });
  };
  bindUpgrade();

  host.querySelectorAll('.armory-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-turret-id');
      if (!id || !TURRETS[id]) return;
      const preview = host.querySelector('#armory-feature-host');
      if (preview) preview.innerHTML = renderArmoryFeature(id, xp, cores, unlocked);
      bindUpgrade();
      host.querySelectorAll('.armory-card').forEach((card) => {
        card.classList.toggle('armory-card--previewing', card === btn);
      });
      if (unlocked.has(id) || xp < TURRETS[id].unlockXp) return;
      if (onUnlock(id)) showToast(`${TURRETS[id].name} unlocked permanently!`, { variant: 'success' });
    });
  });
}
