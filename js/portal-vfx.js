/**
 * Animated overlay for the alien spawn portal on assets/field.png.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{
 *   width: number,
 *   height: number,
 *   time: number,
 *   portal: { cx: number, cy: number, radius: number, socketCount?: number, inactiveSockets?: number[] },
 *   spawnPulse?: number,
 * }} opts
 */
export function drawAlienPortalVfx(ctx, opts) {
  const { width, height, time: t, portal, spawnPulse = 0 } = opts;
  if (width <= 0 || height <= 0) return;

  const x = width * portal.cx;
  const y = height * portal.cy;
  const r = Math.min(width, height) * portal.radius;
  const pulse = 0.55 + 0.45 * Math.sin(t * 2.4);
  const spawnBoost = Math.max(0, 1 - spawnPulse) * 0.85;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // Spawn burst when aliens emerge
  if (spawnBoost > 0.02) {
    const burst = ctx.createRadialGradient(x, y, 0, x, y, r * (1.1 + spawnBoost * 0.5));
    burst.addColorStop(0, `rgba(255, 255, 255, ${0.55 * spawnBoost})`);
    burst.addColorStop(0.35, `rgba(200, 120, 255, ${0.35 * spawnBoost})`);
    burst.addColorStop(1, 'rgba(120, 40, 200, 0)');
    ctx.fillStyle = burst;
    ctx.beginPath();
    ctx.arc(x, y, r * (1.1 + spawnBoost * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }

  // Ambient ground glow
  const glow = ctx.createRadialGradient(x, y, r * 0.05, x, y, r * 1.55);
  glow.addColorStop(0, `rgba(200, 100, 255, ${0.28 * pulse + 0.12 * spawnBoost})`);
  glow.addColorStop(0.45, `rgba(120, 50, 200, ${0.12 * pulse})`);
  glow.addColorStop(1, 'rgba(60, 20, 100, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.55, 0, Math.PI * 2);
  ctx.fill();

  // Ground crack veins (flicker)
  ctx.globalCompositeOperation = 'source-over';
  for (let c = 0; c < 7; c++) {
    const ca = t * 0.35 + c * 0.95 + 0.4;
    const flicker = 0.25 + 0.35 * Math.sin(t * 9 + c * 2.3);
    const len = r * (0.75 + 0.35 * Math.sin(t * 4 + c));
    ctx.strokeStyle = `rgba(150, 80, 255, ${flicker})`;
    ctx.lineWidth = 1.2 + (c % 2) * 0.6;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(ca) * r * 0.2, y + Math.sin(ca) * r * 0.12);
    ctx.lineTo(x + Math.cos(ca) * len, y + Math.sin(ca) * len * 0.55);
    ctx.stroke();
  }

  ctx.globalCompositeOperation = 'lighter';

  // Spinning vortex arcs
  for (let i = 0; i < 6; i++) {
    const spin = t * (1.35 + i * 0.08);
    const radius = r * (0.28 + i * 0.11);
    const alpha = 0.18 + 0.14 * Math.sin(t * 3.5 + i * 1.1);
    ctx.strokeStyle = `rgba(190, 110, 255, ${alpha})`;
    ctx.lineWidth = 2 + (i % 3) * 0.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y, radius, spin + i * 0.5, spin + i * 0.5 + Math.PI * (0.65 + i * 0.05));
    ctx.stroke();
  }

  // Inner whirlpool fill
  const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, r * 0.42);
  coreGrad.addColorStop(0, `rgba(255, 255, 255, ${0.5 + 0.25 * pulse})`);
  coreGrad.addColorStop(0.25, `rgba(220, 150, 255, ${0.35 * pulse})`);
  coreGrad.addColorStop(0.7, `rgba(100, 40, 180, ${0.15})`);
  coreGrad.addColorStop(1, 'rgba(40, 10, 80, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.42, 0, Math.PI * 2);
  ctx.fill();

  // Counter-rotating inner spiral stroke
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 + 0.2 * pulse})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let s = 0; s <= 24; s++) {
    const ang = -t * 2.8 + s * 0.45;
    const dist = r * (0.08 + (s / 24) * 0.32);
    const px = x + Math.cos(ang) * dist;
    const py = y + Math.sin(ang) * dist * 0.85;
    if (s === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Socket ring lights
  const socketCount = portal.socketCount ?? 8;
  const inactive = new Set(portal.inactiveSockets ?? [5, 6]);
  const ringStart = -Math.PI * 0.55;
  const ringSpan = Math.PI * 1.15;

  for (let i = 0; i < socketCount; i++) {
    const sa = ringStart + (i / (socketCount - 1)) * ringSpan;
    const sx = x + Math.cos(sa) * r * 0.92;
    const sy = y + Math.sin(sa) * r * 0.78;
    const isInactive = inactive.has(i);
    const wake = isInactive ? 0.15 + 0.1 * Math.sin(t * 1.2 + i) : 0.55 + 0.45 * Math.sin(t * 4.2 + i * 0.9);

    if (!isInactive) {
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 10 + 6 * wake;
      ctx.fillStyle = `rgba(180, 90, 255, ${wake})`;
    } else {
      ctx.shadowBlur = 0;
      const charging = 0.35 + 0.35 * Math.sin(t * 2 + i * 1.7);
      ctx.fillStyle = `rgba(80, 50, 110, ${0.5 + charging * 0.2})`;
      if (charging > 0.62) {
        ctx.fillStyle = `rgba(140, 70, 220, ${(charging - 0.62) * 1.2})`;
      }
    }

    ctx.beginPath();
    ctx.arc(sx, sy, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Rising energy motes
  for (let p = 0; p < 14; p++) {
    const phase = (t * 0.65 + p * 0.31) % 1;
    const orbit = p * 2.4 + t * 1.1;
    const px = x + Math.cos(orbit) * r * (0.15 + phase * 0.35);
    const py = y - phase * r * 1.15 - Math.sin(orbit * 2) * r * 0.05;
    const alpha = (1 - phase) * (0.35 + 0.25 * pulse);
    ctx.fillStyle = `rgba(230, 200, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, 1 + (1 - phase) * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
