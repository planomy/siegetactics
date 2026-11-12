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

test('new players begin with ten questions to earn their siege', () => {
  const gate = defaultTrainingGate();
  assert.equal(gateProgress(gate).done, 0);
  assert.equal(gateProgress(gate).total, 10);
  assert.equal(isGateOpen(gate), false);
});

test('a completed ten-question maths activity unlocks a siege', () => {
  const result = recordTrainingQuestions(defaultTrainingGate(), 10, 0.8);
  assert.equal(result.added, 10);
  assert.equal(isGateOpen(result.gate), true);
  assert.equal(result.gate.bonusSiegeCoins, 20);
});

test('one place-value forge contributes one question', () => {
  const result = recordTrainingQuestions(defaultTrainingGate(), 1, 1);
  assert.equal(result.added, 1);
  assert.equal(gateProgress(result.gate).pct, 0.1);
  assert.equal(isGateOpen(result.gate), false);
});

test('extra maths is recorded after the first ten and the coin bonus stops at 25', () => {
  const first = recordTrainingQuestions(defaultTrainingGate(), 6, 1).gate;
  const second = recordTrainingQuestions(first, 10, 1);
  assert.equal(second.added, 10);
  assert.equal(second.gate.questionsDone, 16);
  assert.equal(second.gate.bonusSiegeCoins, 25);
  assert.equal(bonusSiegeSeconds(second.gate), 15);
});

test('incorrect answers do not block the fight, but cannot earn bonus coins', () => {
  const result = recordTrainingQuestions(defaultTrainingGate(), 10, 0);
  assert.equal(isGateOpen(result.gate), true);
  assert.equal(result.gate.bonusSiegeCoins, 0);
});

test('extra questions earn time but do not create a second siege', () => {
  const ready = recordTrainingQuestions(defaultTrainingGate(), 10, 0.7).gate;
  const extra = recordTrainingQuestions(ready, 10, 1).gate;
  assert.equal(extra.questionsDone, 20);
  assert.equal(bonusSiegeSeconds(extra), 30);
  assert.equal(extra.cycle, ready.cycle);
  const beyond = recordTrainingQuestions(extra, 10, 1);
  assert.equal(beyond.added, 0);
  assert.deepEqual(beyond.gate, extra);
});

test('mixed battle prep credits remaining questions', () => {
  const existing = recordTrainingQuestions(defaultTrainingGate(), 3, 1).gate;
  const completed = markBattlePrepComplete(existing, 0.6);
  assert.equal(completed.questionsDone, 10);
  assert.equal(isGateOpen(completed), true);
  assert.ok(completed.bonusSiegeCoins > 0);
});

test('page reload preserves credited questions, bonuses and prior saved readiness', () => {
  const ready = recordTrainingQuestions(defaultTrainingGate(), 10, 0.9).gate;
  const restored = normalizeTrainingGate(JSON.parse(JSON.stringify(ready)));
  assert.equal(restored.questionsDone, 10);
  assert.equal(restored.bonusSiegeCoins, ready.bonusSiegeCoins);
  assert.equal(isGateOpen(restored), true);
  assert.equal(isGateOpen(normalizeTrainingGate({ battlePrepComplete: true })), true);
});

test('every completed siege resets maths readiness but keeps the cycle count', () => {
  const ready = recordTrainingQuestions(defaultTrainingGate(), 10, 1).gate;
  const reset = resetTrainingGate(ready);
  assert.equal(reset.cycle, 1);
  assert.equal(reset.questionsDone, 0);
  assert.equal(reset.bonusSiegeCoins, 0);
  assert.equal(isGateOpen(reset), false);
});
