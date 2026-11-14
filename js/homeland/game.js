/**
 * Alien Homeland: playable prototype of the horde survival run.
 *
 * Granny rides her rocket scooter around the near side of a small curved planet, firing
 * straight ahead. Aliens crest the horizon from right across the screen and make a beeline
 * for her; crystals from kills level her up, and each level-up offers one of three upgrades.
 * Survive the hordes, then shoot down the mothership.
 */
import { loadSounds, sfx } from './sfx.js';
import { drawGranny, drawSpire, drawCrystal } from './draw.js';
import { view, resizeView, project, horizonY, isBehindHorizon, screenToGround, spawnBehindHorizon, maxXAt } from './world.js?v=2';
import { ENEMY_TYPES, BOSS_TIME, BOSS_HP, HORDE_TIMES, MAX_ALIENS, spawnInterval, pickEnemyType, hordeSize } from './enemies.js';
import { UPGRADES, noUpgrades, rollChoices, crystalsForLevel } from './upgrades.js';

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('homeland'));
const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
const overlay = /** @type {HTMLElement} */ (document.getElementById('hl-overlay'));
const levelUpBox = /** @type {HTMLElement} */ (document.getElementById('hl-levelup'));
const nukeButton = /** @type {HTMLButtonElement} */ (document.getElementById('hl-nuke'));
const dashButton = /** @type {HTMLButtonElement} */ (document.getElementById('hl-dash'));
const controls = /** @type {HTMLElement} */ (document.getElementById('hl-buttons'));

const Z_MIN = 1.15;
const Z_MAX = 2.5;
const BULLET_SPEED = 12;
const BASE_FIRE_GAP = 0.2;
const DASH_TIME = 0.22;
const DASH_SPEED = 8;
const DASH_COOLDOWN = 1.8;
const KILLS_PER_NUKE = 45;
const MAGNET_RANGE = 1.1;
const GROUND_DRIFT = 0.35;
const BOSS_Z = 6.2;

const params = new URLSearchParams(location.search);
const START_AT = params.has('boss') ? BOSS_TIME - 4 : Math.max(0, Number(params.get('start')) || 0);

const sprites = Object.fromEntries(
  ['monster1', 'monster2', 'monster3', 'monster4', 'monster5', 'granddaddy', 'mothership'].map((name) => [name, image(`assets/enemies/${name}.png`)])
);
const cupcake = image('assets/cupcake-missile.png');

/** @param {string} src */
function image(src) {
  const img = new Image();
  img.src = src;
  return img;
}

/**
 * @typedef {{ type: keyof typeof ENEMY_TYPES, x: number, y: number, z: number, hp: number, maxHp: number, speed: number,
 *   size: number, damage: number, gems: number, t: number, hitFlash: number, phase: 'walk'|'crouch'|'leap',
 *   phaseTime: number, dirX: number, dirZ: number, holdTime: number, fireIn: number, orbitCd: number, waveHit: number, seed: number }} Alien
 */

let state = 'title';
let time = 0;
let clock = 0;
let spawnIn = 1;
let fireIn = 0;
let rocketIn = 2;
let waveIn = 4;
let waveId = 0;
let hordeIndex = 0;
/** @type {{ left: number, gap: number }} */
let hordeQueue = { left: 0, gap: 0 };
let hordeIn = 0;
let shake = 0;
let flash = 0;
let warpTime = 0;
let banner = { text: '', sub: '', time: 0 };
/** @type {import('./upgrades.js').UpgradeId[]} */
let choices = [];

const player = { x: 0, z: 1.5, vx: 0, vz: 0, hp: 100, maxHp: 100, speed: 2.3, invuln: 0, dash: 0, dashCd: 0, dashVx: 0, dashVz: 0, level: 1, crystals: 0, nuke: 0, kills: 0 };
let levels = noUpgrades();
/** @type {Alien[]} */
let aliens = [];
/** @type {{ x: number, z: number, vx: number, vz: number, dmg: number, life: number }[]} */
let bullets = [];
/** @type {{ x: number, z: number, vx: number, vz: number, life: number, target: Alien|null }[]} */
let rockets = [];
/** @type {{ x: number, z: number, fromX: number, fromZ: number, toX: number, toZ: number, t: number, flight: number }[]} */
let slimes = [];
/** @type {{ x: number, z: number, value: number, t: number }[]} */
let gems = [];
/** @type {{ r: number, max: number, t: number, id: number }[]} */
let rings = [];
/** @type {{ x: number, z: number, r: number }[]} */
let craters = [];
/** @type {{ x: number, z: number, h: number, w: number, hue: string }[]} */
let spires = [];
/** @type {{ x: number, y: number, vx: number, vy: number, life: number, max: number, colour: string, size: number }[]} */
let particles = [];
/** @type {null | { x: number, z: number, hp: number, t: number, fireIn: number, dropIn: number, dying: number }} */
let boss = null;
const stars = Array.from({ length: 260 }, () => ({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: Math.random() }));
const skyStars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random() * 0.8, r: Math.random() * 1.4 + 0.3 }));

