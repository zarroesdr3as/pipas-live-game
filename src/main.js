const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');

let dpr = Math.min(window.devicePixelRatio || 1, 2);
const keys = new Set();
const kite = {
  x: innerWidth * 0.58,
  y: innerHeight * 0.34,
  vx: 0,
  vy: 0,
  angle: -0.035,
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
addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
resize();

function drawSky(now) {
  const g = ctx.createLinearGradient(0, 0, 0, innerHeight);
  g.addColorStop(0, '#4c7eae');
  g.addColorStop(0.5, '#6f9fca');
  g.addColorStop(1, '#b8d2e4');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, innerWidth, innerHeight);

  const haze = ctx.createRadialGradient(
    innerWidth * 0.78,
    innerHeight * 0.13,
    30,
    innerWidth * 0.78,
    innerHeight * 0.13,
    innerWidth * 0.55,
  );
  haze.addColorStop(0, 'rgba(255,255,255,.18)');
  haze.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, innerWidth, innerHeight);

  ctx.globalAlpha = 0.055;
  for (let i = 0; i < 38; i++) {
    const x = (i * 127 + now * 0.0027) % (innerWidth + 220) - 110;
    const y = 40 + ((i * 89) % Math.max(120, innerHeight - 80));
    ctx.fillStyle = i % 3 === 0 ? '#ffffff' : '#0d3555';
    ctx.fillRect(x, y, 1.1, 1.1);
  }
  ctx.globalAlpha = 1;
}

function kitePath(c) {
  c.beginPath();
  c.moveTo(-92, -66);
  c.quadraticCurveTo(0, -78, 92, -66);
  c.lineTo(76, 18);
  c.quadraticCurveTo(45, 72, 0, 118);
  c.quadraticCurveTo(-45, 72, -76, 18);
  c.closePath();
}

function fillPoly(points, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPatchwork() {
  const red = '#b82831';
  const darkRed = '#7d1f27';
  const yellow = '#f0ec00';
  const black = '#17191a';
  const warmBlack = '#24201d';

  ctx.fillStyle = red;
  kitePath(ctx);
  ctx.fill();

  fillPoly([[-92, -66], [-24, -67], [-8, -25], [-76, -20]], warmBlack);
  fillPoly([[24, -67], [92, -66], [76, -20], [8, -25]], darkRed);

  fillPoly([[0, -67], [31, -26], [0, 8], [-31, -26]], yellow);
  fillPoly([[0, -67], [31, -26], [0, -26]], '#fff300', 0.78);
  fillPoly([[0, 8], [31, -26], [0, -26]], '#d5cf00', 0.7);
  fillPoly([[0, -67], [-31, -26], [0, -26]], '#eee600', 0.82);

  fillPoly([[-76, -20], [-31, -26], [-40, 19], [-72, 25]], yellow);
  fillPoly([[31, -26], [76, -20], [72, 25], [40, 19]], '#c9c300');

  fillPoly([[-31, -26], [0, 8], [-39, 18], [-40, 19]], black);
  fillPoly([[31, -26], [40, 19], [39, 18], [0, 8]], black);
  fillPoly([[-39, 18], [0, 8], [-23, 48], [-56, 30]], '#201c1a');
  fillPoly([[0, 8], [39, 18], [56, 30], [23, 48]], '#201c1a');

  fillPoly([[-76, 18], [-40, 19], [-56, 30], [-71, 50]], '#f4ef00');
  fillPoly([[40, 19], [76, 18], [71, 50], [56, 30]], '#c8c100');
  fillPoly([[-76, 18], [-71, 50], [-36, 61], [-56, 30]], '#d4ce00');
  fillPoly([[76, 18], [56, 30], [36, 61], [71, 50]], '#b7b000');

  fillPoly([[0, 8], [-39, 18], [-23, 48], [0, 35]], red);
  fillPoly([[0, 8], [39, 18], [23, 48], [0, 35]], black);
  fillPoly([[0, 35], [-23, 48], [-36, 61], [0, 70]], black);
  fillPoly([[0, 35], [23, 48], [36, 61], [0, 70]], red);
  fillPoly([[0, 70], [-36, 61], [-16, 92], [0, 118]], '#a1222a');
  fillPoly([[0, 70], [36, 61], [16, 92], [0, 118]], '#d7cf00');

  fillPoly([[-71, 50], [-36, 61], [-16, 92], [-37, 80]], '#f1ea00');
  fillPoly([[71, 50], [37, 80], [16, 92], [36, 61]], '#d0c800');
  fillPoly([[-36, 61], [0, 70], [-16, 92]], '#231f1d');
  fillPoly([[36, 61], [16, 92], [0, 70]], '#211d1b');

  fillPoly([[-92, -66], [92, -66], [89, -61], [-88, -60]], '#ffffff', 0.12);
  fillPoly([[-75, 17], [75, 17], [73, 22], [-74, 23]], '#000000', 0.12);
}

function drawPaperTexture(t) {
  ctx.save();
  kitePath(ctx);
  ctx.clip();

  const gleam = ctx.createLinearGradient(-95, -70, 80, 105);
  gleam.addColorStop(0, 'rgba(255,255,255,.20)');
  gleam.addColorStop(0.24, 'rgba(255,255,255,.02)');
  gleam.addColorStop(0.62, 'rgba(0,0,0,.10)');
  gleam.addColorStop(1, 'rgba(255,255,255,.08)');
  ctx.fillStyle = gleam;
  ctx.fillRect(-110, -90, 220, 230);

  const folds = [
    [-72, -48, -28, -12, 18, 55],
    [67, -46, 35, -8, -8, 72],
    [-54, 13, -9, 30, 27, 91],
    [52, 17, 11, 38, -18, 101],
    [-8, -56, 3, -3, -2, 105],
  ];

  folds.forEach((f, index) => {
    ctx.strokeStyle = index % 2 ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.10)';
    ctx.lineWidth = index === 4 ? 1.25 : 0.8;
    ctx.beginPath();
    ctx.moveTo(f[0], f[1]);
    ctx.quadraticCurveTo(f[2], f[3], f[4], f[5]);
    ctx.stroke();
  });

  for (let i = 0; i < 150; i++) {
    const x = ((i * 47.17) % 190) - 95;
    const y = ((i * 83.71) % 190) - 72;
    const a = 0.025 + ((i * 13) % 17) / 900;
    ctx.fillStyle = i % 4 === 0 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
    ctx.fillRect(x, y, 0.75 + (i % 3) * 0.35, 0.75);
  }

  const lightX = Math.sin(t * 0.6) * 20;
  const reflection = ctx.createRadialGradient(lightX - 28, -25, 2, lightX - 28, -25, 85);
  reflection.addColorStop(0, 'rgba(255,255,255,.08)');
  reflection.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = reflection;
  ctx.fillRect(-110, -90, 220, 230);

  ctx.restore();
}

