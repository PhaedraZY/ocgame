/* ================= 零一 · Zero One — game.js（04 心跳节拍） =================
 * 单键节奏：心电尖峰到达判定环时按 空格 / 点击 / 触摸。
 * 计时一律 performance.now()；拍点预先生成；位置 = (拍点时间 − 当前时间) × 速度；
 * 判定只看时间差，与帧率无关。挂进 #gameMount，类名 .gm- 前缀。
 * ======================================================================== */
(() => {
'use strict';

const L = window.L01;
const mount = document.getElementById('gameMount');
if (!mount || !L) return;

/* ---------- 常量 ---------- */
const W = 900, H = 420;               // canvas 逻辑尺寸
const BASE = H * 0.55;                // 基线
const RING_X = 180;                   // 判定环横坐标
const AMP = 112;                      // R 波高度（px）
const RING_R = 62;
const RING_Y = BASE - AMP * 0.42;
const SPEED = 320;                    // 走纸速度 px/s（右 → 左）
const SHAPE_W = 0.62;                 // 一拍波形在时间轴上占的宽度（s），尖峰在相位 0.40
const DURATION = 45;                  // 一局（s），含准备
const PREP = 2;                       // 第一拍前的准备
const BPM0 = 72, BPM1 = 126;
const MIN_GAP = 0.26;                 // 相邻拍点最小间隔（s）
const WIN_P = 0.070, WIN_G = 0.140;   // PERFECT / GOOD
const WIN_EARLY = 0.220;              // 早按到这个范围内算 MISS；更远的按键忽略
const MAX_HP = 5;
const MONO = '"Share Tech Mono", ui-monospace, monospace';
const STEP = 1.5;                     // 波形采样步长（逻辑 px）
const NPTS = Math.ceil(W / STEP) + 1;
const RING_I = Math.round(RING_X / STEP);
const reduced = !!L.reduced;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const easeOut = k => 1 - Math.pow(1 - k, 3);
const ecg = typeof L.ecg === 'function' ? L.ecg : () => 0;

/* ---------- DOM ---------- */
mount.innerHTML = `
<div class="gm-root">
  <div class="gm-monitor" id="gmMonitor" data-state="idle">
    <div class="gm-bar" aria-hidden="true">
      <span>BED 01 · ECG II · 25 mm/s</span>
      <span class="gm-rec"><i></i>REC</span>
    </div>
    <div class="gm-screen" id="gmScreen">
      <canvas class="gm-canvas" id="gmCanvas" width="900" height="420" role="img" aria-label="心电监护仪：心跳节拍游戏画面"></canvas>

      <div class="gm-layer gm-start" id="gmStart">
        <div class="gm-card">
          <p class="gm-kicker">ECG RECORDER · 45 s</p>
          <h3 class="gm-title">帮他把今天的心跳记下来</h3>
          <ul class="gm-rules">
            <li>心电线从右往左流过来。</li>
            <li>尖峰碰到左边圆环的那一下，按 <kbd>空格</kbd> / 点击 / 触摸屏幕。</li>
            <li>错过一次，稳定度少一格；五格用完，信号就断了。</li>
          </ul>
          <button class="gm-btn" id="gmGo" type="button">开始记录 ▸</button>
        </div>
      </div>

      <div class="gm-layer gm-pause" id="gmPause" hidden>
        <div class="gm-card">
          <p class="gm-kicker">PAUSED</p>
          <p class="gm-title gm-title-s">已暂停</p>
          <p class="gm-sub">点击屏幕 / 按 <kbd>空格</kbd> 继续</p>
        </div>
      </div>

      <div class="gm-layer gm-result" id="gmResult" hidden>
        <div class="gm-card">
          <p class="gm-kicker" id="gmResKick">RECORD COMPLETE</p>
          <div class="gm-score"><b id="gmResScore">0</b><span class="gm-new" id="gmNew" hidden>NEW BEST</span></div>
          <ul class="gm-stats">
            <li><i>PERFECT</i><b id="gmNP">0</b></li>
            <li><i>GOOD</i><b id="gmNG">0</b></li>
            <li><i>MISS</i><b id="gmNM">0</b></li>
            <li><i>MAX COMBO</i><b id="gmNC">0</b></li>
          </ul>
          <p class="gm-rank" id="gmRank">记录潦草</p>
          <p class="gm-quote"><span id="gmQuote">「……没关系。再来。」</span><em>—— 01</em></p>
          <button class="gm-btn" id="gmAgain" type="button">再记一次</button>
        </div>
      </div>
    </div>
  </div>
  <div class="gm-under">
    <p class="gm-how">空格 / 点击 / 触摸 —— 尖峰碰到圆环的那一下按。</p>
    <p class="gm-best">BEST <b id="gmBest">0</b></p>
  </div>
</div>`;

const $ = id => document.getElementById(id);
const monitor = $('gmMonitor'), screen = $('gmScreen'), canvas = $('gmCanvas');
const layStart = $('gmStart'), layPause = $('gmPause'), layResult = $('gmResult');
const ctx = canvas.getContext('2d');

const store = L.store || { get: (k, d) => d, set() {} };
let best = Number(store.get('beat.best', 0)) || 0;
$('gmBest').textContent = best;

const chibi = new Image();
chibi.decoding = 'async';
chibi.src = 'assets/chibi.webp';

/* ---------- 尺寸 / DPR ---------- */
let scale = 1, ui = 1, lw = 1;
function resize() {
  const cssW = canvas.clientWidth || W;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  scale = (cssW * dpr) / W;
  const bw = Math.round(W * scale), bh = Math.round(H * scale);
  if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
  ui = clamp(620 / cssW, 1, 2);          // 窄屏放大 HUD 文字与小人
  lw = clamp(ui * 0.8, 1, 1.6);          // 窄屏线条加粗
  if (!raf) draw(performance.now());
}

/* ---------- 拍点生成 ---------- */
function bpmAt(t) {
  const k = clamp((t - PREP) / (DURATION - PREP - 1), 0, 1);
  return BPM0 + (BPM1 - BPM0) * Math.pow(k, 1.35);   // 前段平缓，后段加速
}
const mkBeat = t => ({ t, st: 0, err: 0, dead: false });   // st: 0 待判 1 PERFECT 2 GOOD 3 MISS

function genBeats() {
  const out = [];
  const END = DURATION - 0.6;
  let t = PREP, cool = 3;
  while (t <= END) {
    out.push(mkBeat(t));
    const iv = 60 / bpmAt(t);
    cool--;
    if (t > 10 && cool <= 0) {
      const r = Math.random();
      if (r < 0.16 && iv / 2 >= MIN_GAP && t + iv <= END) {
        out.push(mkBeat(t + iv / 2));            // 半拍连击：t, t+½, t+1
        cool = 3;
      } else if (r < 0.26 && t + 2 * iv <= END) {
        t += iv;                                   // 空一拍
        cool = 4;
      }
    }
    t += iv;
  }
  return out;
}

/* ---------- 状态 ---------- */
// state: idle | play | paused | resume | ending | result
let state = 'idle';
let S = null;
let fx = null;
let endTimer = 0;

function newRun() {
  return {
    beats: genBeats(), next: 0,
    t0: 0, paused: 0, pauseAt: 0, resumeAt: 0,
    score: 0, combo: 0, maxCombo: 0, hp: MAX_HP,
    np: 0, ng: 0, nm: 0,
    lost: false, comboAt: 0,
  };
}
function newFx() {
  return { ripples: [], parts: [], floats: [], shakeAt: -1e9, jumpAt: -1e9, haloAt: -1e9, haloK: 1, heartAt: -1e9, heartUpAt: -1e9, strayAt: -1e9 };
}
fx = newFx();

const inRun = () => state === 'play' || state === 'paused' || state === 'resume' || state === 'ending';
const gnow = now => (now - S.t0 - S.paused) / 1000;
function viewTime(now) {
  if (!S || !inRun()) return now / 1000;
  if (state === 'paused' || state === 'resume') return gnow(S.pauseAt);
  return gnow(now);
}
function setState(s) { state = s; monitor.dataset.state = s; }

/* ---------- 判定 ---------- */
function advanceNext() { while (S.next < S.beats.length && S.beats[S.next].st) S.next++; }

function autoMiss(gt) {
  for (let i = S.next; i < S.beats.length; i++) {
    const b = S.beats[i];
    if (b.t > gt - WIN_G) break;
    if (!b.st) { judge(b, 3, null); if (state !== 'play') return; }
  }
}

function press(now) {
  if (state !== 'play') return;
  const gt = gnow(now);
  autoMiss(gt);
  if (state !== 'play') return;
  let hit = null, bd = 1e9;
  for (let i = S.next; i < S.beats.length; i++) {
    const b = S.beats[i];
    if (b.t - gt > WIN_EARLY) break;
    if (b.st || b.dead) continue;
    const d = Math.abs(gt - b.t);
    if (d < bd) { bd = d; hit = b; }
  }
  if (!hit) { fx.strayAt = performance.now(); return; }      // 空按：不罚
  const err = gt - hit.t;
  if (bd <= WIN_P) judge(hit, 1, err);
  else if (bd <= WIN_G) judge(hit, 2, err);
  else judge(hit, 3, err);                                    // 太早
}

function judge(b, st, err) {
  const now = performance.now();
  b.st = st; b.err = err;
  if (st === 3) {
    S.nm++; S.combo = 0; S.hp--;
    L.sfx && L.sfx.low();
    fx.shakeAt = now; fx.heartAt = now;
    addFloat('MISS', 3, now);
    fx.ripples.push({ at: now, kind: 3 });
    if (S.hp <= 0) { advanceNext(); lose(); return; }
  } else {
    const perfect = st === 1;
    if (perfect) { S.np++; S.score += 3; } else { S.ng++; S.score += 1; }
    S.combo++; S.comboAt = now;
    if (S.combo > S.maxCombo) S.maxCombo = S.combo;
    if (S.combo % 10 === 0) { S.score += 5; addFloat('+5', 4, now); }
    if (S.combo % 20 === 0 && S.hp < MAX_HP) { S.hp++; fx.heartUpAt = now; }   // 稳定连击回一格
    L.sfx && L.sfx.beep(perfect ? 1040 : 880, 0.1);
    addFloat(perfect ? 'PERFECT' : 'GOOD', st, now);
    fx.ripples.push({ at: now, kind: st });
    burst(perfect ? (reduced ? 6 : 14) : (reduced ? 4 : 8), perfect);
    fx.jumpAt = now; fx.haloAt = now; fx.haloK = perfect ? 1 : 0.6;
  }
  advanceNext();
}

/* ---------- 一局的开始 / 结束 ---------- */
function show(el, on) { el.hidden = !on; }

function startGame() {
  if (L.audio) L.audio.init();
  clearTimeout(endTimer);
  S = newRun();
  fx = newFx();
  S.t0 = performance.now();
  setState('play');
  show(layStart, false); show(layPause, false); show(layResult, false);
  const ae = document.activeElement;
  if (ae && mount.contains(ae)) ae.blur();
  L.sfx && L.sfx.beep(660, 0.08);
  last = 0;
  kick();
}

function lose() {
  const gt = gnow(performance.now());
  S.lost = true;
  for (const b of S.beats) if (!b.st && b.t > gt - 0.05) b.dead = true;   // 之后变成一条平线
  setState('ending');
  endTimer = setTimeout(showResult, reduced ? 700 : 1400);
}

function complete() {
  setState('ending');
  endTimer = setTimeout(showResult, 650);
}

const TIERS = [
  [40, '记录潦草', '「……没关系。再来。」'],
  [90, '基本平稳', '「嗯。可以。」'],
  [150, '波形整齐', '「……还不错。」'],
  [Infinity, '完美记录', '「（心率 62。）……很厉害。」'],
];

function showResult() {
  setState('result');
  const sc = S.score;
  const tier = TIERS.find(t => sc < t[0]);
  const isNew = sc > best;
  if (isNew) { best = sc; store.set('beat.best', best); $('gmBest').textContent = best; }
  $('gmResKick').textContent = S.lost ? 'SIGNAL LOST · 信号中断' : 'RECORD COMPLETE · 记录完成';
  $('gmResScore').textContent = sc;
  $('gmNew').hidden = !isNew || sc === 0;
  $('gmNP').textContent = S.np;
  $('gmNG').textContent = S.ng;
  $('gmNM').textContent = S.nm;
  $('gmNC').textContent = S.maxCombo;
  $('gmRank').textContent = tier[1];
  $('gmQuote').textContent = tier[2];
  show(layResult, true);
  if (sc >= 150) { L.bump && L.bump(2); L.sfx && L.sfx.chime(); }
  else L.sfx && L.sfx.tick();
  if (playable) $('gmAgain').focus({ preventScroll: true });
  kick();
}

/* ---------- 暂停 / 继续（暂停时长从时间轴里扣掉） ---------- */
function pause() {
  if (state === 'resume') { setState('paused'); show(layPause, true); return; }   // pauseAt 不变
  if (state !== 'play') return;
  S.pauseAt = performance.now();
  setState('paused');
  show(layPause, true);
  draw(S.pauseAt);
}
function resume() {
  if (state !== 'paused') return;
  if (L.audio) L.audio.init();
  show(layPause, false);
  S.resumeAt = performance.now() + (reduced ? 500 : 1000);   // 冻结画面倒数一下再走
  setState('resume');
  last = 0;
  kick();
}

/* ---------- 特效 ---------- */
function addFloat(text, kind, now) { fx.floats.push({ text, kind, at: now }); }
function burst(n, perfect) {
  const now = performance.now();
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = 70 + Math.random() * (perfect ? 190 : 130);
    fx.parts.push({
      x: RING_X + Math.cos(a) * RING_R * 0.6, y: RING_Y + Math.sin(a) * RING_R * 0.6,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30,
      at: now, life: 450 + Math.random() * 350,
      s: 1.4 + Math.random() * 2, plus: Math.random() < 0.35, rot: Math.random() * 3,
    });
  }
}

/* ---------- 绘制 ---------- */
const px = new Float32Array(NPTS), py = new Float32Array(NPTS), pk = new Uint8Array(NPTS);
for (let i = 0; i < NPTS; i++) px[i] = Math.min(W, i * STEP);

// 基线手抖：随时间轴走（跟着线一起移动，不会原地闪）
const noise = t => 0.55 * (1.3 * Math.sin(t * 6.3) + 0.8 * Math.sin(t * 11.9 + 1.3) + 0.5 * Math.sin(t * 23.7 + 0.4) + 0.3 * Math.sin(t * 41.3 + 2.2));

// 线段样式：0–3 判定环左侧（已记录），4–7 右侧（未到）；低两位 = 对应拍点的判定
const STY_PAST = { g: 'rgba(111,183,245,.30)', c: '#a6d8ff', w: 2.6 };
const STY_FUT = { g: 'rgba(111,183,245,.09)', c: 'rgba(111,183,245,.42)', w: 2 };
const STY_P = { g: 'rgba(200,236,255,.55)', c: '#f4fbff', w: 3.2 };
const STY_G = { g: 'rgba(150,212,255,.45)', c: '#d2ecff', w: 3 };
const STY_M = { g: 'rgba(0,0,0,0)', c: 'rgba(125,134,158,.8)', w: 2.2 };
const STY = [STY_PAST, STY_P, STY_G, STY_M, STY_FUT, STY_P, STY_G, STY_M];

// 抖一点的手绘判定环
const ringPts = [[], []];
for (let i = 0; i <= 64; i++) {
  const a = (i / 64) * Math.PI * 2;
  ringPts[0].push(a, 1.6 * Math.sin(3 * a + 0.7) + 1.1 * Math.sin(5 * a + 2.1));
  ringPts[1].push(a, 1.4 * Math.sin(2 * a + 2.4) + 1.2 * Math.sin(7 * a + 0.3) + 1.8);
}

function idleBeats(t) {
  const out = [];
  for (let k = Math.floor(t - 1); k <= Math.ceil(t + 3); k++) out.push({ t: k + 0.5, st: 0, dead: false });
  return out;
}

function sampleLine(beats, t) {
  const n = beats.length;
  let lo = 0;
  for (let i = 0; i < NPTS; i++) {
    const tt = t + (px[i] - RING_X) / SPEED;
    while (lo < n && beats[lo].t < tt - 0.37) lo++;
    let v = 0, kb = null, kd = 0.05;
    for (let j = lo; j < n; j++) {
      const b = beats[j];
      const d = tt - b.t;
      if (d < -0.25) break;
      if (b.dead) continue;
      v += ecg(0.4 + d / SHAPE_W);
      const ad = d < 0 ? -d : d;
      if (ad < kd) { kd = ad; kb = b; }
    }
    py[i] = BASE - v * AMP + noise(tt);
    pk[i] = (px[i] <= RING_X ? 0 : 4) + (kb ? kb.st : 0);
  }
}

function strokeLine(glow) {
  let i = 0;
  while (i < NPTS) {
    const k = pk[i];
    let j = i;
    while (j + 1 < NPTS && pk[j + 1] === k) j++;
    const s = STY[k];
    const a = Math.max(0, i - 1);
    ctx.beginPath();
    ctx.moveTo(px[a], py[a]);
    for (let m = a + 1; m <= j; m++) ctx.lineTo(px[m], py[m]);
    if (glow) { ctx.strokeStyle = s.g; ctx.lineWidth = s.w * 3.4 * lw; }
    else { ctx.strokeStyle = s.c; ctx.lineWidth = s.w * lw; }
    ctx.stroke();
    i = j + 1;
  }
}

function heartPath(x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.55);
  ctx.bezierCurveTo(x - s * 1.05, y - s * 0.05, x - s * 0.55, y - s * 0.95, x, y - s * 0.38);
  ctx.bezierCurveTo(x + s * 0.55, y - s * 0.95, x + s * 1.05, y - s * 0.05, x, y + s * 0.55);
  ctx.closePath();
}