const keys = new Set();
/** @type {{ x: number, z: number } | null} */
let target = null;

/* ---------- Setup ---------- */

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  resizeView(window.innerWidth, window.innerHeight);
}

function resetRun() {
  time = 0;
  clock = START_AT;
  spawnIn = 1.2;
  fireIn = 0;
  rocketIn = 2;
  waveIn = 4;
  hordeIndex = HORDE_TIMES.filter((t) => t < START_AT).length;
  hordeQueue = { left: 0, gap: 0 };
  shake = 0;
  Object.assign(player, { x: 0, z: 1.5, vx: 0, vz: 0, hp: 100, maxHp: 100, speed: 2.3, invuln: 0, dash: 0, dashCd: 0, level: 1, crystals: 0, nuke: 0, kills: 0 });
  levels = noUpgrades();
  aliens = [];
  bullets = [];
  rockets = [];
  slimes = [];
  gems = [];
  rings = [];
  particles = [];
  boss = null;
  target = null;
  craters = Array.from({ length: 26 }, () => newCrater(1.2 + Math.random() * 9));
  spires = Array.from({ length: 14 }, () => newSpire(2 + Math.random() * 9));
}

/** @param {number} z */
function newCrater(z) {
  return { x: (Math.random() - 0.5) * 2 * maxXAt(z) * 1.3, z, r: 0.12 + Math.random() * 0.35 };
}

/** @param {number} z */
function newSpire(z) {
  const side = Math.random() < 0.5 ? -1 : 1;
  const hues = ['#2de2c8', '#ff4fd8', '#8a7bff', '#2dd4ff'];
  return { x: side * (maxXAt(z) * (0.75 + Math.random() * 0.5)), z, h: 0.3 + Math.random() * 0.9, w: 0.15 + Math.random() * 0.2, hue: hues[Math.floor(Math.random() * hues.length)] };
}

/* ---------- Input ---------- */

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (state === 'levelup' && ['1', '2', '3'].includes(k)) {
    pickUpgrade(Number(k) - 1);
    return;
  }
  if ([' ', 'shift'].includes(k)) {
    dash();
    e.preventDefault();
  } else if (['n', 'e', 'enter'].includes(k)) fireNuke();
  else keys.add(k);
  if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's'].includes(k)) target = null;
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

/** @param {PointerEvent} e */
function steerTo(e) {
  const fingerLift = e.pointerType === 'mouse' ? 0 : view.h * 0.09;
  target = screenToGround(e.clientX, e.clientY - fingerLift);
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
  sfx('missile', 0.4);
}

function fireNuke() {
  if (state !== 'play' || player.nuke < 1) return;
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
  const late = 1 + Math.max(0, clock - 60) / 240;
  const alien = /** @type {Alien} */ ({
    type, x: at.x, y: 0, z: at.z, hp: Math.ceil(spec.hp * late), maxHp: Math.ceil(spec.hp * late), speed: spec.speed * (0.9 + Math.random() * 0.2),
    size: spec.size, damage: spec.damage, gems: spec.gems, t: Math.random() * 5, hitFlash: 0, phase: 'walk', phaseTime: 0,
    dirX: (aimX - at.x) / aimLen, dirZ: (aimZ - at.z) / aimLen, holdTime: 5, fireIn: 1 + Math.random(), orbitCd: 0, waveHit: -1, seed: Math.random(),
  });
  aliens.push(alien);
  return alien;
}

