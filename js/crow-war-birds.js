export const CROW_WAR_BIRDS_SRC = 'assets/crow-war-crows.png';

const stocky = [31, 69, 627, 640];
const tall = [771, 14, 659, 696];
const scruffy = [1563, 153, 554, 555];

const birds = [
  { crop: stocky, x: 362, y: 337, size: 40, dx: 21, dy: 9, delay: 0.3, cycle: 7 },
  { crop: tall, x: 1046, y: 517, size: 44, dx: -19, dy: -5, delay: 2.7, cycle: 8 },
  { crop: scruffy, x: 948, y: 744, size: 36, dx: -17, dy: -6, delay: 5.1, cycle: 7.4 },
  { crop: stocky, x: 892, y: 309, size: 37, dx: -19, dy: 5, delay: 4.3, cycle: 8.6 },
  { crop: scruffy, x: 1111, y: 710, size: 39, dx: 19, dy: 3, delay: 1.8, cycle: 6.7 },
];

function pose(bird, time) {
  const phase = ((time + bird.delay) % bird.cycle) / bird.cycle;
  if ((phase > 0.12 && phase < 0.22) || (phase > 0.64 && phase < 0.74)) {
    const back = phase > 0.64;
    const hop = (phase - (back ? 0.64 : 0.12)) / 0.10;
    const arc = Math.sin(Math.PI * hop);
    return { travel: back ? 1 - hop : hop, lift: 11 * arc, lean: 0.12 * arc, back };
  }

  const away = phase >= 0.22 && phase <= 0.64;
  const peckAt = away ? (phase - 0.29) / 0.25 : (phase - 0.8) / 0.15;
  const peck = peckAt >= 0 && peckAt <= 1 ? Math.pow(Math.abs(Math.sin(peckAt * Math.PI * 2)), 3) : 0;
  const idle = Math.sin(time * 3.4 + bird.delay) * 0.035;
  return { travel: Number(away), lift: 0, lean: peck * 0.74 + idle, back: !away && phase > 0.64 };
}

export function drawCrowWarBirds(ctx, image, width, height, time) {
  ctx.save();
  ctx.scale(width / 1672, height / 941);
  for (const bird of birds) {
    const { travel, lift, lean, back } = pose(bird, time);
    const x = bird.x + travel * bird.dx;
    const y = bird.y + travel * bird.dy;
    const [sx, sy, sw, sh] = bird.crop;
    const dw = bird.size * sw / sh;

    // Loose kernels give the birds something visible to peck at.
    ctx.fillStyle = '#d8ad45';
    for (const offset of [-2, 1, 4]) {
      ctx.beginPath();
      ctx.ellipse(bird.x + bird.dx + Math.sign(bird.dx) * 17 + offset, bird.y + bird.dy + offset * 0.35, 1.3, 0.85, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = `rgba(28, 23, 14, ${0.26 - lift * 0.012})`;
    ctx.beginPath();
    ctx.ellipse(x - 2, y + 1, dw * 0.4 + lift * 0.18, bird.size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(x, y - lift);
    ctx.scale(Math.sign(bird.dx) * (back ? -1 : 1), 1);
    ctx.rotate(lean);
    ctx.drawImage(image, sx, sy, sw, sh, -dw * 0.62, -bird.size, dw, bird.size);
    ctx.restore();
  }
  ctx.restore();
}