function ringPath(pts, r) {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i += 2) {
    const a = pts[i], rr = r + pts[i + 1];
    const x = RING_X + Math.cos(a) * rr, y = RING_Y + Math.sin(a) * rr;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
}

function nextPending() {
  if (!S || state === 'ending') return null;
  for (let i = S.next; i < S.beats.length; i++) {
    const b = S.beats[i];
    if (!b.st && !b.dead) return b;
  }
  return null;
}

let lastFx = 0;
function draw(now) {
  const t = viewTime(now);
  const running = inRun();
  const dts = lastFx ? clamp((now - lastFx) / 1000, 0, 0.05) : 0;
  lastFx = now;

  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 屏幕抖动（MISS）
  const sk = (now - fx.shakeAt) / 260;
  if (!reduced && sk >= 0 && sk < 1) {
    const a = 6 * (1 - sk);
    ctx.translate(Math.sin(now * 0.09) * a, Math.cos(now * 0.13) * a * 0.5);
  }

  // 判定环所在的竖向虚线
  ctx.save();
  ctx.setLineDash([4, 9]);
  ctx.strokeStyle = 'rgba(207,230,251,.13)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(RING_X, 48); ctx.lineTo(RING_X, H - 26); ctx.stroke();
  ctx.restore();

  // 心电线
  sampleLine(running ? S.beats : idleBeats(t), t);
  strokeLine(true);
  strokeLine(false);

  // 两端淡出（左边是"写完的纸"，右边是"还没来的"）
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  let gr = ctx.createLinearGradient(0, 0, 80, 0);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gr; ctx.fillRect(-10, 0, 90, H);
  gr = ctx.createLinearGradient(W - 70, 0, W, 0);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.9)');
  ctx.fillStyle = gr; ctx.fillRect(W - 70, 0, 80, H);
  ctx.restore();

  drawRing(now, t);
  drawPen();
  drawFx(now, dts);
  drawChibi(now);
  if (running) drawHud(now, t);
}

