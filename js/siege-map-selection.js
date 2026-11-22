export const TOPIC_MAPS = Object.freeze({
  'times-tables': 'birthday',
  'place-value-siege': 'sandcastle',
  'measurement-length': 'flood',
  fractions: 'five-bridges',
  angles: 'birthday-ruckus',
  'mass-capacity': 'crow-war',
  operations: 'junkyard',
  'decimals-percent': 'wedding',
  time: 'vege-craze',
  'maths-quest': 'barby-fest',
});

// Stable order for map IDs in share codes. Append future maps without reordering.
export const SIEGE_MAP_IDS = Object.freeze([
  'birthday', 'sandcastle', 'flood', 'five-bridges', 'birthday-ruckus',
  'crow-war', 'junkyard', 'wedding', 'vege-craze', 'barby-fest',
]);

const params = new URLSearchParams(globalThis.location?.search);
const local = ['localhost', '127.0.0.1', '[::1]'].includes(globalThis.location?.hostname);
export const previewSiegeMap = local && params.get('dev') === 'siege' && SIEGE_MAP_IDS.includes(params.get('map'))
  ? params.get('map') : null;

export let currentSiegeMap = previewSiegeMap;
const listeners = [];

export function onSiegeMapChange(listener) {
  listeners.push(listener);
  listener(currentSiegeMap);
}

export function selectSiegeMap(id) {
  const next = SIEGE_MAP_IDS.includes(id) ? id : null;
  if (currentSiegeMap === next) return;
  currentSiegeMap = next;
  for (const listener of listeners) listener(next);
}

export function mapForSiege(topic, completed) {
  return (Object.hasOwn(TOPIC_MAPS, topic) ? TOPIC_MAPS[topic] : null) ??
    SIEGE_MAP_IDS[Math.max(0, Math.floor(Number(completed) || 0)) % SIEGE_MAP_IDS.length];
}
