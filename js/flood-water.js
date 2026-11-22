const channels = [
  { edge: [[423, 168], [493, 169], [456, 327], [381, 327]], from: [457, 173], to: [419, 323], spread: 57 },
  { edge: [[380, 409], [460, 409], [472, 506], [486, 563], [382, 563]], from: [418, 414], to: [431, 556], spread: 66 },
  { edge: [[437, 532], [523, 511], [946, 511], [1054, 525], [1150, 566], [465, 568]], from: [448, 547], to: [1111, 550], spread: 34 },
  { edge: [[1096, 162], [1224, 171], [1160, 273], [1067, 273]], from: [1168, 168], to: [1118, 270], spread: 62 },
  { edge: [[1061, 405], [1169, 405], [1164, 481], [1181, 547], [1066, 542]], from: [1107, 412], to: [1121, 539], spread: 83 },
  { edge: [[1094, 511], [1162, 511], [1156, 595], [1095, 595]], from: [1125, 512], to: [1125, 595], spread: 54 },
  { edge: [[1088, 661], [1165, 661], [1148, 885], [1108, 885]], from: [1125, 661], to: [1129, 885], spread: 55 },
];

const fraction = (n) => n - Math.floor(n);

function drawCurrent(ctx, { edge, from, to, spread }, time, index) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(...edge[0]);
  for (const vertex of edge.slice(1)) ctx.lineTo(...vertex);
  ctx.closePath();
  ctx.clip();
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const distance = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  ctx.save();
  ctx.translate(...from);
  ctx.rotate(angle);
  ctx.lineWidth = 1.55;
  ctx.lineCap = 'round';
  const count = Math.ceil(distance / 20) + 7;
  for (let i = 0; i < count; i++) {
    const phase = fraction(i * 0.618 + time * (0.15 + 6 / distance));
    const x = phase * distance;
    const y = (fraction(i * 0.381 + index * 0.23) - 0.5) * spread + Math.sin(phase * 9 + i) * 4;
    const opacity = Math.sin(phase * Math.PI) * (0.1 + 0.14 * fraction(i * 0.414));
    const size = 8 + fraction(i * 0.754) * 25;
    const gleam = ctx.createLinearGradient(x - size, y, x + size, y);
    gleam.addColorStop(0, 'rgba(208, 236, 223, 0)');
    gleam.addColorStop(0.48, `rgba(222, 245, 232, ${opacity})`);
    gleam.addColorStop(1, 'rgba(208, 236, 223, 0)');
    ctx.strokeStyle = gleam;
    ctx.beginPath();
    ctx.moveTo(x - size, y + 2);
    ctx.bezierCurveTo(x - size / 3, y - 3, x + size * 0.5, y - 2, x + size, y + 1);
    ctx.stroke();
  }
  ctx.restore();

  // Foam curls travel with the current, but stay horizontally oriented in
  // screen space so vertical channels still read as a flat water surface.
  ctx.globalCompositeOperation = 'screen';
  for (let swirl = 0; swirl < 3; swirl++) {
    const travel = fraction(time * (0.055 + index * 0.002) + swirl * 0.34 + index * 0.117);
    const sx = from[0] + dx * travel;
    const sy = from[1] + dy * travel + Math.sin(time * 0.8 + swirl * 2.1 + index) * spread * 0.08;
    const radius = Math.min(spread * 0.27, 15 + index * 0.65);
    const spin = (swirl % 2 ? -1 : 1) * time * 1.1 + swirl * 1.7;
    for (let curl = 0; curl < 2; curl++) {
      ctx.strokeStyle = `rgba(225, 255, 250, ${0.32 - curl * 0.08})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(
        sx, sy,
        radius * (0.62 + curl * 0.38), radius * (0.22 + curl * 0.08),
        0, spin + curl * 0.7, spin + Math.PI * (1.35 + curl * 0.15)
      );
      ctx.stroke();
    }
  }

  // Two staggered horizontal ripple sets keep every channel visibly alive.
  for (let ripple = 0; ripple < 2; ripple++) {
    const ripplePhase = fraction(time * 0.28 + index * 0.173 + ripple * 0.51);
    const along = 0.26 + ripple * 0.44 + Math.sin(index + ripple) * 0.035;
    const rippleX = from[0] + dx * along;
    const rippleY = from[1] + dy * along + (ripple ? -1 : 1) * spread * 0.11;
    ctx.strokeStyle = `rgba(233, 255, 252, ${(1 - ripplePhase) * 0.34})`;
    ctx.lineWidth = 1.35;
    ctx.beginPath();
    ctx.ellipse(rippleX, rippleY, 5 + ripplePhase * 25, 2 + ripplePhase * 7, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Frequent but small splash crowns, staggered across the connected channels.
  const splashPhase = fraction(time * 0.22 + index * 0.271);
  if (splashPhase < 0.22) {
    const life = splashPhase / 0.22;
    const along = 0.38 + fraction(index * 0.47) * 0.28;
    const splashX = from[0] + dx * along;
    const splashY = from[1] + dy * along + (fraction(index * 0.29) - 0.5) * spread * 0.2;
    const alpha = Math.sin(life * Math.PI) * 0.58;
    ctx.strokeStyle = `rgba(235, 255, 252, ${alpha})`;
    ctx.fillStyle = `rgba(225, 252, 250, ${alpha})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(splashX, splashY, 5 + life * 15, 1.8 + life * 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let drop = -2; drop <= 2; drop++) {
      const rise = Math.sin(life * Math.PI) * (7 + Math.abs(drop) * 2);
      ctx.beginPath();
      ctx.arc(splashX + drop * 4.5 * life, splashY - rise, 1.35 - life * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawFloodWater(ctx, width, height, time) {
  ctx.save();
  ctx.scale(width / 1672, height / 941);
  channels.forEach((channel, index) => drawCurrent(ctx, channel, time, index));
  ctx.restore();
}