function drawRing(now, t) {
  let cue = 0;
  if (state === 'play' || state === 'paused' || state === 'resume') {
    const b = nextPending();
    if (b) cue = clamp(1 - Math.abs(b.t - t) / 0.32, 0, 1);
  }
  const stray = clamp(1 - (now - fx.strayAt) / 180, 0, 1);
  // 内部淡填充
  ctx.fillStyle = `rgba(111,183,245,${0.03 + cue * 0.05})`;
  ringPath(ringPts[0], RING_R); ctx.fill();
  // 手绘双线
  ctx.strokeStyle = `rgba(207,230,251,${0.38 + cue * 0.45 + stray * 0.2})`;
  ctx.lineWidth = (2 + cue * 1.3) * lw;
  ringPath(ringPts[0], RING_R); ctx.stroke();
  ctx.strokeStyle = `rgba(111,183,245,${0.18 + cue * 0.2})`;
  ctx.lineWidth = 1.2 * lw;
  ringPath(ringPts[1], RING_R); ctx.stroke();
  // 上下小刻度
  ctx.strokeStyle = 'rgba(207,230,251,.35)';
  ctx.lineWidth = 1.6 * lw;
  ctx.beginPath();
  ctx.moveTo(RING_X, RING_Y - RING_R - 10); ctx.lineTo(RING_X, RING_Y - RING_R - 3);
  ctx.moveTo(RING_X, RING_Y + RING_R + 3); ctx.lineTo(RING_X, RING_Y + RING_R + 10);
  ctx.stroke();
}

