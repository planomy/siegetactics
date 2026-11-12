/**
 * A visual reward, not a second currency: every maths answer powers up
 * Granny's defence rig. Existing turret artwork does the heavy lifting.
 * No timers or save state are needed; the save's maths gate is the source
 * of truth, including after a page reload.
 */
const STAGES = [
  { min: 0, id: 'offline', name: 'SYSTEMS OFFLINE', detail: 'Answer maths questions to wake up Granny’s defences.' },
  { min: 1, id: 'warming', name: 'POWERING UP', detail: 'The engines are warming up.' },
  { min: 3, id: 'sparking', name: 'WEAPONS ONLINE', detail: 'Turrets are coming to life!' },
  { min: 6, id: 'charged', name: 'MIGHTY DEFENCES', detail: 'Energy surging through the system.' },
  { min: 9, id: 'nearly', name: 'MAXIMUM POWER', detail: 'One final charge before battle!' },
  { min: 10, id: 'ready', name: 'FULLY ARMED!', detail: 'Defences charged. Granny is ready for the aliens!' },
];

/** What the badge says once the forge is fully charged; one is picked each time it fills. */
export const FULLY_ARMED_LINES = [
  'FULLY ARMED!',
  'FULLY SIK, BRO!',
  'SO TOUGH!',
  'GO GET ’EM!',
  'LOCKED AND LOADED!',
  'BRING IT ON!',
  'MAXIMUM GRANNY!',
  'UNSTOPPABLE!',
  'TOO STRONG!',
  'ALIENS BEWARE!',
  'BEAST MODE!',
  'READY TO RUMBLE!',
  'SEND IT!',
  'LEGEND STATUS!',
];

/** @param {number} done */
export function powerParticleCount(done) {
  // Deliberately capped: dozens of CSS particles, not hundreds of canvas draws.
  const progress = Math.max(0, Math.min(10, Math.floor(Number(done) || 0)));
  return 2 + Math.round(progress * 3.6);
}

/** @returns {string} Deterministic particles never jump positions on re-render. */
function renderEnergyParticles() {
  return Array.from({ length: 40 }, (_, i) => {
    const angle = (i * 137.508) % 360;
    const radius = 45 + ((i * 31) % 85);
    const duration = (5.2 + (i % 7) * 0.67).toFixed(2);
    const delay = ((i * 0.37) % 7.5).toFixed(2);
    const size = i % 7 === 0 ? 5 : 2 + (i % 3);
    const type = i % 5 === 0 ? ' forge-mote--spark' : '';
    return `<span class="forge-mote${type}" style="--forge-angle:${angle.toFixed(1)}deg;--forge-radius:${radius}px;--forge-duration:${duration}s;--forge-delay:-${delay}s;--forge-size:${size}px" aria-hidden="true"></span>`;
  }).join('');
}

/** @param {number} done */
export function powerStage(done) {
  const n = Math.max(0, Math.min(10, Number(done) || 0));
  return STAGES.findLast((stage) => n >= stage.min) ?? STAGES[0];
}

/**
 * The player's squad: their best turret in the centre (most upgraded, then newest),
 * with two other turrets they own, picked at random, either side.
 * @param {string[]} owned Turret ids the player has unlocked, in unlock order.
 * @param {(id: string) => number} levelOf
 * @param {() => number} [random]
 * @returns {{ main: string, left: string, right: string }}
 */
export function pickForgeSquad(owned, levelOf, random = Math.random) {
  const list = owned.length ? [...owned] : ['granny-blaster'];
  let main = list[list.length - 1];
  for (const id of list) {
    if (levelOf(id) > levelOf(main)) main = id;
  }
  const rest = list.filter((id) => id !== main);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return { main, left: rest[0] ?? main, right: rest[1] ?? rest[0] ?? main };
}

/**
 * @param {HTMLElement|null} host
 * @param {{done:number,total?:number,correct?:boolean|null,squad?:{main:string,left:string,right:string},mainLevel?:number}} state
 */
