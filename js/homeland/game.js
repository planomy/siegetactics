/**
 * Alien Homeland: playable prototype of the horde survival run.
 *
 * Granny rides her rocket scooter around the near side of a small curved planet, firing
 * straight ahead. Aliens crest the horizon from right across the screen and make a beeline
 * for her; crystals from kills level her up, and each level-up offers one of three upgrades.
 * Crystal deposits, power-ups and ammo crates turn up along the way, and a combo multiplier
 * rewards non-stop blasting. Survive the hordes, then shoot down the mothership.
 */
import { loadSounds, sfx } from './sfx.js';
import { drawGranny, exhaustPoints, rigSprite } from './draw.js?v=8';
import { rigFor } from './rigs.js?v=1';
import { AMMO, CRATE_AMMO, RACK_SLOTS, ammoImage } from './ammo.js?v=3';
import { GEMS, DEPOSITS, POWERS, gemsFor, rollPower, pickupImage } from './pickups.js?v=2';
import { view, resizeView, project, horizonY, isBehindHorizon, screenToGround, spawnBehindHorizon, maxXAt, setIndoor } from './world.js?v=6';
import { ENEMY_TYPES, BOSS_TIME, HORDE_TIMES, MAX_ALIENS, spawnInterval, pickEnemyType, hordeSize } from './enemies.js?v=2';
import { REGIONS, PLANET_MAP, DIRECTIONAL_SHOTS, loadProgress, saveProgress, regionCrystals } from './regions.js?v=30';
import { mapPiecesEarned, normalizeMapProgress, TRAINING_MODULE_IDS } from '../map-progress.js';
import { UPGRADES, noUpgrades, rollChoices, crystalsForLevel } from './upgrades.js';
import { sceneryFor, propImage } from './props.js?v=10';
import { createSky, updateSky, drawSkyLayers, drawCloudBand, mountainSlide } from './sky.js?v=5';

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('homeland'));
const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
const overlay = /** @type {HTMLElement} */ (document.getElementById('hl-overlay'));
const levelUpBox = /** @type {HTMLElement} */ (document.getElementById('hl-levelup'));
const nukeButton = /** @type {HTMLButtonElement} */ (document.getElementById('hl-nuke'));
const dashButton = /** @type {HTMLButtonElement} */ (document.getElementById('hl-dash'));
/** @param {string} id */
const el = (id) => /** @type {HTMLElement} */ (document.getElementById(id));
const barEls = {
  bar: el('hl-bar'), xp: el('hl-xp-fill'), level: el('hl-level'), hpFill: el('hl-hp-fill'), hpLag: el('hl-hp-lag'), hpText: el('hl-hp-text'),
  health: el('hl-health'), score: el('hl-score'), kills: el('hl-kills'), combo: el('hl-combo'), comboX: el('hl-combo-x'), comboN: el('hl-combo-n'),
  comboTime: el('hl-combo-time'), best: el('hl-best'), powers: el('hl-powers'),
};

const Z_MIN = 1.15;
const Z_MAX = 2.5;
/** Granny's starting distance. Her speed is tuned here and scaled so she crosses the screen at the same pace nearer or further. */
const HOME_Z = 1.5;
const MAX_SPEED = 3;
const DASH_TIME = 0.22;
const DASH_SPEED = 6;
const DASH_COOLDOWN = 1.8;
const KILLS_PER_NUKE = 45;
const MAGNET_RANGE = 1.1;
const GROUND_DRIFT = 0.35;
const PICKUP_LIFE = 14;
const COMBO_TIME = 2.5;
/** Rear tyres, left and right of Granny's centre, in world units. */
const WHEEL_X = 0.163;
const MARK_LIFE = 3.5;
const BOSS_Z = 6.2;
/** The mothership's belly, where shots fired up at it strike. World height. */
const BOSS_HIT_Y = 1.45;

const params = new URLSearchParams(location.search);
const START_AT = params.has('boss') ? BOSS_TIME - 4 : Math.max(0, Number(params.get('start')) || 0);
/** Maths HQ, where the player came from and goes back to, and its save (the same key as js/app.js). */
const HOME_URL = 'index.html';
const MAIN_SAVE_KEY = 'grannyboom.siege.v1';
/** The test links (and ?dev) skip the map-piece check. */
const TESTING = ['dev', 'region', 'map', 'story', 'start', 'boss', 'all'].some((p) => params.has(p));

/** Map pieces found in the main game. Homeland opens once all ten are in. */
function mapPiecesFound() {
  try {
    const save = JSON.parse(localStorage.getItem(MAIN_SAVE_KEY) || '{}');
    return mapPiecesEarned(normalizeMapProgress(save.mapProgress));
  } catch {
    return 0;
  }
}

const sprites = Object.fromEntries(
  ['monster1', 'monster2', 'monster3', 'monster4', 'monster5', 'granddaddy'].map((name) => [name, image(`assets/enemies/${name}.png`)])
);
const cupcake = image('assets/cupcake-missile.png');
const hijackedShip = image('assets/enemies/mothership.png');
let progress = loadProgress();
if (params.has('all')) progress.unlocked = REGIONS.length;
let region = REGIONS.find((r) => r.key === params.get('region')) ?? REGIONS[0];
/** Granny's scooter and its weapon for this region. */
let rig = rigFor(REGIONS.indexOf(region));
let scenery = sceneryFor(region.scenery);
/** An indoor region's far wall, which replaces the sky. @type {HTMLImageElement | null} */
let backdrop = null;
/** An outdoor region's painted horizon, which replaces the mountains. @type {HTMLImageElement | null} */
let skyline = null;
/** A painted arch laid over the battlefield along the top and sides of the screen. @type {HTMLImageElement | null} */
let arch = null;
/** Where the HUD at the top of the screen starts, so it sits under the frame's centrepiece. */
let frameHudTop = 0;
/** The region's own alien sprites, by type. The tank is always Granddaddy. @type {Partial<Record<string, HTMLImageElement>>} */
let monsters = {};
function useBackdrop() {
  backdrop = region.backdrop ? image(region.backdrop) : null;
  skyline = region.skyline ? image(region.skyline) : null;
  arch = region.frame ? image(region.frame) : null;
  frameHudTop = 0;
  setIndoor(!!backdrop);
  const folder = region.monsters;
  monsters = folder ? Object.fromEntries(['swarmer', 'grunt', 'leaper', 'spitter', 'splitter'].map((type) => [type, image(`${folder}/${type}.webp`)])) : {};
}
useBackdrop();
/** @type {Map<string, HTMLImageElement>} */
const bossImages = new Map();
/** @param {string} src */
function bossImage(src) {
  let img = bossImages.get(src);
  if (!img) {
    img = image(src);
    bossImages.set(src, img);
  }
  return img;
}
const sky = createSky();

/** @param {string} src */
function image(src) {
  const img = new Image();
  img.src = src;
  return img;
}

/**
 * @typedef {{ type: keyof typeof ENEMY_TYPES, x: number, y: number, z: number, hp: number, maxHp: number, speed: number,
 *   size: number, damage: number, gems: number, t: number, hitFlash: number, phase: 'walk'|'crouch'|'leap',
 *   phaseTime: number, dirX: number, dirZ: number, holdTime: number, fireIn: number, orbitCd: number, waveHit: number, seed: number,
 *   slow: number }} Alien
 * @typedef {import('./ammo.js').AmmoId} AmmoId
 * @typedef {import('./pickups.js').PowerId} PowerId
 * @typedef {{ x: number, z: number, z0: number, vx: number, vz: number, dmg: number, life: number, ammo: AmmoId, pierce: number,
 *   spin: number, hits: Map<object, number>, rise: boolean }} Bullet
 *   `rise` shots were fired lined up under the mothership and climb into it.
 * @typedef {{ kind: 'power', id: PowerId } | { kind: 'ammo', id: AmmoId }} Prize
 */

let state = 'title';
let time = 0;
let clock = 0;
let spawnIn = 1;
let fireIn = 0;
let rocketIn = 2;
let bazookaIn = 2;
let waveIn = 4;
let waveId = 0;
let hordeIndex = 0;
/** @type {{ left: number, gap: number }} */
let hordeQueue = { left: 0, gap: 0 };
let hordeIn = 0;
let shake = 0;
let flash = 0;
let warpTime = 0;
/** @type {{ x: number, y: number, r: number, life: number, max: number, vx: number, vy: number }[]} */
let warpSmoke = [];
/** @type {{ x: number, y: number } | null} */
let warpTrailEnd = null;
let countdownTick = 0;
let banner = { text: '', sub: '', time: 0 };
/** @type {import('./upgrades.js').UpgradeId[]} */
let choices = [];

/** `chill` is how long frost shots keep Granny slowed down. */
const player = { x: 0, z: 1.5, vx: 0, vz: 0, hp: 100, maxHp: 100, speed: 2.3, invuln: 0, dash: 0, dashCd: 0, dashVx: 0, dashVz: 0, level: 1, crystals: 0, nuke: 0, kills: 0, chill: 0 };
let levels = noUpgrades();
/** @type {Alien[]} */
let aliens = [];
/** @type {Bullet[]} */
let bullets = [];
/** @type {{ x: number, z: number, vx: number, vz: number, life: number, target: Alien|null }[]} */
let rockets = [];
/**
 * @typedef {{ x: number, z: number, fromX: number, fromZ: number, toX: number, toZ: number, t: number, flight: number,
 *   kind: import('./regions.js').ShotKind, y0: number, arc: number, chill: boolean }} Slime
 */
/** @type {Slime[]} */
let slimes = [];
/** @type {{ x: number, z: number, vx: number, vz: number, def: typeof GEMS[number], t: number }[]} */
let gems = [];
/** @type {{ r: number, max: number, t: number, id: number }[]} */
let rings = [];
/** @type {{ x: number, y: number, vx: number, vy: number, life: number, max: number, colour: string, size: number }[]} */
let particles = [];
/** @typedef {{ def: import('./props.js').PropDef, x: number, z: number, flip: boolean }} Prop */
/** @type {Prop[]} */
let props = [];
/** @type {Prop[]} */
let decals = [];
/**
 * `solid` drops towards 0 while a phasing boss fades out; it can only be hurt when mostly solid.
 * @type {null | { x: number, z: number, hp: number, t: number, fireIn: number, dropIn: number, rainIn: number, dying: number, hitFlash: number, solid: number }}
 */
let boss = null;
/** Exhaust sparks, in screen pixels. @type {{ x: number, y: number, vx: number, vy: number, life: number, max: number, w: number }[]} */
let sparks = [];
/** Tyre smoke puffs on the ground. @type {{ x: number, y: number, z: number, vx: number, r: number, life: number, max: number }[]} */
let smoke = [];
/** Skid marks: one short segment per wheel per frame. @type {{ x1: number, z1: number, x2: number, z2: number, life: number }[]} */
let marks = [];
/** Where each tyre was last frame while skidding. @type {{ z: number, x: number } | null} */
let markFrom = null;
/** How hard Granny is sliding sideways, 0 to 1. */
let skid = 0;
let sparkIn = 0;
/** The blaster first, then up to RACK_SLOTS kinds of special ammo. @type {{ id: AmmoId, rounds: number }[]} */
let rack = [];
let weapon = 0;
/** Seconds left on each timed power-up. */
let powers = noPowers();
/** @type {(Prize & { x: number, z: number, t: number })[]} */
let pickups = [];
/** @type {{ def: import('./pickups.js').DepositType, x: number, z: number, hp: number, hitFlash: number }[]} */
let deposits = [];
let depositIn = 0;
let depositsSeen = 0;
/** Lightning arcs between aliens. @type {{ a: { x: number, y: number, z: number }, b: { x: number, y: number, z: number }, life: number }[]} */
let zaps = [];
/** Points and pickup names floating up the screen, in pixels. @type {{ text: string, x: number, y: number, life: number, max: number, colour: string, size: number }[]} */
let floaters = [];
let score = 0;
let shownScore = 0;
let combo = 0;
let comboTime = 0;
let best = progress.best[region.key] || 0;
/** Counts down while the newly equipped ammo pops up over Granny. */
let ammoPop = 0;
const stars = Array.from({ length: 260 }, () => ({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: Math.random() }));
const skyStars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random() * 0.8, r: Math.random() * 1.4 + 0.3 }));
/** Faint glints scattered over an indoor floor, drifting past with the ground. `x` is across the floor, -1 to 1. */
const specks = Array.from({ length: 110 }, () => ({ x: Math.random() * 2 - 1, z: 0.9 + Math.random() * 7.5, r: 0.02 + Math.random() * 0.05, a: 0.25 + Math.random() * 0.5 }));

const keys = new Set();
/** @type {{ x: number, z: number } | null} */
let target = null;

/* ---------- Setup ---------- */

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  resizeView(w, h);
}

function resetRun() {
  time = 0;
  clock = START_AT;
  countdownTick = 0;
  spawnIn = 1.2;
  fireIn = 0;
  rocketIn = 2;
  bazookaIn = 2;
  waveIn = 4;
  hordeIndex = HORDE_TIMES.filter((t) => t < START_AT).length;
  hordeQueue = { left: 0, gap: 0 };
  shake = 0;
  Object.assign(player, { x: 0, z: 1.5, vx: 0, vz: 0, hp: 100, maxHp: 100, speed: 2.3, invuln: 0, dash: 0, dashCd: 0, level: 1, crystals: 0, nuke: 0, kills: 0, chill: 0 });
  levels = noUpgrades();
  aliens = [];
  bullets = [];
  rockets = [];
  slimes = [];
  gems = [];
  rings = [];
  particles = [];
  sparks = [];
  smoke = [];
  marks = [];
  markFrom = null;
  skid = 0;
  boss = null;
  target = null;
  rack = [{ id: 'blaster', rounds: Infinity }];
  weapon = 0;
  powers = noPowers();
  pickups = [];
  deposits = [];
  depositIn = 7;
  depositsSeen = 0;
  zaps = [];
  floaters = [];
  score = 0;
  shownScore = 0;
  combo = 0;
  comboTime = 0;
  ammoPop = 0;
  props = Array.from({ length: 18 }, () => newProp(1.3 + Math.random() * 9.5));
  decals = Array.from({ length: 16 }, () => newDecal(1.3 + Math.random() * 9.5));
}

/** A tall prop standing off to one side of the battlefield. @param {number} z */
function newProp(z) {
  const side = Math.random() < 0.5 ? -1 : 1;
  const def = scenery.tall[Math.floor(Math.random() * scenery.tall.length)];
  return { def, x: side * (maxXAt(z) * (0.6 + Math.random() * 0.6) + def.w * 0.3), z, flip: Math.random() < 0.5 };
}

/** A crater or slime pool lying on the ground anywhere. @param {number} z */
function newDecal(z) {
  const def = scenery.flat[Math.floor(Math.random() * scenery.flat.length)];
  return { def, x: (Math.random() - 0.5) * 2.4 * maxXAt(z), z, flip: Math.random() < 0.5 };
}
/* ---------- Input ---------- */

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (state === 'levelup' && ['1', '2', '3'].includes(k)) {
    pickUpgrade(Number(k) - 1);
    return;
  }
  if (k === 'shift') dash();
  else if ([' ', 'n', 'enter'].includes(k)) {
    fireNuke();
    e.preventDefault();
  } else keys.add(k);
  if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's'].includes(k)) target = null;
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

