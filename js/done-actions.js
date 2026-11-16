/**
 * The way out of a finished maths session: Home (top-left of the modal), optional go-again
 * (centred), or, once a siege has been earned, straight into battle.
 * @param {{ againLabel?: string|null, siegeReady?: () => boolean, onAction?: () => void }} opts
 * @returns {string}
 */
export function renderDoneActions(opts) {
  const action = Boolean(opts.onAction && opts.siegeReady?.());
  const again = opts.againLabel
    ? `<button type="button" class="btn ${action ? 'btn-ghost' : 'btn-primary'} times-done-again" data-done="again">${opts.againLabel}</button>`
    : '';
  return `
    <button type="button" class="btn btn-ghost btn-sm times-back times-done-home" data-done="home">← Home</button>
    <div class="times-done-actions${action ? ' has-action' : ''}${again && !action ? ' is-again-only' : ''}${!again && !action ? ' is-empty' : ''}">
      ${again}
      ${action ? '<button type="button" class="btn btn-primary done-action-btn" data-done="action">Take me to the action!</button>' : ''}
    </div>`;
}

/**
 * @param {HTMLElement} host
 * @param {{ onAgain?: () => void, onHome: () => void, onAction?: () => void }} opts
 */
export function bindDoneActions(host, opts) {
  host.querySelector('[data-done="again"]')?.addEventListener('click', () => opts.onAgain?.());
  host.querySelector('[data-done="home"]')?.addEventListener('click', opts.onHome);
  host.querySelector('[data-done="action"]')?.addEventListener('click', () => opts.onAction?.());
}
