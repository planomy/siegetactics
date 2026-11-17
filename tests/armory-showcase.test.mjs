import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { armoryPromoState, renderArmoryPromo } from '../js/armory-promo.js';
import { TURRET_ORDER, TURRETS, STARTER_TURRETS } from '../js/turrets-data.js';
import { powerParticleCount } from '../js/power-core.js';

test('a new player keeps level 1 turret stats and a single earned star', async () => {
  const { setTurretLevels, turretLevel, effectiveTurret } = await import('../js/turret-upgrades.js?v=20261117e2');
  setTurretLevels(null);
  assert.equal(turretLevel('granny-blaster'), 1);
  assert.equal(turretLevel('boom-gnome'), 1);
  assert.equal(effectiveTurret('boom-gnome').damage, TURRETS['boom-gnome'].damage);
  const armory = readFileSync(new URL('../js/armory.js', import.meta.url), 'utf8');
  assert.match(armory, /'★'\.repeat\(level\)/);
  assert.doesNotMatch(armory, /is-earned/);
  const css = readFileSync(new URL('../css/armory-showcase.css', import.meta.url), 'utf8');
  assert.match(css, /@media \(max-height: 820px\)[\s\S]*\.armory-grid \{ order: 4; \}/);
  assert.match(css, /#armory-feature-host \{ order: 5; \}/);
});

test('armory always shows crystal upgrade prices, even when the player is short', () => {
  const armory = readFileSync(new URL('../js/armory.js', import.meta.url), 'utf8');
  // Spotlight button keeps the gem+cost chip when short (NEED MORE), not only when ready.
  assert.match(armory, /up\.ready \? `⚡ UPGRADE TO LEVEL \$\{up\.level\}` : 'NEED MORE'/);
  assert.match(armory, /crystalPriceChip\(up\.cost\)/);
  // Grid cards show the next upgrade cost instead of a bare "Owned".
  assert.match(armory, /status\.cost != null \? crystalPriceChip\(status\.cost\) : 'MAX'/);
  assert.doesNotMatch(armory, /isUnlocked \? 'Owned'/);
  const css = readFileSync(new URL('../css/armory-showcase.css', import.meta.url), 'utf8');
  assert.match(css, /\.armory-upgrade-btn:disabled/);
});

test('tapping an owned turret upgrades when affordable and explains when short', () => {
  const armory = readFileSync(new URL('../js/armory.js', import.meta.url), 'utf8');
  // Same tap path as unlock — not only the below-the-fold spotlight button.
  assert.match(armory, /if \(up\.ready\) \{\s*if \(onUpgrade\(id\)\)/);
  assert.match(armory, /Need \$\{up\.short\} more crystal/);
  // Upgrade button uses one delegated listener, not a re-bind per preview.
  assert.match(armory, /closest\('\[data-upgrade-id\]'\)/);
  assert.doesNotMatch(armory, /const bindUpgrade = /);
});

test('Armory promotion advertises the next weapon and precise Forge XP shortfall', () => {
  const owned = new Set(STARTER_TURRETS);
  const result = armoryPromoState(100, owned);
  assert.ok(result.id, 'there should be a locked turret');
  assert.equal(result.name, TURRETS[result.id].name);
  assert.equal(result.needed, Math.max(0, TURRETS[result.id].unlockXp - 100));
  assert.equal(result.ready, false);
  assert.match(renderArmoryPromo(100, owned), /mission-armory-open/);
  assert.match(renderArmoryPromo(100, owned), /WEAPONS OWNED/);
});

test('reaching an XP threshold makes the upgrade available without spending XP', () => {
  const owned = new Set(STARTER_TURRETS);
  const next = armoryPromoState(0, owned);
  const result = armoryPromoState(TURRETS[next.id].unlockXp, owned);
  assert.equal(result.id, next.id);
  assert.equal(result.ready, true);
  assert.equal(result.needed, 0);
  assert.match(renderArmoryPromo(TURRETS[next.id].unlockXp, owned), /UNLOCK IN THE ARMORY/);
});

test('after owning a weapon, the advert advances to the next locked turret', () => {
  const owned = new Set(STARTER_TURRETS);
  const first = armoryPromoState(0, owned);
  owned.add(first.id);
  const second = armoryPromoState(0, owned);
  assert.notEqual(second.id, first.id);
});

test('the Armory promotion celebrates a complete collection once every turret is maxed', async () => {
  const { setTurretLevels } = await import('../js/turret-upgrades.js?v=20261117e2');
  const result = armoryPromoState(99999, new Set(TURRET_ORDER));
  assert.equal(result.complete, true);
  setTurretLevels(Object.fromEntries(TURRET_ORDER.map((id) => [id, 3])));
  try {
    assert.match(renderArmoryPromo(99999, new Set(TURRET_ORDER)), /YOU'VE UNLOCKED THEM ALL/);
  } finally {
    setTurretLevels({});
  }
});

test('power particles increase with every question without exceeding a sensible cap', () => {
  let previous = 0;
  for (let n = 0; n <= 10; n++) {
    const count = powerParticleCount(n);
    assert.ok(count > previous, `question ${n} should show more energy`);
    previous = count;
  }
  assert.ok(powerParticleCount(10) <= 40);
  assert.equal(powerParticleCount(-1), powerParticleCount(0));
  assert.equal(powerParticleCount(100), powerParticleCount(10));
});

test('with every turret owned, the promo features the next upgrade instead of an empty card', async () => {
  const { TURRET_ORDER } = await import('../js/turrets-data.js');
  const { upgradePromoState } = await import('../js/armory-promo.js');
  const all = new Set(TURRET_ORDER);
  const broke = upgradePromoState(all, 0);
  assert.ok(broke);
  assert.equal(broke.ready, false);
  assert.equal(broke.nextLevel, 2);
  // Lv2 costs 3 crystals under the dearer Armory prices.
  const html = renderArmoryPromo(999999, all, 3);
  assert.match(html, /UPGRADE READY!/);
  assert.match(html, /TURRETS AT MAX LEVEL/);
  assert.doesNotMatch(html, /armory-promo-complete/);
});

test('dearer Armory upgrades cost 3 then 6 crystals', async () => {
  const { UPGRADE_CORE_COST, nextUpgrade, setTurretLevels } = await import('../js/turret-upgrades.js?v=20261117e2');
  assert.deepEqual(UPGRADE_CORE_COST, { 2: 3, 3: 6 });
  setTurretLevels({});
  const to2 = nextUpgrade('granny-blaster', 5, true);
  assert.equal(to2?.cost, 3);
  assert.equal(to2?.ready, true);
  setTurretLevels({ 'granny-blaster': 2 });
  const to3 = nextUpgrade('granny-blaster', 5, true);
  assert.equal(to3?.cost, 6);
  assert.equal(to3?.ready, false);
  assert.equal(to3?.short, 1);
  setTurretLevels({});
});
