/**
 * Coach tips: a red squircle with Granny peeking out, a dimmed screen with
 * the highlighted parts cut out, and arrows from the card to each target.
 * Targets are found in the live page and re-measured on resize and scroll,
 * so the arrows stay on the right buttons whatever the layout.
 */

/**
 * @typedef {Object} CoachTip
 * @property {string} title
 * @property {string} text
 * @property {string[]} targets - CSS selectors of what the tip points at
 * @property {number} [step] - Number shown in the badge (opening tour only)
 */

/** Opening tour, in order. */
export const TOUR_TIPS = ['pick', 'level', 'armory'];

/** @type {Record<string, CoachTip>} */
export const COACH_TIPS = {
  pick: {
    step: 1,
    title: 'CHARGE GRANNY’S DEFENCES!',
    text: 'Get 10 maths questions right. Grab a RANDOM MISSION up here, or pick a topic down there!',
    targets: ['#mission-start-mixed', '.mission-all-topics'],
  },
  level: {
    step: 2,
    title: 'TOUGHER MATHS = MORE XP',
    text: 'Choose a harder level and every right answer earns more XP — up to 2.5×!',
    targets: ['.mission-level-buttons'],
  },
  armory: {
    step: 3,
    title: 'POWER UP!',
    text: 'XP unlocks new turrets in the Armory. Crystals in your vault make them stronger.',
    targets: ['.armory-promo', '.crystal-vault'],
  },
  contact: {
    title: 'THEY’VE LANDED!',
    text: 'Your defences are charged. Press DEFEND GRANNY to start the battle!',
    targets: ['#btn-hold-line'],
  },
  siege: {
    title: 'BUILD A MAZE!',
    text: 'Hedges are cheap walls. Make the aliens walk the long way round, right past your turrets!',
    targets: ['[data-turret-id="hedge"]'],
  },
  crystal: {
    title: 'YOU’VE GOT A CRYSTAL!',
    text: 'Spend it in the Armory to make one of your turrets hit harder.',
    targets: ['.crystal-vault'],
  },
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const PAD = 8;
const GAP = 46;
/** Extra room when one card forks arrows to several targets. */
const GAP_FORK = 96;
const STEM = 34;
const EDGE = 12;

/** @type {(() => void)|null} */
let closeActive = null;

export function isCoachOpen() {
  return closeActive !== null;
}

export function closeCoach() {
  closeActive?.();
}

/** @param {string} id */
export function tipTargetsPresent(id) {
  const tip = COACH_TIPS[id];
  return Boolean(tip) && visibleTargets(tip).length > 0;
}

/** @param {CoachTip} tip */
function visibleTargets(tip) {
  return tip.targets
    .map((sel) => /** @type {HTMLElement|null} */ (document.querySelector(sel)))
    .filter((el) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
}

/** @param {DOMRect[]} rects */
function unionRect(rects) {
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));
  const right = Math.max(...rects.map((r) => r.right));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Put the card beside the highlighted area, preferring the side with room.
 * @param {ReturnType<typeof unionRect>} u @param {number} w @param {number} h
 */
function placeCard(u, w, h, gap = GAP) {
  const GAP = gap;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const midY = clamp(u.top + u.height / 2 - h / 2, EDGE, vh - h - EDGE);
  const midX = clamp(u.left + u.width / 2 - w / 2, EDGE, vw - w - EDGE);
  const options = [
    { x: u.right + GAP, y: midY, side: 'left' },
    { x: u.left - GAP - w, y: midY, side: 'right' },
    { x: midX, y: u.bottom + GAP, side: 'top' },
    { x: midX, y: u.top - GAP - h, side: 'bottom' },
  ];
  const fits = options.find((o) => o.x >= EDGE && o.y >= EDGE && o.x + w <= vw - EDGE && o.y + h <= vh - EDGE);
  return fits ?? { x: midX, y: clamp(vh - h - EDGE * 2, EDGE, vh - h - EDGE), side: 'none' };
}

/** Closest point on a rect's edge to (x, y). */
function nearestOnRect(r, x, y) {
  const px = clamp(x, r.left, r.right);
  const py = clamp(y, r.top, r.bottom);
  if (px !== x || py !== y) return { x: px, y: py };
  return { x: r.left + r.width / 2, y: r.top };
}

/**
 * Show tips one after another.
 * @param {string[]} ids
 * @param {{
 *   onSeen?: (id: string) => void,
 *   onTurnOff?: () => void,
 *   onDone?: () => void,
 * }} [handlers]
 */
export function showCoachTips(ids, handlers = {}) {
  closeCoach();
  const queue = ids.filter((id) => tipTargetsPresent(id));
  if (!queue.length) return false;

  const root = document.createElement('div');
  root.className = 'coach-layer';
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('coach-svg');
  svg.setAttribute('aria-hidden', 'true');
  const shade = document.createElementNS(SVG_NS, 'path');
  shade.classList.add('coach-shade');
  shade.setAttribute('fill-rule', 'evenodd');
  const rings = document.createElementNS(SVG_NS, 'g');
  rings.classList.add('coach-rings');
  const arrows = document.createElementNS(SVG_NS, 'g');
  arrows.classList.add('coach-arrows');
  svg.append(shade, rings, arrows);

  const card = document.createElement('div');
  card.className = 'coach-card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-live', 'polite');
  card.innerHTML = `
    <div class="coach-granny" aria-hidden="true"></div>
    <div class="coach-step" aria-hidden="true"></div>
    <div class="coach-body">
      <h3 class="coach-title"></h3>
      <p class="coach-text"></p>
      <div class="coach-actions">
        <button type="button" class="coach-off">Turn off these tips</button>
        <button type="button" class="coach-next">NEXT ▸</button>
      </div>
    </div>`;
  root.append(svg, card);
  document.body.append(root);

  const titleEl = /** @type {HTMLElement} */ (card.querySelector('.coach-title'));
  const textEl = /** @type {HTMLElement} */ (card.querySelector('.coach-text'));
  const stepEl = /** @type {HTMLElement} */ (card.querySelector('.coach-step'));
  const nextBtn = /** @type {HTMLButtonElement} */ (card.querySelector('.coach-next'));

  let index = 0;
  /** @type {HTMLElement[]} */
  let targets = [];
  let raf = 0;

  const onTargetTap = () => {
    handlers.onSeen?.(queue[index]);
    finish();
  };

  function unbindTargets() {
    targets.forEach((el) => el.removeEventListener('click', onTargetTap, true));
  }

  function layout() {
    raf = 0;
    const live = targets.filter((el) => el.isConnected);
    if (!live.length) return;
    const rects = live.map((el) => el.getBoundingClientRect());
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);

    const holes = rects.map((r) => {
      const x = r.left - PAD;
      const y = r.top - PAD;
      const w = r.width + PAD * 2;
      const h = r.height + PAD * 2;
      const rad = Math.min(18, w / 2, h / 2);
      return { x, y, w, h, rad };
    });
    const roundRect = ({ x, y, w, h, rad }) =>
      `M${x + rad},${y} H${x + w - rad} Q${x + w},${y} ${x + w},${y + rad} V${y + h - rad} Q${x + w},${y + h} ${x + w - rad},${y + h} H${x + rad} Q${x},${y + h} ${x},${y + h - rad} V${y + rad} Q${x},${y} ${x + rad},${y} Z`;
    shade.setAttribute('d', `M0,0 H${vw} V${vh} H0 Z ${holes.map(roundRect).join(' ')}`);
    rings.innerHTML = holes.map((h) => `<path d="${roundRect(h)}" />`).join('');

    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const u = unionRect(rects);
    let pos = placeCard(u, cw, ch, rects.length > 1 ? GAP_FORK : GAP);
    if (pos.side === 'none' && rects.length > 1) pos = placeCard(u, cw, ch, GAP);
    card.style.left = `${Math.round(pos.x)}px`;
    card.style.top = `${Math.round(pos.y)}px`;

    // One anchor on the card edge facing the targets, so several arrows fork from the same point.
    const anchor =
      pos.side === 'left' ? { x: pos.x, y: pos.y + ch / 2 }
      : pos.side === 'right' ? { x: pos.x + cw, y: pos.y + ch / 2 }
      : pos.side === 'top' ? { x: pos.x + cw / 2, y: pos.y }
      : pos.side === 'bottom' ? { x: pos.x + cw / 2, y: pos.y + ch }
      : null;
    arrows.innerHTML = '';
    if (!anchor) return;
    // Several targets share one stem that forks, so the arrow reads as a single "this or that".
    const out =
      pos.side === 'left' ? { x: -1, y: 0 }
      : pos.side === 'right' ? { x: 1, y: 0 }
      : pos.side === 'top' ? { x: 0, y: -1 }
      : { x: 0, y: 1 };
    const fork = rects.length > 1 ? { x: anchor.x + out.x * STEM, y: anchor.y + out.y * STEM } : anchor;
    if (fork !== anchor) {
      const stem = `M${anchor.x},${anchor.y} L${fork.x},${fork.y}`;
      arrows.insertAdjacentHTML('beforeend', `<path class="coach-arrow-edge" d="${stem}" /><path class="coach-arrow" d="${stem}" />`);
    }
    rects.forEach((r) => {
      const hole = { left: r.left - PAD, top: r.top - PAD, right: r.right + PAD, bottom: r.bottom + PAD };
      const end = nearestOnRect({ ...hole, width: hole.right - hole.left, height: hole.bottom - hole.top }, fork.x, fork.y);
      const horizontal = pos.side === 'left' || pos.side === 'right';
      const ctrl = horizontal ? { x: end.x, y: fork.y } : { x: fork.x, y: end.y };
      const dx = end.x - ctrl.x;
      const dy = end.y - ctrl.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const tip = { x: end.x - ux * 4, y: end.y - uy * 4 };
      const base = { x: tip.x - ux * 16, y: tip.y - uy * 16 };
      const head = `M${tip.x},${tip.y} L${base.x - uy * 11},${base.y + ux * 11} L${base.x + uy * 11},${base.y - ux * 11} Z`;
      const d = `M${fork.x},${fork.y} Q${ctrl.x},${ctrl.y} ${base.x},${base.y}`;
      arrows.insertAdjacentHTML(
        'beforeend',
        `<path class="coach-arrow-edge" d="${d}" /><path class="coach-arrow" d="${d}" /><path class="coach-arrow-head" d="${head}" />`
      );
    });
  }

  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(layout);
  };

  function show() {
    const tip = COACH_TIPS[queue[index]];
    unbindTargets();
    targets = visibleTargets(tip);
    if (!targets.length) {
      advance();
      return;
    }
    targets[0].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    targets.forEach((el) => el.addEventListener('click', onTargetTap, true));
    titleEl.textContent = tip.title;
    textEl.textContent = tip.text;
    stepEl.textContent = tip.step ? String(tip.step) : '!';
    nextBtn.textContent = index >= queue.length - 1 ? 'GOT IT!' : 'NEXT ▸';
    card.classList.remove('coach-card-in');
    void card.offsetWidth;
    card.classList.add('coach-card-in');
    layout();
    setTimeout(schedule, 350);
  }

  function advance() {
    if (index >= queue.length - 1) {
      finish();
      return;
    }
    index += 1;
    show();
  }

  function finish() {
    unbindTargets();
    window.removeEventListener('resize', schedule);
    window.removeEventListener('scroll', schedule, true);
    document.removeEventListener('keydown', onKey);
    cancelAnimationFrame(raf);
    root.remove();
    closeActive = null;
    handlers.onDone?.();
  }

  /** @param {KeyboardEvent} e */
  function onKey(e) {
    if (e.key === 'Escape') {
      handlers.onSeen?.(queue[index]);
      advance();
    }
  }

  nextBtn.addEventListener('click', () => {
    handlers.onSeen?.(queue[index]);
    advance();
  });
  card.querySelector('.coach-off')?.addEventListener('click', () => {
    handlers.onTurnOff?.();
    finish();
  });
  window.addEventListener('resize', schedule);
  window.addEventListener('scroll', schedule, true);
  document.addEventListener('keydown', onKey);
  closeActive = finish;
  show();
  return true;
}
