import assert from 'node:assert/strict';
import test from 'node:test';
import { BIAS_DAMAGE, damageVsEnemy, TURRETS } from '../js/turrets-data.js';
import { UPGRADE_CORE_COST, crystalsSpentOnLevels } from '../js/turret-upgrades.js';

test('Armory stars stay career-priced (no mid-siege auto gun scale)', () => {
  assert.deepEqual(UPGRADE_CORE_COST, { 2: 6, 3: 14 });
  assert.equal(crystalsSpentOnLevels({ 'plasma-daisy': 3 }), 20);
  assert.equal(crystalsSpentOnLevels({ 'plasma-daisy': 2, 'boom-gnome': 3 }), 6 + 20);
});

test('air guns hit flyers harder and walkers softer', () => {
  const daisy = TURRETS['plasma-daisy'];
  assert.equal(daisy.bias, 'air');
  assert.ok(daisy.damage < 24, 'Daisy base damage pulled back from omni-mulcher');
  const vsAir = damageVsEnemy(daisy, { flying: true });
  const vsGround = damageVsEnemy(daisy, { flying: false });
  assert.ok(vsAir > daisy.damage);
  assert.ok(vsGround < daisy.damage);
  assert.equal(vsAir, Math.round(daisy.damage * BIAS_DAMAGE.air.air));
});

test('ground guns are soft against flyers', () => {
  const boom = TURRETS['boom-gnome'];
  assert.equal(boom.bias, 'ground');
  const vsAir = damageVsEnemy(boom, { flying: true }, 30);
  const vsGround = damageVsEnemy(boom, { flying: false }, 30);
  assert.ok(vsAir < vsGround);
  assert.equal(vsAir, Math.round(30 * BIAS_DAMAGE.ground.air));
});

test('Granny Blaster stays an even generalist', () => {
  const granny = TURRETS['granny-blaster'];
  assert.equal(granny.bias, 'any');
  assert.equal(damageVsEnemy(granny, { flying: true }, 11), 11);
  assert.equal(damageVsEnemy(granny, { flying: false }, 11), 11);
});
