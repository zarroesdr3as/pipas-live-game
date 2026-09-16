const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');

let dpr = Math.min(window.devicePixelRatio || 1, 2);
const keys = new Set();
const kite = {
  x: innerWidth * 0.58,
  y: innerHeight * 0.34,
  vx: 0,
  vy: 0,
  angle: -0.06,
  t: 0,
};

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

addEventListener('resize', resize);
addEventListener('keydown', e => keys.add(e.key.toLowerCase()));
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
resize();

function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, innerHeight);
  g.addColorStop(0, '#4aaef5');
  g.addColorStop(0.65, '#9edbff');
  g.addColorStop(1, '#e7f5ff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, innerWidth, innerHeight);

  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 7; i++) {
    const x = ((i * 260 + performance.now() * 0.006) % (innerWidth + 340)) - 170;
    const y = 70 + (i % 3) * 95;
    ctx.beginPath();
    ctx.ellipse(x, y, 90, 24, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 75, y + 5, 70, 18, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawString(anchorX, anchorY) {
  const endX = innerWidth * 0.48;
  const endY = innerHeight + 40;
  ctx.save();
  ctx.strokeStyle = 'rgba(245,245,245,.9)';
  ctx.lineWidth = 1.15;
  ctx.beginPath();
  ctx.moveTo(anchorX, anchorY);
  ctx.bezierCurveTo(anchorX - 40, anchorY + 150, endX + 80, endY - 180, endX, endY);
  ctx.stroke();
  ctx.restore();
}

function drawTail(x, y, t) {
  ctx.save();
  ctx.lineCap = 'round';
  const points = [];
  for (let i = 0; i < 22; i++) {
    const py = y + i * 14;
    const px = x + Math.sin(t * 2.1 + i * 0.55) * (5 + i * 0.7);
    points.push([px, py]);
  }

  ctx.strokeStyle = 'rgba(55,45,45,.65)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  points.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
  ctx.stroke();

  const colors = ['#ef3340', '#ffd23f', '#0aa6a6', '#7a3cff'];
  for (let i = 2; i < points.length; i += 3) {
    const [px, py] = points[i];
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.sin(t * 2 + i) * 0.7);
    ctx.fillStyle = colors[(i / 3) % colors.length | 0];
    ctx.beginPath();
    ctx.moveTo(-8, -4);
    ctx.lineTo(8, 0);
    ctx.lineTo(-8, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawKite() {
  const size = 115;
  const top = -size * 0.95;
  const right = size * 0.72;
  const bottom = size * 1.05;
  const left = -size * 0.72;

  ctx.save();
  ctx.translate(kite.x, kite.y);
  ctx.rotate(kite.angle + Math.sin(kite.t * 2.4) * 0.025);

  ctx.shadowColor = 'rgba(0,0,0,.22)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 10;

  const paper = ctx.createLinearGradient(left, top, right, bottom);
  paper.addColorStop(0, 'rgba(255,227,72,.96)');
  paper.addColorStop(0.48, 'rgba(255,74,67,.94)');
  paper.addColorStop(1, 'rgba(16,126,224,.94)');

  ctx.beginPath();
  ctx.moveTo(0, top);
  ctx.lineTo(right, -size * 0.12);
  ctx.lineTo(0, bottom);
  ctx.lineTo(left, -size * 0.12);
  ctx.closePath();
  ctx.fillStyle = paper;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(0, top + 7);
  ctx.lineTo(right - 10, -size * 0.12);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = 'rgba(92,60,28,.82)';
  ctx.lineWidth = 3.1;
  ctx.beginPath();
  ctx.moveTo(0, top + 7);
  ctx.lineTo(0, bottom - 6);
  ctx.moveTo(left + 6, -size * 0.12);
  ctx.quadraticCurveTo(0, -size * 0.35, right - 6, -size * 0.12);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,.33)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, top + 8);
  ctx.lineTo(right - 8, -size * 0.12);
  ctx.lineTo(0, bottom - 8);
  ctx.lineTo(left + 8, -size * 0.12);
  ctx.closePath();
  ctx.stroke();

  ctx.restore();

  drawTail(kite.x, kite.y + size * 0.94, kite.t);
  drawString(kite.x, kite.y + 15);
}

function update(dt) {
  const accel = 620;
  if (keys.has('arrowleft') || keys.has('a')) kite.vx -= accel * dt;
  if (keys.has('arrowright') || keys.has('d')) kite.vx += accel * dt;
  if (keys.has('arrowup') || keys.has('w')) kite.vy -= accel * dt;
  if (keys.has('arrowdown') || keys.has('s')) kite.vy += accel * dt;

  const wind = Math.sin(kite.t * 0.75) * 16;
  kite.vx += wind * dt;
  kite.vy += Math.sin(kite.t * 1.7) * 6 * dt;

  const damping = Math.pow(0.08, dt);
  kite.vx *= damping;
  kite.vy *= damping;

  kite.x += kite.vx * dt;
  kite.y += kite.vy * dt;
  kite.angle += ((kite.vx * 0.0018) - kite.angle) * Math.min(1, dt * 4.5);

  const margin = 130;
  kite.x = Math.max(margin, Math.min(innerWidth - margin, kite.x));
  kite.y = Math.max(margin, Math.min(innerHeight * 0.7, kite.y));
  kite.t += dt;
}

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.033);
  last = now;
  update(dt);
  drawSky();
  drawKite();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
