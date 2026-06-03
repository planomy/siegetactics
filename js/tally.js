/**
 * @param {number} t 0–1
 */
function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

/**
 * @param {HTMLElement|null|undefined} el
 * @param {number} to
 * @param {{ duration?: number, delay?: number, from?: number, format?: (n: number) => string }} [opts]
 * @returns {Promise<void>}
 */
export function animateTally(el, to, opts = {}) {
  if (!el) return Promise.resolve();
  const duration = opts.duration ?? 1100;
  const delay = opts.delay ?? 0;
  const from = opts.from ?? 0;
  const format = opts.format ?? ((n) => String(Math.round(n)));

  el.classList.add('tallying');
  el.textContent = format(from);

  return new Promise((resolve) => {
    const startAt = performance.now() + delay;

    function tick(now) {
      if (now < startAt) {
        requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(1, (now - startAt) / duration);
      const val = from + (to - from) * easeOutCubic(t);
      el.textContent = format(val);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = format(to);
        el.classList.remove('tallying');
        resolve();
      }
    }
    requestAnimationFrame(tick);
  });
}

/**
 * Animate a "current / total" style label by tallying both numbers.
 * @param {HTMLElement|null|undefined} el
 * @param {number} current
 * @param {number} total
 * @param {{ duration?: number, delay?: number, format?: (n: number) => string }} [opts]
 */
export function animateTallyPair(el, current, total, opts = {}) {
  if (!el) return Promise.resolve();
  const format = opts.format ?? ((n) => Math.round(n).toLocaleString());
  const suffix = opts.suffix ?? '';
  const duration = opts.duration ?? 1100;
  const delay = opts.delay ?? 0;

  el.classList.add('tallying');
  el.textContent = `${format(0)} / ${format(total)}${suffix}`;

  return new Promise((resolve) => {
    const startAt = performance.now() + delay;

    function tick(now) {
      if (now < startAt) {
        requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(1, (now - startAt) / duration);
      const eased = easeOutCubic(t);
      el.textContent = `${format(current * eased)} / ${format(total)}${suffix}`;
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = `${format(current)} / ${format(total)}${suffix}`;
        el.classList.remove('tallying');
        resolve();
      }
    }
    requestAnimationFrame(tick);
  });
}

/**
 * @param {HTMLElement|null|undefined} fillEl
 * @param {number} progress 0–1
 * @param {{ duration?: number, delay?: number }} [opts]
 */
export function animateProgressFill(fillEl, progress, opts = {}) {
  if (!fillEl) return Promise.resolve();
  const duration = opts.duration ?? 900;
  const delay = opts.delay ?? 0;
  const target = Math.round(Math.min(1, Math.max(0, progress)) * 100);

  fillEl.style.width = '0%';

  return new Promise((resolve) => {
    const startAt = performance.now() + delay;

    function tick(now) {
      if (now < startAt) {
        requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(1, (now - startAt) / duration);
      const pct = target * easeOutCubic(t);
      fillEl.style.width = `${pct}%`;
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        fillEl.style.width = `${target}%`;
        resolve();
      }
    }
    requestAnimationFrame(tick);
  });
}

/**
 * @param {{
 *   kills: number,
 *   leaks: number,
 *   forgeXp: number,
 *   coins: number,
 *   best: number,
 *   maxLeaks: number,
 * }} stats
 */
export function animateResultsStats(stats) {
  const killsEl = document.getElementById('results-kills');
  const leaksEl = document.getElementById('results-leaks');
  const forgeEl = document.getElementById('results-forge-xp');
  const coinsEl = document.getElementById('results-coins-left');
  const bestEl = document.getElementById('results-best');
  const maxLeaksEl = document.getElementById('results-max-leaks');

  const fmt = (n) => Math.round(n).toLocaleString();

  animateTally(killsEl, stats.kills, { duration: 1400, delay: 120, format: fmt });
  animateTally(leaksEl, stats.leaks, { duration: 900, delay: 280, format: fmt });
  animateTally(forgeEl, stats.forgeXp, { duration: 1100, delay: 380, format: fmt });
  animateTally(coinsEl, stats.coins, { duration: 1000, delay: 480, format: fmt });
  animateTally(bestEl, stats.best, { duration: 1200, delay: 580, format: fmt });
  animateTally(maxLeaksEl, stats.maxLeaks, { duration: 700, delay: 680, format: fmt });
}
