import { ECONOMY } from './economy.js';
import { MAP_PASSES_REQUIRED } from './map-progress.js';
import { GATE } from './training-gate.js';

/** Drop custom art in assets/howto/ using these filenames (see assets/howto/README.txt). */
export const HOWTO_IMAGE_BASE = 'assets/howto';

/**
 * @typedef {{
 *   id: string,
 *   step: string,
 *   title: string,
 *   image: string,
 *   fallback: string,
 *   summary: string,
 *   points: string[],
 * }} HowToPage
 */

/** @type {HowToPage[]} */
export const HOW_TO_PAGES = [
  {
    id: 'maths',
    step: '1',
    title: 'Do the maths',
    image: `${HOWTO_IMAGE_BASE}/02-training-modules.png`,
    fallback: 'assets/topics/times-tables.png',
    summary: 'Complete 10 maths questions to earn a battle against the aliens.',
    points: [
      'Hit START 10-QUESTION MISSION for a quick mixed challenge.',
      'Or choose any topic below. A finished 10-question drill counts just as much.',
      'Correct answers earn Forge XP. Strong accuracy earns bonus siege coins.',
    ],
  },
  {
    id: 'defend',
    step: '2',
    title: 'Defend Granny',
    image: `${HOWTO_IMAGE_BASE}/08-siege-field.png`,
    fallback: 'assets/field.png',
    summary: 'Choose turrets, place them on the grass and stop the aliens getting through.',
    points: [
      'On your first battle, Granny Blaster is already selected. Tap an empty grass square to build it.',
      'The first wave begins after you place that turret; later battles start automatically.',
      'Use siege coins to place more turrets as the fight continues. Coins last for this siege only.',
    ],
  },
  {
    id: 'return',
    step: '3',
    title: 'Keep getting stronger',
    image: `${HOWTO_IMAGE_BASE}/10-results.png`,
    fallback: 'assets/badges/badge-5.png',
    summary: 'Your progress carries forward. Every maths mission builds a stronger defence.',
    points: [
      'Keep your Forge XP after the battle and use it in the Armory to unlock turrets permanently.',
      'Collect shields for perfect maths runs and reveal pieces of the interstellar map.',
      'After a siege, complete another ten questions to battle again. Aim for a new personal best!',
    ],
  },
];

/**
 * @param {HTMLElement} host
 * @param {{ onBack: () => void, initialPage?: number }} opts
 */
export function initHowToPlay(host, opts) {
  let pageIndex = Math.max(0, Math.min(HOW_TO_PAGES.length - 1, opts.initialPage ?? 0));

  const render = () => {
    const page = HOW_TO_PAGES[pageIndex];
    const tabs = HOW_TO_PAGES.map(
      (p, i) =>
        `<button type="button" class="howto-tab${i === pageIndex ? ' is-active' : ''}" data-page="${i}" aria-label="${p.title}" title="${p.title}"><span>${p.step}</span></button>`
    ).join('');
    const points = page.points.map((line) => `<li>${line}</li>`).join('');

    host.innerHTML = `
      <div class="howto-panel">
        <header class="howto-header">
          <button type="button" class="btn btn-ghost btn-sm howto-back" id="howto-back">← Back</button>
          <div class="howto-header-main">
            <h1 class="howto-title" id="howto-modal-title">How to play</h1>
            <p class="howto-counter">${pageIndex + 1} / ${HOW_TO_PAGES.length}</p>
          </div>
        </header>

        <nav class="howto-tabs" aria-label="How to play sections">${tabs}</nav>

        <article class="howto-page" aria-labelledby="howto-page-title">
          <div class="howto-visual">
            <img
              class="howto-img"
              src="${page.image}"
              data-fallback="${page.fallback}"
              alt=""
              loading="lazy"
            />
          </div>
          <div class="howto-copy">
            <p class="howto-step-label">Step ${page.step}</p>
            <h2 class="howto-page-title" id="howto-page-title">${page.title}</h2>
            <p class="howto-summary">${page.summary}</p>
            <ul class="howto-points">${points}</ul>
          </div>
        </article>

        <footer class="howto-footer">
          <button type="button" class="btn btn-ghost howto-nav-btn" id="howto-prev"${pageIndex === 0 ? ' disabled' : ''}>Previous</button>
          <button type="button" class="btn btn-primary howto-nav-btn" id="howto-next">
            ${pageIndex >= HOW_TO_PAGES.length - 1 ? 'Done' : 'Next'}
          </button>
        </footer>
      </div>
    `;

    host.querySelector('#howto-back')?.addEventListener('click', opts.onBack);
    host.querySelector('#howto-prev')?.addEventListener('click', () => {
      if (pageIndex > 0) {
        pageIndex -= 1;
        render();
      }
    });
    host.querySelector('#howto-next')?.addEventListener('click', () => {
      if (pageIndex < HOW_TO_PAGES.length - 1) {
        pageIndex += 1;
        render();
      } else {
        opts.onBack();
      }
    });
    host.querySelectorAll('[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const n = Number(btn.getAttribute('data-page'));
        if (Number.isFinite(n) && n >= 0 && n < HOW_TO_PAGES.length) {
          pageIndex = n;
          render();
        }
      });
    });

    host.querySelectorAll('.howto-img').forEach((img) => {
      if (!(img instanceof HTMLImageElement)) return;
      img.addEventListener('error', () => {
        const fallback = img.getAttribute('data-fallback');
        if (fallback && img.src !== new URL(fallback, window.location.href).href) {
          img.src = fallback;
        }
      }, { once: true });
    });
  };

  render();
}
