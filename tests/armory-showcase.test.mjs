import test from 'node:test';
import assert from 'node:assert/strict';
import { armoryPromoState, renderArmoryPromo } from '../js/armory-promo.js';
import { TURRET_ORDER, TURRETS, STARTER_TURRETS } from '../js/turrets-data.js';
import { powerParticleCount } from '../js/power-core.js';

test('Armory promotion advertises the next weapon and precise Forge XP shortfall', () => {
  const owned = new Set(STARTER_TURRETS);
  const result = armoryPromoState(100, owned);
  assert.ok(result.id, 'there should be a locked turret');
  assert.equal(result.name, TURRETS[result.id].name);
  assert.equal(result.needed, Math.max(0, TURRETS[result.id].unlockXp - 100));
  assert.equal(result.ready, false);
  assert.match(renderArmoryPromo(100, owned), /mission-armory-open/);
  assert.match(renderArmoryPromo(100, owned), /Unlocks don't use up your XP/);
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

test('the Armory promotion celebrates a complete collection', () => {
  const result = armoryPromoState(99999, new Set(TURRET_ORDER));
  assert.equal(result.complete, true);
  assert.match(renderArmoryPromo(99999, new Set(TURRET_ORDER)), /YOU'VE UNLOCKED THEM ALL/);
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