/** @param {PointerEvent} e */
function steerTo(e) {
  const fingerLift = e.pointerType === 'mouse' ? 0 : view.h * 0.09;
  const z = clamp(screenToGround(e.clientX, e.clientY - fingerLift).z, Z_MIN, Z_MAX);
  target = { x: ((e.clientX - view.cx) * z) / view.unit, z };
}
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse' || e.buttons) steerTo(e);
});
canvas.addEventListener('pointerdown', (e) => {
  steerTo(e);
  if (e.pointerType === 'mouse') dash();
});
nukeButton.addEventListener('click', fireNuke);
dashButton.addEventListener('click', dash);

function dash() {
  if (state !== 'play' || player.dashCd > 0) return;
  let dx = player.vx;
  let dz = player.vz;
  if (Math.hypot(dx, dz) < 0.2) dz = 1;
  const len = Math.hypot(dx, dz);
  player.dashVx = (dx / len) * DASH_SPEED;
  player.dashVz = (dz / len) * DASH_SPEED * 0.6;
  player.dash = DASH_TIME;
  player.dashCd = DASH_COOLDOWN;
  skid = 1;
  sfx('missile', 0.4);
}

function fireNuke() {
  if (state !== 'play') return;
  if (player.nuke < 1) {
    floatAt(player.x, 0.8, player.z, `NUKE ${Math.floor(player.nuke * 100)}%`, '#9dff3a', 0.8);
    return;
  }
  player.nuke = 0;
  flash = 1;
  shake = 30;
  sfx('nuke-explosion', 0.7);
  showBanner('GRANNY NUKE!');
  for (const a of aliens) if (!isBehindHorizon(a.x, a.z)) killAlien(a, true);
  slimes = [];
  if (boss && !boss.dying && boss.z <= BOSS_Z + 0.1) damageBoss(60);
}

/* ---------- Spawning ---------- */

/**
 * Aliens pick a straight path when they appear and never turn: about half head for where Granny
 * is right now, the rest pass a little to one side of her.
 * @param {keyof typeof ENEMY_TYPES} type @param {{ x: number, z: number }} at
 * @param {{ x: number, z: number }} [heading] A direction to travel instead of aiming near Granny.
 */
function addAlien(type, at, heading) {
  if (aliens.length >= MAX_ALIENS) return null;
  const spec = ENEMY_TYPES[type];
  const miss = Math.random() < 0.5 ? 0 : (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 1.1);
  const aimX = heading ? at.x + heading.x : player.x + miss;
  const aimZ = heading ? at.z + heading.z : player.z;
  const aimLen = Math.hypot(aimX - at.x, aimZ - at.z) || 1;
  const late = (1 + Math.max(0, clock - 60) / 240) * region.tough;
  const alien = /** @type {Alien} */ ({
    type, x: at.x, y: 0, z: at.z, hp: Math.ceil(spec.hp * late), maxHp: Math.ceil(spec.hp * late), speed: spec.speed * (0.9 + Math.random() * 0.2),
    size: spec.size, damage: spec.damage, gems: spec.gems, t: Math.random() * 5, hitFlash: 0, phase: 'walk', phaseTime: 0,
    dirX: (aimX - at.x) / aimLen, dirZ: (aimZ - at.z) / aimLen, holdTime: 5, fireIn: 1 + Math.random(), orbitCd: 0, waveHit: -1, seed: Math.random(),
    slow: 0,
  });
  aliens.push(alien);
  return alien;
}

function spawnDirector(dt) {
  const bossTime = clock >= BOSS_TIME;
  spawnIn -= dt;
  if (spawnIn <= 0) {
    addAlien(pickEnemyType(clock, region.mix), spawnBehindHorizon(Math.random()));
    spawnIn = spawnInterval(clock) * region.pace * (bossTime ? 2.5 : 1) * (0.7 + Math.random() * 0.6);
  }
  if (hordeIndex < HORDE_TIMES.length && clock >= HORDE_TIMES[hordeIndex]) {
    hordeQueue = { left: hordeSize(hordeIndex), gap: 2.6 / hordeSize(hordeIndex) };
    hordeIndex += 1;
    showBanner('⚠ HORDE INCOMING ⚠', 'They\'re coming over the hills!');
    sfx('granddaddywarning', 0.6);
    shake = 8;
  }
  if (hordeQueue.left > 0) {
    hordeIn -= dt;
    while (hordeIn <= 0 && hordeQueue.left > 0) {
      const type = Math.random() < region.hordeSwarm ? 'swarmer' : pickEnemyType(clock, region.mix);
      addAlien(type, spawnBehindHorizon(Math.random(), 1.1 + Math.random() * 0.25));
      hordeQueue.left -= 1;
      hordeIn += hordeQueue.gap;
    }
  }
  if (bossTime && !boss) {
    boss = { x: 0, z: 13, hp: region.boss.hp, t: 0, fireIn: 4, dropIn: 6, rainIn: 3, dying: 0, hitFlash: 0, solid: 1 };
    showBanner(`⚠ ${region.boss.name.toUpperCase()} ⚠`, region.boss.hint);
    sfx('siren-alert', 0.6);
    sfx('mothership', 0.5);
  }
}

/* ---------- Game flow ---------- */

function startWarp() {
  resetRun();
  state = 'warp';
  warpTime = 0;
  warpSmoke = [];
  warpTrailEnd = null;
  overlay.hidden = true;
  sfx('nuke-fire', 0.6);
}

/** @param {number} index */
function selectRegion(index) {
  region = REGIONS[index];
  rig = rigFor(index);
  rigSprite(rig.sprite);
  scenery = sceneryFor(region.scenery);
  bossImage(region.boss.sprite);
  useBackdrop();
  best = progress.best[region.key] || 0;
  resetRun();
}

const PADLOCK = `<svg class="hl-spot-lock" viewBox="0 0 64 72" aria-hidden="true">
  <defs><linearGradient id="hl-lock-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2a8"/><stop offset="0.45" stop-color="#ffc430"/><stop offset="1" stop-color="#b8640a"/></linearGradient></defs>
  <path d="M16 32V22a16 16 0 0 1 32 0v10" fill="none" stroke="#d8dce8" stroke-width="7" stroke-linecap="round"/>
  <rect x="6" y="30" width="52" height="38" rx="9" fill="url(#hl-lock-gold)" stroke="#5a2a04" stroke-width="3"/>
  <circle cx="32" cy="45" r="6" fill="#4a1c02"/><path d="M29 47h6l2 11h-10z" fill="#4a1c02"/>
</svg>`;

/**
 * The planet map: the painted map of Doompickle with every region in story order, locked until the
 * one before it is beaten. Each panel gets a nameplate; locked ones go dark behind a padlock, open
 * ones glow with a NEW! burst, and beaten ones show a gold star and the best score.
 */
function showMap() {
  state = 'title';
  overlay.innerHTML = `
    <div class="hl-planet">
      <img class="hl-planet-art" src="${PLANET_MAP.src}" alt="Planet Doompickle map" />
      ${REGIONS.map((r, i) => {
        const at = PLANET_MAP.spots[r.key];
        if (!at) return '';
        const locked = i >= progress.unlocked;
        const cleared = progress.cleared.includes(r.key);
        const best = (progress.best[r.key] || 0).toLocaleString();
        const [left, top, width, height] = at;
        const status = locked ? 'locked' : cleared ? `cleared, best ${best}` : 'new';
        return `
          <div class="hl-spot ${locked ? 'is-locked' : cleared ? 'is-cleared' : 'is-new'}" style="left: ${left}%; top: ${top}%; width: ${width}%; height: ${height}%; --rim: ${r.palette.rim}">
            <button type="button" class="hl-spot-panel" data-region="${i}" ${locked ? 'disabled' : ''} aria-label="Region ${i + 1}, ${r.title}: ${status}"></button>
            ${locked ? PADLOCK : ''}
            <span class="hl-spot-plate" aria-hidden="true"><b>${r.title}</b>${cleared ? `<small>★ ${best}</small>` : ''}</span>
            ${locked ? '' : cleared ? '<span class="hl-spot-star" aria-hidden="true">★</span>' : '<span class="hl-spot-new" aria-hidden="true"><b>NEW!</b></span>'}
          </div>`;
      }).join('')}
    </div>
    <a class="hl-home" href="${HOME_URL}"><img class="hl-house" src="assets/ui/granny-house.webp" alt="" width="192" height="182" />Granny's backyard</a>`;
  overlay.hidden = false;
  for (const r of REGIONS) if (r.logo) image(r.logo);
  overlay.querySelectorAll('[data-region]').forEach((btn) => btn.addEventListener('click', () => showStory(Number(btn.getAttribute('data-region')))));
}

/** Doompickle can't be found until every map piece is in. @param {number} found */
function showMapIncomplete(found) {
  state = 'title';
  const total = TRAINING_MODULE_IDS.length;
  overlay.innerHTML = `
    <div class="hl-card">
      <p class="hl-kicker">ALIEN HOMELAND</p>
      <h1 class="hl-title">MAP INCOMPLETE</h1>
      <p class="hl-line">Granny has found ${found} of ${total} map pieces. Chart every sector in Maths HQ to find the way to Doompickle, the aliens' home planet!</p>
      <a class="hl-go" href="${HOME_URL}"><img class="hl-house" src="assets/ui/granny-house.webp" alt="" width="192" height="182" />BACK TO MATHS HQ</a>
    </div>`;
  overlay.hidden = false;
}

/** The story card before a region. @param {number} index */
function showStory(index) {
  selectRegion(index);
  const kicker = `REGION ${index + 1} OF ${REGIONS.length}`;
  const foe = region.portraits
    ? `<div class="hl-story-portraits">${region.portraits.map((p) => `<figure><img src="${p.src}" alt="" /><figcaption>${p.caption}</figcaption></figure>`).join('')}</div>`
    : `<div class="hl-story-boss"><img src="${region.boss.sprite}" alt="" /><span><em>BOSS</em><strong>${region.boss.name}</strong></span></div>`;
  const buttons = `
    <button type="button" class="hl-go hl-go-granny" id="hl-go"><img src="assets/homeland/granny-front.webp" alt="" width="173" height="200" />GO GRANNY!</button>
    <button type="button" class="hl-back hl-map-btn" id="hl-back" aria-label="Planet map"><img src="assets/homeland/planet-map-button.webp" alt="" /></button>`;
  const upgraded = index > 0 && rig !== rigFor(index - 1);
  const upgrade = upgraded ? `<div class="hl-rig"><img src="${rig.sprite}" alt="" /><span><em>UPGRADE!</em><strong>${rig.name}</strong></span></div>` : '';
  const perk = upgraded ? `<p class="hl-perk">🔧 ${rig.perk}</p>` : '';
  overlay.innerHTML = region.logo
    ? `
    <div class="hl-slide" style="--rim: ${region.palette.rim}">
      <img class="hl-slide-fill" src="${region.logo}" alt="" />
      <p class="hl-slide-kicker">${kicker}</p>
      <div class="hl-slide-stage"><img class="hl-slide-logo" src="${region.logo}" alt="${region.title}" /></div>
      <div class="hl-slide-panel">
        ${foe}
        <div>
          <p class="hl-slide-line">${region.intro}</p>
          ${perk}
        </div>
        <div class="hl-slide-actions">${upgrade}${buttons}</div>
      </div>
    </div>`
    : `
    <div class="hl-card hl-story" style="--rim: ${region.palette.rim}">
      <p class="hl-kicker">${kicker}</p>
      <h1 class="hl-title">${region.title.toUpperCase()}</h1>
      <p class="hl-line">${region.intro}</p>
      ${perk}
      ${foe}
      ${buttons}
    </div>`;
  overlay.hidden = false;
  document.getElementById('hl-go')?.addEventListener('click', startWarp);
  document.getElementById('hl-back')?.addEventListener('click', showMap);
}

function startPlay() {
  state = 'play';
  flash = 1;
  showBanner(region.title.toUpperCase(), `Region ${REGIONS.indexOf(region) + 1} · Survive the horde!`);
  sfx('battle-cry-titans', 0.55);
  const testAmmo = /** @type {AmmoId} */ (params.get('ammo'));
  if (testAmmo in AMMO && testAmmo !== 'blaster') addAmmo(testAmmo);
  const testPower = /** @type {PowerId} */ (params.get('power'));
  if (testPower in POWERS) applyPower(testPower);
}

/** @param {string} text @param {string} [sub] */
function showBanner(text, sub = '') {
  banner = { text, sub, time: 2.6 };
}

/** @param {boolean} won */
function endRun(won) {
  state = won ? 'won' : 'lost';
  const index = REGIONS.indexOf(region);
  const next = REGIONS[index + 1];
  const newBest = score > best;
  if (newBest) {
    best = score;
    progress.best[region.key] = score;
  }
  const firstClear = won && !progress.cleared.includes(region.key);
  if (won) {
    if (firstClear) progress.cleared.push(region.key);
    progress.unlocked = Math.min(REGIONS.length, Math.max(progress.unlocked, index + 2));
  }
  saveProgress(progress);
  const title = won ? `${region.boss.name.toUpperCase()} DOWN!` : 'SCOOTER TOAST!';
  const line = won ? region.outro : 'The horde got Granny this time. One more go?';
  const go = won ? (next ? `▶ ON TO ${next.title.toUpperCase()}` : '🏆 THE PLANET IS FREE!') : '🛵 TRY AGAIN';
  const reward = firstClear ? `<p class="hl-reward">💎 +${regionCrystals(index)} Alien Crystals waiting in Granny's vault!</p>` : '';
  overlay.innerHTML = `
    <div class="hl-card hl-story" style="--rim: ${region.palette.rim}">
      <p class="hl-kicker">REGION ${index + 1} · ${region.title.toUpperCase()}</p>
      <h1 class="hl-title ${won ? '' : 'is-lost'}">${title}</h1>
      <p class="hl-line">${line}</p>
      ${reward}
      <p class="hl-final ${newBest ? 'is-best' : ''}">${newBest ? '★ NEW BEST ★' : `BEST ${best.toLocaleString()}`}<strong>${score.toLocaleString()}</strong></p>
      <p class="hl-stats"><span>ALIENS <strong>${player.kills.toLocaleString()}</strong></span><span>LEVEL <strong>${player.level}</strong></span><span>TIME <strong>${formatClock(clock)}</strong></span></p>
      <button type="button" class="hl-go" id="hl-go">${go}</button>
      <button type="button" class="hl-back hl-map-btn" id="hl-back" aria-label="Planet map"><img src="assets/homeland/planet-map-button.webp" alt="" /></button>
    </div>`;
  overlay.hidden = false;
  document.getElementById('hl-go')?.addEventListener('click', () => {
    if (!won) startWarp();
    else if (next) showStory(index + 1);
    else showMap();
  });
  document.getElementById('hl-back')?.addEventListener('click', showMap);
}

