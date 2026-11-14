import test from 'node:test';
import assert from 'node:assert/strict';
import { powerStage } from '../js/power-core.js';
import {
  defaultTrainingGate, recordTrainingQuestions, attackStatus,
  gateProgress, normalizeTrainingGate, resetTrainingGate,
  chargeFor, answersForCharge, recordMissionMix, GATE,
} from '../js/training-gate.js';

test('defence artwork moves through meaningful power stages', () => {
  const expected = new Map([
    [0,'offline'], [1,'warming'], [2,'warming'],
    [3,'sparking'], [5,'sparking'], [6,'charged'],
    [8,'charged'], [9,'nearly'], [10,'ready'],
  ]);
  for (const [n,stage] of expected) assert.equal(powerStage(n).id, stage, `after ${n} answers`);
});

test('a siege takes 30 charge: 30 answers at Levels 3–6, 20 at Levels 1–2', () => {
  assert.equal(GATE.questionsRequired, 30);
  assert.equal(answersForCharge(30, 4), 30);
  assert.equal(answersForCharge(30, 2), 20);
  let gate = defaultTrainingGate();
  for (let n = 1; n <= 20; n++) gate = recordTrainingQuestions(gate, chargeFor(1), 1).gate;
  assert.equal(gateProgress(gate).open, true);
  assert.ok(gate.bonusSiegeCoins > 0);
});

test('the horde closes in at the 10 and 20 checkpoints', () => {
  let gate = defaultTrainingGate();
  assert.equal(attackStatus(gate).urgency, 'calm');
  gate = recordTrainingQuestions(gate, 10, 1).gate;
  assert.equal(attackStatus(gate).urgency, 'warning');
  assert.equal(attackStatus(gate).stage, 1);
  gate = recordTrainingQuestions(gate, 10, 1).gate;
  assert.equal(attackStatus(gate).urgency, 'critical');
  gate = recordTrainingQuestions(gate, 10, 1).gate;
  assert.equal(attackStatus(gate).urgency, 'now');
});

test('a ready siege from the old ten-answer gate stays ready; partial progress scales up', () => {
  assert.equal(gateProgress(normalizeTrainingGate({ questionsDone: 10, battlePrepComplete: true })).open, true);
  assert.equal(gateProgress(normalizeTrainingGate({ questionsDone: 4 })).done, 12);
});

test('a Random mission plus a topic set in one charge pays the mix bonus once', () => {
  let r = recordMissionMix(defaultTrainingGate(), 'random');
  assert.equal(r.earned, false);
  r = recordMissionMix(r.gate, 'topic');
  assert.equal(r.earned, true);
  assert.equal(recordMissionMix(r.gate, 'topic').earned, false);
});

test('answered questions persist across reload and reset after a siege', () => {
  let gate = defaultTrainingGate();
  for (let i = 0; i < 7; i++) gate = recordTrainingQuestions(gate, 1, 1).gate;
  const restored = normalizeTrainingGate(JSON.parse(JSON.stringify(gate)));
  assert.equal(gateProgress(restored).done, 7);
  const reset = resetTrainingGate(restored);
  assert.equal(gateProgress(reset).done, 0);
  assert.equal(powerStage(reset.questionsDone).id, 'offline');
});

test('the forge squad puts the best owned turret in the centre and two other owned turrets beside it', async () => {
  const { pickForgeSquad } = await import('../js/power-core.js');
  const owned = ['granny-blaster', 'zap-sprinkler', 'boom-gnome', 'plasma-daisy'];
  const squad = pickForgeSquad(owned, (id) => (id === 'zap-sprinkler' ? 3 : 1), () => 0.5);
  assert.equal(squad.main, 'zap-sprinkler');
  assert.notEqual(squad.left, squad.main);
  assert.notEqual(squad.right, squad.main);
  assert.notEqual(squad.left, squad.right);
  assert.ok(owned.includes(squad.left) && owned.includes(squad.right));
  assert.equal(pickForgeSquad(owned, () => 1).main, 'plasma-daisy');
});
