import { TURRETS, TURRET_ORDER } from './turrets-data.js';
import { ECONOMY } from './economy.js';
import { formatUnlockXp, turretStatLine } from './shop.js';
import { TURRET_MAX_LEVEL, effectiveTurret, nextUpgrade, turretLevel } from './turret-upgrades.js?v=20261112a2';
import { AMMO } from './ammo-data.js?v=20261112a1';
import { GEAR, gearArt, gearStatus } from './gear.js?v=20261113a3';

/** @param {number} n */
function crystalText(n) {
  return `${n} alien ${n === 1 ? 'crystal' : 'crystals'}`;
}

/** Granny's Gear shelf: one card per item with its art, what it does and its crystal price. */
function renderGearShelf(owned, cores) {
  const cards = GEAR.map((g) => {
    const st = gearStatus(g.id, owned, cores);
    const action = st.state === 'owned'
      ? '<span class="gear-owned">✓ OWNED</span>'
      : st.state === 'needs'
        ? `<span class="gear-needs">Needs ${st.needs} first</span>`
        : `<button type="button" class="armory-upgrade-btn gear-buy" data-gear-id="${g.id}" ${st.state === 'ready' ? '' : 'disabled'}>
            ${st.state === 'ready' ? 'BUY' : 'NEED MORE'} <span class="armory-upgrade-cost"><span class="core-gem" aria-hidden="true"></span>${st.cost}</span>
          </button>`;
    return `
      <article class="gear-card gear-card--${st.state}">
        <img class="gear-art" src="${gearArt(g.id)}" alt="" width="160" height="160" loading="lazy" />
        <h3>${g.name}</h3>
        <p>${g.what}</p>
        ${action}
      </article>`;
  }).join('');
  return `
    <p class="armory-grid-intro">GRANNY’S GEAR · BUY ONCE WITH ALIEN CRYSTALS, KEEP FOREVER</p>
    <div class="gear-grid">${cards}</div>`;
}

/** Which alien takes the hits in each turret's firing-range preview. */
const RANGE_ALIENS = ['monster1', 'monster2', 'monster3', 'monster4', 'monster5'];

/**
 * A mini firing range: the turret fires its real ammo at an alien, which flashes, loses health
 * and pops, then a new one arrives. Support turrets show what they do instead of shooting.
 * @param {string} id @param {string} role @param {boolean} mystery
 */
function renderFiringRange(id, role, mystery) {
  if (mystery) return '';
  const alien = RANGE_ALIENS[TURRET_ORDER.indexOf(id) % RANGE_ALIENS.length];
  const ammo = AMMO[id]?.sprite ?? (role === 'glue' ? AMMO['slime-spitter']?.sprite : null);
  const support = role === 'magnet' || role === 'repair' || role === 'decoy';
  const shots = !support && ammo
    ? [1, 2, 3].map((n) => `<img class="range-shot range-shot--${n}" src="${ammo}" alt="" />`).join('')
    : '';
  const extras = role === 'magnet'
    ? [1, 2, 3].map((n) => `<span class="range-coin range-coin--${n}">🪙</span>`).join('')
    : role === 'repair'
      ? [1, 2, 3, 4].map((n) => `<span class="range-spark range-spark--${n}">✚</span>`).join('')
      : role === 'decoy' ? '<span class="range-huh">?!</span>' : '';
  return `
    <div class="armory-range${support ? ' armory-range--support' : ''}" data-role="${role}" aria-hidden="true">
      <span class="range-muzzle"></span>
      ${shots}
      <div class="range-alien"><img src="assets/enemies/${alien}.png" alt="" /><span class="range-hp"><i></i></span></div>
      <span class="range-pop"></span>
      ${extras}
    </div>`;
}

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
/**
 * Turrets further away than the next unlock stay a mystery: a glowing silhouette and "???",
 * so there is always something new on the horizon.
 * @param {string} id @param {number} xp @param {Set<string>} unlocked
 */
export function isMysteryTurret(id, xp, unlocked) {
  if (unlocked.has(id) || xp >= TURRETS[id].unlockXp) return false;
  const teaser = TURRET_ORDER.find((t) => !unlocked.has(t) && xp < TURRETS[t].unlockXp);
  return id !== teaser;
}

