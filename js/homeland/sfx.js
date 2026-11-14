/** Small sound player for the Homeland prototype, reusing Granny Boom's levelled sound effects. */

/** @type {Map<string, HTMLAudioElement>} */
const sounds = new Map();
/** @type {Map<string, number>} */
const lastPlayed = new Map();

/** @param {string[]} names */
export function loadSounds(names) {
  for (const name of names) {
    const audio = new Audio(`assets/sounds/${name}.m4a`);
    audio.preload = 'auto';
    sounds.set(name, audio);
  }
}

/**
 * @param {string} name
 * @param {number} [volume]
 * @param {number} [gap] Seconds that must pass before this sound plays again.
 */
export function sfx(name, volume = 0.5, gap = 0) {
  const base = sounds.get(name);
  if (!base) return;
  const now = performance.now();
  if (gap && now - (lastPlayed.get(name) ?? -Infinity) < gap * 1000) return;
  lastPlayed.set(name, now);
  const audio = /** @type {HTMLAudioElement} */ (base.cloneNode());
  audio.volume = Math.max(0, Math.min(1, volume));
  audio.play().catch(() => {});
}
