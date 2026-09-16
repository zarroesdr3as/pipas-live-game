const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');

let w = innerWidth;
let h = innerHeight;
let dpr = Math.min(devicePixelRatio || 1, 2);
const keys = new Set();

const kite = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  heading: -Math.PI / 2,
  bodyAngle: 0,
  bank: 0,
  moving: false,
};

const camera = { x: 0, y: 0 };
const tail = [];
const ghosts = [];
const TAIL_POINTS = 92;
const TAIL_SEGMENT = 4.25;

const grain = Array.from({ length: 320 }, (_, i) => ({
  x: ((Math.sin(i * 91.713) * 43758.5453) % 1 + 1) % 1,
  y: ((Math.sin((i + 41) * 57.19) * 24634.6345) % 1 + 1) % 1,
  a: 0.006 + (i % 7) * 0.0013,
}));

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function wrapPi(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function resize() {
  w = innerWidth;
  h = innerHeight;
  dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

addEventListener('resize', resize);
addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's'].includes(k)) {
    e.preventDefault();
    keys.add(k);
  }
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
resize();

function manualDirection() {
  let x = 0;
  let y = 0;
  if (keys.has('arrowleft') || keys.has('a')) x -= 1;
  if (keys.has('arrowright') || keys.has('d')) x += 1;
  if (keys.has('arrowup') || keys.has('w')) y -= 1;
  if (keys.has('arrowdown') || keys.has('s')) y += 1;
  if (!x && !y) return null;
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

function tailAnchor() {
  const s = 10.5;
  return {
    x: kite.x - Math.sin(kite.bodyAngle) * s,
    y: kite.y + Math.cos(kite.bodyAngle) * s,
  };
}

function resetTail() {
  tail.length = 0;
  const a = tailAnchor();
  for (let i = 0; i < TAIL_POINTS; i++) {
    const x = a.x;
    const y = a.y + i * TAIL_SEGMENT;
    tail.push({ x, y, px: x, py: y });
  }
}
resetTail();

function screenPoint(x, y) {
  return {
    x: x - camera.x + w * 0.5,
    y: y - camera.y + h * 0.34,
  };
}

function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0754ad');
  g.addColorStop(0.48, '#0872d0');
  g.addColorStop(1, '#15a5e9');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * 0.64, h * 0.78, 0, w * 0.64, h * 0.78, h * 0.75);
  glow.addColorStop(0, 'rgba(145,225,255,.16)');
  glow.addColorStop(1, 'rgba(145,225,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const vignette = ctx.createRadialGradient(
    w * 0.5,
    h * 0.47,
    Math.min(w, h) * 0.22,
    w * 0.5,
    h * 0.47,
    Math.max(w, h) * 0.73,
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,24,72,.15)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  for (const p of grain) {
    ctx.fillStyle = `rgba(255,255,255,${p.a})`;
    ctx.fillRect(p.x * w, p.y * h, 1, 1);
  }
}

function updateKite(dt) {
  const dir = manualDirection();
  const wasMoving = kite.moving;
  kite.moving = Boolean(dir);

  if (!dir) {
    // Regra principal do jogo: sem comando, a pipa fica parada.
    kite.vx = 0;
    kite.vy = 0;
    kite.bank += (0 - kite.bank) * Math.min(1, dt * 10);
    return;
  }

  const targetSpeed = 245;
  const targetVx = dir.x * targetSpeed;
  const targetVy = dir.y * targetSpeed;
  const response = 1 - Math.exp(-dt * 7.2);

  const oldHeading = kite.heading;
  kite.vx += (targetVx - kite.vx) * response;
  kite.vy += (targetVy - kite.vy) * response;
  kite.x += kite.vx * dt;
  kite.y += kite.vy * dt;

  const heading = Math.atan2(kite.vy, kite.vx);
  const delta = wrapPi(heading - oldHeading);
  kite.heading += wrapPi(heading - kite.heading) * Math.min(1, dt * 13);

  const turnRate = delta / Math.max(dt, 1 / 120);
  const bankTarget = clamp(turnRate * 0.055, -0.66, 0.66);
  kite.bank += (bankTarget - kite.bank) * Math.min(1, dt * 9);

  const bodyTarget = heading + Math.PI / 2;
  kite.bodyAngle += wrapPi(bodyTarget - kite.bodyAngle) * Math.min(1, dt * 12);

  if (!wasMoving || Math.abs(delta) > 0.015) {
    ghosts.unshift({ x: kite.x, y: kite.y, a: kite.bodyAngle, b: kite.bank, life: 1 });
    if (ghosts.length > 6) ghosts.pop();
  }

  const cameraFollow = 1 - Math.exp(-dt * 2.4);
  camera.x += (kite.x - camera.x) * cameraFollow;
  camera.y += (kite.y - camera.y) * cameraFollow;
}

