/**
 * Ambient backyard critters drawn over the battlefield: bees buzzing between
 * flower beds, butterflies drifting, a dragonfly darting about, ladybirds
 * crawling on the grass, and (on the lawn) a goldfish in the birdbath.
 * Pure decoration — nothing here touches gameplay.
 */

/** @typedef {{ x: number, y: number }} Pt */

/**
 * @typedef {Object} GardenScene
 * @property {Pt[]} flowers - Normalised spots bees and butterflies visit
 * @property {{ x: number, y: number, rx: number, ry: number }} [pond] - Normalised water ellipse for the fish
 * @property {{ x: number, y: number, spoutY: number, rx: number, ry: number }} [fountain]
 *   Painted birdbath on the field art — spout tip + basin for animated water.
 * @property {{ left: number, right: number, top: number, bottom: number }} grass - Where ladybirds crawl
 */

/** Flower beds on assets/field-lawn.jpg. */
export const LAWN_SCENE = {
  flowers: [
    { x: 0.13, y: 0.07 }, { x: 0.23, y: 0.07 }, { x: 0.36, y: 0.06 }, { x: 0.45, y: 0.04 },
    { x: 0.66, y: 0.07 }, { x: 0.71, y: 0.09 }, { x: 0.84, y: 0.2 }, { x: 0.9, y: 0.4 },
    { x: 0.94, y: 0.6 }, { x: 0.86, y: 0.8 }, { x: 0.74, y: 0.89 }, { x: 0.6, y: 0.89 },
    { x: 0.47, y: 0.9 }, { x: 0.27, y: 0.9 }, { x: 0.12, y: 0.92 }, { x: 0.02, y: 0.34 },
    { x: 0.04, y: 0.18 },
  ],
  // Top-right birdbath fountain baked into field-lawn.jpg.
  pond: { x: 0.745, y: 0.087, rx: 0.015, ry: 0.009 },
  fountain: { x: 0.745, y: 0.087, spoutY: 0.062, rx: 0.016, ry: 0.01 },
  grass: { left: 0.1, right: 0.82, top: 0.2, bottom: 0.78 },
};

/** Lane field: flowers along the top and bottom hedgerows. */
export const LANE_SCENE = {
  flowers: [0.12, 0.26, 0.4, 0.55, 0.7, 0.84].flatMap((x) => [{ x, y: 0.05 }, { x: x + 0.05, y: 0.95 }]),
  grass: { left: 0.15, right: 0.8, top: 0.12, bottom: 0.88 },
};

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const BUTTERFLY_COLOURS = [
  ['#ff9f2e', '#ffd36b'],
  ['#5ab8ff', '#c9ecff'],
  ['#fff6e0', '#ffd0e8'],
  ['#ff6fae', '#ffe0f0'],
];

