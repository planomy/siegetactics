/**
 * Placeholder art for the Homeland prototype, drawn with shapes so the feel can be tested
 * before any real art is made.
 */

/**
 * Granny on her rocket-powered mobility scooter, seen from behind.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x Centre of the scooter on screen.
 * @param {number} y Bottom of the wheels on screen.
 * @param {number} w Scooter width in pixels.
 * @param {{ t: number, flame: number, lean: number }} o flame 1 is a normal boost, 2+ is the jetpack.
 */
export function drawGranny(ctx, x, y, w, o) {
  const u = w / 100;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(o.lean * 0.18);

  const flick = 0.75 + 0.25 * Math.sin(o.t * 40) + 0.1 * Math.sin(o.t * 73);
  const flameLen = (18 + 14 * o.flame) * flick * u;
  const flame = ctx.createLinearGradient(0, -20 * u, 0, -20 * u + flameLen + 16 * u);
  flame.addColorStop(0, '#fff6b0');
  flame.addColorStop(0.35, '#ffb02e');
  flame.addColorStop(1, 'rgba(255, 60, 20, 0)');
  ctx.fillStyle = flame;
  for (const side of o.flame >= 2 ? [-22, 22] : [0]) {
    ctx.beginPath();
    ctx.moveTo((side - 9) * u, -20 * u);
    ctx.quadraticCurveTo(side * u, -20 * u + flameLen * 1.4, (side + 9) * u, -20 * u);
    ctx.fill();
  }

  ctx.fillStyle = '#1b1b22';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * 38 * u, -9 * u, 11 * u, 10 * u, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#c4232c';
  roundRect(ctx, -46 * u, -44 * u, 92 * u, 32 * u, 10 * u);
  ctx.fill();
  ctx.fillStyle = '#e8434b';
  roundRect(ctx, -40 * u, -42 * u, 80 * u, 10 * u, 5 * u);
  ctx.fill();
  ctx.fillStyle = '#8d8d99';
  roundRect(ctx, -12 * u, -36 * u, 24 * u, 22 * u, 6 * u);
  ctx.fill();
  ctx.fillStyle = '#ffcf3a';
  ctx.fillRect(-28 * u, -30 * u, 8 * u, 6 * u);
  ctx.fillRect(20 * u, -30 * u, 8 * u, 6 * u);

  ctx.strokeStyle = '#5b3a6e';
  ctx.lineWidth = 7 * u;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-20 * u, -72 * u);
  ctx.lineTo(-38 * u, -62 * u);
  ctx.moveTo(20 * u, -72 * u);
  ctx.lineTo(38 * u, -62 * u);
  ctx.stroke();

  ctx.fillStyle = '#7a4a9e';
  ctx.beginPath();
  ctx.moveTo(-24 * u, -44 * u);
  ctx.lineTo(-18 * u, -84 * u);
  ctx.quadraticCurveTo(0, -92 * u, 18 * u, -84 * u);
  ctx.lineTo(24 * u, -44 * u);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#d9d6e3';
  ctx.beginPath();
  ctx.arc(0, -98 * u, 15 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -115 * u, 8 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b8b3c8';
  ctx.beginPath();
  ctx.arc(-4 * u, -101 * u, 6 * u, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(-46 * u, -66 * u, 12 * u, 8 * u);
  ctx.fillRect(34 * u, -66 * u, 12 * u, 8 * u);
  ctx.restore();
}

/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} w @param {number} h @param {number} r */
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A jagged alien boulder. @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y bottom @param {number} w @param {number} h @param {number} seed */
export function drawRock(ctx, x, y, w, h, seed) {
  const pts = 7;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  for (let i = 1; i < pts; i++) {
    const f = i / pts;
    const bump = 0.72 + 0.28 * Math.abs(Math.sin(seed * 12.9 + i * 3.7));
    ctx.lineTo(x - w / 2 + w * f, y - h * Math.sin(f * Math.PI) * bump);
  }
  ctx.lineTo(x + w / 2, y);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, y - h, 0, y);
  g.addColorStop(0, '#8a5cc2');
  g.addColorStop(1, '#3b2160');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(30, 10, 50, 0.6)';
  ctx.lineWidth = Math.max(1, w * 0.03);
  ctx.stroke();
}

/** A glowing crystal spire at the side of the track. @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y bottom @param {number} w @param {number} h @param {string} hue */
export function drawSpire(ctx, x, y, w, h, hue) {
  ctx.fillStyle = hue;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x - w * 0.1, y - h);
  ctx.lineTo(x + w * 0.15, y - h * 0.82);
  ctx.lineTo(x + w / 2, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.beginPath();
  ctx.moveTo(x - w * 0.25, y);
  ctx.lineTo(x - w * 0.1, y - h);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
}

const PICKUP_LOOK = {
  jetpack: { colour: '#ff8a2a', glyph: '🚀' },
  shield: { colour: '#38d8ff', glyph: '🛡️' },
  spread: { colour: '#ff4fd8', glyph: '✦' },
  cannon: { colour: '#ffd23a', glyph: '💥' },
};

/** A floating power-up bubble. @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y centre @param {number} r @param {keyof typeof PICKUP_LOOK} kind @param {number} t */
export function drawPickup(ctx, x, y, r, kind, t) {
  const look = PICKUP_LOOK[kind];
  const pulse = 1 + 0.08 * Math.sin(t * 8);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.6 * pulse);
  g.addColorStop(0, look.colour);
  g.addColorStop(0.55, `${look.colour}aa`);
  g.addColorStop(1, `${look.colour}00`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.6 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `${Math.round(r * 1.2)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = look.colour;
  ctx.fillText(look.glyph, x, y + r * 0.05);
}

/** An alien crystal to collect. @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y centre @param {number} r @param {number} t */
export function drawCrystal(ctx, x, y, r, t) {
  const spin = Math.abs(Math.cos(t * 4));
  ctx.fillStyle = '#5dff8a';
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.7 * spin + 1, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.7 * spin - 1, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#e6ffe9';
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.stroke();
}
