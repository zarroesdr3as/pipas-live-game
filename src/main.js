const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');

let w = innerWidth;
let h = innerHeight;
let dpr = Math.min(devicePixelRatio || 1, 2);
const keys = new Set();
const flightStartedAt = performance.now();

const kite = {
  x: 0,
  y: 0,
  vx: 40,
  vy: -120,
  bodyAngle: 0,
  bank: 0,
  heading: -Math.PI / 2,
  manualUntil: 0,
};

const camera = { x: 0, y: 0 };
const tail = [];
const ghostKites = [];
const grain = Array.from({ length: 360 }, (_, i) => ({
  x: (Math.sin(i * 91.713) * 43758.5453) % 1,
  y: (Math.sin((i + 41) * 57.19) * 24634.6345) % 1,
  a: 0.008 + (i % 7) * 0.0015,
}));

const TAIL_POINTS = 92;
const TAIL_SEGMENT = 4.35;

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
  keys.add(e.key.toLowerCase());
  if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's'].includes(e.key.toLowerCase())) {
    kite.manualUntil = performance.now() + 2600;
  }
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
resize();

function screenPoint(x, y, now) {
  const shakeX = Math.sin(now * 0.0019) * 1.15 + Math.sin(now * 0.0047) * 0.45;
  const shakeY = Math.sin(now * 0.00145 + 1.3) * 0.85;
  return {
    x: x - camera.x + w * 0.5 + shakeX,
    y: y - camera.y + h * 0.31 + shakeY,
  };
}

function tailAnchor() {
  const speed = Math.hypot(kite.vx, kite.vy) || 1;
  const dx = kite.vx / speed;
  const dy = kite.vy / speed;
  return {
    x: kite.x - dx * 10.5,
    y: kite.y - dy * 10.5,
  };
}

function resetTail() {
  tail.length = 0;
  const a = tailAnchor();
  const speed = Math.hypot(kite.vx, kite.vy) || 1;
  const dx = -kite.vx / speed;
  const dy = -kite.vy / speed;
  for (let i = 0; i < TAIL_POINTS; i++) {
    const x = a.x + dx * i * TAIL_SEGMENT;
    const y = a.y + dy * i * TAIL_SEGMENT;
    tail.push({ x, y, px: x, py: y });
  }
}
resetTail();

function drawSky(now) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0758b5');
  g.addColorStop(0.48, '#0872d2');
  g.addColorStop(1, '#10a4ec');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * 0.63, h * 0.86, 0, w * 0.63, h * 0.86, h * 0.75);
  glow.addColorStop(0, 'rgba(116,220,255,.18)');
  glow.addColorStop(1, 'rgba(116,220,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const vignette = ctx.createRadialGradient(w * 0.5, h * 0.47, Math.min(w, h) * 0.24, w * 0.5, h * 0.47, Math.max(w, h) * 0.73);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,23,72,.15)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  for (let i = 0; i < grain.length; i++) {
    const p = grain[i];
    const x = ((p.x + 1) % 1) * w;
    const y = ((p.y + 1) % 1) * h;
    ctx.fillStyle = `rgba(255,255,255,${p.a})`;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();
}

function automaticTarget(t) {
  const c = t % 8.8;
  if (c < 1.15) return { vx: -145, vy: -68 };
  if (c < 2.25) return { vx: 175, vy: -10 };
  if (c < 3.25) return { vx: -105, vy: 150 };
  if (c < 4.45) return { vx: 88, vy: -205 };
  if (c < 5.55) return { vx: -165, vy: 55 };
  if (c < 6.45) return { vx: 18, vy: -285 };
  return { vx: 4, vy: -205 };
}

function manualTarget() {
  let x = 0;
  let y = 0;
  if (keys.has('arrowleft') || keys.has('a')) x -= 1;
  if (keys.has('arrowright') || keys.has('d')) x += 1;
  if (keys.has('arrowup') || keys.has('w')) y -= 1;
  if (keys.has('arrowdown') || keys.has('s')) y += 1;
  if (!x && !y) return null;
  const len = Math.hypot(x, y) || 1;
  return { vx: (x / len) * 235, vy: (y / len) * 235 };
}

