/** @typedef {'info'|'success'|'warn'|'shop'} ToastVariant */

/** @type {HTMLElement|null} */
let toastRoot = null;
/** @type {ReturnType<typeof setTimeout>|null} */
let toastTimer = null;
/** @type {Set<string>} */
const openModals = new Set();

/** @type {Record<ToastVariant, { icon: string, title: string }>} */
const VARIANT_DEFAULTS = {
  info: { icon: '●', title: '' },
  success: { icon: '✦', title: 'Nice work!' },
  warn: { icon: '!', title: 'Heads up' },
  shop: { icon: '★', title: 'Granny says' },
};

/**
 * @param {string} message
 * @param {ToastVariant} variant
 * @param {{ title?: string, icon?: string }} opts
 */
function resolveToastMeta(message, variant, opts) {
  if (opts.title != null || opts.icon != null) {
    return {
      title: opts.title ?? VARIANT_DEFAULTS[variant].title,
      icon: opts.icon ?? VARIANT_DEFAULTS[variant].icon,
    };
  }

  const lower = message.toLowerCase();
  if (lower.includes('sound on')) return { title: 'Sound on', icon: '🔊' };
  if (lower.includes('sound muted') || lower === 'sound muted.') {
    return { title: 'Sound muted', icon: '🔇' };
  }
  if (lower.includes('unlocked')) return { title: 'Unlocked!', icon: '✦' };
  if (lower.includes('pushed the attack back') || lower.includes('attack pushed back')) {
    return { title: 'Attack pushed back!', icon: '✦' };
  }
  if (lower.includes('map piece') || lower.includes('sector charted')) {
    return { title: 'Nav chart', icon: '🗺' };
  }
  if (lower.includes('shield earned')) return { title: 'Shield earned', icon: '🛡' };
  if (lower.includes('wave') && lower.includes('cleared')) {
    return { title: 'Wave cleared', icon: '✦' };
  }
  if (lower.includes('leak')) return { title: 'Leak!', icon: '!' };
  if (lower.includes('nuke')) return { title: 'Nuke cache', icon: '🧁' };

  return VARIANT_DEFAULTS[variant] ?? VARIANT_DEFAULTS.info;
}

function hideToast() {
  if (!toastRoot) return;
  toastRoot.classList.remove('visible');
  if (toastTimer != null) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  window.setTimeout(() => {
    if (toastRoot && !toastRoot.classList.contains('visible')) {
      toastRoot.hidden = true;
    }
  }, 280);
}

/**
 * @param {string} message
 * @param {{ variant?: ToastVariant, duration?: number, title?: string, icon?: string }} [opts]
 */
export function showToast(message, opts = {}) {
  if (!toastRoot) return;
  const variant = /** @type {ToastVariant} */ (opts.variant || 'info');
  const meta = resolveToastMeta(message, variant, opts);

  const iconEl = toastRoot.querySelector('.toast-icon');
  const titleEl = toastRoot.querySelector('.toast-title');
  const messageEl = toastRoot.querySelector('.toast-message');

  if (iconEl) {
    iconEl.textContent = meta.icon;
    iconEl.dataset.glyph = ['●', '!', '✦', '★', '✓'].includes(meta.icon) ? '1' : '0';
  }
  if (titleEl) {
    if (meta.title) {
      titleEl.textContent = meta.title;
      titleEl.hidden = false;
    } else {
      titleEl.textContent = '';
      titleEl.hidden = true;
    }
  }
  if (messageEl) messageEl.textContent = message;

  toastRoot.dataset.variant = variant;
  toastRoot.hidden = false;
  toastRoot.classList.add('visible');

  if (toastTimer != null) clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, opts.duration ?? 3400);
}

/** @param {string} modalId */
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.hidden = false;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  openModals.add(modalId);
  document.body.classList.add('modal-open');
  const panel = modal.querySelector('.gb-modal-panel');
  panel?.focus?.();
}

/** @param {string} modalId */
export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  openModals.delete(modalId);
  if (openModals.size === 0) document.body.classList.remove('modal-open');
  window.setTimeout(() => {
    if (!modal.classList.contains('is-open')) modal.hidden = true;
  }, 300);
}

export function closeTopModal() {
  const last = [...openModals].pop();
  if (last) closeModal(last);
}

/** Wire toast dismiss, modal backdrops, and Escape. */
export function initPopups() {
  toastRoot = document.getElementById('toast');
  toastRoot?.querySelector('.toast-dismiss')?.addEventListener('click', hideToast);

  document.querySelectorAll('[data-modal-close]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-modal-close');
      if (id) closeModal(id);
      else closeTopModal();
    });
  });

  document.querySelectorAll('.gb-modal-backdrop').forEach((el) => {
    el.addEventListener('click', () => {
      const modal = el.closest('.gb-modal');
      if (modal?.id) closeModal(modal.id);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openModals.size > 0) {
      closeTopModal();
    }
  });
}