export function renderPowerCore(host, state) {
  if (!host) return;
  const total = Math.max(1, state.total ?? 10);
  const done = Math.min(total, Math.max(0, Math.floor(state.done)));
  const stage = powerStage(done);
  if (!host.querySelector('.power-rig')) {
    host.innerHTML = `
      <div class="power-rig" data-stage="offline">
        <header class="power-heading">
          <span class="power-eyebrow">GRANNY'S DEFENCE FORGE</span>
          <h2>BUILD YOUR MIGHT</h2>
        </header>

        <div class="power-scene" aria-hidden="true">
          <div class="forge-mist forge-mist--outer"></div>
          <div class="forge-mist forge-mist--inner"></div>
          <div class="power-halo power-halo-outer"></div>
          <div class="power-halo power-halo-inner"></div>
          <div class="power-energy-beams"></div>
          <div class="power-energy-ring"></div>
          <div class="power-turret power-turret-left"><img src="assets/turrets/boom-gnome.png" alt="" /></div>
          <div class="power-turret power-turret-main"><img src="assets/turrets/granny-blaster.png" alt="" /></div>
          <div class="power-turret power-turret-right"><img src="assets/turrets/rocket-rooster.png" alt="" /></div>
          <div class="power-core-glow"></div>
          <div class="power-core-symbol">⚡</div>
          <div class="forge-particle-field">${renderEnergyParticles()}</div>
          <div class="forge-charge-flare"></div>
          <div class="power-burst"></div>
        </div>

        <div class="power-rank" aria-live="polite" aria-atomic="true">
          <span class="power-rank-name">SYSTEMS OFFLINE</span>
          <strong class="power-charge-number">0<span>/10</span></strong>
        </div>
        <div class="power-charge-track" role="progressbar" aria-label="Defence power" aria-valuemin="0" aria-valuemax="10" aria-valuenow="0">
          <div class="power-charge-fill"></div>
        </div>
        <div class="power-charge-cells" aria-hidden="true">
          ${Array.from({length:10},(_,i)=>`<span class="power-charge-cell" data-cell="${i+1}"></span>`).join('')}
        </div>
      </div>
    `;
  }
  const rig = host.querySelector('.power-rig');
  if (!rig) return;
  if (state.squad) {
    for (const side of /** @type {const} */ (['main', 'left', 'right'])) {
      const img = rig.querySelector(`.power-turret-${side} img`);
      const src = `assets/turrets/${state.squad[side]}.png`;
      if (img instanceof HTMLImageElement && img.getAttribute('src') !== src) img.setAttribute('src', src);
    }
    const level = state.mainLevel ?? 1;
    const mainEl = rig.querySelector('.power-turret-main');
    if (mainEl instanceof HTMLElement) {
      mainEl.dataset.level = String(level);
      let stars = mainEl.querySelector('.power-turret-stars');
      if (level >= 2) {
        if (!stars) {
          stars = document.createElement('span');
          stars.className = 'power-turret-stars';
          stars.setAttribute('aria-hidden', 'true');
          mainEl.append(stars);
        }
        stars.textContent = '★'.repeat(level);
      } else {
        stars?.remove();
      }
    }
  }
  const oldProgress = Number(rig.dataset.progress || 0);
  rig.dataset.stage = stage.id;
  rig.dataset.progress = String(done);
  if (stage.id === 'ready') {
    if (!rig.dataset.readyLine) {
      rig.dataset.readyLine = FULLY_ARMED_LINES[Math.floor(Math.random() * FULLY_ARMED_LINES.length)];
    }
  } else {
    delete rig.dataset.readyLine;
  }
  const rank = rig.querySelector('.power-rank-name');
  if (rank) rank.textContent = stage.id === 'ready' ? rig.dataset.readyLine : stage.name;
  const number = rig.querySelector('.power-charge-number');
  if (number) number.innerHTML = `${done}<span>/${total}</span>`;
  const bar = rig.querySelector('.power-charge-track');
  if (bar) bar.setAttribute('aria-valuenow', String(done));
  const fill = rig.querySelector('.power-charge-fill');
  if (fill) fill.style.width = `${Math.round(100 * done / total)}%`;
  rig.querySelectorAll('.power-charge-cell').forEach((cell,i)=> {
    cell.classList.toggle('is-powered', i < done);
  });
  const activeParticles = powerParticleCount(done);
  rig.querySelectorAll('.forge-mote').forEach((mote, i) => {
    mote.classList.toggle('is-live', i < activeParticles);
  });

  // No false "new answer" flash when a save is restored on page load.
  if (rig.dataset.initialized === 'true' && done > oldProgress) {
    const burst = rig.querySelector('.power-burst');
    const flare = rig.querySelector('.forge-charge-flare');
    burst?.classList.remove('is-firing');
    flare?.classList.remove('is-firing', 'is-correct');
    burst?.classList.toggle('is-correct', state.correct === true);
    flare?.classList.toggle('is-correct', state.correct === true);
    if (burst) {
      void burst.offsetWidth;
      burst.classList.add('is-firing');
    }
    if (flare) {
      void flare.offsetWidth;
      flare.classList.add('is-firing');
    }
  }
  rig.dataset.initialized = 'true';
}
