const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');

let dpr = Math.min(window.devicePixelRatio || 1, 2);
let W = innerWidth;
let H = innerHeight;
const keys = new Set();

const state = {
  t: 0,
  manualUntil: 0,
  kite: {
    x: W * 0.53,
    y: H * 0.23,
    vx: 0,
    vy: 0,
    angle: 0,
    prevX: W * 0.53,
    prevY: H * 0.23,
  },
  tail: [],
  ghosts: [],
};

const TAIL_NODES = 78;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(t) {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
}

function resize() {
  W = innerWidth;
  H = innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  state.kite.x = clamp(state.kite.x, 35, W - 35);
  state.kite.y = clamp(state.kite.y, 35, H * 0.64);
  resetTail();
}

function resetTail() {
  const k = state.kite;
  const seg = tailSegmentLength();
  state.tail = Array.from({ length: TAIL_NODES }, (_, i) => {
    const x = k.x - Math.sin(k.angle) * i * seg * 0.05;
    const y = k.y + 10 + i * seg;
    return { x, y, px: x, py: y };
  });
}

function tailSegmentLength() {
  return clamp(H * 0.0064, 4.3, 7.5);
}

addEventListener('resize', resize);
addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  keys.add(key);
  if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's'].includes(key)) {
    state.manualUntil = state.t + 2.6;
    e.preventDefault();
  }
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
resize();

function drawSky() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0651b4');
  sky.addColorStop(0.46, '#0874dc');
  sky.addColorStop(0.82, '#19a4ef');
  sky.addColorStop(1, '#8bd5f2');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.035;
  for (let i = 0; i < 75; i++) {
    const x = (i * 97.13) % W;
    const y = (i * 61.73) % H;
    ctx.fillStyle = i % 3 ? '#ffffff' : '#002f85';
    ctx.fillRect(x, y, 1.3, 1.3);
  }
  ctx.restore();

  const horizonY = H * 0.93;
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#d3e5e9';
  ctx.fillRect(0, horizonY, W, H - horizonY);
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#5c7180';
  for (let i = 0; i < 24; i++) {
    const bw = 12 + ((i * 11) % 30);
    const bh = 4 + ((i * 17) % 15);
    const bx = (i * 83) % (W + 80) - 30;
    ctx.fillRect(bx, horizonY - bh, bw, bh);
  }
  ctx.restore();
}

function referenceTarget(t) {
  const p = ((t % 8.8) + 8.8) % 8.8;
  let x;
  let y;

  if (p < 1.55) {
    const u = smoothstep(p / 1.55);
    x = lerp(0.56, 0.46, u) + Math.sin(u * Math.PI) * 0.015;
    y = lerp(0.28, 0.205, u);
  } else if (p < 3.15) {
    const u = smoothstep((p - 1.55) / 1.6);
    x = lerp(0.46, 0.57, u) + Math.sin(u * Math.PI) * 0.045;
    y = 0.205 + Math.sin(u * Math.PI) * 0.085;
  } else if (p < 4.75) {
    const u = smoothstep((p - 3.15) / 1.6);
    x = lerp(0.57, 0.47, u) - Math.sin(u * Math.PI) * 0.025;
    y = lerp(0.29, 0.215, u) - Math.sin(u * Math.PI) * 0.02;
  } else if (p < 6.1) {
    const u = smoothstep((p - 4.75) / 1.35);
    x = lerp(0.47, 0.54, u) + Math.sin(u * Math.PI * 1.2) * 0.018;
    y = lerp(0.215, 0.105, u);
  } else {
    const u = smoothstep((p - 6.1) / 2.7);
    x = 0.54 + Math.sin(p * 1.55) * 0.008 * (1 - u);
    y = lerp(0.105, 0.16, u);
  }

  x += Math.sin(t * 1.37) * 0.006 + Math.sin(t * 3.81 + 0.7) * 0.003;
  y += Math.sin(t * 1.91 + 1.6) * 0.004;
  return { x: x * W, y: y * H };
}

function manualVector() {
  let x = 0;
  let y = 0;
  if (keys.has('arrowleft') || keys.has('a')) x -= 1;
  if (keys.has('arrowright') || keys.has('d')) x += 1;
  if (keys.has('arrowup') || keys.has('w')) y -= 1;
  if (keys.has('arrowdown') || keys.has('s')) y += 1;
  const m = Math.hypot(x, y) || 1;
  return { x: x / m, y: y / m, active: x !== 0 || y !== 0 };
}