function updateKite(dt, now) {
  const t = (now - flightStartedAt) / 1000;
  const manual = manualTarget();
  if (manual) kite.manualUntil = now + 2600;
  const target = manual || (now < kite.manualUntil ? { vx: kite.vx, vy: kite.vy } : automaticTarget(t));

  const gustX = Math.sin(t * 1.35) * 14 + Math.sin(t * 3.71 + 0.8) * 5.5;
  const gustY = Math.sin(t * 2.17 + 1.9) * 8;
  const response = 1 - Math.exp(-dt * 2.45);
  const oldVx = kite.vx;
  const oldVy = kite.vy;

  kite.vx += (target.vx + gustX - kite.vx) * response;
  kite.vy += (target.vy + gustY - kite.vy) * response;

  const speed = Math.hypot(kite.vx, kite.vy);
  if (speed > 310) {
    kite.vx *= 310 / speed;
    kite.vy *= 310 / speed;
  }

  kite.x += kite.vx * dt;
  kite.y += kite.vy * dt;

  const heading = Math.atan2(kite.vy, kite.vx);
  const headingDelta = wrapPi(heading - kite.heading);
  kite.heading += headingDelta * Math.min(1, dt * 8.5);
  const turnStrength = clamp(headingDelta / Math.max(dt, 1 / 120), -5.5, 5.5);
  const bankTarget = clamp(turnStrength * 0.12, -0.72, 0.72);
  kite.bank += (bankTarget - kite.bank) * Math.min(1, dt * 6.2);

  const bodyTarget = heading + Math.PI / 2;
  kite.bodyAngle += wrapPi(bodyTarget - kite.bodyAngle) * Math.min(1, dt * 10.5);

  const dv = Math.hypot(kite.vx - oldVx, kite.vy - oldVy);
  if (dv > 1.8 || ghostKites.length === 0) {
    ghostKites.unshift({ x: kite.x, y: kite.y, a: kite.bodyAngle, b: kite.bank, life: 1 });
    if (ghostKites.length > 7) ghostKites.pop();
  }

  for (const g of ghostKites) g.life -= dt * 3.6;
  while (ghostKites.length && ghostKites[ghostKites.length - 1].life <= 0) ghostKites.pop();

  const cameraFollow = 1 - Math.exp(-dt * 2.15);
  camera.x += (kite.x - camera.x) * cameraFollow;
  camera.y += (kite.y - camera.y) * cameraFollow;
}

function updateTail(dt, now) {
  const t = (now - flightStartedAt) / 1000;
  const anchor = tailAnchor();
  const dt2 = dt * dt;

  tail[0].x = anchor.x;
  tail[0].y = anchor.y;
  tail[0].px = anchor.x;
  tail[0].py = anchor.y;

  for (let i = 1; i < tail.length; i++) {
    const p = tail[i];
    const depth = i / (tail.length - 1);
    const vx = (p.x - p.px) * (0.992 - depth * 0.006);
    const vy = (p.y - p.py) * (0.992 - depth * 0.006);
    p.px = p.x;
    p.py = p.y;

    const turbulence =
      Math.sin(t * 3.2 + i * 0.36) * (6 + depth * 28) +
      Math.sin(t * 6.4 + i * 0.13 + 2.1) * (2 + depth * 10);
    const windX = Math.sin(t * 1.18 + i * 0.018) * 22 + turbulence;
    const windY = 11 + Math.sin(t * 2.05 + i * 0.05) * 8;

    p.x += vx + windX * dt2;
    p.y += vy + windY * dt2;
  }

  for (let iter = 0; iter < 9; iter++) {
    tail[0].x = anchor.x;
    tail[0].y = anchor.y;
    for (let i = 1; i < tail.length; i++) {
      const a = tail[i - 1];
      const b = tail[i];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 1;
      const error = (dist - TAIL_SEGMENT) / dist;
      const stiffness = 0.91;
      if (i === 1) {
        b.x -= dx * error * stiffness;
        b.y -= dy * error * stiffness;
      } else {
        const corrX = dx * error * stiffness * 0.5;
        const corrY = dy * error * stiffness * 0.5;
        a.x += corrX;
        a.y += corrY;
        b.x -= corrX;
        b.y -= corrY;
      }
    }
  }
}

