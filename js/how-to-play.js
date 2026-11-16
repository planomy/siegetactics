import { MAP_PASSES_REQUIRED, MAP_SEASONS } from './map-progress.js?v=20261115h3';
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
      'Every right answer charges Granny’s defences. You need 20 right answers at Levels 1–2, or 30 at Levels 3–6. Press RANDOM MISSION for a mix, or tap any topic card.',
      'Watch the invasion strip and the radar as the horde closes in. When defences are charged, hit the red DEFEND GRANNY on the radar whenever you’re ready — you don’t have to finish the set first.',
      'After the bar is full you can keep answering for bonus siege coins, scout zaps, and extra battle time — Zap Scouts on the war chest is optional.',
    ],
  },
  {
    icon: '🛡️',
    q: 'How do I win a battle?',
    a: [
      'Tap a turret, then tap an empty square on the lawn to build it. Turrets shoot aliens on their own.',
      'Survive the full battle without too many aliens getting past. The fewer that leak through, the better your result.',
    ],
  },
  {
    icon: '🌿',
    q: 'How do mazes work?',
    a: [
      'Aliens walk around everything you build. Use cheap HEDGES to make a long, twisty maze, and put turrets beside it. The longer their walk, the more you blast!',
      'The dotted line shows where they will walk. While you hold a turret, a blue line shows the new route.',
      'You can never block them in completely. They always need a way to the porch.',
      'Changed your mind? Tap a hedge or turret on the lawn, then REMOVE. You get half its cost back (all of it if it was still being built).',
      'Watch out: new gates open as the battle goes on, Raiders FLY over hedges, and Bruisers smash them!',
    ],
  },
  {
    icon: '💎',
    q: 'How do I get Alien Crystals?',
    a: [
      'Fully charge Granny’s defences.',
      'Do a Random mission AND a topic card in the same charge — MIX IT UP!',
      'Score 80% or better on a Maths Quest.',
      'Defeat the first big boss alien in a battle. It drops a crystal!',
    ],
  },
  {
    icon: '⬆️',
    q: 'What do crystals do?',
    a: [
      'Spend them in the Armory to upgrade a turret. 1 crystal takes it to level 2, then 2 more take it to level 3.',
      'Upgraded turrets hit harder, reach further, fire faster and glow so everyone can see them.',
      'Your crystals sit in your Crystal Vault until you spend them. Collecting more upgrades the vault to Bronze, Silver, Gold and Legendary, and spending never downgrades it.',
    ],
  },
  {
    icon: '⚡',
    q: 'What does XP get me?',
    a: [
      'Forge XP unlocks new turrets in the Armory, and you keep them forever.',
      'Correct answers earn XP. Pick the level that suits you: harder levels add a small bonus, up to +25% at Level 6.',
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
    icon: '🧰',
    q: 'What is Granny’s Gear?',
    a: [
      'Open the Armory and tap GRANNY’S GEAR. Each item is bought once with Alien Crystals and works in every siege after that.',
      'Gear like the Reinforced Porch, the Coin Purse and Mega Cupcakes makes your defence stronger. Save up for the Double Batch!',
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
    icon: '🛡️',
    q: 'What are the shields on the topic cards?',
    a: [
      'Each topic shows six shields — one for difficulty Levels 1 to 6.',
      'Clear that topic at 100% on a level to light its shield. Soft path: earn Level 1 on all ten topics. Bragging rights: fill Levels 2 through 6 as well.',
      'Random missions don’t count towards shields. Topic drills and Maths Quest do.',
    ],
  },
  {
    icon: '🔥',
    q: 'What is the Hot Topic?',
    a: [
      'One topic is hot each day and pays bonus rewards for right answers.',
      'Come back tomorrow for a new one!',
    ],
  },
  {
    icon: '🔥',
    q: 'What is my streak?',
    a: [
      'Get 10 maths questions right in a day to keep your streak going. Tap the flame to see how many more you need today.',
      'Day 3, 7, 14 and 30 pay Alien Crystals. Every 7 days you earn a streak shield, which saves your streak if you miss a day.',
    ],
  },
  {
    icon: '🎯',
    q: 'What are daily challenges?',
    a: [
      'Three new goals every day. Each one pays bonus XP.',
      'Finish all three to open Granny’s chest for an Alien Crystal!',
    ],
  },
  {
    icon: '🍀',
    q: 'What is a lucky drop?',
    a: ['Sometimes a right answer drops a surprise: bonus XP, or even an Alien Crystal. The more you answer, the more chances you get!'],
  },
  {
    icon: '🏆',
    q: 'How do I get trophies and titles?',
    a: [
      'Tap your rank badge at the top, then TROPHIES. Each trophy is a feat, like winning without any aliens getting through.',
      'Every trophy unlocks a title. Tap it to wear it under your rank so everyone can see!',
    ],
  },
  {
    icon: '🤝',
    q: 'How do I challenge a friend?',
    a: [
      'After a siege you get a code like GRAN-7Q4K. Give it to a friend.',
      'They tap their rank badge, choose CHALLENGE and type it in. Their next siege is the same battle. Can they beat your score?',
    ],
  },
  {
    icon: '⏱️',
    q: 'Can I get more time in a battle?',
    a: [
      'Yes! Keep answering after defences are charged. Extra right answers can add bonus siege time and fill the war chest.',
    ],
  },
  {
    icon: '🗺️',
    q: 'What is the Alien Homeland map?',
    a: [
      'Tap ALIEN HOMELAND under your Crystal Vault to see it. Every topic is one sector on the nav chart.',
      `There are three HQ seasons. Season 1 needs ${MAP_PASSES_REQUIRED} passes per topic at ${MAP_SEASONS[0].label}+ to unlock Warp and Doompickle Level 1.`,
      `Come home for Season 2 (${MAP_SEASONS[1].label}+) to open Level 2, then Season 3 (${MAP_SEASONS[2].label}) for Level 3. A miss just means try that drill again — only clean passes count.`,
      'Doompickle runs are forced Level 1 → 2 → 3 — you can’t pick an easier completed level again once you’ve moved on.',
      'Random missions don’t count towards the map. Level shields on the topic cards are separate — see “What are the shields on the topic cards?”',
    ],
  },
];

/**
 * @param {HTMLElement} host
 * @param {{ onBack: () => void, onReplayTips?: () => void }} opts
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
      <div class="howto-buttons">
        ${opts.onReplayTips ? '<button type="button" class="btn howto-tips" id="howto-tips">SHOW TIPS AGAIN</button>' : ''}
        <button type="button" class="btn btn-primary howto-done" id="howto-done">GOT IT</button>
      </div>
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
  if (opts.onReplayTips) host.querySelector('#howto-tips')?.addEventListener('click', opts.onReplayTips);
}
