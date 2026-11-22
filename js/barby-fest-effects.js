const fraction = (value) => value - Math.floor(value);
const peppers = ['#a73a20', '#8ea542', '#dba045', '#75371f', '#c45d26'];

function drawSkewers(ctx) {
  for (const [x, y] of [[318, 310], [337, 314]]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.22);
    ctx.strokeStyle = '#c09564';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(35, 0);
    ctx.stroke();
    peppers.forEach((color, i) => {
      const pieceX = i * 6;
      ctx.fillStyle = '#3a1c13';
      ctx.fillRect(pieceX - 1, -2, 6, 6);
      ctx.fillStyle = color;
      ctx.fillRect(pieceX, -3, 5, 5);
      ctx.fillStyle = 'rgba(255, 215, 155, .48)';
      ctx.fillRect(pieceX + 1, -3, 3, 1);
    });
    ctx.restore();
  }
}

// Soft pockets of heat beneath the two roasts, scattered across the grate.
const coalPockets = [
  [267, 309, 6], [277, 314, 9], [289, 310, 5], [298, 307, 7],
  [328, 303, 7], [339, 305, 5], [349, 300, 10], [363, 299, 6],
];

function drawCoals(ctx, time) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const [i, [x, y, radius]] of coalPockets.entries()) {
    const flicker = 0.5 + 0.27 * Math.sin(time * (2.9 + i * 0.81) + i * 2.4)
      + 0.20 * Math.sin(time * 8.1 - i * 3.8);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.22);
    ctx.scale(1, 0.45);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    glow.addColorStop(0, `rgba(255, 154, 58, ${flicker * 0.77})`);
    glow.addColorStop(0.42, `rgba(255, 77, 18, ${flicker * 0.44})`);
    glow.addColorStop(1, 'rgba(255, 48, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    ctx.restore();
  }
  ctx.restore();
}

function smokePuff(ctx, x, y, radius, opacity, light) {
  const gradient = ctx.createRadialGradient(x - radius * 0.14, y - radius * 0.25, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(${light}, ${opacity})`);
  gradient.addColorStop(0.48, `rgba(${light}, ${opacity * 0.7})`);
  gradient.addColorStop(1, `rgba(${light}, 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function drawPlume(ctx, originX, originY, time, count, rise, strength) {
  const cycle = 5.4;
  for (let i = 0; i < count; i++) {
    const seed = fraction(i * 0.618);
    const age = fraction(time / cycle + i / count);
    const spread = 7 + age * 53;
    const wind = age * age * 138;
    const turbulent = Math.sin(age * 11 + i * 2.4) * spread * 0.52;
    const x = originX + wind + turbulent + (seed - 0.5) * spread;
    const y = originY - age * rise + Math.sin(age * 7 + i) * age * 9;
    const radius = 7 + age * (32 + seed * 36);
    const opacity = strength * Math.pow(1 - age, 0.64) * Math.min(1, age * 14);
    smokePuff(ctx, x + radius * 0.13, y + radius * 0.19, radius, opacity * 0.63, '74, 70, 65');
    smokePuff(ctx, x - radius * 0.18, y - radius * 0.12, radius * 0.91, opacity, '214, 215, 207');
  }
}

export function drawBarbyFestEffects(ctx, width, height, time) {
  ctx.save();
  ctx.scale(width / 1672, height / 941);
  drawSkewers(ctx);
  drawCoals(ctx, time);
  drawPlume(ctx, 229, 169, time, 27, 165, 0.57);
  drawPlume(ctx, 302, 284, time + 0.7, 18, 155, 0.32);
  drawPlume(ctx, 354, 275, time + 1.6, 15, 126, 0.25);
  ctx.restore();
}