function spawnDirector(dt) {
  const bossTime = clock >= BOSS_TIME;
  spawnIn -= dt;
  if (spawnIn <= 0) {
    addAlien(pickEnemyType(clock), spawnBehindHorizon(Math.random()));
    spawnIn = spawnInterval(clock) * (bossTime ? 2.5 : 1) * (0.7 + Math.random() * 0.6);
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
      const type = Math.random() < 0.55 ? 'swarmer' : pickEnemyType(clock);
      addAlien(type, spawnBehindHorizon(Math.random(), 1.1 + Math.random() * 0.25));
      hordeQueue.left -= 1;
      hordeIn += hordeQueue.gap;
    }
  }
  if (bossTime && !boss) {
    boss = { x: 0, z: 13, hp: BOSS_HP, t: 0, fireIn: 4, dropIn: 6, dying: 0 };
    showBanner('⚠ MOTHERSHIP ⚠', 'Line up under it and blast!');
    sfx('siren-alert', 0.6);
    sfx('mothership', 0.5);
  }
}

/* ---------- Game flow ---------- */

function startWarp() {
  resetRun();
  state = 'warp';
  warpTime = 0;
  overlay.hidden = true;
  sfx('nuke-fire', 0.6);
}

function startPlay() {
  state = 'play';
  flash = 1;
  controls.hidden = false;
  showBanner('ALIEN HOMELAND', 'Survive the horde!');
  sfx('battle-cry-titans', 0.55);
}

/** @param {string} text @param {string} [sub] */
function showBanner(text, sub = '') {
  banner = { text, sub, time: 2.6 };
}

/** @param {boolean} won */
function endRun(won) {
  state = won ? 'won' : 'lost';
  controls.hidden = true;
  const title = won ? 'MOTHERSHIP DOWN!' : 'SCOOTER TOAST!';
  const line = won ? 'Region cleared. The Supreme Leader is next…' : 'The horde got Granny this time. One more go?';
  overlay.innerHTML = `
    <div class="hl-card">
      <h1 class="hl-title ${won ? '' : 'is-lost'}">${title}</h1>
      <p class="hl-line">${line}</p>
      <p class="hl-stats"><span>ALIENS <strong>${player.kills.toLocaleString()}</strong></span><span>LEVEL <strong>${player.level}</strong></span><span>TIME <strong>${formatClock(clock)}</strong></span></p>
      <button type="button" class="hl-go" id="hl-go">${won ? '🚀 FLY AGAIN' : '🛵 TRY AGAIN'}</button>
    </div>`;
  overlay.hidden = false;
  document.getElementById('hl-go')?.addEventListener('click', startWarp);
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
    player.speed *= 1.1;
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
  if (state === 'warp') {
    warpTime += dt;
    if (warpTime > 3) startPlay();
    return;
  }
  if (state !== 'play') {
    if (state !== 'levelup') updateParticles(dt);
    return;
  }
  clock += dt;

  updatePlayer(dt);
  spawnDirector(dt);
  driftGround(dt);
  updateAliens(dt);
  updateWeapons(dt);
  updateBullets(dt);
  updateRockets(dt);
  updateSlimes(dt);
  updateGems(dt);
  if (boss) updateBoss(dt);
  updateParticles(dt);

  nukeButton.disabled = player.nuke < 1;
  nukeButton.style.setProperty('--charge', `${Math.round(Math.min(1, player.nuke) * 100)}%`);
  dashButton.disabled = player.dashCd > 0;
  if (banner.time > 0) banner.time -= dt;
  shake = Math.max(0, shake - dt * 30);
  flash = Math.max(0, flash - dt * 2.5);
}

/** @param {number} dt */
function updatePlayer(dt) {
  let ix = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0);
  let iz = (keys.has('arrowup') || keys.has('w') ? 1 : 0) - (keys.has('arrowdown') || keys.has('s') ? 1 : 0);
  let wantX = 0;
  let wantZ = 0;
  if (ix || iz) {
    const len = Math.hypot(ix, iz);
    wantX = (ix / len) * player.speed;
    wantZ = (iz / len) * player.speed * 0.55;
  } else if (target) {
    const dx = target.x - player.x;
    const dz = clamp(target.z, Z_MIN, Z_MAX) - player.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.02) {
      const v = Math.min(player.speed, dist * 7);
      wantX = (dx / dist) * v;
      wantZ = (dz / dist) * v;
    }
  }
  player.vx += (wantX - player.vx) * Math.min(1, dt * 12);
  player.vz += (wantZ - player.vz) * Math.min(1, dt * 12);
  let mx = player.vx;
  let mz = player.vz;
  if (player.dash > 0) {
    player.dash -= dt;
    mx = player.dashVx;
    mz = player.dashVz;
    if (Math.random() < 0.8) {
      const at = project(player.x, 0.2, player.z);
      particles.push({ x: at.x + (Math.random() - 0.5) * 30, y: at.y, vx: 0, vy: 30, life: 0, max: 0.3, colour: '#ffb02e', size: 8 });
    }
  }
  player.z = clamp(player.z + mz * dt, Z_MIN, Z_MAX);
  const limit = maxXAt(player.z);
  player.x = clamp(player.x + mx * dt, -limit, limit);
  player.invuln = Math.max(0, player.invuln - dt);
  player.dashCd = Math.max(0, player.dashCd - dt);
}