function updateKite(dt) {
  const k = state.kite;
  k.prevX = k.x;
  k.prevY = k.y;

  const manual = manualVector();
  const demo = state.t > state.manualUntil && !manual.active;
  let ax = 0;
  let ay = 0;

  if (demo) {
    const target = referenceTarget(state.t);
    const dx = target.x - k.x;
    const dy = target.y - k.y;
    ax += dx * 5.4 - k.vx * 2.5;
    ay += dy * 5.4 - k.vy * 2.5;
  } else {
    const accel = Math.min(W, H) * 2.1;
    ax += manual.x * accel;
    ay += manual.y * accel;
    ax += (W * 0.52 - k.x) * 0.42;
    ay += (H * 0.25 - k.y) * 0.28;
    ax -= k.vx * 1.4;
    ay -= k.vy * 1.4;
  }

  ax += Math.sin(state.t * 0.73) * 18 + Math.sin(state.t * 2.37 + 0.8) * 7;
  ay += Math.sin(state.t * 1.11 + 2.1) * 7;

  k.vx += ax * dt;
  k.vy += ay * dt;

  const maxSpeed = Math.min(W, H) * 0.52;
  const speed = Math.hypot(k.vx, k.vy);
  if (speed > maxSpeed) {
    k.vx *= maxSpeed / speed;
    k.vy *= maxSpeed / speed;
  }

  k.x += k.vx * dt;
  k.y += k.vy * dt;

  const margin = 26;
  k.x = clamp(k.x, margin, W - margin);
  k.y = clamp(k.y, margin, H * 0.66);

  const targetAngle = Math.atan2(k.vy, k.vx) + Math.PI / 2;
  let delta = targetAngle - k.angle;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;

  const turnResponse = clamp(5.8 + speed * 0.014, 5.8, 13);
  k.angle += delta * Math.min(1, turnResponse * dt);
  k.angle += Math.sin(state.t * 7.2) * 0.0017;

  state.ghosts.unshift({ x: k.x, y: k.y, angle: k.angle });
  if (state.ghosts.length > 3) state.ghosts.length = 3;
}

function tailAnchor() {
  const k = state.kite;
  const size = kiteSize();
  const localY = size * 0.72;
  const c = Math.cos(k.angle);
  const s = Math.sin(k.angle);
  return {
    x: k.x - localY * s,
    y: k.y + localY * c,
  };
}

function updateTail(dt) {
  if (!state.tail.length) resetTail();
  const tail = state.tail;
  const anchor = tailAnchor();
  const seg = tailSegmentLength();
  const dt2 = dt * dt;
  const k = state.kite;

  tail[0].x = anchor.x;
  tail[0].y = anchor.y;
  tail[0].px = anchor.x;
  tail[0].py = anchor.y;

  for (let i = 1; i < tail.length; i++) {
    const p = tail[i];
    const vx = (p.x - p.px) * 0.987;
    const vy = (p.y - p.py) * 0.987;
    p.px = p.x;
    p.py = p.y;

    const depth = i / (tail.length - 1);
    const gust =
      Math.sin(state.t * 1.83 + i * 0.17) * (7 + depth * 14) +
      Math.sin(state.t * 3.19 - i * 0.11) * 4;
    const airLagX = -k.vx * (0.18 + depth * 0.12);
    const airLagY = -k.vy * (0.06 + depth * 0.05);
    const gravity = 78 + depth * 26;

    p.x += vx + (gust + airLagX) * dt2;
    p.y += vy + (gravity + airLagY) * dt2;
  }

  for (let iter = 0; iter < 9; iter++) {
    tail[0].x = anchor.x;
    tail[0].y = anchor.y;
    for (let i = 1; i < tail.length; i++) {
      const a = tail[i - 1];
      const b = tail[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.0001;
      const error = (dist - seg) / dist;
      if (i === 1) {
        b.x -= dx * error;
        b.y -= dy * error;
      } else {
        const correction = 0.5 * error;
        a.x += dx * correction;
        a.y += dy * correction;
        b.x -= dx * correction;
        b.y -= dy * correction;
      }
    }
  }
}

function kiteSize() {
  return clamp(Math.min(W, H) * 0.042, 18, 38);
}

function kitePath(size) {
  const top = -size * 0.67;
  const side = size * 0.54;
  const shoulder = -size * 0.18;
  const bottom = size * 0.69;
  ctx.beginPath();
  ctx.moveTo(0, top);
  ctx.lineTo(side, shoulder);
  ctx.lineTo(0, bottom);
  ctx.lineTo(-side, shoulder);
  ctx.closePath();
}

function drawKiteBody(x, y, angle, alpha = 1) {
  const size = kiteSize();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;

  if (alpha === 1) {
    ctx.shadowColor = 'rgba(238,255,205,.28)';
    ctx.shadowBlur = size * 0.22;
  }

  kitePath(size);
  const paper = ctx.createLinearGradient(-size * 0.4, -size * 0.55, size * 0.35, size * 0.55);
  paper.addColorStop(0, '#168f4c');
  paper.addColorStop(0.46, '#57b940');
  paper.addColorStop(1, '#0a663c');
  ctx.fillStyle = paper;
  ctx.fill();
  ctx.shadowColor = 'transparent';

  ctx.fillStyle = 'rgba(227,239,45,.95)';
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.49);
  ctx.lineTo(size * 0.34, -size * 0.16);
  ctx.lineTo(0, size * 0.49);
  ctx.lineTo(-size * 0.34, -size * 0.16);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(17,86,46,.48)';
  ctx.beginPath();
  ctx.moveTo(-size * 0.52, -size * 0.18);
  ctx.lineTo(0, -size * 0.05);
  ctx.lineTo(-size * 0.06, size * 0.66);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(22,45,27,.70)';
  ctx.lineWidth = Math.max(0.85, size * 0.045);
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.63);
  ctx.lineTo(0, size * 0.65);
  ctx.moveTo(-size * 0.48, -size * 0.17);
  ctx.quadraticCurveTo(0, -size * 0.33, size * 0.48, -size * 0.17);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(235,255,204,.45)';
  ctx.lineWidth = 0.7;
  kitePath(size);
  ctx.stroke();
  ctx.restore();
}

