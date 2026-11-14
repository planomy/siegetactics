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
 * @property {string} [punch] - Short gold line under the text
 * @property {string[]} targets - CSS selectors of what the tip points at
 * @property {number} [step] - Number shown in the badge (opening tour only)
 * @property {boolean} [between] - Sit the card level with the gap between two stacked targets,
 *   so one arrow forks up to the first and one down to the second
 */

/** Opening tour, in order. */
export const TOUR_TIPS = ['pick', 'level', 'armory'];

/** @type {Record<string, CoachTip>} */
export const COACH_TIPS = {
  pick: {
    step: 1,
    title: 'GET READY TO DESTROY SOME ALIENS!',
    text: 'Select either a RANDOM MISSION or a TOPIC CARD and answer 10 maths questions.',
    punch: 'Practice makes KABOOM!',
    targets: ['#mission-start-mixed', '.mission-all-topics'],
    between: true,
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
/** Arrow body width; heads scale to the room they have. */
const SHAFT = 30;
/** Arrows start this far under the card so they look like they come out of it. */
const TUCK = 22;
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
function placeCard(u, w, h, gap = GAP, centerY = u.top + u.height / 2) {
  const GAP = gap;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const midY = clamp(centerY - h / 2, EDGE, vh - h - EDGE);
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

/**
 * Where an arrow from a card at the side should land: into the bottom of a target above,
 * the top of a target below (a little inside, for big areas), or straight into its side.
 */
function aimPoint(hole, from) {
  const w = hole.right - hole.left;
  const h = hole.bottom - hole.top;
  const x = from.x > hole.right ? hole.left + w * 0.72
    : from.x < hole.left ? hole.left + w * 0.28
    : clamp(from.x, hole.left, hole.right);
  if (hole.bottom < from.y) return { x, y: hole.bottom };
  // Big areas take the arrow inside, deep enough for a proper downward swoop.
  if (hole.top > from.y) return { x, y: h > 150 ? Math.min(hole.bottom - 12, Math.max(hole.top + 36, from.y + 120)) : hole.top };
  return nearestOnRect({ ...hole, width: w, height: h }, from.x, from.y);
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
  const defs = document.createElementNS(SVG_NS, 'defs');
  defs.innerHTML = '<mask id="coach-arrow-mask" maskUnits="userSpaceOnUse"><g class="coach-mask-shapes"></g></mask>';
  svg.append(defs, shade, rings, arrows);
  const arrowMask = /** @type {SVGMaskElement} */ (defs.querySelector('mask'));
  const maskShapes = /** @type {SVGGElement} */ (defs.querySelector('.coach-mask-shapes'));

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
      <p class="coach-punch" hidden></p>
      <div class="coach-actions">
        <button type="button" class="coach-off">Turn off these tips</button>
        <button type="button" class="coach-next">NEXT ▸</button>
      </div>
    </div>`;
  root.append(svg, card);
  document.body.append(root);

  const titleEl = /** @type {HTMLElement} */ (card.querySelector('.coach-title'));
  const textEl = /** @type {HTMLElement} */ (card.querySelector('.coach-text'));
  const punchEl = /** @type {HTMLElement} */ (card.querySelector('.coach-punch'));
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
    const tip = COACH_TIPS[queue[index]];
    // Trunk just above the lower target, leaving the most room for the upward arrowhead.
    const between = Boolean(tip.between && rects.length === 2 && rects[1].top > rects[0].bottom);
    const centerY = between ? Math.min(rects[0].bottom + PAD + 80, rects[1].top + 40) : undefined;
    let pos = placeCard(u, cw, ch, rects.length > 1 ? GAP_FORK : GAP, centerY);
    if (pos.side === 'none' && rects.length > 1) pos = placeCard(u, cw, ch, GAP, centerY);
    const anchorY = centerY !== undefined ? clamp(centerY, pos.y + 30, pos.y + ch - 30) : pos.y + ch / 2;
    card.style.left = `${Math.round(pos.x)}px`;
    card.style.top = `${Math.round(pos.y)}px`;

    // Every arrow starts at one point tucked under the card, so branches peel off a shared trunk.
    const anchor =
      pos.side === 'left' ? { x: pos.x + TUCK, y: anchorY }
      : pos.side === 'right' ? { x: pos.x + cw - TUCK, y: anchorY }
      : pos.side === 'top' ? { x: pos.x + cw / 2, y: pos.y + TUCK }
      : pos.side === 'bottom' ? { x: pos.x + cw / 2, y: pos.y + ch - TUCK }
      : null;
    arrows.innerHTML = '';
    maskShapes.innerHTML = '';
    if (!anchor) return;
    const horizontal = pos.side === 'left' || pos.side === 'right';
    const out =
      pos.side === 'left' ? { x: -1, y: 0 }
      : pos.side === 'right' ? { x: 1, y: 0 }
      : pos.side === 'top' ? { x: 0, y: -1 }
      : { x: 0, y: 1 };
    const edgeFrom = { x: anchor.x + out.x * TUCK, y: anchor.y + out.y * TUCK };

    const shafts = [];
    const heads = [];
    rects.forEach((r, i) => {
      const hole = { left: r.left - PAD, top: r.top - PAD, right: r.right + PAD, bottom: r.bottom + PAD };
      let end = horizontal
        ? aimPoint(hole, edgeFrom)
        : nearestOnRect({ ...hole, width: hole.right - hole.left, height: hole.bottom - hole.top }, edgeFrom.x, edgeFrom.y);
      // Direction the head travels as it lands.
      let dir;
      if (between && horizontal) {
        // Stacked pair: up into the first, down into the second.
        const x = aimPoint(hole, edgeFrom).x;
        end = i === 0
          ? { x, y: hole.bottom }
          : { x, y: clamp(anchor.y + 120, hole.top + 36, hole.bottom - 12) };
        dir = i === 0 ? { x: 0, y: -1 } : { x: 0, y: 1 };
      } else if (horizontal) {
        dir = end.y < hole.bottom && end.y > hole.top && end.y !== hole.top
          ? (end.y > anchor.y ? { x: 0, y: 1 } : end.x < anchor.x ? { x: -1, y: 0 } : { x: 1, y: 0 })
          : end.y <= anchor.y ? { x: 0, y: -1 } : { x: 0, y: 1 };
        if (Math.abs(end.y - anchor.y) < 4) dir = { x: out.x, y: 0 };
      } else {
        dir = { x: 0, y: out.y };
      }
      const run = dir.y ? Math.abs(end.y - anchor.y) : Math.abs(end.x - anchor.x);
      const len = clamp(Math.min(run * 0.55, run - 18), 22, 56);
      const half = Math.max(SHAFT * 1.15, len * 0.82);
      const point = { x: end.x - dir.x * 2, y: end.y - dir.y * 2 };
      const base = { x: point.x - dir.x * len, y: point.y - dir.y * len };
      // Handles never swing past the head, so short climbs stay a clean hook instead of a loop.
      const along = horizontal ? Math.abs(base.x - anchor.x) : Math.abs(base.y - anchor.y);
      const across = horizontal ? Math.abs(base.y - anchor.y) : Math.abs(base.x - anchor.x);
      const turning = horizontal ? dir.y !== 0 : dir.x !== 0;
      const k1 = along * 0.6;
      const k2 = turning ? Math.max(6, across * 0.85) : Math.max(12, along * 0.4);
      const c1 = { x: anchor.x + out.x * k1, y: anchor.y + out.y * k1 };
      const c2 = { x: base.x - dir.x * k2, y: base.y - dir.y * k2 };
      // Run the shaft a little into the head so the join is hidden.
      const tuck = { x: base.x + dir.x * 6, y: base.y + dir.y * 6 };
      shafts.push(`M${anchor.x},${anchor.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${tuck.x},${tuck.y}`);
      const nx = -dir.y;
      const ny = dir.x;
      heads.push(`M${point.x},${point.y} L${base.x + nx * half},${base.y + ny * half} L${base.x - nx * half},${base.y - ny * half} Z`);
    });

    const vwh = `x="0" y="0" width="${vw}" height="${vh}"`;
    Object.entries({ x: 0, y: 0, width: vw, height: vh }).forEach(([k, v]) => arrowMask.setAttribute(k, String(v)));
    const shaftPaths = (cls, extra = '') => shafts.map((d) => `<path class="${cls}" d="${d}" ${extra}/>`).join('');
    const headPaths = (cls, extra = '') => heads.map((d) => `<path class="${cls}" d="${d}" ${extra}/>`).join('');
    const W = SHAFT;
    maskShapes.innerHTML = `<rect ${vwh} fill="#000" />${shaftPaths('coach-shaft', `stroke="#fff" stroke-width="${W}"`)}${headPaths('coach-head', 'fill="#fff" stroke="#fff" stroke-width="2"')}`;
    const band = W * 0.24;
    arrows.innerHTML = `
      <g class="coach-arrow-outline">${shaftPaths('coach-shaft', `stroke-width="${W + 7}"`)}${headPaths('coach-head', 'stroke-width="7"')}</g>
      <g class="coach-arrow-dark">${shaftPaths('coach-shaft', `stroke-width="${W}"`)}${headPaths('coach-head', 'stroke-width="2"')}</g>
      <g class="coach-arrow-body" mask="url(#coach-arrow-mask)"><g transform="translate(0 ${-band})">${shaftPaths('coach-shaft', `stroke-width="${W}"`)}${headPaths('coach-head', 'stroke-width="2"')}</g></g>
      <g class="coach-arrow-shine" mask="url(#coach-arrow-mask)"><g transform="translate(0 ${-W * 0.22})">${shaftPaths('coach-shaft', `stroke-width="${W * 0.34}"`)}</g></g>`;
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
    punchEl.textContent = tip.punch ?? '';
    punchEl.hidden = !tip.punch;
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