/** @param {number} dt */
function driftGround(dt) {
  for (const c of craters) c.z -= GROUND_DRIFT * dt;
  for (const s of spires) s.z -= GROUND_DRIFT * dt;
  craters = craters.map((c) => (c.z < 1 ? newCrater(9 + Math.random() * 2) : c));
  spires = spires.map((s) => (s.z < 1 ? newSpire(9 + Math.random() * 2) : s));
}

/** @param {number} dt */
function updateAliens(dt) {
  for (const a of aliens) {
    a.t += dt;
    a.hitFlash = Math.max(0, a.hitFlash - dt * 6);
    a.orbitCd = Math.max(0, a.orbitCd - dt);
    const dx = player.x - a.x;
    const dz = player.z - a.z;
    const dist = Math.hypot(dx, dz) || 1;
    let speed = a.speed;

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
        a.x += a.dirX * 5.5 * dt;
        a.z += a.dirZ * 5.5 * dt;
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
        slimes.push({ x: a.x, z: a.z, fromX: a.x, fromZ: a.z, toX: player.x, toZ: player.z, t: 0, flight });
        sfx('slime', 0.3, 0.1);
      }
    }
    a.x += a.dirX * speed * dt;
    a.z += a.dirZ * speed * dt;

    if (dist < a.size * 0.45 + 0.18 && a.y < 0.35 && a.hp > 0) {
      if (player.dash > 0) {
        hitAlien(a, 4);
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
  for (let i = 0; i < a.gems; i++) gems.push({ x: a.x + (Math.random() - 0.5) * 0.3 * Math.min(1, i), z: a.z + (Math.random() - 0.5) * 0.3 * Math.min(1, i), value: 1, t: 0 });
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
  if (player.invuln > 0 || state !== 'play') return;
  player.hp -= amount;
  player.invuln = 0.5;
  shake = Math.max(shake, 10 + amount * 0.4);
  sfx('wrong', 0.45, 0.15);
  if (player.hp <= 0) {
    player.hp = 0;
    state = 'dying';
    controls.hidden = true;
    explodeAt(player.x, 0.3, player.z, '#ff8a2a', 2.5);
    sfx('nuke-explosion', 0.6);
    window.setTimeout(() => endRun(false), 1100);
  }
}

/** @param {number} dt */
function updateWeapons(dt) {
  fireIn -= dt;
  if (fireIn <= 0) {
    fireIn = BASE_FIRE_GAP / (1 + 0.25 * levels.rapid);
    const dmg = 1 + levels.power;
    const fan = [0];
    for (let i = 1; i <= levels.spread; i++) fan.push(i * 0.13, -i * 0.13);
    for (const angle of fan) bullets.push({ x: player.x, z: player.z + 0.15, vx: Math.sin(angle) * BULLET_SPEED, vz: Math.cos(angle) * BULLET_SPEED, dmg, life: 0 });
    if (levels.side > 0) {
      const near = aliens
        .filter((a) => !isBehindHorizon(a.x, a.z) && Math.abs(a.z - player.z) < 1.4 && Math.abs(a.x - player.x) > 0.3)
        .sort((p, q) => Math.abs(p.x - player.x) - Math.abs(q.x - player.x))
        .slice(0, levels.side);
      for (const a of near) {
        const dx = a.x - player.x;
        const dz = a.z - player.z;
        const len = Math.hypot(dx, dz);
        bullets.push({ x: player.x, z: player.z, vx: (dx / len) * BULLET_SPEED, vz: (dz / len) * BULLET_SPEED, dmg, life: 0 });
      }
    }
    sfx('lazer1', 0.08, 0.11);
  }

  if (levels.rockets > 0) {
    rocketIn -= dt;
    if (rocketIn <= 0) {
      rocketIn = 2;
      const visible = aliens.filter((a) => !isBehindHorizon(a.x, a.z)).sort((p, q) => p.z - q.z);
      for (let i = 0; i < levels.rockets; i++) {
        rockets.push({ x: player.x, z: player.z, vx: (i - (levels.rockets - 1) / 2) * 2, vz: 3, life: 0, target: visible[i] ?? visible[0] ?? null });
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

  if (levels.shockwave > 0) {
    waveIn -= dt;
    if (waveIn <= 0) {
      waveIn = Math.max(2, 4.5 - levels.shockwave * 0.5);
      waveId += 1;
      rings.push({ r: 0, max: 1 + levels.shockwave * 0.35, t: 0, id: waveId });
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
        hitAlien(a, 3 + levels.shockwave);
      }
    }
  }
  rings = rings.filter((ring) => ring.t < 0.55);
}

/** @param {number} dt */
function updateBullets(dt) {
  for (const b of bullets) {
    b.life += dt;
    b.x += b.vx * dt;
    b.z += b.vz * dt;
    for (const a of aliens) {
      if (a.hp <= 0) continue;
      const reach = 0.13 + a.size * 0.42;
      if (Math.abs(a.z - b.z) < reach && Math.abs(a.x - b.x) < reach) {
        hitAlien(a, b.dmg);
        b.life = 99;
        break;
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
    if (b.life < 99 && boss && !boss.dying && Math.abs(b.x - boss.x) < 1.5 && Math.abs(b.z - boss.z) < 0.5) {
      damageBoss(b.dmg);
      b.life = 99;
    }
  }
  bullets = bullets.filter((b) => b.life < 1.4 && !isBehindHorizon(b.x, b.z));
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
      explodeAt(r.x, 0.2, r.z, '#ff7ae8', 0.9);
      sfx('death', 0.3, 0.05);
      for (const a of aliens) if (Math.hypot(a.x - r.x, a.z - r.z) < 0.55) hitAlien(a, 3 + levels.rockets + levels.power);
      if (!r.target && boss && Math.abs(boss.x - r.x) < 1.5) damageBoss(4 + levels.rockets);
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
      if (Math.hypot(s.x - player.x, s.z - player.z) < 0.35 && player.dash <= 0) hurtPlayer(8);
      explodeAt(s.x, 0.05, s.z, '#9dff3a', 0.5);
    }
  }
  slimes = slimes.filter((s) => s.t < 99);
}

/** @param {number} dt */
function updateGems(dt) {
  for (const g of gems) {
    g.t += dt;
    const dx = player.x - g.x;
    const dz = player.z - g.z;
    const dist = Math.hypot(dx, dz);
    if (dist < MAGNET_RANGE) {
      const pull = 3 + (MAGNET_RANGE - dist) * 8;
      g.x += (dx / dist) * pull * dt;
      g.z += (dz / dist) * pull * dt;
    }
    if (dist < 0.22) {
      g.t = 999;
      player.crystals += g.value;
      sfx('core-collect', 0.25, 0.04);
    }
  }
  gems = gems.filter((g) => g.t < 25);
  if (player.crystals >= crystalsForLevel(player.level)) levelUp();
}

/** @param {number} dt */
function updateBoss(dt) {
  const b = /** @type {NonNullable<typeof boss>} */ (boss);
  b.t += dt;
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
  b.x = Math.sin(b.t * 0.45) * maxXAt(BOSS_Z) * 0.55;
  const angry = b.hp < BOSS_HP / 2;
  b.fireIn -= dt;
  if (b.fireIn <= 0) {
    b.fireIn = angry ? 1.6 : 2.4;
    const offsets = angry ? [-1, -0.5, 0, 0.5, 1] : [-0.6, 0, 0.6];
    for (const o of offsets) {
      slimes.push({ x: b.x, z: b.z, fromX: b.x, fromZ: b.z, toX: player.x + o, toZ: player.z, t: 0, flight: 1.5 });
    }
    sfx('slime', 0.4);
  }
  b.dropIn -= dt;
  if (b.dropIn <= 0) {
    b.dropIn = angry ? 4 : 6;
    for (let i = 0; i < (angry ? 6 : 4); i++) addAlien('swarmer', { x: b.x + (Math.random() - 0.5) * 2, z: b.z - 0.5 });
  }
}

/** @param {number} amount */
function damageBoss(amount) {
  if (!boss || boss.dying || boss.z > BOSS_Z + 0.1) return;
  boss.hp -= amount;
  if (boss.hp <= 0) {
    boss.hp = 0;
    boss.dying = 0.001;
    slimes = [];
    for (const a of aliens) killAlien(a, true);
    flash = 1;
    shake = 30;
    sfx('nuke-explosion', 0.7);
    showBanner('MOTHERSHIP DOWN!');
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

/* ---------- Drawing ---------- */

function draw() {
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  if (state === 'warp') drawWarp();
  else drawPlanet();
  ctx.restore();
  if (state === 'play' || state === 'levelup' || state === 'dying') drawHud();
  if (flash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${flash})`;
    ctx.fillRect(0, 0, view.w, view.h);
  }
}

function drawWarp() {
  const speed = Math.min(1, warpTime / 2.2);
  ctx.fillStyle = `rgba(4, 2, 16, ${0.35 + 0.4 * (1 - speed)})`;
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
  ctx.font = `${Math.round(view.h * 0.07)}px Bangers, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgba(255, 230, 120, ${Math.min(1, warpTime * 1.5) * (warpTime > 2.4 ? Math.max(0, 1 - (warpTime - 2.4) * 2) : 1)})`;
  ctx.fillText('LIGHTYEAR JUMP!', view.cx, view.h * 0.5);
  if (warpTime > 2.6) {
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, (warpTime - 2.6) * 2.5)})`;
    ctx.fillRect(0, 0, view.w, view.h);
  }
}

function drawPlanet() {
  drawSky();
  drawMountains();

  /** @type {{ z: number, behind: boolean, draw: () => void }[]} */
  const list = [];
  for (const s of spires) list.push({ z: s.z, behind: isBehindHorizon(s.x, s.z), draw: () => drawSpireAt(s) });
  for (const a of aliens) list.push({ z: a.z, behind: isBehindHorizon(a.x, a.z), draw: () => drawAlien(a) });
  for (const g of gems) list.push({ z: g.z, behind: false, draw: () => drawGem(g) });
  for (const b of bullets) list.push({ z: b.z, behind: false, draw: () => drawBolt(b.x, 0.3, b.z, '#ff7ae8', 0.8 + (b.dmg - 1) * 0.2) });
  for (const r of rockets) list.push({ z: r.z, behind: false, draw: () => drawRocket(r) });
  for (const s of slimes) list.push({ z: s.z, behind: false, draw: () => drawSlime(s) });
  if (boss) list.push({ z: boss.z, behind: isBehindHorizon(boss.x, boss.z), draw: drawBoss });
  if (state !== 'dying' && state !== 'lost') list.push({ z: player.z, behind: false, draw: drawPlayer });
  list.sort((p, q) => q.z - p.z);

  for (const item of list) if (item.behind) item.draw();
  drawGround();
  for (const item of list) if (!item.behind) item.draw();
  drawParticles();
}

function drawSky() {
  const sky = ctx.createLinearGradient(0, 0, 0, view.h * 0.6);
  sky.addColorStop(0, '#0d0322');
  sky.addColorStop(0.55, '#4a1258');
  sky.addColorStop(1, '#ff7a3c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  for (const s of skyStars) {
    ctx.globalAlpha = 0.4 + 0.4 * Math.sin(time * 2 + s.x * 40);
    ctx.fillRect(s.x * view.w, s.y * view.h * 0.3, s.r, s.r);
  }
  ctx.globalAlpha = 1;
  const pr = view.h * 0.11;
  const px = view.w * 0.8;
  const py = view.h * 0.13;
  const planet = ctx.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.1, px, py, pr);
  planet.addColorStop(0, '#ffd1f2');
  planet.addColorStop(0.5, '#c24bd0');
  planet.addColorStop(1, '#3c0f56');
  ctx.fillStyle = planet;
  ctx.beginPath();
  ctx.arc(px, py, pr, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 210, 160, 0.55)';
  ctx.lineWidth = pr * 0.08;
  ctx.beginPath();
  ctx.ellipse(px, py, pr * 1.7, pr * 0.32, -0.25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#f4e9ff';
  ctx.beginPath();
  ctx.arc(view.w * 0.16, view.h * 0.09, pr * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawMountains() {
  const layers = [
    { colour: '#7a2a6e', height: 0.11, freq: 1.4, drift: 0.004 },
    { colour: '#541a4c', height: 0.07, freq: 2.3, drift: 0.008 },
  ];
  for (const layer of layers) {
    ctx.fillStyle = layer.colour;
    ctx.beginPath();
    ctx.moveTo(0, horizonY(0) + 4);
    for (let x = 0; x <= view.w + 12; x += 12) {
      const u = x / view.w + time * layer.drift;
      const peak = 0.5 + 0.3 * Math.sin(u * 9 * layer.freq) + 0.2 * Math.sin(u * 23 * layer.freq + 1.3);
      ctx.lineTo(x, horizonY(x) - view.h * layer.height * peak);
    }
    ctx.lineTo(view.w, horizonY(view.w) + 4);
    ctx.closePath();
    ctx.fill();
  }
}

function drawGround() {
  const top = horizonY(view.cx);
  const ground = ctx.createLinearGradient(0, top, 0, view.h);
  ground.addColorStop(0, '#d8642e');
  ground.addColorStop(0.25, '#a8401f');
  ground.addColorStop(1, '#4a160e');
  ctx.fillStyle = ground;
  ctx.beginPath();
  ctx.moveTo(0, view.h);
  for (let x = 0; x <= view.w + 10; x += 10) ctx.lineTo(x, horizonY(x));
  ctx.lineTo(view.w, view.h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 190, 120, 0.8)';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#ff9a4a';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  for (let x = 0; x <= view.w + 10; x += 10) ctx[x ? 'lineTo' : 'moveTo'](x, horizonY(x));
  ctx.stroke();
  ctx.shadowBlur = 0;

  for (const c of craters) {
    if (isBehindHorizon(c.x, c.z) || c.z < 1) continue;
    const mid = project(c.x, 0, c.z);
    const near = project(c.x, 0, c.z - c.r);
    const far = project(c.x, 0, c.z + c.r);
    const rx = c.r * view.unit * mid.s;
    const ry = Math.max(1, (near.y - far.y) / 2);
    ctx.fillStyle = 'rgba(70, 18, 10, 0.45)';
    ctx.beginPath();
    ctx.ellipse(mid.x, mid.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 170, 110, 0.35)';
    ctx.lineWidth = Math.max(1, rx * 0.08);
    ctx.beginPath();
    ctx.ellipse(mid.x, mid.y + ry * 0.15, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
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

/** @param {{ x: number, z: number, h: number, w: number, hue: string }} s */
function drawSpireAt(s) {
  const at = project(s.x, 0, s.z);
  drawSpire(ctx, at.x, at.y, s.w * view.unit * at.s, s.h * view.unit * at.s, s.hue);
}

/** @param {Alien} a */
function drawAlien(a) {
  const img = a.type === 'tank' ? sprites.granddaddy : sprites[ENEMY_TYPES[a.type].sprite];
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

/** @param {{ x: number, z: number, t: number }} g */
function drawGem(g) {
  const at = project(g.x, 0.12 + Math.sin(g.t * 6) * 0.03, g.z);
  drawCrystal(ctx, at.x, at.y, Math.max(3, 0.07 * view.unit * at.s), g.t);
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
  const at = project(r.x, 0.35, r.z);
  const size = Math.max(10, 0.22 * view.unit * at.s);
  if (cupcake.complete && cupcake.naturalWidth) {
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.rotate(Math.atan2(r.vx, r.vz) * 0.6);
    ctx.drawImage(cupcake, -size / 2, -size / 2, size, size);
    ctx.restore();
  } else drawBolt(r.x, 0.35, r.z, '#ffb02e', 1.6);
}

/** @param {{ x: number, z: number, t: number, flight: number }} s */
function drawSlime(s) {
  const p = Math.min(1, s.t / s.flight);
  const height = Math.sin(p * Math.PI) * 1.1;
  const shadow = project(s.x, 0, s.z);
  const at = project(s.x, height + 0.1, s.z);
  const r = Math.max(3, 0.09 * view.unit * at.s);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(shadow.x, shadow.y, r, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9dff3a';
  ctx.beginPath();
  ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.beginPath();
  ctx.arc(at.x - r * 0.3, at.y - r * 0.3, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawBoss() {
  if (!boss) return;
  const img = sprites.mothership;
  if (!img.complete || !img.naturalWidth) return;
  const at = project(boss.x, 1.25, boss.z);
  const w = 3 * view.unit * at.s;
  const h = w * (img.naturalHeight / img.naturalWidth);
  const hover = Math.sin(boss.t * 2) * 6;
  const glow = ctx.createRadialGradient(at.x, at.y - h / 2, 0, at.x, at.y - h / 2, w * 0.7);
  glow.addColorStop(0, 'rgba(120, 255, 120, 0.35)');
  glow.addColorStop(1, 'rgba(120, 255, 120, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(at.x - w, at.y - h * 1.6, w * 2, h * 2.2);
  if (boss.dying) ctx.globalAlpha = Math.max(0, 1 - boss.dying / 2.6);
  ctx.drawImage(img, at.x - w / 2, at.y - h + hover, w, h);
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
    drawGranny(ctx, ground.x, ground.y, w, { t: time, flame: player.dash > 0 ? 3 : 1 + Math.min(1, Math.hypot(player.vx, player.vz) / player.speed) * 0.6, lean: clamp(player.vx / player.speed, -1, 1) });
  }
  if (levels.orbit > 0) drawOrbit(false);
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

  const hpW = Math.min(280, view.w * 0.3);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(pad, pad, hpW, big * 0.6);
  ctx.fillStyle = player.hp > player.maxHp * 0.3 ? '#ff4f6a' : '#ff2a2a';
  ctx.fillRect(pad, pad, hpW * (player.hp / player.maxHp), big * 0.6);
  ctx.strokeStyle = '#fff3c4';
  ctx.lineWidth = 2;
  ctx.strokeRect(pad, pad, hpW, big * 0.6);
  ctx.font = `${Math.round(big * 0.55)}px Bangers, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  outlineText(`GRANNY ${Math.ceil(player.hp)}`, pad + 8, pad + big * 0.3, '#ffffff');

  const owned = /** @type {import('./upgrades.js').UpgradeId[]} */ (Object.keys(levels)).filter((id) => levels[id] > 0);
  ctx.font = `${Math.round(big * 0.75)}px Bangers, sans-serif`;
  owned.forEach((id, i) => {
    const x = pad + i * big * 1.5;
    const y = pad + big * 1.25;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(x, y - big * 0.55, big * 1.3, big * 1.1);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(UPGRADES[id].icon, x + big * 0.55, y);
    ctx.font = `${Math.round(big * 0.45)}px Bangers, sans-serif`;
    outlineText(String(levels[id]), x + big * 1.08, y + big * 0.3, '#ffd23a');
    ctx.font = `${Math.round(big * 0.75)}px Bangers, sans-serif`;
  });

  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.font = `${big}px Bangers, sans-serif`;
  outlineText(`👾 ${player.kills.toLocaleString()}`, view.w - pad, pad, '#fff3c4');

  ctx.textAlign = 'center';
  if (boss && boss.z <= BOSS_Z + 0.1) {
    const barW = Math.min(view.w * 0.4, 440);
    const barH = Math.max(10, big * 0.4);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(view.cx - barW / 2, pad, barW, barH);
    ctx.fillStyle = '#ff3a5a';
    ctx.fillRect(view.cx - barW / 2, pad, barW * (boss.hp / BOSS_HP), barH);
    ctx.font = `${Math.round(big * 0.6)}px Bangers, sans-serif`;
    outlineText('MOTHERSHIP', view.cx, pad + barH + 4, '#ffb3c0');
  } else {
    ctx.font = `${big}px Bangers, sans-serif`;
    outlineText(clock < BOSS_TIME ? `🛸 ${formatClock(BOSS_TIME - clock)}` : '🛸 INCOMING', view.cx, pad, '#ffe27a');
  }

  const xpH = Math.max(8, big * 0.32);
  const xpY = view.h - xpH;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, xpY, view.w, xpH);
  ctx.fillStyle = '#5dff8a';
  ctx.fillRect(0, xpY, view.w * Math.min(1, player.crystals / crystalsForLevel(player.level)), xpH);
  ctx.font = `${Math.round(big * 0.7)}px Bangers, sans-serif`;
  ctx.textBaseline = 'bottom';
  outlineText(`LEVEL ${player.level}`, view.cx, xpY - 2, '#5dff8a');

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
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
resize();
resetRun();
loadSounds(['nuke-fire', 'battle-cry-titans', 'siren-alert', 'mothership', 'granddaddywarning', 'lazer1', 'death', 'slime', 'wrong', 'electro', 'missile', 'nuke-explosion', 'turret-upgrade', 'core-collect', 'core-earned']);
document.getElementById('hl-start')?.addEventListener('click', startWarp);
requestAnimationFrame(frame);
