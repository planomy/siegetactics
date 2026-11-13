/**
 * The way out of a finished maths session: go again, back to Maths HQ, or, once a siege has been
 * earned, straight into battle (skipping Maths HQ so a hot-streak soundtrack carries on into the fight).
 * @param {{ againLabel: string, siegeReady?: () => boolean, onAction?: () => void }} opts
 * @returns {string}
 */
export function renderDoneActions(opts) {
  const action = Boolean(opts.onAction && opts.siegeReady?.());
  return `
    <div class="times-done-actions${action ? ' has-action' : ''}">
      <button type="button" class="btn ${action ? 'btn-ghost' : 'btn-primary'}" data-done="again">${opts.againLabel}</button>
      <button type="button" class="btn btn-ghost" data-done="home">Home</button>
      ${action ? '<button type="button" class="btn btn-primary done-action-btn" data-done="action">Take me to the action!</button>' : ''}
    </div>`;
}

/**
 * @param {HTMLElement} host
 * @param {{ onAgain: () => void, onHome: () => void, onAction?: () => void }} opts
 */
export function bindDoneActions(host, opts) {
  host.querySelector('[data-done="again"]')?.addEventListener('click', opts.onAgain);
  host.querySelector('[data-done="home"]')?.addEventListener('click', opts.onHome);
  host.querySelector('[data-done="action"]')?.addEventListener('click', () => opts.onAction?.());
}