function levelUp() {
  player.crystals -= crystalsForLevel(player.level);
  player.level += 1;
  choices = rollChoices(levels);
  if (!choices.length) return;
  state = 'levelup';
  sfx('core-earned', 0.6);
  levelUpBox.innerHTML = `
    <h2 class="hl-levelup-title">LEVEL ${player.level}!</h2>
    <p class="hl-levelup-sub">Pick an upgrade</p>
    <div class="hl-levelup-cards">
      ${choices.map((id, i) => {
        const up = UPGRADES[id];
        const next = levels[id] + 1;
        return `<button type="button" class="hl-upgrade" data-pick="${i}">
          <span class="hl-upgrade-key">${i + 1}</span>
          <span class="hl-upgrade-icon">${up.icon}</span>
          <strong class="hl-upgrade-name">${up.name}${up.max < 99 ? ` ${next}` : ''}</strong>
          <span class="hl-upgrade-desc">${up.describe(next)}</span>
        </button>`;
      }).join('')}
    </div>`;
  levelUpBox.hidden = false;
  levelUpBox.querySelectorAll('[data-pick]').forEach((btn) => btn.addEventListener('click', () => pickUpgrade(Number(btn.getAttribute('data-pick')))));
}

/** @param {number} index */
function pickUpgrade(index) {
  const id = choices[index];
  if (!id || state !== 'levelup') return;
  levels[id] += 1;
  if (id === 'tuneup') {
    player.speed = Math.min(MAX_SPEED, player.speed * 1.1);
    player.maxHp += 15;
    player.hp = Math.min(player.maxHp, player.hp + 35);
  }
  levelUpBox.hidden = true;
  state = 'play';
  sfx('turret-upgrade', 0.5);
  if (player.crystals >= crystalsForLevel(player.level)) levelUp();
}

/* ---------- Update ---------- */

/** @param {number} dt */
function update(dt) {
  time += dt;
  shake = Math.max(0, shake - dt * 30);
  flash = Math.max(0, flash - dt * 2.5);
  updateSky(sky, dt, player.x);
  if (state === 'warp') {
    warpTime += dt;
    updateWarpSmoke(dt);
    if (warpTime > WARP_END) startPlay();
    return;
  }
  if (state !== 'play') {
    if (state !== 'levelup') {
      updateParticles(dt);
      updateFloaters(dt);
      updateExhaust(dt, false);
    }
    return;
  }
  updateFloaters(dt);
  clock += dt;
  const secsLeft = Math.ceil(BOSS_TIME - clock);
  if (secsLeft >= 1 && secsLeft <= 5 && secsLeft !== countdownTick) {
    countdownTick = secsLeft;
    sfx('button-press', 0.6);
  }

  updatePlayer(dt);
  spawnDirector(dt);
  driftGround(dt);
  updateAliens(dt);
  updateWeapons(dt);
  updateBullets(dt);
  updateRockets(dt);
  updateSlimes(dt);
  updateGems(dt);
  updateDeposits(dt);
  updatePickups(dt);
  updatePowers(dt);
  if (boss) updateBoss(dt);
  updateParticles(dt);
  updateExhaust(dt, true);

  if (banner.time > 0) banner.time -= dt;
}

/** @param {number} dt */
function updatePlayer(dt) {
  let ix = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0);
  let iz = (keys.has('arrowup') || keys.has('w') ? 1 : 0) - (keys.has('arrowdown') || keys.has('s') ? 1 : 0);
  let wantX = 0;
  let wantZ = 0;
  const depth = player.z / HOME_Z;
  const top = player.speed * depth * (powers.boost > 0 ? 1.45 : 1) * (player.chill > 0 ? 0.55 : 1);
  if (ix || iz) {
    const len = Math.hypot(ix, iz);
    wantX = (ix / len) * top;
    wantZ = (iz / len) * top * 0.55;
  } else if (target) {
    const dx = target.x - player.x;
    const dz = clamp(target.z, Z_MIN, Z_MAX) - player.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.02) {
      const v = Math.min(top, (dist / depth) * 5);
      wantX = (dx / dist) * v;
      wantZ = (dz / dist) * v;
    }
  }
  const lastVx = player.vx;
  player.vx += (wantX - player.vx) * Math.min(1, dt * 9);
  player.vz += (wantZ - player.vz) * Math.min(1, dt * 9);
  const swerve = Math.abs(player.vx - lastVx) / dt / (9 * top);
  skid = Math.max(clamp((swerve - 0.35) / 0.65, 0, 1), skid - dt * 2.5);
  let mx = player.vx;
  let mz = player.vz;
  if (player.dash > 0) {
    player.dash -= dt;
    mx = player.dashVx * depth;
    mz = player.dashVz * depth;
    if (Math.random() < 0.8) {
      const at = project(player.x, 0.2, player.z);
      particles.push({ x: at.x + (Math.random() - 0.5) * 30, y: at.y, vx: 0, vy: 30, life: 0, max: 0.3, colour: '#ffb02e', size: 8 });
    }
  }
  player.z = clamp(player.z + mz * dt, Z_MIN, Z_MAX);
  const limit = maxXAt(player.z) * (arch ? 0.9 : 1);
  player.x = clamp(player.x + mx * dt, -limit, limit);
  player.invuln = Math.max(0, player.invuln - dt);
  player.dashCd = Math.max(0, player.dashCd - dt);
}

/** @param {number} dt */
function driftGround(dt) {
  for (const m of marks) {
    m.z1 -= GROUND_DRIFT * dt;
    m.z2 -= GROUND_DRIFT * dt;
  }
  if (markFrom) markFrom.z -= GROUND_DRIFT * dt;
  for (const p of props) p.z -= GROUND_DRIFT * dt;
  for (const d of decals) d.z -= GROUND_DRIFT * dt;
  for (const s of specks) if ((s.z -= GROUND_DRIFT * dt) < 0.9) s.z += 7.5;
  props = props.map((p) => (p.z < 0.75 ? newProp(9.5 + Math.random() * 2) : p));
  decals = decals.map((d) => (d.z < 0.8 ? newDecal(9.5 + Math.random() * 2) : d));
}

/** @param {number} dt */
function updateAliens(dt) {
  for (const a of aliens) {
    a.t += dt;
    a.hitFlash = Math.max(0, a.hitFlash - dt * 6);
    a.orbitCd = Math.max(0, a.orbitCd - dt);
    a.slow = Math.max(0, a.slow - dt);
    const dx = player.x - a.x;
    const dz = player.z - a.z;
    const dist = Math.hypot(dx, dz) || 1;
    const sluggish = (a.slow > 0 ? 0.45 : 1) * (powers.radar > 0 ? 0.35 : 1);
    let speed = a.speed * sluggish;

    if (a.type === 'leaper') {
      a.phaseTime -= dt;
      if (a.phase === 'walk' && dist < 2.3 && !isBehindHorizon(a.x, a.z)) {
        a.phase = 'crouch';
        a.phaseTime = 0.55;
      } else if (a.phase === 'crouch' && a.phaseTime <= 0) {
        a.phase = 'leap';
        a.phaseTime = 0.5;
      } else if (a.phase === 'leap' && a.phaseTime <= 0) {
        a.phase = 'walk';
        a.y = 0;
      }
      if (a.phase === 'crouch') speed = 0;
      if (a.phase === 'leap') {
        a.x += a.dirX * 5.5 * sluggish * dt;
        a.z += a.dirZ * 5.5 * sluggish * dt;
        a.y = Math.sin((1 - a.phaseTime / 0.5) * Math.PI) * 0.55;
        speed = 0;
      }
    }
    if (a.type === 'spitter' && dist < 4.3 && a.holdTime > 0 && !isBehindHorizon(a.x, a.z)) {
      speed = 0;
      a.holdTime -= dt;
      a.fireIn -= dt;
      if (a.fireIn <= 0) {
        a.fireIn = 2.1;
        const flight = 0.4 + dist / 4.5;
        lob('alien-slime', a.x, a.z, player.x, player.z, { flight });
        sfx('slime', 0.3, 0.1);
      }
    }
    a.x += a.dirX * speed * dt;
    a.z += a.dirZ * speed * dt;

    if (dist < a.size * 0.45 + 0.18 && a.y < 0.35 && a.hp > 0) {
      if (player.dash > 0) {
        hitAlien(a, 4);
      } else if (powers.shield > 0) {
        hitAlien(a, 4);
        a.z += 0.35;
        sfx('electro', 0.2, 0.08);
      } else {
        hurtPlayer(a.damage);
        explodeAt(a.x, a.size * 0.4, a.z, '#7bff6a');
        a.hp = 0;
        a.gems = 0;
      }
    }
  }
  aliens = aliens.filter((a) => a.hp > 0 && a.z > 0.9 && !(Math.abs(a.x) > maxXAt(Math.max(1, a.z)) * 1.5 && Math.sign(a.x) === Math.sign(a.dirX)));
}

/** @param {Alien} a @param {number} dmg */
function hitAlien(a, dmg) {
  if (a.hp <= 0) return;
  a.hp -= dmg;
  a.hitFlash = 1;
  if (a.hp <= 0) killAlien(a);
}

/** @param {Alien} a @param {boolean} [quiet] */
function killAlien(a, quiet = false) {
  a.hp = 0;
  player.kills += 1;
  player.nuke = Math.min(1, player.nuke + 1 / KILLS_PER_NUKE);
  explodeAt(a.x, a.y + a.size * 0.4, a.z, a.type === 'tank' ? '#ffb02e' : '#7bff6a', a.size / 0.42);
  dropGems(a.x, a.z, gemsFor(a.gems), a.gems > 2 ? 1.4 : 0.3);
  const before = comboMultiplier();
  combo += 1;
  comboTime = COMBO_TIME;
  addScore(50 * (a.gems + 1), a.x, a.y + a.size, a.z, quiet ? '' : undefined);
  if (comboMultiplier() > before) {
    floatAt(player.x, 0.9, player.z, `COMBO x${comboMultiplier()}!`, '#ff7ae8', 1.5);
    sfx('turret-upgrade', 0.35);
  }
  if (pickups.length < 3) {
    const rich = a.type === 'tank';
    const roll = Math.random();
    if (roll < (rich ? 0.25 : 0.03)) dropPrize(a.x, a.z, { kind: 'power', id: rollPower({ hurt: player.hp < player.maxHp * 0.5 }) });
    else if (roll < (rich ? 0.55 : 0.065)) dropPrize(a.x, a.z, { kind: 'ammo', id: randomAmmo() });
  }
  if (!quiet) sfx('death', 0.35, 0.035);
  if (a.type === 'splitter') {
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const spread = (i - 1) * 0.45;
      addAlien('swarmer', { x: a.x + Math.cos(angle) * 0.3, z: a.z + Math.sin(angle) * 0.3 }, {
        x: a.dirX * Math.cos(spread) - a.dirZ * Math.sin(spread),
        z: a.dirX * Math.sin(spread) + a.dirZ * Math.cos(spread),
      });
    }
  }
}

/** @param {number} amount */
function hurtPlayer(amount) {
  if (player.invuln > 0 || powers.shield > 0 || state !== 'play') return;
  player.hp -= amount;
  player.invuln = 0.5;
  shake = Math.max(shake, 10 + amount * 0.4);
  sfx('wrong', 0.45, 0.15);
  if (player.hp <= 0) {
    player.hp = 0;
    state = 'dying';
    explodeAt(player.x, 0.3, player.z, '#ff8a2a', 2.5);
    sfx('nuke-explosion', 0.6);
    window.setTimeout(() => endRun(false), 1100);
  }
}

/** @param {number} dt */
function updateWeapons(dt) {
  fireIn -= dt;
  if (fireIn <= 0) {
    const slot = rack[weapon] ?? rack[0];
    const spec = AMMO[slot.id];
    fireIn = spec.gap / (1 + 0.25 * levels.rapid) / (powers.rapid > 0 ? 2 : 1) / (rig.rapid ?? 1);
    const dmg = (spec.dmg + levels.power) * (powers.energy > 0 ? 2 : 1);
    const shots = (spec.fan ?? 1) + levels.spread * 2;
    // Shots follow the line of sight through Granny, so on screen they fly straight up from her
    // instead of converging on the vanishing point in the middle.
    const lane = player.x / player.z;
    const z0 = player.z + 0.15;
    for (let i = 0; i < shots; i++) {
      const angle = (i - (shots - 1) / 2) * 0.13;
      const vz = Math.cos(angle) * spec.speed;
      bullets.push(newBullet(slot.id, lane * z0, z0, vz * lane + Math.sin(angle) * spec.speed, vz, dmg));
    }
    if (levels.side > 0) {
      const near = aliens
        .filter((a) => !isBehindHorizon(a.x, a.z) && Math.abs(a.z - player.z) < 1.4 && Math.abs(a.x - player.x) > 0.3)
        .sort((p, q) => Math.abs(p.x - player.x) - Math.abs(q.x - player.x))
        .slice(0, levels.side);
      for (const a of near) {
        const dx = a.x - player.x;
        const dz = a.z - player.z;
        const len = Math.hypot(dx, dz);
        bullets.push(newBullet(slot.id, player.x, player.z, (dx / len) * spec.speed, (dz / len) * spec.speed, dmg));
      }
    }
    sfx(spec.sound, spec.gap > 0.3 ? 0.22 : 0.08, 0.11);
    if (slot.rounds !== Infinity) {
      slot.rounds -= 1;
      if (slot.rounds <= 0) {
        rack.splice(weapon, 1);
        weapon = rack.length - 1;
        ammoPop = 0.9;
        floatAt(player.x, 0.8, player.z, `${spec.name.toUpperCase()} EMPTY`, '#ffb3b3', 0.9);
      }
    }
  }

  if (rig.bazooka) {
    bazookaIn -= dt;
    if (bazookaIn <= 0) {
      bazookaIn = rig.bazooka;
      const lane = player.x / player.z;
      const z0 = player.z + 0.15;
      bullets.push(newBullet('shark', lane * z0, z0, AMMO.shark.speed * lane, AMMO.shark.speed, 8 + levels.power));
      sfx('missile', 0.35);
    }
  }

  const pods = rocketPods();
  if (pods > 0) {
    rocketIn -= dt;
    if (rocketIn <= 0) {
      rocketIn = 2;
      const visible = aliens.filter((a) => !isBehindHorizon(a.x, a.z)).sort((p, q) => p.z - q.z);
      for (let i = 0; i < pods; i++) {
        rockets.push({ x: player.x, z: player.z, vx: (i - (pods - 1) / 2) * 2, vz: 3, life: 0, target: visible[i] ?? visible[0] ?? null });
      }
      sfx('missile', 0.3);
    }
  }

  if (levels.orbit > 0) {
    const n = levels.orbit;
    for (let i = 0; i < n; i++) {
      const angle = time * 3.2 + (i / n) * Math.PI * 2;
      const ox = player.x + Math.cos(angle) * 0.62;
      const oz = player.z + Math.sin(angle) * 0.42;
      for (const a of aliens) {
        if (a.orbitCd > 0) continue;
        if (Math.hypot(a.x - ox, a.z - oz) < 0.2 + a.size * 0.35) {
          a.orbitCd = 0.35;
          hitAlien(a, 2 + levels.power);
        }
      }
    }
  }

  const pulse = pulseLevel();
  if (pulse > 0) {
    waveIn -= dt;
    if (waveIn <= 0) {
      waveIn = Math.max(2, 4.5 - pulse * 0.5);
      waveId += 1;
      rings.push({ r: 0, max: 1 + pulse * 0.35, t: 0, id: waveId });
      sfx('electro', 0.35);
    }
  }
  for (const ring of rings) {
    ring.t += dt;
    ring.r = ring.max * Math.min(1, ring.t / 0.35);
    for (const a of aliens) {
      if (a.waveHit === ring.id) continue;
      if (Math.hypot(a.x - player.x, (a.z - player.z) * 1.4) < ring.r) {
        a.waveHit = ring.id;
        hitAlien(a, 3 + pulse);
      }
    }
  }
  rings = rings.filter((ring) => ring.t < 0.55);
}