function drawTail() {
  const tail = state.tail;
  if (tail.length < 2) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(245,247,229,.54)';
  ctx.lineWidth = clamp(Math.min(W, H) * 0.00215, 1.0, 2.15);
  ctx.shadowColor = 'rgba(230,245,255,.18)';
  ctx.shadowBlur = 2;
  ctx.beginPath();
  ctx.moveTo(tail[0].x, tail[0].y);
  for (let i = 1; i < tail.length; i++) {
    const p0 = tail[i - 1];
    const p1 = tail[i];
    const mx = (p0.x + p1.x) * 0.5;
    const my = (p0.y + p1.y) * 0.5;
    ctx.quadraticCurveTo(p0.x, p0.y, mx, my);
  }
  ctx.lineTo(tail[tail.length - 1].x, tail[tail.length - 1].y);
  ctx.stroke();

  for (let i = 5; i < tail.length - 1; i += 3) {
    const p = tail[i];
    const q = tail[i + 1];
    const angle = Math.atan2(q.y - p.y, q.x - p.x);
    const depth = i / tail.length;
    const length = clamp(5 + depth * 5, 5, 10);
    const width = clamp(1.8 + depth * 1.2, 1.8, 3.2);

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle + Math.sin(state.t * 6.3 + i * 0.77) * 0.48);
    ctx.globalAlpha = 0.36 + (i % 4) * 0.09;
    ctx.fillStyle = i % 2 ? '#f7f5e8' : '#e9edf0';
    ctx.beginPath();
    ctx.moveTo(-length * 0.45, -width);
    ctx.quadraticCurveTo(0, -width * 1.4, length * 0.55, 0);
    ctx.quadraticCurveTo(0, width * 1.4, -length * 0.45, width);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawFlyingLine() {
  const k = state.kite;
  const endX = W * 0.44;
  const endY = H * 1.08;
  ctx.save();
  ctx.strokeStyle = 'rgba(234,242,239,.20)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(k.x, k.y + kiteSize() * 0.08);
  ctx.bezierCurveTo(k.x - 12, k.y + H * 0.18, endX + 45, H * 0.79, endX, endY);
  ctx.stroke();
  ctx.restore();
}

function drawScene() {
  drawSky();
  drawFlyingLine();
  drawTail();

  for (let i = state.ghosts.length - 1; i >= 1; i--) {
    const g = state.ghosts[i];
    drawKiteBody(g.x, g.y, g.angle, 0.05 + i * 0.025);
  }
  drawKiteBody(state.kite.x, state.kite.y, state.kite.angle, 1);
}

function update(dt) {
  state.t += dt;
  updateKite(dt);
  updateTail(dt);
}

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;
  update(dt);
  drawScene();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