/** @param {GardenScene} scene */
export function createGardenLife(scene, { bees = 4, butterflies = 3, ladybirds = 2, dragonflies = 1 } = {}) {
  /** Flyers head for a flower, hover a moment, then pick another. */
  const flyer = (kind, speed) => {
    const at = pick(scene.flowers);
    return {
      kind,
      x: at.x + rand(-0.02, 0.02),
      y: at.y + rand(-0.02, 0.02),
      target: pick(scene.flowers),
      rest: rand(0, 2),
      speed,
      phase: rand(0, Math.PI * 2),
      heading: 0,
      colours: pick(BUTTERFLY_COLOURS),
    };
  };

  const critters = [
    ...Array.from({ length: bees }, () => flyer('bee', rand(0.07, 0.1))),
    ...Array.from({ length: butterflies }, () => flyer('butterfly', rand(0.035, 0.05))),
    ...Array.from({ length: dragonflies }, () => flyer('dragonfly', 0.22)),
  ];

  const g = scene.grass;
  const crawlers = Array.from({ length: ladybirds }, () => ({
    x: rand(g.left, g.right),
    y: rand(g.top, g.bottom),
    heading: rand(0, Math.PI * 2),
    turnIn: rand(1, 3),
    pause: 0,
  }));

  const fish = scene.pond ? { angle: 0, jumpIn: rand(3, 6), jumpT: -1, splashT: -1, splashAt: { x: 0, y: 0 } } : null;
  /** @type {{ x: number, y: number, vx: number, vy: number, life: number, size: number }[]} */
  const drops = [];
  let spoutPulse = 0;
  let time = 0;

  function updateFlyer(c, dt) {
    if (c.rest > 0) {
      c.rest -= dt;
      if (c.rest <= 0) {
        let next = pick(scene.flowers);
        if (c.kind === 'dragonfly') next = { x: rand(0.15, 0.8), y: rand(0.2, 0.8) };
        c.target = next;
      }
      return;
    }
    const dx = c.target.x - c.x;
    const dy = (c.target.y - c.y) * 0.56;
    const d = Math.hypot(dx, dy);
    if (d < 0.006) {
      c.rest = c.kind === 'dragonfly' ? rand(0.3, 1.2) : c.kind === 'bee' ? rand(0.8, 2.6) : rand(1.5, 4);
      return;
    }
    const step = Math.min(d, c.speed * dt);
    c.heading = Math.atan2(dy, dx);
    const wobble = c.kind === 'bee' ? 0.9 : c.kind === 'butterfly' ? 1.6 : 0.2;
    const sway = Math.sin(time * (c.kind === 'bee' ? 9 : 3) + c.phase) * wobble;
    const ang = c.heading + sway * 0.6;
    c.x += Math.cos(ang) * step;
    c.y += (Math.sin(ang) * step) / 0.56;
  }

  function updateCrawler(c, dt) {
    if (c.pause > 0) {
      c.pause -= dt;
      return;
    }
    c.turnIn -= dt;
    if (c.turnIn <= 0) {
      c.heading += rand(-1.2, 1.2);
      c.turnIn = rand(1, 3);
      if (Math.random() < 0.3) c.pause = rand(0.8, 2.5);
    }
    c.x += Math.cos(c.heading) * 0.006 * dt;
    c.y += Math.sin(c.heading) * 0.01 * dt;
    if (c.x < g.left || c.x > g.right) c.heading = Math.PI - c.heading;
    if (c.y < g.top || c.y > g.bottom) c.heading = -c.heading;
    c.x = Math.max(g.left, Math.min(g.right, c.x));
    c.y = Math.max(g.top, Math.min(g.bottom, c.y));
  }

  function updateFish(dt) {
    if (!fish) return;
    if (fish.jumpT >= 0) {
      fish.jumpT += dt;
      if (fish.jumpT >= 0.9) {
        fish.jumpT = -1;
        fish.splashT = 0;
        fish.jumpIn = rand(4, 8);
      }
    } else {
      fish.angle += dt * 1.3;
      fish.jumpIn -= dt;
      if (fish.jumpIn <= 0) {
        fish.jumpT = 0;
        fish.splashT = 0;
      }
    }
    if (fish.splashT >= 0) {
      fish.splashT += dt;
      if (fish.splashT > 0.8 && fish.jumpT < 0) fish.splashT = -1;
    }
  }

  function updateFountain(dt) {
    if (!scene.fountain) return;
    const f = scene.fountain;
    spoutPulse += dt;
    // Spout continuously throws little droplets up then into the basin.
    const spawn = Math.min(4, Math.floor(dt * 28 + Math.random()));
    for (let i = 0; i < spawn; i++) {
      const ang = -Math.PI / 2 + rand(-0.55, 0.55);
      const speed = rand(0.035, 0.07);
      drops.push({
        x: f.x + rand(-0.0015, 0.0015),
        y: f.spoutY,
        vx: Math.cos(ang) * speed * 0.35,
        vy: Math.sin(ang) * speed,
        life: rand(0.35, 0.7),
        size: rand(0.7, 1.4),
      });
    }
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.life -= dt;
      d.vy += 0.22 * dt; // gravity (normalised units / sec²)
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      // Settle into the basin surface.
      if (d.y >= f.y - f.ry * 0.2) {
        d.y = f.y - f.ry * 0.15 + rand(-0.001, 0.002);
        d.vy *= -0.15;
        d.vx *= 0.6;
        d.life -= dt * 1.5;
      }
      if (d.life <= 0) drops.splice(i, 1);
    }
    if (drops.length > 48) drops.splice(0, drops.length - 48);
  }

  /** @param {number} dt */
  function update(dt) {
    time += dt;
    critters.forEach((c) => updateFlyer(c, dt));
    crawlers.forEach((c) => updateCrawler(c, dt));
    updateFish(dt);
    updateFountain(dt);
  }

  /** @param {CanvasRenderingContext2D} ctx */
  function drawBee(ctx, c, s) {
    const flap = Math.abs(Math.sin(time * 60 + c.phase));
    ctx.rotate(c.heading);
    ctx.fillStyle = `rgba(235, 248, 255, ${0.45 + flap * 0.4})`;
    ctx.beginPath();
    ctx.ellipse(-s * 0.1, -s * 0.55, s * 0.45, s * 0.28 * (0.4 + flap), -0.4, 0, Math.PI * 2);
    ctx.ellipse(-s * 0.1, s * 0.55, s * 0.45, s * 0.28 * (0.4 + flap), 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffc61a';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.7, s * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a1a06';
    ctx.fillRect(-s * 0.25, -s * 0.42, s * 0.18, s * 0.84);
    ctx.fillRect(s * 0.12, -s * 0.4, s * 0.16, s * 0.8);
    ctx.beginPath();
    ctx.arc(s * 0.62, 0, s * 0.24, 0, Math.PI * 2);
    ctx.fill();
  }

  /** @param {CanvasRenderingContext2D} ctx */
  function drawButterfly(ctx, c, s) {
    const resting = c.rest > 0;
    const flap = resting ? 0.35 + Math.sin(time * 2 + c.phase) * 0.15 : Math.abs(Math.sin(time * 12 + c.phase));
    const [main, tip] = c.colours;
    ctx.rotate(c.heading * 0.25);
    [-1, 1].forEach((side) => {
      ctx.save();
      ctx.scale(side * (0.25 + flap * 0.75), 1);
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.ellipse(s * 0.55, -s * 0.35, s * 0.6, s * 0.48, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = tip;
      ctx.beginPath();
      ctx.ellipse(s * 0.45, s * 0.38, s * 0.38, s * 0.32, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(40, 20, 10, 0.55)';
      ctx.beginPath();
      ctx.arc(s * 0.85, -s * 0.5, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    ctx.fillStyle = '#2a1a06';
    ctx.fillRect(-s * 0.07, -s * 0.6, s * 0.14, s * 1.2);
  }

  /** @param {CanvasRenderingContext2D} ctx */
  function drawDragonfly(ctx, c, s) {
    const flap = Math.abs(Math.sin(time * 70 + c.phase));
    ctx.rotate(c.heading);
    ctx.fillStyle = `rgba(210, 245, 255, ${0.35 + flap * 0.35})`;
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.ellipse(s * 0.35, side * s * 0.8, s * 0.22, s * 0.8, side * 0.2, 0, Math.PI * 2);
      ctx.ellipse(s * 0.05, side * s * 0.75, s * 0.2, s * 0.72, -side * 0.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#1fb8a8';
    ctx.fillRect(-s * 1.3, -s * 0.09, s * 1.5, s * 0.18);
    ctx.fillStyle = '#16867c';
    ctx.beginPath();
    ctx.ellipse(s * 0.35, 0, s * 0.32, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.72, 0, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  /** @param {CanvasRenderingContext2D} ctx */
  function drawLadybird(ctx, c, s) {
    ctx.rotate(c.heading);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(s * 0.1, s * 0.12, s * 0.6, s * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1006';
    ctx.beginPath();
    ctx.arc(s * 0.5, 0, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8261c';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.52, s * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1006';
    ctx.lineWidth = Math.max(0.6, s * 0.06);
    ctx.beginPath();
    ctx.moveTo(-s * 0.52, 0);
    ctx.lineTo(s * 0.3, 0);
    ctx.stroke();
    ctx.fillStyle = '#1a1006';
    [[-0.2, -0.22], [-0.2, 0.22], [0.12, -0.2], [0.12, 0.2]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(s * dx, s * dy, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /** @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h */
  function drawFish(ctx, w, h) {
    if (!fish || !scene.pond) return;
    const p = scene.pond;
    const cx = p.x * w;
    const cy = p.y * h;
    const rx = p.rx * w;
    const ry = p.ry * h;
    const s = Math.max(3, rx * 0.32);

    if (fish.splashT >= 0) {
      const k = fish.splashT / 0.8;
      ctx.strokeStyle = `rgba(230, 250, 255, ${0.8 * (1 - k)})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(cx + rx * 0.45, cy, rx * (0.2 + k * 0.6), ry * (0.2 + k * 0.6), 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    let fx;
    let fy;
    let ang;
    let alpha = 0.8;
    if (fish.jumpT >= 0) {
      const t = fish.jumpT / 0.9;
      fx = cx + rx * (0.45 - t * 0.9);
      fy = cy - Math.sin(t * Math.PI) * ry * 3.2;
      ang = Math.PI + (t - 0.5) * 1.8;
      alpha = 1;
    } else {
      fx = cx + Math.cos(fish.angle) * rx * 0.62;
      fy = cy + Math.sin(fish.angle) * ry * 0.62;
      ang = fish.angle + Math.PI / 2;
    }
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(ang);
    ctx.globalAlpha = alpha;
    const wag = Math.sin(time * 14) * 0.35;
    ctx.fillStyle = '#ff7a1a';
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, 0);
    ctx.lineTo(-s * 1.25, -s * 0.45 + wag * s * 0.4);
    ctx.lineTo(-s * 1.25, s * 0.45 + wag * s * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.8, s * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd08a';
    ctx.beginPath();
    ctx.ellipse(s * 0.15, -s * 0.1, s * 0.4, s * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Animated pour on the painted birdbath fountain (field art stays static). */
  function drawFountain(ctx, w, h) {
    if (!scene.fountain) return;
    const f = scene.fountain;
    const cx = f.x * w;
    const cy = f.y * h;
    const sx = f.x * w;
    const sy = f.spoutY * h;
    const rx = f.rx * w;
    const ry = f.ry * h;

    // Soft shimmer / ripples in the basin.
    for (let i = 0; i < 3; i++) {
      const k = (time * (0.7 + i * 0.25) + i * 1.7) % 1;
      ctx.strokeStyle = `rgba(210, 245, 255, ${0.35 * (1 - k)})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * (0.35 + k * 0.75), ry * (0.35 + k * 0.75), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Bright highlight that slides across the pool.
    const shimmer = (Math.sin(time * 2.4) + 1) * 0.5;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.12 + shimmer * 0.1})`;
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.2, cy - ry * 0.15, rx * 0.45, ry * 0.28, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Continuous spout column.
    const pulse = 0.85 + Math.sin(spoutPulse * 14) * 0.15;
    const grad = ctx.createLinearGradient(sx, sy, sx, cy);
    grad.addColorStop(0, `rgba(200, 240, 255, ${0.55 * pulse})`);
    grad.addColorStop(0.55, `rgba(140, 210, 255, ${0.35 * pulse})`);
    grad.addColorStop(1, 'rgba(180, 230, 255, 0.05)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = Math.max(1.6, h * 0.0035 * pulse);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + Math.sin(time * 9) * rx * 0.08, (sy + cy) * 0.5, sx, cy - ry * 0.2);
    ctx.stroke();

    // Droplets pouring out and back in.
    for (const d of drops) {
      const alpha = Math.max(0, Math.min(1, d.life * 2));
      ctx.fillStyle = `rgba(220, 245, 255, ${0.55 * alpha})`;
      ctx.beginPath();
      ctx.ellipse(d.x * w, d.y * h, Math.max(1.1, h * 0.0022 * d.size), Math.max(1.6, h * 0.0035 * d.size), 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tiny splash ring where the jet hits the basin.
    const splash = (Math.sin(time * 18) + 1) * 0.5;
    ctx.strokeStyle = `rgba(230, 250, 255, ${0.25 + splash * 0.25})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy - ry * 0.1, rx * (0.18 + splash * 0.08), ry * (0.12 + splash * 0.06), 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} w @param {number} h
   * @param {'ground'|'air'} layer - crawlers and the fish sit under the action; flyers above it
   */
  function draw(ctx, w, h, layer) {
    const s = Math.max(5, h * 0.0115);
    ctx.save();
    if (layer === 'ground') {
      drawFish(ctx, w, h);
      crawlers.forEach((c) => {
        ctx.save();
        ctx.translate(c.x * w, c.y * h);
        drawLadybird(ctx, c, s * 0.85);
        ctx.restore();
      });
    } else {
      drawFountain(ctx, w, h);
      critters.forEach((c) => {
        ctx.save();
        const bob = Math.sin(time * 5 + c.phase) * s * 0.4;
        ctx.translate(c.x * w, c.y * h + bob);
        if (c.kind === 'bee') drawBee(ctx, c, s);
        else if (c.kind === 'butterfly') drawButterfly(ctx, c, s * 1.05);
        else drawDragonfly(ctx, c, s * 1.15);
        ctx.restore();
      });
    }
    ctx.restore();
  }

  return { update, draw };
}