/** Homing rockets per salvo, from level-ups and the rig's rocket pods. */
function rocketPods() {
  return levels.rockets + (rig.rockets ?? 0);
}

/** Shockwave strength, from level-ups and the rig's tesla coils. */
function pulseLevel() {
  return levels.shockwave + (rig.tesla ?? 0);
}

/** @param {number} dt */
function updateBullets(dt) {
  for (const b of bullets) {
    const spec = AMMO[b.ammo];
    b.life += dt;
    b.x += b.vx * dt;
    b.z += b.vz * dt;
    b.spin += (spec.spin ?? 0) * dt;
    const wide = spec.size * 0.35;
    const height = bulletY(b, b.z) - (spec.whirl ? spec.size * 0.5 : 0.3);
    for (const a of aliens) {
      if (a.hp <= 0) continue;
      if (spec.pull) {
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const d = Math.hypot(dx, dz);
        if (d < spec.pull && d > 0.05 && a.type !== 'tank') {
          a.x += (dx / d) * 2.4 * dt;
          a.z += (dz / d) * 2.4 * dt;
        }
      }
      if (height > a.y + a.size * 1.1) continue;
      const last = b.hits.get(a);
      if (last !== undefined && !(spec.rehit && b.life - last > spec.rehit)) continue;
      const reach = 0.08 + wide + a.size * 0.42;
      if (Math.abs(a.z - b.z) < reach && Math.abs(a.x - b.x) < reach) {
        b.hits.set(a, b.life);
        strike(b, spec, a);
        if (b.pierce > 0) b.pierce -= 1;
        else {
          b.life = 99;
          break;
        }
      }
    }
    if (b.life < 99 && !b.rise) {
      for (const d of deposits) {
        if (d.hp <= 0 || b.hits.has(d)) continue;
        if (Math.abs(d.z - b.z) < 0.25 && Math.abs(d.x - b.x) < d.def.w * 0.45 + wide) {
          b.hits.set(d, b.life);
          if (spec.splash) blast(b.x, b.z, spec.splash, b.dmg, spec.colour);
          damageDeposit(d, b.dmg);
          if (b.pierce > 0) b.pierce -= 1;
          else b.life = 99;
          break;
        }
      }
    }
    if (b.life < 99) {
      for (const s of slimes) {
        if (Math.abs(s.x - b.x) < 0.18 && Math.abs(s.z - b.z) < 0.25) {
          s.t = 99;
          b.life = 99;
        }
      }
    }
    if (b.life < 99 && b.rise && boss && !boss.dying && boss.solid >= 0.5 && Math.abs(b.x - boss.x) < 1.5 && Math.abs(b.z - boss.z) < 0.5) {
      const last = b.hits.get(boss);
      if (spec.rehit) {
        b.z = Math.min(b.z, boss.z);
        if (last === undefined || b.life - last > spec.rehit) {
          b.hits.set(boss, b.life);
          damageBoss(b.dmg);
          explodeAt(b.x, BOSS_HIT_Y, boss.z, spec.colour, 0.5);
        }
      } else {
        damageBoss(b.dmg * (spec.splash ? 1.5 : 1));
        explodeAt(b.x, BOSS_HIT_Y, boss.z, spec.colour, spec.splash ? 1.2 : 0.35);
        b.life = 99;
      }
    }
  }
  bullets = bullets.filter((b) => b.life < (AMMO[b.ammo].life ?? 1.4) && !isBehindHorizon(b.x, b.z));
  for (const z of zaps) z.life += dt;
  zaps = zaps.filter((z) => z.life < 0.18);
}

/** @param {AmmoId} ammo @param {number} x @param {number} z @param {number} vx @param {number} vz @param {number} dmg @returns {Bullet} */
function newBullet(ammo, x, z, vx, vz, dmg) {
  const overhead = boss && !boss.dying && boss.z <= BOSS_Z + 0.1;
  const rise = !!overhead && vz > 0 && Math.abs(x + (vx / vz) * (BOSS_Z - z) - boss.x) < 1.7;
  return { x, z, z0: z, vx, vz, dmg, life: 0, ammo, pierce: AMMO[ammo].pierce ?? 0, spin: Math.random() * 6, hits: new Map(), rise };
}

/** How high a shot flies at depth z: low over the ground, or climbing into the mothership. @param {Bullet} b @param {number} z */
function bulletY(b, z) {
  const spec = AMMO[b.ammo];
  const base = spec.whirl ? spec.size * 0.5 : 0.3;
  if (!b.rise) return base;
  return base + clamp((z - b.z0) / (BOSS_Z - b.z0), 0, 1) * (BOSS_HIT_Y - base);
}

/** What each kind of ammo does to the alien it hits. @param {Bullet} b @param {import('./ammo.js').AmmoType} spec @param {Alien} a */
function strike(b, spec, a) {
  if (spec.splash) blast(a.x, a.z, spec.splash, b.dmg, spec.colour);
  else hitAlien(a, b.dmg);
  if (a.hp <= 0) return;
  if (spec.slow) a.slow = spec.slow;
  if (spec.push) {
    a.z += spec.push * 0.6;
    if (a.type === 'leaper') {
      a.phase = 'walk';
      a.y = 0;
    }
  }
  if (spec.chain) chainFrom(a, spec.chain, b.dmg);
}

/** An explosion that hurts every alien nearby. @param {number} x @param {number} z @param {number} r @param {number} dmg @param {string} colour */
function blast(x, z, r, dmg, colour) {
  explodeAt(x, 0.2, z, colour, 0.6 + r);
  if (r > 1) {
    shake = Math.max(shake, 12);
    sfx('nuke-explosion', 0.3, 0.1);
  } else sfx('death', 0.25, 0.05);
  for (const a of aliens) if (a.hp > 0 && Math.hypot(a.x - x, a.z - z) < r + a.size * 0.3) hitAlien(a, dmg);
}

/** Lightning jumps from alien to alien. @param {Alien} start @param {number} jumps @param {number} dmg */
function chainFrom(start, jumps, dmg) {
  const done = new Set([start]);
  let from = start;
  for (let i = 0; i < jumps; i++) {
    let next = null;
    let nearest = 1.8;
    for (const o of aliens) {
      if (o.hp <= 0 || done.has(o) || isBehindHorizon(o.x, o.z)) continue;
      const d = Math.hypot(o.x - from.x, o.z - from.z);
      if (d < nearest) {
        nearest = d;
        next = o;
      }
    }
    if (!next) break;
    zaps.push({ a: { x: from.x, y: from.y + from.size * 0.4, z: from.z }, b: { x: next.x, y: next.y + next.size * 0.4, z: next.z }, life: 0 });
    done.add(next);
    hitAlien(next, dmg);
    from = next;
  }
}

/** @param {number} dt */
function updateRockets(dt) {
  for (const r of rockets) {
    r.life += dt;
    if (r.target && r.target.hp <= 0) r.target = aliens.find((a) => !isBehindHorizon(a.x, a.z)) ?? null;
    const tx = r.target ? r.target.x : boss ? boss.x : r.x;
    const tz = r.target ? r.target.z : boss ? boss.z : r.z + 5;
    const dx = tx - r.x;
    const dz = tz - r.z;
    const len = Math.hypot(dx, dz) || 1;
    r.vx += ((dx / len) * 7 - r.vx) * Math.min(1, dt * 4);
    r.vz += ((dz / len) * 7 - r.vz) * Math.min(1, dt * 4);
    r.x += r.vx * dt;
    r.z += r.vz * dt;
    if (len < 0.25) {
      r.life = 99;
      sfx('death', 0.3, 0.05);
      if (!r.target && boss && Math.abs(boss.x - r.x) < 1.5) {
        damageBoss(4 + rocketPods());
        explodeAt(r.x, BOSS_HIT_Y, r.z, '#ff7ae8', 0.9);
      } else {
        explodeAt(r.x, 0.2, r.z, '#ff7ae8', 0.9);
        for (const a of aliens) if (Math.hypot(a.x - r.x, a.z - r.z) < 0.55) hitAlien(a, 3 + rocketPods() + levels.power);
      }
    }
  }
  rockets = rockets.filter((r) => r.life < 3);
}

/** @param {number} dt */
function updateSlimes(dt) {
  for (const s of slimes) {
    s.t += dt;
    const p = Math.min(1, s.t / s.flight);
    s.x = s.fromX + (s.toX - s.fromX) * p;
    s.z = s.fromZ + (s.toZ - s.fromZ) * p;
    if (p >= 1 && s.t < 99) {
      s.t = 99;
      if (Math.hypot(s.x - player.x, s.z - player.z) < 0.35 && player.dash <= 0) {
        if (s.chill && powers.shield <= 0) player.chill = 2.5;
        hurtPlayer(8);
      }
      explodeAt(s.x, 0.05, s.z, SPLAT[s.kind] ?? '#9dff3a', 0.5);
    }
  }
  slimes = slimes.filter((s) => s.t < 99);
  player.chill = Math.max(0, player.chill - dt);
}

/** Splash colour when each alien shot lands. @type {Partial<Record<Slime['kind'], string>>} */
const SPLAT = { 'alien-lava': '#ff7a1a', 'alien-urchin': '#8ae8ff', 'alien-skull': '#7bff6a', 'alien-tentacle': '#d05aff', 'alien-eye': '#ffd23a', 'alien-worm': '#d05aff' };

/** @param {number} dt */
function updateGems(dt) {
  const magnet = powers.magnet > 0;
  for (const g of gems) {
    g.t += dt;
    g.x += g.vx * dt;
    g.z += g.vz * dt;
    g.vx *= 1 - Math.min(1, dt * 4);
    g.vz *= 1 - Math.min(1, dt * 4);
    g.z -= rollIn(g.z) * dt;
    const dx = player.x - g.x;
    const dz = player.z - g.z;
    const dist = Math.hypot(dx, dz) || 1;
    if (magnet && !isBehindHorizon(g.x, g.z)) {
      g.x += (dx / dist) * 7 * dt;
      g.z += (dz / dist) * 7 * dt;
    } else if (dist < MAGNET_RANGE) {
      const pull = 3 + (MAGNET_RANGE - dist) * 8;
      g.x += (dx / dist) * pull * dt;
      g.z += (dz / dist) * pull * dt;
    }
    if (dist < 0.22) {
      g.t = 999;
      player.crystals += g.def.value;
      score += 10 * g.def.value;
      sfx('core-collect', 0.25, 0.04);
    }
  }
  gems = gems.filter((g) => g.t < 25 && g.z > 0.9);
  if (player.crystals >= crystalsForLevel(player.level)) levelUp();
}

/** Ground things drift towards Granny, and anything out of her reach slides in faster. @param {number} z */
function rollIn(z) {
  return GROUND_DRIFT + Math.max(0, z - Z_MAX) * 0.4;
}

/** @param {number} x @param {number} z @param {typeof GEMS[number][]} defs @param {number} spread */
function dropGems(x, z, defs, spread) {
  for (const def of defs) {
    const angle = Math.random() * Math.PI * 2;
    const kick = spread * (0.4 + Math.random() * 0.6);
    gems.push({ x, z, vx: Math.cos(angle) * kick, vz: Math.sin(angle) * kick * 0.6, def, t: Math.random() });
  }
}

/** @returns {AmmoId} */
function randomAmmo() {
  const id = CRATE_AMMO[Math.floor(Math.random() * CRATE_AMMO.length)];
  return id === 'nuke' && Math.random() < 0.5 ? randomAmmo() : id;
}

/** @param {number} x @param {number} z @param {Prize} prize */
function dropPrize(x, z, prize) {
  const reach = maxXAt(Math.max(1, z)) * 0.85;
  pickups.push({ ...prize, x: clamp(x, -reach, reach), z, t: 0 });
}

/** @param {number} dt */
function updatePickups(dt) {
  for (const p of pickups) {
    p.t += dt;
    p.z -= rollIn(p.z) * dt;
    if (Math.hypot(p.x - player.x, (p.z - player.z) * 1.3) < 0.36) {
      p.t = 99;
      if (p.kind === 'ammo') addAmmo(p.id);
      else applyPower(p.id);
    }
  }
  pickups = pickups.filter((p) => p.t < PICKUP_LIFE && p.z > 1);
}

/** @param {number} dt */
function updateDeposits(dt) {
  depositIn -= dt;
  if (depositIn <= 0 && deposits.length < 2 && clock < BOSS_TIME) {
    depositIn = 12 + Math.random() * 8;
    const prizes = DEPOSITS.filter((d) => d.prize);
    const plain = DEPOSITS.filter((d) => !d.prize);
    const def = depositsSeen === 0 ? DEPOSITS[1] : Math.random() < 0.22 ? prizes[Math.floor(Math.random() * prizes.length)] : plain[Math.floor(Math.random() * plain.length)];
    const z = 7 + Math.random() * 2;
    deposits.push({ def, x: (Math.random() - 0.5) * 1.3 * maxXAt(z), z, hp: def.hp, hitFlash: 0 });
    depositsSeen += 1;
  }
  for (const d of deposits) {
    d.z -= rollIn(d.z) * 0.6 * dt;
    d.hitFlash = Math.max(0, d.hitFlash - dt * 6);
    if (player.dash > 0 && d.hp > 0 && Math.abs(d.x - player.x) < d.def.w * 0.5 && Math.abs(d.z - player.z) < 0.3) damageDeposit(d, 999);
  }
  deposits = deposits.filter((d) => d.hp > 0 && d.z > 0.9);
}

