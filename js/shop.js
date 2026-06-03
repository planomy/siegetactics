import { TURRETS, TURRET_ORDER } from './turrets-data.js';
import { ECONOMY } from './economy.js';

/**
 * @param {HTMLElement} barEl
 * @param {{
 *   budget: number,
 *   persistentXp: number,
 *   unlocked: Set<string>,
 *   selectedId: string|null,
 *   onSelect: (id: string) => void,
 *   onUnlock: (id: string) => boolean,
 *   showToast: (msg: string) => void,
 * }} state
 */
export function renderShopBar(barEl, state) {
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

    const priceLabel = isUnlocked
      ? `${t.placementCost} coins`
      : t.unlockXp === 0
        ? 'Free'
        : `${t.unlockXp.toLocaleString()} Forge XP`;

    btn.innerHTML = `
      <span class="price-tag ${isUnlocked ? 'price-place' : 'price-unlock'}">${isUnlocked ? priceLabel : `🔒 ${priceLabel}`}</span>
      <img src="${t.sprite}" alt="" />
      <span class="turret-name">${t.name}</span>
    `;

    btn.addEventListener('click', () => {
      if (!isUnlocked) {
        if (canUnlock) {
          state.onUnlock(id);
          state.showToast(`${t.name} unlocked!`);
          renderShopBar(barEl, state);
        } else {
          state.showToast(`Keep playing — ${t.unlockXp.toLocaleString()} ${ECONOMY.forgeXpLabel} unlocks this.`);
        }
        return;
      }
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