function updateTail(dt, now) {
  const anchor = tailAnchor();
  const activity = kite.moving ? clamp(Math.hypot(kite.vx, kite.vy) / 245, 0, 1) : 0;
  const dt2 = dt * dt;

  tail[0].x = anchor.x;
  tail[0].y = anchor.y;
  tail[0].px = anchor.x;
  tail[0].py = anchor.y;

  for (let i = 1; i < tail.length; i++) {
    const p = tail[i];
    const depth = i / (tail.length - 1);
    const vx = (p.x - p.px) * (0.992 - depth * 0.008);
    const vy = (p.y - p.py) * (0.992 - depth * 0.008);
    p.px = p.x;
    p.py = p.y;

    // A turbulência só existe enquanto o jogador está movimentando a pipa.
    const turbulence = activity * (
      Math.sin(now * 0.0042 + i * 0.34) * (5 + depth * 30) +
      Math.sin(now * 0.0081 + i * 0.15 + 1.7) * (2 + depth * 9)
    );

    const dragX = -kite.vx * (0.08 + depth * 0.16) * activity;
    const dragY = -kite.vy * (0.08 + depth * 0.16) * activity;
    const settle = kite.moving ? 5 : 16;

    p.x += vx + (turbulence + dragX) * dt2;
    p.y += vy + (settle + dragY) * dt2;
  }

  for (let iter = 0; iter < 10; iter++) {
    tail[0].x = anchor.x;
    tail[0].y = anchor.y;

    for (let i = 1; i < tail.length; i++) {
      const a = tail[i - 1];
      const b = tail[i];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 1;
      const error = (dist - TAIL_SEGMENT) / dist;
      const stiffness = 0.94;

      if (i === 1) {
        b.x -= dx * error * stiffness;
        b.y -= dy * error * stiffness;
      } else {
        const cx = dx * error * stiffness * 0.5;
        const cy = dy * error * stiffness * 0.5;
        a.x += cx;
        a.y += cy;
        b.x -= cx;
        b.y -= cy;
      }
    }
  }
}

function strokeSmooth(points) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) * 0.5;
    const my = (points[i].y + points[i + 1].y) * 0.5;
    ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
}

function drawTail(now) {
  const pts = tail.map((p) => screenPoint(p.x, p.y));
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (kite.moving) {
    ctx.filter = 'blur(2px)';
    ctx.strokeStyle = 'rgba(230,244,255,.16)';
    ctx.lineWidth = 4.8;
    strokeSmooth(pts);
    ctx.stroke();
  }

  ctx.filter = 'blur(.45px)';
  ctx.strokeStyle = 'rgba(243,248,250,.46)';
  ctx.lineWidth = 1.8;
  strokeSmooth(pts);
  ctx.stroke();

  ctx.filter = 'none';
  ctx.strokeStyle = 'rgba(250,252,250,.66)';
  ctx.lineWidth = 0.72;
  strokeSmooth(pts);
  ctx.stroke();

  for (let i = 7; i < pts.length - 2; i += 6) {
    const p = pts[i];
    const q = pts[i + 1];
    const angle = Math.atan2(q.y - p.y, q.x - p.x);
    const flutter = kite.moving ? Math.sin(now * 0.009 + i * 0.91) * 0.72 : 0;
    const fade = 0.24 + 0.24 * (1 - i / pts.length);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle + flutter);
    ctx.fillStyle = `rgba(248,250,247,${fade})`;
    ctx.fillRect(-3.1, -0.9, 6.2, 1.8);
    ctx.restore();
  }

  ctx.restore();
}

function drawKiteShape(x, y, angle, bank, alpha = 1, blur = 0) {
  const size = clamp(Math.min(w, h) * 0.024, 15, 24);
  const perspective = 0.34 + Math.abs(Math.cos(bank)) * 0.66;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(perspective, 1);
  if (blur) ctx.filter = `blur(${blur}px)`;

  ctx.shadowColor = 'rgba(0,20,30,.26)';
  ctx.shadowBlur = 3.2;
  ctx.shadowOffsetY = 1.5;

  ctx.beginPath();
  ctx.moveTo(0, -size * 0.72);
  ctx.lineTo(size * 0.74, -size * 0.03);
  ctx.lineTo(0, size * 0.75);
  ctx.lineTo(-size * 0.74, -size * 0.03);
  ctx.closePath();

  const grad = ctx.createLinearGradient(-size, -size, size, size);
  grad.addColorStop(0, '#0b3c28');
  grad.addColorStop(0.24, '#1d7b3b');
  grad.addColorStop(0.49, '#b8d934');
  grad.addColorStop(0.68, '#49a846');
  grad.addColorStop(1, '#083323');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.shadowColor = 'transparent';

  // Pequenas divisões irregulares para parecer papel de pipa, não um ícone vetorial perfeito.
  ctx.globalAlpha *= 0.78;
  ctx.fillStyle = 'rgba(223,239,50,.72)';
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.68);
  ctx.lineTo(size * 0.17, -size * 0.03);
  ctx.lineTo(0, size * 0.08);
  ctx.lineTo(-size * 0.16, -size * 0.03);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(8,71,37,.68)';
  ctx.beginPath();
  ctx.moveTo(-size * 0.68, -size * 0.02);
  ctx.lineTo(0, size * 0.08);
  ctx.lineTo(-size * 0.03, size * 0.7);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = 'rgba(25,42,27,.62)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.66);
  ctx.lineTo(0, size * 0.69);
  ctx.moveTo(-size * 0.65, -size * 0.03);
  ctx.quadraticCurveTo(0, -size * 0.17, size * 0.65, -size * 0.03);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,220,.18)';
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  ctx.moveTo(-size * 0.55, -size * 0.12);
  ctx.lineTo(size * 0.38, size * 0.42);
  ctx.stroke();

  ctx.restore();
}

function drawKite() {
  for (const g of ghosts) {
    if (g.life <= 0) continue;
    const p = screenPoint(g.x, g.y);
    drawKiteShape(p.x, p.y, g.a, g.b, Math.max(0, g.life) * 0.12, 1.35);
  }

  const p = screenPoint(kite.x, kite.y);
  drawKiteShape(p.x, p.y, kite.bodyAngle, kite.bank, 1, kite.moving ? 0.1 : 0);
}

function updateGhosts(dt) {
  for (const g of ghosts) g.life -= dt * 4.2;
  while (ghosts.length && ghosts[ghosts.length - 1].life <= 0) ghosts.pop();
}

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.033);
  last = now;

  updateKite(dt);
  updateTail(dt, now);
  updateGhosts(dt);

  drawSky();
  drawTail(now);
  drawKite();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
