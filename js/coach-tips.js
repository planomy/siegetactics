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
    text: 'Select either a RANDOM MISSION or a TOPIC CARD. Every right answer charges Granny’s defences.',
    punch: 'Practice makes KABOOM!',
    targets: ['#mission-start-mixed', '.mission-all-topics'],
    between: true,
  },
  level: {
    step: 2,
    title: 'PICK YOUR LEVEL',
    text: 'Levels 1 to 6 go from easier to tougher. Choose the one that suits you — harder levels earn bonus XP!',
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
const GAP = 130;
/** Extra room when one card forks arrows to several targets. */
const GAP_FORK = 110;
/** Arrow body width; heads scale to the room they have. */
const SHAFT = 30;
/** Arrows start this far under the card so they look like they come out of it. */
const TUCK = 22;
/** Corner radius where an arrow turns 90°. */
const BEND = 30;
/** Shortest leg that still fits a corner plus a full arrowhead. */
const MIN_LEG = BEND + 40;

/**
 * Two straight legs joined by one rounded 90° corner.
 * @param {{x:number,y:number}} a @param {{x:number,y:number}} b @param {'x'|'y'} first - axis of the first leg
 */
function elbowPath(a, b, first) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) < 1 || Math.abs(dy) < 1) return `M${a.x},${a.y} L${b.x},${b.y}`;
  const r = Math.min(BEND, Math.abs(dx) - 1, Math.abs(dy) - 1);
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  return first === 'x'
    ? `M${a.x},${a.y} L${b.x - sx * r},${a.y} Q${b.x},${a.y} ${b.x},${a.y + sy * r} L${b.x},${b.y}`
    : `M${a.x},${a.y} L${a.x},${b.y - sy * r} Q${a.x},${b.y} ${a.x + sx * r},${b.y} L${b.x},${b.y}`;
}
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
  defs.innerHTML = '<mask id="coach-arrow-mask" maskUnits="userSpaceOnUse"><g class="coach-mask-shapes"></g></mask>'
    + '<filter id="coach-arrow-soft" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="3" /></filter>';
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
    // Prefer room for a long arrow, but tuck in closer rather than lose the arrows altogether.
    let pos = placeCard(u, cw, ch, rects.length > 1 ? GAP_FORK : GAP, centerY);
    for (const gap of [80, 56, 36]) {
      if (pos.side !== 'none') break;
      pos = placeCard(u, cw, ch, gap, centerY);
    }
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
    const headShines = [];
    const cardSide = out.x < 0 ? 'right' : 'left';
    rects.forEach((r, i) => {
      const hole = { left: r.left - PAD, top: r.top - PAD, right: r.right + PAD, bottom: r.bottom + PAD };
      const w = hole.right - hole.left;
      const h = hole.bottom - hole.top;
      /** @type {{x:number,y:number}} */
      let end;
      /** @type {{x:number,y:number}} */
      let dir;
      if (horizontal) {
        // Land on the side of the target nearer the card, but never under the card itself.
        const lean = cardSide === 'right' ? 0.62 : 0.38;
        let x = hole.left + w * lean;
        x = cardSide === 'right' ? Math.min(x, edgeFrom.x - BEND - SHAFT) : Math.max(x, edgeFrom.x + BEND + SHAFT);
        const up = between ? i === 0 : hole.bottom <= anchor.y - MIN_LEG;
        const down = between ? i === 1 : hole.top >= anchor.y + MIN_LEG;
        if (up) {
          end = { x, y: hole.bottom };
          dir = { x: 0, y: -1 };
        } else if (down) {
          end = { x, y: hole.top };
          dir = { x: 0, y: 1 };
        } else if (anchor.y >= hole.top + 14 && anchor.y <= hole.bottom - 14) {
          // Level with the card: straight in from the side.
          end = { x: cardSide === 'right' ? hole.right : hole.left, y: anchor.y };
          dir = { x: out.x, y: 0 };
        } else if (anchor.y < hole.top) {
          // Just above a big target: dive into it far enough for a proper downward arrow.
          end = { x, y: Math.min(hole.bottom - 12, anchor.y + MIN_LEG + 10) };
          dir = { x: 0, y: 1 };
        } else {
          end = { x, y: Math.max(hole.top + 12, anchor.y - MIN_LEG - 10) };
          dir = { x: 0, y: -1 };
        }
        // A downward arrow into a tall area may need to start inside it to have room.
        if (dir.y > 0 && end.y - anchor.y < MIN_LEG && h > 120) end.y = Math.min(hole.bottom - 12, anchor.y + MIN_LEG + 10);
        if (dir.y < 0 && anchor.y - end.y < MIN_LEG && h > 120) end.y = Math.max(hole.top + 12, anchor.y - MIN_LEG - 10);
      } else {
        const inLine = anchor.x >= hole.left + 14 && anchor.x <= hole.right - 14;
        if (inLine) {
          end = { x: anchor.x, y: out.y < 0 ? hole.bottom : hole.top };
          dir = { x: 0, y: out.y };
        } else {
          const toRight = hole.left > anchor.x;
          end = { x: toRight ? hole.left : hole.right, y: clamp(anchor.y + out.y * MIN_LEG, hole.top + 14, hole.bottom - 14) };
          dir = { x: toRight ? 1 : -1, y: 0 };
        }
      }
      const finalLeg = dir.y ? Math.abs(end.y - anchor.y) : Math.abs(end.x - anchor.x);
      const turns = horizontal ? dir.y !== 0 : dir.x !== 0;
      const len = clamp((turns ? finalLeg - BEND : finalLeg * 0.38) - 4, 26, 54);
      const half = Math.max(SHAFT * 1.15, len * 0.85);
      const point = { x: end.x - dir.x * 2, y: end.y - dir.y * 2 };
      const base = { x: point.x - dir.x * len, y: point.y - dir.y * len };
      // Run the shaft a little into the head so the join is hidden.
      const tuck = { x: base.x + dir.x * 6, y: base.y + dir.y * 6 };
      shafts.push(elbowPath(anchor, tuck, horizontal ? 'x' : 'y'));
      const nx = -dir.y;
      const ny = dir.x;
      heads.push(`M${point.x},${point.y} L${base.x + nx * half},${base.y + ny * half} L${base.x - nx * half},${base.y - ny * half} Z`);
      // A smaller copy of the head, nudged towards the light, for its shine.
      const corners = [point, { x: base.x + nx * half, y: base.y + ny * half }, { x: base.x - nx * half, y: base.y - ny * half }];
      const cx = (corners[0].x + corners[1].x + corners[2].x) / 3 - 3;
      const cy = (corners[0].y + corners[1].y + corners[2].y) / 3 - 3;
      const inner = corners.map((c) => `${cx + (c.x - cx) * 0.6},${cy + (c.y - cy) * 0.6}`);
      headShines.push(`M${inner[0]} L${inner[1]} L${inner[2]} Z`);
    });

    const vwh = `x="0" y="0" width="${vw}" height="${vh}"`;
    Object.entries({ x: 0, y: 0, width: vw, height: vh }).forEach(([k, v]) => arrowMask.setAttribute(k, String(v)));
    const shaftPaths = (cls, extra = '') => shafts.map((d) => `<path class="${cls}" d="${d}" ${extra}/>`).join('');
    const headPaths = (cls, extra = '') => heads.map((d) => `<path class="${cls}" d="${d}" ${extra}/>`).join('');
    const W = SHAFT;
    maskShapes.innerHTML = `<rect ${vwh} fill="#000" />${shaftPaths('coach-shaft', `stroke="#fff" stroke-width="${W}"`)}${headPaths('coach-head', 'fill="#fff" stroke="#fff" stroke-width="2"')}`;
    // Light from the top-left: shadowed lower-right edges, a soft shine along the upper-left.
    const band = W * 0.2;
    const shine = W * 0.12;
    arrows.innerHTML = `
      <g class="coach-arrow-outline">${shaftPaths('coach-shaft', `stroke-width="${W + 7}"`)}${headPaths('coach-head', 'stroke-width="7"')}</g>
      <g class="coach-arrow-dark">${shaftPaths('coach-shaft', `stroke-width="${W}"`)}${headPaths('coach-head', 'stroke-width="2"')}</g>
      <g mask="url(#coach-arrow-mask)"><g class="coach-arrow-body" filter="url(#coach-arrow-soft)" transform="translate(${-band} ${-band})">${shaftPaths('coach-shaft', `stroke-width="${W}"`)}${headPaths('coach-head', 'stroke-width="2"')}</g></g>
      <g mask="url(#coach-arrow-mask)"><g class="coach-arrow-shine" filter="url(#coach-arrow-soft)" transform="translate(${-shine} ${-shine})">${shaftPaths('coach-shaft', `stroke-width="${W * 0.52}"`)}${headShines.map((d) => `<path class="coach-head" d="${d}" />`).join('')}</g></g>`;
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
