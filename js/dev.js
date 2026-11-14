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
  skipToSiege: devFlag('siege', 'maze', 'lanes'),
  /** The old six-lane battlefield (`?dev=lanes`); the open-lawn maze is the default. */
  lanes: devFlag('lanes'),
  fastWave: devFlag('fast'),
  extraBudget: params.has('dev') ? 200 : 0,
  unlockAll: params.has('dev'),
  /** Force a rare mothership into the next battle (`?dev=siege&rare=cousin-zorg`). */
  rare: params.has('dev') ? params.get('rare') : null,
};
