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
    id: 'loop',
    step: '1',
    title: 'The mission loop',
    image: `${HOWTO_IMAGE_BASE}/01-mission-loop.png`,
    fallback: 'assets/splash.png',
    summary: 'Train at Home HQ, then hold the line when the aliens attack.',
    points: [
      'Drill maths modules to push back the invasion and earn Forge XP.',
      'When deployment readiness reaches 100%, you are cleared to siege.',
      'Survive the wave, then review results — replay training and fight again.',
    ],
  },
  {
    id: 'training',
    step: '2',
    title: 'Training modules',
    image: `${HOWTO_IMAGE_BASE}/02-training-modules.png`,
    fallback: 'assets/topics/times-tables.png',
    summary: 'Six modules on Home HQ — each teaches a different maths skill.',
    points: [
      'Pick a module card to start a 10-question drill at your chosen level (1, 2, or 3).',
      'Higher levels pay more Forge XP per correct answer.',
      'Times Tables drills count toward deployment — finish 2 different tables at 60%+ accuracy.',
      'Other modules must be completed once each to clear the prep checklist.',
    ],
  },
  {
    id: 'currencies',
    step: '3',
    title: 'Forge XP vs siege coins',
    image: `${HOWTO_IMAGE_BASE}/03-forge-xp-coins.png`,
    fallback: 'assets/ui/topbar-shop.png',
    summary: 'Two currencies — one permanent, one only for the current fight.',
    points: [
      `${ECONOMY.forgeXpLabel} is permanent. Earn it from training and sieges. Spend it in the Armory to unlock turrets forever.`,
      `${ECONOMY.siegeCoinsLabel} last one fight only. You get a starting budget, earn more from kills and wave clears, and spend them placing turrets.`,
      `Unspent ${ECONOMY.siegeCoinsLabel.toLowerCase()} at the end bank into bonus ${ECONOMY.forgeXpLabel} (up to ${ECONOMY.bankMaxBonus} XP).`,
      'Field Command tracks your best banked coins — try to save some without losing the lawn!',
    ],
  },
  {
    id: 'readiness',
    step: '4',
    title: 'Deployment readiness',
    image: `${HOWTO_IMAGE_BASE}/04-deployment-readiness.png`,
    fallback: 'assets/home/hero-village.png',
    summary: 'The invasion countdown in the hero banner shrinks as you complete prep checks.',
    points: [
      `Complete ${GATE.requiredTables} times-table drills plus every gate module on the checklist.`,
      'Field Command shows each prep item — red dot means still to do, green means verified.',
      'At 100% readiness the banner turns green and you can launch the siege.',
      'After each siege, training prep resets — drill again before the next attack.',
    ],
  },
  {
    id: 'shields',
    step: '5',
    title: 'Level shields',
    image: `${HOWTO_IMAGE_BASE}/05-level-shields.png`,
    fallback: 'assets/badges/level-shield.png',
    summary: 'Perfect runs earn shields beside each module card.',
    points: [
      'Score 100% on a module at Level 1, 2, or 3 to earn that level’s shield.',
      'Shields are bragging rights and show mastery — Field Command totals them (18 max).',
      'First-time perfect clears also grant a one-time Forge XP bonus.',
      'Granny may recommend a higher level once you have shields at the level below.',
    ],
  },
  {
    id: 'map',
    step: '6',
    title: 'Nav chart',
    image: `${HOWTO_IMAGE_BASE}/06-nav-chart.png`,
    fallback: 'assets/home/interstellar-map.jpg',
    summary: 'Chart the galaxy by passing modules repeatedly.',
    points: [
      `Score 80%+ on a module drill to count one pass toward that sector (${MAP_PASSES_REQUIRED} passes needed).`,
      'Progress shows beside the shields on each module card (e.g. 3/10).',
      'After 10 passes, that sector on the nav chart is revealed — six sectors total.',
      'Chart all six to unlock the home planet route on the map at the bottom of Home HQ.',
    ],
  },
  {
    id: 'armory',
    step: '7',
    title: 'Armory',
    image: `${HOWTO_IMAGE_BASE}/07-armory.png`,
    fallback: 'assets/turrets/granny-blaster.png',
    summary: 'Unlock turrets permanently with Forge XP.',
    points: [
      'Open the shop icon in the top bar anytime from Home HQ.',
      'Spend Forge XP once to add a turret to your arsenal — it stays unlocked forever.',
      'Unlocking does not place turrets on the field; you still need siege coins during a fight.',
      'The Armory glows when you have enough XP for a new unlock.',
    ],
  },
  {
    id: 'siege',
    step: '8',
    title: 'During a siege',
    image: `${HOWTO_IMAGE_BASE}/08-siege-field.png`,
    fallback: 'assets/field.png',
    summary: 'Place turrets, survive 60 seconds, and don’t let aliens leak through.',
    points: [
      'The lawn appears right away. A wave progress bar fills at the top — place turrets while it runs.',
      'Bigger turrets take longer to build once placed. The shop stays open during the fight.',
      'Earn siege coins from kills and wave bonuses. Leaks cost coins and count toward defeat (5 max).',
      'Survive 60 seconds on the clock. The next wave starts automatically when the bar fills again.',
    ],
  },
  {
    id: 'nuke',
    step: '9',
    title: 'Nuke cache',
    image: `${HOWTO_IMAGE_BASE}/09-nuke-cache.png`,
    fallback: 'assets/cupcake-missile.png',
    summary: 'Granny’s cupcake missiles charge as you blast aliens.',
    points: [
      'The nuke cache fills from enemy kills during a siege.',
      'When full, tap to launch homing cupcake missiles — huge area damage!',
      'You’ll hear a siren when the cache is ready. Use it before the wave ends.',
      'Unlock Granny’s nuke pose after meeting the meta progression target.',
    ],
  },
  {
    id: 'results',
    step: '10',
    title: 'After the fight',
    image: `${HOWTO_IMAGE_BASE}/10-results.png`,
    fallback: 'assets/badges/badge-5.png',
    summary: 'Stars, stats, and what to do next.',
    points: [
      'Earn up to 5 stars based on leaks and waves cleared.',
      'Peak eliminations and best banked coins update Field Command on Home HQ.',
      'Win or lose, you gain Forge XP — wins pay more, and banked coins add a bonus.',
      'Head back to training, unlock gear, and chart more map sectors before the next siege.',
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
            <h1 class="howto-title">How to play</h1>
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
