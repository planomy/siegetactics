import test from 'node:test';
import assert from 'node:assert/strict';
import { siegePressure, rosterPowerIndex } from '../js/siege-pressure.js';
import { waveConfigFor } from '../js/waves-data.js';
import { STARTER_TURRETS } from '../js/turrets-data.js';

const starters = [...STARTER_TURRETS];

test('L1 roster stays at baseline pressure', () => {
  const p = siegePressure({ unlockedTurrets: starters, turretLevels: {}, rank: 0 });
  assert.equal(p.powerIndex, 1);
  assert.equal(p.hpMul, 1);
  assert.equal(p.countMul, 1);
  const wave = waveConfigFor(1, { pressure: p });
  assert.equal(wave.hpScale, waveConfigFor(1).hpScale);
  assert.equal(wave.totalSpawns, waveConfigFor(1).totalSpawns);
});

test('L1/L2 mix already toughens the yard before L3', () => {
  const base = siegePressure({ unlockedTurrets: starters, turretLevels: {}, rank: 0 });
  const oneUpgraded = siegePressure({
    unlockedTurrets: starters,
    turretLevels: { [starters[0]]: 2 },
    rank: 0,
  });
  const allL2 = siegePressure({
    unlockedTurrets: starters,
    turretLevels: Object.fromEntries(starters.map((id) => [id, 2])),
    rank: 0,
  });
  assert.ok(oneUpgraded.hpMul > base.hpMul, 'a single L2 already raises pressure');
  assert.ok(oneUpgraded.hpMul >= 1.08 && oneUpgraded.hpMul < 1.4, `one L2 hpMul ${oneUpgraded.hpMul}`);
  assert.ok(allL2.hpMul >= 1.25 && allL2.hpMul < 1.5, `all L2 hpMul ${allL2.hpMul}`);
  assert.ok(allL2.hpMul >= oneUpgraded.hpMul, 'more L2s are at least as tough');
  assert.ok(allL2.countMul > base.countMul);
});

test('L3 roster clearly raises HP and lightly raises count', () => {
  const levels = Object.fromEntries(starters.map((id) => [id, 3]));
  const p = siegePressure({ unlockedTurrets: starters, turretLevels: levels, rank: 0 });
  assert.ok(p.powerIndex > 1.5);
  assert.ok(p.hpMul >= 1.45 && p.hpMul <= 1.7, `hpMul ${p.hpMul}`);
  assert.ok(p.countMul > 1 && p.countMul < p.hpMul, 'count rises less than HP');
  const base = waveConfigFor(3);
  const hard = waveConfigFor(3, { pressure: p });
  assert.ok(hard.hpScale > base.hpScale * 1.4);
  assert.ok(hard.totalSpawns > base.totalSpawns);
});

test('pressure approaches a soft ceiling instead of climbing forever', () => {
  const levels = Object.fromEntries(starters.map((id) => [id, 3]));
  const mid = siegePressure({ unlockedTurrets: starters, turretLevels: levels, rank: 2 });
  const top = siegePressure({ unlockedTurrets: starters, turretLevels: levels, rank: 5 });
  const beyond = siegePressure({ unlockedTurrets: starters, turretLevels: levels, rank: 99 });
  assert.ok(top.hpMul > mid.hpMul);
  assert.ok(beyond.hpMul - top.hpMul < 0.001, 'rank HP is capped');
  assert.ok(top.hpMul < 1.85, 'full L3 + Marshal stays under a hard wall');
});

test('first siege ignores roster pressure so the tutorial stays soft', () => {
  const levels = Object.fromEntries(starters.map((id) => [id, 3]));
  const p = siegePressure({
    unlockedTurrets: starters,
    turretLevels: levels,
    rank: 5,
    firstSiege: true,
  });
  assert.deepEqual(p, { hpMul: 1, countMul: 1, powerIndex: 1 });
  const intro = waveConfigFor(1, { firstSiege: true, pressure: p, rank: 5 });
  const usualIntro = waveConfigFor(1, { firstSiege: true });
  assert.equal(intro.totalSpawns, 18);
  assert.equal(intro.hpScale, usualIntro.hpScale);
  assert.equal(intro.totalSpawns, usualIntro.totalSpawns);
});

test('roster power focuses on the stronger half so L2s are not washed out', () => {
  assert.equal(rosterPowerIndex(['a', 'b'], { a: 1, b: 1 }), 1);
  assert.equal(rosterPowerIndex(['a', 'b'], { a: 3, b: 3 }), 1.55);
  // Four owned: two L2, two L1 → focus half is both L2s.
  assert.equal(
    rosterPowerIndex(['a', 'b', 'c', 'd'], { a: 2, b: 2, c: 1, d: 1 }),
    1.25,
  );
});
