/**
 * The nine regions of the alien homeworld, in story order. Each has its own scenery, colours,
 * alien mix and boss; beating a region's boss unlocks the next one. The last is the Supreme
 * Leader's golden palace.
 */

/**
 * @typedef {'alien-slime'|'alien-spore'|'alien-virus'|'alien-skull'|'alien-urchin'|'alien-lava'|'alien-egg'|'alien-tentacle'|'alien-eye'|'alien-worm'} ShotKind
 * @typedef {{
 *   name: string, sprite: string, w: number, hp: number, sway: number,
 *   fire: [number, number], volley: [number, number], spread: number, shot: ShotKind, angryShot: ShotKind,
 *   drop: { type: 'swarmer'|'grunt'|'leaper'|'spitter'|'splitter'|'tank', count: number, gap: number },
 *   hint: string, phase?: boolean, rain?: boolean, chill?: boolean,
 * }} BossDef
 * `fire` and `volley` are [calm, angry]: seconds between volleys and shots per volley. `phase` bosses
 * fade in and out and can only be hurt while solid; `rain` bosses drop fire all over the ground;
 * `chill` shots slow Granny down.
 * @typedef {{
 *   sky: [string, string, string], mountains: [string, string], ground: [string, string, string], rim: string,
 *   decalTint?: string,
 * }} Palette
 * @typedef {{
 *   key: string, title: string, scenery: string | null, intro: string, outro: string, palette: Palette,
 *   mix: Partial<Record<'swarmer'|'grunt'|'leaper'|'spitter'|'splitter'|'tank', number>>, hordeSwarm: number,
 *   tough: number, pace: number, boss: BossDef,
 *   portraits?: { src: string, caption: string }[], backdrop?: string, skyline?: string, frame?: string,
 *   dim?: number, monsters?: string, logo?: string,
 * }} Region
 * `portraits` replace the boss sprite on the story card with big painted pictures. A `backdrop`
 * makes the region indoors: the painting is the far wall and the floor meets it in a straight line
 * about 58% of the way down the screen, so the wall fills the top part and the floor the rest.
 * A `skyline` is a distant landscape on a transparent sky that stands on the horizon in place of
 * the mountains. A `frame` is a 16:9 painting with a see-through arch in the middle, laid over the
 * whole battlefield along the top and sides of the screen. `dim` (0 to about 0.5) shades the
 * backdrop so the distance sits back behind the frame and the aliens stand out against it.
 * `monsters` is a folder holding the region's own swarmer, grunt, leaper, spitter and splitter
 * sprites (TYPE.webp); without it the region uses the standard aliens. A `logo` is a 16:9
 * painting of the region with its name painted on as a game logo, the centrepiece of its story card.
 */

