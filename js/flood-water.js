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
  ctx.translate(...from);
  ctx.rotate(angle);
  ctx.lineWidth = 1.3;
  ctx.lineCap = 'round';
  const count = Math.ceil(distance / 24) + 5;
  for (let i = 0; i < count; i++) {
    const phase = fraction(i * 0.618 + time * (0.11 + 5 / distance));
    const x = phase * distance;
    const y = (fraction(i * 0.381 + index * 0.23) - 0.5) * spread + Math.sin(phase * 9 + i) * 4;
    const opacity = Math.sin(phase * Math.PI) * (0.045 + 0.08 * fraction(i * 0.414));
    const size = 6 + fraction(i * 0.754) * 21;
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
}

export function drawFloodWater(ctx, width, height, time) {
  ctx.save();
  ctx.scale(width / 1672, height / 941);
  channels.forEach((channel, index) => drawCurrent(ctx, channel, time, index));
  ctx.restore();
}
