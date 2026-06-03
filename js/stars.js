/** Military badge art: assets/badges/badge-1.png … badge-5.png */
export const STAR_COUNT = 5;

/** @param {number} level 1–5 */
export function badgeSrc(level) {
  return `assets/badges/badge-${level}.png`;
}

/** Display names for each badge tier. */
export const STAR_LABELS = [
  'Recruit',
  'Patrol',
  'Defender',
  'Veteran',
  'Marshal',
];

/** One-line criteria shown under results badges. */
export const STAR_HINTS = [
  'Held the line this siege',
  'Cleared wave 1',
  'Survived the full minute',
  'Won with 5 or fewer leaks',
  'Won with 2 or fewer leaks',
];

/**
 * @typedef {Object} SiegeStarStats
 * @property {boolean} won
 * @property {number} leaks
 * @property {number} maxLeaks
 * @property {number} wavesCleared
 */

/**
 * @param {SiegeStarStats} stats
 * @returns {{ stars: number, earned: boolean[], labels: string[], hints: string[] }}
 */
export function computeStars(stats) {
  const earned = [
    true,
    stats.wavesCleared >= 1,
    stats.won,
    stats.won && stats.leaks <= 5,
    stats.won && stats.leaks <= 2,
  ];
  const stars = earned.filter(Boolean).length;
  return { stars, earned, labels: STAR_LABELS, hints: STAR_HINTS };
}

/**
 * @param {HTMLElement} container
 * @param {{ earned: boolean[], labels: string[], hints: string[] }} result
 */
export function renderStarBadges(container, result) {
  container.innerHTML = '';
  for (let i = 0; i < STAR_COUNT; i++) {
    const level = i + 1;
    const slot = document.createElement('div');
    slot.className = 'badge-slot';
    slot.classList.toggle('earned', result.earned[i]);
    slot.title = `${result.labels[i]} — ${result.hints[i]}`;

    const img = document.createElement('img');
    img.className = 'badge-img';
    img.src = badgeSrc(level);
    img.alt = result.labels[i];
    img.width = 72;
    img.height = 72;
    img.loading = 'lazy';

    const fallback = document.createElement('span');
    fallback.className = 'badge-fallback';
    fallback.textContent = String(level);
    fallback.hidden = true;
    img.addEventListener('error', () => {
      img.hidden = true;
      fallback.hidden = false;
    });

    const label = document.createElement('span');
    label.className = 'badge-label';
    label.textContent = result.labels[i];

    slot.append(img, fallback, label);
    container.appendChild(slot);
  }
}
