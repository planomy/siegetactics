import { MAP_PASSES_REQUIRED } from './map-progress.js';
import { GATE } from './training-gate.js';
import { SIEGE_RANKS } from './siege-ranks.js?v=20261112a2';

/**
 * Questions kids actually ask, each with a short answer that drops down.
 * @typedef {{ icon: string, q: string, a: string[] }} HowToQuestion
 */

/** @type {HowToQuestion[]} */
export const HOW_TO_QUESTIONS = [
  {
    icon: '⚔️',
    q: 'How do I start a battle?',
    a: [
      `Get ${GATE.questionsRequired} maths questions right. Only right answers charge Granny’s defences. Press RANDOM MISSION for a mix, or tap any topic card.`,
      'When the radar says CONTACT, the aliens have landed. Press the big button to defend Granny!',
    ],
  },
  {
    icon: '🛡️',
    q: 'How do I win a battle?',
    a: [
      'Tap a turret, then tap an empty grass square to build it. Turrets shoot aliens on their own.',
      'Survive the full minute without too many aliens getting past. The fewer that leak through, the better your result.',
    ],
  },
  {
    icon: '💎',
    q: 'How do I get Alien Crystals?',
    a: [
      `Finish a ${GATE.questionsRequired}-question mission.`,
      'Score 80% or better on a Maths Quest.',
      'Rank up a maths topic.',
      'Defeat a big boss alien in battle. It drops a crystal!',
    ],
  },
  {
    icon: '⬆️',
    q: 'What do crystals do?',
    a: [
      'Spend them in the Armory to upgrade a turret. 1 crystal takes it to level 2, then 2 more take it to level 3.',
      'Upgraded turrets hit harder, reach further, fire faster and glow so everyone can see them.',
      'Every crystal you ever collect also fills your Crystal Vault. Fill it to reach Bronze, Silver, Gold and Legendary vaults.',
    ],
  },
  {
    icon: '⚡',
    q: 'What does XP get me?',
    a: [
      'Forge XP unlocks new turrets in the Armory, and you keep them forever.',
      'Correct answers earn XP. Higher levels earn more: Level 2 gives 1.5×, Level 3 gives 2× and Level 4 gives 2.5×.',
      'Maths Quest word problems pay the most XP of all.',
      'Coins you do not spend in a battle turn into bonus XP at the end.',
    ],
  },
  {
    icon: '🧁',
    q: 'What is the nuke cache?',
    a: [
      'Every alien you blast fills Granny’s nuke cache. Big bosses and cleared waves fill it faster.',
      'When it is full, hit FIRE NUKES and Granny rains cupcake missiles on every alien!',
    ],
  },
  {
    icon: '🪙',
    q: 'What are siege coins?',
    a: [
      'Coins are for building turrets during a battle. Blasting aliens earns more.',
      'They only last for that battle, and you lose some when an alien gets through.',
    ],
  },
  {
    icon: '🎖️',
    q: 'How do I rank up?',
    a: SIEGE_RANKS.map((rank) => `${rank.name}: ${rank.hint.toLowerCase()}.`),
  },
  {
    icon: '⭐',
    q: 'What are the stars on the topic cards?',
    a: [
      'Every topic has its own rank. Correct answers in that topic push its bar along.',
      'Each new topic rank gives you an Alien Crystal. Every fifth rank also gives bonus Forge XP.',
    ],
  },
  {
    icon: '🔥',
    q: 'What is the Hot Topic?',
    a: [
      'One topic is hot each day. It gives double topic XP, so it ranks up twice as fast.',
      'Come back tomorrow for a new one!',
    ],
  },
  {
    icon: '⏱️',
    q: 'Can I get more time in a battle?',
    a: [
      'Yes! Keep answering after the first ten. 15 questions adds 15 seconds, and 20 questions adds 30 seconds.',
    ],
  },
  {
    icon: '🗺️',
    q: 'What is the interstellar map?',
    a: [
      `Every topic is one piece of the map. Score 80% or better ${MAP_PASSES_REQUIRED} times in a topic to reveal its piece.`,
      'Get 100% on a level to earn a shield for that topic.',
    ],
  },
];

/**
 * @param {HTMLElement} host
 * @param {{ onBack: () => void }} opts
 */
export function initHowToPlay(host, opts) {
  const items = HOW_TO_QUESTIONS.map((item, i) => `
    <details class="howto-q"${i === 0 ? ' open' : ''}>
      <summary><span class="howto-q-icon" aria-hidden="true">${item.icon}</span><span class="howto-q-text">${item.q}</span></summary>
      <ul class="howto-a">${item.a.map((line) => `<li>${line}</li>`).join('')}</ul>
    </details>`).join('');

  host.innerHTML = `
    <div class="howto-panel">
      <h1 class="howto-title" id="howto-modal-title">How to play</h1>
      <div class="howto-list">${items}</div>
      <button type="button" class="btn btn-primary howto-done" id="howto-done">GOT IT</button>
    </div>
  `;

  const all = [...host.querySelectorAll('.howto-q')];
  all.forEach((el) => {
    el.addEventListener('toggle', () => {
      if (!(el instanceof HTMLDetailsElement) || !el.open) return;
      all.forEach((other) => {
        if (other !== el && other instanceof HTMLDetailsElement) other.open = false;
      });
    });
  });
  host.querySelector('#howto-done')?.addEventListener('click', opts.onBack);
}
