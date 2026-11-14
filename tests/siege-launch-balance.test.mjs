import test from 'node:test';
import assert from 'node:assert/strict';
import { balanceMission, startingSiegeCoins, nextBattleCry, BATTLE_CRIES } from '../js/battle-balance.js';
import { MISSIONS } from '../js/missions-data.js';
import { waveConfigFor, openingHorde, ZAP_CAP_SHARE, SIEGE_DURATION_SEC } from '../js/waves-data.js';
import { bonusSiegeSeconds, defaultTrainingGate, recordTrainingQuestions, normalizeTrainingGate } from '../js/training-gate.js';

const mission = MISSIONS[0];

test('first invasion gives at least 125 starting coins, plus earned maths bonuses', () => {
  assert.equal(startingSiegeCoins(mission, 0, 20), 170);
  assert.equal(startingSiegeCoins(mission, 3, 20), 135);
});

test('first siege is forgiving but later sieges retain a challenge', () => {
  const tutorial = balanceMission(mission, 0);
  const later = balanceMission(mission, 3);
  assert.equal(tutorial.killBudgetXp, 2);
  assert.equal(tutorial.bossKillBudgetXp, 6);
  assert.equal(tutorial.waveClearBudgetXp, 15);
  assert.equal(tutorial.leakCoinPenalty, 5);
  assert.equal(tutorial.maxLeaks, 7);
  assert.equal(later.leakCoinPenalty, 10);
  assert.equal(later.maxLeaks, 5);
  assert.equal(mission.maxLeaks, 5, 'original definition must not be mutated');
});

test('new players get 20 slightly slower first-wave enemies', () => {
  const intro = waveConfigFor(1, { firstSiege: true });
  const usual = waveConfigFor(1);
  assert.equal(intro.totalSpawns, 20);
  assert.ok(usual.totalSpawns > intro.totalSpawns);
  assert.ok(intro.speedMul < usual.speedMul);
  assert.ok(intro.hpScale < usual.hpScale);
  assert.equal(waveConfigFor(2, { firstSiege: true }).totalSpawns, waveConfigFor(2).totalSpawns);
});

test('the horde grows with siege rank, gently, and never on the first siege', () => {
  const totals = [0, 1, 2, 3, 4, 5].map((rank) => openingHorde({ rank }).total);
  assert.deepEqual(totals.slice(0, 2), [30, 30], 'no rank and Recruit face the usual opening');
  for (let i = 2; i < totals.length; i++) assert.ok(totals[i] > totals[i - 1], `rank ${i} is bigger than rank ${i - 1}`);
  assert.ok(totals[5] <= 60, 'even Marshal faces at most double the usual opening');
  assert.equal(openingHorde({ rank: 3 }).troops.length, 3, 'higher ranks add tougher troop types');
  assert.equal(openingHorde({ firstSiege: true, rank: 5 }).total, 20);
  assert.equal(waveConfigFor(3, { rank: 1 }).totalSpawns, waveConfigFor(3).totalSpawns);
});

test('extra right answers zap scouts from the opening assault, capped at a fifth of it', () => {
  const base = openingHorde({ rank: 1 });
  const some = openingHorde({ rank: 1, extraRight: 3 });
  const lots = openingHorde({ rank: 1, extraRight: 10 });
  assert.equal(some.zapped, 3);
  assert.equal(some.total, base.total - 3);
  assert.equal(lots.zapCap, Math.floor(base.total * ZAP_CAP_SHARE));
  assert.equal(lots.zapped, lots.zapCap);
  assert.equal(waveConfigFor(1, { rank: 1, zapped: 3 }).totalSpawns, some.total, 'the siege sends what the preview shows');
});

test('launch labels are humorous and do not immediately repeat', () => {
  assert.ok(BATTLE_CRIES.length >= 10);
  assert.ok(BATTLE_CRIES.includes('BRING IT ON!'));
  const next = nextBattleCry(0.5, BATTLE_CRIES[0]);
  assert.ok(BATTLE_CRIES.includes(next));
  assert.notEqual(next, BATTLE_CRIES[0]);
  assert.ok(BATTLE_CRIES.every((s) => s.length <= 45));
});

test('normal battle lasts 90 seconds, bonus is only earned from extra maths', () => {
  assert.equal(SIEGE_DURATION_SEC, 90);
  let gate = defaultTrainingGate();
  assert.equal(bonusSiegeSeconds(gate), 0);
  gate = recordTrainingQuestions(gate, 30, 1).gate;
  assert.equal(bonusSiegeSeconds(gate), 0);
  gate = recordTrainingQuestions(gate, 5, 1).gate;
  assert.equal(bonusSiegeSeconds(gate), 15);
  gate = recordTrainingQuestions(gate, 5, 0).gate;
  assert.equal(bonusSiegeSeconds(gate), 30);
  assert.equal(bonusSiegeSeconds(normalizeTrainingGate(JSON.parse(JSON.stringify(gate)))), 30);
});