/** @param {typeof deposits[number]} d @param {number} dmg */
function damageDeposit(d, dmg) {
  if (d.hp <= 0) return;
  d.hp -= dmg;
  d.hitFlash = 1;
  if (d.hp > 0) return;
  explodeAt(d.x, 0.25, d.z, d.def.colour, 1.6);
  explodeAt(d.x, 0.4, d.z, '#ffffff', 0.8);
  dropGems(d.x, d.z, gemsFor(d.def.crystals), 1.6);
  addScore(d.def.prize ? 1000 : 250, d.x, 0.6, d.z, d.def.colour);
  sfx('core-earned', 0.45);
  if (d.def.prize) {
    dropPrize(d.x - 0.25, d.z, { kind: 'power', id: rollPower({ hurt: player.hp < player.maxHp * 0.5 }) });
    dropPrize(d.x + 0.25, d.z, { kind: 'ammo', id: randomAmmo() });
  } else dropPrize(d.x, d.z, { kind: 'ammo', id: randomAmmo() });
}

/** @param {AmmoId} id */
function addAmmo(id) {
  const spec = AMMO[id];
  let slot = rack.findIndex((s) => s.id === id);
  if (slot < 0) {
    if (rack.length > RACK_SLOTS) {
      let fewest = 1;
      for (let i = 2; i < rack.length; i++) if (rack[i].rounds < rack[fewest].rounds) fewest = i;
      rack.splice(fewest, 1);
    }
    rack.push({ id, rounds: 0 });
    slot = rack.length - 1;
  }
  rack[slot].rounds = Math.min(spec.rounds * 2, rack[slot].rounds + spec.rounds);
  weapon = slot;
  ammoPop = 0.9;
  fireIn = Math.min(fireIn, 0.1);
  floatAt(player.x, 0.95, player.z, `${spec.name.toUpperCase()}!`, spec.colour, 1.25);
  sfx('turret-upgrade', 0.45);
}

function noPowers() {
  return { boost: 0, shield: 0, magnet: 0, energy: 0, rapid: 0, radar: 0 };
}

/** @param {PowerId} id */
function applyPower(id) {
  const spec = POWERS[id];
  sfx('core-earned', 0.5);
  if (id === 'mystery') {
    floatAt(player.x, 1.25, player.z, 'MYSTERY BOX…', spec.colour, 0.9);
    applyPower(rollPower({ mystery: true }));
    return;
  }
  floatAt(player.x, 0.95, player.z, spec.name, spec.colour, 1.35);
  if (id === 'nuke') player.nuke = 1;
  else if (id === 'health') player.hp = Math.min(player.maxHp, player.hp + 40);
  else if (id === 'crystal') player.crystals = Math.max(player.crystals, crystalsForLevel(player.level));
  else if (id === 'coins') {
    dropGems(player.x, player.z + 0.6, [...Array(14).fill(GEMS[2]), GEMS[1], GEMS[1], GEMS[0], GEMS[0]], 2.4);
    addScore(500);
  } else if (id === 'cupcakes') {
    const visible = aliens.filter((a) => !isBehindHorizon(a.x, a.z)).sort((p, q) => p.z - q.z);
    for (let i = 0; i < 10; i++) {
      rockets.push({ x: player.x, z: player.z, vx: (i - 4.5) * 0.9, vz: 3, life: 0, target: visible[i % Math.max(1, visible.length)] ?? null });
    }
    sfx('missile', 0.5);
  } else if (id in powers) powers[/** @type {keyof typeof powers} */ (id)] = spec.time ?? 0;
}

/** @param {number} dt */
function updatePowers(dt) {
  for (const id of /** @type {(keyof typeof powers)[]} */ (Object.keys(powers))) powers[id] = Math.max(0, powers[id] - dt);
  comboTime -= dt;
  if (comboTime <= 0) combo = 0;
  ammoPop = Math.max(0, ammoPop - dt);
}

function comboMultiplier() {
  return Math.min(8, 1 + Math.floor(combo / 10));
}

/**
 * Points, multiplied by the combo. With a position, they float up from there too.
 * @param {number} points @param {number} [x] @param {number} [y] @param {number} [z] @param {string} [colour] '' for no floating number.
 */
function addScore(points, x, y = 0, z = 0, colour) {
  const total = points * comboMultiplier();
  score += total;
  if (x === undefined || colour === '') return;
  const mult = comboMultiplier();
  floatAt(x, y, z, `+${total.toLocaleString()}`, colour ?? ['#fff3c4', '#ffe27a', '#ffb02e', '#ff7ae8', '#c78bff', '#5ae0ff', '#7bff6a', '#ff5a5a'][mult - 1], Math.min(1.1, 0.55 + total / 2000));
}

/** @param {number} x @param {number} y @param {number} z @param {string} text @param {string} colour @param {number} size */
function floatAt(x, y, z, text, colour, size) {
  const at = project(x, y, z);
  floaters.push({ text, x: at.x, y: at.y, life: 0, max: size > 1 ? 1.4 : 0.9, colour, size });
  if (floaters.length > 40) floaters.shift();
}

/** @param {number} dt */
function updateFloaters(dt) {
  for (const f of floaters) {
    f.life += dt;
    f.y -= (f.size > 1 ? 40 : 70) * dt;
  }
  floaters = floaters.filter((f) => f.life < f.max);
}

/** @param {number} dt */
function updateBoss(dt) {
  const b = /** @type {NonNullable<typeof boss>} */ (boss);
  b.t += dt;
  b.hitFlash = Math.max(0, b.hitFlash - dt * 8);
  if (b.dying > 0) {
    b.dying += dt;
    if (Math.random() < 0.6) explodeAt(b.x + (Math.random() - 0.5) * 2.6, 1 + Math.random() * 1.2, b.z, Math.random() < 0.5 ? '#ffd23a' : '#ff5a3a', 1.2);
    if (b.dying > 2.6) {
      boss = null;
      endRun(true);
    }
    return;
  }
  if (b.z > BOSS_Z) {
    b.z = Math.max(BOSS_Z, b.z - 2.2 * dt);
    return;
  }
  const def = region.boss;
  b.x = Math.sin(b.t * def.sway) * maxXAt(BOSS_Z) * 0.55;
  const angry = b.hp < def.hp / 2;
  if (def.phase) {
    const want = Math.sin(b.t * 1.1) > -0.25 ? 1 : 0;
    b.solid += Math.sign(want - b.solid) * Math.min(Math.abs(want - b.solid), dt * 3);
  }
  b.fireIn -= dt;
  if (b.fireIn <= 0) {
    b.fireIn = def.fire[angry ? 1 : 0];
    const shots = def.volley[angry ? 1 : 0];
    for (let i = 0; i < shots; i++) {
      const o = (i - (shots - 1) / 2) * def.spread;
      lob(angry ? def.angryShot : def.shot, b.x, b.z, player.x + o, player.z, { flight: 1.5, y0: BOSS_HIT_Y, chill: def.chill });
    }
    sfx('slime', 0.4);
  }
  if (def.rain) {
    b.rainIn -= dt;
    if (b.rainIn <= 0) {
      b.rainIn = angry ? 0.35 : 0.65;
      const x = player.x + (Math.random() - 0.5) * 2.6;
      const z = clamp(player.z + (Math.random() - 0.35) * 1.4, Z_MIN, Z_MAX + 0.5);
      lob('alien-lava', x, z, x, z, { flight: 1.1, y0: 4, arc: 0 });
    }
  }
  b.dropIn -= dt;
  if (b.dropIn <= 0) {
    b.dropIn = def.drop.gap * (angry ? 0.66 : 1);
    const count = Math.ceil(def.drop.count * (angry ? 1.5 : 1));
    for (let i = 0; i < count; i++) addAlien(def.drop.type, { x: b.x + (Math.random() - 0.5) * 2, z: b.z - 0.5 });
  }
}

/**
 * An alien shot lobbed through the air.
 * @param {Slime['kind']} kind @param {number} fromX @param {number} fromZ @param {number} toX @param {number} toZ
 * @param {{ flight: number, y0?: number, arc?: number, chill?: boolean }} opts `y0` is the launch height, `arc` how high it loops.
 */
function lob(kind, fromX, fromZ, toX, toZ, { flight, y0 = 0, arc = 1.1, chill = false }) {
  slimes.push({ x: fromX, z: fromZ, fromX, fromZ, toX, toZ, t: 0, flight, kind, y0, arc, chill });
}

/** @param {number} amount */
function damageBoss(amount) {
  if (!boss || boss.dying || boss.z > BOSS_Z + 0.1 || boss.solid < 0.5) return;
  boss.hp -= amount;
  boss.hitFlash = 1;
  if (boss.hp <= 0) {
    boss.hp = 0;
    boss.dying = 0.001;
    boss.solid = 1;
    addScore(5000, boss.x, 1.2, boss.z, '#ffe27a');
    slimes = [];
    for (const a of aliens) killAlien(a, true);
    flash = 1;
    shake = 30;
    sfx('nuke-explosion', 0.7);
    showBanner(`${region.boss.name.toUpperCase()} DOWN!`);
  }
}

/** @param {number} x @param {number} y @param {number} z @param {string} colour @param {number} [size] */
function explodeAt(x, y, z, colour, size = 1) {
  const at = project(x, y, z);
  const s = Math.min(1.6, at.s * 1.4) * size;
  const n = Math.round(8 + 16 * Math.min(1, s));
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2;
    const v = (60 + Math.random() * 240) * Math.max(0.3, s);
    particles.push({ x: at.x, y: at.y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v - 50, life: 0, max: 0.35 + Math.random() * 0.4, colour: Math.random() < 0.3 ? '#fff6c0' : colour, size: (3 + Math.random() * 6) * Math.max(0.35, s) });
  }
}

/** @param {number} dt */
function updateParticles(dt) {
  for (const p of particles) {
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 420 * dt;
    p.vx *= 1 - dt * 1.5;
  }
  particles = particles.filter((p) => p.life < p.max);
  if (particles.length > 1500) particles.splice(0, particles.length - 1500);
}

/**
 * Exhaust sparks, tyre smoke and skid marks. New ones only appear while Granny is driving.
 * @param {number} dt @param {boolean} driving
 */
function updateExhaust(dt, driving) {
  if (driving) {
    const ground = project(player.x, 0, player.z);
    const w = 0.42 * view.unit * ground.s;
    const lean = clamp(player.vx / player.speed, -1, 1);
    const pace = Math.min(1, Math.hypot(player.vx, player.vz) / player.speed);
    const pipes = exhaustPoints(ground.x, ground.y, w, lean, rig);
    sparkIn -= dt * (player.dash > 0 ? 220 : 26 + 40 * pace);
    while (sparkIn <= 0) {
      sparkIn += 1;
      const pipe = pipes[Math.random() < 0.5 ? 0 : 1];
      const hot = player.dash > 0 ? 1.6 : 1;
      sparks.push({
        x: pipe.x + (Math.random() - 0.5) * w * 0.08, y: pipe.y,
        vx: (Math.random() - 0.5) * w * 2.4 - player.vx * w * 0.6, vy: (0.6 + Math.random() * 1.8) * w * 1.6 * hot,
        life: 0, max: 0.2 + Math.random() * 0.4, w,
      });
    }

    if (skid > 0.2) {
      for (const side of [-1, 1]) {
        if (Math.random() < dt * 34 * skid) {
          smoke.push({ x: player.x + side * WHEEL_X, y: 0.02, z: player.z, vx: -player.vx * 0.15 + (Math.random() - 0.5) * 0.3, r: 0.05 + Math.random() * 0.04, life: 0, max: 0.9 + Math.random() * 0.6 });
        }
      }
    }
    if (skid > 0.25) {
      if (markFrom) {
        for (const side of [-1, 1]) {
          marks.push({ x1: markFrom.x + side * WHEEL_X, z1: markFrom.z, x2: player.x + side * WHEEL_X, z2: player.z, life: 0 });
        }
      }
      markFrom = { x: player.x, z: player.z };
    } else markFrom = null;
  }

  for (const s of sparks) {
    s.life += dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vy += s.w * 5 * dt;
    s.vx *= 1 - dt * 2;
  }
  sparks = sparks.filter((s) => s.life < s.max);
  for (const p of smoke) {
    p.life += dt;
    p.x += p.vx * dt;
    p.z -= GROUND_DRIFT * dt;
    p.y += 0.12 * dt;
    p.r += 0.22 * dt;
    p.vx *= 1 - dt * 1.5;
  }
  smoke = smoke.filter((p) => p.life < p.max && p.z > 0.9);
  if (smoke.length > 160) smoke.splice(0, smoke.length - 160);
  for (const m of marks) m.life += dt;
  marks = marks.filter((m) => m.life < MARK_LIFE && m.z2 > 1);
  if (marks.length > 900) marks.splice(0, marks.length - 900);
}

/* ---------- Drawing ---------- */

