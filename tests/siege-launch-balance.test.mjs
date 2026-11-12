import test from 'node:test';
import assert from 'node:assert/strict';
import { balanceMission, startingSiegeCoins, nextBattleCry, BATTLE_CRIES } from '../js/battle-balance.js';
import { MISSIONS } from '../js/missions-data.js';
import { waveConfigFor, SIEGE_DURATION_SEC } from '../js/waves-data.js';
import { bonusSiegeSeconds, defaultTrainingGate, recordTrainingQuestions, normalizeTrainingGate } from '../js/training-gate.js';

const mission = MISSIONS[0];

test('first invasion gives at least 125 starting coins, plus earned maths bonuses', () => {
  assert.equal(startingSiegeCoins(mission, 0, 20), 145);
  assert.equal(startingSiegeCoins(mission, 3, 20), 110);
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

test('launch labels are humorous and do not immediately repeat', () => {
  assert.ok(BATTLE_CRIES.length >= 10);
  assert.ok(BATTLE_CRIES.includes('BRING IT ON!'));
  const next = nextBattleCry(0.5, BATTLE_CRIES[0]);
  assert.ok(BATTLE_CRIES.includes(next));
  assert.notEqual(next, BATTLE_CRIES[0]);
  assert.ok(BATTLE_CRIES.every((s) => s.length <= 45));
});

test('normal battle remains exactly 60 seconds, bonus is only earned from extra maths', () => {
  assert.equal(SIEGE_DURATION_SEC, 60);
  let gate = defaultTrainingGate();
  assert.equal(bonusSiegeSeconds(gate), 0);
  gate = recordTrainingQuestions(gate, 10, 1).gate;
  assert.equal(bonusSiegeSeconds(gate), 0);
  gate = recordTrainingQuestions(gate, 5, 1).gate;
  assert.equal(bonusSiegeSeconds(gate), 15);
  gate = recordTrainingQuestions(gate, 5, 0).gate;
  assert.equal(bonusSiegeSeconds(gate), 30);
  assert.equal(bonusSiegeSeconds(normalizeTrainingGate(JSON.parse(JSON.stringify(gate)))), 30);
});
