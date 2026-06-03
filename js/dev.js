const params = new URLSearchParams(window.location.search);

export const DEV = {
  enabled: params.has('dev'),
  skipForge: params.has('dev'),
  fastWave: params.has('dev') && params.get('dev') === 'fast',
  extraBudget: params.has('dev') ? 200 : 0,
  unlockAll: params.has('dev'),
};