function draw() {
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  if (state === 'warp') drawWarp();
  else drawPlanet();
  ctx.restore();
  if (arch && state !== 'warp') drawFrame(arch);
  if (state === 'play' || state === 'levelup' || state === 'dying') drawHud();
  if (flash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${flash})`;
    ctx.fillRect(0, 0, view.w, view.h);
  }
}

/** Seconds the hijacked mothership takes to shrink into the vanishing point, then the whole jump's length. */
const WARP_FLY = 2.5;
const WARP_END = 3.4;

/** @param {string} inner @param {string} outer */
function puffSprite(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (!g) return c;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.55, outer);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}
const smokePuff = puffSprite('rgba(235, 238, 245, 0.9)', 'rgba(170, 176, 190, 0.45)');
const enginePuff = puffSprite('rgba(220, 255, 240, 1)', 'rgba(60, 230, 200, 0.5)');

/** The hijacked mothership flies away from us: up from below the screen and shrinking into the vanishing point. */
function warpShip() {
  const p = Math.min(1, warpTime / WARP_FLY);
  const s = 1 / (0.55 + 40 * p * p * p);
  const w = Math.min(view.w * 0.7, view.h) * s;
  return {
    x: view.cx + Math.sin(warpTime * 2.6) * view.w * 0.03 * s,
    y: view.h / 2 + view.h * 0.7 * s,
    w,
    h: w * 0.52,
    gone: p >= 1,
  };
}

/** @param {number} dt */
function updateWarpSmoke(dt) {
  for (const puff of warpSmoke) {
    puff.life += dt;
    puff.r += puff.r * 0.55 * dt;
    puff.x += puff.vx * dt;
    puff.y += puff.vy * dt;
  }
  warpSmoke = warpSmoke.filter((puff) => puff.life < puff.max);
  const ship = warpShip();
  if (ship.gone) return;
  const tail = { x: ship.x, y: ship.y + ship.h * 0.18 };
  const from = warpTrailEnd ?? tail;
  const r = ship.w * 0.22;
  const gap = Math.max(2, r * 0.25);
  const steps = Math.min(40, Math.ceil(Math.hypot(tail.x - from.x, tail.y - from.y) / gap));
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    const x = from.x + (tail.x - from.x) * k + (Math.random() - 0.5) * r * 0.9;
    const y = from.y + (tail.y - from.y) * k + (Math.random() - 0.5) * r * 0.4;
    warpSmoke.push({
      x, y, r: r * (0.6 + Math.random() * 0.7), life: 0, max: 1.8 + Math.random() * 1.2,
      vx: (x - view.cx) * 0.35 + (Math.random() - 0.5) * r * 1.6, vy: (y - view.h / 2) * 0.12 + (Math.random() - 0.5) * r * 0.4,
    });
  }
  warpTrailEnd = tail;
  if (warpSmoke.length > 700) warpSmoke.splice(0, warpSmoke.length - 700);
}

function drawWarpSmoke() {
  for (const puff of warpSmoke) {
    const fade = 1 - puff.life / puff.max;
    ctx.globalAlpha = 0.45 * fade * Math.min(1, puff.life * 8);
    ctx.drawImage(smokePuff, puff.x - puff.r, puff.y - puff.r, puff.r * 2, puff.r * 2);
  }
  ctx.globalCompositeOperation = 'lighter';
  for (const puff of warpSmoke) {
    if (puff.life > 0.25) continue;
    ctx.globalAlpha = 0.6 * (1 - puff.life / 0.25);
    const r = puff.r * 0.7;
    ctx.drawImage(enginePuff, puff.x - r, puff.y - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

function drawWarpShip() {
  const ship = warpShip();
  if (ship.gone) {
    const t = (warpTime - WARP_FLY) / 0.4;
    if (t > 1) return;
    const size = view.h * 0.12 * Math.sin(t * Math.PI);
    ctx.save();
    ctx.translate(view.cx, view.h / 2);
    ctx.rotate(t * 1.2);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(200, 255, 235, 0.9)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      ctx.lineWidth = i % 2 ? 2 : 3.5;
      const len = i % 2 ? size * 0.55 : size;
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, len);
      ctx.stroke();
    }
    ctx.drawImage(enginePuff, -size * 0.4, -size * 0.4, size * 0.8, size * 0.8);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ship.w * 0.45;
  ctx.globalAlpha = 0.7 + Math.sin(warpTime * 30) * 0.15;
  ctx.drawImage(enginePuff, ship.x - glow, ship.y + ship.h * 0.15 - glow * 0.6, glow * 2, glow * 1.2);
  ctx.restore();
  if (!hijackedShip.complete || !hijackedShip.naturalWidth) return;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(Math.sin(warpTime * 2.3) * 0.06);
  ctx.drawImage(hijackedShip, -ship.w / 2, -ship.h / 2, ship.w, ship.h);
  ctx.restore();
}

function drawWarp() {
  const speed = Math.min(1, warpTime / 2.2);
  ctx.fillStyle = `rgba(4, 2, 16, ${Math.min(1, 0.3 + warpTime * 1.2)})`;
  ctx.fillRect(0, 0, view.w, view.h);
  const reach = Math.max(view.w, view.h) * 0.09;
  for (const s of stars) {
    const before = s.z;
    s.z -= (0.15 + speed * 2.4) / 60;
    if (s.z <= 0.02) Object.assign(s, { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: 1 });
    ctx.strokeStyle = `rgba(${180 + 75 * speed}, ${200 + 55 * speed}, 255, ${0.5 + 0.5 * speed})`;
    ctx.lineWidth = 1 + 2.5 * speed * (1 - s.z);
    ctx.beginPath();
    ctx.moveTo(view.cx + (s.x / before) * reach, view.h / 2 + (s.y / before) * reach);
    ctx.lineTo(view.cx + (s.x / s.z) * reach, view.h / 2 + (s.y / s.z) * reach);
    ctx.stroke();
  }
  drawWarpSmoke();
  drawWarpShip();
  ctx.font = `${Math.round(view.h * 0.07)}px Bangers, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgba(255, 230, 120, ${Math.min(1, warpTime * 1.5) * (warpTime > 2.8 ? Math.max(0, 1 - (warpTime - 2.8) * 2) : 1)})`;
  ctx.fillText(region === REGIONS[0] ? 'LIGHTYEAR JUMP!' : `TO ${region.title.toUpperCase()}!`, view.cx, view.h * 0.18);
  if (warpTime > 3) {
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, (warpTime - 3) * 2.5)})`;
    ctx.fillRect(0, 0, view.w, view.h);
  }
}

function drawPlanet() {
  drawSky();
  drawMountains();

  /** @type {{ z: number, behind: boolean, draw: () => void }[]} */
  const list = [];
  for (const p of props) list.push({ z: p.z, behind: isBehindHorizon(p.x, p.z), draw: () => drawProp(p) });
  for (const a of aliens) list.push({ z: a.z, behind: isBehindHorizon(a.x, a.z), draw: () => drawAlien(a) });
  for (const d of deposits) list.push({ z: d.z, behind: isBehindHorizon(d.x, d.z), draw: () => drawDeposit(d) });
  for (const p of pickups) list.push({ z: p.z, behind: isBehindHorizon(p.x, p.z), draw: () => drawPickup(p) });
  for (const g of gems) list.push({ z: g.z, behind: isBehindHorizon(g.x, g.z), draw: () => drawGem(g) });
  for (const b of bullets) list.push({ z: b.z, behind: false, draw: () => drawBullet(b) });
  for (const r of rockets) list.push({ z: r.z, behind: false, draw: () => drawRocket(r) });
  for (const s of slimes) list.push({ z: s.z, behind: false, draw: () => drawSlime(s) });
  if (boss) list.push({ z: boss.z, behind: isBehindHorizon(boss.x, boss.z), draw: drawBoss });
  if (state !== 'dying' && state !== 'lost') list.push({ z: player.z, behind: false, draw: drawPlayer });
  for (const p of smoke) list.push({ z: p.z - 0.01, behind: false, draw: () => drawSmoke(p) });
  list.sort((p, q) => q.z - p.z);

  for (const item of list) if (item.behind) item.draw();
  drawGround();
  for (const item of list) if (!item.behind) item.draw();
  drawZaps();
  drawParticles();
  drawSparks();
  drawFloaters();
}

function drawZaps() {
  if (!zaps.length) return;
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineJoin = 'round';
  for (const z of zaps) {
    const a = project(z.a.x, z.a.y, z.a.z);
    const b = project(z.b.x, z.b.y, z.b.z);
    const fade = 1 - z.life / 0.18;
    for (const [width, colour] of [[7, `rgba(90, 200, 255, ${0.5 * fade})`], [2.5, `rgba(240, 250, 255, ${fade})`]]) {
      ctx.strokeStyle = /** @type {string} */ (colour);
      ctx.lineWidth = /** @type {number} */ (width);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      for (let i = 1; i < 6; i++) {
        const t = i / 6;
        ctx.lineTo(a.x + (b.x - a.x) * t + (Math.random() - 0.5) * 18, a.y + (b.y - a.y) * t + (Math.random() - 0.5) * 18);
      }
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

function drawFloaters() {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of floaters) {
    const pop = f.life < 0.12 ? 0.6 + f.life / 0.12 * 0.6 : f.life < 0.22 ? 1.2 - (f.life - 0.12) * 2 : 1;
    ctx.globalAlpha = Math.min(1, (f.max - f.life) / 0.3);
    ctx.font = `${Math.round(Math.max(16, view.h * 0.034) * f.size * pop)}px Bangers, sans-serif`;
    outlineText(f.text, f.x, f.y, f.colour);
  }
  ctx.globalAlpha = 1;
}

/** @param {{ x: number, y: number, z: number, r: number, life: number, max: number }} p */
function drawSmoke(p) {
  const at = project(p.x, p.y, p.z);
  const r = p.r * view.unit * at.s;
  const a = 0.42 * (1 - p.life / p.max) * Math.min(1, p.life * 8);
  const puff = ctx.createRadialGradient(at.x, at.y - r * 0.3, 0, at.x, at.y - r * 0.3, r);
  puff.addColorStop(0, `rgba(236, 214, 200, ${a})`);
  puff.addColorStop(0.6, `rgba(190, 150, 135, ${a * 0.6})`);
  puff.addColorStop(1, 'rgba(160, 110, 100, 0)');
  ctx.fillStyle = puff;
  ctx.beginPath();
  ctx.arc(at.x, at.y - r * 0.3, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawSparks() {
  if (!sparks.length) return;
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const s of sparks) {
    const f = s.life / s.max;
    ctx.strokeStyle = f < 0.3 ? 'rgba(255, 250, 220, 0.95)' : f < 0.65 ? 'rgba(255, 200, 70, 0.85)' : `rgba(255, 110, 30, ${0.8 * (1 - f) / 0.35})`;
    ctx.lineWidth = Math.max(1, s.w * 0.014 * (1 - f * 0.5));
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - s.vx * 0.025, s.y - s.vy * 0.025);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ctx.globalCompositeOperation = 'source-over';
}

function drawSky() {
  if (backdrop) {
    drawBackdrop(backdrop);
    return;
  }
  const [high, mid, low] = region.palette.sky;
  const dusk = ctx.createLinearGradient(0, 0, 0, view.h * 0.6);
  dusk.addColorStop(0, high);
  dusk.addColorStop(0.55, mid);
  dusk.addColorStop(1, low);
  ctx.fillStyle = dusk;
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  for (const s of skyStars) {
    ctx.globalAlpha = 0.4 + 0.4 * Math.sin(time * 2 + s.x * 40);
    ctx.fillRect(s.x * view.w, s.y * view.h * 0.3, s.r, s.r);
  }
  ctx.globalAlpha = 1;
  drawSkyLayers(ctx, sky, time);
}

/**
 * The far wall, fitted to the space above the floor and repeated in mirrored copies so the
 * original sits in the middle. It slides gently as Granny drives.
 * @param {HTMLImageElement} img
 */
function drawBackdrop(img) {
  ctx.fillStyle = region.palette.sky[1];
  ctx.fillRect(0, 0, view.w, view.h);
  if (!img.complete || !img.naturalWidth) return;
  const floor = horizonY(view.cx) + 6;
  drawMirrored(img, floor, Math.max(floor / 0.86, view.w / 3.2 / (img.naturalWidth / img.naturalHeight)), 0.12);
  const dim = region.dim ?? 0;
  if (dim > 0) {
    const shade = ctx.createLinearGradient(0, 0, 0, floor);
    shade.addColorStop(0, `rgba(8, 4, 24, ${Math.min(0.85, dim * 1.3)})`);
    shade.addColorStop(1, `rgba(8, 4, 24, ${dim * 0.8})`);
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, view.w, floor);
  }
}

/**
 * A distant painted landscape standing on the horizon in place of the mountains, with the sky
 * showing through above it.
 * @param {HTMLImageElement} img
 */
function drawSkyline(img) {
  if (!img.complete || !img.naturalWidth) return;
  drawMirrored(img, horizonY(0) + 4, view.h * 0.3, 0.2);
}

/**
 * Paints `img` side by side across the screen, every other copy flipped so the joins match,
 * with one unflipped copy centred.
 * @param {HTMLImageElement} img @param {number} bottom @param {number} h
 * @param {number} depth how much it slides as Granny drives
 */
function drawMirrored(img, bottom, h, depth) {
  const w = h * (img.naturalWidth / img.naturalHeight);
  const top = bottom - h;
  const left = view.cx - w / 2 - mountainSlide(sky, depth) * view.w;
  const first = Math.floor(-left / w) - 1;
  for (let i = first; left + i * w < view.w; i++) {
    const x = left + i * w;
    if (i % 2 === 0) {
      ctx.drawImage(img, x, top, w, h);
    } else {
      ctx.save();
      ctx.translate(x + w, top);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, w, h);
      ctx.restore();
    }
  }
}

/** Source rows of a frame, as fractions of its height: above TOP is the arch, below BOTTOM the corner pieces. */
const FRAME_TOP = 0.43;
const FRAME_BOTTOM = 0.8;
/** The frame's centrepiece: half its width and its height, as fractions of the frame. */
const FRAME_KEY_W = 0.19;
const FRAME_KEY_H = 0.3;
/** @type {WeakMap<HTMLImageElement, HTMLCanvasElement>} */
const frameKeys = new WeakMap();

/**
 * Lays the frame over the battlefield. Its left and right halves are pinned to the screen edges and
 * overlap in the middle on narrower screens, with the centrepiece pasted back over the join. On tall
 * screens the plain middle stretch of the side columns is pulled taller to reach the bottom.
 * @param {HTMLImageElement} img
 */
function drawFrame(img) {
  if (!img.complete || !img.naturalWidth) return;
  const fw = img.naturalWidth;
  const fh = img.naturalHeight;
  const half = fw / 2;
  const s = clamp(view.h / fh, view.w / fw, view.w / (fw * 0.635));
  const sv = Math.min(s * 1.25, view.h / fh);
  const top = fh * FRAME_TOP;
  const bottom = fh * FRAME_BOTTOM;
  const bands = [
    [0, top, 0, top * sv],
    [top, bottom, top * sv, view.h - (fh - bottom) * sv],
    [bottom, fh, view.h - (fh - bottom) * sv, view.h],
  ];
  for (const side of [0, 1]) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(side ? view.cx : 0, 0, view.cx, view.h);
    ctx.clip();
    for (const [sy0, sy1, dy0, dy1] of bands) {
      ctx.drawImage(img, side * half, sy0, half, sy1 - sy0, side ? view.w - half * s : 0, dy0, half * s, dy1 - dy0 + 0.5);
    }
    ctx.restore();
  }
  let keyH = fh * FRAME_KEY_H * sv;
  if (half * s > view.cx + 1) {
    const key = frameKey(img);
    const shrink = Math.min(1, (view.w * 0.5) / (key.width * s));
    keyH = key.height * sv * shrink;
    const kw = key.width * s * shrink;
    ctx.drawImage(key, view.cx - kw / 2, 0, kw, keyH);
  }
  frameHudTop = keyH * 0.85;
}

/**
 * The frame's centrepiece on its own, faded out at the left and right so it blends over the join.
 * @param {HTMLImageElement} img
 */
function frameKey(img) {
  let key = frameKeys.get(img);
  if (key) return key;
  const w = Math.round(img.naturalWidth * FRAME_KEY_W * 2);
  const h = Math.round(img.naturalHeight * FRAME_KEY_H);
  key = document.createElement('canvas');
  key.width = w;
  key.height = h;
  const k = /** @type {CanvasRenderingContext2D} */ (key.getContext('2d'));
  k.drawImage(img, (img.naturalWidth - w) / 2, 0, w, h, 0, 0, w, h);
  k.globalCompositeOperation = 'destination-in';
  const fade = k.createLinearGradient(0, 0, w, 0);
  fade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  fade.addColorStop(0.12, '#000');
  fade.addColorStop(0.88, '#000');
  fade.addColorStop(1, 'rgba(0, 0, 0, 0)');
  k.fillStyle = fade;
  k.fillRect(0, 0, w, h);
  frameKeys.set(img, key);
  return key;
}