/** @type {Region[]} */
export const REGIONS = [
  {
    key: 'landing',
    title: 'Landing Zone',
    scenery: null,
    logo: 'assets/homeland/slides/landing-title.webp',
    intro: 'The ten map pieces led here: Doompickle, the aliens\' home planet! Granny\'s scooter skids down into their landing zone, and the welcome party is NOT friendly.',
    outro: 'The mothership limps away over the hills towards a forest of glowing mushrooms. After it, Granny!',
    palette: { sky: ['#0d0322', '#4a1258', '#ff7a3c'], mountains: ['#7a2a6e', '#541a4c'], ground: ['#d8642e', '#a8401f', '#4a160e'], rim: '#ff9a4a' },
    mix: {},
    hordeSwarm: 0.55,
    tough: 1,
    pace: 1,
    boss: {
      name: 'Mothership', sprite: 'assets/enemies/mothership.png', w: 3, hp: 450, sway: 0.45,
      fire: [2.4, 1.6], volley: [3, 5], spread: 0.5, shot: 'alien-spore', angryShot: 'alien-virus',
      drop: { type: 'swarmer', count: 4, gap: 6 }, hint: 'Line up under it and blast!',
    },
  },
  {
    key: 'glowshroom',
    title: 'Glowshroom Forest',
    scenery: 'shrooms',
    monsters: 'assets/enemies/glowshroom',
    logo: 'assets/homeland/slides/glowshroom-title.webp',
    backdrop: 'assets/homeland/sky/glowshroom-forest.webp',
    frame: 'assets/homeland/frames/glowshroom-frame.webp?v=3',
    dim: 0.25,
    intro: 'Night falls over a forest of giant glowing mushrooms. Leapers bounce between the caps, and something ghostly is hiding in the dark…',
    outro: 'The Spore Saucer pops like a puffball. A trail of green slime leads off towards the swamp.',
    palette: { sky: ['#02010a', '#1a0a3a', '#4a2a9a'], mountains: ['#2a1a5a', '#1a0f3a'], ground: ['#6a4aa8', '#3a2270', '#120826'], rim: '#c78bff' },
    mix: { leaper: 2.2, swarmer: 1.2 },
    hordeSwarm: 0.5,
    tough: 1.08,
    pace: 0.96,
    boss: {
      name: 'Spore Saucer', sprite: 'assets/enemies/bosses/glowshroom.webp', w: 3, hp: 520, sway: 0.55,
      fire: [2.2, 1.5], volley: [3, 5], spread: 0.55, shot: 'alien-spore', angryShot: 'alien-skull',
      drop: { type: 'leaper', count: 3, gap: 7 }, hint: 'It hides in its spore cloud. Blast it while you can see it!', phase: true,
    },
  },
  {
    key: 'swamp',
    title: 'Slime Swamp',
    scenery: 'swamp',
    monsters: 'assets/enemies/swamp',
    logo: 'assets/homeland/slides/swamp-title.webp',
    backdrop: 'assets/homeland/sky/swamp-marsh.webp',
    frame: 'assets/homeland/frames/swamp-frame.webp?v=3',
    dim: 0.35,
    intro: 'Squelch! This bubbling swamp is where the aliens breed, and an army of spitters guards it. Keep moving or get gooed!',
    outro: 'The Sludge Saucer sinks into the goo. Beyond the swamp, the ground drops away into a pitch-black chasm…',
    palette: { sky: ['#041008', '#143a24', '#7ab83a'], mountains: ['#1f4a2a', '#12301a'], ground: ['#6a9a2a', '#3a5e1a', '#0e1e08'], rim: '#b8ff5a' },
    mix: { spitter: 3, splitter: 1.4 },
    hordeSwarm: 0.5,
    tough: 1.16,
    pace: 0.93,
    boss: {
      name: 'Sludge Saucer', sprite: 'assets/enemies/bosses/swamp.webp', w: 3, hp: 600, sway: 0.9,
      fire: [1.4, 0.9], volley: [2, 4], spread: 0.7, shot: 'alien-slime', angryShot: 'alien-slime',
      drop: { type: 'spitter', count: 2, gap: 7 }, hint: 'It zips side to side. Stay underneath it!',
    },
  },
  {
    key: 'abyss',
    title: 'The Abyss',
    scenery: 'abyss',
    monsters: 'assets/enemies/abyss',
    logo: 'assets/homeland/slides/abyss-title.webp',
    backdrop: 'assets/homeland/sky/abyss-skeleton.webp',
    frame: 'assets/homeland/frames/abyss-frame.webp?v=3',
    intro: 'Down into the dark. In the Abyss lie the bones of monsters older than the stars, glowing faintly blue… and something HUGE is waking up among them.',
    outro: 'The Skull Saucer crumbles back into the bones. Up out of the dark, clanking and banging echo from a scrapyard ahead.',
    palette: { sky: ['#000004', '#040c24', '#12306a'], mountains: ['#0a1430', '#060a1c'], ground: ['#2a4272', '#162650', '#070c1e'], rim: '#5ae0ff' },
    mix: { tank: 2.4, grunt: 1.3 },
    hordeSwarm: 0.45,
    tough: 1.24,
    pace: 0.92,
    boss: {
      name: 'Skull Saucer', sprite: 'assets/enemies/bosses/abyss.webp', w: 3.6, hp: 720, sway: 0.3,
      fire: [2.6, 1.8], volley: [4, 6], spread: 0.45, shot: 'alien-skull', angryShot: 'alien-tentacle',
      drop: { type: 'grunt', count: 4, gap: 6 }, hint: 'Slow but tough. Keep pounding it!',
    },
  },
  {
    key: 'scrapyard',
    title: 'The Scrapyard',
    scenery: 'scrapyard',
    monsters: 'assets/enemies/scrapyard',
    logo: 'assets/homeland/slides/scrapyard-title.webp',
    backdrop: 'assets/homeland/sky/scrapyard-wreck.webp',
    frame: 'assets/homeland/frames/scrapyard-frame.webp?v=3',
    dim: 0.3,
    intro: 'Mountains of crashed saucers and spare parts: the aliens\' weapons dump. Smash those crystals and grab every crate of ammo you can!',
    outro: 'The Rust Bucket falls apart like an old teapot. The ground ahead is covered in… eggs?',
    palette: { sky: ['#0a0a12', '#2e2230', '#c8642a'], mountains: ['#4a4048', '#2e2630'], ground: ['#946044', '#56382a', '#1c100a'], rim: '#ff8a3a' },
    mix: { splitter: 2.2, grunt: 1.3 },
    hordeSwarm: 0.5,
    tough: 1.32,
    pace: 0.9,
    boss: {
      name: 'Rust Bucket', sprite: 'assets/enemies/bosses/scrapyard.webp', w: 3.2, hp: 800, sway: 0.4,
      fire: [2, 1.3], volley: [5, 7], spread: 0.4, shot: 'alien-eye', angryShot: 'alien-eye',
      drop: { type: 'splitter', count: 2, gap: 7 }, hint: 'Huge volleys! Weave between the bombs.',
    },
  },
  {
    key: 'hive',
    title: 'Hive Nests',
    scenery: 'hive',
    monsters: 'assets/enemies/hive',
    logo: 'assets/homeland/slides/hive-title.webp',
    backdrop: 'assets/homeland/sky/hive-spires.webp',
    frame: 'assets/homeland/frames/hive-frame.webp',
    dim: 0.35,
    intro: 'Eggs. Thousands of eggs, and they are hatching! Swarmers pour out of the nests, guarded by the Hive Queen in her giant honeycomb saucer.',
    outro: 'The Hive Queen crashes into her own honey. The ground grows hot under Granny\'s wheels…',
    palette: { sky: ['#0e0210', '#3e0a3a', '#d8468e'], mountains: ['#5a1650', '#3a0c36'], ground: ['#a83a74', '#6a1e50', '#1e0618'], rim: '#c8ff4a' },
    mix: { swarmer: 2.6, splitter: 1.6 },
    hordeSwarm: 0.75,
    tough: 1.4,
    pace: 0.86,
    boss: {
      name: 'Hive Queen', sprite: 'assets/enemies/bosses/hive.webp', w: 3.2, hp: 880, sway: 0.5,
      fire: [2, 1.4], volley: [3, 5], spread: 0.55, shot: 'alien-egg', angryShot: 'alien-urchin',
      drop: { type: 'swarmer', count: 6, gap: 5 }, hint: 'Sticky honey slows you down. Dodge it!', chill: true,
    },
  },
  {
    key: 'vents',
    title: 'Smoking Vents',
    scenery: 'vents',
    monsters: 'assets/enemies/vents',
    logo: 'assets/homeland/slides/vents-title.webp',
    backdrop: 'assets/homeland/sky/vents-volcano.webp',
    frame: 'assets/homeland/frames/vents-frame.webp?v=3',
    dim: 0.25,
    intro: 'The planet\'s furnace. Lava bubbles, geysers roar, and somewhere in the smoke the Magma Hauler is raining fire.',
    outro: 'Through the smoke Granny spots crumbling stone gates and the glow of strange machines: the ancient ruins that guard the palace.',
    palette: { sky: ['#0a0202', '#3a0a0a', '#ff4a1a'], mountains: ['#3a1414', '#240a0a'], ground: ['#6a2e24', '#3a1610', '#0e0503'], rim: '#ff5a1a' },
    mix: { leaper: 1.8, tank: 1.8 },
    hordeSwarm: 0.5,
    tough: 1.5,
    pace: 0.84,
    boss: {
      name: 'Magma Hauler', sprite: 'assets/enemies/bosses/vents.webp', w: 3.2, hp: 960, sway: 0.45,
      fire: [2.2, 1.5], volley: [3, 5], spread: 0.5, shot: 'alien-lava', angryShot: 'alien-lava',
      drop: { type: 'leaper', count: 3, gap: 7 }, hint: 'Fire rains from the sky. Keep moving!', rain: true,
    },
  },
  {
    key: 'ruins',
    title: 'Ancient Ruins',
    scenery: 'ruins',
    monsters: 'assets/enemies/ruins',
    logo: 'assets/homeland/slides/ruins-title.webp',
    backdrop: 'assets/homeland/sky/ruins-palace.webp',
    frame: 'assets/homeland/frames/ruins-frame.webp',
    dim: 0.1,
    intro: 'The palace gates! Giant monster skulls, rusty old machines and humming crystals. Cousin Zorg, the Supreme Leader\'s bodyguard, will not let Granny through.',
    outro: 'Cousin Zorg flees, wailing for his cousin. Past the gates Granny sees it at last, glittering on the horizon: an enormous, ridiculous golden palace.',
    palette: { sky: ['#060c12', '#183038', '#4ab8b0'], mountains: ['#3a3a40', '#24242a'], ground: ['#7a5a44', '#4a3428', '#16100c'], rim: '#5affe6' },
    mix: { grunt: 1.4, leaper: 1.4, spitter: 1.2, tank: 1.6 },
    hordeSwarm: 0.5,
    tough: 1.58,
    pace: 0.82,
    boss: {
      name: 'Cousin Zorg', sprite: 'assets/enemies/bosses/ruins.webp', w: 3.4, hp: 1080, sway: 0.5,
      fire: [2, 1.3], volley: [4, 6], spread: 0.45, shot: 'alien-eye', angryShot: 'alien-skull',
      drop: { type: 'tank', count: 2, gap: 7 }, hint: 'Zorg sends in the heavies. Blast the tanks before they reach you!',
    },
  },
  {
    key: 'palace',
    title: 'The Supreme Leader\'s Palace',
    scenery: 'palace',
    monsters: 'assets/enemies/palace',
    logo: 'assets/homeland/slides/palace-title.webp',
    backdrop: 'assets/homeland/sky/palace-hall.webp',
    portraits: [
      { src: 'assets/homeland/story/supreme-statue.webp', caption: 'How he sees himself' },
      { src: 'assets/homeland/story/supreme-leader.webp', caption: 'The real Supreme Leader' },
    ],
    intro: 'Gold everywhere! Gold statues of the Supreme Leader, gold fountains, a gold hot tub. It is the tackiest place in the galaxy, and he is home. This is it, Granny!',
    outro: 'The Supreme Leader\'s golden saucer crashes into his own fountain. The planet is free, and Granny is a legend!',
    palette: { sky: ['#1a0630', '#7a2a8a', '#ffd23a'], mountains: ['#c8902a', '#8a5a1a'], ground: ['#c8283a', '#7a1020', '#2a0408'], rim: '#ffe27a' },
    mix: { leaper: 1.3, spitter: 1.3, splitter: 1.3, tank: 1.5 },
    hordeSwarm: 0.5,
    tough: 1.65,
    pace: 0.8,
    boss: {
      name: 'The Supreme Leader', sprite: 'assets/enemies/bosses/palace.webp', w: 3.8, hp: 1200, sway: 0.6,
      fire: [1.8, 1.1], volley: [5, 7], spread: 0.45, shot: 'alien-tentacle', angryShot: 'alien-skull',
      drop: { type: 'splitter', count: 3, gap: 6 }, hint: 'He throws everything he\'s got! Don\'t stop moving!', rain: true, chill: true,
    },
  },
];

/** Alien shots that fly nose-first; the rest tumble. */
export const DIRECTIONAL_SHOTS = new Set(['alien-slime', 'alien-skull']);

const SAVE_KEY = 'hl-progress';

/** @typedef {{ unlocked: number, cleared: string[], best: Record<string, number> }} Progress */

/** @returns {Progress} */
export function loadProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    return {
      unlocked: Math.max(1, Math.min(REGIONS.length, Number(raw.unlocked) || 1)),
      cleared: Array.isArray(raw.cleared) ? raw.cleared : [],
      best: raw.best && typeof raw.best === 'object' ? raw.best : {},
    };
  } catch {
    return { unlocked: 1, cleared: [], best: {} };
  }
}

/** @param {Progress} progress */
export function saveProgress(progress) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
}