function drawFrame() {
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(76,52,28,.72)';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(0, -95);
  ctx.lineTo(0, 115);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(218,190,132,.78)';
  ctx.lineWidth = 1.15;
  ctx.beginPath();
  ctx.moveTo(-0.75, -94);
  ctx.lineTo(-0.75, 114);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(76,52,28,.74)';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(-88, -65);
  ctx.quadraticCurveTo(0, -77, 88, -65);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(221,193,139,.72)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-86, -66);
  ctx.quadraticCurveTo(0, -75.5, 86, -66);
  ctx.stroke();
}

function drawBridle() {
  ctx.save();
  ctx.strokeStyle = 'rgba(239,241,235,.88)';
  ctx.lineWidth = 1.15;
  ctx.shadowColor = 'rgba(0,0,0,.18)';
  ctx.shadowBlur = 1.5;

  ctx.beginPath();
  ctx.moveTo(-87, -64);
  ctx.quadraticCurveTo(-47, -105, -5, -105);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(87, -64);
  ctx.quadraticCurveTo(47, -105, 5, -105);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-5, -105);
  ctx.quadraticCurveTo(0, -112, 5, -105);
  ctx.stroke();
  ctx.restore();
}

function drawKiteBody(t) {
  ctx.save();
  ctx.shadowColor = 'rgba(6,19,28,.34)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetX = 6;
  ctx.shadowOffsetY = 11;
  drawPatchwork();
  ctx.shadowColor = 'transparent';

  drawPaperTexture(t);

  ctx.strokeStyle = 'rgba(49,35,27,.74)';
  ctx.lineWidth = 1.8;
  kitePath(ctx);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,.22)';
  ctx.lineWidth = 0.7;
  ctx.translate(-0.6, -0.7);
  kitePath(ctx);
  ctx.stroke();
  ctx.translate(0.6, 0.7);

  drawFrame();
  drawBridle();
  ctx.restore();
}

function tailPoint(index, strand, t) {
  const y = 110 + index * 11.8;
  const spread = 4 + index * 1.1;
  const phase = strand * 1.77 + index * 0.39;
  const wind = Math.sin(t * (1.7 + strand * 0.025) + phase);
  const curl = Math.sin(t * 2.2 + index * 0.76 + strand) * 0.55;
  const x = (strand - 4) * 2.3 + wind * spread + curl * index * 0.5;
  return [x, y];
}

