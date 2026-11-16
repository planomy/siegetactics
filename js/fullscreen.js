/**
 * Optional fullscreen via the topbar icon only.
 *
 * Windowed is the default. Kids / classrooms leave Esc often; re-entering on
 * every tap felt broken. iOS Safari often has no Fullscreen API for web pages —
 * Add to Home Screen is the real full-bleed option there.
 */

function requestFn(el) {
  return el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen || null;
}

export function isFullscreen() {
  return Boolean(
    document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement
  );
}

export function fullscreenSupported() {
  return Boolean(requestFn(document.documentElement));
}

/**
 * @param {Element} [el]
 * @returns {Promise<void>}
 */
export function requestFullscreen(el = document.documentElement) {
  const req = requestFn(el);
  if (!req) return Promise.reject(new Error('unsupported'));
  try {
    const withOpts = req.call(el, { navigationUI: 'hide' });
    return Promise.resolve(withOpts).catch(() => Promise.resolve(req.call(el)));
  } catch {
    try {
      return Promise.resolve(req.call(el));
    } catch (err) {
      return Promise.reject(err);
    }
  }
}

export function exitFullscreen() {
  const exit =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.msExitFullscreen;
  if (!exit || !isFullscreen()) return Promise.resolve();
  try {
    return Promise.resolve(exit.call(document)).catch(() => {});
  } catch {
    return Promise.resolve();
  }
}

/**
 * Wire the topbar fullscreen toggle. Does not auto-enter or re-enter on taps.
 *
 * @param {{
 *   button?: HTMLElement | null,
 * }} [opts]
 */
export function keepFullscreen(opts = {}) {
  const root = document.documentElement;
  const btn = opts.button ?? null;

  if (!requestFn(root)) {
    if (btn) btn.hidden = true;
    return { supported: false, tryEnter: () => Promise.reject(new Error('unsupported')) };
  }

  // Standalone Doompickle (no topbar button): stay windowed; no sticky capture.
  if (!btn) {
    return { supported: true, tryEnter: () => requestFullscreen(root), syncButton: () => {} };
  }

  const syncButton = () => {
    const on = isFullscreen();
    btn.hidden = false;
    btn.classList.toggle('is-fullscreen', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Exit fullscreen' : 'Enter fullscreen');
    btn.setAttribute('data-tip-title', 'Fullscreen');
    btn.setAttribute('data-tip', on ? 'Leave fullscreen' : 'Fill the screen');
  };

  const tryEnter = () => {
    if (isFullscreen()) return Promise.resolve();
    return requestFullscreen(root).then(syncButton, () => {});
  };

  const onFsChange = () => {
    syncButton();
  };

  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isFullscreen()) void exitFullscreen().then(syncButton);
    else void tryEnter();
  });

  syncButton();

  return { supported: true, tryEnter, syncButton };
}