function drawMountains() {
  if (backdrop) return;
  if (skyline) {
    drawCloudBand(ctx, sky, 0, time);
    drawCloudBand(ctx, sky, 1, time);
    drawSkyline(skyline);
    return;
  }
  const [far, near] = region.palette.mountains;
  const layers = [
    { colour: far, height: 0.11, freq: 1.4, drift: 0.004, depth: 0.2 },
    { colour: near, height: 0.07, freq: 2.3, drift: 0.008, depth: 0.4 },
  ];
  layers.forEach((layer, i) => {
    drawCloudBand(ctx, sky, i, time);
    const shift = mountainSlide(sky, layer.depth);
    ctx.fillStyle = layer.colour;
    ctx.beginPath();
    ctx.moveTo(0, horizonY(0) + 4);
    for (let x = 0; x <= view.w + 12; x += 12) {
      const u = x / view.w + time * layer.drift - shift;
      const peak = 0.5 + 0.3 * Math.sin(u * 9 * layer.freq) + 0.2 * Math.sin(u * 23 * layer.freq + 1.3);
      ctx.lineTo(x, horizonY(x) - view.h * layer.height * peak);
    }
    ctx.lineTo(view.w, horizonY(view.w) + 4);
    ctx.closePath();
    ctx.fill();
  });
}

