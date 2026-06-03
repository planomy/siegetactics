import { TURRETS, TURRET_ORDER } from './turrets-data.js';
import { ECONOMY } from './economy.js';

/** @type {HTMLElement|null} */
let popoverEl = null;
/** @type {ReturnType<typeof setTimeout>|null} */
let popoverHideTimer = null;
/** @type {HTMLElement|null} */
let popoverAnchor = null;
/** @type {boolean} */
let globalListenersBound = false;

/** @param {number} xp */
function formatUnlockXp(xp) {
  if (xp === 0) return 'Free';
  if (xp >= 1000) return `${xp % 1000 === 0 ? xp / 1000 : (xp / 1000).toFixed(1)}k XP`;
  return `${xp} XP`;
}

function ensurePopover() {
  if (!popoverEl) {
    popoverEl = document.createElement('div');
    popoverEl.id = 'shop-popover';
    popoverEl.className = 'shop-popover';
    popoverEl.hidden = true;
    popoverEl.setAttribute('role', 'tooltip');
    document.body.appendChild(popoverEl);
  }
  return popoverEl;
}

/** @param {import('./turrets-data.js').TurretDef} t @param {Parameters<typeof renderShopBar>[1]} state */
function turretStatus(t, state) {
  const isUnlocked = state.unlocked.has(t.id);
  if (isUnlocked && state.budget >= t.placementCost) {
    return { tone: 'ready', label: 'Ready to place', detail: `${t.placementCost} ${ECONOMY.siegeCoinsLabel}` };
  }
  if (isUnlocked) {
    const short = state.budget - t.placementCost;
    return {
      tone: 'warn',
      label: 'Not enough coins',
      detail: `Need ${Math.abs(short)} more ${ECONOMY.siegeCoinsLabel}`,
    };
  }
  if (state.persistentXp >= t.unlockXp) {
    return { tone: 'unlock', label: 'Tap to unlock', detail: 'You have enough Forge XP' };
  }
  const need = t.unlockXp - state.persistentXp;
  return {
    tone: 'locked',
    label: 'Locked',
    detail: `${need.toLocaleString()} more ${ECONOMY.forgeXpLabel}`,
  };
}

/** @param {import('./turrets-data.js').TurretDef} t */
function turretStatLine(t) {
  if (t.role === 'decoy') return 'Distracts alien fire';
  if (t.role === 'magnet') return `+${t.magnetBonus ?? 1} coin on nearby kills`;
  if (t.role === 'repair') return `Heals turrets within ${t.repairRadius ?? 90}px`;
  if (t.role === 'glue') return 'Slows whole lane';
  if (t.role === 'freeze') return 'Freezing icy blast';
  if (t.damage > 0) return `${t.damage} dmg · ${t.range} range`;
  if (t.slow) return 'Slows enemies';
  return t.desc;
}

/**
 * @param {HTMLElement} btn
 * @param {import('./turrets-data.js').TurretDef} t
 * @param {Parameters<typeof renderShopBar>[1]} state
 * @param {{ pulse?: boolean }} [opts]
 */
function showShopPopover(btn, t, state, opts = {}) {
  const pop = ensurePopover();
  const status = turretStatus(t, state);

  pop.style.setProperty('--turret-color', t.color);
  pop.innerHTML = `
    <div class="shop-popover-glow" aria-hidden="true"></div>
    <div class="shop-popover-inner">
      <div class="shop-popover-art">
        <img src="${t.sprite}" alt="" class="${t.flipX ? 'flip-x' : ''}" />
      </div>
      <div class="shop-popover-copy">
        <span class="shop-popover-name">${t.name}</span>
        <p class="shop-popover-desc">${t.desc}</p>
        <span class="shop-popover-stat">${turretStatLine(t)}</span>
        <span class="shop-popover-badge shop-popover-badge--${status.tone}">${status.label}</span>
        <span class="shop-popover-detail">${status.detail}</span>
      </div>
    </div>
    <span class="shop-popover-arrow" aria-hidden="true"></span>
  `;

  pop.hidden = false;
  pop.classList.remove('visible', 'shop-popover-below', 'shop-popover-pulse');
  popoverAnchor = btn;

  pop.style.visibility = 'hidden';
  pop.style.left = '0';
  pop.style.top = '0';

  requestAnimationFrame(() => {
    if (!popoverEl || popoverAnchor !== btn) return;
    const rect = btn.getBoundingClientRect();
    const pw = pop.offsetWidth;
    const ph = pop.offsetHeight;
    const pad = 10;
    let left = rect.left + rect.width / 2 - pw / 2;
    left = Math.max(pad, Math.min(left, window.innerWidth - pw - pad));
    let top = rect.top - ph - 12;
    let below = false;
    if (top < pad) {
      top = rect.bottom + 12;
      below = true;
    }
    pop.style.left = `${Math.round(left)}px`;
    pop.style.top = `${Math.round(top)}px`;
    pop.style.visibility = '';
    pop.classList.toggle('shop-popover-below', below);
    if (opts.pulse) pop.classList.add('shop-popover-pulse');
    pop.classList.add('visible');
  });

  clearTimeout(popoverHideTimer ?? undefined);
}