function buildTailScreen(now) {
  return tail.map((p) => screenPoint(p.x, p.y, now));
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
  const pts = buildTailScreen(now);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.filter = 'blur(2.3px)';
  ctx.strokeStyle = 'rgba(225,243,255,.18)';
  ctx.lineWidth = 5.2;
  strokeSmooth(pts);
  ctx.stroke();

  ctx.filter = 'blur(.65px)';
  ctx.strokeStyle = 'rgba(239,247,250,.43)';
  ctx.lineWidth = 2.15;
  strokeSmooth(pts);
  ctx.stroke();

  ctx.filter = 'none';
  ctx.strokeStyle = 'rgba(242,247,247,.56)';
  ctx.lineWidth = 0.82;
  strokeSmooth(pts);
  ctx.stroke();

  for (let i = 7; i < pts.length - 2; i += 6) {
    const p = pts[i];
    const q = pts[i + 1];
    const angle = Math.atan2(q.y - p.y, q.x - p.x);
    const flutter = Math.sin(now * 0.009 + i * 0.91) * 0.75;
    const fade = 0.24 + 0.26 * (1 - i / pts.length);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle + flutter);
    ctx.fillStyle = `rgba(245,248,245,${fade})`;
    ctx.fillRect(-3.3, -1.05, 6.6, 2.1);
    ctx.restore();
  }
  ctx.restore();
}

function drawKiteShape(x, y, angle, bank, alpha = 1, blur = 0) {
  const size = 15.5;
  const perspective = 0.34 + Math.abs(Math.cos(bank)) * 0.66;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(perspective, 1);
  if (blur) ctx.filter = `blur(${blur}px)`;

  ctx.shadowColor = 'rgba(116,247,255,.38)';
  ctx.shadowBlur = 5.5;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.68);
  ctx.lineTo(size * 0.72, -size * 0.04);
  ctx.lineTo(0, size * 0.72);
  ctx.lineTo(-size * 0.72, -size * 0.04);
  ctx.closePath();
  const grad = ctx.createLinearGradient(-size, -size, size, size);
  grad.addColorStop(0, '#123e22');
  grad.addColorStop(0.28, '#2e8c38');
  grad.addColorStop(0.52, '#b4d92c');
  grad.addColorStop(0.71, '#4da940');
  grad.addColorStop(1, '#0a3c28');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(6,24,19,.9)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, -size * 0.62);
  ctx.lineTo(0, size * 0.64);
  ctx.moveTo(-size * 0.63, -size * 0.04);
  ctx.quadraticCurveTo(0, -size * 0.21, size * 0.63, -size * 0.04);
  ctx.strokeStyle = 'rgba(31,43,25,.72)';
  ctx.lineWidth = 0.72;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-size * 0.46, -size * 0.10);
  ctx.lineTo(0, size * 0.35);
  ctx.lineTo(size * 0.46, -size * 0.10);
  ctx.strokeStyle = 'rgba(219,235,87,.38)';
  ctx.lineWidth = 0.65;
  ctx.stroke();

  ctx.restore();
}

function drawGhosts(now) {
  for (let i = ghostKites.length - 1; i >= 0; i--) {
    const g = ghostKites[i];
    if (g.life <= 0) continue;
    const p = screenPoint(g.x, g.y, now);
    drawKiteShape(p.x, p.y, g.a, g.b, g.life * 0.055, 1.2);
  }
}

function drawFlyingLine(now) {
  const p = screenPoint(kite.x, kite.y, now);
  ctx.save();
  ctx.strokeStyle = 'rgba(242,246,245,.13)';
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y + 3);
  ctx.bezierCurveTo(p.x - 30, p.y + h * 0.22, w * 0.44, h * 0.78, w * 0.42, h + 35);
  ctx.stroke();
  ctx.restore();
}

function drawKite(now) {
  drawGhosts(now);
  const p = screenPoint(kite.x, kite.y, now);
  drawKiteShape(p.x, p.y, kite.bodyAngle, kite.bank, 1, 0);
}

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.028);
  last = now;

  updateKite(dt, now);
  updateTail(dt, now);
  drawSky(now);
  drawFlyingLine(now);
  drawTail(now);
  drawKite(now);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
