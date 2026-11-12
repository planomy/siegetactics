import { getGateTopics } from './topics-data.js';

/** @typedef {{ cycle: number, battlePrepComplete: boolean, questionsDone: number, bonusSiegeCoins: number, timesTablesDone: string[], topicsDone: string[], unitsDone: Record<string, boolean> }} TrainingGate */

export const GATE = {
  requiredTables: 2,
  questionsRequired: 10,
  maxQuestions: 20,
  /** Minimum accuracy (0–1) to count a drill toward pushing the attack back. */
  passAccuracy: 0.6,
};

/** @returns {number} */
export function requiredModuleDrills() {
  return getGateTopics().length;
}

/** @returns {TrainingGate} */
export function defaultTrainingGate() {
  return {
    cycle: 0,
    battlePrepComplete: false,
    questionsDone: 0,
    bonusSiegeCoins: 0,
    timesTablesDone: [],
    topicsDone: [],
    unitsDone: {},
  };
}

/** @param {TrainingGate} gate @returns {TrainingGate} */
export function repairTrainingGate(gate) {
  let topicsDone = [...gate.topicsDone];
  let changed = false;

  for (const topic of getGateTopics()) {
    if (!topic.unitId || !gate.unitsDone[topic.unitId] || topicsDone.includes(topic.id)) continue;
    topicsDone = [...topicsDone, topic.id];
    changed = true;
  }

  return changed ? { ...gate, topicsDone } : gate;
}

/** @param {unknown} raw */
export function normalizeTrainingGate(raw) {
  const base = defaultTrainingGate();
  if (!raw || typeof raw !== 'object') return base;
  const g = /** @type {Record<string, unknown>} */ (raw);
  const normalized = repairTrainingGate({
    cycle: typeof g.cycle === 'number' ? g.cycle : 0,
    battlePrepComplete: Boolean(g.battlePrepComplete),
    questionsDone: Number.isFinite(g.questionsDone) ? Math.max(0, Math.min(GATE.maxQuestions, Math.floor(g.questionsDone))) : (g.battlePrepComplete ? GATE.questionsRequired : 0),
    bonusSiegeCoins: Number.isFinite(g.bonusSiegeCoins) ? Math.max(0, Math.min(25, Math.floor(g.bonusSiegeCoins))) : 0,
    timesTablesDone: Array.isArray(g.timesTablesDone)
      ? g.timesTablesDone.filter((k) => typeof k === 'string')
      : [],
    topicsDone: Array.isArray(g.topicsDone)
      ? g.topicsDone.filter((k) => typeof k === 'string')
      : [],
    unitsDone:
      g.unitsDone && typeof g.unitsDone === 'object'
        ? /** @type {Record<string, boolean>} */ ({ ...g.unitsDone })
        : {},
  });
  const legacyReady =
    normalized.timesTablesDone.length >= GATE.requiredTables &&
    getGateTopics().every((topic) => normalized.topicsDone.includes(topic.id));
  return {
    ...normalized,
    questionsDone: normalized.battlePrepComplete || legacyReady ? Math.max(GATE.questionsRequired, normalized.questionsDone) : normalized.questionsDone,
    battlePrepComplete: normalized.battlePrepComplete || legacyReady || normalized.questionsDone >= GATE.questionsRequired,
  };
}

/** @param {TrainingGate} gate */
export function isGateOpen(gate) {
  const g = repairTrainingGate(gate);
  return Boolean(g.battlePrepComplete || g.questionsDone >= GATE.questionsRequired);
}

/** @param {TrainingGate} gate */
export function gateProgress(gate) {
  const g = repairTrainingGate(gate);
  const open = isGateOpen(g);
  const done = open ? GATE.questionsRequired : Math.min(GATE.questionsRequired, g.questionsDone || 0);
  return {
    tables: g.timesTablesDone.length,
    topics: g.topicsDone.length,
    total: GATE.questionsRequired,
    done,
    pct: done / GATE.questionsRequired,
    open,
  };
}

/** @param {TrainingGate} gate */
export function attackStatus(gate) {
  const p = gateProgress(gate);
  const remaining = p.total - p.done;
  /** @type {'now'|'critical'|'warning'|'calm'} */
  let urgency = 'calm';
  if (p.open) urgency = 'now';
  else if (remaining <= 2) urgency = 'critical';
  else if (remaining <= 5) urgency = 'warning';

  return {
    ...p,
    remaining,
    urgency,
    meterPct: Math.round(p.pct * 100),
    headline: 'Time until attack',
    countdown: p.open ? 'NOW' : String(remaining),
    subline: p.open
      ? 'Aliens are at the porch — deploy!'
      : 'Complete 10 maths questions to launch the siege',
  };
}

/**
 * Extra training unlocks an optional bonus assault. The basic siege still
 * becomes available after ten questions, and a player may stop at any time.
 * @param {TrainingGate} gate
 */
