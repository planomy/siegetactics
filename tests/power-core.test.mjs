import test from 'node:test';
import assert from 'node:assert/strict';
import { powerStage } from '../js/power-core.js';
import {
  defaultTrainingGate, recordTrainingQuestions, attackStatus,
  gateProgress, normalizeTrainingGate, resetTrainingGate,
} from '../js/training-gate.js';

test('defence artwork moves through meaningful power stages', () => {
  const expected = new Map([
    [0,'offline'], [1,'warming'], [2,'warming'],
    [3,'sparking'], [5,'sparking'], [6,'charged'],
    [8,'charged'], [9,'nearly'], [10,'ready'],
  ]);
  for (const [n,stage] of expected) assert.equal(powerStage(n).id, stage, `after ${n} answers`);
});

test('each maths answer moves the radar and charge forward, including mistakes', () => {
  let gate = defaultTrainingGate();
  for (let n = 1; n <= 10; n++) {
    const right = n !== 3 && n !== 8;
    const update = recordTrainingQuestions(gate, 1, right ? 1 : 0);
    assert.equal(update.added, 1);
    gate = update.gate;
    assert.equal(gateProgress(gate).done, n);
  }
  assert.equal(gateProgress(gate).open, true);
  assert.equal(powerStage(gate.questionsDone).id, 'ready');
  assert.ok(gate.bonusSiegeCoins > 0);
});

test('warning starts halfway and switches to critical near impact', () => {
  let gate = defaultTrainingGate();
  assert.equal(attackStatus(gate).urgency, 'calm');
  for (let n = 0; n < 5; n++) gate = recordTrainingQuestions(gate, 1, 1).gate;
  assert.equal(attackStatus(gate).urgency, 'warning');
  for (let n = 0; n < 3; n++) gate = recordTrainingQuestions(gate, 1, 1).gate;
  assert.equal(attackStatus(gate).urgency, 'critical');
  for (let n = 0; n < 2; n++) gate = recordTrainingQuestions(gate, 1, 1).gate;
  assert.equal(attackStatus(gate).urgency, 'now');
});

test('answered questions persist across reload and reset after a siege', () => {
  let gate = defaultTrainingGate();
  for (let i = 0; i < 7; i++) gate = recordTrainingQuestions(gate, 1, 1).gate;
  const restored = normalizeTrainingGate(JSON.parse(JSON.stringify(gate)));
  assert.equal(gateProgress(restored).done, 7);
  assert.equal(powerStage(restored.questionsDone).id, 'charged');
  const reset = resetTrainingGate(restored);
  assert.equal(gateProgress(reset).done, 0);
  assert.equal(powerStage(reset.questionsDone).id, 'offline');
});
