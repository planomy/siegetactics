import { getGateTopics } from './topics-data.js';

/** @typedef {{ cycle: number, timesTablesDone: string[], topicsDone: string[], unitsDone: Record<string, boolean> }} TrainingGate */

export const GATE = {
  requiredTables: 2,
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
  return repairTrainingGate({
    cycle: typeof g.cycle === 'number' ? g.cycle : 0,
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
}

/** @param {TrainingGate} gate */
export function isGateOpen(gate) {
  const g = repairTrainingGate(gate);
  const modules = getGateTopics();
  const tablesReady = g.timesTablesDone.length >= GATE.requiredTables;
  const modulesReady = modules.every((topic) => g.topicsDone.includes(topic.id));
  return tablesReady && modulesReady;
}

/** @param {TrainingGate} gate */
export function gateProgress(gate) {
  const g = repairTrainingGate(gate);
  const modules = getGateTopics();
  const tables = Math.min(g.timesTablesDone.length, GATE.requiredTables);
  const topics = modules.filter((topic) => g.topicsDone.includes(topic.id)).length;
  const total = GATE.requiredTables + modules.length;
  const done = tables + topics;
  return {
    tables,
    topics,
    total,
    done,
    pct: total > 0 ? done / total : 0,
    open: isGateOpen(gate),
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
  else if (remaining <= 4) urgency = 'warning';

  return {
    ...p,
    remaining,
    urgency,
    meterPct: Math.round(p.pct * 100),
    headline: 'Time until attack',
    countdown: p.open ? 'NOW' : String(remaining),
    subline: p.open
      ? 'Aliens are at the porch — deploy!'
      : remaining === 1
        ? '1 drill left before they hit'
        : `${remaining} drills until the attack`,
  };
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
