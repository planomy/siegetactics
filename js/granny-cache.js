/** In-run nuke cupcake cache economy (separate from mission budget). */
export const GRANNY_CACHE = {
  cost: 50,
  killPoints: 1,
  bossKillPoints: 5,
  waveClearPoints: 12,
  forgeBonusPoints: 15,
};

/** @param {number} progress @param {number} [cost] */
export function cacheFillPercent(progress, cost = GRANNY_CACHE.cost) {
  return Math.min(100, (progress / cost) * 100);
}