function drawPen() {
  // 记录笔头：在判定环处的发光小点
  const y = py[RING_I];
  const g = ctx.createRadialGradient(RING_X, y, 0, RING_X, y, 14);
  g.addColorStop(0, 'rgba(225,244,255,.95)');
  g.addColorStop(0.35, 'rgba(111,183,245,.45)');
  g.addColorStop(1, 'rgba(111,183,245,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(RING_X, y, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f4fbff';
  ctx.beginPath(); ctx.arc(RING_X, y, 2.6 * lw, 0, Math.PI * 2); ctx.fill();
}

function drawFx(now, dts) {
  // 扩散圈
  fx.ripples = fx.ripples.filter(r => now - r.at < 520);
  for (const r of fx.ripples) {
    const k = clamp((now - r.at) / 520, 0, 1);
    if (r.kind === 3) {
      ctx.strokeStyle = `rgba(140,150,175,${0.6 * (1 - k)})`;
      ctx.lineWidth = 2 * lw;
      ringPath(ringPts[0], RING_R - 14 * easeOut(k)); ctx.stroke();
    } else {
      const e = easeOut(k);
      ctx.strokeStyle = r.kind === 1 ? `rgba(236,248,255,${0.85 * (1 - k)})` : `rgba(160,214,255,${0.7 * (1 - k)})`;
      ctx.lineWidth = (3.2 * (1 - k) + 0.6) * lw;
      ringPath(ringPts[1], RING_R + e * (r.kind === 1 ? 56 : 40)); ctx.stroke();
      if (r.kind === 1 && k < 0.6) {
        ctx.strokeStyle = `rgba(111,183,245,${0.5 * (1 - k / 0.6)})`;
        ctx.lineWidth = 1.2 * lw;
        ringPath(ringPts[0], RING_R + e * 28); ctx.stroke();
      }
      ctx.fillStyle = `rgba(111,183,245,${0.14 * (1 - k)})`;
      ringPath(ringPts[0], RING_R); ctx.fill();
    }
  }

  // 粒子：小点和小 "+"
  fx.parts = fx.parts.filter(p => now - p.at < p.life);
  for (const p of fx.parts) {
    p.vx *= 1 - 2.2 * dts; p.vy = p.vy * (1 - 2.2 * dts) + 60 * dts;
    p.x += p.vx * dts; p.y += p.vy * dts;
    const a = 1 - (now - p.at) / p.life;
    ctx.globalAlpha = a;
    if (p.plus) {
      const s = p.s * 2.2;
      ctx.strokeStyle = '#cfe6fb'; ctx.lineWidth = 1.5 * lw;
      ctx.beginPath();
      ctx.moveTo(p.x - s, p.y); ctx.lineTo(p.x + s, p.y);
      ctx.moveTo(p.x, p.y - s); ctx.lineTo(p.x, p.y + s);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#9fd4ff';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s * lw, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // 判定文字：上浮淡出
  fx.floats = fx.floats.filter(f => now - f.at < 760);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of fx.floats) {
    const k = clamp((now - f.at) / 760, 0, 1);
    const a = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
    const pop = 1 + 0.18 * Math.max(0, 1 - k / 0.18);
    const us = Math.min(ui, 1.5);
    let x = RING_X, y = RING_Y - RING_R - 18 * us - 28 * easeOut(k), size = 26, col = '#eaf6ff';
    if (f.kind === 2) col = '#a6d8ff';
    if (f.kind === 3) { col = '#8c95ad'; size = 24; }
    if (f.kind === 4) { x = W - 30 - 40 * ui; y = 74 * ui - 24 * easeOut(k); size = 18; col = '#a6d8ff'; }
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.font = `${Math.round(size * (f.kind === 4 ? ui : us) * pop)}px ${MONO}`;
    if (f.kind === 1) { ctx.shadowColor = 'rgba(111,183,245,.9)'; ctx.shadowBlur = 14; }
    ctx.fillStyle = col;
    ctx.fillText(f.text, x, y);
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
}

function drawChibi(now) {
  if (!chibi.complete || !chibi.naturalWidth) return;
  const h = 110 * Math.min(ui, 1.5);
  const w = h * chibi.naturalWidth / chibi.naturalHeight;
  let x = 22, y = H - h - 12;
  if (!reduced) {
    y += Math.sin(now / 650) * 1.6;
    const jk = (now - fx.jumpAt) / 280;
    if (jk >= 0 && jk < 1) y -= 11 * Math.sin(Math.PI * jk);
  }
  ctx.drawImage(chibi, x, y, w, h);
  // 光环闪一下
  const hk = (now - fx.haloAt) / 480;
  if (hk >= 0 && hk < 1) {
    const a = (1 - hk) * fx.haloK;
    const cx = x + w * 0.5, cy = y + h * 0.047, rx = w * 0.36, ry = h * 0.045;
    ctx.save();
    ctx.shadowColor = 'rgba(255,107,125,.9)';
    ctx.shadowBlur = 12 * a;
    ctx.strokeStyle = `rgba(255,120,138,${a})`;
    ctx.lineWidth = 2 * lw;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, -0.02, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(217,71,90,${a * 0.6})`;
    ctx.lineWidth = 1.2 * lw;
    ctx.beginPath(); ctx.ellipse(cx + 1, cy - 1.5, rx * 1.06, ry * 1.25, 0.03, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

function drawHud(now, t) {
  const hpk = clamp((now - fx.heartAt) / 420, 0, 1);
  const upk = clamp((now - fx.heartUpAt) / 420, 0, 1);
  // 稳定度：5 颗小心形
  const hs = 10.5 * ui, gap = 26 * ui;
  for (let i = 0; i < MAX_HP; i++) {
    const x = 26 * ui + i * gap, y = 26 * ui;
    const full = i < S.hp;
    let s = hs;
    if (full) {
      if (upk < 1 && i === S.hp - 1) s *= 1 + 0.35 * (1 - upk);   // 刚回来的那颗
      heartPath(x, y, s);
      ctx.fillStyle = '#d9475a';
      ctx.shadowColor = 'rgba(217,71,90,.6)'; ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      if (hpk < 1 && i === S.hp) {       // 刚失去的那颗：闪一下
        ctx.globalAlpha = 1 - hpk;
        heartPath(x, y, s * (1 + 0.4 * hpk));
        ctx.fillStyle = '#d9475a'; ctx.fill();
        ctx.globalAlpha = 1;
      }
      heartPath(x, y, s);
      ctx.strokeStyle = 'rgba(207,230,251,.28)';
      ctx.lineWidth = 1.4 * lw;
      ctx.stroke();
    }
  }

  // 分数
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(207,230,251,.55)';
  ctx.font = `${Math.round(11 * ui)}px ${MONO}`;
  ctx.fillText('SCORE', W - 24, 20 * ui);
  ctx.fillStyle = '#eef6ff';
  ctx.font = `${Math.round(30 * ui)}px ${MONO}`;
  ctx.fillText(String(S.score), W - 24, 48 * ui);

  // 剩余时间条
  const rem = clamp(1 - t / DURATION, 0, 1);
  const bw = 220, bx = W / 2 - bw / 2, by = 22 * ui;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(207,230,251,.14)';
  ctx.lineWidth = 4 * lw;
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + bw, by); ctx.stroke();
  if (rem > 0) {
    ctx.strokeStyle = 'rgba(111,183,245,.85)';
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + bw * rem, by); ctx.stroke();
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(207,230,251,.5)';
  ctx.font = `${Math.round(11 * ui)}px ${MONO}`;
  ctx.fillText(`${Math.ceil(rem * DURATION)}s`, W / 2, by + 18 * ui);

  // 连击
  if (S.combo >= 5) {
    const ck = clamp((now - S.comboAt) / 160, 0, 1);
    const pop = 1 + 0.15 * (1 - ck);
    ctx.font = `${Math.round(19 * ui * pop)}px ${MONO}`;
    ctx.fillStyle = '#cfe6fb';
    ctx.shadowColor = 'rgba(111,183,245,.6)'; ctx.shadowBlur = 10;
    ctx.fillText(`COMBO ×${S.combo}`, W / 2, by + 46 * ui);
    ctx.shadowBlur = 0;
  }

  // 中央提示（基线下方的空白处）：准备 / 继续倒数 / 结束
  const CX = W * 0.58, CY = BASE + 82;
  ctx.textBaseline = 'middle';
  if (state === 'play' && t < PREP - 0.25) {
    const a = clamp(Math.min(t / 0.25, (PREP - 0.25 - t) / 0.35), 0, 1);
    ctx.globalAlpha = a;
    ctx.font = `${Math.round(24 * ui)}px ${MONO}`;
    ctx.fillStyle = '#cfe6fb';
    ctx.fillText('READY', CX, CY);
    ctx.globalAlpha = 1;
  } else if (state === 'resume') {
    const left = Math.max(0, S.resumeAt - now);
    ctx.font = `${Math.round(24 * ui)}px ${MONO}`;
    ctx.fillStyle = '#cfe6fb';
    ctx.fillText(left > 500 ? '…' : 'GO', CX, CY);
  } else if (state === 'ending') {
    ctx.font = `${Math.round(28 * ui)}px ${MONO}`;
    if (S.lost) {
      ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(now / 220));
      ctx.fillStyle = '#ff8a98';
      ctx.fillText('SIGNAL LOST', CX, CY);
    } else {
      ctx.fillStyle = '#eaf6ff';
      ctx.fillText('RECORD COMPLETE', CX, CY);
    }
    ctx.globalAlpha = 1;
  }
}

/* ---------- 主循环（只在可见时跑） ---------- */
let raf = 0, last = 0;
let visible = false, playable = false;

function update(now) {
  if (state === 'resume' && now >= S.resumeAt) {
    S.paused += now - S.pauseAt;
    setState('play');
  }
  if (state === 'play') {
    const gt = gnow(now);
    autoMiss(gt);
    if (state === 'play' && gt >= DURATION) complete();
  }
}

function loop(now) {
  raf = 0;
  // 保险：意外的长停顿（没有触发 visibilitychange 的节流等）不算进游戏时间
  if (state === 'play' && last && now - last > 400) S.paused += now - last - 16;
  last = now;
  update(now);
  draw(now);
  if (shouldRun()) raf = requestAnimationFrame(loop);
}
const shouldRun = () => visible && !document.hidden && state !== 'paused';
function kick() {
  if (!raf && shouldRun()) { last = 0; raf = requestAnimationFrame(loop); }
}

/* ---------- 输入 ---------- */
function stamp(e) {
  const n = performance.now(), ts = e.timeStamp;
  return ts > 0 && ts <= n && n - ts < 500 ? ts : n;
}

window.addEventListener('keydown', e => {
  if (e.code !== 'Space' && e.key !== ' ') return;
  if (state !== 'play' && state !== 'paused' && state !== 'resume') return;
  if (!playable || (L.modal && L.modal.isOpen) || document.hidden) return;
  const tg = e.target;
  if (tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))) return;
  e.preventDefault();
  if (e.repeat) return;
  if (state === 'play') press(stamp(e));
  else if (state === 'paused') resume();
});

screen.addEventListener('pointerdown', e => {
  if (e.button > 0) return;
  if (e.target.closest && e.target.closest('button')) return;
  if (state === 'play') { e.preventDefault(); if (L.audio) L.audio.init(); press(stamp(e)); }
  else if (state === 'paused') { e.preventDefault(); resume(); }
});
screen.addEventListener('contextmenu', e => { if (inRun()) e.preventDefault(); });

$('gmGo').addEventListener('click', startGame);
$('gmAgain').addEventListener('click', startGame);

/* ---------- 可见性：离开视口 / 切标签 → 暂停 ---------- */
if ('IntersectionObserver' in window) {
  new IntersectionObserver(entries => {
    for (const en of entries) {
      visible = en.isIntersecting;
      playable = en.isIntersecting && en.intersectionRatio >= 0.35;
    }
    if (!playable) pause();
    kick();
  }, { threshold: [0, 0.35, 0.6, 1] }).observe(monitor);
} else {
  visible = playable = true;
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
  else kick();
});
window.addEventListener('blur', pause);

if ('ResizeObserver' in window) new ResizeObserver(resize).observe(screen);
else window.addEventListener('resize', resize);
resize();
chibi.addEventListener('load', () => { if (!raf) draw(performance.now()); });
kick();

})();