function drawMessyTail(t) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let s = 0; s < 9; s++) {
    const count = 10 + (s % 4) * 2;
    const hue = s % 3 === 0 ? '#851523' : s % 2 ? '#bb2634' : '#cf3640';
    ctx.strokeStyle = hue;
    ctx.globalAlpha = 0.72 + (s % 3) * 0.08;
    ctx.lineWidth = 1.35 + (s % 3) * 0.45;
    ctx.beginPath();

    for (let i = 0; i < count; i++) {
      const [x, y] = tailPoint(i, s, t);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const [px, py] = tailPoint(i - 1, s, t);
        const bend = Math.sin(t * 2.8 + s * 0.9 + i) * 8;
        ctx.quadraticCurveTo((px + x) / 2 + bend, (py + y) / 2, x, y);
      }
    }
    ctx.stroke();

    for (let i = 3; i < count; i += 4) {
      const [x, y] = tailPoint(i, s, t);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(t * 3.1 + s + i) * 1.2);
      ctx.fillStyle = s % 2 ? 'rgba(218,45,59,.78)' : 'rgba(139,21,35,.8)';
      ctx.beginPath();
      ctx.moveTo(-6, -1.4);
      ctx.lineTo(7 + (i % 3) * 2, -0.6);
      ctx.lineTo(5, 1.8);
      ctx.lineTo(-5, 1.2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  for (let s = 0; s < 3; s++) {
    ctx.strokeStyle = s === 1 ? 'rgba(106,17,30,.84)' : 'rgba(190,36,48,.82)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo((s - 1) * 8, 114);
    ctx.bezierCurveTo(
      -15 + s * 26 + Math.sin(t * 1.9 + s) * 30,
      160,
      38 - s * 26 + Math.sin(t * 1.35 + s) * 42,
      222,
      (s - 1) * 28 + Math.sin(t + s) * 44,
      272 + s * 10,
    );
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawFlyingString(worldX, worldY, t) {
  const endX = innerWidth * 0.47;
  const endY = innerHeight + 60;
  ctx.save();
  ctx.strokeStyle = 'rgba(245,245,238,.78)';
  ctx.lineWidth = 0.9;
  ctx.shadowColor = 'rgba(0,0,0,.18)';
  ctx.shadowBlur = 1;
  ctx.beginPath();
  ctx.moveTo(worldX, worldY);
  ctx.bezierCurveTo(
    worldX - 48 + Math.sin(t * 0.8) * 12,
    worldY + 145,
    endX + 85,
    endY - 185,
    endX,
    endY,
  );
  ctx.stroke();
  ctx.restore();
}

function drawKite() {
  const bob = Math.sin(kite.t * 1.7) * 2.6;
  const flutter = Math.sin(kite.t * 4.6) * 0.008;

  ctx.save();
  ctx.translate(kite.x, kite.y + bob);
  ctx.rotate(kite.angle + flutter);
  ctx.scale(1.04, 1.04);
  drawKiteBody(kite.t);
  drawMessyTail(kite.t);
  ctx.restore();

  drawFlyingString(kite.x, kite.y + 15, kite.t);
}

function update(dt) {
  const accel = 600;
  if (keys.has('arrowleft') || keys.has('a')) kite.vx -= accel * dt;
  if (keys.has('arrowright') || keys.has('d')) kite.vx += accel * dt;
  if (keys.has('arrowup') || keys.has('w')) kite.vy -= accel * dt;
  if (keys.has('arrowdown') || keys.has('s')) kite.vy += accel * dt;

  const wind = Math.sin(kite.t * 0.74) * 13 + Math.sin(kite.t * 1.9) * 4;
  kite.vx += wind * dt;
  kite.vy += Math.sin(kite.t * 1.55) * 5 * dt;

  const damping = Math.pow(0.085, dt);
  kite.vx *= damping;
  kite.vy *= damping;

  kite.x += kite.vx * dt;
  kite.y += kite.vy * dt;
  kite.angle += ((kite.vx * 0.0014) - kite.angle) * Math.min(1, dt * 4.2);

  const margin = 145;
  kite.x = Math.max(margin, Math.min(innerWidth - margin, kite.x));
  kite.y = Math.max(margin, Math.min(innerHeight * 0.62, kite.y));
  kite.t += dt;
}

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.033);
  last = now;
  update(dt);
  drawSky(now);
  drawKite();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