function drawGround() {
  const top = horizonY(view.cx);
  const [near, mid, far] = region.palette.ground;
  const ground = ctx.createLinearGradient(0, top, 0, view.h);
  ground.addColorStop(0, near);
  ground.addColorStop(0.25, mid);
  ground.addColorStop(1, far);
  ctx.fillStyle = ground;
  ctx.beginPath();
  ctx.moveTo(0, view.h);
  for (let x = 0; x <= view.w + 10; x += 10) ctx.lineTo(x, horizonY(x));
  ctx.lineTo(view.w, view.h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = `${region.palette.rim}cc`;
  ctx.lineWidth = 3;
  ctx.shadowColor = region.palette.rim;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  for (let x = 0; x <= view.w + 10; x += 10) ctx[x ? 'lineTo' : 'moveTo'](x, horizonY(x));
  ctx.stroke();
  ctx.shadowBlur = 0;
  if (backdrop) drawFloorShine(top);

  for (const d of [...decals].sort((p, q) => q.z - p.z)) {
    if (d.z < 0.8 || isBehindHorizon(d.x, d.z)) continue;
    drawProp(d, 0.55);
  }

  ctx.lineCap = 'round';
  for (const m of marks) {
    const a = project(m.x1, 0, m.z1);
    const b = project(m.x2, 0, m.z2);
    const fade = Math.min(1, (MARK_LIFE - m.life) / 1.5);
    ctx.strokeStyle = `rgba(28, 8, 6, ${0.5 * fade})`;
    ctx.lineWidth = Math.max(1.5, 0.06 * view.unit * b.s);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  if (powers.radar > 0) {
    const at = project(player.x, 0, player.z);
    for (let i = 0; i < 3; i++) {
      const f = (time * 0.9 + i / 3) % 1;
      const rx = f * 3.2 * view.unit * at.s;
      ctx.strokeStyle = `rgba(123, 255, 106, ${0.55 * (1 - f)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(at.x, at.y, rx, rx * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  for (const ring of rings) {
    const at = project(player.x, 0, player.z);
    const rx = ring.r * view.unit * at.s;
    ctx.strokeStyle = `rgba(120, 220, 255, ${1 - ring.t / 0.55})`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(at.x, at.y, rx, rx * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/**
 * Light from the far wall spilling across the top of an indoor floor, and glints drifting past.
 * @param {number} top
 */
function drawFloorShine(top) {
  const rim = region.palette.rim;
  const spill = ctx.createLinearGradient(0, top, 0, top + (view.h - top) * 0.45);
  spill.addColorStop(0, `${rim}55`);
  spill.addColorStop(1, `${rim}00`);
  ctx.fillStyle = spill;
  ctx.fillRect(0, top, view.w, view.h - top);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rim;
  for (const s of specks) {
    const x = s.x * maxXAt(s.z) * 1.3;
    if (isBehindHorizon(x, s.z)) continue;
    const at = project(x, 0, s.z);
    const rx = s.r * view.unit * at.s;
    ctx.globalAlpha = 0.6 * s.a * Math.min(1, (8.2 - s.z) / 1.5) * (0.6 + 0.4 * Math.sin(time * 3 + s.x * 20));
    ctx.beginPath();
    ctx.ellipse(at.x, at.y, rx, rx * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * A scenery sprite standing on the ground. Flat props are squashed so they lie down in the
 * distance and open up as they come closer.
 * @param {Prop} p @param {number} [flat] 0 for standing props, otherwise how far the sprite is squashed at the horizon.
 */
function drawProp(p, flat = 0) {
  const img = propImage(p.def.name);
  if (!img.complete || !img.naturalWidth) return;
  const at = project(p.x, 0, p.z);
  const w = p.def.w * view.unit * at.s;
  const lie = flat ? 1 - flat * Math.min(1, (p.z - 1) / 7) : 1;
  const h = w * (img.naturalHeight / img.naturalWidth) * lie;
  const base = flat ? 0.5 : 0.9;
  const tint = flat ? region.palette.decalTint : undefined;
  ctx.save();
  ctx.translate(at.x, at.y);
  if (p.flip) ctx.scale(-1, 1);
  ctx.drawImage(tint ? tinted(img, p.def.name, tint) : img, -w / 2, -h * base, w, h);
  ctx.restore();
}

/** @type {Map<string, HTMLCanvasElement>} */
const tints = new Map();

/** A copy of a loaded image washed with a colour, made once and kept. @param {HTMLImageElement} img @param {string} name @param {string} tint */
function tinted(img, name, tint) {
  const key = `${name}|${tint}`;
  let out = tints.get(key);
  if (!out) {
    out = document.createElement('canvas');
    out.width = img.naturalWidth;
    out.height = img.naturalHeight;
    const c = /** @type {CanvasRenderingContext2D} */ (out.getContext('2d'));
    c.drawImage(img, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = tint;
    c.fillRect(0, 0, out.width, out.height);
    tints.set(key, out);
  }
  return out;
}

/** @param {Alien} a */
function drawAlien(a) {
  const own = monsters[a.type];
  const img = own?.naturalWidth ? own : a.type === 'tank' ? sprites.granddaddy : sprites[ENEMY_TYPES[a.type].sprite];
  const ground = project(a.x, 0, a.z);
  const at = project(a.x, a.y, a.z);
  const size = a.size * view.unit * at.s * 1.25;
  if (!isBehindHorizon(a.x, a.z)) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(ground.x, ground.y, size * 0.36, size * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const glow = ENEMY_TYPES[a.type].glow;
  if (glow) {
    ctx.fillStyle = `${glow}55`;
    ctx.beginPath();
    ctx.arc(at.x, at.y - size * 0.45, size * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  if (a.slow > 0) glow(at.x, at.y - size * 0.45, size * 0.65, 'rgba(120, 220, 255, 0.6)');
  const squash = a.phase === 'crouch' ? 0.78 : 1;
  const bob = a.phase === 'walk' ? Math.abs(Math.sin(a.t * 9)) * size * 0.06 : 0;
  if (img?.complete && img.naturalWidth) {
    if (a.hitFlash > 0) ctx.filter = 'brightness(2.4)';
    ctx.drawImage(img, at.x - size / 2, at.y - size * squash - bob, size, size * squash);
    ctx.filter = 'none';
  }
  if (a.maxHp >= 8 && a.hp < a.maxHp) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(at.x - size * 0.4, at.y - size - 8, size * 0.8, 5);
    ctx.fillStyle = '#ff4f6a';
    ctx.fillRect(at.x - size * 0.4, at.y - size - 8, size * 0.8 * (a.hp / a.maxHp), 5);
  }
}

/** @param {typeof gems[number]} g */
function drawGem(g) {
  const img = pickupImage(g.def.name);
  if (!img.complete || !img.naturalWidth) return;
  const ground = project(g.x, 0, g.z);
  const at = project(g.x, 0.1 + Math.sin(g.t * 5) * 0.03, g.z);
  const h = Math.max(8, g.def.h * view.unit * at.s);
  const w = h * (img.naturalWidth / img.naturalHeight);
  glow(ground.x, ground.y - h * 0.1, h * 0.7, 'rgba(150, 120, 255, 0.45)');
  ctx.save();
  ctx.translate(at.x, at.y - h / 2);
  ctx.rotate(Math.sin(g.t * 3) * 0.25);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/** A soft additive glow. @param {number} x @param {number} y @param {number} r @param {string} colour */
function glow(x, y, r, colour) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, colour);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.globalCompositeOperation = 'source-over';
}

/** Ammo sprites point up; turn them to face the way they fly on screen. @param {Bullet} b */
function drawBullet(b) {
  const spec = AMMO[b.ammo];
  if (spec.whirl) {
    drawWhirl(b, spec);
    return;
  }
  const img = ammoImage(spec.sprite);
  const at = project(b.x, bulletY(b, b.z), b.z);
  const nextZ = b.z + b.vz * 0.02;
  const ahead = project(b.x + b.vx * 0.02, bulletY(b, nextZ), nextZ);
  const h = Math.max(10, spec.size * view.unit * at.s);
  glow(at.x, at.y, h * (powers.energy > 0 ? 0.9 : 0.6), `${spec.colour}${powers.energy > 0 ? 'cc' : '88'}`);
  if (!img.complete || !img.naturalWidth) return;
  const w = h * (img.naturalWidth / img.naturalHeight);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(spec.spin ? b.spin : Math.atan2(ahead.x - at.x, at.y - ahead.y));
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/**
 * A tornado standing on the ground: it whips back and forth, flips fast enough to read as spinning,
 * and drags a ring of dust round its base.
 * @param {Bullet} b @param {import('./ammo.js').AmmoType} spec
 */
function drawWhirl(b, spec) {
  const img = ammoImage(spec.sprite);
  const lift = bulletY(b, b.z) - spec.size * 0.5;
  const ground = project(b.x, lift, b.z);
  const grow = Math.min(1, 0.35 + b.life * 3);
  const fade = Math.min(1, ((spec.life ?? 1.4) - b.life) / 0.4);
  const h = Math.max(16, spec.size * view.unit * ground.s * grow);
  const ring = h * 0.42;
  ctx.globalAlpha = fade;
  for (let i = 0; i < 10; i++) {
    const a = b.spin * 0.6 + (i / 10) * Math.PI * 2;
    if (Math.sin(a) >= 0) continue;
    ctx.fillStyle = i % 3 ? 'rgba(200, 150, 120, 0.7)' : 'rgba(240, 240, 255, 0.8)';
    ctx.fillRect(ground.x + Math.cos(a) * ring - 2, ground.y - h * 0.08 + Math.sin(a) * ring * 0.25 - 2, 4, 4);
  }
  glow(ground.x, ground.y - h * 0.5, h * 0.7, `${spec.colour}66`);
  if (img.complete && img.naturalWidth) {
    const w = h * (img.naturalWidth / img.naturalHeight);
    ctx.save();
    ctx.translate(ground.x + Math.sin(b.spin * 0.35) * h * 0.08, ground.y);
    ctx.rotate(Math.sin(b.spin * 0.5) * 0.12);
    ctx.scale(Math.floor(b.spin / 1.4) % 2 ? -1 : 1, 1 + Math.sin(b.spin * 0.8) * 0.04);
    ctx.drawImage(img, -w / 2, -h, w, h);
    ctx.restore();
  }
  for (let i = 0; i < 10; i++) {
    const a = b.spin * 0.6 + (i / 10) * Math.PI * 2;
    if (Math.sin(a) < 0) continue;
    ctx.fillStyle = i % 3 ? 'rgba(200, 150, 120, 0.8)' : 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(ground.x + Math.cos(a) * ring - 2.5, ground.y - h * 0.08 + Math.sin(a) * ring * 0.25 - 2.5, 5, 5);
  }
  ctx.globalAlpha = 1;
}

/** @param {typeof deposits[number]} d */
function drawDeposit(d) {
  const img = pickupImage(d.def.name);
  if (!img.complete || !img.naturalWidth) return;
  const at = project(d.x, 0, d.z);
  const w = d.def.w * view.unit * at.s;
  const h = w * (img.naturalHeight / img.naturalWidth);
  glow(at.x, at.y - h * 0.4, w * 0.8, `${d.def.colour}55`);
  if (d.hitFlash > 0) ctx.filter = `brightness(${1 + d.hitFlash * 1.5})`;
  const wobble = d.hitFlash * Math.sin(time * 60) * w * 0.03;
  ctx.drawImage(img, at.x - w / 2 + wobble, at.y - h * 0.9, w, h);
  ctx.filter = 'none';
  if (Math.sin(time * 2.3 + d.x * 7) > 0.97) glow(at.x + w * 0.15, at.y - h * 0.7, w * 0.25, 'rgba(255, 255, 255, 0.9)');
  if (d.hp < d.def.hp) {
    const bw = w * 0.7;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(at.x - bw / 2, at.y - h - 10, bw, 6);
    ctx.fillStyle = d.def.colour;
    ctx.fillRect(at.x - bw / 2, at.y - h - 10, bw * (d.hp / d.def.hp), 6);
  }
}

/** A power-up or ammo crate hovering over a glowing ring. @param {typeof pickups[number]} p */
function drawPickup(p) {
  const ground = project(p.x, 0, p.z);
  const at = project(p.x, 0.3 + Math.sin(p.t * 4) * 0.05, p.z);
  const size = Math.max(18, 0.38 * view.unit * at.s);
  const colour = p.kind === 'ammo' ? AMMO[p.id].colour : POWERS[p.id].colour;
  if (p.t > PICKUP_LIFE - 3 && Math.floor(p.t * 8) % 2 === 0) return;
  const pulse = 1 + 0.12 * Math.sin(p.t * 6);
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(2, size * 0.06);
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.ellipse(ground.x, ground.y, size * 0.55 * pulse, size * 0.16 * pulse, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  glow(at.x, at.y, size * 0.95, `${colour}aa`);
  if (p.kind === 'ammo') {
    ctx.fillStyle = 'rgba(30, 10, 50, 0.75)';
    ctx.strokeStyle = colour;
    ctx.lineWidth = Math.max(2, size * 0.07);
    ctx.beginPath();
    ctx.arc(at.x, at.y, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  const img = p.kind === 'ammo' ? ammoImage(AMMO[p.id].sprite) : pickupImage(`power-${p.id}`);
  if (!img.complete || !img.naturalWidth) return;
  const h = p.kind === 'ammo' ? size * 0.78 : size;
  const w = h * (img.naturalWidth / img.naturalHeight);
  ctx.save();
  ctx.translate(at.x, at.y);
  if (p.kind === 'ammo') ctx.rotate(0.5);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/** @param {number} x @param {number} y @param {number} z @param {string} colour @param {number} [big] */
function drawBolt(x, y, z, colour, big = 1) {
  const at = project(x, y, z);
  const r = Math.max(1.5, 0.045 * big * view.unit * at.s);
  const g = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, r * 2.2);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.4, colour);
  g.addColorStop(1, `${colour}00`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(at.x, at.y, r * 2.2, 0, Math.PI * 2);
  ctx.fill();
}

/** @param {{ x: number, z: number, vx: number, vz: number }} r */
function drawRocket(r) {
  const climb = !r.target && boss && !boss.dying ? clamp((r.z - player.z) / (boss.z - player.z), 0, 1) * (BOSS_HIT_Y - 0.35) : 0;
  const at = project(r.x, 0.35 + climb, r.z);
  const size = Math.max(10, 0.22 * view.unit * at.s);
  if (cupcake.complete && cupcake.naturalWidth) {
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.rotate(Math.atan2(r.vx, r.vz) * 0.6);
    ctx.drawImage(cupcake, -size / 2, -size / 2, size, size);
    ctx.restore();
  } else drawBolt(r.x, 0.35, r.z, '#ffb02e', 1.6);
}

/** Alien shots arc through the air: the slime glob faces where it's going, spores just tumble. @param {Slime} s */
function drawSlime(s) {
  /** @param {number} t */
  const height = (t) => {
    const p = Math.min(1, t / s.flight);
    return s.y0 * (1 - p) + Math.sin(p * Math.PI) * s.arc + 0.1;
  };
  const p = Math.min(1, s.t / s.flight);
  const shadow = project(s.x, 0, s.z);
  const at = project(s.x, height(s.t), s.z);
  const r = Math.max(5, 0.11 * view.unit * at.s);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(shadow.x, shadow.y, r, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  const img = ammoImage(s.kind);
  if (!img.complete || !img.naturalWidth) return;
  const h = r * 2.2;
  const w = h * (img.naturalWidth / img.naturalHeight);
  ctx.save();
  ctx.translate(at.x, at.y);
  if (DIRECTIONAL_SHOTS.has(s.kind)) {
    const q = Math.min(1, p + 0.02);
    const next = project(s.fromX + (s.toX - s.fromX) * q, height(q * s.flight), s.fromZ + (s.toZ - s.fromZ) * q);
    ctx.rotate(Math.atan2(next.x - at.x, at.y - next.y));
  } else ctx.rotate(s.t * 5);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawBoss() {
  if (!boss) return;
  const img = bossImage(region.boss.sprite);
  if (!img.complete || !img.naturalWidth) return;
  const at = project(boss.x, 1.25, boss.z);
  const w = region.boss.w * view.unit * at.s;
  const h = w * (img.naturalHeight / img.naturalWidth);
  const hover = Math.sin(boss.t * 2) * 6;
  glow(at.x, at.y - h / 2, w * 0.7, `${region.palette.rim}55`);
  ctx.globalAlpha = 0.12 + 0.88 * boss.solid;
  if (boss.dying) ctx.globalAlpha = Math.max(0, 1 - boss.dying / 2.6);
  if (boss.hitFlash > 0) ctx.filter = `brightness(${1 + boss.hitFlash * 0.8})`;
  ctx.drawImage(img, at.x - w / 2, at.y - h + hover, w, h);
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
}

function drawPlayer() {
  const ground = project(player.x, 0, player.z);
  const w = 0.42 * view.unit * ground.s;
  if (levels.orbit > 0) drawOrbit(true);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(ground.x, ground.y, w * 0.5, w * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!(player.invuln > 0 && Math.floor(time * 14) % 2 === 0)) {
    const pace = Math.min(1, Math.hypot(player.vx, player.vz) / player.speed);
    drawGranny(ctx, ground.x, ground.y, w, { t: time, flame: player.dash > 0 ? 3 : powers.boost > 0 ? 2.2 + pace * 0.4 : 1 + pace * 0.6, lean: clamp(player.vx / player.speed, -1, 1), rig });
  }
  if (levels.orbit > 0) drawOrbit(false);
  if (player.chill > 0) glow(ground.x, ground.y - w * 0.4, w * 0.8, `${region.palette.rim}${Math.round(128 * Math.min(1, player.chill)).toString(16).padStart(2, '0')}`);
  if (powers.shield > 0 && !(powers.shield < 2 && Math.floor(time * 10) % 2 === 0)) {
    const at = project(player.x, 0.22, player.z);
    const r = w * 0.85;
    const bubble = ctx.createRadialGradient(at.x, at.y, r * 0.5, at.x, at.y, r);
    bubble.addColorStop(0, 'rgba(90, 184, 255, 0.05)');
    bubble.addColorStop(0.85, 'rgba(90, 200, 255, 0.28)');
    bubble.addColorStop(1, 'rgba(200, 240, 255, 0.7)');
    ctx.fillStyle = bubble;
    ctx.beginPath();
    ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(160, 230, 255, ${0.6 + 0.3 * Math.sin(time * 12)})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  if (ammoPop > 0) {
    const spec = AMMO[(rack[weapon] ?? rack[0]).id];
    const img = ammoImage(spec.sprite);
    const at = project(player.x, 0.62, player.z);
    const grow = ammoPop > 0.75 ? (0.9 - ammoPop) / 0.15 : 1;
    const h = w * 0.5 * grow;
    ctx.globalAlpha = Math.min(1, ammoPop / 0.25);
    glow(at.x, at.y - h * 0.6, h, `${spec.colour}aa`);
    if (img.complete && img.naturalWidth) ctx.drawImage(img, at.x - (h * img.naturalWidth / img.naturalHeight) / 2, at.y - h * 1.1 - (0.9 - ammoPop) * 20, h * img.naturalWidth / img.naturalHeight, h);
    ctx.globalAlpha = 1;
  }
}

/** Cupcakes behind Granny are drawn before her, the ones in front after. @param {boolean} behind */
function drawOrbit(behind) {
  const n = levels.orbit;
  for (let i = 0; i < n; i++) {
    const angle = time * 3.2 + (i / n) * Math.PI * 2;
    const oz = player.z + Math.sin(angle) * 0.42;
    if ((oz > player.z) !== behind) continue;
    const at = project(player.x + Math.cos(angle) * 0.62, 0.3, oz);
    const size = 0.2 * view.unit * at.s;
    if (cupcake.complete && cupcake.naturalWidth) ctx.drawImage(cupcake, at.x - size / 2, at.y - size / 2, size, size);
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = 1 - p.life / p.max;
    ctx.fillStyle = p.colour;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawHud() {
  const pad = Math.max(12, view.w * 0.014);
  const big = Math.round(Math.max(20, view.h * 0.04));

  const owned = /** @type {import('./upgrades.js').UpgradeId[]} */ (Object.keys(levels)).filter((id) => levels[id] > 0);
  ctx.font = `${Math.round(big * 0.75)}px Bangers, sans-serif`;
  ctx.textBaseline = 'middle';
  owned.forEach((id, i) => {
    const x = pad + i * big * 1.5;
    const y = pad + big * 0.55;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(x, y - big * 0.55, big * 1.3, big * 1.1);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(UPGRADES[id].icon, x + big * 0.55, y);
    ctx.font = `${Math.round(big * 0.45)}px Bangers, sans-serif`;
    outlineText(String(levels[id]), x + big * 1.08, y + big * 0.3, '#ffd23a');
    ctx.font = `${Math.round(big * 0.75)}px Bangers, sans-serif`;
  });

  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  const top = arch ? Math.max(pad, frameHudTop) : pad;
  if (boss && boss.z <= BOSS_Z + 0.1) {
    const barW = Math.min(view.w * 0.4, 440);
    const barH = Math.max(10, big * 0.4);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(view.cx - barW / 2, top, barW, barH);
    ctx.fillStyle = '#ff3a5a';
    ctx.fillRect(view.cx - barW / 2, top, barW * (boss.hp / region.boss.hp), barH);
    ctx.font = `${Math.round(big * 0.6)}px Bangers, sans-serif`;
    outlineText(region.boss.name.toUpperCase(), view.cx, top + barH + 4, '#ffb3c0');
  } else if (clock < BOSS_TIME) {
    drawCountdown(BOSS_TIME - clock, top, big);
  } else {
    ctx.font = `${big}px Bangers, sans-serif`;
    outlineText('🛸 INCOMING', view.cx, top, '#ffe27a');
  }

  if (banner.time > 0) {
    ctx.globalAlpha = Math.max(0, Math.min(1, banner.time * 2, (2.6 - banner.time) * 4));
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(view.h * 0.08)}px Bangers, sans-serif`;
    outlineText(banner.text, view.cx, view.h * 0.24, '#ffe27a');
    if (banner.sub) {
      ctx.font = `${Math.round(view.h * 0.038)}px Bangers, sans-serif`;
      outlineText(banner.sub, view.cx, view.h * 0.24 + view.h * 0.065, '#ffffff');
    }
    ctx.globalAlpha = 1;
  }
}

let powersKey = '';
let lastHp = 100;

/** Keeps the HTML bar along the bottom in step with the game. Only touches the DOM when something changed. @param {number} dt */
function updateBar(dt) {
  const b = barEls;
  shownScore += (score - shownScore) * Math.min(1, dt * 10);
  if (Math.abs(score - shownScore) < 1) shownScore = score;
  setText(b.score, Math.round(shownScore).toLocaleString());
  b.score.classList.toggle('is-rolling', shownScore !== score);
  setText(b.kills, player.kills.toLocaleString());
  setText(b.best, `BEST ${Math.max(best, score).toLocaleString()}`);
  b.best.classList.toggle('is-beaten', score > best && best > 0);

  const mult = comboMultiplier();
  setText(b.comboX, String(combo));
  setText(b.comboN, `COMBO x${mult}`);
  b.combo.classList.toggle('is-on', combo >= 3);
  b.combo.dataset.mult = String(mult);
  b.comboTime.style.width = `${combo >= 3 ? Math.max(0, comboTime / COMBO_TIME) * 100 : 0}%`;

  const hp = Math.max(0, player.hp / player.maxHp);
  b.hpFill.style.width = `${hp * 100}%`;
  b.hpLag.style.width = `${hp * 100}%`;
  setText(b.hpText, `${Math.ceil(player.hp)} / ${player.maxHp}`);
  b.health.classList.toggle('is-mid', hp <= 0.6 && hp > 0.3);
  b.health.classList.toggle('is-low', hp <= 0.3);
  if (player.hp < lastHp) {
    b.health.classList.remove('is-hit');
    void b.health.offsetWidth;
    b.health.classList.add('is-hit');
  }
  lastHp = player.hp;

  b.xp.style.width = `${Math.min(1, player.crystals / crystalsForLevel(player.level)) * 100}%`;
  setText(b.level, `LEVEL ${player.level}`);

  const active = /** @type {(keyof typeof powers)[]} */ (Object.keys(powers)).filter((id) => powers[id] > 0);
  const pKey = active.join();
  if (pKey !== powersKey) {
    powersKey = pKey;
    b.powers.innerHTML = active.map((id) => `<div class="hl-power" data-power="${id}" style="--c: ${POWERS[id].colour}" title="${POWERS[id].name}">
      <img src="assets/homeland/pickups/power-${id}.webp" alt="" /></div>`).join('');
  }
  b.powers.querySelectorAll('[data-power]').forEach((node) => {
    const id = /** @type {keyof typeof powers} */ (node.getAttribute('data-power'));
    const left = powers[id] / (POWERS[id].time ?? 1);
    /** @type {HTMLElement} */ (node).style.setProperty('--p', `${left * 100}%`);
    node.classList.toggle('is-ending', powers[id] < 2);
  });

  nukeButton.disabled = player.nuke < 1;
  nukeButton.style.setProperty('--charge', `${Math.round(Math.min(1, player.nuke) * 100)}%`);
  dashButton.disabled = player.dashCd > 0;
  dashButton.style.setProperty('--charge', `${Math.round((1 - player.dashCd / DASH_COOLDOWN) * 100)}%`);
}

/** @param {HTMLElement} node @param {string} text */
function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}

/**
 * The big arcade countdown to the end of the assault: red for the last 10 seconds, and it flashes
 * and pulses on every second for the last 5.
 * @param {number} left Seconds remaining. @param {number} top @param {number} big
 */
function drawCountdown(left, top, big) {
  const secs = Math.ceil(left);
  const sinceTick = secs - left;
  const urgent = secs <= 10;
  const final = secs <= 5;
  const size = Math.round(Math.max(44, view.h * 0.1));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `${Math.round(big * 0.6)}px Bangers, sans-serif`;
  outlineText('SURVIVE', view.cx, top, urgent ? '#ffb3b3' : '#fff3c4');

  ctx.save();
  if (final && sinceTick > 0.55) ctx.globalAlpha = 0.25;
  const pulse = final ? 1 + 0.3 * Math.max(0, 1 - sinceTick * 4) : 1;
  const y = top + big * 0.6;
  ctx.translate(view.cx, y + size / 2);
  ctx.scale(pulse, pulse);
  ctx.font = `${size}px Bangers, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(6, size * 0.12);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = urgent ? '#3a0008' : 'rgba(20, 4, 30, 0.95)';
  const text = formatClock(secs);
  ctx.strokeText(text, 0, 0);
  const fill = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
  if (urgent) {
    fill.addColorStop(0, '#ff9a9a');
    fill.addColorStop(0.5, '#ff2a2a');
    fill.addColorStop(1, '#b30000');
  } else {
    fill.addColorStop(0, '#fff6b0');
    fill.addColorStop(0.5, '#ffd23a');
    fill.addColorStop(1, '#ff8a1a');
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** @param {string} text @param {number} x @param {number} y @param {string} colour */
function outlineText(text, x, y, colour) {
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(20, 4, 30, 0.9)';
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = colour;
  ctx.fillText(text, x, y);
}

/* ---------- Helpers ---------- */

/** @param {number} v @param {number} lo @param {number} hi */
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/** @param {number} seconds */
function formatClock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/* ---------- Loop ---------- */

let last = performance.now();
/** @param {number} now */
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  try {
    update(dt);
    draw();
    updateBar(dt);
  } catch (err) {
    // One bad frame must not freeze the run; keep the latest error for debugging.
    console.error(err);
    const e = /** @type {Error} */ (err);
    try {
      localStorage.setItem('hl-last-error', JSON.stringify({ at: new Date().toISOString(), region: region.key, state, clock, msg: e.message, stack: e.stack }));
    } catch {}
  }
  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
resize();
resetRun();
loadSounds(['nuke-fire', 'battle-cry-titans', 'siren-alert', 'mothership', 'granddaddywarning', 'lazer1', 'death', 'slime', 'wrong', 'electro', 'missile', 'nuke-explosion', 'turret-upgrade', 'core-collect', 'core-earned', 'button-press']);
// ?region=, ?start= and ?boss jump straight into a run for testing; otherwise the title leads to the map.
// ?story (with ?region=) opens that region's story card instead, and ?map opens the planet map.
const jumpIn = params.has('region') || params.has('start') || params.has('boss');
document.getElementById('hl-start')?.addEventListener('click', jumpIn ? startWarp : showMap);
const found = mapPiecesFound();
if (!TESTING && found < TRAINING_MODULE_IDS.length) showMapIncomplete(found);
else if (params.has('story')) showStory(REGIONS.indexOf(region));
else if (params.has('map')) showMap();
requestAnimationFrame(frame);