export function hideShopPopover() {
  if (!popoverEl) return;
  popoverEl.classList.remove('visible', 'shop-popover-pulse');
  popoverAnchor = null;
  clearTimeout(popoverHideTimer ?? undefined);
  popoverHideTimer = setTimeout(() => {
    if (popoverEl && !popoverEl.classList.contains('visible')) {
      popoverEl.hidden = true;
    }
  }, 200);
}

/** @param {HTMLElement} btn @param {Parameters<typeof renderShopBar>[1]} state */
function bindShopPopover(btn, t, state) {
  const show = (pulse = false) => showShopPopover(btn, t, state, { pulse });
  const hide = () => {
    if (popoverAnchor === btn) hideShopPopover();
  };

  btn.addEventListener('mouseenter', () => show());
  btn.addEventListener('mouseleave', hide);
  btn.addEventListener('focus', () => show());
  btn.addEventListener('blur', hide);

  btn.addEventListener('touchstart', () => show(), { passive: true });
}

/**
 * @param {HTMLElement} barEl
 * @param {{
 *   budget: number,
 *   persistentXp: number,
 *   unlocked: Set<string>,
 *   selectedId: string|null,
 *   onSelect: (id: string) => void,
 *   onUnlock: (id: string) => boolean,
 *   showToast: (msg: string, opts?: { variant?: string }) => void,
 * }} state
 */
export function renderShopBar(barEl, state) {
  hideShopPopover();

  if (!globalListenersBound) {
    globalListenersBound = true;
    window.addEventListener('scroll', hideShopPopover, true);
    window.addEventListener('resize', hideShopPopover);
  }

  barEl.innerHTML = `
    <div class="shop-budget">${ECONOMY.siegeCoinsLabel}: <strong id="shop-budget">${state.budget}</strong></div>
    <p class="shop-hint">${ECONOMY.forgeXpLabel} unlocks turrets forever · ${ECONOMY.siegeCoinsLabel} place them this fight · drag onto grass lanes.</p>
    <div class="shop-turrets" id="shop-turrets"></div>
  `;

  const turretsEl = barEl.querySelector('#shop-turrets');
  TURRET_ORDER.forEach((id) => {
    const t = TURRETS[id];
    const isUnlocked = state.unlocked.has(id);
    const canUnlock = !isUnlocked && state.persistentXp >= t.unlockXp;
    const canPlace = isUnlocked && state.budget >= t.placementCost;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'shop-buy-btn';
    if (state.selectedId === id && isUnlocked) btn.classList.add('selected');
    if (!isUnlocked) btn.classList.add('locked');
    if (isUnlocked && !canPlace) btn.classList.add('cant-afford');
    if (!isUnlocked && !canUnlock) btn.classList.add('cant-unlock');
    if (t.flipX) btn.classList.add('flip-x');
    btn.style.setProperty('--turret-color', t.color);
    btn.dataset.turretId = id;

    const priceLabel = isUnlocked ? String(t.placementCost) : formatUnlockXp(t.unlockXp);

    btn.innerHTML = `
      <span class="price-tag ${isUnlocked ? 'price-place' : 'price-unlock'}">${isUnlocked ? priceLabel : `🔒 ${priceLabel}`}</span>
      <img src="${t.sprite}" alt="" />
      <span class="turret-name">${t.name}</span>
    `;

    bindShopPopover(btn, t, state);

    btn.addEventListener('click', () => {
      if (!isUnlocked) {
        if (canUnlock) {
          state.onUnlock(id);
          state.showToast(`${t.name} unlocked — drag onto the grass!`, { variant: 'success' });
          renderShopBar(barEl, state);
        } else {
          showShopPopover(btn, t, state, { pulse: true });
        }
        return;
      }
      hideShopPopover();
      state.onSelect(id);
    });

    turretsEl?.appendChild(btn);
  });
}

/**
 * @param {HTMLElement} barEl
 * @param {Parameters<typeof renderShopBar>[1]} state
 */
export function updateShopBar(barEl, state) {
  const budgetEl = barEl.querySelector('#shop-budget');
  if (budgetEl) budgetEl.textContent = String(state.budget);

  barEl.querySelectorAll('.shop-buy-btn').forEach((btn) => {
    const id = btn.dataset.turretId;
    if (!id) return;
    const t = TURRETS[id];
    const isUnlocked = state.unlocked.has(id);
    const canUnlock = !isUnlocked && state.persistentXp >= t.unlockXp;
    const canPlace = isUnlocked && state.budget >= t.placementCost;

    btn.classList.toggle('selected', state.selectedId === id && isUnlocked);
    btn.classList.toggle('locked', !isUnlocked);
    btn.classList.toggle('cant-afford', isUnlocked && !canPlace);
    btn.classList.toggle('cant-unlock', !isUnlocked && !canUnlock);
  });
}
