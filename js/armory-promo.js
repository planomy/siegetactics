import { TURRETS, TURRET_ORDER } from './turrets-data.js';
import { nextLockedTurret, nextUnlockableTurret } from './armory.js?v=20261112f';

/**
 * Preview only. Forge XP is a permanent milestone score, NOT a spendable balance.
 * @param {number} xp
 * @param {Set<string>} unlocked
 */
export function armoryPromoState(xp, unlocked) {
  const available = nextUnlockableTurret(xp, unlocked);
  const next = available ?? nextLockedTurret(xp, unlocked);
  const owned = TURRET_ORDER.filter((id) => unlocked.has(id)).length;
  if (!next) return { id: null, owned, total: TURRET_ORDER.length, ready: false, complete: true, needed: 0, progress: 100 };
  const turret = TURRETS[next];
  const required = turret.unlockXp;
  return {
    id: next, owned, total: TURRET_ORDER.length,
    ready: xp >= required,
    complete: false,
    needed: Math.max(0, required - xp),
    progress: required > 0 ? Math.min(100, Math.round(xp / required * 100)) : 100,
    required,
    name: turret.name,
    sprite: turret.sprite,
    desc: turret.desc,
    flipX: Boolean(turret.flipX),
  };
}

/**
 * The main-screen advertisement for weapon upgrades.
 * @param {number} xp
 * @param {Set<string>} unlocked
 */
export function renderArmoryPromo(xp, unlocked) {
  const p = armoryPromoState(xp, unlocked);
  if (p.complete) {
    return `
      <section class="armory-promo armory-promo-complete" aria-label="Granny's Armory">
        <div class="armory-promo-complete-art" aria-hidden="true">★</div>
        <div class="armory-promo-copy">
          <span class="armory-promo-eyebrow">GRANNY'S ARMORY · FULL ARSENAL</span>
          <h2>YOU'VE UNLOCKED THEM ALL!</h2>
        </div>
        <button type="button" class="armory-promo-cta" id="mission-armory-open">VIEW YOUR ARMORY</button>
      </section>
    `;
  }
  // Within touching distance of the next turret, the promo shouts about it.
  const close = !p.ready && p.needed <= Math.max(150, p.required * 0.12);
  const status = p.ready
    ? 'NEW WEAPON AVAILABLE NOW!'
    : `ONLY ${p.needed.toLocaleString()} XP TO GO!`;
  const button = p.ready ? 'UNLOCK IN THE ARMORY' : 'EXPLORE THE ARMORY';
  return `
    <section class="armory-promo${p.ready ? ' armory-promo-ready' : ''}${close ? ' armory-promo-close' : ''}" aria-label="Granny's Armory weapon upgrades">
      <div class="armory-promo-art">
        <div class="armory-promo-art-ring" aria-hidden="true"></div>
        <img src="${p.sprite}" alt="" class="${p.flipX ? 'flip-x' : ''}" loading="lazy" width="170" height="170" />
        <span class="armory-promo-art-badge">${p.ready ? 'READY!' : 'NEXT UNLOCK'}</span>
      </div>
      <div class="armory-promo-copy">
        <span class="armory-promo-eyebrow">GRANNY'S ARMORY · PERMANENT UPGRADES</span>
        <h2>${p.ready ? 'NEW FIREPOWER AVAILABLE!' : 'BUILD AN UNSTOPPABLE ARMY!'}</h2>
        <p class="armory-promo-featured">${p.name} <span>· ${p.desc}</span></p>
        <div class="armory-promo-progress">
          <div class="armory-promo-progress-label">
            <strong>${status}</strong>
            <span>${Math.min(xp, p.required).toLocaleString()} / ${p.required.toLocaleString()} XP</span>
          </div>
          <div class="armory-promo-track" role="progressbar" aria-label="XP toward ${p.name}" aria-valuemin="0" aria-valuemax="${p.required}" aria-valuenow="${Math.min(xp, p.required)}">
            <span class="armory-promo-fill" style="width: ${p.progress}%"></span>
          </div>
        </div>
        <button type="button" class="armory-promo-cta" id="mission-armory-open">${button}</button>
        <span class="armory-promo-footnote">${p.owned} / ${p.total} WEAPONS OWNED</span>
      </div>
    </section>
  `;
}
