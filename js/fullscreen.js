/**
 * Keep the game in fullscreen as hard as browsers allow.
 *
 * Limits (cannot be bypassed by any website):
 * - Entering fullscreen always needs a click/tap/key (never on bare page load).
 * - Esc / the browser UI can always leave fullscreen.
 * - iOS Safari often has no Fullscreen API for web pages; Add to Home Screen is the
 *   real full-bleed option there.
 *
 * What we do: enter on the first gesture, re-enter on the next gesture after any
 * exit, offer a topbar button, and use navigationUI: 'hide' where supported.
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
 * @param {{
 *   onExit?: () => void,
 *   button?: HTMLElement | null,
 * }} [opts]
 */
export function keepFullscreen(opts = {}) {
  const root = document.documentElement;
  if (!requestFn(root)) {
    if (opts.button) opts.button.hidden = true;
    return { supported: false, tryEnter: () => Promise.reject(new Error('unsupported')) };
  }

  let coolUntil = 0;
  let exitNotified = false;

  const syncButton = () => {
    const btn = opts.button;
    if (!btn) return;
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
    if (performance.now() < coolUntil) return Promise.resolve();
    return requestFullscreen(root).then(
      () => {
        exitNotified = false;
        syncButton();
      },
      () => {
        // Denied or unsupported in this context — back off briefly so we do not spam.
        coolUntil = performance.now() + 1800;
      }
    );
  };

  const onGesture = () => {
    void tryEnter();
  };

  window.addEventListener('pointerdown', onGesture, true);
  window.addEventListener('keydown', onGesture, true);

  const onFsChange = () => {
    syncButton();
    if (isFullscreen()) {
      exitNotified = false;
      return;
    }
    // Left fullscreen (Esc, gesture, browser chrome). Next tap re-enters; tell them once.
    if (!exitNotified) {
      exitNotified = true;
      opts.onExit?.();
    }
  };

  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  opts.button?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isFullscreen()) void exitFullscreen().then(syncButton);
    else void tryEnter();
  });

  syncButton();

  return { supported: true, tryEnter, syncButton };
}