export function bonusSiegeSeconds(gate) {
  const answered = Math.max(0, Math.min(GATE.maxQuestions, gate.questionsDone || 0));
  return answered >= 20 ? 30 : answered >= 15 ? 15 : 0;
}

/**
 * Save every answered maths question, up to twenty per siege.
 * Only the first ten build the initial coin bonus; answers 11–20
 * can earn optional battle time but never block a normal siege.
 * @param {TrainingGate} gate
 * @param {number} answered
 * @param {number} accuracy 0–1
 */
export function recordTrainingQuestions(gate, answered, accuracy) {
  const current = Math.max(0, Math.min(GATE.maxQuestions, gate.questionsDone || 0));
  const safeAnswered = Math.max(0, Math.floor(Number(answered) || 0));
  const added = Math.min(safeAnswered, GATE.maxQuestions - current);
  if (added === 0) return { added: 0, gate };
  const safeAccuracy = Math.max(0, Math.min(1, Number(accuracy) || 0));
  const done = current + added;
  const bonusEligible = Math.max(0, Math.min(added, GATE.questionsRequired - current));
  const bonusSiegeCoins = Math.min(25, (gate.bonusSiegeCoins || 0) + Math.round(bonusEligible * 2.5 * safeAccuracy));
  return {
    added,
    gate: {
      ...gate,
      questionsDone: done,
      bonusSiegeCoins,
      battlePrepComplete: done >= GATE.questionsRequired,
    },
  };
}

/** Completes only the remaining basic maths questions, not bonus questions. */
export function markBattlePrepComplete(gate, accuracy = 0) {
  return recordTrainingQuestions(gate, Math.max(0, GATE.questionsRequired - (gate.questionsDone || 0)), accuracy).gate;
}

/** @param {number} table 0 = mixed, 2–12 */
export function tableKey(table) {
  return table === 0 ? 'mixed' : String(table);
}

/** @param {string} key */
export function tableLabel(key) {
  return key === 'mixed' ? 'Mixed' : `×${key}`;
}

/**
 * @param {TrainingGate} gate
 * @param {number} table
 * @param {number} accuracy 0–1
 * @returns {{ added: boolean, gate: TrainingGate, reason?: string }}
 */
export function recordTimesTable(gate, table, accuracy) {
  const key = tableKey(table);
  if (accuracy < GATE.passAccuracy) {
    return { added: false, gate, reason: 'Need 60%+ to push the attack back.' };
  }
  if (gate.timesTablesDone.includes(key)) {
    return { added: false, gate, reason: 'That table already bought you time this cycle.' };
  }
  if (gate.timesTablesDone.length >= GATE.requiredTables) {
    return { added: false, gate, reason: 'Table drills done — train another module!' };
  }
  return {
    added: true,
    gate: { ...gate, timesTablesDone: [...gate.timesTablesDone, key] },
  };
}

/**
 * @param {TrainingGate} gate
 * @param {string} topicId
 * @param {string} unitId
 * @returns {{ added: boolean, gate: TrainingGate, reason?: string }}
 */
export function recordTopicUnit(gate, topicId, unitId) {
  if (topicId === 'times-tables') {
    return { added: false, gate, reason: 'Times tables tracked separately.' };
  }

  const g = repairTrainingGate(gate);
  const modules = getGateTopics();
  const moduleIds = new Set(modules.map((t) => t.id));
  if (!moduleIds.has(topicId)) {
    return { added: false, gate: g, reason: 'That module does not count toward readiness.' };
  }

  const unitAlreadyDone = Boolean(g.unitsDone[unitId]);
  const topicAlreadyDone = g.topicsDone.includes(topicId);

  if (unitAlreadyDone && topicAlreadyDone) {
    return { added: false, gate: g, reason: 'You already trained that module this cycle.' };
  }

  if (unitAlreadyDone && !topicAlreadyDone) {
    return {
      added: true,
      gate: { ...g, topicsDone: [...g.topicsDone, topicId] },
    };
  }

  const nextUnits = { ...g.unitsDone, [unitId]: true };
  let nextTopics = g.topicsDone;
  if (!topicAlreadyDone) {
    nextTopics = [...g.topicsDone, topicId];
  }
  return {
    added: true,
    gate: { ...g, topicsDone: nextTopics, unitsDone: nextUnits },
  };
}

/** @param {TrainingGate} gate */
export function resetTrainingGate(gate) {
  return {
    ...defaultTrainingGate(),
    cycle: gate.cycle + 1,
  };
}

/** @param {TrainingGate} gate @param {string} unitId */
export function isUnitDone(gate, unitId) {
  return Boolean(gate.unitsDone[unitId]);
}

/** @param {TrainingGate} gate @param {string} topicId */
export function isTopicDone(gate, topicId) {
  return repairTrainingGate(gate).topicsDone.includes(topicId);
}
