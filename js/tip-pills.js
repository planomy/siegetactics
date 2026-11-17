/**
 * Gold-plate tip pills for topbar HUD controls.
 * Uses data-tip-title + data-tip. Hover / keyboard focus only (hidden on touch).
 */

const GAP = 10;

/** @type {HTMLElement|null} */
let tipEl = null;
/** @type {Element|null} */
let active = null;
let hideTimer = 0;

function ensureTip() {
  if (tipEl) return tipEl;
  tipEl = document.createElement('div');
  tipEl.className = 'tip-pill';
  tipEl.setAttribute('role', 'tooltip');
  tipEl.hidden = true;
  tipEl.innerHTML = '<strong class="tip-pill-title"></strong><span class="tip-pill-body"></span>';
  document.body.appendChild(tipEl);
  return tipEl;
}

/** @param {Element} el */
function tipCopy(el) {
  const title = el.getAttribute('data-tip-title')?.trim() || '';
  const body = el.getAttribute('data-tip')?.trim() || '';
  return { title, body };
}

/** @param {Element} el */
function place(el) {
  const tip = ensureTip();
  const { title, body } = tipCopy(el);
  if (!title && !body) {
    hide(true);
    return;
  }

  const titleEl = tip.querySelector('.tip-pill-title');
  const bodyEl = tip.querySelector('.tip-pill-body');
  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.textContent = body;

  tip.hidden = false;
  tip.classList.remove('is-on', 'is-above');
  tip.style.left = '0px';
  tip.style.top = '0px';

  const rect = el.getBoundingClientRect();
  const tipRect = tip.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = rect.left + rect.width / 2 - tipRect.width / 2;
  left = Math.max(8, Math.min(left, vw - tipRect.width - 8));

  let top = rect.bottom + GAP;
  let above = false;
  if (top + tipRect.height > vh - 8 && rect.top > tipRect.height + GAP + 8) {
    top = rect.top - tipRect.height - GAP;
    above = true;
  }

  const anchorX = rect.left + rect.width / 2 - left;
  tip.style.setProperty('--tip-arrow-x', `${Math.max(14, Math.min(anchorX, tipRect.width - 14))}px`);
  tip.style.left = `${Math.round(left)}px`;
  tip.style.top = `${Math.round(top)}px`;
  tip.classList.toggle('is-above', above);

  requestAnimationFrame(() => {
    if (active === el) tip.classList.add('is-on');
  });
}

/** @param {boolean} [immediate] */
function hide(immediate = false) {
  active = null;
  window.clearTimeout(hideTimer);
  const tip = tipEl;
  if (!tip) return;
  tip.classList.remove('is-on');
  if (immediate) {
    tip.hidden = true;
    tip.classList.remove('is-above');
    return;
  }
  hideTimer = window.setTimeout(() => {
    if (!tip.classList.contains('is-on')) {
      tip.hidden = true;
      tip.classList.remove('is-above');
    }
  }, 140);
}

/** @param {Element} el */
function show(el) {
  if (!(el instanceof Element)) return;
  if (!el.hasAttribute('data-tip-title') && !el.hasAttribute('data-tip')) return;
  if (document.getElementById('title-screen')) return;
  window.clearTimeout(hideTimer);
  active = el;
  place(el);
}

/** Show a tip for an element that carries data-tip-title / data-tip (touch or mouse). */
export function showTipPill(el) {
  show(el);
}

/** @param {boolean} [immediate] */
export function hideTipPill(immediate = false) {
  hide(immediate);
}

/**
 * @param {ParentNode} [root]
 */
export function bindTipPills(root = document) {
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  ensureTip();

  /** @param {Event} e */
  const onEnter = (e) => {
    if (!fine.matches) return;
    const t = e.target;
    if (!(t instanceof Element)) return;
    const host = t.closest('[data-tip-title], [data-tip]');
    if (!host || !root.contains(host)) return;
    show(host);
  };

  /** @param {Event} e */
  const onLeave = (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const host = t.closest('[data-tip-title], [data-tip]');
    if (!host || active !== host) return;
    const next = e.relatedTarget;
    if (next instanceof Node && host.contains(next)) return;
    hide();
  };

  /** @param {Event} e */
  const onFocus = (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (!t.matches('[data-tip-title], [data-tip]')) return;
    show(t);
  };

  /** @param {Event} e */
  const onBlur = (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (active === t) hide();
  };

  root.addEventListener('pointerenter', onEnter, true);
  root.addEventListener('pointerleave', onLeave, true);
  root.addEventListener('focusin', onFocus);
  root.addEventListener('focusout', onBlur);
  window.addEventListener('scroll', () => hide(true), true);
  window.addEventListener('resize', () => hide(true));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hide(true);
  });
  document.addEventListener('pointerdown', () => hide(true), true);

  return { hide, show };
}
