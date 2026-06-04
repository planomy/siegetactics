const params = new URLSearchParams(window.location.search);
const devParam = params.get('dev');

/** @param {...string} values */
function devFlag(...values) {
  return params.has('dev') && values.some((v) => devParam === v || params.has(v));
}

export const DEV = {
  enabled: params.has('dev'),
  /** Skip forge puzzle and training gate when launching a siege. */
  skipForge: params.has('dev'),
  /** Load straight into the siege screen (`?dev=siege` or `?dev&siege`). */
  skipToSiege: devFlag('siege'),
  fastWave: devFlag('fast'),
  extraBudget: params.has('dev') ? 200 : 0,
  unlockAll: params.has('dev'),
};
