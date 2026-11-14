import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GATE,
  defaultTrainingGate,
  normalizeTrainingGate,
  isGateOpen,
  gateProgress,
  recordTrainingQuestions,
  markBattlePrepComplete,
  resetTrainingGate,
  bonusSiegeSeconds,
} from '../js/training-gate.js';

test('new players need a full charge of 30 to earn their siege', () => {
  const gate = defaultTrainingGate();
  assert.equal(gateProgress(gate).done, 0);
  assert.equal(gateProgress(gate).total, 30);
  assert.equal(isGateOpen(gate), false);
});

test('a full charge unlocks a siege and fills the coin bonus with accuracy', () => {
  const result = recordTrainingQuestions(defaultTrainingGate(), 30, 0.8);
  assert.equal(result.added, 30);
  assert.equal(isGateOpen(result.gate), true);
  assert.equal(result.gate.bonusSiegeCoins, 32);
});

test('one answer moves the charge a thirtieth of the way', () => {
  const result = recordTrainingQuestions(defaultTrainingGate(), 1, 1);
  assert.equal(result.added, 1);
  assert.equal(gateProgress(result.gate).pct, 1 / 30);
  assert.equal(isGateOpen(result.gate), false);
});

test('half charges from younger levels add up exactly', () => {
  let gate = defaultTrainingGate();
  for (let i = 0; i < 3; i++) gate = recordTrainingQuestions(gate, 1.5, 1).gate;
  assert.equal(gate.questionsDone, 4.5);
  const restored = normalizeTrainingGate(JSON.parse(JSON.stringify(gate)));
  assert.equal(restored.questionsDone, 4.5);
});

test('extra maths after a full charge is recorded and the coin bonus stops at its cap', () => {
  const first = recordTrainingQuestions(defaultTrainingGate(), 26, 1).gate;
  const second = recordTrainingQuestions(first, 10, 1);
  assert.equal(second.added, 10);
  assert.equal(second.gate.questionsDone, 36);
  assert.equal(second.gate.bonusSiegeCoins, GATE.maxBonusCoins);
  assert.equal(bonusSiegeSeconds(second.gate), 15);
});

test('incorrect answers do not block the fight, but cannot earn bonus coins', () => {
  const result = recordTrainingQuestions(defaultTrainingGate(), 30, 0);
  assert.equal(isGateOpen(result.gate), true);
  assert.equal(result.gate.bonusSiegeCoins, 0);
});

test('extra questions earn time but do not create a second siege', () => {
  const ready = recordTrainingQuestions(defaultTrainingGate(), 30, 0.7).gate;
  const extra = recordTrainingQuestions(ready, 10, 1).gate;
  assert.equal(extra.questionsDone, 40);
  assert.equal(bonusSiegeSeconds(extra), 30);
  assert.equal(extra.cycle, ready.cycle);
  const beyond = recordTrainingQuestions(extra, 10, 1);
  assert.equal(beyond.added, 0);
  assert.deepEqual(beyond.gate, extra);
});

test('mixed battle prep credits remaining questions', () => {
  const existing = recordTrainingQuestions(defaultTrainingGate(), 3, 1).gate;
  const completed = markBattlePrepComplete(existing, 0.6);
  assert.equal(completed.questionsDone, 30);
  assert.equal(isGateOpen(completed), true);
  assert.ok(completed.bonusSiegeCoins > 0);
});

test('page reload preserves credited questions, bonuses and prior saved readiness', () => {
  const ready = recordTrainingQuestions(defaultTrainingGate(), 30, 0.9).gate;
  const restored = normalizeTrainingGate(JSON.parse(JSON.stringify(ready)));
  assert.equal(restored.questionsDone, 30);
  assert.equal(restored.bonusSiegeCoins, ready.bonusSiegeCoins);
  assert.equal(isGateOpen(restored), true);
  assert.equal(isGateOpen(normalizeTrainingGate({ battlePrepComplete: true })), true);
});

test('every completed siege resets maths readiness but keeps the cycle count', () => {
  const ready = recordTrainingQuestions(defaultTrainingGate(), 30, 1).gate;
  const reset = resetTrainingGate(ready);
  assert.equal(reset.cycle, 1);
  assert.equal(reset.questionsDone, 0);
  assert.equal(reset.bonusSiegeCoins, 0);
  assert.equal(reset.mixPaid, false);
  assert.equal(isGateOpen(reset), false);
});
