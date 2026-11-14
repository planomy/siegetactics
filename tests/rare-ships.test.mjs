import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  RARE_SHIPS,
  COUSIN_ZORG,
  RARE_RULES,
  normalizeRareSave,
  rollRareShip,
  recordRareSighted,
  recordRareCaught,
  rareDossiers,
  rareCrystalReward,
} from '../js/rare-ships.js';

const never = () => 0.999;

/** Plays battles with no luck at all until a rare shows up; returns the battle it appeared in. */
function battlesUntilRare(rs, rand = never) {
  for (let battle = 1; battle <= 100; battle++) {
    const roll = rollRareShip(rs, { rand });
    rs = roll.save;
    if (roll.shipId) return { battle, rs, shipId: roll.shipId };
  }
  return { battle: Infinity, rs, shipId: null };
}

test('every new player meets their first rare between battles 6 and 10, even with no luck', () => {
  for (let i = 0; i < 50; i++) {
    const { battle, shipId } = battlesUntilRare(normalizeRareSave(null));
    assert.ok(battle >= RARE_RULES.firstFrom && battle <= RARE_RULES.firstTo, `first rare at battle ${battle}`);
    assert.ok(RARE_SHIPS.some((s) => s.id === shipId), 'the first one is a rare, never Zorg');
  }
});

test('after the first, the safety net guarantees a rare by the 25th battle without one', () => {
  let rs = recordRareSighted(normalizeRareSave(null), RARE_SHIPS[0].id);
  const { battle } = battlesUntilRare(rs);
  assert.equal(battle, RARE_RULES.pityAt);
});

test('a rolled ship waits for the next battle if this one is left before it flies in', () => {
  let rs = normalizeRareSave({ firstAt: 6, battles: 5 });
  const first = rollRareShip(rs, { rand: never });
  assert.ok(first.shipId);
  const again = rollRareShip(first.save, { rand: never });
  assert.equal(again.shipId, first.shipId);
  const flown = recordRareSighted(again.save, first.shipId);
  assert.equal(flown.pending, null);
  assert.equal(flown.sighted[first.shipId], 1);
});

test('Cousin Zorg only turns up once the player has shot down a rare', () => {
  const always = () => 0;
  const seen = recordRareSighted(normalizeRareSave(null), RARE_SHIPS[0].id);
  assert.notEqual(rollRareShip(seen, { rand: always }).shipId, COUSIN_ZORG.id);
  const caught = recordRareCaught(seen, RARE_SHIPS[0].id);
  assert.equal(rollRareShip(caught, { rand: always }).shipId, COUSIN_ZORG.id);
});

test('ships not yet collected show up more often than ones already caught', () => {
  let rs = recordRareSighted(normalizeRareSave(null), RARE_SHIPS[0].id);
  for (const ship of RARE_SHIPS.slice(0, 4)) rs = recordRareCaught(rs, ship.id);
  const last = RARE_SHIPS[4].id;
  let hits = 0;
  let seed = 1;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 4000; i++) {
    const roll = rollRareShip({ ...rs, sinceLast: RARE_RULES.pityAt }, { rand });
    if (roll.shipId === last) hits += 1;
  }
  // Weights 3 (uncaught) against 1 each for the four caught ones: about 3 in 7.
  assert.ok(hits / 4000 > 0.37 && hits / 4000 < 0.49, `uncaught ship picked ${(hits / 40).toFixed(1)}% of the time`);
});

test('a higher Crystal Vault makes rares a little more likely', () => {
  const rs = recordRareSighted(normalizeRareSave(null), RARE_SHIPS[0].id);
  const justMissed = () => RARE_RULES.chance * 1.3;
  assert.equal(rollRareShip(rs, { vaultTier: 'starter', rand: justMissed }).shipId, null);
  assert.ok(rollRareShip(rs, { vaultTier: 'gold', rand: justMissed }).shipId);
});

test('damaged or missing save data is repaired safely', () => {
  const rs = normalizeRareSave({ battles: 'x', firstAt: 99, pending: 'not-a-ship', caught: { 'frost-saucer': 2, junk: 5 } });
  assert.equal(rs.battles, 0);
  assert.ok(rs.firstAt >= RARE_RULES.firstFrom && rs.firstAt <= RARE_RULES.firstTo);
  assert.equal(rs.pending, null);
  assert.deepEqual(rs.caught, { 'frost-saucer': 2 });
});

test('blueprints hide unknown rares, name sighted ones and fully reveal caught ones', () => {
  let rs = normalizeRareSave(null);
  rs = recordRareSighted(rs, 'frost-saucer');
  rs = recordRareSighted(rs, 'storm-hornet');
  rs = recordRareCaught(rs, 'storm-hornet');
  const byId = Object.fromEntries(rareDossiers(rs).map((d) => [d.key, d]));
  assert.equal(byId['brass-dreadnought'].rareState, 'unknown');
  assert.match(byId['brass-dreadnought'].codename, /\?\?\?/);
  assert.equal(byId['frost-saucer'].rareState, 'sighted');
  assert.equal(byId['frost-saucer'].codename, 'FROST SAUCER');
  assert.equal(byId['storm-hornet'].rareState, 'caught');
  assert.equal(byId['storm-hornet'].caught, 1);
  assert.match(byId['cousin-zorg'].codename, /LEGENDARY/);
});

test('rares pay 3 crystals and Cousin Zorg pays 10', () => {
  assert.equal(rareCrystalReward(RARE_SHIPS[0]), 3);
  assert.equal(rareCrystalReward(COUSIN_ZORG), 10);
});

test('a rare that reaches the porch escapes instead of costing Granny a life', () => {
  const engine = readFileSync(new URL('../js/td-engine.js', import.meta.url), 'utf8');
  assert.match(engine, /if \(e\.progress >= 1 && e\.rare\) \{[\s\S]*?onRareShipEscaped[\s\S]*?return false;/);
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /if \(!rare && !run\.bossCrystalPaid\)/);
});