function renderArmoryFeature(id, xp, cores, unlocked) {
  const turret = TURRETS[id];
  if (!turret) return '';
  const owned = unlocked.has(id);
  const mystery = isMysteryTurret(id, xp, unlocked);
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
        <img class="armory-feature-turret ${turret.flipX ? 'flip-x' : ''}${mystery ? ' is-mystery' : ''}" src="${turret.sprite}" alt="" width="230" height="230" />
        ${renderFiringRange(id, role, mystery)}
      </div>
      <div class="armory-feature-copy">
        <span class="armory-feature-eyebrow">WEAPON SPOTLIGHT · FIELD TEST</span>
        <h3>${mystery ? 'MYSTERY TURRET' : turret.name} ${owned ? levelStars(id) : ''}</h3>
        <p>${mystery ? 'Nobody knows what this one does yet. Keep earning Forge XP to find out!' : turret.desc}</p>
        <strong>${state}</strong>
        <div class="armory-feature-stats">${mystery ? '??? · ??? · ???' : turretStatLine(owned ? current : turret)}</div>
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
  const tab = callbacks.tab === 'gear' ? 'gear' : 'turrets';
  const gearOwned = callbacks.gear ?? [];
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
    const mystery = isMysteryTurret(id, xp, unlocked);
    return `
      <button
        type="button"
        class="armory-card armory-card--${status.tone}${canUnlock || status.tone === 'upgrade' ? ' armory-card--ready' : ''} armory-level-${level}"
        data-turret-id="${id}"
        style="--turret-color: ${t.color}"
        aria-label="View ${mystery ? 'mystery turret' : t.name}${canUnlock ? ', ready to unlock' : ''}${status.tone === 'upgrade' ? ', upgrade ready' : ''}"
      >
        <span class="armory-card-badge armory-card-badge--${status.tone}">${status.label}</span>
        <span class="armory-card-art">
          <img src="${t.sprite}" alt="" class="${t.flipX ? 'flip-x' : ''}${mystery ? ' is-mystery' : ''}" width="72" height="72" loading="lazy" />
        </span>
        <span class="armory-card-name">${mystery ? '???' : t.name}</span>
        ${isUnlocked ? levelStars(id) : ''}
        <span class="armory-card-stat">${mystery ? 'Mystery weapon' : turretStatLine(isUnlocked ? effectiveTurret(id) : t)}</span>
        <span class="armory-card-price">${isUnlocked ? 'Owned' : formatUnlockXp(t.unlockXp)}</span>
        <span class="armory-card-detail">${status.detail}</span>
      </button>
    `;
  }).join('');

  host.innerHTML = `
    <div class="panel armory-panel">
      <button type="button" class="btn btn-ghost btn-sm times-back" id="armory-back">← Back</button>
      <p class="mission-tag">Granny’s Armory</p>
      <nav class="armory-tabs" role="tablist">
        <button type="button" role="tab" data-armory-tab="turrets" class="${tab === 'turrets' ? 'is-active' : ''}">TURRETS</button>
        <button type="button" role="tab" data-armory-tab="gear" class="${tab === 'gear' ? 'is-active' : ''}">GRANNY’S GEAR</button>
      </nav>
      <p class="granny-line armory-lead">${tab === 'gear'
        ? `Permanent power-ups for every siege. You have ${crystalText(cores)} to spend.`
        : `${headline}${/[.!?]$/.test(headline) ? '' : '.'} ${ECONOMY.forgeXpLabel} unlocks turrets forever. Crystals upgrade them.`}</p>
      <div class="armory-xp-bar">
        <span class="armory-xp-label">${ECONOMY.forgeXpLabel}</span>
        <span class="armory-xp-val">${xp.toLocaleString()}</span>
        <span class="armory-cores"><span class="core-gem" aria-hidden="true"></span><strong>${cores}</strong> alien ${cores === 1 ? 'crystal' : 'crystals'}</span>
      </div>
      ${tab === 'gear' ? renderGearShelf(gearOwned, cores) : `
      <div id="armory-feature-host">${renderArmoryFeature(featuredId, xp, cores, unlocked)}</div>
      <p class="armory-grid-intro">CHOOSE ANY TURRET TO PREVIEW IT · UNLOCK AND UPGRADE WEAPONS BELOW</p>
      <div class="armory-grid">${cards}</div>`}
    </div>
  `;

  host.querySelector('#armory-back')?.addEventListener('click', onBack);
  host.querySelectorAll('[data-armory-tab]').forEach((b) => b.addEventListener('click', () => callbacks.onTab?.(b.getAttribute('data-armory-tab'))));
  host.querySelectorAll('.gear-buy').forEach((b) => b.addEventListener('click', () => {
    const id = b.getAttribute('data-gear-id');
    if (id) callbacks.onBuyGear?.(id);
  }));

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
