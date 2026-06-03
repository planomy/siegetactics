/** @typedef {{ siegesCompleted?: number, granddaddySiegeTarget?: number|null, granddaddySeen?: boolean, grannyUnlocked?: boolean }} MetaSave */

/** Roll once: Granddaddy debuts on siege 4, 5, or 6. */
export function ensureGranddaddyTarget(/** @type {MetaSave} */ save) {
  if (save.granddaddySiegeTarget == null) {
    save.granddaddySiegeTarget = 4 + Math.floor(Math.random() * 3);
  }
}

/** @param {MetaSave} save */
export function shouldSpawnGranddaddy(save) {
  ensureGranddaddyTarget(save);
  const target = save.granddaddySiegeTarget ?? 5;
  return !save.granddaddySeen && (save.siegesCompleted ?? 0) >= target - 1;
}

/** @param {MetaSave} save */
export function onGranddaddySpawned(save) {
  if (save.granddaddySeen) return;
  save.granddaddySeen = true;
  save.grannyUnlocked = true;
}

/** @param {MetaSave} save */
export function normalizeMetaSave(save) {
  save.siegesCompleted = save.siegesCompleted ?? 0;
  save.granddaddySeen = save.granddaddySeen ?? false;
  save.grannyUnlocked = save.grannyUnlocked ?? false;
  ensureGranddaddyTarget(save);
}
